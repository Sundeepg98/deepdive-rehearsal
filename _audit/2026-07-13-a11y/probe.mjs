import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2500);

const info = await p.evaluate(() => {
  const reg = typeof TopicRegistry !== 'undefined' ? TopicRegistry : null;
  const ids = reg ? reg.ids() : [];
  // one representative topic per group
  const byGroup = {};
  for (const id of ids) {
    const t = reg.get(id);
    const g = t && t.identity && t.identity.group;
    if (g && !byGroup[g]) byGroup[g] = { id, title: t.identity.h1 };
  }
  return {
    topicCount: ids.length,
    groups: byGroup,
    htmlGroup: document.documentElement.getAttribute('data-group'),
    htmlTheme: document.documentElement.getAttribute('data-theme'),
    panes: [...document.querySelectorAll('.pane')].map(e => e.id),
    panesOn: [...document.querySelectorAll('.pane.on')].map(e => e.id),
    dialogs: [...document.querySelectorAll('[role=dialog]')].map(e => e.id),
    // does painting actually happen? (the blank-page trap)
    bodyOpacity: getComputedStyle(document.body).opacity,
  };
});
console.log(JSON.stringify(info, null, 2));
console.log('PAGE ERRORS:', errs.length ? errs : 'none');
await b.close();
