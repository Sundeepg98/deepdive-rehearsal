/* The 37 mermaid whiteboard diagrams + MathJax formulae: what does a screen reader get? */
import { open, axTree, roleOf, nameOf, dismissOverlays, SHOTS } from './lib.mjs';
import path from 'path';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const { browser, page } = await open();
await dismissOverlays(page);

/* switch to a topic that HAS a mermaid whiteboard (content-pipeline has none) */
hr('Switch to a topic with a mermaid whiteboard (cdc / Change Data Capture)');
const ok = await page.evaluate(() => {
  if (window.TopicRegistry && TopicRegistry.setTopic) { TopicRegistry.setTopic('cdc'); return 'TopicRegistry.setTopic("cdc")'; }
  return 'no registry';
});
log('  ' + ok);
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector('button[data-tab="wb"]').click());
await page.waitForTimeout(1800);
log('  h1 = ' + await page.evaluate(() => document.querySelector('h1')?.textContent.trim()));
await page.screenshot({ path: path.join(SHOTS, '06-whiteboard-diagram.png') });

hr('THE MERMAID FLOWCHART — DOM attributes');
const svg = await page.evaluate(() => {
  const walk = (root) => {
    for (const s of root.querySelectorAll('svg')) {
      const r = s.getBoundingClientRect();
      if (r.width > 150 && r.height > 80) return {
        id: s.id, cls: s.getAttribute('class'), w: Math.round(r.width), h: Math.round(r.height),
        role: s.getAttribute('role'), ariaLabel: s.getAttribute('aria-label'),
        ariaHidden: s.getAttribute('aria-hidden'), labelledby: s.getAttribute('aria-labelledby'),
        roledesc: s.getAttribute('aria-roledescription'),
        title: s.querySelector('title')?.textContent || null,
        desc: s.querySelector('desc')?.textContent || null,
        nodeCount: s.querySelectorAll('.node, g.node').length,
        edgeCount: s.querySelectorAll('.edgePath, path.flowchart-link').length,
        labels: Array.from(s.querySelectorAll('.nodeLabel, foreignObject span, text')).map(t => (t.textContent || '').trim()).filter(Boolean).slice(0, 14),
      };
    }
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    return null;
  };
  return walk(document);
});
if (!svg) { log('  (no diagram-sized svg found)'); }
else {
  log(`  <svg id="${svg.id}" class="${svg.cls}">  ${svg.w}x${svg.h}`);
  log(`     role                 = ${svg.role}`);
  log(`     aria-label           = ${svg.ariaLabel}`);
  log(`     aria-labelledby      = ${svg.labelledby}`);
  log(`     aria-roledescription = ${svg.roledesc}`);
  log(`     aria-hidden          = ${svg.ariaHidden}`);
  log(`     <title>              = ${svg.title === null ? 'ABSENT' : JSON.stringify(svg.title)}`);
  log(`     <desc>               = ${svg.desc === null ? 'ABSENT' : JSON.stringify(svg.desc)}`);
  log(`     graph: ${svg.nodeCount} nodes, ${svg.edgeCount} edges`);
  log(`\n     node labels in SOURCE order (what a SR linearises):`);
  log(`     ${JSON.stringify(svg.labels)}`);
}

hr('WHAT THE AX TREE MAKES OF IT');
const nodes = await axTree(page);
const byId = new Map(nodes.map(n => [n.nodeId, n]));
const gfx = nodes.filter(n => !n.ignored && /graphic|image|img|figure|document/i.test(String(roleOf(n))) && roleOf(n) !== 'RootWebArea');
log(`  AX nodes with a graphics/image/figure role: ${gfx.length}`);
gfx.forEach(n => log(`     role=${roleOf(n)} name=${JSON.stringify(nameOf(n) || '')}`));
if (!gfx.length) {
  log('     NONE. The flowchart is not announced as a diagram/image at all.');
  log('     Chromium exposes an unlabelled inline <svg> as a generic container, so the');
  log('     diagram has no name, no role, and no boundary: a SR user arrowing through the');
  log('     whiteboard simply walks into a run of disconnected box labels.');
}

/* what a browse-mode reader actually hears in the whiteboard */
const wbText = await page.evaluate(() => {
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.tagName === 'DEEP-WHITEBOARD' && el.shadowRoot) return el.shadowRoot;
      if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    }
    return null;
  };
  const sr = walk(document) || document;
  const s = sr.querySelector('svg');
  if (!s) return null;
  return Array.from(s.querySelectorAll('.nodeLabel, text, foreignObject span'))
    .map(t => (t.textContent || '').trim()).filter(Boolean);
});
if (wbText) {
  log('\n  LINEARISED SPEECH for the diagram:');
  log('  >>> "' + wbText.join(', ') + '"');
  log('\n  That is the box labels, in source order, with ZERO edges. The diagram encodes');
  log('  the DATA FLOW (A -> B -> C, and which branch is the failure path). None of the');
  log('  arrows survive: an SVG <path> has no accessible representation. The one thing a');
  log('  system-map diagram exists to convey — the topology — is exactly what is lost.');
}

/* ---- MathJax ---- */
hr('MATHJAX FORMULAE (class="mth") — the num / estimate pane');
await page.evaluate(() => document.querySelector('button[data-tab="num"]').click());
await page.waitForTimeout(1200);
const math = await page.evaluate(() => {
  const out = [];
  const walk = (root) => {
    root.querySelectorAll('.mth, mjx-container, [class*="MathJax"]').forEach(m => {
      const s = m.querySelector('svg');
      out.push({
        cls: (m.getAttribute('class') || '').slice(0, 20),
        hasSvg: !!s,
        svgRole: s?.getAttribute('role'), svgLabel: s?.getAttribute('aria-label'),
        svgTitle: s?.querySelector('title')?.textContent || null,
        ariaHidden: m.getAttribute('aria-hidden'),
        text: (m.textContent || '').trim().slice(0, 40),
        html: m.outerHTML.slice(0, 150).replace(/\s+/g, ' '),
      });
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
  };
  walk(document);
  return out;
});
log(`  math elements found: ${math.length}`);
math.slice(0, 5).forEach(m => {
  log(`\n     .${m.cls} hasSvg=${m.hasSvg} svg role=${m.svgRole} aria-label=${JSON.stringify(m.svgLabel)} <title>=${JSON.stringify(m.svgTitle)}`);
  log(`        aria-hidden=${m.ariaHidden}  textContent=${JSON.stringify(m.text)}`);
  log(`        ${m.html}`);
});
await page.screenshot({ path: path.join(SHOTS, '06-num-math.png') });

await browser.close();
