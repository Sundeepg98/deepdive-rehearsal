/* rt-console VERIFY 01 — independently re-check FINDING 2 (viz deep link) and
   trace the ACTUAL ordering of Router.init vs the visual-pane bounce. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-console-verify';

const TRACE = `
window.__T = [];
window.__t = (s, extra) => window.__T.push({
  t: +performance.now().toFixed(2), s,
  hash: location.hash,
  cur: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? (TopicRegistry.current()||{}).id : '?',
  ...(extra||{})
});
document.addEventListener('DOMContentLoaded', () => window.__t('DOMContentLoaded'), true);
document.addEventListener('readystatechange', () => window.__t('readystate:' + document.readyState), true);
let _R;
Object.defineProperty(window, 'Router', {
  configurable: true,
  get() { return _R; },
  set(v) {
    _R = v;
    window.__t('Router ASSIGNED');
    const wrap = (name) => { const f = v[name]; v[name] = function (...a) { window.__t('Router.' + name + '(' + a.join(',') + ') ENTER'); const r = f.apply(this, a); window.__t('Router.' + name + ' EXIT'); return r; }; };
    ['init','navigate','replace','setTopic'].forEach(wrap);
    // wrap TopicRegistry.setTopic lazily on first Router.init
    const origInit = v.init;
    v.init = function (...a) {
      if (typeof TopicRegistry !== 'undefined' && !TopicRegistry.__wrapped) {
        const st = TopicRegistry.setTopic;
        TopicRegistry.setTopic = function (id) { window.__t('TopicRegistry.setTopic(' + id + ')'); return st.call(this, id); };
        TopicRegistry.__wrapped = true;
      }
      return origInit.apply(this, a);
    };
  }
});
`;

const CASES = [
  '#kafka-internals/viz',
  '#saga/viz',
  '#viz',
  '#kafka-internals/walk',
  '#saga/num',
  '#event-driven/walk',
  '#event-driven/drill',
  '#content-pipeline/walk',
];

const b = await chromium.launch();
const rows = [];
for (const hash of CASES) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(TRACE);
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE:' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR:' + e.message));
  await p.goto(URL + hash, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({
    hash: location.hash,
    cur: TopicRegistry.current().id,
    ids0: TopicRegistry.ids()[0],
    h1: (document.querySelector('.hdr h1') || {}).textContent,
    pane: (document.querySelector('.pane.on') || {}).id,
    segOn: (document.querySelector('.seg button.on') || {}).dataset?.tab,
    trace: window.__T,
  }));
  rows.push({ req: hash, ...r, errs });
  await ctx.close();
}
await b.close();

console.log('\n================ DEEP-LINK MATRIX ================');
console.log('ids()[0] =', rows[0].ids0);
for (const r of rows) {
  const bad = r.hash !== r.req;
  console.log(`\nREQUESTED ${r.req}`);
  console.log(`  -> hash    ${r.hash}   ${bad ? '*** REWRITTEN ***' : '(kept)'}`);
  console.log(`  -> topic   ${r.cur}    h1="${r.h1}"`);
  console.log(`  -> pane    ${r.pane}   segOn=${r.segOn}`);
  console.log(`  -> errors  ${r.errs.length ? r.errs.join(' | ') : 'none'}`);
}

console.log('\n================ ORDERING TRACE (#saga/viz) ================');
const saga = rows.find(r => r.req === '#saga/viz');
for (const e of saga.trace) console.log(`  ${String(e.t).padStart(8)}ms  cur=${(e.cur+'').padEnd(18)} hash=${(e.hash||'-').padEnd(26)} ${e.s}`);

console.log('\n================ ORDERING TRACE (#kafka-internals/viz) ================');
const kafka = rows.find(r => r.req === '#kafka-internals/viz');
for (const e of kafka.trace) console.log(`  ${String(e.t).padStart(8)}ms  cur=${(e.cur+'').padEnd(18)} hash=${(e.hash||'-').padEnd(26)} ${e.s}`);

console.log('\n================ ORDERING TRACE (#event-driven/walk) ================');
const ed = rows.find(r => r.req === '#event-driven/walk');
for (const e of ed.trace) console.log(`  ${String(e.t).padStart(8)}ms  cur=${(e.cur+'').padEnd(18)} hash=${(e.hash||'-').padEnd(26)} ${e.s}`);
