import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

await p.addScriptTag({ content: `
window.__deepText = function(root){
  let s='';
  const rec = n => {
    if (n.nodeType===3){ s += n.nodeValue + ' '; return; }
    if (n.nodeType!==1) return;
    if (getComputedStyle(n).display==='none') return;
    if (n.shadowRoot) { rec2(n.shadowRoot); }
    n.childNodes.forEach(rec);
  };
  const rec2 = sr => sr.childNodes.forEach(rec);
  rec(root);
  return s.replace(/\\s+/g,' ').trim();
};
window.__deepUndef = function(root){
  const out=[];
  const rec = n => {
    if (n.nodeType===3){ const t=n.nodeValue.trim(); if(/^(undefined|null|NaN)$/.test(t)) out.push({t, p:String(n.parentElement&&n.parentElement.className||'')}); return; }
    if (n.nodeType!==1) return;
    if (getComputedStyle(n).display==='none') return;
    if (n.shadowRoot) n.shadowRoot.childNodes.forEach(rec);
    n.childNodes.forEach(rec);
  };
  rec(root); return out;
};`});

async function gotoTopicByIndex(i) {
  const ovOpen = await p.evaluate(() => !!document.querySelector('.ix-ov.open'));
  if (!ovOpen) { await p.click('#idxopen'); }
  await p.waitForTimeout(600);
  const cards = await p.$$('.ix-card');
  const name = await cards[i].evaluate(e => e.querySelector('.ix-c-name').textContent.trim());
  await cards[i].click(); await p.waitForTimeout(1000);
  return name;
}

console.log('=== CRAM SHEET body (shadow-pierced) vs selected topic ===');
for (const i of [0, 3, 12]) {
  const name = await gotoTopicByIndex(i);
  await p.click('#cramopen'); await p.waitForTimeout(1100);
  const cram = await p.evaluate(() => ({
    title: document.querySelector('.cram-title').textContent.trim(),
    body: window.__deepText(document.querySelector('#cram')).slice(0, 165)
  }));
  console.log(`\n topic  : "${name}"`);
  console.log(` title  : "${cram.title}"`);
  console.log(` body   : "${cram.body}"`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
}

console.log('\n=== MOCK RUN (shadow-pierced) ===');
await p.click('#mockopen'); await p.waitForTimeout(1400);
const mock = await p.evaluate(() => {
  const el = document.querySelector('#mockov');
  return { undef: window.__deepUndef(el), text: window.__deepText(el).slice(0, 200) };
});
console.log(' undefined nodes:', JSON.stringify(mock.undef));
console.log(' text:', mock.text);
await p.keyboard.press('Escape'); await p.waitForTimeout(500);

console.log('\n=== ALL OVERLAYS: literal undefined/NaN (shadow-pierced) ===');
for (const [openId, sel, nm] of [['mockopen','#mockov','mock-run'],['mixopen','#mixov','mixed-fire'],['cramopen','#cramov','cram'],['sessopen','#sessov','session'],['planopen','#planov','gameplan'],['scopeopen','#scopeov','scope']]) {
  const ok = await p.$(`#${openId}`); if (!ok) { console.log(` ${nm}: opener missing`); continue; }
  await ok.click(); await p.waitForTimeout(1000);
  const r = await p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { missing: true };
    return { undef: window.__deepUndef(el) };
  }, sel);
  console.log(` ${nm.padEnd(11)}: ${r.missing ? 'SEL MISSING' : (r.undef.length ? 'UNDEFINED x' + r.undef.length + ' -> ' + JSON.stringify(r.undef) : 'clean')}`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
}
await b.close();
