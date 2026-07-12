import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
await p.waitForTimeout(2500);

const before = await p.evaluate(() => [...document.querySelectorAll('.open,.vis')].map(e => ({ id: e.id, cls: e.className.toString().slice(0, 60), tag: e.tagName })));
console.log('OPEN elements on load:', JSON.stringify(before, null, 1));

// try Escape
await p.keyboard.press('Escape');
await p.waitForTimeout(700);
const afterEsc = await p.evaluate(() => [...document.querySelectorAll('.open,.vis')].map(e => ({ id: e.id, cls: e.className.toString().slice(0, 60) })));
console.log('after Escape:', JSON.stringify(afterEsc));

// is the walk pane now interactable?
const canClick = await p.evaluate(() => {
  const t = document.querySelector('[data-tab="drill"]');
  if (!t) return 'no tab';
  const r = t.getBoundingClientRect();
  const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { tabRect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], topElement: top ? (top.tagName + '.' + top.className.toString().slice(0, 40)) : null, isTabOrChild: top ? (t.contains(top) || t === top) : false };
});
console.log('drill tab hit-test:', JSON.stringify(canClick));
await b.close();
