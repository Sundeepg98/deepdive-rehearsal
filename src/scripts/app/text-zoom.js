/* ===== TextZoom =====
   A- / A+ reading-size control in the sidebar. Scales the work-surface views
   across 5 levels (85% - 116%, default 100%) by setting a --read-zoom custom
   property that drives `zoom` on each .pane.

   zoom (not font-size) is used on purpose: the views are shadow-DOM components
   with fixed-px type, which a light-DOM font-size cannot reach. zoom magnifies
   AND reflows across the shadow boundary, and because each .pane is a normal
   block inside .stage it reflows to fit -- no horizontal clipping.

   The level persists per browser via Store (default 100%) so a reader's chosen
   size survives reloads and travels with an exported backup. It stays out of the
   portable CPR1 session code (that is a session-stats snapshot, not preferences).
   Reduced motion is handled globally (the app's reduced-motion rule neutralises
   transitions); zoom itself applies instantly.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var LEVELS = [0.85, 0.92, 1.0, 1.08, 1.16];
  var KEY = 'ui.textzoom';
  var idx = 2; /* default 100%, persisted per browser */
  try { var _sv = (typeof Store !== 'undefined' && Store.get) ? Store.get(KEY, null) : null; if (typeof _sv === 'number' && _sv >= 0 && _sv < LEVELS.length) idx = _sv; } catch (e) {}
  var stage = null, decBtn = null, incBtn = null;

  /* aria-disabled, NOT disabled (audit P3-7). A `disabled` button is removed from the tab sequence
     entirely, so at either end of the range the control SILENTLY VANISHED from under a keyboard
     user's fingers -- they tab to "A+", press it to the ceiling, and the next Tab has moved
     somewhere else with nothing said. aria-disabled keeps it focusable and announced as unavailable,
     which is the honest state: the button is still there, it just has nowhere further to go. The
     click handler is already a no-op at the bounds (Math.min/Math.max clamp), so nothing needs to
     guard the press; and .textzoom-btn[disabled] in styles.css becomes [aria-disabled] so the dimmed
     look is unchanged. */
  function setLimit(btn, atLimit) {
    if (!btn) return;
    btn.disabled = false;
    if (atLimit) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  }
  function apply() {
    if (!stage) stage = document.querySelector('.stage');
    if (stage) stage.style.setProperty('--read-zoom', String(LEVELS[idx]));
    setLimit(decBtn, idx === 0);
    setLimit(incBtn, idx === LEVELS.length - 1);
  }
  /* SPEAK THE RESULT (audit P3-7). Eight presses produced ZERO live-region utterances: the control
     changed the reading size of the whole work surface and said nothing, and there is no
     aria-valuenow/valuetext to read either, so a screen-reader user pressing A+ had no way to know
     whether anything happened -- or that they had hit the ceiling. ViewManager.announce is the app's
     own announcer (the same polite region the pane switch and the drill grade speak through); this
     is a discrete, user-initiated action, so unlike the dock's CTA it cannot collide with a burst on
     the same microtask and needs no dedicated region. The percentage is the number the user is
     actually changing, and the bound is named when it is reached, because "nothing happened" and
     "you are at the largest size" are different facts. */
  function announce() {
    try {
      if (!(window.ViewManager && ViewManager.announce)) return;
      var pct = Math.round(LEVELS[idx] * 100);
      var bound = (idx === LEVELS.length - 1) ? ', largest' : (idx === 0 ? ', smallest' : '');
      ViewManager.announce('Text size ' + pct + '%' + bound);
    } catch (e) {}
  }

  function makeBtn(txt, aria, step) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'textzoom-btn';
    b.textContent = txt;
    b.setAttribute('aria-label', aria);
    b.addEventListener('click', function () {
      idx = Math.min(LEVELS.length - 1, Math.max(0, idx + step));
      apply();
      announce();
      try { if (typeof Store !== 'undefined' && Store.set) Store.set(KEY, idx); } catch (e) {}
    });
    return b;
  }

  function build() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.getElementById('textzoom')) return;
    /* Anchor on .seg, not .mockbar. This widget paints BETWEEN the mock CTA and the pane
       switcher, and it held that spot only because .mockbar carried `order:2` -- with the
       sidebar's `order` gone (it desynced tab order from paint: WCAG 2.4.3, see styles.css),
       DOM position IS paint position, so inserting before .seg is what keeps this above the
       switcher. Inserting before .mockbar would now drop it BELOW the switcher. */
    var anchor = sidebar.querySelector('.seg');

    var wrap = document.createElement('div');
    wrap.id = 'textzoom';
    wrap.className = 'textzoom';

    var label = document.createElement('span');
    label.className = 'textzoom-lbl';
    label.textContent = 'Text size';

    decBtn = makeBtn('A\u2212', 'Decrease text size', -1);
    incBtn = makeBtn('A+', 'Increase text size', 1);

    wrap.appendChild(label);
    wrap.appendChild(decBtn);
    wrap.appendChild(incBtn);
    sidebar.insertBefore(wrap, anchor || null);
    apply();
  }

  build();
})();
