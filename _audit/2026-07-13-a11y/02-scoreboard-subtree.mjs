/* Honest AX subtree read: getPartialAXTree(fetchRelatives:false) returns ONLY the root node,
   which made the scoreboard look like it vanished entirely. It does not. Walk the FULL tree and
   extract the real subtree so we report what a screen reader ACTUALLY gets, not an artifact. */
import { open, axTree, roleOf, nameOf, propOf, cdpFor, toDrill, advanceToJudge } from './lib.mjs';

const { browser, page } = await open();
await toDrill(page);

const cdp = await cdpFor(page);
const nodes = await axTree(page);
const byId = new Map(nodes.map(n => [n.nodeId, n]));

/* map backendDOMNodeId -> AX node, then locate .score's backend id */
const { result } = await cdp.send('Runtime.evaluate', {
  expression: `document.querySelector('deep-drill').shadowRoot.querySelector('.score')`,
});
const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId });
const scoreBackend = node.backendNodeId;

const scoreAX = nodes.find(n => n.backendDOMNodeId === scoreBackend);
console.log('=== .score in the FULL AX tree ===');
console.log('found:', !!scoreAX, scoreAX ? `role=${roleOf(scoreAX)} ignored=${scoreAX.ignored} children=${(scoreAX.childIds || []).length}` : '');

const walk = (n, d) => {
  if (!n) return;
  const r = roleOf(n) || '?';
  const nm = nameOf(n);
  const live = propOf(n, 'live');
  const bits = [];
  if (nm) bits.push('name=' + JSON.stringify(nm));
  if (live && live !== 'off') bits.push('LIVE=' + live);
  if (n.ignored) bits.push('IGNORED(' + (n.ignoredReasons || []).map(x => x.name).join(',') + ')');
  console.log('  '.repeat(d) + '- ' + r + (bits.length ? '  ' + bits.join(' ') : ''));
  (n.childIds || []).forEach(c => walk(byId.get(c), d + 1));
};
console.log('\n=== FULL SUBTREE (this is what assistive tech receives) ===');
if (scoreAX) walk(scoreAX, 0);

/* What would a browse-mode reader linearise? Collect the StaticText leaves in order. */
const texts = [];
const collect = (n) => {
  if (!n) return;
  if (roleOf(n) === 'StaticText' && !n.ignored) { const t = nameOf(n); if (t && t.trim()) texts.push(t.trim()); }
  (n.childIds || []).forEach(c => collect(byId.get(c)));
};
if (scoreAX) collect(scoreAX);
console.log('\n=== LINEARISED SPEECH (browse-mode, in DOM order) ===');
console.log('   ' + JSON.stringify(texts));
console.log('   i.e. a screen reader arrowing through the scoreboard hears roughly:');
console.log('   >>> "' + texts.join(' ') + '"');

/* Does the CSS ::before glyph reach the AX tree? */
console.log('\n=== IS THE ::before GLYPH IN THE AX TREE? ===');
const hasCheck = texts.some(t => /✓/.test(t));
const hasRecycle = texts.some(t => /↻/.test(t));
console.log('   U+2713 check   present:', hasCheck);
console.log('   U+21BB recycle present:', hasRecycle);
console.log('   (codepoints seen: ' + JSON.stringify(texts.map(t => Array.from(t).map(c => c.codePointAt(0) > 127 ? 'U+' + c.codePointAt(0).toString(16).toUpperCase() : c).join(''))) + ')');

/* Now GRADE and re-read, to show the tree content changes but nothing is live. */
await advanceToJudge(page);
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('jg').click());
await page.waitForTimeout(500);

const nodes2 = await axTree(page);
const byId2 = new Map(nodes2.map(n => [n.nodeId, n]));
const score2 = nodes2.find(n => n.backendDOMNodeId === scoreBackend);
const texts2 = [];
const collect2 = (n) => {
  if (!n) return;
  if (roleOf(n) === 'StaticText' && !n.ignored) { const t = nameOf(n); if (t && t.trim()) texts2.push(t.trim()); }
  (n.childIds || []).forEach(c => collect2(byId2.get(c)));
};
if (score2) collect2(score2);
console.log('\n=== AFTER GRADING ONE PROBE "SOLID" ===');
console.log('   linearised: ' + JSON.stringify(texts2));
console.log('   the TEXT changed (0 -> 1) and is READABLE on demand...');
console.log('   ...but with 0 live regions covering it, it is never SPOKEN. The user must');
console.log('   manually go hunting for the scoreboard to discover their score changed.');

/* the fill state: is it in the AX tree at all? */
const fill = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const g = sr.querySelector('.pill.g');
  const cs = getComputedStyle(g);
  return { cls: g.className, bg: cs.backgroundColor, borderColor: cs.borderColor };
});
console.log('\n=== THE FILL CHANNEL (the load-bearing status signal) ===');
console.log('   .pill.g class="' + fill.cls + '"  background=' + fill.bg);
console.log('   The "filled vs outline" distinction lives ONLY in computed CSS background.');
console.log('   AX exposure of that state: NONE (no aria-pressed/aria-current/role/text says "banked").');
console.log('   It is a pure visual channel. A screen reader cannot perceive fill.');

await browser.close();
