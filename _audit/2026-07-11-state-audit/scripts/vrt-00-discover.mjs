/* VERIFY rt-desktop :: step 0 — discover real selectors, routing, topic list.
   Read-only. Does not touch source. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

const info = await p.evaluate(() => {
  const out = {};
  // topic registry?
  out.globals = ['TopicRegistry', 'TOPIC_CMP_NOTES', 'TOPICS', '__syncCompanion']
    .filter(k => typeof window[k] !== 'undefined');
  try {
    const TR = window.TopicRegistry;
    if (TR) {
      out.TR_keys = Object.keys(TR);
      if (typeof TR.list === 'function') out.topics = TR.list().map(t => t.id || t);
      else if (TR.ids) out.topics = TR.ids;
      else if (TR.all) out.topics = Object.keys(TR.all);
    }
  } catch (e) { out.TR_err = String(e); }
  // nav buttons = views
  out.viewBtns = [...document.querySelectorAll('.sidebar .seg button')]
    .map(x => ({ tab: x.getAttribute('data-tab'), text: x.textContent.trim().slice(0, 30) }));
  out.hash = location.hash;
  // companion
  out.cmp = {
    companionEl: !!document.querySelector('.companion'),
    cmpView: document.getElementById('cmpView')?.textContent?.slice(0, 60),
    cmpNote: document.getElementById('cmpNote')?.textContent?.slice(0, 60),
    mcomp: !!document.querySelector('.mcomp'),
  };
  out.tokens = {
    space830: getComputedStyle(document.documentElement).getPropertyValue('--space-830').trim(),
    space296: getComputedStyle(document.documentElement).getPropertyValue('--space-296').trim(),
    space290: getComputedStyle(document.documentElement).getPropertyValue('--space-290').trim(),
    space76: getComputedStyle(document.documentElement).getPropertyValue('--space-76').trim(),
    density: document.documentElement.getAttribute('data-density'),
  };
  out.panes = [...document.querySelectorAll('.stage .pane')].map(x => ({ id: x.id, cls: x.className }));
  return out;
});

console.log(JSON.stringify(info, null, 2));
console.log('ERRORS:', errs.length ? errs : 'none');
await b.close();
