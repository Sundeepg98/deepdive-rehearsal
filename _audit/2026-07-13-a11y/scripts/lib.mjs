/* Shared instrument for the mobile a11y audit.
 * Design rule: every measurement must be able to FAIL. Each check here has a
 * negative-control hook so we can break the page and watch the number go red.
 */
import { chromium } from 'playwright';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

export const APP = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
export const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
export const SHOTS = path.join(OUT, 'shots', 'mobile');
export const DATA = path.join(OUT, 'data');

export const PHONES = {
  p390: { width: 390, height: 844 }, // iPhone 14/15 class
  p360: { width: 360, height: 640 }, // baseline Android
};

export async function launch() {
  return chromium.launch({ channel: 'chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}

/** A real phone page: touch, mobile flag, 3x DPR. */
export async function phone(browser, viewport = PHONES.p390, extra = {}) {
  const ctx = await browser.newContext({
    viewport,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3,
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    ...extra,
  });
  const p = await ctx.newPage();
  await p.goto(APP, { waitUntil: 'load' });
  await p.waitForTimeout(1800); // the app boots panes + shadow hosts async
  return p;
}

/* ------------------------------------------------------------------ *
 * PAINTED PIXELS - the check the old audit did not have.
 * A node counter reports 276 "visible" nodes on a blank page because
 * opacity:0 on <body> does not propagate into descendants' computed
 * opacity. So we count INK: pixels that differ from the page's modal
 * (most common) colour. A blank page has exactly one colour -> 0 ink.
 * ------------------------------------------------------------------ */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error('depth ' + depth + ' unsupported');
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error('colour type ' + ctype + ' unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const A = x >= ch ? cur[x - ch] : 0;
      const B = prev ? prev[x] : 0;
      const C = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (filter === 1) v += A;
      else if (filter === 2) v += B;
      else if (filter === 3) v += (A + B) >> 1;
      else if (filter === 4) {
        const p = A + B - C, pa = Math.abs(p - A), pb = Math.abs(p - B), pc = Math.abs(p - C);
        v += pa <= pb && pa <= pc ? A : pb <= pc ? B : C;
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}

/** Ink = pixels whose colour differs from the modal colour. Blank page -> 0. */
export function paintedPixels(pngBuffer) {
  const { w, h, ch, data } = decodePNG(pngBuffer);
  const hist = new Map();
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const o = i * ch;
    const key = ch >= 3 ? (data[o] << 16) | (data[o + 1] << 8) | data[o + 2] : data[o];
    hist.set(key, (hist.get(key) || 0) + 1);
  }
  let modal = 0, best = -1;
  for (const [k, v] of hist) if (v > best) { best = v; modal = k; }
  return { total: n, painted: n - best, modalColour: '#' + modal.toString(16).padStart(6, '0'), distinctColours: hist.size };
}

export async function inkOf(page, name) {
  const buf = await page.screenshot({ fullPage: false });
  const ink = paintedPixels(buf);
  if (name) fs.writeFileSync(path.join(SHOTS, name), buf);
  return ink;
}

/* ------------------------------------------------------------------ *
 * DEEP DOM - the app has 17 shadow hosts. A document-only querySelectorAll
 * cannot see inside them, which is how a "59/59 pass" can be reported while
 * half the app's controls are unmeasured.
 * ------------------------------------------------------------------ */
export const DEEP_JS = `
window.__deepAll = function (sel, root, acc, pathPrefix) {
  root = root || document; acc = acc || []; pathPrefix = pathPrefix || '';
  for (const el of root.querySelectorAll(sel)) acc.push({ el, host: pathPrefix });
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) {
      const tag = el.tagName.toLowerCase();
      window.__deepAll(sel, el.shadowRoot, acc, pathPrefix ? pathPrefix + ' >> ' + tag : tag);
    }
  }
  return acc;
};
window.__deepFromPoint = function (x, y) {
  let el = document.elementFromPoint(x, y);
  let guard = 0;
  while (el && el.shadowRoot && guard++ < 12) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
};
window.__selOf = function (el) {
  if (!el) return null;
  const bits = [];
  let cur = el, guard = 0;
  while (cur && cur.nodeType === 1 && guard++ < 4) {
    let s = cur.tagName.toLowerCase();
    if (cur.id) { s += '#' + cur.id; bits.unshift(s); break; }
    const cls = (cur.getAttribute && cur.getAttribute('class') || '').trim().split(/\\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    bits.unshift(s);
    const rootNode = cur.getRootNode();
    cur = cur.parentElement || (rootNode && rootNode.host) || null;
  }
  return bits.join(' ');
};

/* The interactive surface. Note we do NOT stop at button/summary/[role=button]
 * (which is all the app's own 44px rule covers) - anchors, inputs, selects,
 * labels and cursor:pointer click-handlers are targets too. */
window.__INTERACTIVE = 'a[href],button,input,select,textarea,summary,label[for],' +
  '[role="button"],[role="link"],[role="tab"],[role="checkbox"],[role="radio"],' +
  '[role="switch"],[role="menuitem"],[role="menuitemcheckbox"],[role="option"],' +
  '[tabindex]:not([tabindex="-1"]),[onclick]';

/* TRUE tap area, not the border box.
 * A pseudo-element (::before{position:absolute;inset:-8px}) can enlarge the hit
 * region without touching getBoundingClientRect, and an overlapping sibling can
 * shrink it. So we hit-test: from a point that really belongs to this element,
 * walk out until elementFromPoint stops returning it or a descendant of it.
 * This is what a finger actually gets. */
window.__tapArea = function (el, cap) {
  cap = cap || 34; // probe +/-34px from the anchor => can measure up to ~68px
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const owns = function (hit) {
    if (!hit) return false;
    if (hit === el) return true;
    if (el.contains(hit)) return true;
    // pierce shadow boundaries upward: is 'hit' inside el's shadow tree?
    let cur = hit, guard = 0;
    while (cur && guard++ < 20) {
      if (cur === el) return true;
      const rn = cur.getRootNode();
      cur = cur.parentElement || (rn && rn.host) || null;
    }
    return false;
  };
  /* The anchor MUST be the element's own CENTRE.
   * Anchoring on any old owned pixel is how a control that is 80% scrolled out
   * of a horizontal strip reports a "tap area" of 18x37 - it measured the
   * sliver still poking into view, not the target. If the centre is not ours,
   * the element is occluded or clipped: say so, do not invent a size. */
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) {
    return { occluded: true, reason: 'centre-offscreen', rectW: Math.round(r.width * 10) / 10, rectH: Math.round(r.height * 10) / 10 };
  }
  const atCentre = window.__deepFromPoint(cx, cy);
  if (!owns(atCentre)) {
    return {
      occluded: true, reason: 'centre-not-ours',
      occludedBy: atCentre ? atCentre.tagName.toLowerCase() + (atCentre.id ? '#' + atCentre.id : '.' + (atCentre.getAttribute('class') || '').split(' ')[0]) : 'null',
      rectW: Math.round(r.width * 10) / 10, rectH: Math.round(r.height * 10) / 10,
    };
  }
  const ax = cx, ay = cy;
  const probe = function (dx, dy) {
    let d = 0;
    for (let i = 1; i <= cap; i++) {
      const px = ax + dx * i, py = ay + dy * i;
      if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) break;
      if (!owns(window.__deepFromPoint(px, py))) break;
      d = i;
    }
    return d;
  };
  const L = probe(-1, 0), R = probe(1, 0), U = probe(0, -1), D = probe(0, 1);
  return {
    occluded: false,
    rectW: Math.round(r.width * 10) / 10, rectH: Math.round(r.height * 10) / 10,
    hitW: L + R + 1, hitH: U + D + 1,
    cappedW: L >= cap || R >= cap, cappedH: U >= cap || D >= cap,
    x: Math.round(r.left), y: Math.round(r.top),
  };
};

/* deep ancestor walk, piercing shadow boundaries */
window.__ancestors = function (el) {
  const out = [];
  let cur = el, guard = 0;
  while (cur && guard++ < 60) {
    const rn = cur.getRootNode();
    cur = cur.parentElement || (rn && rn.host) || null;
    if (cur) out.push(cur);
  }
  return out;
};

/* Collect every visible interactive target, shadow DOM pierced.
 *
 * TWO TRAPS handled here, both of the same family as the opacity trap that
 * certified the blank page - a property read on the element alone lies about
 * what the user can actually see or touch:
 *
 *  1. The CSS cursor property INHERITS. Every <span> inside a <button>
 *     computes cursor:pointer, so a naive "cursor:pointer means it is a
 *     target" sweep invents a target for every label inside every button. We
 *     only count a cursor:pointer element when no ancestor is a real control.
 *  2. opacity/visibility/display on an ANCESTOR do not show up in the
 *     element's own computed style. We use checkVisibility(), which walks the
 *     chain, and then hit-test on top of it (which also catches occlusion).
 */
window.__collectTargets = function () {
  const out = [];
  const semantic = new Set(window.__deepAll(window.__INTERACTIVE).map((r) => r.el));
  const cands = new Map(); // el -> host path
  for (const rec of window.__deepAll(window.__INTERACTIVE)) cands.set(rec.el, rec.host);
  for (const rec of window.__deepAll('*')) {
    const el = rec.el;
    if (cands.has(el)) continue;
    let cs;
    try { cs = getComputedStyle(el); } catch (e) { continue; }
    if (cs.cursor !== 'pointer') continue;
    // outermost-only: skip if any ancestor is already a control or a pointer candidate
    const anc = window.__ancestors(el);
    if (anc.some((a) => semantic.has(a))) continue;
    if (anc.some((a) => { try { return getComputedStyle(a).cursor === 'pointer'; } catch (e) { return false; } })) continue;
    cands.set(el, rec.host);
  }
  for (const [el, host] of cands) {
    if (el.disabled) continue;
    // ancestor-aware visibility (display/visibility/opacity up the whole chain)
    let vis;
    try {
      vis = el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });
    } catch (e) { vis = true; }
    if (!vis) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;

    /* CLIPPED-BY-A-SCROLLER guard. The nine pane tabs live in a strip whose
     * scrollWidth is 976 inside a 390px phone: most of them are half out of
     * the clip box at any moment. Their TARGET is full size - they are merely
     * scrolled - so measuring the visible sliver would manufacture a failure.
     * Skip anything not fully inside every scrollable ancestor's clip box. */
    let clipped = false;
    for (const a of window.__ancestors(el)) {
      if (!a.getBoundingClientRect) continue;
      let acs;
      try { acs = getComputedStyle(a); } catch (e) { continue; }
      if (!/auto|scroll|hidden/.test(acs.overflowX + acs.overflowY)) continue;
      const ar = a.getBoundingClientRect();
      if (r.left < ar.left - 0.5 || r.right > ar.right + 0.5 || r.top < ar.top - 0.5 || r.bottom > ar.bottom + 0.5) { clipped = true; break; }
    }
    if (clipped) continue;

    const ta = window.__tapArea(el);
    if (!ta) continue;

    /* Is this a REAL control, or just something wearing cursor:pointer?
     * The walkthrough's 10 step-dots are <i> tags with cursor:pointer and a
     * :hover scale, no role, no tabindex - and clicking one changes nothing.
     * Counting them as tap targets would be as wrong as ignoring them. */
    const semantic = el.matches(window.__INTERACTIVE);
    out.push({
      sel: window.__selOf(el),
      host: host || '(light)',
      tag: el.tagName.toLowerCase(),
      text: (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 44),
      inShadow: !!host,
      kind: semantic ? 'semantic' : 'pointer-only',
      nested: window.__ancestors(el).some((a) => cands.has(a)),
      ...ta,
    });
  }
  return out;
};
`;

export async function installDeep(page) {
  await page.evaluate(DEEP_JS);
}

export function judge(t, floor = 44) {
  if (t.occluded) return 'OCCLUDED';
  const w = t.cappedW ? 99 : t.hitW;
  const h = t.cappedH ? 99 : t.hitH;
  return w >= floor && h >= floor ? 'PASS' : 'FAIL';
}

export function ensureDirs() {
  for (const d of [SHOTS, DATA]) fs.mkdirSync(d, { recursive: true });
}

export function save(name, obj) {
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(obj, null, 1));
}
