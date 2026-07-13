/* 04-reflow.mjs -- HIGH-4: what is .stage{overflow-x:hidden} actually CONCEALING? (WCAG 1.4.10)
 *
 * WCAG 1.4.10 has two halves: "no horizontal scrolling" AND "without loss of content".
 * `overflow-x:hidden` buys the first by VIOLATING the second. It also destroys the standard
 * detector: the audit asked `documentElement.scrollWidth > innerWidth`, got CLEAN at every width
 * from 320 to 430 -- and then its negative control injected a 900px-wide div into a 320px viewport
 * and it STILL said "no overflow". The clip stops the document ever widening, so scrollWidth can
 * never grow. That check was structurally incapable of failing.
 *
 * SO MEASURE THREE WAYS, and make each one prove it can go red:
 *   A. CLIPPING detector -- ask every clipping container "is your content wider than your box?"
 *      This sees loss even when the document is placid.
 *   B. UNHIDDEN detector -- neutralise .stage{overflow-x} and ask the DOCUMENT. This answers the
 *      question the hidden version cannot: is there real overflow, or is the layout genuinely fine
 *      and the hidden merely belt-and-braces?
 *   C. CULPRIT hunt -- with the clip off, walk every element and find the ones actually sticking
 *      out past the viewport, so the layout can be fixed AT SOURCE rather than re-hidden.
 */
import { launch, openApp, clipDetect, settleAnimations, showPane, shot } from './lib.mjs';

const WIDTHS = [320, 360, 390, 430];
const TAG = process.argv[2] || 'RUN';

/* Neutralise the concealer. Returns a restore fn's marker. */
async function unhideStage(page) {
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.id = '__unhide';
    s.textContent = '.stage{overflow-x:visible!important}';
    document.head.appendChild(s);
  });
  await page.waitForTimeout(200);
}
async function rehideStage(page) {
  await page.evaluate(() => document.getElementById('__unhide')?.remove());
  await page.waitForTimeout(200);
}

/* *** `window.innerWidth` IS NOT A FIXED RULER ON MOBILE. ***
 * In an isMobile context Chromium honours the viewport meta and WIDENS THE LAYOUT VIEWPORT to fit
 * overflowing content. Injecting a 900px div into a 320px phone gives:
 *      documentElement.scrollWidth = 915      window.innerWidth = 915
 * so `scrollWidth > innerWidth` compares a number against ITSELF and is false. It is not merely
 * that .stage{overflow-x:hidden} blinded the check -- the check CANNOT FIRE ON MOBILE AT ALL, clip
 * or no clip. (The audit attributed its dead detector solely to the clip. Removing the clip does
 * not revive it; that was only half the cause.)
 * The ruler has to be the width we ASKED for -- the device width the user actually has. */
async function docOverflow(page, intendedWidth) {
  return page.evaluate((w) => Math.round(document.documentElement.scrollWidth - w), intendedWidth);
}

const browser = await launch();
console.log('\n============ HIGH-4: WHAT IS overflow-x:hidden HIDING? (%s) ============\n', TAG);

/* ---------------- NEGATIVE CONTROLS ---------------- */
{
  const page = await openApp(browser, { viewport: { width: 320, height: 720 }, hasTouch: true, isMobile: true });
  await settleAnimations(page);

  /* the DEAD detector the audit caught -- reproduce it, and watch it fail to fail */
  const inject = async () => page.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__nc900';
    d.style.cssText = 'width:900px;height:20px;background:red';
    document.querySelector('.stage').appendChild(d);
  });
  const remove = async () => page.evaluate(() => document.getElementById('__nc900')?.remove());

  const naiveBefore = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const realBefore = await docOverflow(page, 320);
  const clipBefore = (await clipDetect(page)).clippers.length;
  await inject();
  await page.waitForTimeout(250);
  const naiveAfter = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    fires: document.documentElement.scrollWidth > window.innerWidth,
  }));
  const realAfter = await docOverflow(page, 320);
  const clipAfterRes = await clipDetect(page);
  const clipAfter = clipAfterRes.clippers.length;
  await remove();
  await page.waitForTimeout(200);

  console.log('  [negative control] inject a 900px-wide div into a 320px viewport:\n');
  console.log('    A. THE DEAD DETECTOR   documentElement.scrollWidth > window.innerWidth');
  console.log('       before: %s   after: %s   (scrollWidth %s vs innerWidth %s)',
    naiveBefore, naiveAfter.fires, naiveAfter.scrollW, naiveAfter.innerW);
  console.log('       -> %s', naiveAfter.fires ? 'fired'
    : '*** STILL SAYS NO OVERFLOW -- AND NOT BECAUSE OF THE CLIP. ***');
  console.log('       On mobile Chromium WIDENS THE LAYOUT VIEWPORT to fit overflow, so innerWidth');
  console.log('       grows to %spx with the content and the comparison is a number against ITSELF.', naiveAfter.innerW);
  console.log('       This check cannot fire on a phone AT ALL -- removing overflow-x:hidden does not');
  console.log('       revive it. The clip was only half the reason it was dead.');

  console.log('\n    B. THE REAL DETECTOR   scrollWidth vs the width we ASKED for (320px, a fixed ruler)');
  console.log('       before: %spx   after: %spx   -> %s', realBefore, realAfter,
    realAfter > 1 ? 'FIRED (it can go RED)' : '*** DID NOT FIRE -- DEAD ***');
  if (realAfter <= 1) { console.error('\nABORT: the document-overflow detector cannot see a 900px div.'); process.exit(2); }

  console.log('\n    C. THE CLIPPING DETECTOR   (every clipper: scrollWidth > clientWidth?)');
  console.log('       clippers before: %s   after: %s', clipBefore, clipAfter);
  console.log('       -> with .stage no longer clipping, the 900px div now OVERFLOWS THE DOCUMENT');
  console.log('          (detector B) instead of being silently swallowed. That is the point of the fix:');
  console.log('          the failure is now visible AND detectable, rather than hidden and unmeasurable.');

  /* D. THE "ECHOED IN FULL" RULE MUST BE ABLE TO FAIL.
   * #tncurrent ellipsises the topic name, but the <h1> above renders it in full, so it is NOT
   * loss of information. That reasoning is only legitimate if the check would CATCH the case where
   * the echo is gone. Delete the <h1> and it must flip to LOSS. */
  await page.evaluate(() => window.TopicRegistry.setTopic('debugging'));
  await page.waitForTimeout(500);
  const withH1 = (await clipDetect(page)).clippers.find((c) => c.sel.includes('tncurrent'));
  await page.evaluate(() => { document.querySelector('.side-id h1').style.display = 'none'; });
  await page.waitForTimeout(250);
  const noH1 = (await clipDetect(page)).clippers.find((c) => c.sel.includes('tncurrent'));
  await page.evaluate(() => { document.querySelector('.side-id h1').style.display = ''; });

  console.log('\n    D. THE "ECHOED IN FULL" RULE   (a truncation is not LOSS if the text is on screen elsewhere)');
  console.log('       worst topic ("Production Debugging and Incident Diagnosis") at 320px:');
  console.log('         #tncurrent is cut by %spx, and the <h1> renders the same name in full', withH1 ? withH1.cut : '?');
  console.log('         with the <h1> present : echoedInFull = %s  -> %s',
    withH1 ? withH1.echoedInFull : '?', withH1 && withH1.echoedInFull ? 'not counted as loss' : 'counted as LOSS');
  console.log('         with the <h1> hidden  : echoedInFull = %s  -> %s',
    noH1 ? noH1.echoedInFull : '?', noH1 && !noH1.echoedInFull ? 'counted as LOSS  (rule FIRED -- it can go RED)' : '*** RULE DID NOT FIRE -- IT IS AN EXEMPTION, NOT A CHECK ***');
  const echoFired = withH1 && withH1.echoedInFull && noH1 && !noH1.echoedInFull;
  if (!echoFired) { console.error('\nABORT: the echoed-in-full rule cannot fail. It is a loophole.'); process.exit(2); }
  await page.__ctx.close();
}

/* ---------------- THE SWEEP ---------------- */
/* TWO failure modes, both of which are 1.4.10, and the second is the one the concealer hid:
 *   docOverflow -- the DOCUMENT is wider than the viewport (2-D scrolling)
 *   contentLoss -- some box is CUTTING OFF its own content (loss of content)
 * A pass requires BOTH to be zero. Reporting only the first is how "REFLOW: CLEAN" got published. */
let totalOver = 0, totalLoss = 0;
const PANES = ['walk', 'drill', 'wb', 'sys', 'num'];
for (const width of WIDTHS) {
  const page = await openApp(browser, { viewport: { width, height: 780 }, hasTouch: true, isMobile: true });
  await settleAnimations(page);

  console.log('\n  ---- %spx ----', width);
  for (const pane of PANES) {
    await showPane(page, pane);
    await settleAnimations(page);

    /* measured against the width we ASKED for, never window.innerWidth (which moves on mobile) */
    const hiddenDoc = await docOverflow(page, width);
    await unhideStage(page);
    const openDoc = await docOverflow(page, width);
    await rehideStage(page);

    const clip = await clipDetect(page);
    /* a scroller (overflow-x:auto) is a DESIGNED one-axis scroll (the 9-tab strip is 976px wide on
     * purpose, and WCAG permits it -- the content is reachable). Only a HARD clip loses content.
     * And a hard clip whose text is rendered IN FULL elsewhere on screen loses no INFORMATION --
     * see the echoedInFull rule in lib.mjs, whose negative control is control D above. */
    const loss = clip.clippers.filter((c) => !c.scrollable && !c.echoedInFull);

    totalOver += Math.max(0, openDoc);
    totalLoss += loss.length;
    console.log('    %s  doc overflow: %spx (clip ON) | %spx (clip OFF -- the truth)   content-loss boxes: %s',
      pane.padEnd(6), String(Math.max(0, hiddenDoc)).padStart(3), String(Math.max(0, openDoc)).padStart(3),
      loss.length === 0 ? '0' : loss.length + '  *** CONTENT IS BEING CUT OFF ***');
    const seen = new Set();
    for (const c of loss) {
      const key = (c.host || '') + c.sel.split('.').slice(0, 2).join('.');
      if (seen.has(key)) continue;
      seen.add(key);
      console.log('        CUT %spx: %s%s   "%s"', String(c.cut).padStart(4),
        c.host ? c.host + ' >>> ' : '', c.sel.slice(0, 42), c.text);
    }
  }
  if (width === 320) { await showPane(page, 'walk'); await settleAnimations(page); await shot(page, `reflow-320-${TAG}.png`); }
  await page.__ctx.close();
}

await browser.close();
console.log('\n  TOTAL true document overflow (concealer removed): %spx', totalOver);
console.log('  TOTAL boxes cutting off their own content:        %s', totalLoss);
const pass = totalOver <= 1 && totalLoss === 0;
console.log('  VERDICT: %s\n', pass
  ? 'PASS -- no document overflow AND no content loss at 320-430px.'
  : 'FAIL -- ' + totalOver + 'px document overflow, ' + totalLoss + ' box(es) cutting off content.');
process.exit(pass ? 0 : 1);
