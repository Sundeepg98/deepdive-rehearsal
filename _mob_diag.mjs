import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME, args:['--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true, deviceScaleFactor:2 });
await p.goto('file://' + process.cwd() + '/deepdive_content_pipeline_rehearsal.html', { waitUntil:'load' });
await p.waitForTimeout(2200);
await p.screenshot({ path:'/mnt/user-data/outputs/mob_01_boot.png' });
const d = await p.evaluate(() => {
  const vw = window.innerWidth;
  const info = { vw, overflowX: document.documentElement.scrollWidth > vw ? (document.documentElement.scrollWidth - vw) : 0 };
  // every visible button-ish element in the top chrome region (y < 260)
  const els = [...document.querySelectorAll('button, [role=button], a, .tn-trigger, .tn-step')];
  info.topChrome = els.map((e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return { text: (e.textContent || '').trim().slice(0, 22), cls: (e.className || '').toString().slice(0, 24),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      display: cs.display, vis: cs.visibility, hiddenAttr: e.hidden === true };
  }).filter((e) => e.y < 260 && e.display !== 'none' && e.w > 0);
  // the viz button specifically: does [hidden] actually hide it?
  const vz = document.querySelector('button[data-tab="viz"]');
  const vr = vz.getBoundingClientRect();
  info.vizBtn = { hiddenAttr: vz.hidden, display: getComputedStyle(vz).display, w: Math.round(vr.width), h: Math.round(vr.height), y: Math.round(vr.y) };
  // nav strip geometry: do the 9 tabs fit / scroll?
  const seg = document.querySelector('.seg') || vz.parentElement;
  info.navStrip = { cls: seg.className, scrollW: seg.scrollWidth, clientW: seg.clientWidth, overflow: getComputedStyle(seg).overflowX };
  // elements that stick out past the viewport (horizontal overflow offenders)
  info.offenders = [...document.querySelectorAll('body *')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && (r.right > vw + 2) && getComputedStyle(e).position !== 'fixed';
  }).slice(0, 8).map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 30), right: Math.round(e.getBoundingClientRect().right) }));
  // small tap targets in chrome (h or w < 36)
  info.smallTaps = info.topChrome.filter((e) => (e.h < 36 || e.w < 36) && e.text);
  return info;
});
console.log(JSON.stringify(d, null, 1));
// nav strip scrolled to the end (does anything hide back there?)
await p.evaluate(() => { const s = document.querySelector('.seg'); if (s) s.scrollLeft = 9999; });
await p.waitForTimeout(300);
await p.screenshot({ path:'/mnt/user-data/outputs/mob_02_nav_end.png', clip:{ x:0, y:0, width:390, height:320 } });
// index overlay reachable?
await p.evaluate(() => document.querySelector('.tn-trigger') && document.querySelector('.tn-trigger').click());
await p.waitForTimeout(500);
await p.screenshot({ path:'/mnt/user-data/outputs/mob_03_index.png' });
await b.close();
