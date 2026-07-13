/* The graphics detector FAILED its negative control (reported 0 even after I added
   role="img" + aria-label). So it is blind. Find out WHY before reporting anything. */
import { open, axTree, roleOf, nameOf, cdpFor, dismissOverlays } from './lib.mjs';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const { browser, page } = await open();
await dismissOverlays(page);
await page.evaluate(() => TopicRegistry.setTopic('cdc'));
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelector('button[data-tab="wb"]').click());
await page.waitForTimeout(1500);

const cdp = await cdpFor(page);

/* Resolve the SVG's backendNodeId — the reliable identity across DOM<->AX. */
const { result } = await cdp.send('Runtime.evaluate', {
  expression: `(() => {
    const walk = (root) => {
      for (const s of root.querySelectorAll('svg')) if (s.id === 'm') return s;
      for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
      return null;
    };
    return walk(document);
  })()`,
});
const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId });
const svgBackend = node.backendNodeId;
log('svg#m backendNodeId = ' + svgBackend);

hr('IS THE SVG IN THE FULL AX TREE AT ALL?');
const nodes = await axTree(page);
log('full AX tree size: ' + nodes.length);
const hit = nodes.find(n => n.backendDOMNodeId === svgBackend);
log('svg#m present in full AX tree: ' + !!hit);
if (hit) {
  log('  role     = ' + JSON.stringify(roleOf(hit)));
  log('  name     = ' + JSON.stringify(nameOf(hit)));
  log('  ignored  = ' + hit.ignored);
  log('  reasons  = ' + JSON.stringify((hit.ignoredReasons || []).map(r => r.name)));
  log('  children = ' + (hit.childIds || []).length);
}

hr('WHAT ROLES ACTUALLY EXIST IN THIS AX TREE?');
const roles = {};
nodes.forEach(n => { const r = roleOf(n) || '(none)'; roles[r] = (roles[r] || 0) + 1; });
log(Object.entries(roles).sort((a, b) => b[1] - a[1]).map(([r, c]) => `  ${String(c).padStart(4)}  ${r}`).join('\n'));

hr('getPartialAXTree DIRECTLY ON THE SVG (bypasses any tree-walk bug of mine)');
const { nodes: part } = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: svgBackend, fetchRelatives: false });
part.forEach(n => log('  ' + JSON.stringify({ role: roleOf(n), name: nameOf(n), ignored: n.ignored, reasons: (n.ignoredReasons || []).map(r => r.name) })));

hr('DIAGNOSIS: is an ANCESTOR hiding it?');
const anc = await page.evaluate(() => {
  const walk = (root) => {
    for (const s of root.querySelectorAll('svg')) if (s.id === 'm') return s;
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    return null;
  };
  const s = walk(document);
  const chain = [];
  let n = s;
  while (n) {
    if (n.nodeType === 1) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      chain.push({
        sel: n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/)[0] : ''),
        display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
        ariaHidden: n.getAttribute && n.getAttribute('aria-hidden'),
        hidden: n.hasAttribute && n.hasAttribute('hidden'),
        inert: n.hasAttribute && n.hasAttribute('inert'),
        contentVisibility: cs.contentVisibility,
        w: Math.round(r.width), h: Math.round(r.height),
      });
    }
    n = n.parentNode || n.host || null;
  }
  return chain;
});
anc.forEach(a => log(`  ${a.sel.padEnd(30)} display=${a.display.padEnd(10)} vis=${a.visibility.padEnd(8)} opacity=${a.opacity} aria-hidden=${a.ariaHidden} hidden=${a.hidden} inert=${a.inert} cv=${a.contentVisibility} ${a.w}x${a.h}`));

await browser.close();
