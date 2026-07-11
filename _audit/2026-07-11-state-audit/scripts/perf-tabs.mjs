import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2000);

// open a topic first
await p.evaluate(() => document.querySelector('[data-topic="kafka-internals"]')?.click());
await p.waitForTimeout(800);

const s = await p.evaluate(() => {
  const tabs = [...document.querySelectorAll('[data-tab]')].map(e => ({
    tag: e.tagName, tab: e.getAttribute('data-tab'), id: e.id, cls: [...e.classList].join('.'),
    text: (e.textContent || '').trim().slice(0, 20), visible: !!e.offsetParent,
  }));
  const panes = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'].map(id => {
    const e = document.getElementById(id);
    return e ? { id, tag: e.tagName, cls: [...e.classList].join('.'), childNodes: e.childElementCount, innerLen: e.innerHTML.length, display: getComputedStyle(e).display } : { id, missing: true };
  });
  return { tabs, panes, totalNodes: document.querySelectorAll('*').length, indexOpen: !!document.querySelector('#_index-overlay.open') };
});
console.log(JSON.stringify(s, null, 2));
await b.close();
