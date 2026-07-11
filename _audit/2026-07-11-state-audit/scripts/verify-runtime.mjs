/* Re-verify the runtime claims: 666 globals, 0 console errors, ~403ms load, all 9 panes switch. */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [], warns = [];
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warns.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

const t0 = Date.now();
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
const loadMs = Date.now() - t0;
await p.waitForTimeout(1500);

// count app-owned globals: diff against a blank page's window
const blank = await b.newPage();
await blank.goto('about:blank');
const baseline = await blank.evaluate(() => Object.getOwnPropertyNames(window));
await blank.close();

const appGlobals = await p.evaluate((base) => {
  const all = Object.getOwnPropertyNames(window);
  const set = new Set(base);
  return all.filter(k => !set.has(k));
}, baseline);

console.log('=== RUNTIME ===');
console.log('load (goto->load event) ms :', loadMs);
console.log('console errors            :', errors.length, errors.slice(0, 3));
console.log('console warnings          :', warns.length, warns.slice(0, 3));
console.log('app-owned globals on window:', appGlobals.length);
console.log('  sample:', appGlobals.slice(0, 12));
console.log('  TOPIC_* globals:', appGlobals.filter(g => g.startsWith('TOPIC_')).length);

// pane switching
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
await p.evaluate(() => { location.hash = '#kafka-internals/walk'; });
await p.waitForTimeout(700);
const panes = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'];
const results = [];
for (const v of panes) {
  await p.evaluate(v => window.goView(v), v);
  await p.waitForTimeout(450);
  const r = await p.evaluate(() => {
    const active = [...document.querySelectorAll('.pane')].filter(e => {
      const s = getComputedStyle(e); return s.display !== 'none' && e.offsetHeight > 0;
    }).map(e => e.id);
    return { hash: location.hash, activePanes: active, h: document.querySelector('.stage')?.offsetHeight };
  });
  results.push({ pane: v, hash: r.hash, visible: r.activePanes.join(',') || '(none)' });
}
console.log('\n=== PANE SWITCHING ===');
for (const r of results) console.log(`  ${r.pane.padEnd(6)} hash=${r.hash.padEnd(28)} visible=${r.visible}`);
console.log('\nerrors after full sweep:', errors.length);
await b.close();
