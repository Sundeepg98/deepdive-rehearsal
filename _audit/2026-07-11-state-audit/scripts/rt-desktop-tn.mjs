/* Why does .tn-current get only 21px? Break down the .topic-nav flex budget. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await p.goto(URL + '#storage-engines/walk', { waitUntil: 'load' });
await p.waitForTimeout(900); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const nav = document.getElementById('topicnav');
  const trig = nav.querySelector('.tn-trigger');
  const kids = (el) => [...el.children].map(c => {
    const cr = c.getBoundingClientRect(); const cs = getComputedStyle(c);
    return { sel: (c.id ? '#' + c.id : '') + (c.className ? '.' + String(c.className).split(' ')[0] : c.tagName), w: Math.round(cr.width), flex: cs.flex, text: c.textContent.trim().slice(0, 22) };
  });
  return {
    sidebarW: Math.round(document.querySelector('.sidebar').getBoundingClientRect().width),
    navW: Math.round(nav.getBoundingClientRect().width),
    navChildren: kids(nav),
    triggerW: Math.round(trig.getBoundingClientRect().width),
    triggerChildren: kids(trig)
  };
});
console.log(JSON.stringify(r, null, 1));
const tc = r.triggerChildren.find(x => x.sel.includes('tncurrent'));
console.log('\n=> .tn-trigger is ' + r.triggerW + 'px; the "REHEARSING" eyebrow + chevron consume most of it,');
console.log('   leaving the TOPIC NAME (.tn-current) just ' + (tc ? tc.w : '?') + 'px -> ellipsised to one letter.');
await b.close();
