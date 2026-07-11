import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);

const info = await p.evaluate(() => {
  const out = {};
  out.hash = location.hash;
  out.title = document.title;
  out.hasRegistry = typeof TopicRegistry !== 'undefined';
  out.topicIds = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.ids() : [];
  out.nTopics = out.topicIds.length;
  const cur = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.current() : null;
  out.current = cur ? { id: cur.id, title: cur.identity.title, index: cur.identity.index, group: cur.identity.group } : null;
  // panes
  out.panes = [...document.querySelectorAll('.pane')].map(el => {
    const host = el.firstElementChild && el.firstElementChild.tagName ? el.firstElementChild : null;
    const inner = [...el.children].map(c => c.tagName.toLowerCase());
    return {
      id: el.id,
      on: el.classList.contains('on'),
      children: inner,
      hasShadow: host ? !!host.shadowRoot : false,
      isTopicPane: host ? (typeof TopicPane !== 'undefined' && host instanceof TopicPane) : false,
      dataKey: host && host.constructor ? (host.constructor.dataKey || null) : null,
    };
  });
  // topic registry data keys of first topic
  out.dataKeys = cur ? Object.keys(cur.data) : [];
  // mockbar buttons
  out.mockbarBtns = [...document.querySelectorAll('.mockbar button, .mockbar-fixed button, #mockopen, #toolsfab')].map(b => ({ id: b.id, cls: b.className, txt: (b.textContent || '').trim().slice(0, 50) }));
  // overlays
  out.overlays = [...document.querySelectorAll('[role="dialog"]')].map(o => ({ id: o.id, cls: o.className, modal: o.getAttribute('aria-modal') }));
  // topic nav
  const tn = document.getElementById('topicnav');
  out.topicnav = tn ? { hidden: tn.hidden, current: (document.getElementById('tncurrent') || {}).textContent } : null;
  // globals
  out.globals = ['Store', 'Progress', 'Router', 'ViewManager', 'SearchOverlay', 'IndexOverlay', 'TopicRegistry', 'Bookmarks', 'Notes', 'MixedFire', 'MockRun'].filter(g => typeof window[g] !== 'undefined');
  out.lsKeys = Object.keys(localStorage);
  return out;
});

console.log(JSON.stringify(info, null, 2));
console.log('--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows/00-boot.png', fullPage: false });
await b.close();
