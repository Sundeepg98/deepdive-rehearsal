/* kb-14: every overlay, driven by KEYBOARD ONLY.
   For each: focus its trigger -> press Enter to OPEN -> does focus move inside? is Tab TRAPPED
   inside? does Escape CLOSE it? is focus RESTORED to the trigger?
   Focus restoration is the one people forget: if focus is dumped on <body> when a modal closes,
   the keyboard user is silently teleported back to Tab stop #1 and has to walk the whole sidebar
   again. That is invisible to a mouse user and to axe-core alike — only driving it finds it.
   Run on the WALKTHROUGH pane so the drill's Enter intercept (kb-13) cannot confound the opens. */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const OVERLAYS = [
  ['#mockopen', 'Mock run'],
  ['#idxopen', 'Topic index'],
  ['#searchopen', 'Search'],
  ['#notesopen', 'Notes'],
  ['#cramopen', 'Cram sheet'],
  ['#sessopen', 'Session progress'],
  ['#mixopen', 'Mixed fire'],
  ['#planopen', 'Game plan'],
  ['#scopeopen', 'Scope'],
  ['#keyopen', 'Keyboard shortcuts'],
];

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.evaluate(() => window.switchTab('walk'));
await page.waitForTimeout(300);
fs.mkdirSync(SHOTS, { recursive: true });

/* which overlay (if any) is currently open, by pixels-agnostic DOM state */
const openOverlay = () => page.evaluate(() => {
  const els = [...document.querySelectorAll('[role="dialog"],.mock-ov,.cram-ov,[id$="-overlay"]')];
  const o = els.find(e => e.classList.contains('open') && getComputedStyle(e).display !== 'none');
  return o ? { id: o.id || o.className, role: o.getAttribute('role'), ariaModal: o.getAttribute('aria-modal') } : null;
});
const focusInfo = () => page.evaluate(() => {
  const e = window.__kb.deepActive();
  if (!e || e === document.body) return { path: 'BODY', label: '' };
  return { path: window.__kb.path(e), label: window.__kb.label(e), id: e.id };
});

const rows = [];
for (const [trig, name] of OVERLAYS) {
  const row = { name, trig };
  // --- OPEN by keyboard ---
  await page.evaluate(s => document.querySelector(s).focus(), trig);
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(650);
  const ov = await openOverlay();
  row.opens = !!ov;
  row.role = ov ? `${ov.role}/${ov.ariaModal}` : '-';
  row.ovId = ov ? ov.id : '-';

  if (!ov) { rows.push(row); continue; }

  // --- did focus move INTO the overlay? ---
  const f1 = await focusInfo();
  row.focusMovedIn = await page.evaluate((id) => {
    const el = [...document.querySelectorAll('[role="dialog"],.mock-ov,.cram-ov,[id$="-overlay"]')].find(e => (e.id || e.className) === id);
    const a = window.__kb.deepActive();
    return !!(el && a && (el.contains(a) || el.contains(a.getRootNode()?.host)));
  }, ov.id);
  row.focusAfterOpen = f1.label ? f1.label.slice(0, 22) : f1.path.slice(0, 22);

  // --- is Tab TRAPPED inside? press Tab 25x, see if focus ever escapes the overlay ---
  let escapes = 0;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate((id) => {
      const el = [...document.querySelectorAll('[role="dialog"],.mock-ov,.cram-ov,[id$="-overlay"]')].find(e => (e.id || e.className) === id);
      const a = window.__kb.deepActive();
      if (!a || a === document.body) return false;
      return !!(el && (el.contains(a) || el.contains(a.getRootNode()?.host)));
    }, ov.id);
    if (!inside) escapes++;
  }
  row.tabEscapes = escapes;
  row.trapped = escapes === 0;

  // --- ESCAPE closes? ---
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  row.escCloses = !(await openOverlay());

  // --- focus RESTORED to the trigger? ---
  const f2 = await focusInfo();
  row.focusAfterClose = f2.id || f2.path.slice(0, 26);
  row.restored = f2.id === trig.slice(1);
  rows.push(row);

  if (!row.restored || !row.trapped || !row.escCloses) {
    await page.screenshot({ path: `${SHOTS}/ovl-${name.toLowerCase().replace(/\W+/g, '-')}.png` });
  }
  // make sure we are clean for the next one
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

console.log('overlay              opens  role/modal      focus-in  Tab-trapped(escapes)  Esc-closes  focus-restored-to-trigger');
console.log('-'.repeat(118));
for (const r of rows) {
  console.log(
    `${r.name.padEnd(20)} ${String(r.opens).padEnd(6)} ${String(r.role).padEnd(15)} ${String(r.focusMovedIn ?? '-').padEnd(9)} ${String(r.trapped ?? '-').padEnd(6)}(${String(r.tabEscapes ?? '-').padStart(2)})           ${String(r.escCloses ?? '-').padEnd(11)} ${String(r.restored ?? '-').padEnd(6)} ${r.restored === false ? '<-- focus lost to "' + r.focusAfterClose + '"' : ''}`
  );
}

const bad = rows.filter(r => r.opens && (!r.trapped || !r.escCloses || !r.restored || !r.focusMovedIn));
console.log(`\noverlays with a keyboard defect: ${bad.length} / ${rows.filter(r => r.opens).length}`);
for (const b of bad) {
  const probs = [];
  if (!b.focusMovedIn) probs.push('focus never entered the dialog');
  if (!b.trapped) probs.push(`focus escaped the modal ${b.tabEscapes}/25 Tabs`);
  if (!b.escCloses) probs.push('Escape does not close it');
  if (!b.restored) probs.push(`focus NOT restored to trigger (landed on "${b.focusAfterClose}")`);
  console.log(`  ${b.name}: ${probs.join('; ')}`);
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/kb-overlays.json', JSON.stringify(rows, null, 1));
console.log(`\npageerrors: ${page.__errs.length}`);
await browser.close();
