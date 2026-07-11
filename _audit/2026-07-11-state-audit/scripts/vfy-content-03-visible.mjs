/* ADVERSARIAL VERIFY (take 2): prove/disprove that "undefined" is VISIBLE ON SCREEN,
   not merely present in a display:none subtree. Uses the app's real switchTab(). */
import { chromium } from 'playwright';
import fs from 'fs';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/vfy-content';
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /start|continue|begin/i.test(x.textContent || '') && x.offsetParent !== null); if (g) g.click(); });
await p.waitForTimeout(300);

async function go(topicId, view) {
  await p.evaluate(id => TopicRegistry.setTopic(id), topicId);
  await p.waitForTimeout(250);
  await p.evaluate(v => window.switchTab(v), view);
  await p.waitForTimeout(500);
}

async function probeTiernote(topicId, label) {
  await go(topicId, 'drill');
  const r = await p.evaluate(() => {
    const host = document.getElementById('drill');
    const sr = document.querySelector('deep-drill').shadowRoot;
    const tn = sr.getElementById('tiernote');
    const rc = tn.getBoundingClientRect();
    // is it REALLY painted? ask the browser what element is at its centre point
    const hit = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
    return {
      hostDisplay: getComputedStyle(host).display,
      text: tn.textContent,
      rect: { x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.width), h: Math.round(rc.height) },
      visible: rc.width > 0 && rc.height > 0 && getComputedStyle(tn).visibility === 'visible',
      hitTestTag: hit ? (hit.tagName + (hit.id ? '#' + hit.id : '')) : null,
      // does the VISIBLE rendered text of the whole app contain "undefined"?
      innerTextHasUndefined: (document.body.innerText || '').includes('undefined')
    };
  });
  console.log('\n===== TIERNOTE :: ' + label + ' (' + topicId + ') =====');
  console.log(JSON.stringify(r, null, 1));
  await p.screenshot({ path: SHOTS + '/vis-drill-' + topicId + '.png' });
  // tight crop around the tiernote as unambiguous pixel evidence
  if (r.rect.w > 0) {
    await p.screenshot({
      path: SHOTS + '/CROP-tiernote-' + topicId + '.png',
      clip: { x: Math.max(0, r.rect.x - 20), y: Math.max(0, r.rect.y - 60), width: Math.min(900, r.rect.w + 300), height: r.rect.h + 90 }
    });
  }
  return r;
}

const A = await probeTiernote('idempotency', 'COMPILED');
const B = await probeTiernote('signing', 'ORIGINAL control');

// ---------- empty senior/speak boxes, VISIBLE ----------
async function probeReveal(topicId, label) {
  await go(topicId, 'drill');
  for (let i = 0; i < 6; i++) {
    const did = await p.evaluate(() => { const a = document.querySelector('deep-drill').shadowRoot.getElementById('adv'); if (a) { a.click(); return true; } return false; });
    if (!did) break;
    await p.waitForTimeout(200);
  }
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-drill').shadowRoot;
    const sen = sr.querySelector('.senior'), spk = sr.querySelector('.speak');
    const m = el => { if (!el) return null; const rc = el.getBoundingClientRect(); const c = el.cloneNode(true); const l = c.querySelector('.sl'); if (l) l.remove(); return { h: Math.round(rc.height), w: Math.round(rc.width), y: Math.round(rc.y), bodyLen: (c.textContent || '').trim().length }; };
    return { fu: sr.querySelectorAll('.fu').length, senior: m(sen), speak: m(spk) };
  });
  console.log('\n----- REVEALED (visible) :: ' + label + ' (' + topicId + ') -----');
  console.log(JSON.stringify(r, null, 1));
  await p.screenshot({ path: SHOTS + '/vis-revealed-' + topicId + '.png' });
  if (r.senior && r.senior.h > 0) {
    await p.screenshot({ path: SHOTS + '/CROP-seniorspeak-' + topicId + '.png',
      clip: { x: 0, y: Math.max(0, r.senior.y - 10), width: 1000, height: Math.min(1000, (r.speak ? (r.speak.y + r.speak.h) : r.senior.y + r.senior.h) - r.senior.y + 30) } });
  }
  return r;
}
const RA = await probeReveal('idempotency', 'COMPILED');
const RB = await probeReveal('signing', 'ORIGINAL control');

// ---------- MIXED FIRE: drive the real tool, hunt the literal "undefined" ----------
async function mixedFire(topicId, label) {
  await go(topicId, 'drill');
  const opened = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button,a')].find(x => /mixed\s*fire/i.test(x.textContent || ''));
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return null;
  });
  await p.waitForTimeout(600);
  let found = null, seen = [];
  for (let i = 0; i < 30; i++) {
    const st = await p.evaluate(() => {
      const ov = document.getElementById('mixov');
      if (!ov || !ov.classList.contains('open')) return { gone: true };
      const kind = (ov.querySelector('.mxb-curve,.mxb-probe,[class*=mxb]') || {}).textContent || '';
      const promptEl = ov.querySelector('.mx-prompt,.mxq,.prompt') || ov;
      const task = ov.querySelector('.mx-task');
      return {
        open: true,
        kind: kind.trim(),
        taskExists: !!task,
        taskText: task ? task.textContent : null,
        visibleText: (ov.innerText || ''),
        hasUndefined: (ov.innerText || '').includes('undefined')
      };
    });
    if (st.gone) break;
    seen.push(st.kind);
    if (st.hasUndefined || st.taskExists) {
      found = st;
      console.log('\n>>> MIXED FIRE [' + label + '] item ' + (i + 1) + ' kind="' + st.kind + '" taskText=' + JSON.stringify(st.taskText) + ' hasUndefined=' + st.hasUndefined);
      await p.screenshot({ path: SHOTS + '/MIXFIRE-' + topicId + '.png' });
      if (st.hasUndefined) break;
    }
    // advance: reveal then grade
    const adv = await p.evaluate(() => {
      const ov = document.getElementById('mixov');
      const btns = [...ov.querySelectorAll('button')];
      const rev = btns.find(x => /reveal|show/i.test(x.textContent || '') && x.offsetParent !== null);
      if (rev) { rev.click(); return 'reveal'; }
      const g = btns.find(x => /solid|got|next/i.test(x.textContent || '') && x.offsetParent !== null);
      if (g) { g.click(); return 'grade'; }
      return null;
    });
    if (!adv) break;
    await p.waitForTimeout(280);
  }
  console.log('[' + label + '] mixed-fire opened via: ' + opened + ' | kinds seen: ' + JSON.stringify([...new Set(seen)]));
  return found;
}
const MF = await mixedFire('idempotency', 'COMPILED');
await p.evaluate(() => { const x = document.querySelector('#mixov .mock-x,#mixov .cram-x'); if (x) x.click(); });

fs.writeFileSync(SHOTS + '/../../scripts/_vfy-visible.json', JSON.stringify({ A, B, RA, RB, MF }, null, 1));
console.log('\nPAGE ERRORS:', errs.length ? errs : 'none');
await b.close();
