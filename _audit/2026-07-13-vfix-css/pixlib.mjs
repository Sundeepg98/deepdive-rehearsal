/* ============ PIXLIB -- measurement by DECODING RENDERED PIXELS ============
   Every check in this directory decodes the PNG the compositor actually produced.
   Nothing here asks the DOM what colour it thinks it is.

   WHY. Two measurement traps have already fooled reviewers of this repo THIS WEEK:

   1. getComputedStyle().backgroundColor returns `rgba(0,0,0,0)` on a gradient slab.
      The reviewer's own cta.mjs reports ratio=None for all six LIGHT-theme CTAs for
      exactly this reason -- it measured nothing and said so quietly. A contrast check
      that returns n/a on the very elements it exists to check cannot fail.

   2. opacity:0 on <body> does NOT propagate into a descendant's computed opacity.
      A visible-node counter therefore reports ~276 "visible" nodes on a totally blank
      page. It cannot fail either.

   Both are cured the same way: rasterise, then count the pixels that were actually
   painted. `decode()` runs the analysis INSIDE a helper page (canvas getImageData) so
   only a small summary crosses the CDP boundary, never a multi-megabyte pixel array. */

const relLum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const CR = (a, b) => {
  const L1 = relLum(a), L2 = relLum(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};

/* The in-page analyser. Runs in the helper page; returns a colour histogram + geometry,
   never raw pixels (a full-page RGBA array is ~4 MB and would crawl across CDP). */
async function analyse([b64, inset]) {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const W = c.width, H = c.height;
  const d = x.getImageData(0, 0, W, H).data;
  const hist = new Map();
  const i0 = Math.min(inset, Math.floor(W / 3)), j0 = Math.min(inset, Math.floor(H / 3));
  let n = 0;
  for (let j = j0; j < H - j0; j++) {
    for (let i = i0; i < W - i0; i++) {
      const o = (j * W + i) * 4;
      if (d[o + 3] < 250) continue;            // skip transparent
      const k = (d[o] << 16) | (d[o + 1] << 8) | d[o + 2];
      hist.set(k, (hist.get(k) || 0) + 1);
      n++;
    }
  }
  return { w: W, h: H, n, hist: [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4000) };
}

/** Screenshot `clip` on `page`, decode it on `helper`, return {w,h,n,hist:[[rgbInt,count]...]}. */
export async function grab(page, helper, clip, inset = 2) {
  const buf = await page.screenshot(clip ? { clip } : { fullPage: false });
  return helper.evaluate(analyse, [buf.toString('base64'), inset]);
}
const RGB = (k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255];

/* ---------------------------------------------------------------------------
   TEXT CONTRAST, SPATIALLY -- the version that survived being wrong once.

   A histogram-only reading of "the lightest background pixel" is WRONG, and wrong in
   the direction that manufactures failures. Proof, from this repo: the dark Mock-run
   button is #13BAAC text on a flat #1C353B slab -- 5.33:1 by hand, a clear PASS. The
   histogram method scored it 4.12:1 and called it a FAIL, because the button has a 1px
   #13BAAC border whose ANTIALIASED pixels are lighter than the slab, appear in their
   thousands, and get filed as "background". The check would have sent me off to fix six
   CTAs that were never broken -- and, far worse, it would have been just as happy to
   report a real regression as noise.

   So classify SPATIALLY, in three bands:
     FG    -- pixels near the glyph core colour.
     HALO  -- everything within `rHalo` of an FG pixel that is not itself FG. This is the
              antialiasing. It is neither text nor background. DISCARD IT.
     LOCAL -- background pixels within `rNear` of a glyph but outside the halo. This, and
              only this, is what the text is actually read against.

   Contrast is then the glyph core against the LOCAL band, taken at its worst percentile.
   On a flat slab this collapses to the textbook number; on a gradient it correctly follows
   the background under the glyphs and ignores the button's border and corners entirely. */
async function analyseText([b64, inset, rHalo, rNear]) {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const W = c.width, H = c.height;
  const d = x.getImageData(0, 0, W, H).data;

  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const at = (i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
  const inBox = (i) => {
    const px = i % W, py = (i / W) | 0;
    return px >= inset && py >= inset && px < W - inset && py < H - inset;
  };

  /* 1. SPLIT THE BOX INTO TEXT AND BACKGROUND -- BY LUMINANCE CLUSTER, NEVER BY MODE.
     "The most common colour is the background" is false on a GRADIENT, and it fails in the
     most dangerous possible way: it silently swaps text and background. Proof, from this
     repo: the light-theme Mock CTA is a 135deg gradient slab (#006B63 -> #00857A) with
     white text. The slab is spread across ~200 distinct RGB values with a few hundred
     pixels each; the text is ONE exact value, #ffffff, with a few thousand. So the mode is
     the TEXT. The reading came back "#006c64 text on #ffffff, 1.19:1 FAIL" -- fg and bg
     transposed -- and manufactured six CTA failures on six buttons that are demonstrably
     fine. (Dark passed only by luck: its slab is a flat color-mix, so the mode happened to
     be right.) Otsu on the luminance histogram groups every gradient stop into ONE class,
     and the class holding more pixels is the background. Area, not frequency. */
  const bins = new Float64Array(256), lumOf = new Float64Array(W * H);
  let n = 0;
  for (let i = 0; i < W * H; i++) {
    if (!inBox(i) || d[i * 4 + 3] < 250) continue;
    const l = L(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
    lumOf[i] = l; bins[Math.min(255, Math.round(l * 255))]++; n++;
  }
  if (!n) return null;
  let sum = 0; for (let t = 0; t < 256; t++) sum += t * bins[t];
  let sumB = 0, wB = 0, maxVar = -1, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += bins[t]; if (!wB) continue;
    const wF = n - wB; if (!wF) break;
    sumB += t * bins[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) { maxVar = v; thr = t; }
  }
  const cut = thr / 255;
  let nLo = 0; for (let i = 0; i < W * H; i++) if (inBox(i) && d[i * 4 + 3] >= 250 && lumOf[i] <= cut) nLo++;
  const bgIsLow = nLo >= n - nLo;                    // the BIGGER class is the background

  // representative colour of each class = its modal colour (within the class)
  const hist = [new Map(), new Map()];               // [0]=bg class, [1]=text class
  for (let i = 0; i < W * H; i++) {
    if (!inBox(i) || d[i * 4 + 3] < 250) continue;
    const isLow = lumOf[i] <= cut;
    const cls = (isLow === bgIsLow) ? 0 : 1;
    const k = (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2];
    hist[cls].set(k, (hist[cls].get(k) || 0) + 1);
  }
  const topOf = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  const bgTop = topOf(hist[0]), fgTop = topOf(hist[1]);
  if (!bgTop.length) return null;
  const bg = [(bgTop[0][0] >> 16) & 255, (bgTop[0][0] >> 8) & 255, bgTop[0][0] & 255];
  const bgL = L(...bg);

  /* 2. GLYPH CORE = inside the text class, the colour FURTHEST from bg in luminance that
     still holds real area. The nearest ones are antialias; the furthest is ink. */
  let fg = null, best = -1;
  const nText0 = [...hist[1].values()].reduce((a, b) => a + b, 0);
  for (const [k, cnt] of fgTop) {
    if (cnt < Math.max(12, nText0 * 0.01)) continue;
    const p = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
    const dl = Math.abs(L(...p) - bgL);
    if (dl > best) { best = dl; fg = p; }
  }
  if (!fg || best < 0.02) return { bg, fg: null, ratio: null, ratioWorst: null, note: 'no text' };
  const fgL = L(...fg);
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

  // 3. FG mask (glyph interiors)
  const isFG = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (inBox(i) && d[i * 4 + 3] >= 250 && dist(at(i), fg) < 34) isFG[i] = 1;

  // 4. HALO = antialiasing ring around the glyphs. Neither text nor background.
  const halo = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!isFG[i]) continue;
    const px = i % W, py = (i / W) | 0;
    for (let dy = -rHalo; dy <= rHalo; dy++) {
      for (let dx = -rHalo; dx <= rHalo; dx++) {
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        const j = qy * W + qx;
        if (!isFG[j]) halo[j] = 1;
      }
    }
  }

  // 5. LOCAL background = near a glyph, outside the halo. What the text is read against.
  const local = [];
  for (let i = 0; i < W * H; i++) {
    if (isFG[i] || halo[i] || !inBox(i) || d[i * 4 + 3] < 250) continue;
    const px = i % W, py = (i / W) | 0;
    let near = false;
    for (let dy = -rNear; dy <= rNear && !near; dy++) {
      for (let dx = -rNear; dx <= rNear && !near; dx++) {
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        if (isFG[qy * W + qx]) near = true;
      }
    }
    if (near) local.push(L(...at(i)));
  }
  const cr = (a, b) => { const [h, l] = a > b ? [a, b] : [b, a]; return (h + 0.05) / (l + 0.05); };
  let ratioWorst = cr(fgL, bgL), nLocal = local.length;
  if (nLocal >= 12) {
    local.sort((a, b) => a - b);
    const pct = (p) => local[Math.min(nLocal - 1, Math.max(0, Math.round(p * (nLocal - 1))))];
    ratioWorst = Math.min(cr(fgL, pct(0.02)), cr(fgL, pct(0.98)));
  }
  return {
    bg, fg,
    ratio: +cr(fgL, bgL).toFixed(2),          // vs the modal slab (the textbook number)
    ratioWorst: +ratioWorst.toFixed(2),       // vs the worst LOCAL background under the glyphs
    nText: isFG.reduce((a, b) => a + b, 0), nLocal,
  };
}

/** Pixel-decoded WCAG contrast of the text inside `clip` against its LOCAL background. */
export async function textContrastAt(page, helper, clip, { inset = 3, rHalo = 2, rNear = 7 } = {}) {
  const buf = await page.screenshot({ clip });
  return helper.evaluate(analyseText, [buf.toString('base64'), inset, rHalo, rNear]);
}

/* ---------------------------------------------------------------------------
   PAINTED PIXELS -- the reduced-motion check that CAN fail.

   Counts pixels that differ from the page's own background colour by more than
   `tol` per channel. A blank page returns ~0 no matter how many nodes the DOM
   reports as "visible", because a body at opacity:0 composites to exactly bg.
   --------------------------------------------------------------------------- */
export function paintedPixels(stats, tol = 8) {
  const { hist, n } = stats;
  if (!n) return { painted: 0, share: 0, bg: null, distinct: 0 };
  const bg = RGB(hist[0][0]);
  let painted = 0;
  for (const [k, c] of hist) {
    const p = RGB(k);
    if (Math.abs(p[0] - bg[0]) > tol || Math.abs(p[1] - bg[1]) > tol || Math.abs(p[2] - bg[2]) > tol) painted += c;
  }
  return { painted, share: +(painted / n).toFixed(4), bg, distinct: hist.length };
}

/* ---------------------------------------------------------------------------
   SALIENCE -- "which tile pops?", measured instead of asserted.

   A tile's salience is the mean euclidean RGB distance of its pixels from the page
   backdrop it sits on. A FILLED slab covers a large area far from the backdrop and
   scores high; an OUTLINED tile touches the backdrop almost everywhere and scores low.
   This is deliberately hue-agnostic: it is the quantity the eye actually integrates,
   which is why it catches "the failure count is the loudest thing on the board" --
   the exact bug the six-room pass introduced.
   --------------------------------------------------------------------------- */
export function salience(stats, backdrop) {
  const { hist, n } = stats;
  if (!n) return 0;
  let acc = 0;
  for (const [k, c] of hist) {
    const p = RGB(k);
    const dr = p[0] - backdrop[0], dg = p[1] - backdrop[1], db = p[2] - backdrop[2];
    acc += Math.sqrt(dr * dr + dg * dg + db * db) * c;
  }
  return +(acc / n).toFixed(2);
}

export const hex = (c) => c ? '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('') : '-';
export const modal = (stats) => stats && stats.hist.length ? RGB(stats.hist[0][0]) : null;
