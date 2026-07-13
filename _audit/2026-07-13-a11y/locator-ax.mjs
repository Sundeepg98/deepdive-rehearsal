/* Does the room name actually reach a screen reader?
   The room system moved the spelled-out room name ("Architecture & APIs") into aria-label on
   a roleless <span class="locator">. ARIA PROHIBITS aria-label on a generic element. axe flags
   it (aria-prohibited-attr, serious). But does Chromium actually DROP it in practice?
   Ask the real accessibility tree via CDP — not the spec, not axe, the browser. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const AXE = readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Accessibility.enable');
await page.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.addScriptTag({ content: AXE });

async function axNodeFor(selector) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) return null;
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  return nodes && nodes[0];
}

async function report(tag) {
  const n = await axNodeFor('.locator');
  const dom = await page.evaluate(() => {
    const el = document.querySelector('.locator');
    return { outer: el.outerHTML.slice(0, 120), text: el.textContent.trim(), role: el.getAttribute('role'), aria: el.getAttribute('aria-label') };
  });
  const axeHit = await page.evaluate(async () => {
    const r = await axe.run(document.querySelector('.locator'), { runOnly: { type: 'rule', values: ['aria-prohibited-attr'] }, resultTypes: ['violations', 'incomplete'] });
    return { violations: r.violations.reduce((a, v) => a + v.nodes.length, 0), incomplete: r.incomplete.reduce((a, v) => a + v.nodes.length, 0) };
  });
  console.log(`\n--- ${tag} ---`);
  console.log('  DOM role      :', dom.role || '(none — generic)');
  console.log('  aria-label    :', dom.aria);
  console.log('  visible text  :', JSON.stringify(dom.text));
  console.log('  AX role       :', n ? n.role?.value : '(no AX node)');
  console.log('  AX ignored    :', n ? n.ignored : '(n/a)');
  console.log('  AX NAME       :', n && n.name ? JSON.stringify(n.name.value) : '(NO NAME EXPOSED)');
  console.log('  axe aria-prohibited-attr:', `violations=${axeHit.violations} incomplete=${axeHit.incomplete}`);
  return { tag, axRole: n?.role?.value, ignored: n?.ignored, name: n?.name?.value ?? null, axe: axeHit };
}

console.log('=== THE SHIPPED STATE ===');
const shipped = await report('as shipped: <span class="locator" aria-label="...">');

// NEGATIVE CONTROL for this check: give the span a role that PERMITS aria-label.
// If axe goes quiet and the name appears, the check is responsive and the diagnosis is right.
await page.evaluate(() => document.querySelector('.locator').setAttribute('role', 'img'));
await page.waitForTimeout(200);
const withRole = await report('CONTROL: same span + role="img" (aria-label now permitted)');

// and the other direction: strip the aria-label entirely
await page.evaluate(() => { const el = document.querySelector('.locator'); el.removeAttribute('role'); el.removeAttribute('aria-label'); });
await page.waitForTimeout(200);
const noLabel = await report('CONTROL: aria-label removed entirely');

console.log('\n=== WHAT A SCREEN READER ACTUALLY ANNOUNCES ===');
console.log('  shipped  : name =', JSON.stringify(shipped.name), ' | ignored =', shipped.ignored);
console.log('  +role=img: name =', JSON.stringify(withRole.name), ' | ignored =', withRole.ignored);
console.log('  no label : name =', JSON.stringify(noLabel.name), ' | ignored =', noLabel.ignored);
console.log('\n  axe responds to the fix?',
  (shipped.axe.violations + shipped.axe.incomplete) > 0 && (withRole.axe.violations + withRole.axe.incomplete) === 0
    ? 'YES — flags the shipped span, goes silent once the role permits aria-label. Check is live.'
    : 'NO — check did not respond; treat with suspicion.');
await b.close();
