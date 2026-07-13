/* lib.mjs -- instruments for VERIFYING the a11y-css fixes.
 *
 * Descended from the audit's mc-lib.mjs (the calibrated alpha-recovery contrast pipeline),
 * repointed at THIS worktree's dist and extended with the four instruments the fixes need:
 *   selectorReach()  -- how many nodes a selector matches in the light DOM vs shadow roots
 *   ruleEffect()     -- did a media-query rule actually CHANGE a computed value (before/after)
 *   tileDistance()   -- pixel distance between two scoreboard tiles (the fill signal)
 *   rowClipping()    -- content lost inside a control at a given text zoom
 *   clipDetect()     -- what is CUT OFF by a clipping container (NOT scrollWidth on <html>,
 *                       which .stage{overflow-x:hidden} makes structurally incapable of failing)
 *
 * THE RULE: no number is quoted until its instrument has been watched going RED.
 * Every script here runs its own negative control and aborts if the control does not fire.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..', '..');
export const APP_URL = 'file:///' + path.join(ROOT, 'dist', 'index.html').replace(/\\/g, '/');
export const SHOTS = path.join(HERE, 'shots');

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

export async function launch() { return chromium.launch(); }

/** opts: {reducedMotion, forcedColors, contrast, colorScheme, viewport, hasTouch, isMobile} */
export async function openApp(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport || VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: opts.reducedMotion,
    forcedColors: opts.forcedColors,
    contrast: opts.contrast,
    colorScheme: opts.colorScheme,
    hasTouch: opts.hasTouch,
    isMobile: opts.isMobile,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.__errors = errors;
  page.__ctx = ctx;
  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.TopicRegistry, null, { timeout: 30000 });
  await settle(page);
  if (opts.keepOnboarding !== true) await dismissIndex(page);
  return page;
}

/* THE ONBOARDING TRAP. index-overlay.js auto-opens the full-screen Topic index on any profile
 * with no saved progress -- i.e. EVERY fresh Playwright run -- with backdrop-filter:blur(8px)
 * over the app. Measure without dismissing it and you measure the onboarding panel, and every
 * contrast number behind it is of BLURRED text. */
export async function dismissIndex(page) {
  const isOpen = () => page.evaluate(() => !!document.getElementById('_index-overlay')?.classList.contains('open'));
  if (!(await isOpen())) return;
  await page.keyboard.press('Escape');
  for (let i = 0; i < 20; i++) {
    if (!(await isOpen())) return;
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => {
    const ov = document.getElementById('_index-overlay');
    const x = ov?.querySelector('.ix-x, button');
    if (x) x.click();
  });
  await page.waitForTimeout(400);
}

export async function settle(page, ms = 700) { await page.waitForTimeout(ms); }

/* Block until nothing is animating. The audit proved a scan taken MID-FADE scores a transient
 * blended frame and invents violations that do not exist at rest. */
export async function settleAnimations(page, timeout = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const running = await page.evaluate(() => {
      try { return document.getAnimations().filter((a) => a.playState === 'running').length; }
      catch { return 0; }
    });
    if (running === 0) { await page.waitForTimeout(80); return true; }
    await page.waitForTimeout(80);
  }
  return false;
}

export async function setRoom(page, topic) {
  await page.evaluate((t) => window.TopicRegistry.setTopic(t), topic);
  await settle(page, 450);
}
export async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('dd_theme', t); } catch { /* ignore */ }
  }, theme);
  await settle(page, 250);
}
export async function showPane(page, pane) {
  await page.evaluate((p) => window.switchTab && window.switchTab(p), pane);
  await settle(page, 450);
}

/* ---------------------------------------------------------------- decoder */
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

/* PAINTED PIXELS -- a blank-page detector. `opacity:0` on <body> does NOT propagate into a
 * descendant's computed opacity, so a "count visible text nodes" check reports hundreds of
 * visible nodes on a page that paints nothing. Decode the framebuffer instead. */
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
    return { width: img.width, height: img.height, painted, modal: [mr, mg, mb], uniqueColors: hist.size };
  }, { b64, eps });
}

/* Mean colour of a rect, decoded from a real screenshot. Used for tile fill detection. */
export async function rectColor(decoder, pngBuffer, rect) {
  const b64 = pngBuffer.toString('base64');
  return decoder.evaluate(async ({ b64, rect }) => {
    const img = await window.__decode(b64);
    const d = img.data, W = img.width;
    const hist = new Map();
    for (let y = Math.max(0, rect.y); y < Math.min(rect.y + rect.h, img.height); y++) {
      for (let x = Math.max(0, rect.x); x < Math.min(rect.x + rect.w, W); x++) {
        const p = (y * W + x) * 4;
        const k = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2];
        hist.set(k, (hist.get(k) || 0) + 1);
      }
    }
    let modal = 0, best = -1;
    for (const [k, n] of hist) if (n > best) { best = n; modal = k; }
    return [(modal >> 16) & 255, (modal >> 8) & 255, modal & 255];
  }, { b64, rect });
}

export function colorDistance(a, b) {
  return Math.round(Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) * 100) / 100;
}

/* ------------------------------------------------------- contrast pipeline */
export async function collectTargets(page, specs) {
  return page.evaluate((specs) => {
    const out = [];
    const roots = [document];
    const walk = (r) => r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) { roots.push(e.shadowRoot); walk(e.shadowRoot); } });
    walk(document);
    for (const spec of specs) {
      for (const root of roots) {
        let els;
        try { els = [...root.querySelectorAll(spec.sel)]; } catch { continue; }
        for (const el of els) {
          const ownText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
          const cs = getComputedStyle(el);
          const bef = getComputedStyle(el, '::before').content;
          const hasGlyph = bef && bef !== 'none' && bef !== 'normal' && bef !== '""';
          if (!ownText && !hasGlyph) continue;
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
          if (el.hasAttribute('data-mc-target')) continue;
          const id = out.length;
          el.setAttribute('data-mc-target', String(id));
          /* Save the app's OWN inline colour before forcing. The audit's first sweep restored
           * with removeProperty('color'), which DELETED the app's own JS-set inline declaration
           * on the sidebar Focus chip and manufactured a 1.28:1 false failure. Restore must put
           * back exactly what was there. */
          el.setAttribute('data-mc-oc', el.style.getPropertyValue('color'));
          el.setAttribute('data-mc-ocp', el.style.getPropertyPriority('color'));
          el.setAttribute('data-mc-of', el.style.getPropertyValue('-webkit-text-fill-color'));
          el.setAttribute('data-mc-ofp', el.style.getPropertyPriority('-webkit-text-fill-color'));
          out.push({
            id, label: spec.label, sel: spec.sel,
            tag: el.tagName.toLowerCase(),
            cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0, 40),
            inShadow: root !== document,
            host: root !== document ? root.host.tagName.toLowerCase() : null,
            text: (el.textContent || '').trim().slice(0, 48),
            color: cs.color,
            fontSize: parseFloat(cs.fontSize),
            fontWeight: cs.fontWeight,
            opacity: cs.opacity,
            rect: { x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)), w: Math.ceil(r.width), h: Math.ceil(r.height) },
          });
        }
      }
    }
    return out;
  }, specs);
}

export async function forceTargetColor(page, value) {
  await page.evaluate((value) => {
    const roots = [document];
    const walk = (r) => r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) { roots.push(e.shadowRoot); walk(e.shadowRoot); } });
    walk(document);
    for (const root of roots) {
      root.querySelectorAll('[data-mc-target]').forEach((el) => {
        if (value === null) {
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

export async function clearTargets(page) {
  await page.evaluate(() => {
    const roots = [document];
    const walk = (r) => r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) { roots.push(e.shadowRoot); walk(e.shadowRoot); } });
    walk(document);
    for (const root of roots) {
      root.querySelectorAll('[data-mc-target]').forEach((el) => {
        ['data-mc-target', 'data-mc-oc', 'data-mc-ocp', 'data-mc-of', 'data-mc-ofp'].forEach((a) => el.removeAttribute(a));
      });
    }
  });
}

/* Four renders -> exact per-pixel glyph coverage -> WCAG over the GLYPH CORE only.
 *   A = text #000  =>  a*0   + (1-a)*bg
 *   B = text #fff  =>  a*255 + (1-a)*bg     =>  B-A = 255a on every channel
 *   T = transparent =>  bg exactly, INCLUDING under the glyph core
 *   N = normal      =>  what the eye sees
 * The core cut is RELATIVE (a >= 0.98*alphaMax): an absolute cut admits antialiased edge
 * pixels (reads black-on-white as 14.9 instead of 21) and breaks for any element with
 * opacity<1 -- which .pill.z is, and which is the whole point here.
 */
export async function analyzeContrast(decoder, { N, T, A, B, targets, coreFrac = 0.98 }) {
  return decoder.evaluate(async (args) => {
    const [imgN, imgT, imgA, imgB] = await Promise.all(
      [args.N, args.T, args.A, args.B].map((b) => window.__decode(b))
    );
    const W = imgN.width, H = imgN.height;
    const dN = imgN.data, dT = imgT.data, dA = imgA.data, dB = imgB.data;

    const owner = new Int32Array(W * H).fill(-1);
    const area = new Float64Array(args.targets.length);
    args.targets.forEach((t, i) => { area[i] = t.rect.w * t.rect.h; });
    const order = args.targets.map((_, i) => i).sort((a, b) => area[b] - area[a]);
    for (const i of order) {
      const { x, y, w, h } = args.targets[i].rect;
      for (let yy = y; yy < Math.min(y + h, H); yy++) {
        for (let xx = x; xx < Math.min(x + w, W); xx++) owner[yy * W + xx] = i;
      }
    }

    const res = args.targets.map((t) => ({
      id: t.id, label: t.label, text: t.text, color: t.color, fontSize: t.fontSize,
      fontWeight: t.fontWeight, opacity: t.opacity, inShadow: t.inShadow, host: t.host,
      sel: t.sel, tag: t.tag, cls: t.cls, corePx: 0, ratios: [], alphaMax: 0,
    }));

    const alpha = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = owner[y * W + x];
        if (i < 0) continue;
        const p = (y * W + x) * 4;
        const a = ((dB[p] - dA[p]) + (dB[p + 1] - dA[p + 1]) + (dB[p + 2] - dA[p + 2])) / (3 * 255);
        alpha[y * W + x] = a;
        if (a > res[i].alphaMax) res[i].alphaMax = a;
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = owner[y * W + x];
        if (i < 0) continue;
        const r = res[i];
        if (r.alphaMax < 0.15) continue;
        if (alpha[y * W + x] < args.coreFrac * r.alphaMax) continue;
        const p = (y * W + x) * 4;
        r.corePx++;
        r.ratios.push(window.__contrast([dN[p], dN[p + 1], dN[p + 2]], [dT[p], dT[p + 1], dT[p + 2]]));
      }
    }
    for (const r of res) {
      if (!r.ratios.length) { r.min = null; r.median = null; delete r.ratios; continue; }
      r.ratios.sort((a, b) => a - b);
      r.min = +r.ratios[0].toFixed(2);
      r.median = +r.ratios[Math.floor(0.5 * r.ratios.length)].toFixed(2);
      r.max = +r.ratios[r.ratios.length - 1].toFixed(2);
      r.alphaMax = +r.alphaMax.toFixed(3);
      delete r.ratios;
    }
    return res;
  }, { N: N.toString('base64'), T: T.toString('base64'), A: A.toString('base64'), B: B.toString('base64'), targets, coreFrac });
}

/* Full 4-render sweep for a page in its CURRENT state. Returns measured targets. */
export async function measureContrast(page, decoder, specs) {
  await settleAnimations(page);
  const targets = await collectTargets(page, specs);
  if (!targets.length) return [];
  const N = await page.screenshot({ animations: 'disabled' });
  await forceTargetColor(page, 'transparent');
  const T = await page.screenshot({ animations: 'disabled' });
  await forceTargetColor(page, '#000000');
  const A = await page.screenshot({ animations: 'disabled' });
  await forceTargetColor(page, '#ffffff');
  const B = await page.screenshot({ animations: 'disabled' });
  await forceTargetColor(page, null);
  const res = await analyzeContrast(decoder, { N, T, A, B, targets });
  await clearTargets(page);
  return res;
}

/* WCAG floor: large text (>=24px, or >=18.66px bold) is 3.0; everything else 4.5. */
export function wcagFloor(fontSize, fontWeight) {
  const w = parseInt(fontWeight, 10) || 400;
  const large = fontSize >= 24 || (fontSize >= 18.66 && w >= 700);
  return large ? 3.0 : 4.5;
}

/* ------------------------------------------------ shadow-boundary instruments */

/* How many nodes does a selector actually match, light DOM vs shadow roots?
 * This is the measurement that proves a light-DOM rule is dead. */
export async function selectorReach(page, selectors) {
  return page.evaluate((sels) => {
    const shadowRoots = [];
    const walk = (r) => r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) { shadowRoots.push(e.shadowRoot); walk(e.shadowRoot); } });
    walk(document);
    const out = {};
    for (const s of sels) {
      let light = 0, shadow = 0;
      try { light = document.querySelectorAll(s).length; } catch { /* ignore */ }
      for (const r of shadowRoots) { try { shadow += r.querySelectorAll(s).length; } catch { /* ignore */ } }
      out[s] = { light, shadow };
    }
    return out;
  }, selectors);
}

/* Read a computed property off the first node matching `sel`, searching shadow roots too. */
export async function computedIn(page, sel, props) {
  return page.evaluate(({ sel, props }) => {
    const roots = [document];
    const walk = (r) => r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) { roots.push(e.shadowRoot); walk(e.shadowRoot); } });
    walk(document);
    for (const root of roots) {
      let el;
      try { el = root.querySelector(sel); } catch { continue; }
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      const out = { found: true, inShadow: root !== document, host: root !== document ? root.host.tagName.toLowerCase() : null };
      for (const p of props) out[p] = cs.getPropertyValue(p);
      return out;
    }
    return { found: false };
  }, { sel, props });
}

/* ------------------------------------------------ clipping / reflow instruments */

/* WHAT IS BEING CUT OFF. NOT `documentElement.scrollWidth > innerWidth` -- .stage{overflow-x:hidden}
 * makes that structurally incapable of failing (the audit injected a 900px div into a 320px
 * viewport and it still said "no overflow"). Ask every CLIPPING container whether its content
 * is wider than its box, and every element whether it spills past its clipping ancestor. */
export async function clipDetect(page, minPx = 2) {
  return page.evaluate((minPx) => {
    const roots = [document];
    const walk = (r) => r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) { roots.push(e.shadowRoot); walk(e.shadowRoot); } });
    walk(document);

    /* A VISUALLY-HIDDEN ELEMENT IS NOT CONTENT LOSS -- IT IS THE OPPOSITE.
     * view-manager.js's aria-live region is `position:absolute;left:-10000px;width:1px;height:1px;
     * overflow:hidden` -- the standard screen-reader announcement pattern. Its 1px box "clips" 90px
     * of text BY DESIGN, and the first version of this detector duly reported it as the worst
     * content loss on the page, at every width. "Fixing" that would have deleted the only thing
     * announcing topic changes to a screen reader. An a11y instrument that flags a correct a11y
     * pattern as a bug is worse than no instrument. Skip the off-screen 1px clip pattern. */
    const isVisuallyHidden = (el, cs, r) => {
      if (r.width <= 1 || r.height <= 1) return true;                 // the 1x1 clip idiom
      if (r.right < 0 || r.bottom < 0) return true;                   // parked off-screen
      if (cs.clipPath && cs.clipPath !== 'none' && cs.clipPath.includes('inset(50%')) return true;
      return false;
    };

    const clippers = [];
    for (const root of roots) {
      for (const el of root.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const ox = cs.overflowX;
        if (ox !== 'hidden' && ox !== 'clip' && ox !== 'auto' && ox !== 'scroll') continue;
        const cut = el.scrollWidth - el.clientWidth;
        if (cut <= minPx) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (isVisuallyHidden(el, cs, r)) continue;

        /* IS THE SAME TEXT RENDERED IN FULL SOMEWHERE ELSE ON SCREEN?
         * WCAG 1.4.10 forbids LOSS OF INFORMATION, not truncation per se. #tncurrent is the topic
         * switcher's current-value label and it ellipsises at 320px -- but the <h1> directly above
         * it renders the SAME topic name in full ("Production Debugging and Incident Diagnosis",
         * scrollWidth == clientWidth, measured). The information is on screen; a deliberate
         * ellipsis on a redundant secondary label is a standard, permitted pattern.
         * This is a RULE, not an exemption: it is stated, it is checked against the live DOM, and
         * it CAN STILL FAIL -- hide the <h1> and #tncurrent is immediately reported as loss (the
         * negative control in 04-reflow.mjs does exactly that). An ID-based allowlist could not
         * fail, and would be the seventh such check in this repo. */
        const want = (el.textContent || '').trim().replace(/\s+/g, ' ');
        let echoedInFull = false;
        if (want.length > 2) {
          for (const cand of document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,button,a,li,td')) {
            if (cand === el || cand.contains(el) || el.contains(cand)) continue;
            if ((cand.textContent || '').trim().replace(/\s+/g, ' ') !== want) continue;
            const ccs = getComputedStyle(cand), cr = cand.getBoundingClientRect();
            if (ccs.display === 'none' || ccs.visibility === 'hidden' || ccs.opacity === '0') continue;
            if (cr.width < 2 || cr.height < 2) continue;
            if (cand.scrollWidth > cand.clientWidth + 1 || cand.scrollHeight > cand.clientHeight + 1) continue;
            echoedInFull = true; break;
          }
        }

        clippers.push({
          sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
               (el.className && el.className.toString ? '.' + el.className.toString().trim().split(/\s+/).join('.') : ''),
          host: root !== document ? root.host.tagName.toLowerCase() : null,
          overflowX: ox,
          scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, cut,
          /* overflow-x:auto/scroll is a DESIGNED one-axis scroller (the 9-tab strip is 976px in a
           * 390px phone, on purpose). WCAG 1.4.10 permits it; content is reachable, not lost. */
          scrollable: ox === 'auto' || ox === 'scroll',
          echoedInFull,
          text: want.slice(0, 40),
        });
      }
    }
    clippers.sort((a, b) => b.cut - a.cut);
    return { docScrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, clippers };
  }, minPx);
}

/* Emulate TEXT-ONLY zoom (the Android font-size slider / iOS Dynamic Type) -- what WCAG 1.4.4 is
 * about: multiply every computed font-size ONCE, leave layout px alone.
 *
 * *** THIS MUST BE TWO-PHASE, AND THE ONE-PHASE VERSION IS A LIAR. ***
 * The obvious implementation walks the tree and, for each element, reads getComputedStyle().fontSize
 * and writes back fontSize*2. In DOM order that means a CHILD reads the size its parent was ALREADY
 * rewritten to -- and doubles it again. It COMPOUNDS ONCE PER NESTING LEVEL. Measured on the real
 * tools sheet with factor 2:
 *      html  16 -> 32   (x2, correct)     body    16 -> 64   (x4)
 *      .mb-tx 12 -> 48  (x4)              .mb-t   12 -> 96   (x8)
 * A .mb-t at 96px wraps "One-page cram sheet" over 510px, and the row's scrollHeight comes out at
 * 705px. That is where the "needs 705px in a 42px box (-663px)" figure comes from: it is an
 * artefact of the instrument, not a property of the app. (The audit's own text-zoom script has the
 * same defect and reports the same 705 -- two implementations of one mistake agreeing is not
 * corroboration. It is the same species as the checks-that-cannot-fail this repo keeps shipping,
 * only inverted: a check that cannot PASS.)
 * SNAPSHOT EVERY ORIGINAL SIZE FIRST, THEN WRITE. Each element is then scaled exactly once, from
 * its true cascaded value. Crosses the shadow boundary by walking the roots explicitly. */
export async function applyTextZoom(page, factor) {
  await page.evaluate((factor) => {
    const roots = [document];
    const walk = (r) => r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) { roots.push(e.shadowRoot); walk(e.shadowRoot); } });
    walk(document);
    const els = [];
    for (const root of roots) for (const el of root.querySelectorAll('*')) els.push(el);
    /* PHASE 1 -- read every ORIGINAL computed size, mutating nothing. */
    const orig = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
    /* PHASE 2 -- now write. No read can be polluted by a write. */
    window.__tz = [];
    window.__tzOrig = [];   /* the TRUE pre-zoom sizes, captured before any mutation */
    els.forEach((el, i) => {
      if (!orig[i]) return;
      window.__tz.push([el, el.style.getPropertyValue('font-size'), el.style.getPropertyPriority('font-size')]);
      window.__tzOrig.push([el, orig[i]]);
      el.style.setProperty('font-size', (orig[i] * factor) + 'px', 'important');
    });
  }, factor);
  await page.waitForTimeout(300);
}

/* THE NEGATIVE CONTROL FOR THE ZOOM INSTRUMENT ITSELF.
 * After applying factor f, every element's computed font-size must be EXACTLY f x the size it had
 * BEFORE any mutation (captured in phase 1, so this is not the instrument marking its own homework).
 * The one-phase walk fails this loudly: it reports elements at 4x and 8x. Run it every time --
 * an instrument that silently compounds is how "-663px" got published. */
export async function verifyTextZoom(page, factor) {
  return page.evaluate((factor) => {
    let worstRatio = factor, worstEl = null, bad = 0, total = 0;
    for (const [el, before] of (window.__tzOrig || [])) {
      const now = parseFloat(getComputedStyle(el).fontSize);
      if (!before || !now) continue;
      total++;
      const ratio = now / before;
      if (Math.abs(ratio - factor) > 0.01) {
        bad++;
        if (Math.abs(ratio - factor) > Math.abs(worstRatio - factor)) {
          worstRatio = ratio;
          worstEl = el.tagName.toLowerCase() + (el.className && el.className.toString ? '.' + el.className.toString().trim().split(/\s+/)[0] : '')
                  + ' (' + before + 'px -> ' + now + 'px)';
        }
      }
    }
    return { factor, worstRatio: +worstRatio.toFixed(3), worstEl, elementsOffTarget: bad, total };
  }, factor);
}
export async function clearTextZoom(page) {
  await page.evaluate(() => {
    for (const [el, v, p] of (window.__tz || [])) {
      el.style.removeProperty('font-size');
      if (v) el.style.setProperty('font-size', v, p);
    }
    window.__tz = [];
  });
  await page.waitForTimeout(200);
}

/* Content lost INSIDE a control: is the content taller/wider than the box that clips it? */
export async function rowClipping(page, sel) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      /* the visible text of a row = what a sighted user can actually read in the box.
       * A row whose content is 705px tall in a 42px window shows a random 42px slice. */
      const needH = el.scrollHeight, boxH = el.clientHeight;
      return {
        sel: el.id ? '#' + el.id : el.className,
        w: Math.round(r.width), h: Math.round(r.height),
        needH, boxH, cut: needH - boxH,
        overflow: cs.overflow, flexShrink: cs.flexShrink,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48),
      };
    });
  }, sel);
}

export async function shot(page, name) {
  const p = path.join(SHOTS, name);
  await page.screenshot({ path: p, animations: 'disabled' });
  return p;
}

/* A hard assert that PRINTS. A check whose negative control did not fire is decoration --
 * abort rather than publish a number from a dead instrument. */
export function assertControl(label, fired) {
  console.log(`  [control] ${label}: ${fired ? 'FIRED (instrument can go RED)' : '*** DID NOT FIRE -- INSTRUMENT IS DEAD ***'}`);
  if (!fired) { console.error('\nABORT: negative control did not fire. Every number below would be decoration.'); process.exit(2); }
}
