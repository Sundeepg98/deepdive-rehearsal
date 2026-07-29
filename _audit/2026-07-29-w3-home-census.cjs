/* ================== W3 HOME IDENTITY -- THE CENSUS INSTRUMENT ==================
 *
 * Re-runs the 2026-07-29 frontend audit's own home-screen measurements so the W3
 * wave's before/after numbers come from ONE instrument rather than two prose
 * claims. Not a gate check -- it asserts nothing and always exits 0. It prints.
 *
 * WHAT IT MEASURES, per theme, on the home route (hash '', the VR boot state):
 *   1. FONT CENSUS under #home -- every descendant element bucketed by the
 *      computed font-family it actually renders in:
 *        uaArial   the bare string "Arial" -- Chrome's UA <button> default. This
 *                  is the finding: a button that never re-declares the family.
 *        display   the Space Grotesk stack (--display)
 *        appBody   the app's own system stack (Segoe UI here)
 *        mono      the --mono stack
 *      Reported over ALL descendants and over TEXT-BEARING ones (an element with
 *      a non-empty direct text child), because only the latter renders glyphs.
 *   2. DISPLAY-FACE COUNT on #home -- the audit's "ZERO on #home vs 198 on a
 *      topic route" number.
 *   3. THE HERO'S COLOUR -- .hm-cta's computed background/border, the root --acc,
 *      the root data-group, the CTA's DESTINATION topic and that topic's room,
 *      and the six room inks for this theme. This is what decides whether the
 *      hero wears a room that means anything.
 *   4. LATENT-ARIAL buttons app-wide is NOT here -- test/latent_arial.cjs owns it.
 *
 * Usage: node _audit/2026-07-29-w3-home-census.cjs [deliverable.html]
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./../test/_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const THEMES = ['light', 'dark'];

/* The six rooms, in TOPIC_GROUPS order. Hardcoded for the same reason
   visual_regression.cjs hardcodes its room list: deriving it from the page would
   let the page define its own yardstick. */
const ROOMS = ['messaging-events', 'data-storage', 'reliability-observability',
  'platform-infra', 'architecture-apis', 'security-tenancy'];

const CENSUS = (rooms) => {
  const home = document.getElementById('home');
  if (!home) return { err: 'no #home' };

  const cs = (el) => getComputedStyle(el);
  const bucket = (ff) => {
    if (/Space Grotesk/i.test(ff)) return 'display';
    if (/^Arial$/i.test(ff.trim())) return 'uaArial';
    if (/monospace|ui-monospace|Menlo|Consolas/i.test(ff)) return 'mono';
    return 'appBody';
  };
  const hasOwnText = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  };

  const all = [...home.querySelectorAll('*')];
  const tally = (els) => {
    const t = { uaArial: 0, appBody: 0, mono: 0, display: 0, total: els.length };
    for (const el of els) t[bucket(cs(el).fontFamily)]++;
    return t;
  };
  const texty = all.filter(hasOwnText);

  /* which classes are rendering in the UA default -- the actionable half */
  const arialBy = {};
  for (const el of all) {
    if (bucket(cs(el).fontFamily) !== 'uaArial') continue;
    const k = el.tagName.toLowerCase() + '.' + (el.className || '(none)');
    arialBy[k] = (arialBy[k] || 0) + 1;
  }

  /* ---- the hero ---- */
  const cta = home.querySelector('.hm-cta');
  const root = document.documentElement;
  const rootCs = cs(root);
  let dest = null, destGroup = null;
  if (cta) {
    dest = cta.getAttribute('data-topic');
    if (!dest) {
      const h = cta.getAttribute('data-hash') || '';
      dest = h.replace(/^#/, '').split('/')[0] || null;
    }
    try {
      const t = dest && window.TopicRegistry && TopicRegistry.get(dest);
      destGroup = (t && t.identity && t.identity.group) || null;
    } catch (e) { destGroup = null; }
  }

  const roomInk = {};
  for (const r of rooms) roomInk[r] = rootCs.getPropertyValue('--room-' + r).trim();

  const ctaCs = cta ? cs(cta) : null;
  const brand = home.querySelector('.hm-brand');

  return {
    all: tally(all),
    texty: tally(texty),
    arialBy,
    displayEls: all.filter((el) => bucket(cs(el).fontFamily) === 'display')
      .map((el) => el.tagName.toLowerCase() + '.' + (el.className || '')),
    hero: cta ? {
      dest, destGroup,
      bg: ctaCs.backgroundColor,
      border: ctaCs.borderTopColor,
      fontFamily: ctaCs.fontFamily,
      titleFs: (() => { const t = home.querySelector('.hm-cta-t'); return t ? cs(t).fontSize + ' / ' + cs(t).fontFamily : null; })(),
      arFs: (() => { const a = home.querySelector('.hm-cta-ar'); return a ? cs(a).fontSize : null; })(),
      accOnCta: ctaCs.getPropertyValue('--acc').trim(),
      rmOnCta: ctaCs.getPropertyValue('--rm').trim(),
    } : null,
    rootGroup: root.getAttribute('data-group'),
    rootAcc: rootCs.getPropertyValue('--acc').trim(),
    brandColor: brand ? cs(brand).color : null,
    roomInk,
    /* the two .hm-h section heads */
    hmH: [...home.querySelectorAll('.hm-h')].map((h) => h.textContent.trim() + ' :: ' + cs(h).fontFamily.split(',')[0] + ' @' + cs(h).fontSize),
    /* room cards + topic cards -- must stay neutral-disciplined */
    geom: {
      homeScrollH: home.scrollHeight,
      ctaH: cta ? Math.round(cta.getBoundingClientRect().height) : null,
      cardH: (() => { const c = home.querySelector('.ix-card'); return c ? Math.round(c.getBoundingClientRect().height) : null; })(),
      roomCardH: (() => { const r = home.querySelector('.hm-room'); return r ? Math.round(r.getBoundingClientRect().height) : null; })(),
    },
    /* WCAG contrast of the hero's ink on its own fill -- the slab contract */
    heroContrast: (() => {
      if (!cta) return null;
      const px = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const L = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
      const a = L(px(ctaCs.backgroundColor)), b = L(px(ctaCs.color));
      const hi = Math.max(a, b), lo = Math.min(a, b);
      return Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100;
    })(),
    roomCardAcc: (() => { const r = home.querySelector('.hm-room'); return r ? cs(r).getPropertyValue('--acc').trim() : null; })(),
    topicCardAcc: (() => { const c = home.querySelector('.ix-card'); return c ? cs(c).getPropertyValue('--acc').trim() : null; })(),
    crossAcc: (() => { const c = home.querySelector('.ix-cross'); return c ? cs(c).borderTopColor : null; })(),
  };
};

/* The topic-route display-face count the audit compared against (198 live elements). */
const DISPLAY_ON_ROUTE = () => {
  const seen = [];
  const roots = [document];
  const walk = (r) => {
    for (const el of r.querySelectorAll('*')) {
      if (el.shadowRoot && roots.indexOf(el.shadowRoot) === -1) { roots.push(el.shadowRoot); }
      if (/Space Grotesk/i.test(getComputedStyle(el).fontFamily)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) seen.push(el.tagName.toLowerCase());
      }
    }
  };
  for (let i = 0; i < roots.length; i++) walk(roots[i]);
  return seen.length;
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const out = {};
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1, reducedMotion: 'no-preference', forcedColors: 'none',
      locale: 'en-US', timezoneId: 'UTC',
    });
    const page = await ctx.newPage();
    await page.addInitScript((t) => {
      try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) { /* ignore */ }
    }, theme);
    await B.gotoApp(page, HTML, { hash: '' });
    await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash');
    await B.until(page, () => !!document.querySelector('#home .hm-cta'), null, B.ACT_MS, 'home rendered');
    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
    out[theme] = await page.evaluate(CENSUS, ROOMS);
    await ctx.close();

    /* the comparison route: display-face count on a topic route, its own context
       so the boot path is identical to the home one (no in-page hash mutation) */
    const ctx2 = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1, reducedMotion: 'no-preference', forcedColors: 'none',
      locale: 'en-US', timezoneId: 'UTC',
    });
    const page2 = await ctx2.newPage();
    await page2.addInitScript((t) => {
      try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) { /* ignore */ }
    }, theme);
    await B.gotoApp(page2, HTML, { hash: '#event-driven/walk' });
    await B.until(page2, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash (walk)');
    try { await page2.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
    out[theme].displayOnTopicRoute = await page2.evaluate(DISPLAY_ON_ROUTE);
    await ctx2.close();
  }
  await browser.close();

  for (const theme of THEMES) {
    const d = out[theme];
    console.log('\n===================== ' + theme.toUpperCase() + ' =====================');
    if (d.err) { console.log('ERR ' + d.err); continue; }
    const pct = (n, t) => (t ? (n / t * 100).toFixed(1) : '0.0') + '%';
    console.log('font census, ALL #home descendants  : ' + JSON.stringify(d.all)
      + '   uaArial=' + pct(d.all.uaArial, d.all.total));
    console.log('font census, TEXT-BEARING only      : ' + JSON.stringify(d.texty)
      + '   uaArial=' + pct(d.texty.uaArial, d.texty.total));
    console.log('display face on #home               : ' + d.all.display
      + '   (on a topic route: ' + d.displayOnTopicRoute + ')');
    if (d.all.display) console.log('  display elements: ' + JSON.stringify([...new Set(d.displayEls)]));
    console.log('.hm-h section heads                 : ' + JSON.stringify(d.hmH));
    console.log('root data-group / --acc             : ' + d.rootGroup + ' / ' + d.rootAcc);
    console.log('hero destination topic / its room   : ' + d.hero.dest + ' / ' + d.hero.destGroup);
    console.log('hero bg / border                    : ' + d.hero.bg + ' / ' + d.hero.border);
    console.log('hero --acc / --rm                   : ' + d.hero.accOnCta + ' / ' + (d.hero.rmOnCta || '(unset)'));
    console.log('hero title size / face              : ' + d.hero.titleFs);
    console.log('hero arrow size                     : ' + d.hero.arFs);
    console.log('.hm-brand color                     : ' + d.brandColor);
    console.log('room card --acc / topic card --acc  : ' + d.roomCardAcc + ' / ' + d.topicCardAcc);
    console.log('.ix-cross border                    : ' + d.crossAcc);
    console.log('hero ink-on-fill contrast (WCAG)    : ' + d.heroContrast + ':1');
    console.log('geometry (home scrollH / cta / topic card / room card): '
      + d.geom.homeScrollH + ' / ' + d.geom.ctaH + ' / ' + d.geom.cardH + ' / ' + d.geom.roomCardH);
    console.log('six room inks                       :');
    for (const r of ROOMS) console.log('    ' + r.padEnd(28) + d.roomInk[r]);
    const ariaKeys = Object.entries(d.arialBy).sort((a, b) => b[1] - a[1]);
    if (ariaKeys.length) {
      console.log('UA-Arial elements by selector       :');
      for (const [k, n] of ariaKeys) console.log('    ' + String(n).padStart(4) + '  ' + k);
    } else {
      console.log('UA-Arial elements by selector       : NONE');
    }
  }
})();
