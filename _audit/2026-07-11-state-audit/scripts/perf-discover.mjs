import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1500);

const info = await p.evaluate(() => {
  const out = {};
  out.title = document.title;
  out.bodyChildren = [...document.body.children].map(e => e.tagName + '#' + (e.id || '') + '.' + [...e.classList].join('.')).slice(0, 30);
  out.allIds = [...document.querySelectorAll('[id]')].map(e => e.id).slice(0, 100);
  out.dataAttrs = [...new Set([...document.querySelectorAll('*')].flatMap(e => [...e.attributes].map(a => a.name).filter(n => n.startsWith('data-'))))].slice(0, 60);
  out.duplicateIdM = document.querySelectorAll('[id="m"]').length;
  out.svgInDom = document.querySelectorAll('svg').length;
  out.domNodes = document.querySelectorAll('*').length;
  return out;
});
console.log(JSON.stringify(info, null, 2));

const probe = await p.evaluate(() => {
  const r = {};
  const skip = new Set(Object.getOwnPropertyNames(window.constructor.prototype || {}));
  for (const k of Object.keys(window)) {
    if (skip.has(k) || /^(webkit|chrome|on[a-z])/.test(k)) continue;
    const v = window[k];
    const t = typeof v;
    if (t === 'object' && v) {
      r[k] = Array.isArray(v) ? `Array(${v.length})` : 'Obj{' + Object.keys(v).slice(0, 18).join(',') + '}';
    } else if (t === 'function') r[k] = 'fn';
  }
  return r;
});
console.log('\nWINDOW GLOBALS:\n', JSON.stringify(probe, null, 2).slice(0, 4000));

await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf/00-boot.png' });
await b.close();
