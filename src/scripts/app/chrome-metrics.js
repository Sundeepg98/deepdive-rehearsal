/* ===== THE FIXED PHONE CHROME MEASURES ITSELF  (W19 / cross-browser audit X2, half 2) =====

   WHAT THIS REPLACES. Six numbers were hand-tuned to the height of two fixed bars the app never
   measured -- `.app` padding-top/-bottom, `.scrolltop`'s offset, and the drill's
   scroll-margin-top/-bottom -- once for portrait and again for the short-viewport landscape
   breakpoint. Every one of them was a guess about layout the browser had already computed.

   THE GUESS WAS ALREADY WRONG, IN THE GATE'S OWN ENGINE. `.app{padding-top:56px}` against a
   `.seg` that measures 61px left the first 5px of `.side-id` sitting under the fixed bar at
   360x844 in Chromium 149 -- not a WebKit finding, not a projection: measured on the shipped
   build. The cross-browser audit then found the same constants 12px out in WebKit 26.5, where a
   classic scrollbar reserved layout height inside the strip. W18 removed that particular 12px,
   which is exactly why this file exists rather than a seventh constant: the audit's point was
   never "the number is 56 when it should be 61", it was that ANY engine, zoom level, font
   fallback or future padding change desyncs all six at once, silently, with nothing to catch it.

   WHAT IT WRITES. Two custom properties on <html>, in CSS pixels:
     --chrome-top   how much fixed chrome steals from the TOP of the viewport    (the .seg strip)
     --chrome-bot   how much it steals from the BOTTOM                           (the .mockcta bar)
   Custom properties inherit through shadow boundaries, so the drill's own stylesheet consumes the
   same two values the light DOM does. Every consumer states its intent as "the bar, plus the gap I
   want" -- the measurement is derived, the gap stays authored, and the two can no longer drift
   apart because only one of them is a number.

   "STOLEN", NOT "HEIGHT" -- and the definition is copied from the check on purpose.
   test/fold_budget.cjs computes the live band as `segFixed ? segRect.bottom : 0`, because only a
   POSITION:FIXED bar costs the content anything; on desktop both bars sit in the sidebar column
   and steal nothing. This module answers the same question with the same rule, so the app and the
   check that guards it cannot disagree about what "chrome" means. A display:none bar (print, or
   the #home route where .app is hidden) also steals nothing, hence the getClientRects() test.

   CEIL, NEVER FLOOR. A fractional bar rounded DOWN reserves less space than the bar occupies,
   which is the precise shape of the defect being removed. Rounded up it reserves at most one px
   too much, which is invisible. Integers also keep the written value stable and readable.

   RE-DERIVING: A ResizeObserver, NOT the media-query hooks.
   The bar's height changes for more reasons than any list of breakpoints knows about:
     - orientation      -- the <=480px-tall block re-pads .seg 8px -> 3px and .mockcta 12px -> 6px
     - text size        -- NOT the app's own A-/A+ control (styles.css hides .textzoom below 920px,
                           and it scales .stage's zoom, never .sidebar) but the browser's default
                           font size, its minimum-font-size, and full-page zoom all reflow the tab
                           labels, and a wrapped label is a taller bar
     - font fallback    -- the bar's face is a system stack; a box without it lays out differently
     - the engine       -- X2's whole mechanism: a classic scrollbar reserved inside the strip
     - content          -- the NextUp chip joining the bottom bar, a future control in either
   A ResizeObserver fires for ALL of them, including the ones nobody enumerated, because it watches
   the outcome instead of the causes. That is the same discipline the drill's own focus repair
   settled on: "the trigger is no longer a list of sites, it is the CONDITION ITSELF."

   The one thing a ResizeObserver cannot see is a change of POSITION at an unchanged height, so the
   920px breakpoint -- where both bars stop being fixed and start costing nothing -- gets an
   explicit matchMedia listener. That flip does normally change .seg's height (row -> column), but
   relying on a coincidence to fire a correctness observer is how a check stops being able to fail.

   THE DISCLOSURE CASE, MEASURED AND RECORDED: opening the drill's setup disclosure (`dsu-closed`
   comes off) changes the CARD, not the bars -- .seg and .mockcta are in .sidebar, the disclosure is
   in the drill's shadow root, and neither bar's box moves. It re-derives anyway, because the
   observer is on the outcome and costs nothing when the outcome is unchanged.

   NO FEEDBACK LOOP. Both bars are position:fixed with left:0;right:0, so their heights depend on
   their own content and padding -- never on .app's padding, which is the only thing these values
   drive. The write is additionally guarded on a real change, so a re-derive that measures the same
   bar touches no style at all and the observer cannot chase its own tail.

   THE FALLBACKS STAY IN THE STYLESHEET. styles.css declares --chrome-top/--chrome-bot in both
   media blocks so the app lays out correctly before this runs and with JS off entirely; the inline
   style written here always wins over them. They are the last two constants in the system, so
   test/chrome_metrics.cjs checks them against the measured truth rather than trusting them -- but
   for CLOSENESS, not equality. A hardcoded fallback cannot equal a measurement that carries a
   font-metric term on more than one platform, which is this file's own thesis turned on the check
   that guards it: `.mockcta` measures 72px here and 69px on Linux, because one button's line box
   clears the 44px tap floor on one platform and is clamped by it on the other.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var root = document.documentElement;
  var seg = null, bar = null, hmTop = null, hmBot = null, hmStatus = null;
  var lastTop = null, lastBot = null;

  /* How much of the viewport this bar takes away from the content. See the header: only a fixed,
     rendered bar takes anything. */
  function stolen(el) {
    if (!el || !el.getClientRects().length) return 0;
    var cs = window.getComputedStyle(el);
    if (cs.position !== 'fixed') return 0;
    return Math.ceil(el.getBoundingClientRect().height);
  }

  /* TWO PAIRS OF BARS, ONE SUM, NO ROUTE CONDITIONAL  (appeal/home-instrument).
     The home joined the shell and brought its own fixed phone chrome: a top bar (.hm-rail on
     the phone) and a bottom tab bar (.hm-tabs). Exactly one pair is ever rendered -- the route
     hides the other with display:none -- and stolen() already returns 0 for a bar that is not
     rendered or not fixed, which the header calls out by name for "the #home route". So the
     answer is the SUM, and this module needs to know nothing about routes: adding a branch here
     would put a second source of truth about which route is live next to the one in the
     stylesheet, and they would drift. */
  function derive() {
    if (!seg) seg = document.querySelector('.sidebar .seg');
    if (!bar) bar = document.querySelector('.sidebar .mockcta');
    if (!hmTop) hmTop = document.querySelector('.sidebar .hm-rail');
    if (!hmBot) hmBot = document.querySelector('.sidebar .hm-tabs');
    if (!hmStatus) hmStatus = document.querySelector('.hm-status');
    /* THE CENSUS IS BOTTOM CHROME TOO. It is position:fixed at the frame's foot on the home, so
       by this module's own definition it steals from the bottom of the viewport -- and the
       floating scroll-top disc has to dodge it exactly as it dodges the phone's tab bar. Adding
       it here is what let the disc go back to tracking a MEASURED value instead of the constant
       that stopped listening on the phone. On a topic route it is display:none and stolen()
       returns 0, so nothing about the topic routes changes. */
    var t = stolen(seg) + stolen(hmTop), b = stolen(bar) + stolen(hmBot) + stolen(hmStatus);
    if (t === lastTop && b === lastBot) return;   /* nothing moved -- touch no style */
    lastTop = t; lastBot = b;
    root.style.setProperty('--chrome-top', t + 'px');
    root.style.setProperty('--chrome-bot', b + 'px');
  }

  function start() {
    seg = document.querySelector('.sidebar .seg');
    bar = document.querySelector('.sidebar .mockcta');
    hmTop = document.querySelector('.sidebar .hm-rail');
    hmBot = document.querySelector('.sidebar .hm-tabs');
    hmStatus = document.querySelector('.hm-status');
    if (!seg && !bar && !hmTop && !hmBot && !hmStatus) return;   /* not this document */
    derive();
    try {
      var ro = new ResizeObserver(derive);
      /* box:'border-box' IS LOAD-BEARING, and the first draft of this file got it wrong.
         A ResizeObserver defaults to the CONTENT box -- and every one of these bars is sized by
         a 44px tap floor inside padding and a border, so the content box is 44px in BOTH
         orientations and does not move when the bar does. Measured on that draft: forcing
         .seg{padding-top:20px} took the bar 61 -> 73 and the observer never fired, leaving
         --chrome-top at 61 and .app reserving 12px too little -- i.e. the re-derive could not see
         the exact mechanism it was written for (the short-viewport block re-pads .seg 8px -> 3px).
         It appeared to work only because an orientation change also changes the bar's WIDTH,
         which the content box does report. Border-box is what getBoundingClientRect measures and
         what the padding actually lands in, so that is what this watches. */
      if (seg) ro.observe(seg, { box: 'border-box' });
      if (bar) ro.observe(bar, { box: 'border-box' });
      /* the home pair is watched on the same terms -- a route change flips both pairs between
         rendered and display:none, and a ResizeObserver reports that as a size change to 0 */
      if (hmTop) ro.observe(hmTop, { box: 'border-box' });
      if (hmBot) ro.observe(hmBot, { box: 'border-box' });
      if (hmStatus) ro.observe(hmStatus, { box: 'border-box' });
    } catch (e) {
      /* No ResizeObserver: fall back to the events that at least catch the orientation and
         zoom cases. Strictly weaker -- a font-driven reflow at a steady viewport is missed --
         but a stale value here degrades to the hand-tuned constants, not to nothing. */
      window.addEventListener('resize', derive);
      window.addEventListener('orientationchange', derive);
    }
    /* The fixed -> static flip at 920px, which a ResizeObserver can miss (see header). */
    try {
      var mq = window.matchMedia('(max-width:919px)');
      if (mq.addEventListener) mq.addEventListener('change', derive);
      else if (mq.addListener) mq.addListener(derive);
    } catch (e) {}
  }

  /* Runs from the app's script block at the end of <body>, so the bars are parsed. The guard is
     for any other host that loads this earlier. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  /* The check drives this directly to prove the re-derive fires -- and to prove it is the LIVE
     bar being read rather than a value cached at boot. */
  window.ChromeMetrics = {
    derive: derive,
    read: function () { return { top: lastTop, bot: lastBot }; },
  };
})();
