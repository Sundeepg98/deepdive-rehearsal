/* mc-lib.mjs — instruments for the REDUCED-MOTION / FORCED-COLORS / CONTRAST lens.
 *
 * Design rule: every metric here must be able to go RED. Each has a negative control
 * in mc-00-calibrate.mjs that deliberately breaks the thing and shows the number move.
 *
 * PAINTED PIXELS, not node counts. `opacity:0` on <body> does NOT propagate into the
 * computed opacity of descendants, so a "count visible nodes" check reports hundreds of
 * visible nodes on a page that paints nothing. We decode the actual framebuffer.
 *
 * CONTRAST is measured by ALPHA RECOVERY, not getComputedStyle (which returns the useless
 * literal "linear-gradient(...)" for the gradient CTAs, and cannot see a background that
 * varies under the glyph). For a target whose text colour we force:
 *     A = render with colour #000   ->  A_c = a*0   + (1-a)*bg_c
 *     B = render with colour #fff   ->  B_c = a*255 + (1-a)*bg_c
 *   => B_c - A_c = 255a  for EVERY channel c   ->  a (per-pixel glyph coverage), exactly.
 *     T = render with colour transparent -> T_c = bg_c, the LOCAL background at every pixel,
 *                                           INCLUDING the pixels underneath the glyph core.
 *     N = normal render -> the colour the eye actually sees at that pixel.
 * Contrast is then WCAG(N[p], T[p]) over the glyph CORE pixels (high a) only. Antialiased
 * edge pixels and the surrounding button field are excluded by construction, which is what
 * stops the "worst background pixel anywhere in the button" artefact that manufactured six
 * bogus ~3.1:1 failures on buttons that are demonstrably fine.
 */
import { chromium } from 'playwright';

export const APP_URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

/* One representative topic per room, from TOPIC_ORDER (see mc-probe2). */
export const ROOMS = [
  { group: 'messaging-events', topic: 'event-driven' },
  { group: 'data-storage', topic: 'caching' },
  { group: 'reliability-observability', topic: 'retries-timeouts' },
  { group: 'platform-infra', topic: 'iac' },
  { group: 'architecture-apis', topic: 'state-machine' },
  { group: 'security-tenancy', topic: 'signing' },
];
export const THEMES = ['light', 'dark'];

export const VIEWPORT = { width: 1280, height: 900 };

export async function launch() {
  return chromium.launch();
}

/** Open the app under a given emulation. opts: {reducedMotion, forcedColors, contrast} */
export async function openApp(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1, // exact pixel math; no resampling
    reducedMotion: opts.reducedMotion, // 'reduce' | 'no-preference' | undefined
    forcedColors: opts.forcedColors, // 'active' | 'none' | undefined
    contrast: opts.contrast, // 'more' | 'no-preference' | undefined
    colorScheme: opts.colorScheme,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.__errors = errors;
  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.TopicRegistry, null, { timeout: 20000 });
  await settle(page);
  if (opts.keepOnboarding !== true) await dismissIndex(page);
  return page;
}

/* THE ONBOARDING TRAP.
 * index-overlay.js:427 — `if (!window.__bootHash && !hasProgress) setTimeout(open, 30)` — so on
 * a FIRST RUN (which is what every fresh Playwright profile is) the full-screen "Topic index"
 * overlay auto-opens over the app, with backdrop-filter:blur(8px) on everything behind it.
 * Measure without dismissing this and you are measuring the ONBOARDING PANEL, and every contrast
 * number you take of the app behind it is of BLURRED text. Dismiss it the way a user does. */
export async function dismissIndex(page) {
  const isOpen = () => page.evaluate(() => !!document.getElementById('_index-overlay')?.classList.contains('open'));
  if (!(await isOpen())) return;
  await page.keyboard.press('Escape');
  for (let i = 0; i < 20; i++) {
    if (!(await isOpen())) return;
    await page.waitForTimeout(50);
  }
  // fall back to the close control
  await page.evaluate(() => {
    const ov = document.getElementById('_index-overlay');
    const x = ov?.querySelector('[aria-label*="close" i], .ix-x, .ix-close, button');
    if (x) x.click();
  });
  await page.waitForTimeout(400);
}

export async function settle(page, ms = 700) {
  await page.waitForTimeout(ms);
}

export async function setRoom(page, topic) {
  await page.evaluate((t) => window.TopicRegistry.setTopic(t), topic);
  await settle(page, 500);
}

export async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('dd_theme', t); } catch { /* ignore */ }
  }, theme);
  await settle(page, 300);
}

export async function showPane(page, pane) {
  await page.evaluate((p) => window.switchTab && window.switchTab(p), pane);
  await settle(page, 500);
}

/* ---------------------------------------------------------------- decoder */
/* A second page used purely as an exact PNG decoder (createImageBitmap +
 * OffscreenCanvas). No native deps, and lossless. */
export async function makeDecoder(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({
    content: `
      window.__decode = async function(b64){
        const bin = atob(b64);
        const u8 = new Uint8Array(bin.length);
        for (let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
        const bmp = await createImageBitmap(new Blob([u8], {type:'image/png'}));
        const cv = new OffscreenCanvas(bmp.width, bmp.height);
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(bmp, 0, 0);
        return cx.getImageData(0, 0, bmp.width, bmp.height);
      };
      window.__srgbLin = function(c){ c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
      window.__lum = function(r,g,b){ return 0.2126*window.__srgbLin(r)+0.7152*window.__srgbLin(g)+0.0722*window.__srgbLin(b); };
      window.__contrast = function(a,b){
        const l1 = window.__lum(a[0],a[1],a[2]), l2 = window.__lum(b[0],b[1],b[2]);
        const hi = Math.max(l1,l2), lo = Math.min(l1,l2);
        return (hi+0.05)/(lo+0.05);
      };
    `,
  });
  return page;
}

/* PAINTED PIXELS. The modal (most common) colour is the page's background field; a pixel
 * is "painted" if it differs from that field by more than `eps` in any channel. A page that
 * renders nothing is a uniform field => painted === 0. This is the metric the previous audit
 * did not have, and it is the one that would have caught the blank page. */
export async function paintedPixels(decoder, pngBuffer, eps = 8) {
  const b64 = pngBuffer.toString('base64');
  return decoder.evaluate(async ({ b64, eps }) => {
    const img = await window.__decode(b64);
    const d = img.data;
    const hist = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      hist.set(k, (hist.get(k) || 0) + 1);
    }
    let modal = 0, best = -1;
    for (const [k, n] of hist) if (n > best) { best = n; modal = k; }
    const mr = (modal >> 16) & 255, mg = (modal >> 8) & 255, mb = modal & 255;
    let painted = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - mr) > eps || Math.abs(d[i + 1] - mg) > eps || Math.abs(d[i + 2] - mb) > eps) painted++;
    }
    return {
      width: img.width,
      height: img.height,
      total: img.width * img.height,
      painted,
      paintedPct: +(100 * painted / (img.width * img.height)).toFixed(3),
      modal: [mr, mg, mb],
      modalPct: +(100 * best / (img.width * img.height)).toFixed(2),
      uniqueColors: hist.size,
    };
  }, { b64, eps });
}

/* THE TRAP, reproduced. This is (a charitable version of) what the previous audit counted:
 * "visible" DOM text nodes. It reports hundreds on a blank page, because opacity:0 on an
 * ancestor does not propagate into a descendant's COMPUTED opacity. Kept so the report can
 * show the two numbers side by side. */
export async function naiveVisibleNodeCount(page) {
  return page.evaluate(() => {
    let n = 0;
    const walk = (root) => {
      const els = root.querySelectorAll('*');
      for (const el of els) {
        if (el.shadowRoot) walk(el.shadowRoot);
        const txt = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
        if (!txt) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        n++;
      }
    };
    walk(document);
    return n;
  });
}

/* ------------------------------------------------------- contrast pipeline */

/* Collect leaf text-bearing elements (light DOM + all shadow roots) matching a selector
 * list, with their viewport bboxes and computed colours. */
export async function collectTargets(page, specs) {
  return page.evaluate((specs) => {
    const out = [];
    const roots = [document];
    document.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) roots.push(e.shadowRoot); });
    for (const spec of specs) {
      for (const root of roots) {
        let els;
        try { els = [...root.querySelectorAll(spec.sel)]; } catch { continue; }
        for (const el of els) {
          // leaf-ish: must directly own non-empty text, or own a ::before/::after glyph
          const ownText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
          const cs = getComputedStyle(el);
          const bef = getComputedStyle(el, '::before').content;
          const hasGlyph = bef && bef !== 'none' && bef !== 'normal' && bef !== '""';
          if (!ownText && !hasGlyph) continue;
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
          if (el.hasAttribute('data-mc-target')) continue; // already claimed by an earlier spec
          const id = out.length;
          el.setAttribute('data-mc-target', String(id));
          /* SAVE the element's ORIGINAL inline colour declarations before anything is forced.
           * Some colours in this app are set INLINE BY JS (the sidebar "Focus" chip is one). An
           * earlier version of this restore just called removeProperty('color'), which deleted the
           * APP'S OWN inline colour along with mine -- the chip then fell back to a stylesheet
           * black, and the sweep duly reported it at 1.28:1 in dark theme. That was a false failure
           * MANUFACTURED BY THE INSTRUMENT. Restore has to put back exactly what was there. */
          el.setAttribute('data-mc-oc', el.style.getPropertyValue('color'));
          el.setAttribute('data-mc-ocp', el.style.getPropertyPriority('color'));
          el.setAttribute('data-mc-of', el.style.getPropertyValue('-webkit-text-fill-color'));
          el.setAttribute('data-mc-ofp', el.style.getPropertyPriority('-webkit-text-fill-color'));
          out.push({
            id,
            label: spec.label,
            sel: spec.sel,
            tag: el.tagName.toLowerCase(),
            cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0, 40),
            inShadow: root !== document,
            host: root !== document ? root.host.tagName.toLowerCase() : null,
            text: (el.textContent || '').trim().slice(0, 48),
            color: cs.color,
            fontSize: parseFloat(cs.fontSize),
            fontWeight: cs.fontWeight,
            opacity: cs.opacity,
            /* WCAG 1.4.3 explicitly exempts INACTIVE user-interface components. The walkthrough's
             * "Prev" button on step 1 is disabled and dimmed to 32% -- reporting it as a contrast
             * violation would be a false positive. Record the state; do not silently drop it. */
            disabled: (() => {
              let n = el;
              while (n && n.nodeType === 1) {
                if (n.disabled === true || n.getAttribute('aria-disabled') === 'true' || n.classList.contains('disabled') || n.classList.contains('off')) return true;
                const rt = n.getRootNode();
                n = n.parentElement || (rt instanceof ShadowRoot ? rt.host : null);
              }
              return false;
            })(),
            rect: { x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)), w: Math.ceil(r.width), h: Math.ceil(r.height) },
          });
        }
      }
    }
    return out;
  }, specs);
}

/* Force the text colour of every collected target, so a single screenshot yields the
 * A / B / T render for ALL of them at once. Uses inline !important, which reaches into
 * shadow DOM (a stylesheet in the light DOM cannot). */
export async function forceTargetColor(page, value) {
  await page.evaluate((value) => {
    const roots = [document];
    document.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) roots.push(e.shadowRoot); });
    for (const root of roots) {
      root.querySelectorAll('[data-mc-target]').forEach((el) => {
        if (value === null) {
          // put back EXACTLY what the app had inline (see the note in collectTargets)
          const oc = el.getAttribute('data-mc-oc') || '';
          const of = el.getAttribute('data-mc-of') || '';
          el.style.removeProperty('color');
          el.style.removeProperty('-webkit-text-fill-color');
          if (oc) el.style.setProperty('color', oc, el.getAttribute('data-mc-ocp') || '');
          if (of) el.style.setProperty('-webkit-text-fill-color', of, el.getAttribute('data-mc-ofp') || '');
        } else {
          el.style.setProperty('color', value, 'important');
          el.style.setProperty('-webkit-text-fill-color', value, 'important');
        }
      });
    }
  }, value);
  await page.waitForTimeout(120);
}

/* Given the four renders, recover per-target glyph coverage + local background and compute
 * the WCAG contrast distribution over the glyph CORE. */
export async function analyzeContrast(decoder, { N, T, A, B, targets, coreFrac = 0.98 }) {
  return decoder.evaluate(async (args) => {
    const [imgN, imgT, imgA, imgB] = await Promise.all(
      [args.N, args.T, args.A, args.B].map((b) => window.__decode(b))
    );
    const W = imgN.width, H = imgN.height;
    const dN = imgN.data, dT = imgT.data, dA = imgA.data, dB = imgB.data;

    // Ownership map: a pixel belongs to the SMALLEST target bbox containing it, so a
    // parent's box never claims a child's glyphs.
    const owner = new Int32Array(W * H).fill(-1);
    const area = new Float64Array(args.targets.length);
    args.targets.forEach((t, i) => { area[i] = t.rect.w * t.rect.h; });
    const order = args.targets.map((_, i) => i).sort((a, b) => area[b] - area[a]); // big first, small overwrite
    for (const i of order) {
      const { x, y, w, h } = args.targets[i].rect;
      for (let yy = y; yy < Math.min(y + h, H); yy++) {
        for (let xx = x; xx < Math.min(x + w, W); xx++) owner[yy * W + xx] = i;
      }
    }

    const res = args.targets.map((t) => ({
      id: t.id, label: t.label, text: t.text, color: t.color, fontSize: t.fontSize,
      fontWeight: t.fontWeight, opacity: t.opacity, inShadow: t.inShadow, host: t.host,
      sel: t.sel, tag: t.tag, cls: t.cls, rect: t.rect, disabled: t.disabled,
      corePx: 0, ratios: [], alphaMax: 0, chanSpreadMax: 0, coreChanSpread: 0,
    }));

    /* Coverage map. alpha = (B - A)/255 per channel, exactly (see header). */
    const alpha = new Float32Array(W * H);
    const spreadMap = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = owner[y * W + x];
        if (i < 0) continue;
        const p = (y * W + x) * 4;
        const a0 = (dB[p] - dA[p]) / 255;
        const a1 = (dB[p + 1] - dA[p + 1]) / 255;
        const a2 = (dB[p + 2] - dA[p + 2]) / 255;
        const a = (a0 + a1 + a2) / 3;
        alpha[y * W + x] = a;
        /* Per-channel coverage disagreement. Chromium renders text with SUBPIXEL (LCD)
         * antialiasing here, so at glyph EDGES the R/G/B subpixels are covered differently
         * and this runs high (~0.7). It collapses to ~0 on the glyph CORE, which is the only
         * place we sample -- and that is exactly why the core-relative threshold matters. */
        spreadMap[y * W + x] = Math.max(a0, a1, a2) - Math.min(a0, a1, a2);
        const r = res[i];
        if (a > r.alphaMax) r.alphaMax = a;
        if (spreadMap[y * W + x] > r.chanSpreadMax) r.chanSpreadMax = spreadMap[y * W + x];
      }
    }

    /* PASS 2 — the GLYPH CORE only.
     * The core threshold is RELATIVE to each element's own peak coverage, not absolute.
     * Absolute (e.g. a >= 0.85) admits antialiased EDGE pixels, whose composited colour is a
     * fg/bg blend -- taking a min over those reports the antialiasing, not the text. (It read
     * black-on-white as 14.9:1 instead of 21:1.) It also breaks for any element carrying
     * opacity<1 (.pill.z is at .62), whose fully-covered pixels never reach 0.85 at all.
     * a >= 0.98*alphaMax means "the pixels this glyph covers as solidly as it ever does". */
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = owner[y * W + x];
        if (i < 0) continue;
        const r = res[i];
        if (r.alphaMax < 0.15) continue; // no real glyph here
        if (alpha[y * W + x] < args.coreFrac * r.alphaMax) continue;
        const p = (y * W + x) * 4;
        r.corePx++;
        if (spreadMap[y * W + x] > r.coreChanSpread) r.coreChanSpread = spreadMap[y * W + x];
        // N = what the eye actually sees at this glyph pixel (so an element's own opacity is
        // honestly included); T = the LOCAL background beneath that very pixel.
        r.ratios.push(window.__contrast([dN[p], dN[p + 1], dN[p + 2]], [dT[p], dT[p + 1], dT[p + 2]]));
      }
    }

    for (const r of res) {
      if (!r.ratios.length) { r.min = null; r.p05 = null; r.median = null; r.max = null; delete r.ratios; continue; }
      r.ratios.sort((a, b) => a - b);
      const q = (f) => r.ratios[Math.min(r.ratios.length - 1, Math.floor(f * r.ratios.length))];
      r.min = +r.ratios[0].toFixed(2);
      r.p05 = +q(0.05).toFixed(2);
      r.median = +q(0.5).toFixed(2);
      r.max = +r.ratios[r.ratios.length - 1].toFixed(2);
      r.alphaMax = +r.alphaMax.toFixed(3);
      r.chanSpreadMax = +r.chanSpreadMax.toFixed(3);
      r.coreChanSpread = +r.coreChanSpread.toFixed(3);
      delete r.ratios;
    }
    return res;
  }, { N: N.toString('base64'), T: T.toString('base64'), A: A.toString('base64'), B: B.toString('base64'), targets, coreFrac });
}

/* WCAG threshold for a given text size/weight (large text = >=24px, or >=18.66px bold). */
export function wcagFloor(fontSize, fontWeight) {
  const w = parseInt(fontWeight, 10) || 400;
  const large = fontSize >= 24 || (fontSize >= 18.66 && w >= 700);
  return large ? 3.0 : 4.5;
}

export async function shot(page, path) {
  return page.screenshot({ path, animations: 'disabled' });
}
export async function shotBuf(page) {
  return page.screenshot({ animations: 'disabled' });
}
