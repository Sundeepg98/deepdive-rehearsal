/* ===== TextZoom =====
   A- / A+ reading-size control in the sidebar. Scales the work-surface views
   across 5 levels (85% - 116%, default 100%) by setting a --read-zoom custom
   property that drives `zoom` on each .pane.

   zoom (not font-size) is used on purpose: the views are shadow-DOM components
   with fixed-px type, which a light-DOM font-size cannot reach. zoom magnifies
   AND reflows across the shadow boundary, and because each .pane is a normal
   block inside .stage it reflows to fit -- no horizontal clipping.

   The level is a session-only module variable (default 100%); it is deliberately
   NOT persisted, so it never touches the portable session code or any storage.
   Reduced motion is handled globally (the app's reduced-motion rule neutralises
   transitions); zoom itself applies instantly.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var LEVELS = [0.85, 0.92, 1.0, 1.08, 1.16];
  var idx = 2; /* default 100%; session-only, intentionally not persisted */
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
    });
    return b;
  }

  function build() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.getElementById('textzoom')) return;
    var mockbar = sidebar.querySelector('.mockbar');

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
    sidebar.insertBefore(wrap, mockbar || null);
    apply();
  }

  build();
})();
