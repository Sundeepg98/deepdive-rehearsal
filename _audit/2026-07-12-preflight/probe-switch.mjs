// Find the REAL topic-switch mechanism. The mem harness clicked #tnnext and the topic label
// never changed -- so whatever I was measuring, it was not a topic switch.
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text().slice(0, 160)); });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load', timeout: 240000 });
await p.waitForFunction(() => { const s = document.getElementById('_bootsplash'); return !s || s.classList.contains('_bs-done'); }, null, { timeout: 120000 }).catch(() => {});
await p.waitForTimeout(600);

const state = await p.evaluate(() => {
  const nav = document.getElementById('topicnav');
  const next = document.getElementById('tnnext');
  const cur = document.getElementById('tncurrent');
  const menu = document.getElementById('tnmenu');
  return {
    navHidden: nav ? nav.hasAttribute('hidden') : 'no nav',
    navDisplay: nav ? getComputedStyle(nav).display : null,
    nextVisible: next ? next.offsetParent !== null : false,
    curText: cur ? cur.textContent : null,
    menuChildren: menu ? menu.children.length : 0,
    menuSample: menu ? [...menu.children].slice(0, 4).map((c) => ({ tag: c.tagName, txt: (c.textContent || '').trim().slice(0, 30), ds: JSON.stringify(c.dataset) })) : [],
    hash: location.hash,
    hasRouter: !!window.Router,
    routerKeys: window.Router ? Object.keys(window.Router) : [],
    globals: Object.keys(window).filter((k) => /topic|Topic|TOPIC/.test(k)).slice(0, 20),
  };
});
console.log('STATE:', JSON.stringify(state, null, 1));

// try hash navigation -- the router is a HashRouter
console.log('\n--- trying hash navigation ---');
for (const h of ['#/signing', '#/authz', '#/signing/drill']) {
  await p.evaluate((hh) => { location.hash = hh; }, h);
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => ({
    hash: location.hash,
    h1: (document.querySelector('h1') || {}).textContent,
    cur: (document.querySelector('#tncurrent') || {}).textContent,
    txt: (document.body.innerText || '').trim().length,
  }));
  console.log(' ', h, '->', JSON.stringify(r));
}
await b.close();
