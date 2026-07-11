/* ADVERSARIAL VERIFY: does the literal string "undefined" ACTUALLY render on screen?
   Drives the REAL UI (no synthetic renderer invocation). Compiled topic vs original control. */
import { chromium } from 'playwright';
import fs from 'fs';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/vfy-content';
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(500);

// dismiss any start screen / boot gate
const dismissed = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const go = btns.find(x => /start|continue|begin|enter|jump/i.test(x.textContent || ''));
  if (go && go.offsetParent !== null) { go.click(); return go.textContent.trim(); }
  return null;
});
await p.waitForTimeout(400);
console.log('boot gate dismissed via:', dismissed || '(none needed)');

async function inspect(topicId, label) {
  await p.evaluate(id => TopicRegistry.setTopic(id), topicId);
  await p.waitForTimeout(400);
  // go to drill pane
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('[data-v],[data-view],.tab,nav button')]
      .find(x => /drill|probe/i.test(x.textContent || '') || /drill/i.test(x.getAttribute('data-v') || x.getAttribute('data-view') || ''));
    if (t) t.click();
  });
  await p.waitForTimeout(500);

  const r = await p.evaluate(() => {
    const pane = document.querySelector('deep-drill') || document.querySelector('#drill deep-drill');
    if (!pane || !pane.shadowRoot) return { err: 'no drill pane/shadowRoot', tags: [...document.querySelectorAll('*')].filter(e => e.tagName.startsWith('DEEP-')).map(e => e.tagName).slice(0, 20) };
    const sr = pane.shadowRoot;
    const tn = sr.getElementById('tiernote');
    const host = document.getElementById('drill');
    const vis = el => { if (!el) return null; const cs = getComputedStyle(el); const rc = el.getBoundingClientRect(); return { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, w: Math.round(rc.width), h: Math.round(rc.height), fontStyle: cs.fontStyle, color: cs.color }; };
    return {
      paneVisible: host ? getComputedStyle(host).display : 'n/a',
      tiernoteExists: !!tn,
      tiernoteHTML: tn ? tn.innerHTML : null,
      tiernoteText: tn ? tn.textContent : null,
      tiernoteStyle: vis(tn),
      bodyHasUndefined: (document.body.innerText || '').includes('undefined'),
      shadowTextHasUndefined: (sr.textContent || '').includes('undefined')
    };
  });
  console.log('\n===== ' + label + ' (' + topicId + ') =====');
  console.log(JSON.stringify(r, null, 1));
  await p.screenshot({ path: SHOTS + '/tiernote-' + topicId + '.png' });
  return r;
}

const md = await inspect('idempotency', 'COMPILED (md)');
const or = await inspect('signing', 'ORIGINAL (hand-authored) CONTROL');

// ---- now fully reveal a card in each and inspect senior/speak + follow-up button ----
async function revealCard(topicId, label) {
  await p.evaluate(id => TopicRegistry.setTopic(id), topicId);
  await p.waitForTimeout(400);
  let clicks = 0;
  for (let i = 0; i < 6; i++) {
    const did = await p.evaluate(() => {
      const sr = document.querySelector('deep-drill').shadowRoot;
      const adv = sr.getElementById('adv');
      if (adv) { adv.click(); return adv.textContent.trim(); }
      return null;
    });
    if (!did) break;
    clicks++;
    console.log('  [' + label + '] clicked push button #' + clicks + ': "' + did + '"');
    await p.waitForTimeout(220);
  }
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-drill').shadowRoot;
    const sen = sr.querySelector('.senior'), spk = sr.querySelector('.speak');
    const box = el => { if (!el) return null; const rc = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { w: Math.round(rc.width), h: Math.round(rc.height), display: cs.display, bg: cs.backgroundColor, pad: cs.padding, border: cs.border }; };
    const bodyText = el => { if (!el) return null; const c = el.cloneNode(true); const l = c.querySelector('.sl'); if (l) l.remove(); return (c.textContent || '').trim(); };
    return {
      pushButtonsRemaining: !!sr.getElementById('adv'),
      followUpBlocks: sr.querySelectorAll('.fu').length,
      seniorExists: !!sen, seniorLabel: sen ? (sen.querySelector('.sl') || {}).textContent : null,
      seniorBodyText: bodyText(sen), seniorBodyLen: (bodyText(sen) || '').length, seniorBox: box(sen),
      speakExists: !!spk, speakLabel: spk ? (spk.querySelector('.sl') || {}).textContent : null,
      speakBodyText: bodyText(spk), speakBodyLen: (bodyText(spk) || '').length, speakBox: box(spk),
      judgeShown: !!sr.getElementById('jg'),
      shadowHasUndefined: (sr.textContent || '').includes('undefined')
    };
  });
  console.log('\n----- REVEALED CARD: ' + label + ' (' + topicId + ') -----');
  console.log(JSON.stringify(r, null, 1));
  await p.screenshot({ path: SHOTS + '/revealed-' + topicId + '.png' });
  return r;
}
const mdR = await revealCard('idempotency', 'COMPILED');
const orR = await revealCard('signing', 'ORIGINAL');

fs.writeFileSync(SHOTS + '/../../scripts/_vfy-undefined.json', JSON.stringify({ md, or, mdR, orR }, null, 1));
console.log('\nPAGE ERRORS:', errs.length ? errs : 'none');
await b.close();
