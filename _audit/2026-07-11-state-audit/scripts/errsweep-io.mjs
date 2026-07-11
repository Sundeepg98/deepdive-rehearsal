/* EXPORT / IMPORT round-trip. The tools sweep could not click [data-io="export"]
   ("element is not visible") -- find out why, then round-trip a real backup. */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
const F = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const TMP = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('dialog', async d => { console.log(`  DIALOG ${d.type()}: "${d.message()}"`); await d.accept(); });

await p.goto(F + '#walk', { waitUntil: 'load' });
await p.waitForTimeout(1800);

// 1) Generate REAL progress first (export is disabled when there is no data)
console.log('=== 1) create some progress (drill grading) ===');
await p.locator('[data-tab="drill"]').first().click();
await p.waitForTimeout(600);
for (let i = 0; i < 6; i++) { await p.keyboard.press(['1', '2', '3'][i % 3]); await p.waitForTimeout(120); await p.keyboard.press(' '); await p.waitForTimeout(120); }
const keys = await p.evaluate(() => (typeof Store !== 'undefined' && Store.keys) ? Store.keys('') : 'no Store.keys');
console.log('  Store keys now:', JSON.stringify(keys));

// 2) Open the index overlay and inspect the export button
console.log('\n=== 2) inspect the export button ===');
await p.evaluate(() => window.IndexOverlay.open());
await p.waitForTimeout(800);
const btn = await p.evaluate(() => {
  const el = document.querySelector('[data-io="export"]');
  if (!el) return { missing: true };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  // walk up to find a hidden ancestor
  let hiddenBy = null, n = el;
  while (n && n !== document.body) {
    const s = getComputedStyle(n);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') {
      hiddenBy = `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.className && typeof n.className === 'string' ? '.' + n.className.split(' ').filter(Boolean)[0] : ''} {display:${s.display};visibility:${s.visibility};opacity:${s.opacity}}`;
      break;
    }
    n = n.parentElement;
  }
  return {
    disabled: el.disabled, text: el.textContent.trim(),
    display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
    box: `${Math.round(r.width)}x${Math.round(r.height)}`,
    inViewport: r.top >= 0 && r.bottom <= innerHeight,
    top: Math.round(r.top),
    hiddenBy,
  };
});
console.log(' ', JSON.stringify(btn, null, 1));
await p.screenshot({ path: `${SHOTS}/io-index-overlay.png` });

// 3) Click it for real
console.log('\n=== 3) click Export a backup ===');
let file = null;
try {
  const dlp = p.waitForEvent('download', { timeout: 8000 });
  await p.locator('[data-io="export"]').first().click({ timeout: 6000 });
  const d = await dlp;
  file = `${TMP}/errsweep-backup.json`;
  await d.saveAs(file);
  console.log('  downloaded:', d.suggestedFilename());
  const txt = readFileSync(file, 'utf8');
  console.log('  size:', txt.length, 'bytes');
  const j = JSON.parse(txt);
  console.log('  valid JSON. top-level keys:', Object.keys(j).join(', '));
  console.log('  data keys:', j.data ? Object.keys(j.data).join(', ').slice(0, 150) : '(no .data)');
} catch (e) {
  console.log('  *** EXPORT FAILED:', e.message.split('\n')[0]);
}

// 4) Wipe, then import it back
if (file && existsSync(file)) {
  console.log('\n=== 4) wipe all progress, then IMPORT the backup back ===');
  await p.evaluate(() => { if (typeof Store !== 'undefined' && Store.clearAll) Store.clearAll(); });
  const afterWipe = await p.evaluate(() => Store.keys(''));
  console.log('  keys after wipe:', JSON.stringify(afterWipe));

  await p.evaluate(() => window.IndexOverlay.open());
  await p.waitForTimeout(600);
  await p.locator('[data-io="import"]').first().setInputFiles(file);
  // import() confirms then reloads
  await p.waitForTimeout(2500);
  await p.waitForLoadState('load').catch(() => {});
  await p.waitForTimeout(1500);
  const afterImport = await p.evaluate(() => (typeof Store !== 'undefined' && Store.keys) ? Store.keys('') : 'gone');
  console.log('  keys after import:', JSON.stringify(afterImport));
  const ok = Array.isArray(afterImport) && afterImport.length > 0;
  console.log(ok ? '  -> ROUND-TRIP OK (data restored)' : '  *** ROUND-TRIP FAILED: no data after import ***');
  await p.screenshot({ path: `${SHOTS}/io-after-import.png` });
}

console.log('\nERRORS during export/import:', errs.length, errs.length ? JSON.stringify(errs, null, 1) : '(none)');
await b.close();
