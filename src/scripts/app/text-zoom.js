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

  function apply() {
    if (!stage) stage = document.querySelector('.stage');
    if (stage) stage.style.setProperty('--read-zoom', String(LEVELS[idx]));
    if (decBtn) decBtn.disabled = (idx === 0);
    if (incBtn) incBtn.disabled = (idx === LEVELS.length - 1);
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
