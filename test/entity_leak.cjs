// GUARD: no HTML entity leaks into visible text.
// The ASCII normalization turns raw glyphs into entities, which is correct ONLY
// for strings that are innerHTML'd. If a data string is consumed via textContent
// instead, "&mdash;" would show up literally. This drives every dynamic surface
// and asserts no text node (outside <script>/<style>) contains a literal
// &name; / &#nnn; pattern.
const { chromium } = require('playwright');
(async () => {
  const path = process.argv[2] || (__dirname + '/../deepdive_content_pipeline_rehearsal.html');
  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const b = await chromium.launch(launch);
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await pg.goto('file://' + path, { waitUntil: 'networkidle' });
  // Populate the JS-built overlay bodies (empty until opened).
  for (const [open, close] of [['#mockopen', '#mockx'], ['#mixopen', '#mixx'], ['#sessopen', '#sessx']]) {
    try { await pg.click(open); await pg.waitForTimeout(120); await pg.click(close); await pg.waitForTimeout(60); } catch (e) {}
  }
  // Walk visible/DOM text nodes, excluding <script>/<style>, and flag entity literals.
  const leaks = await pg.evaluate(() => {
    const rx = /&(?:[a-zA-Z]+|#\d+);/;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        for (let e = n.parentElement; e; e = e.parentElement) {
          const t = e.tagName;
          if (t === 'SCRIPT' || t === 'STYLE') return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const hits = [];
    let n;
    while ((n = w.nextNode())) {
      const m = n.nodeValue.match(rx);
      if (m) hits.push(m[0] + '  in: ' + n.nodeValue.trim().slice(0, 70));
    }
    return hits;
  });
  await b.close();
  if (errs.length) { console.log('ENTITY LEAK: FAIL (page errors)\n  ' + errs.join('\n  ')); process.exit(1); }
  if (leaks.length) {
    console.log('ENTITY LEAK: FAIL  (%d entity literal(s) in visible text)', leaks.length);
    leaks.slice(0, 20).forEach(h => console.log('  ' + h));
    process.exit(1);
  }
  console.log('ENTITY LEAK: PASS  (no HTML entity reaches visible text)');
  process.exit(0);
})();
