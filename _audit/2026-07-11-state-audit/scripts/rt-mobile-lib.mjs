/* Shared in-page measurement probe. Stringified into page.evaluate.
   Pierces shadow DOM (all 9 panes are shadow-DOM web components). */
export const PROBE = () => {
  /* ---------- deep traversal through shadow roots ---------- */
  function deepAll(root) {
    const out = [];
    const walk = (n) => {
      const kids = n.querySelectorAll ? n.querySelectorAll('*') : [];
      for (const el of kids) { out.push(el); if (el.shadowRoot) walk(el.shadowRoot); }
    };
    walk(root);
    return out;
  }
  function cssPath(el) {
    const parts = [];
    let e = el, guard = 0;
    while (e && e.nodeType === 1 && guard++ < 40) {
      let s = e.tagName.toLowerCase();
      if (e.id) s += '#' + e.id;
      else if (e.classList && e.classList.length) s += '.' + [...e.classList].slice(0, 2).join('.');
      parts.unshift(s);
      if (e.parentElement) { e = e.parentElement; continue; }
      const root = e.getRootNode();
      if (root && root.host) { parts.unshift('»shadow'); e = root.host; continue; }
      break;
    }
    return parts.slice(-7).join(' > ');
  }
  /* ancestor chain incl. shadow hosts */
  function ancestors(el) {
    const out = []; let e = el, guard = 0;
    while (e && guard++ < 40) {
      if (e.parentElement) { e = e.parentElement; }
      else { const r = e.getRootNode(); if (r && r.host) e = r.host; else break; }
      if (e && e.nodeType === 1) out.push(e);
    }
    return out;
  }
  function visible(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  const VW = document.documentElement.clientWidth;
  const VH = document.documentElement.clientHeight;

  /* is el inside a fixed-position container that sits entirely off-screen (a closed sheet)? */
  function offscreenFixed(el) {
    const chain = [el, ...ancestors(el)];
    for (const a of chain) {
      if (getComputedStyle(a).position === 'fixed') {
        const r = a.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= VH || r.right <= 0 || r.left >= VW) return true;
      }
    }
    return false;
  }
  /* does any ancestor clip horizontal overflow (so it can't leak to the document)? */
  function hClipped(el) {
    for (const a of ancestors(el)) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'hidden' || ox === 'auto' || ox === 'scroll' || ox === 'clip') return true;
    }
    return false;
  }

  const all = deepAll(document);
  const vis = all.filter(visible);

  /* ---------- 1. document horizontal overflow ---------- */
  const de = document.documentElement;
  const hOverflow = de.scrollWidth - de.clientWidth;
  const offenders = [];
  if (hOverflow > 0) {
    for (const el of vis) {
      if (offscreenFixed(el)) continue;
      const r = el.getBoundingClientRect();
      const overRight = r.right - VW;
      if (overRight > 1 || r.left < -1) {
        if (hClipped(el)) continue;             // contained by a scroller/clipper
        offenders.push({
          sel: cssPath(el), tag: el.tagName.toLowerCase(),
          left: +r.left.toFixed(1), right: +r.right.toFixed(1),
          w: +r.width.toFixed(1), overRight: +overRight.toFixed(1),
          pos: getComputedStyle(el).position
        });
      }
    }
    offenders.sort((a, b) => b.overRight - a.overRight);
  }

  /* ---------- 2. vertical scroll / phantom whitespace ---------- */
  const nonFixedVis = vis.filter(e => {
    const chain = [e, ...ancestors(e)];
    return !chain.some(a => getComputedStyle(a).position === 'fixed');
  });
  let maxBottom = 0;
  for (const el of nonFixedVis) {
    const r = el.getBoundingClientRect();
    const docBottom = r.bottom + window.scrollY;
    if (docBottom > maxBottom) maxBottom = docBottom;
  }
  const vScroll = {
    docScrollH: de.scrollHeight, docClientH: de.clientHeight,
    bodyScrollH: document.body.scrollHeight, bodyClientH: document.body.clientHeight,
    scrollable: de.scrollHeight - de.clientHeight,
    maxContentBottom: +maxBottom.toFixed(1),
    phantom: +(de.scrollHeight - maxBottom).toFixed(1)   // slack below the last real content
  };

  /* ---------- 3. fixed bars vs .app padding (occlusion) ---------- */
  const app = document.querySelector('.app');
  const seg = document.querySelector('.sidebar .seg');
  const cta = document.querySelector('.sidebar .mockcta');
  const mb = document.querySelector('.sidebar .mockbar');
  const gcs = e => e ? getComputedStyle(e) : null;
  const rct = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1), w: +r.width.toFixed(1) }; };
  const bars = {
    segH: rct(seg)?.h ?? null,
    ctaH: rct(cta)?.h ?? null,
    ctaTop: rct(cta)?.top ?? null,
    appPadTop: parseFloat(gcs(app)?.paddingTop || '0'),
    appPadBottom: parseFloat(gcs(app)?.paddingBottom || '0'),
    mockbar: mb ? {
      display: gcs(mb).display, visibility: gcs(mb).visibility,
      transform: gcs(mb).transform, rect: rct(mb),
      inDoc: true,
      // is it reachable by keyboard while "closed"?
      focusableCount: [...mb.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(x => !x.hasAttribute('disabled') && x.tabIndex >= 0).length,
      ariaHidden: mb.getAttribute('aria-hidden'),
      inert: mb.hasAttribute('inert')
    } : null
  };
  bars.topOcclusion = +(bars.segH - bars.appPadTop).toFixed(1);      // >0 => content hidden under top bar
  bars.bottomOcclusion = +(bars.ctaH - bars.appPadBottom).toFixed(1); // >0 => content hidden under bottom bar

  /* ---------- 4. tap targets (WCAG 2.5.5 = 44x44) ---------- */
  const SEL = 'button,a[href],[role="button"],input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
  const targets = [];
  for (const el of vis) {
    if (!el.matches || !el.matches(SEL)) continue;
    if (offscreenFixed(el)) continue;                   // closed sheet -> not tappable now
    if (el.hasAttribute('disabled')) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const inlineInText = cs.display === 'inline';       // WCAG inline-in-sentence exception
    targets.push({
      sel: cssPath(el), tag: el.tagName.toLowerCase(),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      min: +Math.min(r.width, r.height).toFixed(1),
      inline: inlineInText,
      txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    });
  }
  const under44 = targets.filter(t => !t.inline && (t.w < 44 || t.h < 44));
  const under24 = targets.filter(t => !t.inline && (t.w < 24 || t.h < 24));

  /* ---------- 5. small text (<12px) ---------- */
  const small = [];
  for (const el of vis) {
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) small.push({
      sel: cssPath(el), fs: +fs.toFixed(2),
      txt: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 45)
    });
  }
  small.sort((a, b) => a.fs - b.fs);

  /* ---------- 6. containers that overflow their own box ---------- */
  const boxOverflow = [];
  for (const el of vis) {
    const over = el.scrollWidth - el.clientWidth;
    if (over <= 1) continue;
    if (el === de || el === document.body) continue;
    const ox = getComputedStyle(el).overflowX;
    const t = el.tagName.toLowerCase();
    boxOverflow.push({
      sel: cssPath(el), tag: t, over, ox,
      clientW: el.clientWidth, scrollW: el.scrollWidth,
      // hidden/clip => content is CUT OFF (data loss). visible => leaks out. auto/scroll => intended.
      kind: (ox === 'hidden' || ox === 'clip') ? 'CLIPPED' : (ox === 'visible' ? 'LEAKS' : 'scrollable')
    });
  }
  boxOverflow.sort((a, b) => b.over - a.over);

  return {
    vw: VW, vh: VH,
    hOverflow, offenders: offenders.slice(0, 12),
    vScroll, bars,
    tapTotal: targets.length,
    under44: under44.sort((a, b) => a.min - b.min).slice(0, 25),
    under44Count: under44.length,
    under24Count: under24.length,
    small: small.slice(0, 15), smallCount: small.length,
    boxOverflow: boxOverflow.slice(0, 12)
  };
};
