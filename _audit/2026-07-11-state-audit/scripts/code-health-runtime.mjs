// Runtime code-health probe: boot cleanliness, global count, pane switching, error surface.
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/code-health';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
const warnings = [];
p.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning') warnings.push(m.text());
});
p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const t0 = Date.now();
await p.goto(URL, { waitUntil: 'load' });
const loadMs = Date.now() - t0;
await p.waitForTimeout(2500);

// Measure the global namespace (the concatenated-script architecture)
const g = await p.evaluate(() => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const pristine = new Set(Object.getOwnPropertyNames(iframe.contentWindow));
  iframe.remove();
  const mine = Object.getOwnPropertyNames(window).filter((k) => !pristine.has(k));
  return {
    appGlobals: mine.length,
    sample: mine.slice(0, 12),
    hasVisualKit: typeof window.VisualKit,
    topicCount: (window.TOPICS && (window.TOPICS.length || Object.keys(window.TOPICS).length)) || null,
  };
});

// Pane switching: exercise every tab, collect errors
const tabs = await p.$$eval('button[data-tab]', (els) => els.map((e) => e.getAttribute('data-tab')));
const perTab = {};
for (const t of [...new Set(tabs)]) {
  const before = errors.length;
  const btn = await p.$(`button[data-tab="${t}"]`);
  if (!btn) continue;
  try {
    await btn.click({ timeout: 2000, force: true });
    await p.waitForTimeout(350);
  } catch { perTab[t] = 'CLICK-FAILED'; continue; }
  perTab[t] = errors.length - before === 0 ? 'clean' : `${errors.length - before} error(s)`;
}

await p.screenshot({ path: `${SHOTS}/boot-desktop.png` });

console.log('=== RUNTIME CODE HEALTH ===');
console.log('load(ms):', loadMs);
console.log('app-owned top-level globals on window:', g.appGlobals);
console.log('  sample:', JSON.stringify(g.sample));
console.log('window.VisualKit:', g.hasVisualKit);
console.log('tabs found:', JSON.stringify([...new Set(tabs)]));
console.log('per-tab error delta:', JSON.stringify(perTab, null, 1));
console.log('TOTAL console errors:', errors.length);
errors.slice(0, 10).forEach((e) => console.log('  ERR:', e.slice(0, 160)));
console.log('TOTAL console warnings:', warnings.length);
warnings.slice(0, 6).forEach((e) => console.log('  WARN:', e.slice(0, 160)));

await b.close();
