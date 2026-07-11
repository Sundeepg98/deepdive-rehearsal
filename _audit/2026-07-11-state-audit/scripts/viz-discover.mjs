import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1500);

const info = await p.evaluate(() => {
  const out = {};
  out.hash = location.hash;
  out.hasVisualKit = typeof window.VisualKit;
  out.visualKitKeys = window.VisualKit ? Object.keys(window.VisualKit) : null;
  out.manifest = window.VisualKit && window.VisualKit.manifest ? window.VisualKit.manifest : null;
  out.hasGoView = typeof window.goView;
  // which topics have a visual?
  out.visualGlobals = Object.keys(window).filter(k => /^TOPIC_.*_VISUAL$/.test(k));
  // topic registry
  const reg = window.TOPICS || window.topics || window.REGISTRY;
  if (reg) {
    out.registryType = Array.isArray(reg) ? 'array' : typeof reg;
    const list = Array.isArray(reg) ? reg : Object.values(reg);
    out.topicCount = list.length;
    out.topicsWithVisual = list.filter(t => t && t.data && t.data.visual).map(t => t.id);
    out.sampleTopic = list[0] ? { id: list[0].id, dataKeys: list[0].data ? Object.keys(list[0].data) : null } : null;
  }
  // nav tabs
  out.tabs = [...document.querySelectorAll('button[data-tab]')].map(x => ({ tab: x.dataset.tab, hidden: x.hidden, text: x.textContent.trim() }));
  return out;
});
console.log(JSON.stringify(info, null, 2));
console.log('ERRORS:', errs.length ? errs : 'none');
await b.close();
