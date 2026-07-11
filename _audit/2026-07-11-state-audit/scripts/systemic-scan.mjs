import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const TABS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);

const topics = await p.evaluate(() =>
  [...document.querySelectorAll('.ix-card')].map(c => c.querySelector('.ix-c-name')?.textContent.trim()).filter(Boolean));
console.log('TOPICS FOUND:', topics.length);

await p.click('.ix-card');
await p.waitForTimeout(700);

const SAMPLE = [0, 1, 5, 10, 17, 24, 31, 38, 44]; // spread across the 6 groups
const overflowByPane = {}, undefByPane = {}, emptyByPane = {};
const rows = [];

for (const ti of SAMPLE) {
  // jump topic via the index overlay
  await p.click('#idxopen'); await p.waitForTimeout(500);
  const cards = await p.$$('.ix-card');
  if (!cards[ti]) { await p.keyboard.press('Escape'); continue; }
  const tname = await cards[ti].evaluate(e => e.querySelector('.ix-c-name').textContent.trim());
  await cards[ti].click();
  await p.waitForTimeout(800);

  for (const t of TABS) {
    await p.click(`.seg button[data-tab="${t}"]`);
    await p.waitForTimeout(450);
    const r = await p.evaluate((tab) => {
      const host = document.querySelector(`.pane#${tab} > *`);
      if (!host || !host.shadowRoot) return null;
      const sr = host.shadowRoot;
      const res = { overflow: [], undef: [], emptyVisible: [] };
      sr.querySelectorAll('*').forEach(e => {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        // horizontal overflow (clipped content)
        if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 40 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
          res.overflow.push({ cls: String(e.className).slice(0, 30), tag: e.tagName.toLowerCase(), cw: e.clientWidth, sw: e.scrollWidth, ov: e.scrollWidth - e.clientWidth });
        }
      });
      // literal undefined/NaN/null in rendered text
      const walk = document.createTreeWalker(sr, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walk.nextNode())) {
        const tx = n.nodeValue.trim();
        if (/^(undefined|null|NaN)$/.test(tx) || /\b(undefined|NaN)\b/.test(tx)) {
          const par = n.parentElement;
          if (par && getComputedStyle(par).display !== 'none')
            res.undef.push({ text: tx.slice(0, 40), parent: String(par.className).slice(0, 30) || par.tagName.toLowerCase() });
        }
      }
      return res;
    }, t);
    if (!r) continue;
    // dedupe overflow to the worst per class
    const worst = {};
    for (const o of r.overflow) { const k = o.tag + '.' + o.cls; if (!worst[k] || o.ov > worst[k].ov) worst[k] = o; }
    const ovList = Object.values(worst).filter(o => o.ov > 8);
    if (ovList.length) { (overflowByPane[t] ||= []).push({ topic: tname, ov: ovList }); }
    if (r.undef.length) { (undefByPane[t] ||= []).push({ topic: tname, undef: r.undef }); }
    rows.push({ topic: tname, tab: t, ov: ovList.length, undef: r.undef.length });
  }
}

console.log('\n===== HORIZONTAL OVERFLOW (clipped content) =====');
for (const [pane, list] of Object.entries(overflowByPane)) {
  console.log(`\n[${pane}] ${list.length}/${SAMPLE.length} topics affected`);
  list.slice(0, 4).forEach(l => console.log('  ' + l.topic + ' -> ' + l.ov.map(o => `${o.tag}.${o.cls} ${o.cw}px box / ${o.sw}px content (+${o.ov})`).join(' | ')));
}
console.log('\n===== LITERAL undefined / NaN RENDERED =====');
for (const [pane, list] of Object.entries(undefByPane)) {
  console.log(`\n[${pane}] ${list.length}/${SAMPLE.length} topics affected`);
  list.slice(0, 6).forEach(l => console.log('  ' + l.topic + ' -> ' + JSON.stringify(l.undef)));
}
await b.close();
