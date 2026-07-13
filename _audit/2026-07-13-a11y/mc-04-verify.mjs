/* mc-04-verify.mjs — DO NOT REPORT WHAT YOU HAVE NOT SEEN.
 *
 * The sweep flagged several elements at 1.28-2.6:1. Before any of that goes in a report it gets
 * two independent confirmations:
 *   (a) a CROP of the actual rendered region, zoomed 4x, so a human can look at it; and
 *   (b) an INDEPENDENT hand-computation of the contrast from getComputedStyle -- the text colour
 *       and the nearest opaque ancestor background, with the ancestor opacity chain applied. For a
 *       SOLID background this must agree with the pixel-decoded number. Two different code paths
 *       agreeing is the check; if they disagree, the pipeline is lying and I say so.
 */
import * as L from './mc-lib.mjs';
import fs from 'node:fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = OUT + '/shots/motion-contrast';
const log = [];
const say = (s) => { console.log(s); log.push(s); };

const HAND = `(sel, host) => {
  const root = host ? document.querySelector(host).shadowRoot : document;
  const els = [...root.querySelectorAll(sel)];
  const lin = (c) => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
  const lum = (r,g,b) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const parse = (s) => { const m = s.match(/[\\d.]+/g); return m ? m.map(Number) : null; };
  const over = (fg, bg, a) => fg.map((c,i)=> a*c + (1-a)*bg[i]);
  return els.map(el => {
    const cs = getComputedStyle(el);
    const col = parse(cs.color);
    // walk up for the first opaque background colour (crossing shadow boundaries)
    let n = el, bg = null, chainOpacity = 1, bgOwner = null, sawGradient = false;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      chainOpacity *= parseFloat(s.opacity);
      if (s.backgroundImage && s.backgroundImage !== 'none') sawGradient = true;
      const b = parse(s.backgroundColor);
      if (b && (b.length < 4 || b[3] > 0.99)) { bg = b.slice(0,3); bgOwner = n.tagName.toLowerCase() + (n.className && n.className.toString ? '.'+n.className.toString().split(' ')[0] : ''); break; }
      const r = n.getRootNode();
      n = n.parentElement || (r instanceof ShadowRoot ? r.host : null);
    }
    if (!bg) bg = [255,255,255];
    // the composited foreground the eye sees, once the ancestor opacity chain is applied
    const fgEff = chainOpacity < 1 ? over(col.slice(0,3), bg, chainOpacity) : col.slice(0,3);
    const l1 = lum(...fgEff), l2 = lum(...bg);
    const ratio = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    const r = el.getBoundingClientRect();
    return {
      text: (el.textContent||'').trim().slice(0,20),
      color: cs.color, bg: 'rgb('+bg.join(',')+')', bgOwner, chainOpacity: +chainOpacity.toFixed(2),
      sawGradient, handRatio: +ratio.toFixed(2),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      display: cs.display, vis: cs.visibility,
    };
  });
}`;

const CASES = [
  { name: 'focus-btn', sel: 'button.focus-btn, .focus-btn, button', host: null, theme: 'dark', room: 'security-tenancy', pane: 'walk', match: 'Focus' },
  { name: 'walk-nav', sel: 'button', host: 'deep-walkthrough', theme: 'dark', room: 'messaging-events', pane: 'walk', match: 'Prev' },
  { name: 'pomodoro', sel: 'button.pomodoro-btn', host: null, theme: 'dark', room: 'messaging-events', pane: 'walk', match: '' },
  { name: 'badge', sel: '.badge', host: null, theme: 'light', room: 'messaging-events', pane: 'walk', match: '' },
  { name: 'pill-zero', sel: '.pill .l, .pill .v', host: 'deep-drill', theme: 'light', room: 'messaging-events', pane: 'drill', match: '' },
];

const browser = await L.launch();
const page = await L.openApp(browser, {});

for (const c of CASES) {
  await L.setRoom(page, L.ROOMS.find((r) => r.group === c.room).topic);
  await L.setTheme(page, c.theme);
  await L.showPane(page, c.pane);
  await page.waitForTimeout(600);

  let rows;
  try { rows = await page.evaluate(`(${HAND})(${JSON.stringify(c.sel)}, ${JSON.stringify(c.host)})`); }
  catch (e) { say(`\n### ${c.name}: selector failed (${e.message})`); continue; }
  const hits = rows.filter((r) => (c.match ? r.text.includes(c.match) : true) && r.rect.w > 1);
  say(`\n### ${c.name}  [${c.room} / ${c.theme} / ${c.pane}]`);
  for (const h of hits.slice(0, 4)) {
    say(`   text="${h.text}"  color=${h.color}  nearest opaque bg=${h.bg} (from ${h.bgOwner})  chainOpacity=${h.chainOpacity}  gradientInChain=${h.sawGradient}`);
    say(`   HAND-COMPUTED contrast (from computed styles, independent of the pixel pipeline) = ${h.handRatio}:1`);
    say(`   rect=${JSON.stringify(h.rect)} display=${h.display} visibility=${h.vis}`);
    // crop + zoom so it can actually be LOOKED at
    const pad = 8;
    const clip = { x: Math.max(0, h.rect.x - pad), y: Math.max(0, h.rect.y - pad), width: h.rect.w + pad * 2, height: h.rect.h + pad * 2 };
    if (clip.width > 2 && clip.height > 2) {
      const file = `${SHOTS}/verify-${c.name}-${c.theme}.png`;
      await page.screenshot({ path: file, clip, animations: 'disabled' });
      say(`   crop saved: ${file}`);
    }
    break;
  }
}

/* Also: full-viewport dark shot of the sidebar so the "Focus" button can be seen in context. */
await L.setTheme(page, 'dark');
await L.setRoom(page, 'signing');
await L.showPane(page, 'walk');
await page.waitForTimeout(500);
await page.screenshot({ path: `${SHOTS}/verify-sidebar-dark.png`, clip: { x: 0, y: 0, width: 330, height: 400 }, animations: 'disabled' });
say(`\nsidebar crop (dark): ${SHOTS}/verify-sidebar-dark.png`);

fs.writeFileSync(OUT + '/mc-data-verify.txt', log.join('\n'));
await browser.close();
