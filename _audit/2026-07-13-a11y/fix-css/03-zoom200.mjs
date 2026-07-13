/* 03-zoom200.mjs -- CRITICAL-3: the tools menu at 200% text zoom (WCAG 1.4.4 AA).
 *
 * THE FAILURE: .mockbar is a column flex container with max-height:82vh. Its rows are flex items
 * carrying the CSS default flex-shrink:1, so when the content exceeds the max-height the browser
 * CRUSHES every row instead of letting the container scroll. They bottom out at min-height:44px
 * (the tap-target fix) and button{overflow:hidden} (the ripple clip) then hides the wreckage.
 * Two well-intentioned fixes combine into a content shredder.
 *
 * WHAT IS MEASURED, and why it is not a proxy:
 *   The question is not "is the box big enough" -- it is "CAN THE USER READ THE ROW'S NAME".
 *   So for every row we range-measure the .mb-t element (the name: "Topic index", "Search", ...)
 *   and ask whether its painted rect lies INSIDE the row's visible clip box. A row that is 42px
 *   tall showing the middle of 705px of wrapped description is "big enough" by every box metric
 *   and shows the user nothing.
 *
 * NEGATIVE CONTROL: clamp one row to height:10px and watch the detector flag it. If it cannot
 * see a row we broke on purpose, it cannot see the ones the CSS broke.
 */
import { launch, openApp, applyTextZoom, verifyTextZoom, settleAnimations, shot } from './lib.mjs';

const MOBILE = { width: 390, height: 844 };
const TAG = process.argv[2] || 'RUN';

async function openTools(page) {
  await page.evaluate(() => {
    const fab = document.getElementById('toolsfab');
    if (fab) fab.click();
  });
  await page.waitForTimeout(500);
}

/* For each tool row: is its NAME actually visible inside the row's clip box? */
async function readRows(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('.sidebar .mockbar .crambtn')];
    return rows.map((el) => {
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const nameEl = el.querySelector('.mb-t') || el;
      const nameTxt = (nameEl.textContent || '').trim();

      /* Range-measure the NAME's painted rect -- the actual glyphs, not the span's layout box. */
      let nameRect = null;
      try {
        const rg = document.createRange();
        rg.selectNodeContents(nameEl);
        const r = rg.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) nameRect = r;
      } catch { /* ignore */ }

      /* the row clips at its padding box; overflow:hidden means anything outside is GONE */
      const clipTop = box.top, clipBot = box.bottom;
      const nameVisible = nameRect
        ? (nameRect.top >= clipTop - 0.5 && nameRect.bottom <= clipBot + 0.5)
        : false;
      const nameCut = nameRect
        ? Math.round(Math.max(0, clipTop - nameRect.top) + Math.max(0, nameRect.bottom - clipBot))
        : -1;

      return {
        id: el.id || '(none)',
        name: nameTxt,
        hidden: cs.display === 'none',
        boxH: Math.round(box.height),
        needH: el.scrollHeight,
        cut: el.scrollHeight - el.clientHeight,
        flexShrink: cs.flexShrink,
        overflow: cs.overflow,
        nameVisible,
        nameCut,
      };
    });
  });
}

/* Real hit-test: at the row's centre, which element does the browser actually deliver a tap to?
 * The audit reported the fixed "Mock run" CTA sitting on top of 5 tool rows.
 *
 * A row BELOW THE FOLD of a scrollable sheet is NOT a bug -- that is what overflow-y:auto is for,
 * and once the rows stop being crushed the sheet legitimately scrolls. So scroll each row into
 * view inside the sheet FIRST, then hit-test. Otherwise the fix would score worse than the bug. */
async function hitTest(page) {
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('.sidebar .mockbar .crambtn')]
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => el.id));
  const out = [];
  for (const id of ids) {
    const r = await page.evaluate((id) => {
      const el = document.getElementById(id);
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      return null;
    }, id);
    void r;
    await page.waitForTimeout(60);
    out.push(await page.evaluate((id) => {
      const el = document.getElementById(id);
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const onScreen = cy >= 0 && cy <= window.innerHeight && cx >= 0 && cx <= window.innerWidth;
      const hit = onScreen ? document.elementFromPoint(cx, cy) : null;
      const ownsIt = hit && (hit === el || el.contains(hit));
      return {
        id,
        reachable: !!ownsIt,
        blockedBy: ownsIt ? null
          : !onScreen ? 'cannot be scrolled into view'
          : (hit ? (hit.id ? '#' + hit.id : (hit.className || hit.tagName).toString().split(/\s+/)[0]) : 'nothing'),
      };
    }, id));
  }
  /* leave the sheet where we found it */
  await page.evaluate(() => { const s = document.querySelector('.sidebar .mockbar'); if (s) s.scrollTop = 0; });
  return out;
}

const browser = await launch();

console.log('\n============ CRITICAL-3: THE TOOLS MENU AT 200%% TEXT ZOOM (%s) ============\n', TAG);

/* ---------------- NEGATIVE CONTROL: can the detector see a row we break on purpose? ---------- */
{
  const page = await openApp(browser, { viewport: MOBILE, hasTouch: true, isMobile: true });
  await openTools(page);
  await settleAnimations(page);

  const before = await readRows(page);
  const okBefore = before.filter((r) => !r.hidden && r.nameVisible).length;

  await page.evaluate(() => {
    const el = document.getElementById('idxopen');
    el.style.setProperty('height', '10px', 'important');
    el.style.setProperty('min-height', '10px', 'important');
  });
  await page.waitForTimeout(200);
  const after = await readRows(page);
  const brokenRow = after.find((r) => r.id === 'idxopen');
  const fired = brokenRow && !brokenRow.nameVisible;

  console.log('  [negative control] clamp #idxopen to height:10px');
  console.log('    name visible before: %s   after: %s   -> detector %s',
    before.find((r) => r.id === 'idxopen').nameVisible, brokenRow.nameVisible,
    fired ? 'FIRED (it can go RED)' : '*** DID NOT FIRE -- DETECTOR IS DEAD ***');
  console.log('    (rows with a readable name at 100%%: %s of %s)', okBefore, before.filter((r) => !r.hidden).length);
  if (!fired) { console.error('\nABORT: the row detector cannot see a row broken on purpose.'); process.exit(2); }
  await page.__ctx.close();
}

/* ---------------- THE MEASUREMENT: 200% text zoom ---------------- */
{
  const page = await openApp(browser, { viewport: MOBILE, hasTouch: true, isMobile: true });
  await openTools(page);
  await settleAnimations(page);
  await applyTextZoom(page, 2);
  await page.waitForTimeout(400);

  /* ---- THE ZOOM INSTRUMENT MUST BE VERIFIED, NOT TRUSTED ----
   * The first cut of applyTextZoom() walked the tree reading getComputedStyle().fontSize and
   * writing back fontSize*2 -- so every child re-doubled its parent's already-doubled size and it
   * COMPOUNDED PER NESTING LEVEL (html x2, body x4, .mb-tx x4, .mb-t x8). A .mb-t at 96px is what
   * produced the "row needs 705px" figure. The mechanism was real; the magnitude was the
   * instrument's own bug. Assert every element is scaled EXACTLY once, against sizes captured
   * before any mutation. */
  const zc = await verifyTextZoom(page, 2);
  console.log('\n  [instrument check] text zoom must scale every element EXACTLY x2, once:');
  console.log('    elements scaled: %s   off-target: %s   worst ratio: %sx  %s',
    zc.total, zc.elementsOffTarget, zc.worstRatio, zc.worstEl ? '<- ' + zc.worstEl : '');
  if (zc.elementsOffTarget > 0) {
    console.error('\nABORT: the zoom emulation is COMPOUNDING. Every px below would be fiction.');
    process.exit(2);
  }
  console.log('    -> clean: no element double-scaled. The numbers below are the app, not the harness.');

  const rows = await readRows(page);
  const hits = await hitTest(page);
  const visible = rows.filter((r) => !r.hidden);

  console.log('\n  200%% TEXT ZOOM -- can the user read each tool\'s NAME?\n');
  console.log('    row              box   needs    cut   shrink  name shown?  what the user sees');
  console.log('    ' + '-'.repeat(88));
  let shredded = 0;
  for (const r of visible) {
    if (!r.nameVisible) shredded++;
    console.log('    %s %s %s %s %s   %s   %s',
      r.id.padEnd(12), (r.boxH + 'px').padStart(6), (r.needH + 'px').padStart(7),
      (r.cut > 0 ? '-' + r.cut : '0').padStart(6), String(r.flexShrink).padStart(6),
      (r.nameVisible ? 'YES' : 'NO ').padStart(10),
      r.nameVisible ? r.name : '*** "' + r.name + '" IS CUT OFF (' + r.nameCut + 'px outside the box) ***');
  }
  const worst = visible.reduce((a, b) => (b.cut > a.cut ? b : a), visible[0]);
  console.log('\n    rows whose own name is UNREADABLE: %s of %s', shredded, visible.length);
  console.log('    worst row: %s needs %spx in a %spx box (%spx of content cut)',
    worst.id, worst.needH, worst.boxH, worst.cut);

  const unreachable = hits.filter((h) => !h.reachable);
  console.log('\n    HIT-TEST (does a tap on the row actually reach the row?)');
  if (!unreachable.length) console.log('      all %s rows receive their own taps', hits.length);
  else for (const h of unreachable) console.log('      %s  BLOCKED BY %s', h.id.padEnd(12), h.blockedBy);

  await shot(page, `zoom200-tools-${TAG}.png`);
  console.log('\n    screenshot: shots/zoom200-tools-%s.png', TAG);

  const pass = shredded === 0 && unreachable.length === 0;
  console.log('\n  VERDICT: %s', pass
    ? 'PASS -- every tool row shows its full name at 200% and receives its own taps'
    : `FAIL -- ${shredded} shredded row(s), ${unreachable.length} unreachable row(s)`);
  await page.__ctx.close();
  await browser.close();
  process.exit(pass ? 0 : 1);
}
