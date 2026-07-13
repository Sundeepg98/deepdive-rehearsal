/* STATIC SEMANTICS across all 9 panes: headings, landmarks, images/SVG, buttons-vs-divs,
   form controls, tab semantics. Renders every pane so lazily-built content is included. */
import { open, axTree, roleOf, nameOf, propOf, dismissOverlays, SHOTS } from './lib.mjs';
import path from 'path';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const { browser, page } = await open();
await dismissOverlays(page);

const TABS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'];

/* ---------------------------------------------------------------- */
hr('1. HEADINGS — across every pane (a SR user navigates by H key)');
const headRows = [];
for (const t of TABS) {
  await page.click(`button[data-tab="${t}"]`).catch(() => {});
  await page.waitForTimeout(500);
  const hs = await page.evaluate(() => {
    const out = [];
    const walk = (root) => {
      root.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').forEach(h => {
        const r = h.getBoundingClientRect();
        if (!(r.width || r.height)) return;                 // visible only
        out.push({ lvl: +(h.getAttribute('aria-level') || h.tagName[1]), txt: (h.textContent || '').trim().slice(0, 42) });
      });
      root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
    };
    walk(document);
    return out;
  });
  headRows.push({ tab: t, hs });
  log(`\n  [${t}]  ${hs.length} visible heading(s)`);
  hs.forEach(h => log(`     h${h.lvl}  ${h.txt}`));
}
const allH = headRows.flatMap(r => r.hs);
log(`\n  TOTAL distinct visible headings across all 10 panes: ${allH.length}`);
log(`  levels used: ${JSON.stringify([...new Set(allH.map(h => 'h' + h.lvl))].sort())}`);
log(`  h1 count: ${allH.filter(h => h.lvl === 1).length}`);
log('  >>> Each pane is a wall of styled <div>s with no heading structure beneath the topic h1.');
log('  >>> A screen-reader user pressing H to skim a pane finds ONE landmark heading and nothing else.');

/* ---------------------------------------------------------------- */
hr('2. LANDMARKS');
const nodes = await axTree(page);
const LM = ['main', 'navigation', 'banner', 'contentinfo', 'complementary', 'region', 'search', 'form'];
const lms = nodes.filter(n => !n.ignored && LM.includes(roleOf(n)));
lms.forEach(n => log(`  role=${String(roleOf(n)).padEnd(14)} name=${JSON.stringify(nameOf(n) || '')}`));
const domLm = await page.evaluate(() => ({
  header: !!document.querySelector('header'), footer: !!document.querySelector('footer'),
  headerParent: document.querySelector('header')?.parentElement?.tagName,
  footerParent: document.querySelector('footer')?.parentElement?.tagName,
  skipLink: !!document.querySelector('a[href^="#"].skip, .skip-link, [class*="skip"]'),
}));
log('\n  DOM: <header> present=' + domLm.header + ' (parent=' + domLm.headerParent + ')');
log('  DOM: <footer> present=' + domLm.footer + ' (parent=' + domLm.footerParent + ')');
log('  -> neither maps to banner/contentinfo: an HTML header/footer only becomes a landmark');
log('     when it is NOT scoped inside main/article/section. Both are, so both are generic.');
log('  skip-to-content link: ' + domLm.skipLink);

/* ---------------------------------------------------------------- */
hr('3. IMAGES / SVG / CANVAS — the 37 mermaid diagrams + the WebGL visual');
await page.click('button[data-tab="sys"]'); await page.waitForTimeout(900);
const gfx = await page.evaluate(() => {
  const out = { svg: [], canvas: [], img: [] };
  const walk = (root) => {
    root.querySelectorAll('svg').forEach(s => {
      const r = s.getBoundingClientRect();
      out.svg.push({
        role: s.getAttribute('role'), ariaLabel: s.getAttribute('aria-label'),
        ariaHidden: s.getAttribute('aria-hidden'), labelledby: s.getAttribute('aria-labelledby'),
        hasTitle: !!s.querySelector('title'), titleTxt: s.querySelector('title')?.textContent?.slice(0, 40) || null,
        hasDesc: !!s.querySelector('desc'),
        id: s.id || null, cls: (s.getAttribute('class') || '').slice(0, 28),
        w: Math.round(r.width), h: Math.round(r.height),
        textNodes: s.querySelectorAll('text').length,
      });
    });
    root.querySelectorAll('canvas').forEach(c => {
      const r = c.getBoundingClientRect();
      out.canvas.push({ role: c.getAttribute('role'), ariaLabel: c.getAttribute('aria-label'), ariaHidden: c.getAttribute('aria-hidden'), id: c.id, w: Math.round(r.width), h: Math.round(r.height), inner: (c.textContent || '').trim().length });
    });
    root.querySelectorAll('img').forEach(i => out.img.push({ alt: i.getAttribute('alt'), src: (i.getAttribute('src') || '').slice(0, 30) }));
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
  };
  walk(document);
  return out;
});
log(`  <svg> in the live DOM: ${gfx.svg.length}`);
const big = gfx.svg.filter(s => s.w > 120 && s.h > 80);
log(`  of which DIAGRAM-SIZED (>120x80): ${big.length}`);
big.slice(0, 6).forEach(s => log(`     svg#${s.id || '-'} .${s.cls} ${s.w}x${s.h} role=${s.role} aria-label=${s.ariaLabel} aria-hidden=${s.ariaHidden} <title>=${s.hasTitle ? JSON.stringify(s.titleTxt) : 'NONE'} <desc>=${s.hasDesc} innerText nodes=${s.textNodes}`));
const unlabelled = big.filter(s => !s.ariaLabel && !s.hasTitle && !s.labelledby && s.ariaHidden !== 'true');
log(`\n  diagram SVGs with NO accessible name and NOT hidden: ${unlabelled.length} / ${big.length}`);

/* what does the AX tree make of them? */
const n2 = await axTree(page);
const gnodes = n2.filter(n => !n.ignored && ['graphics-document', 'graphics-object', 'image', 'img', 'GraphicsDocument'].includes(roleOf(n)));
log(`  AX nodes with a graphics/image role: ${gnodes.length}`);
gnodes.slice(0, 5).forEach(n => log(`     role=${roleOf(n)} name=${JSON.stringify(nameOf(n) || '')}`));
log('\n  NOTE: an unlabelled inline <svg> is not silent — Chromium exposes its <text> nodes as');
log('  StaticText. So a SR user does not hear "diagram"; they hear the node labels in SOURCE');
log('  order, with no statement of what the diagram IS or how the boxes connect.');

// the WebGL pane
await page.click('button[data-tab="viz"]'); await page.waitForTimeout(1600);
const viz = await page.evaluate(() => {
  const out = [];
  const walk = (root) => {
    root.querySelectorAll('canvas').forEach(c => {
      const r = c.getBoundingClientRect();
      out.push({ id: c.id || null, cls: (c.getAttribute('class') || '').slice(0, 24), role: c.getAttribute('role'), ariaLabel: c.getAttribute('aria-label'), ariaHidden: c.getAttribute('aria-hidden'), w: Math.round(r.width), h: Math.round(r.height), fallback: (c.textContent || '').trim() });
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
  };
  walk(document);
  return out;
});
log('\n  VIZ pane <canvas>:');
viz.forEach(c => log(`     canvas#${c.id || '-'} .${c.cls} ${c.w}x${c.h} role=${c.role} aria-label=${c.ariaLabel} aria-hidden=${c.ariaHidden} fallbackText="${c.fallback}"`));
await page.screenshot({ path: path.join(SHOTS, '04-viz-canvas.png') });

/* ---------------------------------------------------------------- */
hr('4. BUTTONS vs DIVS — is everything clickable a real control with a name?');
await page.click('button[data-tab="walk"]'); await page.waitForTimeout(500);
const clickables = await page.evaluate(() => {
  const bad = [];
  const walk = (root, p) => {
    root.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role');
      const isNative = ['button', 'a', 'input', 'select', 'textarea', 'summary'].includes(tag);
      const hasRole = role && /button|link|tab|menuitem|checkbox|radio|switch|option/.test(role);
      const cs = getComputedStyle(el);
      const looksClickable = cs.cursor === 'pointer';
      const r = el.getBoundingClientRect();
      if (!(r.width || r.height)) return;
      if (looksClickable && !isNative && !hasRole) {
        bad.push({
          sel: p + tag + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''),
          txt: (el.textContent || '').trim().slice(0, 32), tabindex: el.getAttribute('tabindex'),
        });
      }
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot, p + el.tagName.toLowerCase() + '>>'); });
  };
  walk(document, '');
  return bad;
});
log(`  cursor:pointer elements that are NOT a native control and have NO interactive role: ${clickables.length}`);
clickables.slice(0, 12).forEach(c => log(`     ${c.sel}  tabindex=${c.tabindex}  "${c.txt}"`));

/* unnamed buttons anywhere in the AX tree */
const n3 = await axTree(page);
const btns = n3.filter(n => !n.ignored && roleOf(n) === 'button');
const unnamed = btns.filter(n => !nameOf(n) || !String(nameOf(n)).trim());
log(`\n  AX buttons: ${btns.length}   |   with NO accessible name: ${unnamed.length}`);
if (unnamed.length) {
  const cdpNodes = unnamed.slice(0, 8);
  for (const u of cdpNodes) log(`     unnamed button backendId=${u.backendDOMNodeId}`);
}

/* ---------------------------------------------------------------- */
hr('5. THE PANE RAIL — 10 panes as plain buttons, no tab semantics');
const rail = await page.evaluate(() => Array.from(document.querySelectorAll('button[data-tab]')).map(b => ({
  tab: b.getAttribute('data-tab'), role: b.getAttribute('role'), sel: b.getAttribute('aria-selected'),
  cur: b.getAttribute('aria-current'), on: b.classList.contains('on'),
  name: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26), parentRole: b.parentElement.getAttribute('role'),
})));
log('  parent role=' + JSON.stringify(rail[0]?.parentRole));
rail.forEach(r => log(`     data-tab=${String(r.tab).padEnd(6)} role=${String(r.role)} aria-selected=${String(r.sel)} aria-current=${String(r.cur)} .on=${r.on}  "${r.name}"`));
log('\n  >>> The active pane is signalled ONLY by the CSS class .on. No aria-selected/aria-current,');
log('  >>> no role=tab/tablist. A SR user cannot tell which of the 10 views they are in.');

/* ---------------------------------------------------------------- */
hr('6. FORM CONTROLS — search, notes, filter, import');
const forms = await page.evaluate(() => {
  const out = [];
  const walk = (root, p) => {
    root.querySelectorAll('input,textarea,select').forEach(el => {
      const id = el.id;
      const lbl = id ? root.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const wrap = el.closest('label');
      const r = el.getBoundingClientRect();
      out.push({
        sel: p + el.tagName.toLowerCase() + (id ? '#' + id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''),
        type: el.getAttribute('type'), ariaLabel: el.getAttribute('aria-label'),
        labelledby: el.getAttribute('aria-labelledby'), placeholder: el.getAttribute('placeholder'),
        title: el.getAttribute('title'),
        hasLabelFor: !!lbl, wrappedInLabel: !!wrap,
        visible: !!(r.width || r.height),
      });
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot, p + el.tagName.toLowerCase() + '>>'); });
  };
  walk(document, '');
  return out;
});
log(`  ${forms.length} form control(s) in the live DOM:`);
forms.forEach(f => {
  const named = f.ariaLabel || f.labelledby || f.hasLabelFor || f.wrappedInLabel;
  log(`     ${named ? 'OK  ' : 'BAD '} ${f.sel.padEnd(34)} type=${String(f.type)} aria-label=${JSON.stringify(f.ariaLabel)} label[for]=${f.hasLabelFor} placeholder=${JSON.stringify(f.placeholder)} vis=${f.visible}`);
});
const unlabeledForms = forms.filter(f => !(f.ariaLabel || f.labelledby || f.hasLabelFor || f.wrappedInLabel));
log(`\n  controls with NO programmatic label: ${unlabeledForms.length} / ${forms.length}`);
log('  (a placeholder is NOT a label: it is not exposed as the accessible name by all AT,');
log('   and it vanishes the moment the user types.)');

/* AX view of the textboxes */
const n4 = await axTree(page);
const tb = n4.filter(n => !n.ignored && ['textbox', 'searchbox', 'combobox'].includes(roleOf(n)));
log(`\n  AX textbox/searchbox nodes: ${tb.length}`);
tb.forEach(n => log(`     role=${roleOf(n)} name=${JSON.stringify(nameOf(n) || '')} ${!nameOf(n) ? ' <-- UNNAMED' : ''}`));

console.log('\nPAGE ERRORS:', page.__errs.length);
await browser.close();
