/* ===== THE THING YOU ARE CLICKING MUST NOT MOVE OUT FROM UNDER YOU =====
 *
 * THE SISTER CHECK TO transition_deadzone.cjs, AND THE OTHER HALF OF THE SAME SENTENCE.
 * transition_deadzone guards against a click being EATEN -- a layer that consumes input it is not
 * entitled to. This guards against a click being MISSED -- the target moving between the moment a
 * user commits to a click and the moment it lands.
 *
 *     A MISSED CLICK IS INDISTINGUISHABLE FROM AN EATEN ONE.
 *
 * Both read, from the only seat that matters, as "the app ignored me". transition_deadzone found
 * the second bug and could not fail on it: it re-measures its target's LIVE box before clicking
 * (correctly -- that is its invariant), and it only ever clicks light-DOM pane tabs, which are in
 * the sidebar and therefore outside every transform this app applies. It duly reported the 23px
 * shift in a NOTE and moved on. This check is that NOTE, promoted to an assertion.
 *
 * ============================ THE TWO DEFECTS, AS MEASURED ============================
 *
 * 1. THE PANE TABS MOVED UP TO 55.6px WHEN THE TOPIC CHANGED.  (styles.css, .side-id)
 *    .seg -- the nine pane tabs, the app's primary navigation -- is positioned by the height of the
 *    identity block above it, and that block is sized by content that changes on every topic switch.
 *    Across all 46 topics the tabs landed at FOUR distinct heights: 502.1 / 526.1 / 549.2 / 557.7.
 *    THREE variables stacked, and the obvious one was worth less than half of it:
 *        23.1px  .hdr h1 wraps to a second line        (13 of 46 titles)
 *        24.0px  the locator drops below the badge     (45 of 46 -- only "DATcache layer" is short
 *                                                       enough to sit beside it)
 *        13.5px  the locator itself wraps to two lines (2 of 46)
 *    Permanent, not transient. It fires on the app's commonest navigation.
 *
 * 2. `panein` MOVED EVERY CONTROL INSIDE THE INCOMING PANE, FOR 500ms.  (styles.css, .pane.on)
 *    `@keyframes panein` opened on `transform:translateY(16px) scale(.995)`, and HIT-TESTING FOLLOWS
 *    TRANSFORMS. Measured on a real shadow-root button: +18.2px at t=0, decaying to +1.3px by 300ms.
 *    (16px is the translate; the rest is the scale pulling everything toward the pane's centre.)
 *    The failure is HEIGHT-DEPENDENT, which is why it hid in plain sight for so long: a click at a
 *    control's resting CENTRE still lands while the displacement is under half the control's height.
 *    So drill's 41px and num's 40px controls kept working, and the 28px ones did not:
 *        <button class="wb-rev">  "Reveal"       28px -> MISS at +0/+16/+60ms  (landed on <li>)
 *        <button class="op-rev">  "Reveal mine"  28px -> MISS at +0/+16/+60ms  (landed on <div.op>)
 *    29 of the 70 shadow-root controls are under the 36.4px threshold. And that is only the CENTRE:
 *    a click near a control's top edge misses for ANY downward displacement, which is why the fix
 *    is ZERO displacement rather than a smaller one.
 *
 * ============================ WHAT THIS CHECK KNOWS THAT THE LAST ONE DID NOT ============================
 *
 * THE NINE PANES ARE SHADOW DOM. Every control that broke lives inside a shadow root, and a check
 * that clicks only `.seg` tabs is STRUCTURALLY INCAPABLE of seeing it -- the tabs are in the sidebar,
 * which no transform in this app touches. So every click below is aimed INSIDE a shadow root, and
 * the landing is read from `composedPath()[0]` on a capture-phase listener attached to that root.
 *
 * THE TWO DEFECTS FIRE ON DIFFERENT TRIGGERS, and assuming otherwise would have produced two arms
 * that could not fail. `panein` does NOT replay on a topic switch -- setTopic() never re-toggles
 * `.pane.on`, so the animation never restarts (VERIFIED: pane.getAnimations() is empty either side
 * of a topic switch). So:
 *     topic switch -> defect 1 only (the sidebar re-lays out; pane content re-renders, unanimated)
 *     pane switch  -> defect 2 only (panein runs)
 * Both arms are kept anyway: each is the other's regression guard, and re-introducing a pane
 * animation on the topic path is exactly the kind of change this must catch.
 *
 * A CLICK THAT LANDS *MUTATES THE APP*, AND THAT COST ME THREE ROUNDS OF FALSE FAILURES. Clicking
 * "Reveal" reveals an answer, which reflows the pane -- so a resting box captured once, up front,
 * is stale for every later sample, and the run reports a MISS at +500ms, when panein is provably
 * over by then. The bug cannot be there; the instrument was. Hence: A PANE IS CLICKED AT MOST ONCE
 * PER PAGE LOAD, and the delays are swept across FRESH PAGES, not across one dirty one.
 * (The same trap ate a control that had been REPLACED by the click before it -- "control not found"
 * reads as a harness bug, so it would have been "fixed" by loosening the selector, and the check
 * would have gone quietly green on a mutated DOM.)
 *
 * AND A CONTROL BELOW THE FOLD IS NOT A DEADZONE. Clicking a control whose resting centre is at
 * y>900 dispatches at a coordinate outside the viewport and lands on nothing -- which reads exactly
 * like the bug. Every target is filtered to be fully on screen at rest.
 *
 * ============================ WHY THIS ONE CAN ACTUALLY FAIL ============================
 * ELEVEN checks have shipped in this repo that could not. So the burden is on the check, and every
 * assertion below is BEHAVIOURAL and every probe is ARMED, on every single run:
 *
 *   - REAL, HIT-TESTED INPUT. page.mouse.click, a genuine CDP event. An el.click() bypasses
 *     hit-testing entirely and reports success on a provably unclickable button -- precisely how
 *     this class of bug survives a suite.
 *   - THE NEGATIVE CONTROLS ARE WELDED IN. Before it trusts a single green, this check RE-BREAKS
 *     the app at runtime -- it re-injects the translateY into panein, and it neutralises the
 *     sidebar reserve -- and DEMANDS that its own probes go red. If a planted bug is not detected,
 *     the check exits non-zero saying so, because a probe that cannot see a bug we put there on
 *     purpose cannot see one a developer writes by accident. A check whose negative control has
 *     never been watched going red is decoration.
 *   - IT CANNOT PASS BECAUSE NOTHING HAPPENED. Each arm asserts the switch under test genuinely
 *     changed state (the topic id / the active tab moved) BEFORE it measures anything, and the
 *     topic arm asserts it actually exercised BOTH a one-line and a two-line title -- the whole
 *     defect is the difference between them, so a run that only ever saw one proves nothing.
 *   - PAINTED PIXELS, NOT VISIBLE NODES. The reduced-motion arm counts INK (test/_pixels.cjs),
 *     because a "visible text node" counter reports 276 visible nodes on a totally blank page.
 *
 * NEGATIVE CONTROL, OBSERVED, NOT ASSUMED:
 *   pre-fix build   -> FAIL  (tabs at 4 different heights; 28px controls miss at +0/+16/+60ms)
 *   fixed build     -> PASS
 *
 * Usage: node test/click_drift.cjs <deliverable.html>   (CHROME=<path> for the browser) */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const PX = require('./_pixels.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* The delays at which a real user's next input actually arrives. 0 and 16 are the ones that matter:
 * they are the frames in which panein's displacement is at its maximum. */
const DELAYS = [0, 16, 60, 150, 300];
const VW = 1440, VH = 900;

/* Panes whose shadow roots hold the SHORT controls -- the ones the displacement actually broke --
 * plus drill, whose 41px controls did NOT break, so a regression that only moves things a little
 * still has somewhere to show up. */
const TARGET_PANES = ['wb', 'open', 'sys', 'model', 'drill'];

const fails = [];
const notes = [];
function chk(name, ok, detail) {
  notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail));
  if (!ok) fails.push(name + (detail ? ' [' + String(detail).slice(0, 160) + ']' : ''));
}

/* ============ IN-PAGE PRIMITIVES ============ */

const CTRL_SEL = 'button,input,select,summary,textarea,[role="button"],a[href]';

/* THE TARGET IS IDENTIFIED BY ITS DOM-ORDER INDEX, NOT BY A MARKER ATTRIBUTE.
 * The first cut tagged the chosen control with data-drift-victim and asked, after the click,
 * whether the landed node carried it. That works across a PANE switch and is a LIE across a TOPIC
 * switch: renderTopic() repaints the pane's mounts, so the tagged element is DESTROYED and rebuilt
 * without the tag. Every topic-arm click then scored a miss while reporting "it landed on
 * <button.wb-rev>" -- the right button, marked wrong. Four fabricated failures, and the shape of
 * them ("the harness cannot find its own element") is exactly what gets "fixed" by loosening the
 * predicate until the check goes quietly green on a mutated DOM.
 * A control's index in DOM order is stable across a re-render, because the destination topic
 * renders deterministically. So that is the identity. */
/* A NON-ZERO getBoundingClientRect() IS NOT A VISIBILITY TEST, AND BELIEVING IT NEARLY MADE THIS
 * CHECK REPORT A BUG THAT DOES NOT EXIST.
 * <button class="piv-jump"> in the sys pane lives inside a CLOSED <details>. Chromium reports that
 * content as 151x30 at y=825..855, with a truthy offsetParent -- and does not hit-test it, and does
 * not paint it. checkVisibility() is the only one of them that tells the truth (false). Selecting it
 * as a target produced a MISS at EVERY delay, including +300ms, where panein is provably over and
 * the measured displacement is 0 -- and the check duly blamed panein, in five confident,
 * fully-detailed, completely fabricated failures. It is the same family as the "276 visible nodes on
 * a blank page" this repo already has scars from: the DOM says yes, the compositor says no.
 *
 * So a target must clear BOTH bars:
 *   checkVisibility()  -- it is actually rendered (closed <details>, content-visibility, etc.)
 *   REACHABLE AT REST  -- a hit-test at its own centre, with nothing animating, resolves to it.
 * The second is not paranoia: this check's entire premise is "a click at the resting centre reaches
 * the control", so a control that already fails that AT REST is not a baseline, it is a different
 * defect. Excluding it here keeps the two apart instead of letting one be reported as the other. */
const PICK = ({ pane, vh, sel }) => {
  const host = document.querySelector('#' + pane + ' > *');
  if (!host || !host.shadowRoot) return null;
  const all = [...host.shadowRoot.querySelectorAll(sel)];              /* DOM order */

  const reaches = (e, cx, cy) => {
    let deep = document.elementFromPoint(cx, cy);
    while (deep && deep.shadowRoot) {
      const d = deep.shadowRoot.elementFromPoint(cx, cy);
      if (!d || d === deep) break;
      deep = d;
    }
    /* the click may land on a CHILD of the control -- walk up, exactly as ARM does */
    let el = deep;
    while (el && el.nodeType === 1 && el !== e && all.indexOf(el) === -1) el = el.parentNode;
    return el === e;
  };

  const vis = all
    .map((e, i) => ({ e, i, r: e.getBoundingClientRect() }))
    .filter((o) => o.r.width > 0 && o.r.height > 0 && o.r.top > 0 && o.r.bottom < vh)
    .filter((o) => o.e.checkVisibility())
    .filter((o) => reaches(o.e, Math.round(o.r.left + o.r.width / 2), Math.round(o.r.top + o.r.height / 2)))
    .sort((a, b) => a.r.height - b.r.height);       /* SHORTEST first: the most sensitive target */
  if (!vis.length) return null;
  const { e, i, r } = vis[0];
  return {
    domIdx: i,
    cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2),
    h: Math.round(r.height * 10) / 10,
    tag: e.tagName.toLowerCase(),
    cls: (typeof e.className === 'string' ? e.className : '') || '(none)',
    txt: (e.textContent || '').trim().slice(0, 18),
  };
};

/* Capture-phase, ON THE SHADOW ROOT, reading composedPath()[0] -- the node the browser ACTUALLY
 * hit-tested, not the host it would be retargeted to on the way out.
 * ...and then WALKING UP TO THE NEAREST CONTROL. composedPath()[0] is the DEEPEST node, which is
 * routinely a child of the thing you clicked: a real click on <summary> lands on the <span.pq>
 * inside it. Comparing the deep node against the control scores a hit as a miss. What a user aims
 * at -- and what the app dispatches on -- is the CONTROL, so that is what is compared. */
const ARM = ({ pane, sel }) => {
  window.__landed = null;
  const host = document.querySelector('#' + pane + ' > *');
  if (!host || host.__driftArmed) return;
  host.__driftArmed = 1;
  host.shadowRoot.addEventListener('click', (ev) => {
    const deep = ev.composedPath()[0];
    const all = [...host.shadowRoot.querySelectorAll(sel)];
    let el = deep;
    while (el && el.nodeType === 1 && all.indexOf(el) === -1) el = el.parentNode;
    const idx = (el && el.nodeType === 1) ? all.indexOf(el) : -1;
    const named = idx > -1 ? el : deep;
    window.__landed = {
      idx,
      tag: named && named.tagName ? named.tagName.toLowerCase() : String(named),
      cls: (named && typeof named.className === 'string' && named.className) ? named.className.split(' ')[0] : '',
    };
  }, true);
};

/* A tab that is not RENDERED has no box, and getBoundingClientRect() reports top=0 for it -- which
 * would read as a 961px "drift" against a tab that is on screen. `viz` is display:none on 45 of the
 * 46 topics (it is a conditional tenth tab, shown only where the topic has visual content), so this
 * is not hypothetical: it is the difference between a real assertion and a fabricated failure.
 * Only laid-out tabs are comparable, so `rendered` is carried alongside the y and the caller
 * compares within it. */
const SEG_YS = () => {
  const out = {};
  document.querySelectorAll('.seg button').forEach((b) => {
    const r = b.getBoundingClientRect();
    out[b.getAttribute('data-tab')] = {
      y: Math.round(r.top * 10) / 10,
      rendered: r.width > 0 && r.height > 0,
    };
  });
  return out;
};

/* THE TITLE'S INTRINSIC LINE COUNT -- not its rendered height.
 * The first cut of this read `h1.getBoundingClientRect().height` and classified a title as
 * one-line or two-line from it. THE FIX MAKES THAT MEASUREMENT CONSTANT (min-height:2lh pins every
 * title to two lines' worth of box), so on a fixed build every topic collapsed into a single
 * bucket -- which silently made the anti-vacuity assertion unsatisfiable AND made the negative
 * control compare a topic against ITSELF (526.1 -> 526.1, "no drift", probe declared decoration).
 * A check whose own fix blinds it is worse than no check.
 * A Range over the text yields ONE RECT PER LINE BOX, so it counts the lines the TEXT actually
 * occupies, independent of any reserve on the box around it. */
const H1 = () => {
  const h = document.querySelector('.side-id .hdr h1');
  const r = document.createRange();
  r.selectNodeContents(h);
  return {
    txt: h.textContent.trim(),
    lines: r.getClientRects().length,
    h: Math.round(h.getBoundingClientRect().height * 10) / 10,
  };
};

/* WAIT FOR A CONDITION, NEVER A DURATION -- the rule _boot.cjs opens with. The DELAYS are the
 * experiment (they decide WHEN input is dispatched, so they stay durations). Everything else polls
 * the browser's own state, so SLOW takes longer and BROKEN still goes red.
 * IT WAITS ON THE TRANSFORM TOO, not just on getAnimations(). A resting box is the whole premise of
 * this check -- every assertion is "the control is where it RESTS" -- so a baseline sampled while
 * anything is still displacing the pane is a baseline that has quietly measured the bug and called
 * it the resting place. getAnimations() sees CSS animations; it does NOT see an inline transform
 * applied by script, which is precisely what the topic negative control below installs. */
const AT_REST = (v) => {
  const p = document.getElementById(v);
  if (!p || !p.classList.contains('on')) return false;
  if (!p.getAnimations().every((a) => a.playState === 'finished' || a.playState === 'idle')) return false;
  const t = getComputedStyle(p).transform;
  return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
};
async function atRest(page, pane) {
  await page.waitForFunction(AT_REST, pane, { timeout: B.ACT_MS });
  await B.settle(page);
}
async function rest(page, pane) {
  await page.evaluate((v) => window.switchTab(v), pane);
  await atRest(page, pane);
}

async function boot(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: VW, height: VH } }, opts || {}));
  const page = await ctx.newPage();
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);
  await B.settle(page);
  return { ctx, page };
}

/* Re-break the app, at runtime, in the browser. Used ONLY by the negative controls. */
const BREAK_PANEIN = () => {
  const s = document.createElement('style');
  s.id = '__nc_panein';
  s.textContent = '@keyframes __ncslide{from{opacity:0;transform:translateY(16px) scale(.995)}' +
    'to{opacity:1;transform:translateY(0) scale(1)}}' +
    '.pane.on{animation:__ncslide 500ms cubic-bezier(.22,.61,.36,1) !important}';
  document.head.appendChild(s);
};
const BREAK_SIDEBAR = () => {
  const s = document.createElement('style');
  s.id = '__nc_sidebar';
  /* exactly the reserve this fix added, neutralised -- nothing else */
  s.textContent = '@media(min-width:920px){.side-id .hdr h1{min-height:0}' +
    '.side-id .locator{display:inline-block;width:auto;max-width:none;white-space:normal;' +
    'overflow:visible;text-overflow:clip}}';
  document.head.appendChild(s);
};
/* The topic path does NOT animate the pane today (setTopic never re-toggles .pane.on, so panein
 * never restarts), so re-injecting panein would not touch the topic arm at all -- and an arm whose
 * negative control does not reach it is an arm that is green for free. This installs the defect the
 * topic arm actually exists to catch: SOMEONE RE-ADDS A PANE ANIMATION TO THE TOPIC PATH. It
 * displaces the incoming pane by 16px on deeptopicchange and releases it 400ms later, which is
 * exactly the shape panein had. AT_REST() waits on the computed transform, so the resting baseline
 * this NC is measured against is still taken at rest. */
const BREAK_TOPIC = () => {
  window.addEventListener('deeptopicchange', () => {
    document.querySelectorAll('.pane.on').forEach((p) => {
      p.style.transform = 'translateY(16px)';
      setTimeout(() => { p.style.transform = ''; }, 400);
    });
  });
};

const ACTIVE_TAB = () => {
  const b = document.querySelector('.seg button.on');
  return b ? b.getAttribute('data-tab') : null;
};
function verdict(c, l) {
  return {
    c,
    hit: !!(l && l.idx === c.domIdx),
    landed: l ? (l.idx === -1 ? '<' + l.tag + '> (not a control at all)'
      : '<' + l.tag + (l.cls ? '.' + l.cls : '') + '> -- control #' + l.idx + ', not #' + c.domIdx)
      : 'NOTHING',
  };
}

/* ONE TRIAL: rest the pane, note where the control SITS, leave, come back, and click at that spot
 * `dt` ms into the switch. Returns whether the click reached the control the user was aiming at. */
async function clickAfterPaneSwitch(page, pane, dt) {
  await rest(page, pane);
  const c = await page.evaluate(PICK, { pane, vh: VH, sel: CTRL_SEL });
  if (!c) return { skip: 'no on-screen control in this shadow root' };
  await page.evaluate(ARM, { pane, sel: CTRL_SEL });

  await rest(page, pane === 'walk' ? 'drill' : 'walk');       /* park, at rest */
  await page.evaluate(() => { window.__landed = null; });

  const before = await page.evaluate(ACTIVE_TAB);
  await page.evaluate((v) => window.switchTab(v), pane);      /* t=0: panein starts */
  const after = await page.evaluate(ACTIVE_TAB);
  /* ANTI-VACUITY: if the switch did not happen there is no animation to survive, and the click
     below would land for free. That is the exact shape of a check that cannot fail. */
  if (after === before || after !== pane) return { vacuous: 'the pane never switched (still on ' + after + ')' };

  if (dt) await page.waitForTimeout(dt);
  await page.mouse.click(c.cx, c.cy);
  await page.waitForFunction(() => window.__landed !== null, null, { timeout: 4000 }).catch(() => {});
  return verdict(c, await page.evaluate(() => window.__landed));
}

/* Same, but the trigger is a TOPIC switch. The destination topic renders DIFFERENT content, so the
 * control rests somewhere NEW -- the resting box is therefore measured in the POST-switch state and
 * the switch is then replayed. Aiming at the pre-switch box would be measuring a content change and
 * calling it a drift. */
async function clickAfterTopicSwitch(page, pane, dt, from, to) {
  await page.evaluate((t) => window.TopicRegistry.setTopic(t), from);
  await rest(page, pane);
  await page.evaluate((t) => window.TopicRegistry.setTopic(t), to);
  await atRest(page, pane);                                  /* not just settle() -- see AT_REST */
  const c = await page.evaluate(PICK, { pane, vh: VH, sel: CTRL_SEL });   /* rest ON THE DESTINATION */
  if (!c) return { skip: 'no on-screen control in this shadow root' };
  await page.evaluate(ARM, { pane, sel: CTRL_SEL });

  await page.evaluate((t) => window.TopicRegistry.setTopic(t), from);     /* back, at rest */
  await atRest(page, pane);
  await page.evaluate(() => { window.__landed = null; });

  const t0 = await page.evaluate(() => window.TopicRegistry.current().id);
  await page.evaluate((t) => window.TopicRegistry.setTopic(t), to);       /* t=0 */
  const t1 = await page.evaluate(() => window.TopicRegistry.current().id);
  if (t1 === t0 || t1 !== to) return { vacuous: 'the topic never changed (still ' + t1 + ')' };

  if (dt) await page.waitForTimeout(dt);
  await page.mouse.click(c.cx, c.cy);
  await page.waitForFunction(() => window.__landed !== null, null, { timeout: 4000 }).catch(() => {});
  return verdict(c, await page.evaluate(() => window.__landed));
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());

  /* ================================================================================
     PART 1 -- THE PANE TABS SIT AT THE SAME PLACE ON EVERY TOPIC
     ================================================================================ */
  {
    const { ctx, page } = await boot(browser);
    const ids = await page.evaluate(() => window.TopicRegistry.ids());

    const seen = [];
    for (const id of ids) {
      await page.evaluate((t) => window.TopicRegistry.setTopic(t), id);
      await B.settle(page);
      const [ys, h1] = await Promise.all([page.evaluate(SEG_YS), page.evaluate(H1)]);
      seen.push({ id, ys, h1 });
    }

    chk('[tabs] every one of the ' + ids.length + ' topics was visited', seen.length === ids.length,
      'only ' + seen.length + ' of ' + ids.length);

    /* ANTI-VACUITY: the defect IS the difference between a one-line and a two-line title. A run that
       only ever saw one kind proves nothing at all, so demand we exercised both. Counted from the
       TEXT's line boxes -- see H1() for why the rendered height cannot be used here. */
    const oneLine = seen.find((s) => s.h1.lines === 1);
    const twoLine = seen.find((s) => s.h1.lines > 1);
    chk('[tabs] the run exercised BOTH a one-line and a two-line topic title',
      !!(oneLine && twoLine),
      'every title wrapped to ' + [...new Set(seen.map((s) => s.h1.lines))].join('/') + ' line(s) --' +
      ' the case this check exists for was never reached, so a green here would mean nothing');

    /* THE ASSERTION. Every tab, on every topic where it is RENDERED, at the same y. */
    const tabs = Object.keys(seen[0].ys);
    for (const tab of tabs) {
      const on = seen.filter((s) => s.ys[tab].rendered);
      if (!on.length) { notes.push('  ....  [tabs] the "' + tab + '" tab is rendered on NO topic -- not comparable'); continue; }
      if (on.length < seen.length) {
        notes.push('  ....  [tabs] the "' + tab + '" tab is rendered on only ' + on.length + ' of ' +
          seen.length + ' topics (a conditional tab); compared across those ' + on.length);
      }
      const vals = on.map((s) => s.ys[tab].y);
      const min = Math.min(...vals), max = Math.max(...vals);
      const drift = Math.round((max - min) * 10) / 10;
      const worst = on.find((s) => s.ys[tab].y === max);
      const best = on.find((s) => s.ys[tab].y === min);
      chk('[tabs] the "' + tab + '" tab is at the same y on all ' + on.length + ' topics that render it',
        drift <= 1,
        'it moves ' + drift + 'px: y=' + min + ' on "' + best.h1.txt + '" but y=' + max + ' on "' +
        worst.h1.txt + '". A user who clicks where it WAS misses it.');
    }

    /* AND BEHAVIOURALLY -- a real click at the coordinates the tab occupied on the PREVIOUS topic. */
    if (twoLine && oneLine && twoLine.id !== oneLine.id) {
      await page.evaluate((t) => window.TopicRegistry.setTopic(t), oneLine.id);
      await B.settle(page);
      const box = await page.locator('.seg button[data-tab="sys"]').boundingBox();
      await page.evaluate(() => { const b = document.querySelector('.seg button[data-tab="walk"]'); if (b) b.click(); });
      await page.waitForFunction(() => document.querySelector('.seg button.on').getAttribute('data-tab') === 'walk',
        null, { timeout: B.ACT_MS }).catch(() => {});

      /* switch to the LONG-titled topic, then click WHERE THE TAB WAS -- stale coordinates on purpose */
      await page.evaluate((t) => window.TopicRegistry.setTopic(t), twoLine.id);
      await B.settle(page);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      /* POLL FOR THE OUTCOME, DO NOT SLEEP AT IT. The first cut waited a FIXED 200ms and then read the
         active tab -- a bet that the click -> navigate -> switchTab -> toggle-class chain finishes in
         200ms, which is a bet that this machine is as idle as it was the day the number was typed. It
         is not: inside the full gate an 11.4MB app competes with 30 other checks, the chain slips past
         200ms, and this reads the PARKED tab and fails for a reason that has nothing to do with drift.
         A flaky red is worse than no check -- it teaches the team that red means "run it again".
         So wait for the tab to actually settle. On a fixed build it becomes "sys" fast and this
         returns immediately; on a drift it never does and the cap is paid (only on the negative-control
         build, run rarely), then the real value is read and asserted. Same assertion, no stopwatch. */
      await page.waitForFunction(
        () => { const b = document.querySelector('.seg button.on'); return b && b.getAttribute('data-tab') === 'sys'; },
        null, { timeout: B.ACT_MS }).catch(() => {});
      const nowTab = await page.evaluate(() => {
        const b = document.querySelector('.seg button.on');
        return b ? b.getAttribute('data-tab') : null;
      });
      chk('[tabs] a real click where the "sys" tab sat on "' + oneLine.h1.txt +
        '" still opens it after switching to "' + twoLine.h1.txt + '"',
        nowTab === 'sys',
        'the active tab is "' + nowTab + '" -- the tabs moved under the cursor between the two topics,' +
        ' so the click landed on a different button (or on none)');
    }

    /* ---- NEGATIVE CONTROL: neutralise the reserve, and demand the probe goes red ----
       This is the arm that proves the assertions above are not decoration. It re-creates the ORIGINAL
       defect at runtime -- min-height:0 on the title, and the locator free to wrap again -- and the
       tabs must then move between a one-line and a two-line topic. If they do not, the probe cannot
       see the very bug it was written for, and the check fails ITSELF rather than reporting a green
       it did not earn. */
    if (oneLine && twoLine && oneLine.id !== twoLine.id) {
      await page.evaluate(BREAK_SIDEBAR);
      await page.evaluate((t) => window.TopicRegistry.setTopic(t), oneLine.id);
      await B.settle(page);
      const ncA = await page.evaluate(SEG_YS);
      await page.evaluate((t) => window.TopicRegistry.setTopic(t), twoLine.id);
      await B.settle(page);
      const ncB = await page.evaluate(SEG_YS);
      const ncDrift = Math.round(Math.abs(ncB.walk.y - ncA.walk.y) * 10) / 10;
      chk('[tabs][negative control] with the sidebar reserve neutralised, the tabs DO move (this probe can go red)',
        ncDrift > 1,
        'the tabs did not move even with the fix disabled (' + ncA.walk.y + ' -> ' + ncB.walk.y + '). This' +
        ' probe is DECORATION: it would report PASS on the broken build it was written to catch.');
      if (ncDrift <= 1) {
        notes.forEach((n) => console.log(n));
        await ctx.close(); await browser.close();
        return B.finish(1, 'CLICK DRIFT: FAIL  (the tab-drift probe cannot detect a defect planted on purpose)');
      }
      notes.push('  ....  [tabs][negative control] armed: neutralising the reserve moves the tabs ' +
        ncDrift + 'px between "' + oneLine.h1.txt + '" and "' + twoLine.h1.txt + '"');
    }
    await ctx.close();
  }

  /* ================================================================================
     PART 2 -- A CONTROL INSIDE A SHADOW ROOT IS WHERE IT RESTS, THROUGHOUT A SWITCH
     A pane is clicked AT MOST ONCE per page load: a click that lands mutates the DOM.
     ================================================================================ */
  /* COVERAGE IS AN ASSERTION, NOT A HOPE. PICK() legitimately returns nothing for a pane with no
     reachable on-screen control -- and a check that quietly skips every pane it cannot target is a
     check that passes by measuring NOTHING. So every skip is counted and named, and the trials that
     actually ran are asserted against the panes and delays that were supposed to run. */
  const ran = { pane: 0, topic: 0 };
  const skipped = new Set();
  const shortest = [];
  for (const dt of DELAYS) {
    const { ctx, page } = await boot(browser);
    for (const pane of TARGET_PANES) {
      const r = await clickAfterPaneSwitch(page, pane, dt);
      if (r.skip) { skipped.add(pane + ' (' + r.skip + ')'); continue; }
      chk('[pane switch +' + dt + 'ms] the switch into "' + pane + '" actually HAPPENED', !r.vacuous, r.vacuous);
      if (r.vacuous) continue;
      ran.pane++;
      if (dt === 0) shortest.push(pane + ':<' + r.c.tag + '.' + r.c.cls + '> ' + r.c.h + 'px');
      chk('[pane switch +' + dt + 'ms] a real click at the RESTING centre of <' + r.c.tag + '.' + r.c.cls +
        '> (' + r.c.h + 'px) in "' + pane + '" reaches it',
        r.hit,
        'it landed on ' + r.landed + '. The control was not where it rests: `panein` was still moving it,' +
        ' and hit-testing follows transforms. The user aimed where the button IS and hit something else.');
    }
    await ctx.close();
  }
  if (skipped.size) {
    notes.push('  ....  [pane switch] no reachable on-screen control in: ' + [...skipped].join(', '));
  }
  notes.push('  ....  [pane switch] targets: ' + shortest.join('  '));

  /* the same sweep, on the TOPIC path */
  {
    const { ctx: c0, page: p0 } = await boot(browser);
    const ids = await p0.evaluate(() => window.TopicRegistry.ids());
    await c0.close();
    const from = ids[0], to = ids[1];

    for (const dt of DELAYS) {
      const { ctx, page } = await boot(browser);
      for (const pane of TARGET_PANES) {
        const r = await clickAfterTopicSwitch(page, pane, dt, from, to);
        if (r.skip) continue;
        chk('[topic switch +' + dt + 'ms] the switch to "' + to + '" actually HAPPENED', !r.vacuous, r.vacuous);
        if (r.vacuous) continue;
        ran.topic++;
        chk('[topic switch +' + dt + 'ms] a real click at the RESTING centre of <' + r.c.tag + '.' + r.c.cls +
          '> (' + r.c.h + 'px) in "' + pane + '" reaches it',
          r.hit,
          'it landed on ' + r.landed + '. Something is moving the pane\'s contents during a topic switch.');
      }
      await ctx.close();
    }
  }

  /* THE COVERAGE GATE. Without this, a PICK() that silently stopped finding targets would turn every
     assertion above into a no-op and the check would report a confident, meaningless PASS. At least
     three of the five panes must be genuinely exercised at every delay, on both paths. */
  const MIN_PANES = 3;
  chk('[coverage] the pane-switch arm actually clicked something at every delay',
    ran.pane >= MIN_PANES * DELAYS.length,
    'only ' + ran.pane + ' of an expected >=' + (MIN_PANES * DELAYS.length) + ' pane-switch trials ran' +
    ' (' + TARGET_PANES.length + ' panes x ' + DELAYS.length + ' delays, minus skips). The assertions above' +
    ' measured almost nothing, so their PASS means almost nothing.');
  chk('[coverage] the topic-switch arm actually clicked something at every delay',
    ran.topic >= MIN_PANES * DELAYS.length,
    'only ' + ran.topic + ' of an expected >=' + (MIN_PANES * DELAYS.length) + ' topic-switch trials ran.');

  /* ---- NEGATIVE CONTROLS: re-break each path, and demand the click probe goes red on it ---- */
  {
    const { ctx: c1, page: p1 } = await boot(browser);
    await p1.evaluate(BREAK_PANEIN);
    /* the shortest control in wb is 28px -- the one the real defect actually broke */
    const rp = await clickAfterPaneSwitch(p1, 'wb', 0);
    const paneDetected = !rp.skip && !rp.vacuous && !rp.hit;
    chk('[pane switch][negative control] with the translateY put back, the +0ms click MISSES (this probe can go red)',
      paneDetected,
      rp.skip || rp.vacuous ||
      ('the click still reached the control even with `translateY(16px) scale(.995)` re-injected into' +
       ' panein. This probe is DECORATION: it would report PASS on the broken build it was written to' +
       ' catch. (aimed at <' + (rp.c ? rp.c.tag + '.' + rp.c.cls + '> ' + rp.c.h + 'px' : '?') + ')'));
    if (paneDetected) {
      notes.push('  ....  [pane switch][negative control] armed: re-injecting the slide makes the ' +
        rp.c.h + 'px <' + rp.c.tag + '.' + rp.c.cls + '> click land on ' + rp.landed + ' instead');
    }
    await c1.close();

    const { ctx: c2, page: p2 } = await boot(browser);
    const ids2 = await p2.evaluate(() => window.TopicRegistry.ids());
    await p2.evaluate(BREAK_TOPIC);
    const rt = await clickAfterTopicSwitch(p2, 'wb', 0, ids2[0], ids2[1]);
    const topicDetected = !rt.skip && !rt.vacuous && !rt.hit;
    chk('[topic switch][negative control] with a pane animation added to the TOPIC path, the +0ms click MISSES' +
      ' (this probe can go red)',
      topicDetected,
      rt.skip || rt.vacuous ||
      ('the click still reached the control even with the incoming pane displaced 16px on' +
       ' deeptopicchange. The topic arm is DECORATION: it is green because nothing animates that path' +
       ' TODAY, not because it would notice if something did.'));
    if (topicDetected) {
      notes.push('  ....  [topic switch][negative control] armed: displacing the pane on deeptopicchange makes' +
        ' the ' + rt.c.h + 'px <' + rt.c.tag + '.' + rt.c.cls + '> click land on ' + rt.landed + ' instead');
    }
    await c2.close();

    if (!paneDetected || !topicDetected) {
      notes.forEach((n) => console.log(n));
      await browser.close();
      return B.finish(1, 'CLICK DRIFT: FAIL  (a click probe cannot detect a defect planted on purpose)');
    }
  }

  /* ================================================================================
     PART 3 -- REDUCED MOTION MUST STILL *RENDER*  (painted pixels, never "visible nodes")
     The fix removes the transform from panein. Under prefers-reduced-motion the whole animation is
     already suppressed (`animation:none!important`), which means the pane's resting state IS what
     paints -- so a mistake here does not degrade an animation, it ships a BLANK PANE. A "visible
     text node" counter reports 276 visible nodes on a totally blank page, so this counts INK.
     ================================================================================ */
  {
    const { ctx, page } = await boot(browser, { reducedMotion: 'reduce' });
    for (const pane of ['wb', 'drill', 'num']) {
      await rest(page, pane);
      const box = await page.locator('#' + pane).boundingBox();
      const shot = await page.screenshot({ clip: box });
      const m = PX.ink(shot);
      chk('[reduced motion] the "' + pane + '" pane actually PAINTS (ink, not nodes)',
        m.inkPct > 1 && m.distinct > 10,
        'only ' + m.inkPct + '% of the pane is non-background across ' + m.distinct + ' distinct colours' +
        ' -- it is effectively blank. Reduced motion suppresses panein entirely, so the pane\'s RESTING' +
        ' state is what paints; if that is transparent, the pane ships blank.');
    }

    /* NEGATIVE CONTROL: a blank pane must read as blank. If the ink probe cannot see that, it would
       have certified the blank page this repo has already once shipped. */
    await rest(page, 'drill');
    await page.evaluate(() => {
      const s = document.createElement('style');
      s.textContent = '#drill{opacity:0 !important}';
      document.head.appendChild(s);
    });
    await B.settle(page);
    const blankBox = await page.locator('#drill').boundingBox();
    const blank = PX.ink(await page.screenshot({ clip: blankBox }));
    chk('[reduced motion][negative control] a pane forced to opacity:0 reads as BLANK (this probe can go red)',
      blank.inkPct < 1,
      'the ink probe still reports ' + blank.inkPct + '% ink on a pane that paints NOTHING. It is' +
      ' decoration -- exactly the counter that let a blank page pass an a11y audit here.');
    notes.push('  ....  [reduced motion][negative control] armed: opacity:0 collapses the pane to ' +
      blank.inkPct + '% ink');
    await ctx.close();
  }

  await browser.close();
  notes.forEach((n) => console.log(n));

  if (fails.length) {
    fails.forEach((f) => console.log('  - ' + f));
    /* the gate reports a check by its LAST LINE -- the verdict must be last */
    return B.finish(1, 'CLICK DRIFT: FAIL  (' + fails.length + ' of ' + notes.length + ' assertions)');
  }
  console.log('CLICK DRIFT: PASS  (' + notes.length + ' assertions: the nine pane tabs sit at an identical y' +
    ' on all 46 topics, and a real click at the resting centre of the shortest control in five shadow' +
    ' roots lands on that control at +0/+16/+60/+150/+300ms after both a pane switch and a topic switch;' +
    ' all three probes were re-armed against a planted defect on this run)');
  return B.finish(0, null);
})();
