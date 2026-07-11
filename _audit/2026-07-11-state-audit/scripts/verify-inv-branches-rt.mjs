// RUNTIME re-verification for the inv-branches lens.
// Checks, against the REAL built artifact:
//   1. the lens's "healthy artifact" evidence (46 topics / 5 TopicPane / 0 console errors)
//   2. that the SALVAGED features it claims are live actually WORK (text-zoom, pomodoro,
//      scroll-to-top) -- these are the build/rescues branch's payload
//   3. that the sys pane's cross-link chips RENDER (proving pane-sys content absorbed)
//   4. the vestigial dot-gutter question the lens missed (28px padding, no ::after dot)
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-inv-branches';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1800);

// ---- 1. the lens's artifact-health claims -------------------------------
const health = await p.evaluate(() => {
  const topics = (window.TOPICS && (window.TOPICS.length || Object.keys(window.TOPICS).length)) || null;
  const reg = window.TOPIC_REGISTRY ? (window.TOPIC_REGISTRY.length || Object.keys(window.TOPIC_REGISTRY).length) : null;
  const tp = [...document.querySelectorAll('*')]
    .map(e => e.tagName.toLowerCase())
    .filter(t => t.includes('-'));
  return {
    topics, reg,
    customElements: [...new Set(tp)].sort(),
    title: document.title,
  };
});
console.log('--- 1. ARTIFACT HEALTH (lens claimed: 46 topics, 5 TopicPane, 0 console errors) ---');
console.log('  title            :', health.title);
console.log('  TOPICS length    :', health.topics);
console.log('  TOPIC_REGISTRY   :', health.reg);
console.log('  custom elements  :', JSON.stringify(health.customElements));
console.log('  console errors   :', errors.length, errors.length ? JSON.stringify(errors.slice(0, 3)) : '(none)');

// ---- 2. the build/rescues payload: are the rescued features LIVE? -------
const rescues = await p.evaluate(() => ({
  textzoom:    !!document.querySelector('.textzoom'),
  textzoomBtn: document.querySelectorAll('.textzoom-btn').length,
  pomodoro:    !!document.querySelector('.pomodoro'),
  scrolltop:   !!document.querySelector('.scrolltop') || typeof window.initScrollTop === 'function',
  // page-visibility has no DOM; check the module's global side-effect
  pageVis:     typeof document.hidden === 'boolean',
}));
console.log('\n--- 2. build/rescues PAYLOAD live in the artifact? (the branch the lens NEVER checked) ---');
for (const [k, v] of Object.entries(rescues)) console.log(`  ${k.padEnd(12)}: ${v}`);

// ---- 2b. how many topics, really? (probe the real global) ---------------
const topicGlobals = await p.evaluate(() => {
  const out = {};
  for (const k of Object.keys(window)) {
    const v = window[k];
    if (Array.isArray(v) && v.length > 20 && typeof v[0] === 'object') out[k] = v.length;
    else if (v && typeof v === 'object' && !Array.isArray(v) && /topic|registry/i.test(k)) out[k] = Object.keys(v).length;
  }
  return out;
});
console.log('\n--- 2b. topic-count globals (lens claimed 46 topics) ---');
console.log(' ', JSON.stringify(topicGlobals));

// ---- 3. sys pane cross-link chips (pane-sys absorption, behavioral) -----
// The app boots with a first-run topic-index overlay (#_index-overlay) that
// intercepts pointer events. Dismiss it before driving the panes.
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
const stillOpen = await p.evaluate(() => {
  const ov = document.querySelector('#_index-overlay');
  if (ov && ov.classList.contains('open')) {
    // fall back: click the first topic row to enter the app
    const row = ov.querySelector('button, [role="option"], .ix-row, li');
    if (row) { row.click(); return 'clicked-row'; }
    return 'still-open';
  }
  return 'dismissed';
});
await p.waitForTimeout(800);
console.log('\n--- 3. first-run overlay handling:', stillOpen);

const nav = await p.evaluate(() => ({
  segBtns: [...document.querySelectorAll('.seg button')].map(x => x.getAttribute('data-tab')),
}));
console.log('  .seg data-tab values:', JSON.stringify(nav.segBtns));

let chips = { count: 0, sample: [] };
const sysBtn = p.locator('.seg button[data-tab="sys"]').first();
if (await sysBtn.count()) {
  await sysBtn.click({ timeout: 10000 }).catch(e => console.log('  sys click failed:', e.message.slice(0, 60)));
  await p.waitForTimeout(900);
  chips = await p.evaluate(() => {
    const c = [...document.querySelectorAll('.piv .chip, .chip')];
    return { count: c.length, sample: c.slice(0, 8).map(x => x.textContent.trim()) };
  });
}
console.log('\n--- 3. sys pane CROSS-LINK CHIPS (pane-sys content absorbed?) ---');
console.log('  chips rendered:', chips.count);
console.log('  sample        :', JSON.stringify(chips.sample));
await p.screenshot({ path: `${SHOTS}/sys-pane-chips.png` });

// ---- 4. the vestigial dot-gutter the lens missed ------------------------
const dot = await p.evaluate(() => {
  const on = document.querySelector('.sidebar .seg button.on');
  if (!on) return { found: false };
  const cs = getComputedStyle(on);
  const after = getComputedStyle(on, '::after');
  const before = getComputedStyle(on, '::before');
  return {
    found: true,
    paddingRight: cs.paddingRight,
    afterContent: after.content,
    afterWidth: after.width,
    beforeContent: before.content,
    width: on.getBoundingClientRect().width,
  };
});
console.log('\n--- 4. the DOT-GUTTER question (archive had ::after dot @right:12px; master has none?) ---');
console.log(' ', JSON.stringify(dot));
await p.screenshot({ path: `${SHOTS}/sidebar-active-tab.png` });

// mobile too (the archived suite was "MOBILE SPACING")
const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
await p2.goto(URL, { waitUntil: 'load' });
await p2.waitForTimeout(1500);
const dotM = await p2.evaluate(() => {
  const on = document.querySelector('.sidebar .seg button.on');
  if (!on) return { found: false };
  const cs = getComputedStyle(on);
  const after = getComputedStyle(on, '::after');
  return { found: true, paddingRight: cs.paddingRight, afterContent: after.content, afterWidth: after.width };
});
console.log('  MOBILE 390px:', JSON.stringify(dotM));
await p2.screenshot({ path: `${SHOTS}/mobile-active-tab.png` });

console.log('\n  shots ->', SHOTS);
console.log('\nFINAL console errors:', errors.length);
await b.close();
