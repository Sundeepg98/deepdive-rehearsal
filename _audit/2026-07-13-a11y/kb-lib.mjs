/* ============ KB-LIB — the keyboard-only lens's instruments ============
   Namespaced kb-* so it cannot collide with the semantics lens's lib.mjs in this dir.

   THE MEASUREMENT RULE FOR THIS LENS
   ----------------------------------
   "Is there a visible focus indicator?" is answered by DIFFING RENDERED PIXELS between the
   unfocused and focused state of the SAME element box — never by reading getComputedStyle
   .outline. Reading the style is exactly the trap this repo keeps falling into:

     * `outline: 2px solid var(--acc)` reads as a perfectly good ring in the CSSOM even when
       --acc resolves to the element's own background (invisible ring, style check passes).
     * a later `outline:none` on a *higher-specificity* `:focus` rule silently wins, and a
       check that greps the stylesheet for `:focus-visible{outline` still reports "styled".
     * box-shadow glows and `outline-offset` rings paint OUTSIDE the border box, so any check
       clipped to the border box under-counts them.

   So: screenshot the element's box PADDED BY 12px, unfocused; screenshot it focused; count
   pixels that changed. Zero changed pixels = invisible focus = hard fail, and no amount of
   CSS that "looks right" can talk the number out of being zero.

   decode/diff runs INSIDE a helper page (canvas getImageData) so only a small summary crosses
   the CDP boundary, never a multi-megabyte RGBA array. Same trick as _audit/2026-07-13-vfix-css
   /pixlib.mjs, which is the instrument that proved body{opacity:0} => 0 painted pixels. */
import { chromium } from 'playwright';

export const APP = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
export const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/shots/keyboard';
export const PAD = 12;               // capture ring + glow that paint outside the border box

/* ---------- contrast maths (WCAG) ---------- */
const relLum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const CR = (a, b) => {
  const L1 = relLum(a), L2 = relLum(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};

export async function open(opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, ...opts });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForTimeout(1800);   // custom elements upgrade
  page.__errs = errs;
  // a second page used purely as a PNG decoder (canvas), so pixels never cross CDP
  const helper = await ctx.newPage();
  await helper.goto('about:blank');
  page.__helper = helper;
  await page.bringToFront();
  return { browser, ctx, page };
}

/* ---------- DEEP dom helpers: everything here must pierce shadow roots ----------
   The drill's reveal/grade/advance buttons live inside <deep-drill>'s shadow root, so a
   light-DOM-only enumeration would silently rate the drill "0 controls" and pass. */
export const DEEP_JS = `
window.__kb = (function(){
  function deepActive(){
    var el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }
  /* the CORRECT visibility test. NOT offsetParent!==null — that is null for any
     position:fixed element even when it is plainly visible, which is how a focus
     trap can decide a visible overlay has "no focusable children". */
  function visible(el){
    if (!el.getClientRects().length) return false;
    var s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') return false;
    return true;
  }
  var SEL = 'button,a[href],input,select,textarea,summary,[tabindex],[contenteditable=""],[contenteditable="true"]';
  function tabbable(el){
    if (el.disabled) return false;
    if (el.hasAttribute('inert')) return false;
    var ti = el.getAttribute('tabindex');
    if (ti !== null && parseInt(ti,10) < 0) return false;
    if (el.closest && el.closest('[inert]')) return false;
    if (el.hasAttribute('hidden')) return false;
    return visible(el);
  }
  /* walk light DOM + every open shadow root */
  function all(){
    var out = [];
    (function walk(root){
      var nodes = root.querySelectorAll('*');
      for (var i=0;i<nodes.length;i++){
        var el = nodes[i];
        if (el.matches(SEL) && tabbable(el)) out.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    })(document);
    return out;
  }
  function path(el){
    if (!el || el === document.body) return 'body';
    var seg = [], node = el, guard = 0;
    while (node && node.nodeType === 1 && guard++ < 12){
      var s = node.tagName.toLowerCase();
      if (node.id) s += '#' + node.id;
      else if (node.classList && node.classList.length) s += '.' + [].slice.call(node.classList).slice(0,2).join('.');
      seg.unshift(s);
      var root = node.getRootNode();
      if (root instanceof ShadowRoot){ node = root.host; seg.unshift('>>'); }   // shadow boundary
      else node = node.parentElement;
      if (node === document.body || node === document.documentElement) break;
    }
    return seg.join(' ');
  }
  function label(el){
    if (!el) return '';
    var t = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || '';
    if (!t) t = (el.textContent || '').replace(/\\s+/g,' ').trim().slice(0,42);
    return t;
  }
  function info(el){
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { path: path(el), label: label(el), tag: el.tagName.toLowerCase(),
             id: el.id || '', cls: el.className && el.className.baseVal === undefined ? String(el.className).slice(0,60) : '',
             x: r.x, y: r.y, w: r.width, h: r.height,
             inShadow: el.getRootNode() instanceof ShadowRoot,
             focusVisible: (function(){ try { return el.matches(':focus-visible'); } catch(e){ return null; } })() };
  }
  return { deepActive: deepActive, all: all, path: path, label: label, info: info, visible: visible, tabbable: tabbable };
})();
`;

export async function inject(page) { await page.evaluate(DEEP_JS); }

/* current deeply-focused element, described */
export async function active(page) {
  return page.evaluate(() => window.__kb.info(window.__kb.deepActive()));
}

/* ---------- the pixel-diff core ---------- */
/* Compare two base64 PNGs of the SAME region. Returns changed-pixel count, the largest
   per-channel delta, the bbox of the change, and the contrast of the most-changed pixel
   against what it replaced (a proxy for "how visible is the indicator"). */
async function diffInHelper([a, b, tol]) {
  async function load(b64) {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return { d: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  }
  const A = await load(a), B = await load(b);
  if (A.w !== B.w || A.h !== B.h) return { error: 'size-mismatch', aw: A.w, ah: A.h, bw: B.w, bh: B.h };
  let changed = 0, maxDelta = 0, best = null;
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let j = 0; j < A.h; j++) {
    for (let i = 0; i < A.w; i++) {
      const o = (j * A.w + i) * 4;
      const dr = Math.abs(A.d[o] - B.d[o]);
      const dg = Math.abs(A.d[o + 1] - B.d[o + 1]);
      const db = Math.abs(A.d[o + 2] - B.d[o + 2]);
      const dm = Math.max(dr, dg, db);
      if (dm > tol) {
        changed++;
        if (i < minX) minX = i; if (i > maxX) maxX = i;
        if (j < minY) minY = j; if (j > maxY) maxY = j;
        if (dm > maxDelta) {
          maxDelta = dm;
          best = { from: [A.d[o], A.d[o + 1], A.d[o + 2]], to: [B.d[o], B.d[o + 1], B.d[o + 2]] };
        }
      }
    }
  }
  return {
    changed, maxDelta, total: A.w * A.h, w: A.w, h: A.h,
    bbox: maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    best
  };
}

export async function pxdiff(page, aB64, bB64, tol = 8) {
  const r = await page.__helper.evaluate(diffInHelper, [aB64, bB64, tol]);
  if (r.best) r.contrast = +CR(r.best.from, r.best.to).toFixed(2);
  return r;
}

/* screenshot the padded box of whatever is at `rect`, as base64 */
export async function shotBox(page, rect, pad = PAD) {
  const vp = page.viewportSize();
  const clip = {
    x: Math.max(0, Math.floor(rect.x - pad)),
    y: Math.max(0, Math.floor(rect.y - pad)),
    width: Math.ceil(rect.w + pad * 2),
    height: Math.ceil(rect.h + pad * 2)
  };
  clip.width = Math.min(clip.width, vp.width - clip.x);
  clip.height = Math.min(clip.height, vp.height - clip.y);
  if (clip.width <= 0 || clip.height <= 0) return null;
  const buf = await page.screenshot({ clip });
  return buf.toString('base64');
}

/* ---------- THE focus-visibility check ----------
   Measures one element: unfocused pixels vs keyboard-focused pixels.
   `focusFn` must install focus the way a KEYBOARD would (see kb-01-probe for why that
   matters: :focus-visible does not match a cold scripted .focus() on a <button>). */
export async function focusVis(page, handle, focusFn, tol = 8) {
  // 1. guarantee nothing is focused, and no :focus-visible is painted anywhere
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); document.body.focus?.(); });
  await page.waitForTimeout(90);      // let any focus transition settle
  const rect = await handle.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (rect.w === 0 || rect.h === 0) return { skip: 'zero-size' };
  const before = await shotBox(page, rect);
  if (!before) return { skip: 'offscreen' };

  // 2. focus it the keyboard way
  await focusFn();
  await page.waitForTimeout(140);     // focus transitions are ~120ms in this app
  const after = await shotBox(page, rect);
  const fv = await handle.evaluate(el => { try { return el.matches(':focus-visible'); } catch (e) { return null; } });
  const d = await pxdiff(page, before, after, tol);
  return { ...d, focusVisible: fv, rect, before, after };
}

export const pct = (n, d) => d ? +(100 * n / d).toFixed(2) : 0;
