import { open, axTree, roleOf, nameOf, dismissOverlays, SHOTS } from './lib.mjs';
import path from 'path';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const { browser, page } = await open();
await dismissOverlays(page);
await page.evaluate(() => TopicRegistry.setTopic('cdc'));
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelector('button[data-tab="wb"]').click());
await page.waitForTimeout(1500);

const findSvg = () => page.evaluate(() => {
  const walk = (root) => {
    for (const s of root.querySelectorAll('svg')) {
      if (s.id === 'm' || (s.getAttribute('class') || '').includes('flowchart')) {
        const r = s.getBoundingClientRect();
        const host = s.getRootNode().host;
        const parent = s.parentElement;
        return {
          id: s.id, cls: s.getAttribute('class'),
          w: Math.round(r.width), h: Math.round(r.height),
          display: getComputedStyle(s).display,
          parentDisplay: parent ? getComputedStyle(parent).display : null,
          parentCls: parent ? parent.getAttribute('class') : null,
          host: host ? host.tagName.toLowerCase() : null,
          role: s.getAttribute('role'), ariaLabel: s.getAttribute('aria-label'),
          ariaHidden: s.getAttribute('aria-hidden'), labelledby: s.getAttribute('aria-labelledby'),
          roledesc: s.getAttribute('aria-roledescription'),
          title: s.querySelector('title') ? s.querySelector('title').textContent : null,
          desc: s.querySelector('desc') ? s.querySelector('desc').textContent : null,
          attrs: Array.from(s.attributes).map(a => a.name).join(','),
          nodes: s.querySelectorAll('g.node').length,
          edges: s.querySelectorAll('path.flowchart-link, .edgePath').length,
          edgeLabels: Array.from(s.querySelectorAll('.edgeLabel')).map(e => (e.textContent || '').trim()).filter(Boolean),
        };
      }
    }
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    return null;
  };
  return walk(document);
});

hr('THE MERMAID FLOWCHART SVG (found by id/class, any size)');
let s = await findSvg();
log(JSON.stringify(s, null, 2));

hr('IS IT HIDDEN BEHIND A REVEAL? (whiteboard = "reconstruct from memory")');
const reveal = await page.evaluate(() => {
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.tagName === 'DEEP-WHITEBOARD' && el.shadowRoot) return el.shadowRoot;
      if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    }
    return null;
  };
  const sr = walk(document);
  if (!sr) return 'no deep-whiteboard';
  const btns = Array.from(sr.querySelectorAll('button')).map(b => ({ txt: (b.textContent || '').trim().slice(0, 40), id: b.id, cls: b.className }));
  return btns;
});
log('  buttons in the whiteboard: ' + JSON.stringify(reveal, null, 2));

// click any reveal-ish button
await page.evaluate(() => {
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.tagName === 'DEEP-WHITEBOARD' && el.shadowRoot) return el.shadowRoot;
      if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    }
    return null;
  };
  const sr = walk(document);
  const b = Array.from(sr.querySelectorAll('button')).find(x => /reveal|show|solution|answer|compare/i.test(x.textContent));
  if (b) b.click();
});
await page.waitForTimeout(1200);
s = await findSvg();
log('\n  AFTER revealing:');
log('  size = ' + s.w + 'x' + s.h + '  display=' + s.display + '  parentDisplay=' + s.parentDisplay);
log('  role=' + s.role + '  aria-label=' + s.ariaLabel + '  <title>=' + (s.title === null ? 'ABSENT' : JSON.stringify(s.title)) + '  <desc>=' + (s.desc === null ? 'ABSENT' : JSON.stringify(s.desc)));
log('  aria-roledescription=' + s.roledesc + '  aria-hidden=' + s.ariaHidden);
log('  attributes present on <svg>: ' + s.attrs);
log('  graph: ' + s.nodes + ' nodes, ' + s.edges + ' edges');
log('  edge labels (the branch conditions): ' + JSON.stringify(s.edgeLabels));
await page.screenshot({ path: path.join(SHOTS, '07-whiteboard-revealed.png'), fullPage: false });

hr('AX EXPOSURE OF THE REVEALED DIAGRAM');
const nodes = await axTree(page);
const gfx = nodes.filter(n => !n.ignored && /graphic|image|figure/i.test(String(roleOf(n))));
log('  AX graphics/image/figure nodes: ' + gfx.length);
gfx.forEach(n => log('     role=' + roleOf(n) + ' name=' + JSON.stringify(nameOf(n) || '')));
if (!gfx.length) log('     NONE — the flowchart has no role, no name, no boundary in the AX tree.');

/* NEGATIVE CONTROL: give the svg a name, prove the check flips to found */
hr('NEGATIVE CONTROL: label the SVG, prove the "unlabelled" check can go GREEN');
await page.evaluate(() => {
  const walk = (root) => {
    for (const s of root.querySelectorAll('svg')) if (s.id === 'm') return s;
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    return null;
  };
  const s = walk(document);
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', 'Flowchart: CDC outbox pattern, 11 nodes');
});
await page.waitForTimeout(400);
const nodes2 = await axTree(page);
const gfx2 = nodes2.filter(n => !n.ignored && /graphic|image|figure/i.test(String(roleOf(n))));
log('  after adding role="img" + aria-label:');
log('  AX graphics/image nodes: ' + gfx2.length);
gfx2.forEach(n => log('     role=' + roleOf(n) + ' name=' + JSON.stringify(nameOf(n) || '')));
log(gfx2.length > 0
  ? '\n  *** CONTROL PASSED: the detector DOES find a labelled diagram. Its "0 labelled"'
  + '\n      verdict above is therefore a real measurement, not a broken selector.'
  : '\n  !!! CONTROL FAILED: detector is blind — the finding above is worthless.');

await browser.close();
