/* LENS: core flows — EXPORT / IMPORT round-trip (real file download + real file upload) */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const TMP = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
p.on('dialog', async d => { console.log('  [dialog] "' + d.message() + '" -> accepting'); await d.accept(); });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => IndexOverlay.close());
await p.waitForTimeout(400);

console.log('########## 1. MAKE REAL PROGRESS (drill grades + whiteboard + notes + bookmark + theme) ##########');
await p.click('.seg button[data-tab="drill"]'); await p.waitForTimeout(500);
await p.evaluate(async () => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  for (let g = 0; g < 4; g++) {
    for (let k = 0; k < 8; k++) { const a = r.getElementById('adv'); if (!a) break; a.click(); await new Promise(z => setTimeout(z, 40)); }
    const btn = r.getElementById(g % 2 ? 'js' : 'jg'); if (btn) btn.click();
    await new Promise(z => setTimeout(z, 80));
  }
});
await p.waitForTimeout(400);
await p.evaluate(() => document.getElementById('starbtn').click());   // bookmark
await p.waitForTimeout(300);
await p.evaluate(() => document.getElementById('themetog').click());  // dark
await p.waitForTimeout(300);
const before = await p.evaluate(() => ({
  ls: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])),
  progress: Progress.get('content-pipeline'),
  theme: document.documentElement.dataset.theme,
}));
console.log('  localStorage keys:', Object.keys(before.ls).length);
Object.entries(before.ls).forEach(([k, v]) => console.log('    ' + k + ' = ' + String(v).slice(0, 70)));
console.log('  Progress:', JSON.stringify(before.progress));

console.log('\n########## 2. EXPORT — click "Export a backup" and capture the real download ##########');
await p.evaluate(() => IndexOverlay.open());
await p.waitForTimeout(700);
const ioBtns = await p.evaluate(() => [...document.querySelectorAll('#_index-overlay .ix-io')].map(x => ({ io: x.getAttribute('data-io'), txt: x.textContent.trim() })));
console.log('  IO buttons found:', JSON.stringify(ioBtns));
await p.screenshot({ path: `${SHOTS}/exportimport-01-home-io.png` });

const dl = await Promise.all([
  p.waitForEvent('download', { timeout: 8000 }).catch(() => null),
  p.evaluate(() => { const btn = [...document.querySelectorAll('#_index-overlay .ix-io')].find(x => /export/i.test(x.textContent)); if (btn) btn.click(); }),
]).then(r => r[0]);

let file = null;
if (!dl) { console.log('  *** NO DOWNLOAD EVENT FIRED ***'); }
else {
  file = path.join(TMP, '_backup.json');
  await dl.saveAs(file);
  console.log('  downloaded as:', dl.suggestedFilename());
  const raw = fs.readFileSync(file, 'utf8');
  const j = JSON.parse(raw);
  console.log('  file size:', raw.length, 'bytes');
  console.log('  envelope :', JSON.stringify({ app: j.app, v: j.v, exported: j.exported }));
  console.log('  data keys:', JSON.stringify(Object.keys(j.data)));
  console.log('  progress in the backup:', JSON.stringify(j.data['progress.content-pipeline']));
  console.log('  theme in the backup    :', JSON.stringify(j.data['theme']));
  const missing = Object.keys(before.ls).map(k => k.replace('ddr.v1.', '')).filter(k => !(k in j.data));
  console.log('  localStorage keys MISSING from the backup:', JSON.stringify(missing), missing.length ? '*** LOSS ***' : 'none — complete');
}
await p.evaluate(() => IndexOverlay.close());
await p.waitForTimeout(400);

console.log('\n########## 3. WIPE everything, then IMPORT the backup into a clean browser ##########');
const p2 = await ctx.newPage();
p2.on('dialog', async d => { console.log('  [dialog] "' + d.message() + '" -> accepting'); await d.accept(); });
p2.on('pageerror', e => errs.push('PAGE-ERROR(p2): ' + e.message));
await p2.goto(URL, { waitUntil: 'load' });
await p2.waitForTimeout(700);
await p2.evaluate(() => { Store.clearAll(); localStorage.clear(); });
await p2.reload({ waitUntil: 'load' });
await p2.waitForTimeout(900);
const wiped = await p2.evaluate(() => ({ keys: Object.keys(localStorage), progress: Progress.get('content-pipeline'), theme: document.documentElement.dataset.theme }));
console.log('  after wipe: localStorage keys =', JSON.stringify(wiped.keys), '| progress =', JSON.stringify(wiped.progress), '| theme =', wiped.theme);

if (file) {
  await p2.evaluate(() => { if (!IndexOverlay.isOpen()) IndexOverlay.open(); });
  await p2.waitForTimeout(700);
  const fi = p2.locator('#_index-overlay input[type="file"]');
  await fi.setInputFiles(file);
  await p2.waitForTimeout(2500);   // importBackup confirms() then location.reload()
  const restored = await p2.evaluate(() => ({
    keys: Object.keys(localStorage),
    progress: Progress.get('content-pipeline'),
    theme: document.documentElement.dataset.theme,
    bookmarked: Store.get('bookmarks', null),
    summary: (() => { const s = Progress.summary(); return s.totDone + '/' + s.totTot + ' probes, weak=' + s.totWeak; })(),
  }));
  console.log('\n  AFTER IMPORT:');
  console.log('    localStorage keys:', JSON.stringify(restored.keys));
  console.log('    Progress        :', JSON.stringify(restored.progress));
  console.log('    theme           :', restored.theme);
  console.log('    bookmarks       :', JSON.stringify(restored.bookmarked));
  console.log('    rollup          :', restored.summary);
  const okProg = JSON.stringify(restored.progress) === JSON.stringify(before.progress);
  console.log('\n  >>> progress round-tripped byte-identical: ' + (okProg ? 'YES' : '*** NO ***'));
  console.log('  >>> theme round-tripped (' + before.theme + ' -> ' + restored.theme + '): ' + (restored.theme === before.theme ? 'YES' : '*** NO ***'));
  await p2.screenshot({ path: `${SHOTS}/exportimport-02-after-import.png` });
}

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
