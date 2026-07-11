/* (a) the .msel tab grid reserves 3 columns for 2 tabs (phantom empty track)
   (b) the model key/value rows: how narrow does the key column get at 592px? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });

await p.goto(URL + '#storage-engines/model', { waitUntil: 'load' });
await p.waitForTimeout(900); await p.keyboard.press('Escape'); await p.waitForTimeout(400);

const r = await p.evaluate(() => {
  const sr = document.querySelector('deep-model-answers').shadowRoot;
  const msel = sr.querySelector('#msel');
  const mcs = getComputedStyle(msel);
  // the key/value rows
  const body = sr.querySelector('#modelBody');
  const rows = [...body.querySelectorAll('*')].filter(e => {
    const cs = getComputedStyle(e);
    return (cs.display === 'grid' || cs.display === 'flex') && e.children.length === 2;
  }).slice(0, 4).map(e => {
    const cs = getComputedStyle(e);
    const kids = [...e.children].map(c => {
      const cr = c.getBoundingClientRect();
      const ccs = getComputedStyle(c);
      const lh = parseFloat(ccs.lineHeight) || 16;
      return { cls: c.className || c.tagName, w: Math.round(cr.width), h: Math.round(cr.height), approxLines: Math.round(cr.height / lh), text: c.textContent.trim().slice(0, 46) };
    });
    return { display: cs.display, cols: cs.gridTemplateColumns, kids };
  });
  return {
    msel: { tabCount: msel.children.length, gridCols: mcs.gridTemplateColumns, tabs: [...msel.children].map(c => c.textContent.trim()) },
    rows
  };
});
console.log('=== (a) #msel tab strip ===');
console.log('  tabs rendered:', r.msel.tabCount, JSON.stringify(r.msel.tabs));
console.log('  grid-template-columns:', r.msel.gridCols);
console.log('  -> ' + r.msel.gridCols.split(' ').length + ' tracks for ' + r.msel.tabCount + ' tabs' +
  (r.msel.gridCols.split(' ').length > r.msel.tabCount ? '  << PHANTOM EMPTY TRACK(S)' : ''));

console.log('\n=== (b) model key/value rows @ column 592px ===');
r.rows.forEach(row => {
  console.log('  display=' + row.display + '  cols=' + row.cols);
  row.kids.forEach(k => console.log(`    [${k.cls}] w=${k.w}px h=${k.h}px ~${k.approxLines} lines  "${k.text}"`));
});
await b.close();
