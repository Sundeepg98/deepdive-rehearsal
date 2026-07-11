import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1500);

const info = await p.evaluate(() => {
  const out = {};
  out.bodyChildren = [...document.body.children].map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''));
  // find shadow roots
  const walk = (root, depth, acc) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) acc.push({ tag: el.tagName.toLowerCase(), depth });
    }
    return acc;
  };
  out.shadowHosts = walk(document, 0, []);
  const app = document.querySelector('.app');
  out.appHTMLSkeleton = app ? [...app.children].map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).trim().split(/\s+/).join('.') : '')) : null;
  // seg buttons
  const seg = document.querySelector('.sidebar .seg');
  out.segButtons = seg ? [...seg.querySelectorAll('button')].map(bb => ({ txt: bb.textContent.trim().slice(0, 30), ds: JSON.stringify(bb.dataset) })) : null;
  // panes
  out.panes = [...document.querySelectorAll('.pane')].map(e => ({ id: e.id, cls: e.className, dataset: JSON.stringify(e.dataset) }));
  out.companion = !!document.querySelector('.companion');
  out.mcomp = !!document.querySelector('.mcomp');
  // topic selection mechanism
  out.topicControls = [...document.querySelectorAll('[data-topic],[data-t],select,#topicsel')].slice(0, 10).map(e => e.tagName + ':' + (e.id || e.className) + ':' + JSON.stringify(e.dataset));
  return out;
});
console.log(JSON.stringify(info, null, 2));

// deep-session shadow root?
const shadowProbe = await p.evaluate(() => {
  const hosts = [...document.querySelectorAll('*')].filter(e => e.shadowRoot);
  return hosts.map(h => ({
    tag: h.tagName.toLowerCase(),
    children: [...h.shadowRoot.children].map(c => c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (c.className ? '.' + String(c.className).slice(0, 60) : '')).slice(0, 20)
  }));
});
console.log('SHADOW:', JSON.stringify(shadowProbe, null, 2));

await b.close();
