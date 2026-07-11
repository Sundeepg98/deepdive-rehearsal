import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
const info = await p.evaluate(() => {
  const out = {};
  // all sections / panes
  out.sections = [...document.querySelectorAll('section,[id^="pane"],[class*="pane"]')].slice(0, 30)
    .map(e => ({ tag: e.tagName, id: e.id, cls: String(e.className).slice(0, 50), vis: e.offsetParent !== null, h: Math.round(e.getBoundingClientRect().height) }));
  // buttons that look like pane switchers
  out.switchers = [...document.querySelectorAll('button,a')]
    .filter(e => /walk|drill|whiteboard|system|trade|model|number|red|open|wb|sys|num|rf/i.test((e.textContent || '') + e.id + e.className))
    .slice(0, 25).map(e => ({ tag: e.tagName, id: e.id, cls: String(e.className).slice(0, 40), txt: (e.textContent || '').trim().slice(0, 20), attrs: [...e.attributes].map(a => a.name + '=' + a.value).join(',').slice(0, 90) }));
  out.hashNow = location.hash;
  out.globals = Object.keys(window).filter(k => /pane|Pane|PANE|nav|route/i.test(k)).slice(0, 25);
  return out;
});
console.log('SECTIONS:'); info.sections.forEach(s => console.log('  ', JSON.stringify(s)));
console.log('SWITCHERS:'); info.switchers.forEach(s => console.log('  ', JSON.stringify(s)));
console.log('HASH:', info.hashNow);
console.log('GLOBALS:', info.globals.join(', '));
await b.close();
