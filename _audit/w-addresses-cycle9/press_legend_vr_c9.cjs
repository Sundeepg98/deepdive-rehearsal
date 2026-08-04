/* W-ADDRESSES cycle 9 -- judge item 5's VR CONTRACT, measured rather than assumed.

   The legend split (one swatch per keel token) renames one visible label and adds a whole new
   swatch to the home's gauge panel. `visual_regression` came back PASS with **0 changed pixels on
   all 18 baselines**, which is the answer a VR contract wants and exactly the answer a VR contract
   must not simply believe: "the change moved no pixel" and "the capture cannot see this surface"
   produce the identical green.

   SO IT IS PRESSED. A scratch mirror replaces the swatch's label with `ZZZZZZZZZZZZZZZZZZ` -- a
   change no reader could miss -- and the same capture is taken of both builds and diffed at the
   gate's own tolerance with the gate's own decoder (test/_pixels.cjs). If THAT moves nothing
   either, the capture is blind to the legend and the green is about the camera, not the code.

   Then it says WHY, at both viewports, from the page rather than from a guess:
     - desktop 1280x800: the key's box, and `elementsFromPoint` at its centre
     - phone 390x844:    the key's box against the viewport height

   usage: node press_legend_vr_c9.cjs        (writes press-legend-vr.txt beside this file)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const B = require(path.join(ROOT, 'test', '_boot.cjs'));
const P = require(path.join(ROOT, 'test', '_pixels.cjs'));
const DIST = path.join(ROOT, 'dist', 'index.html');
const SCRATCH = path.join('C:', 'Users', 'Dell', 'AppData', 'Local', 'Temp', 'claude',
  'D--claude-workspace-deepdive-rehearsal', 'bfc4e186-9eb0-4148-a383-84020244f407',
  'scratchpad', 'w9');
const MIRROR = path.join(SCRATCH, '_w9_mirror_legendlabel.html');
const OUT = path.join(__dirname, 'press-legend-vr.txt');

const LABEL = '>Missed flagged<';
const LOUD = '>ZZZZZZZZZZZZZZZZZZ<';
const TOL = 2;                     /* the gate's own CHANNEL_TOL */

const lines = [];
const say = (s) => { lines.push(s === undefined ? '' : s); console.log(s === undefined ? '' : s); };

/* the VR capture's own seeds: theme in localStorage, Math.random pinned */
const SEED = (theme) => {
  try { localStorage.setItem('ddr.v1.theme', JSON.stringify(theme)); } catch (e) { /* ignore */ }
  let s = 0x2f6e2b1 >>> 0;
  Math.random = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
};

const GEOM = () => {
  const nm = (n) => (!n ? '?' : n.tagName.toLowerCase() + (n.id ? '#' + n.id : '')
    + (typeof n.className === 'string' && n.className.trim()
      ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
  const k = document.querySelector('#home .hm-alt .hm-key');
  if (!k) return { missing: true };
  const b = k.getBoundingClientRect();
  const stack = (document.elementsFromPoint(Math.round(b.x + 10), Math.round(b.y + 7)) || [])
    .slice(0, 4).map(nm);
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width),
    h: Math.round(b.height), innerH: window.innerHeight, scrollY: Math.round(window.scrollY),
    stack, swatches: document.querySelectorAll('#home .hm-alt .hm-key .hm-k').length,
    text: (k.textContent || '').replace(/\s+/g, ' ').trim() };
};

async function shoot(browser, html, theme, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(SEED, theme);
  await p.goto(B.fileUrl(html, ''), { timeout: B.NAV_MS, waitUntil: 'commit' });
  await p.waitForTimeout(6000);
  const geom = await p.evaluate(GEOM);
  const buf = await p.screenshot({ caret: 'hide', animations: 'allow', scale: 'css' });
  await ctx.close();
  return { geom, buf };
}

function diff(a, b) {
  const A = P.decodePng(a), Bb = P.decodePng(b);
  if (A.width !== Bb.width || A.height !== Bb.height) return { n: -1 };
  let n = 0, worstRow = null, rowMax = 0;
  const rows = {};
  for (let y = 0; y < A.height; y++) {
    let r = 0;
    for (let x = 0; x < A.width; x++) {
      const i = (y * A.width + x) * 4;
      if (Math.abs(A.data[i] - Bb.data[i]) > TOL || Math.abs(A.data[i + 1] - Bb.data[i + 1]) > TOL
        || Math.abs(A.data[i + 2] - Bb.data[i + 2]) > TOL) { r++; n++; }
    }
    if (r) { rows[y] = r; if (r > rowMax) { rowMax = r; worstRow = y; } }
  }
  return { n, rows: Object.keys(rows).length, worstRow, rowMax };
}

(async () => {
  fs.mkdirSync(SCRATCH, { recursive: true });
  const src = fs.readFileSync(DIST, 'utf8');
  const hits = src.split(LABEL).length - 1;
  fs.writeFileSync(MIRROR, src.split(LABEL).join(LOUD));

  say('=== W-ADDRESSES cycle 9 -- is the gauge legend in ANY visual baseline? ===');
  say('');
  say('the label plant: ' + JSON.stringify(LABEL) + ' -> ' + JSON.stringify(LOUD)
    + ' (' + hits + ' site in the built page)');
  say('the diff tolerance: the gate\'s own, a channel delta > ' + TOL + '/255');
  say('');

  const browser = await chromium.launch(B.launchOpts());
  try {
    for (const [key, theme, w, h] of [['home-light', 'light', 1280, 800],
      ['home-dark', 'dark', 1280, 800],
      ['m-home-light', 'light', 390, 844], ['m-home-dark', 'dark', 390, 844]]) {
      const a = await shoot(browser, DIST, theme, w, h);
      const b = await shoot(browser, MIRROR, theme, w, h);
      const d = diff(a.buf, b.buf);
      say(key + '  (' + w + 'x' + h + ')');
      say('   shipped build renders ' + a.geom.swatches + ' swatches: "' + a.geom.text + '"');
      say('   mirror  build renders ' + b.geom.swatches + ' swatches: "' + b.geom.text + '"');
      say('   the key box: x=' + a.geom.x + ' y=' + a.geom.y + ' ' + a.geom.w + 'x' + a.geom.h
        + '  viewport height ' + a.geom.innerH + ', scrollY ' + a.geom.scrollY
        + (a.geom.y + a.geom.h > a.geom.innerH
          ? '  -- BELOW THE CAPTURED FRAME by ' + (a.geom.y + a.geom.h - a.geom.innerH) + 'px'
          : '  -- inside the captured frame'));
      say('   what is in front of its centre: ' + a.geom.stack.join(' > '));
      say('   CHANGED PIXELS between the two captures: ' + d.n
        + (d.n === 0 ? '   <-- the camera cannot see this surface' : ''));
      say('');
    }
  } finally {
    await browser.close();
  }

  say('WHAT THIS MEANS FOR THE VR CONTRACT');
  say('  visual_regression reporting 0 changed pixels on this cycle is TRUE and says nothing');
  say('  about the legend: a control that renames a swatch to eighteen Zs moves the same zero');
  say('  pixels. No baseline photographs the gauge legend, so no baseline needs regenerating --');
  say('  and a legend regression is invisible to the pixel gate by construction. The only');
  say('  instruments that can see one are home_claims\' legend arm (one swatch per keel token,');
  say('  pressed by MUTANT 10b) and scoreboard_salience\'s KEY arm (every swatch against the');
  say('  panel\'s own measured ground).');

  fs.writeFileSync(OUT, lines.join('\n') + '\n');
})();
