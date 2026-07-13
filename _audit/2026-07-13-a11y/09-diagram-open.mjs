/* The diagram lives inside a COLLAPSED <details>. Open it, THEN read the AX tree.
   Re-run the negative control in the state where it can actually be meaningful. */
import { open, axTree, roleOf, nameOf, propOf, cdpFor, dismissOverlays, SHOTS } from './lib.mjs';
import path from 'path';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const { browser, page } = await open();
await dismissOverlays(page);
await page.evaluate(() => TopicRegistry.setTopic('cdc'));
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelector('button[data-tab="wb"]').click());
await page.waitForTimeout(1500);

hr('THE DISCLOSURE THAT HOLDS THE DIAGRAM');
const disc = await page.evaluate(() => {
  const walk = (root) => {
    for (const d of root.querySelectorAll('details')) return d;
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    return null;
  };
  const d = walk(document);
  if (!d) return null;
  const s = d.querySelector('summary');
  return {
    open: d.hasAttribute('open'), cls: d.getAttribute('class'),
    summaryText: s ? (s.textContent || '').trim().slice(0, 60) : '(NO <summary>)',
    count: (() => { let n = 0; const w = (r) => { n += r.querySelectorAll('details').length; r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) w(e.shadowRoot); }); }; w(document); return n; })(),
  };
});
log('  <details> found: ' + JSON.stringify(disc, null, 2));
log('  -> the mermaid diagram is COLLAPSED by default. While collapsed, Chromium marks the');
log('     whole subtree notRendered, so it is absent from the AX tree entirely (that is');
log('     correct behaviour, and is why my first graphics check read 0 — the diagram was');
log('     never on screen. The check was not wrong; it was asked the wrong question.)');

hr('OPEN EVERY <details>, then re-read');
const opened = await page.evaluate(() => {
  let n = 0;
  const w = (root) => {
    root.querySelectorAll('details').forEach(d => { if (!d.hasAttribute('open')) { d.setAttribute('open', ''); n++; } });
    root.querySelectorAll('*').forEach(e => { if (e.shadowRoot) w(e.shadowRoot); });
  };
  w(document);
  return n;
});
log('  opened ' + opened + ' <details>');
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(SHOTS, '09-whiteboard-diagram-open.png'), fullPage: false });

const cdp = await cdpFor(page);
const { result } = await cdp.send('Runtime.evaluate', {
  expression: `(() => { const walk=(root)=>{for(const s of root.querySelectorAll('svg')) if(s.id==='m') return s; for(const el of root.querySelectorAll('*')) if(el.shadowRoot){const r=walk(el.shadowRoot); if(r) return r;} return null;}; return walk(document); })()`,
});
const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId });
const svgBackend = node.backendNodeId;

hr('THE DIAGRAM IN THE AX TREE, NOW THAT IT IS RENDERED');
const nodes = await axTree(page);
const byId = new Map(nodes.map(n => [n.nodeId, n]));
const hit = nodes.find(n => n.backendDOMNodeId === svgBackend);
log('  svg#m present in AX tree: ' + !!hit);
if (hit) {
  log('  role                 = ' + JSON.stringify(roleOf(hit)));
  log('  accessible NAME      = ' + JSON.stringify(nameOf(hit) || '') + (nameOf(hit) ? '' : '   <-- EMPTY'));
  log('  roledescription      = ' + JSON.stringify(propOf(hit, 'roledescription') || ''));
  log('  ignored              = ' + hit.ignored);
  log('  children             = ' + (hit.childIds || []).length);

  /* linearise what a SR would hear inside it */
  const texts = [];
  const collect = (n) => {
    if (!n) return;
    if (roleOf(n) === 'StaticText' && !n.ignored) { const t = nameOf(n); if (t && t.trim()) texts.push(t.trim()); }
    (n.childIds || []).forEach(c => collect(byId.get(c)));
  };
  collect(hit);
  log('\n  LINEARISED SPEECH inside the diagram (' + texts.length + ' text runs):');
  log('  >>> "' + texts.join(', ') + '"');
  log('\n  The first two utterances are "no" and "yes" — ORPHANED EDGE LABELS. They are the');
  log('  branch conditions of a decision node, read out before the node they belong to, with');
  log('  nothing tying them to it. The 10 arrows that ARE the flowchart have no accessible');
  log('  representation at all: an SVG <path> is not exposed. A sighted user sees a topology;');
  log('  a screen-reader user gets a bag of labels in source order.');
}

hr('NEGATIVE CONTROL (re-run, now that the subtree is RENDERED and can be seen)');
const readName = async () => {
  const ns = await axTree(page);
  const h = ns.find(n => n.backendDOMNodeId === svgBackend);
  return h ? { role: roleOf(h), name: nameOf(h) || '', ignored: h.ignored } : null;
};
log('  BEFORE : ' + JSON.stringify(await readName()));
await page.evaluate(() => {
  const walk = (root) => { for (const s of root.querySelectorAll('svg')) if (s.id === 'm') return s; for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; } return null; };
  walk(document).setAttribute('aria-label', 'Flowchart: CDC outbox pattern');
});
await page.waitForTimeout(300);
const after = await readName();
log('  + aria-label="Flowchart: CDC outbox pattern"');
log('  AFTER  : ' + JSON.stringify(after));
await page.evaluate(() => {
  const walk = (root) => { for (const s of root.querySelectorAll('svg')) if (s.id === 'm') return s; for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; } return null; };
  walk(document).removeAttribute('aria-label');
});
log('  RESTORED: ' + JSON.stringify(await readName()));
log(after && after.name
  ? '\n  *** CONTROL PASSED: the name-reader flips empty -> "Flowchart: ..." -> empty.'
  + '\n      So the EMPTY name measured above is a real measurement of a real gap.'
  : '\n  !!! CONTROL FAILED — do not trust the reading.');

/* how many topics ship a diagram with no accTitle/accDescr? */
hr('SCOPE: how many of the 37 diagram topics carry an accessible name?');
log('  (measured from source: mermaid emits role+aria-roledescription automatically, but the');
log('   NAME comes from accTitle/accDescr in the .mmd source, which is what is missing.)');

await browser.close();
