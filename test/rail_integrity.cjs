#!/usr/bin/env node
/*
 * Rail-integrity gate -- THE COMPANION RAIL MAY NEVER SHOW ANOTHER TOPIC'S COACHING.
 *
 * WHY THIS EXISTS.
 * The rail is per (topic, view). shell.js's __syncCompanion used to write it like this:
 *
 *     if (TOPIC_CMP_NOTES[tab]) { ...rewrite the rail... }          // shell.js:237 -- NO else
 *
 * With no `else`, a topic that authors no note for the active pane left the rail HOLDING THE
 * PREVIOUS TOPIC'S NOTE. The 38 compiled topics author 2 notes across 9 panes, so 38 x 7 = 266
 * of the 414 (topic, view) combos -- 64% -- displayed coaching advice belonging to some other
 * topic. On `caching`'s System Map the rail read "Zoom out: IaC sits between declared
 * infrastructure and provisioned reality...", which is IaC's note, on the caching page.
 *
 * AUTHORING THE MISSING NOTES WOULD NOT HAVE FIXED THIS. It would have hidden it until the next
 * topic shipped with a gap. The invariant has to be enforced in the CODE, so this gate asserts the
 * invariant, not the content:
 *
 *   1. DATA (the structural guarantee).  Every rail slot -- desktop AND the mobile mirror --
 *      holds either the ACTIVE topic's note for the ACTIVE view, or the empty string. Nothing
 *      else. Ever. Checked on text, not on pixels, so no media query, no <details> state and no
 *      future CSS edit can resurrect a foreign string that is sitting in the DOM unrendered.
 *      This is the assertion that makes a leak IMPOSSIBLE rather than merely INVISIBLE.
 *
 *   2. VISUAL (no empty boxes).  When the topic authors no note for the view, the two per-view
 *      blocks are not displayed -- the rail closes up instead of showing headed, empty boxes.
 *
 *   3. POSITIVE (the anti-blank-page clause).  When the topic DOES author the note, the rail must
 *      VISIBLY RENDER IT: displayed, non-empty, exact match. Without this, "delete everything"
 *      would pass checks 1 and 2 with flying colours. An a11y audit on this very repo once
 *      certified a completely blank page as passing because it only ever checked that the wrong
 *      thing was absent. All 8 hand-coded topics x 9 views = 72 combos must render.
 *
 * THE SWEEP IS ADVERSARIAL. Each combo is measured only after the rail has been deliberately
 * LOADED with a foreign note for that same view -- switch to a topic that authors all 9, land on
 * the view, and only then switch to the topic under test. That is the exact state that produced
 * the bug in the shipped build, and it is the state a naive "load the page fresh" sweep never
 * reaches. It drives the real navigation path: view-manager.js applyRoute() does
 * TopicRegistry.setTopic(topic) then switchTab(view), which is what a hash navigation does.
 *
 * Usage:
 *   node test/rail_integrity.cjs [path/to/build.html]
 *   CHROME=/path/to/chrome node test/rail_integrity.cjs
 *   node test/rail_integrity.cjs --verbose      # list every leak
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const ARGS = process.argv.slice(2);
const VERBOSE = ARGS.includes('--verbose');
const HTML = ARGS.find((a) => !a.startsWith('--'))
  || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

// The 8 hand-coded topics author a note for every view. They are the reference for check 3.
const REFERENCE_8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
// The rail's six per-view slots: the desktop rail and the mobile <details> mirror.
// Column index is the cmpNotes tuple index: 0 = title, 1 = note, 2 = the move.
const SLOTS = [['cmpView', 'cmpNote', 'cmpMove'], ['mCmpView', 'mCmpNote', 'mCmpMove']];

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  // DEFAULT motion preference on purpose -- the state real users and the other browser checks run
  // in. Setting reducedMotion:'reduce' to make view transitions synchronous is simply UNNECESSARY:
  // every rail write is already synchronous (applyIdentity() and switchTab() both call
  // __syncCompanion() before handing the pane swap to ViewTransitions), so it would buy this check
  // nothing.
  //
  // It is no longer DANGEROUS either, and the warning that used to stand here is now WRONG.
  // It said: under reduced motion `*{animation:none!important}` cancels the bodyIn fade that
  // `body{opacity:0}` depends on to ever become visible, so the whole app renders INVISIBLE and a
  // check running there cannot see the thing it asserts about. That WAS true. It has since been
  // fixed at the source: styles.css:178 now declares body{opacity:1} and takes the fade-in from a
  // BACKWARDS-filled bodyIn keyframe (:179), so visibility no longer depends on an animation
  // running -- strip every animation in the app and the body just stays visible.
  //
  // Re-verified 2026-07-13 by counting PAINTED PIXELS, and it has to be done that way: opacity:0
  // on <body> does NOT propagate into descendants' computed opacity, so counting "visible" text
  // nodes reports ~667 of them on a page that is rendering absolutely nothing -- a check that
  // cannot fail. Decoding the actual screenshot under reducedMotion:'reduce': the app paints 75.7%
  // (light) / 66.8% (dark) non-background pixels at 1440x900 with bodyOpacity=1, indistinguishable
  // from the default preference; the same detector aimed at a deliberately blanked page reads 0%.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e)));

  await B.gotoApp(page, HTML, { hash: '#walk' });   /* the rail is TOPIC chrome: a bare arrival now lands on the topic-less #home, where .app is display:none. Boot straight to a topic. */

  const rep = await page.evaluate((cfg) => {
    if (typeof TopicRegistry === 'undefined') return { fatal: 'TopicRegistry undefined' };
    const ids = TopicRegistry.ids();
    if (!ids.length) return { fatal: 'no topics registered' };

    const notesOf = (id) => {
      const t = TopicRegistry.get(id);
      return (t && t.identity && t.identity.cmpNotes) || {};
    };

    // ---- FIRST PAINT. Before any navigation the rail must already show the boot topic's walk
    // note. A fix that blanks the rail unconditionally would sail through every other check here.
    const bootTopic = TopicRegistry.current() ? TopicRegistry.current().id : null;
    const bootNote = bootTopic ? notesOf(bootTopic).walk : null;
    const bootEl = document.getElementById('cmpNote');
    const firstPaint = {
      topic: bootTopic,
      expected: bootNote ? bootNote[1] : null,
      actual: bootEl ? (bootEl.textContent || '').trim() : null,
      shown: !!(bootEl && (bootEl.offsetWidth || bootEl.offsetHeight || bootEl.getClientRects().length)),
    };

    // ---- THE PRIMER. A topic that authors a note for all 9 views, so the rail can be loaded with
    // a foreign note for whichever view we are about to test.
    const primer = ids.filter((id) => { const n = notesOf(id); return cfg.VIEWS.every((v) => !!n[v]); })[0];
    if (!primer) return { fatal: 'no topic authors all 9 notes -- the sweep cannot prime the rail' };

    // Read every rail slot: its text, and whether its block is actually rendered.
    const readRail = () => cfg.SLOTS.map((row, i) => row.map((id, j) => {
      const el = document.getElementById(id);
      if (!el) return { id, row: i, col: j, missing: true, text: '', shown: false, blockShown: false };
      const block = el.closest('.cmp-block, .mcomp-block');
      const disp = block ? getComputedStyle(block).display : 'none';
      return {
        id, row: i, col: j, missing: false,
        text: (el.textContent || '').trim(),
        // offsetParent-free visibility: true only if the element generates boxes.
        shown: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
        blockShown: disp !== 'none',
      };
    })).reduce((a, b) => a.concat(b), []);

    // Every authored note string, indexed by column, so a leaked string can be ATTRIBUTED to its
    // real owner. (Titles repeat across topics -- "Probe Drill" is used by many -- so attribution
    // is best-effort and is used only for the message, never for the pass/fail decision.)
    const owners = [{}, {}, {}];
    ids.forEach((id) => {
      const n = notesOf(id);
      Object.keys(n).forEach((v) => (n[v] || []).forEach((s, col) => {
        const k = String(s).trim();
        if (!k || col > 2) return;
        (owners[col][k] = owners[col][k] || []).push(id + '/' + v);
      }));
    });

    const leaks = [];        // rail shows text that is not the active topic's note for the active view
    const emptyBoxes = [];   // no note, but a per-view block is still displayed
    const missing = [];      // note IS authored, but the rail does not visibly render it
    let combos = 0;
    // THE 8 hand-coded topics author all 9 views. Every one of their 72 combos must render its own
    // note, visibly and exactly -- they are the reference, so a regression there is a regression.
    let ref8Combos = 0, ref8Correct = 0;

    cfg.VIEWS.forEach((view) => {
      ids.forEach((topic) => {
        combos++;
        // (1) ADVERSARIALLY PRIME: park the rail on the primer's note for THIS view.
        TopicRegistry.setTopic(primer);
        window.switchTab(view);
        // (2) Now the real navigation path -- exactly what view-manager.js applyRoute() runs.
        TopicRegistry.setTopic(topic);
        window.switchTab(view);

        const own = notesOf(topic)[view] || null;   // null => this topic authors nothing here
        const slots = readRail();

        if (cfg.REFERENCE_8.indexOf(topic) > -1) {
          ref8Combos++;
          const desk = slots.filter((s) => s.row === 0 && !s.missing);
          if (own && desk.length === 3 && desk.every((s) => s.shown && s.text === String(own[s.col]).trim())) ref8Correct++;
        }

        slots.forEach((s) => {
          if (s.missing) return;
          const expect = own ? String(own[s.col]).trim() : '';

          // CHECK 1 -- DATA. Text is the active topic's own note for this view, or nothing.
          if (s.text !== '' && s.text !== expect) {
            const from = owners[s.col][s.text];
            const foreign = !!(from && from.some((o) => o.split('/')[0] !== topic));
            leaks.push({
              topic, view, el: s.id, shown: s.shown,
              kind: foreign ? 'FOREIGN-TOPIC' : (from ? 'WRONG-VIEW' : 'UNKNOWN'),
              owner: from ? from.join(',') : '(unattributable)',
              text: s.text.slice(0, 70),
            });
          }
          // CHECK 2 -- VISUAL. No note for this view => the block must not be displayed.
          if (!own && s.blockShown && s.row === 0) emptyBoxes.push({ topic, view, el: s.id });
          // CHECK 3 -- POSITIVE. Note authored => the desktop rail must actually render it.
          if (own && s.row === 0 && !(s.shown && s.text === expect)) {
            missing.push({ topic, view, el: s.id, shown: s.shown, got: s.text.slice(0, 50), want: expect.slice(0, 50) });
          }
        });
      });
    });

    // Coverage: how many combos are even authored (context for the numbers above).
    let authored = 0;
    ids.forEach((id) => { const n = notesOf(id); cfg.VIEWS.forEach((v) => { if (n[v]) authored++; }); });

    const ref = cfg.REFERENCE_8.filter((id) => TopicRegistry.get(id));
    const refMissing = missing.filter((m) => cfg.REFERENCE_8.indexOf(m.topic) > -1);

    return {
      topics: ids.length, combos, authored, primer, firstPaint,
      referenceFound: ref.length, ref8Combos, ref8Correct,
      leaks, emptyBoxes, missing, refMissing,
      leakCombos: Object.keys(leaks.reduce((a, l) => { a[l.topic + '/' + l.view] = 1; return a; }, {})).length,
      foreignCombos: Object.keys(leaks.filter((l) => l.kind === 'FOREIGN-TOPIC')
        .reduce((a, l) => { a[l.topic + '/' + l.view] = 1; return a; }, {})).length,
    };
  }, { VIEWS, SLOTS, REFERENCE_8 });

  await browser.close();

  if (rep.fatal) { console.error('FATAL: ' + rep.fatal); process.exit(1); }

  const problems = [];
  if (rep.referenceFound !== REFERENCE_8.length) problems.push(`reference set incomplete: found ${rep.referenceFound}/${REFERENCE_8.length} hand-coded topics`);

  // First paint must show the boot topic's own walk note, visibly.
  const fp = rep.firstPaint;
  if (!fp.expected) problems.push(`boot topic "${fp.topic}" authors no walk note -- cannot verify first paint`);
  else if (!fp.shown || fp.actual !== fp.expected) {
    problems.push(`FIRST PAINT is wrong: #cmpNote shown=${fp.shown} text=${JSON.stringify((fp.actual || '').slice(0, 60))} -- expected ${fp.topic}'s walk note`);
  }

  if (rep.ref8Correct !== rep.ref8Combos) problems.push(`THE 8 REGRESSED: only ${rep.ref8Correct}/${rep.ref8Combos} hand-coded (topic, view) combos render their own note visibly and exactly`);
  if (rep.leaks.length) problems.push(`${rep.leakCombos} of ${rep.combos} (topic, view) combos show a note that is NOT the active topic's note for the active view (${rep.foreignCombos} are ANOTHER TOPIC'S note); ${rep.leaks.length} slot(s) affected`);
  if (rep.emptyBoxes.length) problems.push(`${rep.emptyBoxes.length} per-view rail block(s) still displayed with no note to show (empty box)`);
  if (rep.missing.length) problems.push(`${rep.missing.length} slot(s) FAILED TO RENDER an authored note -- the rail was blanked where it should have content (${rep.refMissing.length} on the hand-coded 8)`);
  if (pageErrors.length) problems.push(`${pageErrors.length} page error(s): ${pageErrors.slice(0, 3).join(' | ')}`);

  const show = (list, n) => list.slice(0, VERBOSE ? list.length : n);
  if (rep.leaks.length) {
    console.log('\n-- rail leaks (rendered text that does not belong to the active topic/view) --');
    show(rep.leaks, 12).forEach((l) => console.log(`   ${l.topic}/${l.view}  #${l.el}  [${l.kind}] owned by ${l.owner}\n       "${l.text}..."`));
    if (!VERBOSE && rep.leaks.length > 12) console.log(`   ... and ${rep.leaks.length - 12} more (--verbose for all)`);
  }
  if (rep.missing.length) {
    console.log('\n-- authored notes the rail did NOT render --');
    show(rep.missing, 8).forEach((m) => console.log(`   ${m.topic}/${m.view}  #${m.el}  shown=${m.shown}  got="${m.got}"  want="${m.want}"`));
  }
  if (rep.emptyBoxes.length) {
    console.log('\n-- empty rail boxes --');
    show(rep.emptyBoxes, 8).forEach((b) => console.log(`   ${b.topic}/${b.view}  #${b.el}`));
  }

  console.log('');
  console.log(`topics ${rep.topics} x views ${VIEWS.length} = ${rep.combos} combos; ${rep.authored} authored, ${rep.combos - rep.authored} with no note (rail must close)`);
  console.log(`primer (authors all 9): ${rep.primer}`);
  console.log(`first paint: ${fp.shown && fp.actual === fp.expected ? 'OK -- ' + fp.topic + "'s walk note is rendered" : 'BROKEN'}`);
  console.log(`the 8 (reference, author all 9): ${rep.ref8Correct}/${rep.ref8Combos} combos render their own note, visibly and exactly`);
  console.log(`leaking combos: ${rep.leakCombos}  (foreign-topic: ${rep.foreignCombos})   empty boxes: ${rep.emptyBoxes.length}   unrendered notes: ${rep.missing.length}`);

  if (problems.length) {
    console.log('');
    problems.forEach((p) => console.log('FAIL: ' + p));
    console.log(`rail_integrity: FAIL (${problems.length} problem${problems.length > 1 ? 's' : ''})`);
    process.exit(1);
  }
  console.log(`rail_integrity: PASS -- ${rep.combos} combos, 0 leaks, 0 empty boxes, all ${rep.authored} authored notes render`);
})().catch((e) => { console.error(e); process.exit(1); });
