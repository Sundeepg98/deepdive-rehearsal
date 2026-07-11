/* F3 definitive: recursively find the TRUE rightmost box inside .stage (piercing every
   shadow root), and decide whether any /num content is actually INVISIBLE. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });

const probe = async (t, view) => {
  await p.goto(URL + `#${t}/${view}`, { waitUntil: 'load' });
  await p.waitForTimeout(420);
  return await p.evaluate(() => {
    const stage = document.querySelector('.stage');
    const sr = stage.getBoundingClientRect();
    const cs = getComputedStyle(stage);
    const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
    const paddingBoxLeft = sr.left;                 // border-box left (no border)
    const paddingBoxRight = sr.left + stage.clientWidth;  // visible right edge (CLIP edge)
    const contentBoxRight = sr.right - padR;
    const all = [];
    const walk = (root) => {
      const kids = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const el of kids) {
        const r = el.getBoundingClientRect();
        if (r.width || r.height) all.push({ el, r });
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(stage);
    let max = null;
    for (const a of all) if (!max || a.r.right > max.r.right) max = a;
    const describe = (a) => a ? {
      tag: a.el.tagName.toLowerCase() + (typeof a.el.className === 'string' && a.el.className ? '.' + a.el.className.trim().split(/\s+/).join('.') : ''),
      right: Math.round(a.r.right), width: Math.round(a.r.width),
      text: a.el.textContent.trim().slice(0, 60),
      pastClipEdge: Math.round(a.r.right - paddingBoxRight),
    } : null;
    // everything painted past the CLIP edge = genuinely invisible
    const invisible = all.filter(a => a.r.right > paddingBoxRight + 0.5).map(describe).sort((x, y) => y.right - x.right);
    return {
      stageScrollClip: Math.round(stage.scrollWidth - stage.clientWidth),
      stageRectRight: Math.round(sr.right),
      clipEdge: Math.round(paddingBoxRight),
      contentBoxRight: Math.round(contentBoxRight),
      padL: Math.round(padL), padR: Math.round(padR),
      rightmost: describe(max),
      invisibleCount: invisible.length,
      invisible: invisible.slice(0, 5),
      predictedScrollWidth: max ? Math.round(max.r.right - paddingBoxLeft) : -1,
      actualScrollWidth: stage.scrollWidth,
    };
  });
};

for (const [t, v] of [['storage-engines','num'], ['load-balancing','num'], ['consistency-models','num'], ['caching','walk']]) {
  const d = await probe(t, v);
  console.log(`\n##### ${t}/${v} @1280`);
  console.log('  .stage scrollWidth-clientWidth = ' + d.stageScrollClip + 'px   (padL ' + d.padL + ', padR ' + d.padR + ')');
  console.log('  visible CLIP edge (padding-box right) = ' + d.clipEdge + 'px; content-box right = ' + d.contentBoxRight + 'px');
  console.log('  rightmost box inside .stage: ' + JSON.stringify(d.rightmost));
  console.log('  actual scrollWidth=' + d.actualScrollWidth + '  predicted-from-rightmost=' + d.predictedScrollWidth);
  console.log('  >>> elements painted PAST the clip edge (genuinely INVISIBLE): ' + d.invisibleCount);
  d.invisible.forEach(i => console.log('        +' + i.pastClipEdge + 'px  ' + i.tag + '  "' + i.text + '"'));
}
await b.close();
