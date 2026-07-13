/* ===== ViewTransitions =====
   The single choke point both switch paths hand their DOM swap to:
   shell.js:55 (pane switch) and topic-protocol.js:199 (topic switch).

   IT NO LONGER USES document.startViewTransition(), AND THAT IS THE FIX.
   It runs the swap directly. Read this before you put the API back.

   WHAT IT COST. The API cross-faded the swap. It also FROZE THE APP'S INPUT while it did, because a
   view transition captures a SNAPSHOT of the page and the browser stops hit-testing what it has
   captured. Measured on the 11.4MB deliverable at 1440x900, with the UA default (the whole document
   is captured, via `view-transition-name:root` on the root element):

     for 0-500ms after ANY pane or topic switch, elementsFromPoint over a pane tab returned
     EXACTLY ["HTML"] -- not the button, not its parents, not even BODY -- while the button was
     still visible, display:flex, pointer-events:auto. Nothing was covering it. The page was INERT.
     A real trusted click on a pane tab DID NOTHING.

   Stacked with the index overlay's own fade-out, that is the product's PRIMARY entry action: pick a
   topic from the index, then click a pane tab, and the app ignores you for over half a second.

   WHY NOT JUST FIX THE CSS. Two plausible fixes were tried and MEASURED, in this order:
     1. `::view-transition{pointer-events:none}`. The rule is correct, it survives the build, and the
        whole pseudo tree really does compute `none`. IT CHANGES NOTHING. The snapshot is not what
        eats the input -- you cannot have a full-page snapshot AND a live page under it: the snapshot
        IS the page.
     2. Scope the capture: `:root{view-transition-name:none}` + name only `.stage` (the one region
        either switch repaints). This WORKS, and it is a real improvement -- hit-testing recovers
        while the animation is still running instead of after it. But it does not reach zero:

              +7.1ms   startViewTransition() called
              +84.8ms  update callback START
              +85.0ms  update callback END      <-- the app's own work: 0.2ms
              +139.6ms vt.ready
              +168.1ms HIT-TEST ALIVE again     <-- 168ms of eaten clicks
              +471.8ms vt.finished

        The residual freeze is NOT the app's work (0.2ms) and NOT the animation (input is live for
        the whole of it). It is the UA capturing the snapshot of a very large document, and no CSS
        reaches it. Any use of this API on this deliverable costs ~150ms of eaten pointer input, on
        the interaction the user performs most.

   WHAT WE LOSE, AND WHY IT IS THE RIGHT TRADE. Only the cross-fade of the OUTGOING content, and only
   in Chromium -- this file already ran the swap directly in every browser without the API, and the
   app has always been considered correct there. What survives is the animation that was doing most
   of the visible work anyway: `.pane.on{animation:panein}` (styles.css:624) still fades and lifts the
   incoming pane, and `.stage-head.headin` still fades the masthead. This is a rehearsal trainer whose
   core loop is rapidly switching panes and topics; a 150-500ms window in which the app silently
   discards your click is not worth an out-fade.

   TWO THINGS GOT BETTER, not just input. The swap is now SYNCHRONOUS again:
     - `deeptopicchange` fires before setTopic() returns, instead of on a later frame (several checks
       carry comments explaining they must await the event rather than sleep, precisely because of
       this deferral -- card_identity.cjs:158, cram_scope_distinct.cjs:79).
     - It kills the overlapping-transition race: two switchTab() calls in flight used to resolve in
       callback order, so the LOSER could win and strand a pane visibly on screen
       (visual_pane_smoke.mjs:436).

   Guarded by test/transition_deadzone.cjs, which dispatches REAL hit-tested clicks at +0/+16/+60/
   +150/+300ms after every switch and asserts each one reaches its tab AND that the app responds.
   It FAILS on the pre-fix build, and it fails on the scoped-capture build above too. If you restore
   startViewTransition() here, it goes red and tells you why.

   Offline-safe: no network, storage, or permission calls. */

(function () {
  'use strict';

  /* Run `apply` -- the DOM mutation that swaps the active pane or topic. Synchronous, by design.
     The signature is unchanged, so both call sites are untouched and there is exactly ONE place to
     reintroduce a transition if the capture cost ever stops being paid in dropped clicks. */
  function run(apply) {
    if (typeof apply !== 'function') return;
    apply();
  }

  window.ViewTransitions = { run: run };

})();
