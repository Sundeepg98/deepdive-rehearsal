import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

const consoleErrors = [];
const consoleWarns = [];
const pageErrors = [];
const requests = [];
const failed = [];

p.on('console', m => {
  if (m.type() === 'error') consoleErrors.push(m.text());
  if (m.type() === 'warning') consoleWarns.push(m.text());
});
p.on('pageerror', e => pageErrors.push(e.message));
p.on('request', r => requests.push({ url: r.url().slice(0, 120), method: r.method(), type: r.resourceType() }));
p.on('requestfailed', r => failed.push({ url: r.url().slice(0, 120), err: r.failure()?.errorText }));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2500);

const info = await p.evaluate(() => {
  const out = {};
  out.hasRouter = typeof window.Router !== 'undefined';
  out.routes = window.Router ? Object.keys(window.Router.ROUTES) : null;
  try { out.topicIds = TopicRegistry.ids(); } catch (e) { out.topicIds = 'ERR:' + e.message; }
  try { out.topicCount = TopicRegistry.ids().length; } catch (e) {}
  try { out.currentTopic = TopicRegistry.current()?.id; } catch (e) { out.currentTopic = 'ERR'; }
  out.hasSwitchTab = typeof window.switchTab === 'function';
  out.panes = [...document.querySelectorAll('.pane')].map(e => ({ id: e.id, tag: e.tagName.toLowerCase(), on: e.classList.contains('on') }));
  out.tabButtons = [...document.querySelectorAll('.seg button, [data-view], [data-tab]')].slice(0, 20).map(e => ({
    tag: e.tagName.toLowerCase(), dv: e.getAttribute('data-view'), dt: e.getAttribute('data-tab'), txt: (e.textContent || '').trim().slice(0, 20)
  }));
  out.overlayIds = [...document.querySelectorAll('[id]')].map(e => e.id).filter(i => /ov$|overlay|sheet|modal/i.test(i));
  out.buttons = [...document.querySelectorAll('button[id]')].map(e => ({ id: e.id, txt: (e.textContent || '').trim().slice(0, 20), aria: e.getAttribute('aria-label') }));
  out.customElements = [...new Set([...document.querySelectorAll('*')].map(e => e.tagName.toLowerCase()).filter(t => t.includes('-')))];
  // data-* attributes used as hooks anywhere
  const dataAttrs = new Set();
  document.querySelectorAll('*').forEach(e => { for (const a of e.attributes) if (a.name.startsWith('data-')) dataAttrs.add(a.name); });
  out.dataAttrs = [...dataAttrs].sort();
  return out;
});

console.log('=== BOOT CONSOLE ERRORS (' + consoleErrors.length + ') ===');
console.log(JSON.stringify(consoleErrors, null, 1));
console.log('=== BOOT CONSOLE WARNINGS (' + consoleWarns.length + ') ===');
console.log(JSON.stringify(consoleWarns.slice(0, 10), null, 1));
console.log('=== BOOT PAGE ERRORS (' + pageErrors.length + ') ===');
console.log(JSON.stringify(pageErrors, null, 1));
console.log('=== ALL REQUESTS (' + requests.length + ') ===');
console.log(JSON.stringify(requests, null, 1));
console.log('=== FAILED REQUESTS (' + failed.length + ') ===');
console.log(JSON.stringify(failed, null, 1));
console.log('=== INFO ===');
console.log(JSON.stringify(info, null, 1));

await b.close();
