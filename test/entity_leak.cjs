// GUARD: no HTML entity leaks into visible text.
// The ASCII normalization turns raw glyphs into entities, which is correct ONLY
// for strings that are innerHTML'd. If a data string is consumed via textContent
// instead, "&mdash;" would show up literally. This drives every dynamic surface,
// descends into shadow roots (so web-componentized panes are covered too), and
// asserts no text node (outside <style>/<script>) contains a literal
// &name; / &#nnn; pattern.
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
(async () => {
  const path = process.argv[2] || (__dirname + '/../deepdive_content_pipeline_rehearsal.html');
  const b = await chromium.launch(B.launchOpts());
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  /* was: waitUntil:'networkidle' -- Playwright DISCOURAGES it as inherently racy, and on a
     file:// page it means "500ms without a request", which is not the same claim as "the app
     has booted". Wait for the app's own globals instead. */
  await B.gotoApp(pg, path);
  /* Populate the JS-built overlay bodies (empty until opened).
   *
   * THIS LOOP HAD NEVER ONCE RUN. (Measured 2026-07-12; the bug predates this rewrite.)
   * A first-run boot opens the Topic index as a MODAL, and its backdrop swallows trusted clicks.
   * So every `pg.click('#mockopen')` sat in Playwright's actionability retry until the DEFAULT
   * 30s timeout expired, threw, and landed in `catch (e) {}`. Three overlays x 30s = the 92
   * seconds this check silently added to every gate run -- and at the end of it, the three
   * overlay bodies it exists to inspect were still empty. It then reported PASS.
   *
   * That is the exact shape of bug this repo keeps paying for: not a check that goes red when it
   * should be green, but a check that goes GREEN while measuring nothing. Close the modal first
   * so the clicks land, bound the click so a real regression fails in seconds rather than thirty,
   * and RECORD a click that does not land instead of swallowing it -- an overlay that cannot be
   * opened is a finding, not a shrug. */
  await B.closeIndex(pg);
  const unopened = [];
  for (const [open, close] of [['#mockopen', '#mockx'], ['#mixopen', '#mixx'], ['#sessopen', '#sessx']]) {
    try {
      await pg.click(open, { timeout: B.ACT_MS });
      await pg.waitForFunction((s) => !!document.querySelector(s), close, { timeout: B.ACT_MS });
      await pg.click(close, { timeout: B.ACT_MS });
      await B.settle(pg);
    } catch (e) { unopened.push(open); }
  }
  const leaks = await pg.evaluate(() => {
    const rx = /&(?:[a-zA-Z]+|#\d+);/;
    const hits = [];
    function walk(node) {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) {
          const m = c.nodeValue.match(rx);
          if (m) hits.push(m[0] + '  in: ' + c.nodeValue.trim().slice(0, 70));
        } else if (c.nodeType === 1) {
          const t = c.tagName;
          if (t === 'SCRIPT' || t === 'STYLE') continue;
          if (c.shadowRoot) walk(c.shadowRoot);
          walk(c);
        }
      }
    }
    walk(document.body);
    return hits;
  });
  await b.close();
  if (errs.length) { console.log('ENTITY LEAK: FAIL (page errors)\n  ' + errs.join('\n  ')); await B.finish(1); }
  /* An overlay that would not open is not a pass -- it is a surface this check did not inspect,
     and reporting a green for an uninspected surface is how it stayed silent for so long. */
  if (unopened.length) {
    console.log('ENTITY LEAK: FAIL  (' + unopened.length + ' overlay(s) never opened, so their bodies were NOT inspected: ' +
      unopened.join(', ') + ')');
    await B.finish(1);
  }
  if (leaks.length) {
    console.log('ENTITY LEAK: FAIL  (' + leaks.length + ' entity literal(s) in visible text)');
    leaks.slice(0, 20).forEach(h => console.log('  ' + h));
    await B.finish(1);
  }
  console.log('ENTITY LEAK: PASS  (no HTML entity reaches visible text; 3/3 overlay bodies opened + inspected)');
  await B.finish(0);
})().catch(async (e) => {
  console.log('  harness error: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
  console.log('ENTITY LEAK: FAIL');
  await B.finish(1);
});
