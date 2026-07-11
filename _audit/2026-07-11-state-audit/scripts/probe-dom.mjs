import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

const info = await p.evaluate(() => {
  const out = {};
  out.title = document.title;
  out.theme = document.documentElement.dataset.theme || '(none)';
  out.tabs = [...document.querySelectorAll('.seg button')].map(b => ({
    tab: b.dataset.tab, hidden: b.hasAttribute('hidden'), on: b.classList.contains('on'),
    label: b.textContent.trim()
  }));
  // custom elements in the stage
  out.panes = [...document.querySelectorAll('.stage .pane')].map(el => ({
    id: el.id, on: el.classList.contains('on'),
    child: el.firstElementChild ? el.firstElementChild.tagName.toLowerCase() : null,
    hasShadow: el.firstElementChild ? !!el.firstElementChild.shadowRoot : false
  }));
  out.layout = {
    sidebar: (() => { const r = document.querySelector('.sidebar').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
    stage: (() => { const r = document.querySelector('.stage').getBoundingClientRect(); return { w: Math.round(r.width), x: Math.round(r.x) }; })(),
    companion: (() => { const el = document.querySelector('.companion'); const r = el.getBoundingClientRect(); return { w: Math.round(r.width), display: getComputedStyle(el).display }; })(),
  };
  out.buttons = [...document.querySelectorAll('button[id]')].map(b => b.id);
  out.overlayRoots = [...document.querySelectorAll('[class*="-ov"],[class*="-panel"]')].map(e => e.className).slice(0, 40);
  return out;
});
console.log(JSON.stringify(info, null, 2));
await b.close();
