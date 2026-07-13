/* ============================================================================
   THE CRUX: is the drill scoreboard announced to a screen reader?

   The scoreboard encodes status as FILL-vs-OUTLINE + a CSS ::before glyph, so it
   survives any room colour and greyscale. That fixes colour-blindness. This asks the
   other half: does assistive tech get ANY of it?

   INSTRUMENT: an announcement monitor. A screen reader speaks a dynamic change ONLY if
   the mutated node sits inside a live region (aria-live=polite/assertive, or a role with
   an implicit live value: status/alert/log/timer/marquee/progressbar, or <output>).
   So: enumerate live roots across document + EVERY shadow root, MutationObserver them all,
   perform the action, and ask of each mutation "is its target inside a live root?" —
   walking UP through shadow hosts, because the scoreboard is inside <deep-drill>.

   PROVE IT CAN FAIL: control A injects aria-live onto the score and re-grades — the
   monitor must go GREEN (announcement captured). Control B strips an accessible name
   and re-reads the AX tree — the name must vanish. A check never seen firing is decor.
   ============================================================================ */
import { open, axTree, axFor, axPrint, roleOf, nameOf, propOf, SHOTS } from './lib.mjs';
import path from 'path';

const { browser, page } = await open();
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(76) + '\n' + t + '\n' + '='.repeat(76));

/* ---------- the monitor (installed in-page) ---------- */
const MONITOR = () => {
  const LIVE_ROLE = /^(status|alert|log|timer|marquee|progressbar)$/;
  window.__isLiveRoot = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const al = el.getAttribute && el.getAttribute('aria-live');
    if (al && al !== 'off') return true;
    const r = el.getAttribute && el.getAttribute('role');
    if (r && LIVE_ROLE.test(r)) return true;
    if (el.tagName === 'OUTPUT') return true;
    return false;
  };
  /* walk up, crossing shadow boundaries via .host — this is what the a11y tree does */
  window.__liveAncestor = (node) => {
    let n = node.nodeType === 1 ? node : node.parentNode;
    while (n) {
      if (window.__isLiveRoot(n)) return n;
      if (n.parentNode) n = n.parentNode;
      else if (n.host) n = n.host;          // shadow root -> host element
      else n = null;
    }
    return null;
  };
  window.__liveRoots = () => {
    const found = [];
    const scan = (root, hostPath) => {
      root.querySelectorAll('*').forEach(el => {
        if (window.__isLiveRoot(el)) {
          found.push({
            path: hostPath, tag: el.tagName.toLowerCase(), id: el.id || null,
            cls: (el.getAttribute('class') || '').slice(0, 30),
            live: el.getAttribute('aria-live'), role: el.getAttribute('role'),
            atomic: el.getAttribute('aria-atomic'),
            text: (el.textContent || '').trim().slice(0, 40),
            visible: !!(el.getBoundingClientRect().width || el.getBoundingClientRect().height),
          });
        }
        if (el.shadowRoot) scan(el.shadowRoot, hostPath + '>' + el.tagName.toLowerCase() + '#shadow');
      });
    };
    scan(document, '');
    return found;
  };
  window.__obs = [];
  window.__mut = [];
  window.__watch = () => {
    window.__mut = [];
    const cb = (recs) => {
      for (const m of recs) {
        const tgt = m.target;
        const live = window.__liveAncestor(tgt);
        window.__mut.push({
          type: m.type,
          attr: m.attributeName || null,
          target: (tgt.nodeType === 1 ? tgt.tagName.toLowerCase() + (tgt.id ? '#' + tgt.id : '') + (tgt.className && typeof tgt.className === 'string' ? '.' + tgt.className.split(' ')[0] : '') : '#text'),
          text: (tgt.textContent || '').trim().slice(0, 50),
          inLive: !!live,
          liveRoot: live ? (live.tagName.toLowerCase() + (live.id ? '#' + live.id : '') + '[aria-live=' + live.getAttribute('aria-live') + ',role=' + live.getAttribute('role') + ']') : null,
        });
      }
    };
    const opts = { subtree: true, childList: true, characterData: true, characterDataOldValue: true, attributes: true };
    const attach = (root) => { const o = new MutationObserver(cb); o.observe(root, opts); window.__obs.push(o); };
    attach(document);
    const scan = (root) => root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) { attach(el.shadowRoot); scan(el.shadowRoot); } });
    scan(document);
    return window.__obs.length;
  };
  window.__stop = () => { window.__obs.forEach(o => o.disconnect()); window.__obs = []; return window.__mut; };
};
await page.addInitScript(MONITOR);
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1600);

/* ---------- go to the drill ---------- */
await page.click('button[data-tab="drill"]');
await page.waitForTimeout(700);

/* =====================================================================
   1. WHAT DOES A SCREEN READER ACTUALLY GET FOR THE THREE TILES?
   ===================================================================== */
hr('1. AX TREE OF THE SCOREBOARD  (what assistive tech receives)');
const SCORE_EXPR = `document.querySelector('deep-drill').shadowRoot.querySelector('.score')`;
const scoreNodes = await axFor(page, SCORE_EXPR);
log('Chromium AX subtree rooted at .score  (CDP Accessibility.getPartialAXTree):\n');
log(axPrint(scoreNodes));
log('\nraw nodes (role / name / value / live / ignored):');
scoreNodes.forEach(n => log('  ' + JSON.stringify({
  role: roleOf(n), name: nameOf(n), value: propOf(n, 'value'),
  live: propOf(n, 'live'), ignored: n.ignored,
  ignoredReasons: (n.ignoredReasons || []).map(r => r.name),
})));

/* the three tiles individually */
log('\nPer-tile accessible name (what a SR would utter on each tile):');
for (const [cls, label] of [['.pill.g', 'Solid'], ['.pill.s', 'Revisit'], ['.pill.left', 'Left']]) {
  const tn = await axFor(page, `document.querySelector('deep-drill').shadowRoot.querySelector('${cls}')`);
  const root = tn[0];
  log(`  ${cls.padEnd(11)} role=${String(roleOf(root)).padEnd(12)} name=${JSON.stringify(nameOf(root) || '')} ignored=${root.ignored}` +
      (root.ignored ? ' reasons=' + (root.ignoredReasons || []).map(r => r.name).join(',') : ''));
}

/* =====================================================================
   2. IS THE SCOREBOARD INSIDE A LIVE REGION?  (ancestry walk)
   ===================================================================== */
hr('2. LIVE-REGION ANCESTRY of #sGot / #sShk / #sLeft');
const anc = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const out = {};
  for (const id of ['sGot', 'sShk', 'sLeft']) {
    const el = sr.getElementById(id);
    const live = window.__liveAncestor(el);
    // full ancestor chain for the record
    const chain = [];
    let n = el;
    while (n) {
      if (n.nodeType === 1) chain.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className.split(' ')[0] : ''));
      n = n.parentNode || n.host || null;
    }
    out[id] = { text: el.textContent, liveAncestor: live ? live.tagName : null, chain: chain.join(' < ') };
  }
  return out;
});
for (const k of Object.keys(anc)) {
  log(`  #${k} = "${anc[k].text}"   liveAncestor: ${anc[k].liveAncestor || 'NONE'}`);
  log(`      chain: ${anc[k].chain}`);
}

hr('2b. EVERY LIVE REGION IN THE APP (document + all shadow roots)');
const roots = await page.evaluate(() => window.__liveRoots());
log('count =', roots.length);
roots.forEach(r => log(`  ${r.path}>${r.tag}${r.id ? '#' + r.id : ''} .${r.cls} aria-live=${r.live} role=${r.role} atomic=${r.atomic} visible=${r.visible} text="${r.text}"`));

/* =====================================================================
   3. GRADE A CARD — IS ANYTHING ANNOUNCED?
   ===================================================================== */
hr('3. ACTION: reveal answer, then grade the probe SOLID');

async function advanceToJudge() {
  for (let i = 0; i < 8; i++) {
    const hasJudge = await page.evaluate(() => !!document.querySelector('deep-drill').shadowRoot.getElementById('jg'));
    if (hasJudge) return true;
    const adv = await page.evaluate(() => {
      const b = document.querySelector('deep-drill').shadowRoot.getElementById('adv');
      if (b) { b.click(); return b.textContent.trim().slice(0, 30); }
      return null;
    });
    if (!adv) return false;
    log(`   clicked #adv ("${adv}")`);
    await page.waitForTimeout(250);
  }
  return false;
}

// --- 3a. the REVEAL (does revealing an answer announce anything?)
await page.evaluate(() => window.__watch());
const revealed = await page.evaluate(() => {
  const b = document.querySelector('deep-drill').shadowRoot.getElementById('adv');
  if (b) { b.click(); return true; } return false;
});
await page.waitForTimeout(400);
let m = await page.evaluate(() => window.__stop());
log(`\n[REVEAL ANSWER]  clicked=${revealed}`);
log(`   DOM mutations: ${m.length}   |   mutations inside a live region: ${m.filter(x => x.inLive).length}`);
if (m.filter(x => x.inLive).length === 0) log('   >>> SILENT: the revealed answer text is not in any live region.');

// --- 3b. get to the judge row
await advanceToJudge();
await page.waitForTimeout(300);

const before = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  return { got: sr.getElementById('sGot').textContent, cls: sr.querySelector('.pill.g').className };
});
log(`\n   scoreboard BEFORE grade: Solid=${before.got}  class="${before.cls}"`);

// --- 3c. GRADE IT SOLID, with the monitor running
await page.evaluate(() => window.__watch());
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('jg').click());
await page.waitForTimeout(600);
m = await page.evaluate(() => window.__stop());

const after = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  return { got: sr.getElementById('sGot').textContent, cls: sr.querySelector('.pill.g').className };
});
log(`   scoreboard AFTER grade:  Solid=${after.got}  class="${after.cls}"`);
log(`\n[GRADE = SOLID]`);
log(`   DOM mutations: ${m.length}   |   mutations inside a live region: ${m.filter(x => x.inLive).length}`);
log('   mutations that changed the SCORE:');
m.filter(x => /sGot|sShk|sLeft|pill/.test(x.target) || /pill/.test(x.target)).slice(0, 8)
  .forEach(x => log(`      ${x.type.padEnd(14)} ${x.target.padEnd(22)} attr=${String(x.attr).padEnd(6)} inLive=${x.inLive}`));
const announced = m.filter(x => x.inLive);
log(`\n   ANNOUNCEMENTS CAPTURED: ${announced.length}`);
announced.slice(0, 6).forEach(x => log(`      -> "${x.text}" via ${x.liveRoot}`));
if (announced.length === 0) {
  log('   >>> SILENT. The user graded a probe and the screen reader said NOTHING.');
  log('   >>> The score went ' + before.got + ' -> ' + after.got + ' with zero assistive-tech signal.');
}
await page.screenshot({ path: path.join(SHOTS, '01-scoreboard-after-grade.png') });

/* =====================================================================
   4. NEGATIVE CONTROL A — PROVE THE MONITOR CAN GO GREEN
   ===================================================================== */
hr('4. NEGATIVE CONTROL A: inject aria-live on .score, re-grade. Monitor MUST fire.');
await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const sc = sr.querySelector('.score');
  sc.setAttribute('aria-live', 'polite');
  sc.setAttribute('aria-atomic', 'true');
});
log('   injected: .score[aria-live="polite"][aria-atomic="true"]');
const rootsNow = await page.evaluate(() => window.__liveRoots().length);
log(`   live regions now: ${rootsNow} (was ${roots.length})`);

// advance to the next card's judge row and grade again
await advanceToJudge();
await page.waitForTimeout(300);
await page.evaluate(() => window.__watch());
await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const b = sr.getElementById('jg') || sr.getElementById('js');
  if (b) b.click();
});
await page.waitForTimeout(600);
const m2 = await page.evaluate(() => window.__stop());
const ann2 = m2.filter(x => x.inLive);
log(`\n   DOM mutations: ${m2.length}   |   inside a live region: ${ann2.length}`);
log(`   ANNOUNCEMENTS CAPTURED: ${ann2.length}`);
ann2.slice(0, 5).forEach(x => log(`      -> "${x.text}"  via ${x.liveRoot}`));
log(ann2.length > 0
  ? '\n   *** CONTROL PASSED: the monitor DOES detect announcements when a live region exists.'
  : '\n   !!! CONTROL FAILED: monitor is broken — its SILENT verdict above is worthless.');

// restore
await page.evaluate(() => {
  const sc = document.querySelector('deep-drill').shadowRoot.querySelector('.score');
  sc.removeAttribute('aria-live'); sc.removeAttribute('aria-atomic');
});
log('   restored (aria-live removed).');

/* =====================================================================
   5. NEGATIVE CONTROL B — PROVE AX-NAME READS CAN FAIL
   ===================================================================== */
hr('5. NEGATIVE CONTROL B: strip an accessible name, prove the AX read goes red.');
const readNav = async () => {
  const nodes = await axTree(page);
  const n = nodes.find(x => !x.ignored && roleOf(x) === 'navigation');
  return n ? { role: roleOf(n), name: nameOf(n) } : null;
};
log('   BEFORE:', JSON.stringify(await readNav()));
await page.evaluate(() => document.getElementById('topicnav').removeAttribute('aria-label'));
log('   (removed aria-label from nav#topicnav)');
log('   AFTER :', JSON.stringify(await readNav()));
await page.evaluate(() => document.getElementById('topicnav').setAttribute('aria-label', 'Switch topic'));
log('   RESTORED:', JSON.stringify(await readNav()));

/* also prove it on the TIMER, the one live region that does exist */
hr('5b. CONTROL B2: the timer is the app\'s only real live region — prove we can see it.');
const timerAX = async () => {
  const nodes = await axTree(page);
  const t = nodes.find(x => roleOf(x) === 'timer');
  return t ? { role: roleOf(t), name: nameOf(t), live: propOf(t, 'live'), atomic: propOf(t, 'atomic'), ignored: t.ignored } : '(no timer node)';
};
log('   timer AX:', JSON.stringify(await timerAX()));

console.log('\nPAGE ERRORS:', page.__errs.length);
await browser.close();
