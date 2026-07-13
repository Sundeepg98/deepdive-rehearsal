/* Where do the mermaid SVGs and the WebGL canvas actually live, and are they labelled? */
import { open, axTree, roleOf, nameOf, dismissOverlays, SHOTS } from './lib.mjs';
import path from 'path';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const { browser, page } = await open();
await dismissOverlays(page);

const scanGfx = () => page.evaluate(() => {
  const out = [];
  const walk = (root, p) => {
    root.querySelectorAll('svg').forEach(s => {
      const r = s.getBoundingClientRect();
      out.push({
        kind: 'svg', path: p, id: s.id || null, cls: (s.getAttribute('class') || '').slice(0, 30),
        w: Math.round(r.width), h: Math.round(r.height),
        role: s.getAttribute('role'), ariaLabel: s.getAttribute('aria-label'),
        ariaHidden: s.getAttribute('aria-hidden'), labelledby: s.getAttribute('aria-labelledby'),
        roledesc: s.getAttribute('aria-roledescription'),
        title: s.querySelector('title')?.textContent?.slice(0, 50) || null,
        desc: s.querySelector('desc')?.textContent?.slice(0, 40) || null,
        texts: Array.from(s.querySelectorAll('text,.nodeLabel,foreignObject')).length,
        sample: Array.from(s.querySelectorAll('text,.nodeLabel')).slice(0, 5).map(t => (t.textContent || '').trim()).filter(Boolean),
      });
    });
    root.querySelectorAll('canvas').forEach(c => {
      const r = c.getBoundingClientRect();
      out.push({ kind: 'canvas', path: p, id: c.id || null, cls: (c.getAttribute('class') || '').slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), role: c.getAttribute('role'), ariaLabel: c.getAttribute('aria-label'), ariaHidden: c.getAttribute('aria-hidden'), fallback: (c.textContent || '').trim().slice(0, 40) });
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot, p + el.tagName.toLowerCase() + '>>'); });
  };
  walk(document, '');
  return out;
});

hr('SWEEP: every pane x a few topics — where are the diagrams?');
const TABS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const seen = [];
for (const t of TABS) {
  const vis = await page.evaluate((t) => {
    const b = document.querySelector(`button[data-tab="${t}"]`);
    if (!b || b.hasAttribute('hidden')) return false;
    b.click(); return true;
  }, t);
  if (!vis) { log(`\n  [${t}] tab is HIDDEN — skipping`); continue; }
  await page.waitForTimeout(900);
  const g = await scanGfx();
  const big = g.filter(x => x.w > 100 && x.h > 60);
  log(`\n  [${t}] svg/canvas total=${g.length}  diagram-sized=${big.length}`);
  big.forEach(x => {
    log(`     ${x.kind} ${x.path}${x.id ? '#' + x.id : ''} .${x.cls}  ${x.w}x${x.h}`);
    log(`        role=${x.role} aria-label=${JSON.stringify(x.ariaLabel)} aria-hidden=${x.ariaHidden} roledesc=${x.roledesc}`);
    log(`        <title>=${JSON.stringify(x.title)} <desc>=${JSON.stringify(x.desc)} textNodes=${x.texts}`);
    if (x.sample && x.sample.length) log(`        node labels: ${JSON.stringify(x.sample)}`);
    seen.push({ tab: t, ...x });
  });
}

/* the VIZ pane is hidden by default — unhide and render it */
hr('THE WEBGL VISUAL (viz tab is hidden by default — force it on)');
const forced = await page.evaluate(() => {
  const b = document.querySelector('button[data-tab="viz"]');
  if (!b) return 'no button';
  b.removeAttribute('hidden');
  b.click();
  return 'clicked';
});
log('  ' + forced);
await page.waitForTimeout(2500);
const vg = await scanGfx();
const canv = vg.filter(x => x.kind === 'canvas');
log(`  <canvas> found: ${canv.length}`);
canv.forEach(c => {
  log(`     canvas ${c.path}${c.id ? '#' + c.id : ''} .${c.cls} ${c.w}x${c.h}`);
  log(`        role=${c.role} aria-label=${JSON.stringify(c.ariaLabel)} aria-hidden=${c.ariaHidden}`);
  log(`        fallback content inside <canvas>: ${JSON.stringify(c.fallback)}  (len=${c.fallback.length})`);
});
await page.screenshot({ path: path.join(SHOTS, '05-viz-pane.png') });

/* AX: how do these surface? */
hr('AX TREE: how do the graphics surface to assistive tech?');
const nodes = await axTree(page);
const gfxRoles = nodes.filter(n => !n.ignored && /graphic|image|img|canvas|figure/i.test(String(roleOf(n))));
log(`  AX nodes with a graphics/image/figure role: ${gfxRoles.length}`);
gfxRoles.forEach(n => log(`     role=${roleOf(n)} name=${JSON.stringify(nameOf(n) || '')}`));
if (!gfxRoles.length) log('     (none — the graphics are not exposed as images/figures at all)');

/* the ONE svg that exists at load: what is it? */
hr('THE SVG THAT IS ALWAYS PRESENT');
await page.evaluate(() => document.querySelector('button[data-tab="walk"]').click());
await page.waitForTimeout(600);
const one = await scanGfx();
one.filter(x => x.kind === 'svg').forEach(s => {
  log(`  svg ${s.path}${s.id ? '#' + s.id : ''} .${s.cls} ${s.w}x${s.h} role=${s.role} aria-hidden=${s.ariaHidden} aria-label=${JSON.stringify(s.ariaLabel)}`);
});

/* count mermaid source blocks that exist but are not rendered as <svg> */
hr('MERMAID SOURCE vs RENDERED');
const mm = await page.evaluate(() => {
  const out = { withMermaidClass: 0, dataMermaid: 0, preMermaid: 0, sysBodyHTML: '' };
  document.querySelectorAll('[class*="mermaid"],[data-mermaid]').forEach(() => out.withMermaidClass++);
  const sys = document.querySelector('deep-system-map');
  if (sys && sys.shadowRoot) out.sysBodyHTML = sys.shadowRoot.innerHTML.slice(0, 400).replace(/\s+/g, ' ');
  return out;
});
log('  elements with a mermaid class/attr in light DOM: ' + mm.withMermaidClass);
log('\n  deep-system-map shadow root (first 400 chars):');
log('  ' + mm.sysBodyHTML);

await browser.close();
