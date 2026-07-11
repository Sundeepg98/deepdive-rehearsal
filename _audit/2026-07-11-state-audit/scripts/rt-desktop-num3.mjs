/* Confirm exactly WHICH text is cut off and unreachable in the Numbers pane. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p.waitForTimeout(900);

const r = await p.evaluate(() => {
  const pane = document.querySelector('.pane.on');
  const paneRight = pane.getBoundingClientRect().right;
  const stage = document.querySelector('.stage');
  const stageRight = stage.getBoundingClientRect().right - parseFloat(getComputedStyle(stage).paddingRight);
  const sr = document.querySelector('deep-numbers').shadowRoot;
  const rows = [...sr.querySelectorAll('.nrow')].map(row => {
    const k = row.querySelector('.nrow-k'), v = row.querySelector('.nrow-v');
    const vr = v ? v.getBoundingClientRect() : null;
    return {
      label: k ? k.textContent.trim() : '',
      value: v ? v.textContent.trim() : '',
      valueRight: vr ? Math.round(vr.right) : null,
      cutOffBy: vr ? Math.round(vr.right - paneRight) : null,
      rowClientW: row.clientWidth, rowScrollW: row.scrollWidth, rowClipped: row.scrollWidth - row.clientWidth,
      gridCols: getComputedStyle(row).gridTemplateColumns
    };
  });
  return { paneRight: Math.round(paneRight), rows: rows.filter(x => x.rowClipped > 1 || x.cutOffBy > 0) };
});
console.log('=== storage-engines / num @1280 -- rows whose content is CLIPPED (unreachable, no scrollbar) ===');
console.log('pane right edge:', r.paneRight, '\n');
r.rows.forEach(x => {
  console.log(`  label : "${x.label}"`);
  console.log(`  value : "${x.value}"`);
  console.log(`  -> row grid-template-columns: ${x.gridCols}`);
  console.log(`  -> row scrollWidth=${x.rowScrollW} clientWidth=${x.rowClientW}  => ${x.rowClipped}px of content CLIPPED`);
  console.log(`  -> the value's right edge is ${x.cutOffBy > 0 ? x.cutOffBy + 'px PAST' : Math.abs(x.cutOffBy) + 'px inside'} the reading column\n`);
});
await p.screenshot({ path: SHOTS + '/num-1280-storage-engines-CLIPPED.png' });

// visual proof: outline the clipped rows
await p.evaluate(() => {
  const sr = document.querySelector('deep-numbers').shadowRoot;
  const st = document.createElement('style');
  st.textContent = '.nrow{outline:2px dashed red}.nrow-v{background:rgba(255,0,0,.15)}';
  sr.appendChild(st);
});
await p.waitForTimeout(300);
await p.screenshot({ path: SHOTS + '/num-1280-storage-engines-OUTLINED.png' });
console.log('[shots written]');
await b.close();
