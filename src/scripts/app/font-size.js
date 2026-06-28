/* ===== FontSize =====
   Accessibility: +/- buttons to adjust text size.
   Features:
   - Two buttons: A- (decrease) and A+ (increase)
   - 5 levels: 85%, 92%, 100%, 108%, 116%
   - Persists preference in localStorage
   - Respects reduced-motion (no transition)
   - Buttons appear in sidebar
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  var LEVELS = [0.85, 0.92, 1.0, 1.08, 1.16];
  var currentIdx = 2; // default = 100%
  var STORAGE_KEY = '_font_size_idx';

  // Load saved preference
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      var parsed = parseInt(saved, 10);
      if (parsed >= 0 && parsed < LEVELS.length) currentIdx = parsed;
    }
  } catch (e) {}

  function apply() {
    var stage = document.querySelector('.stage');
    if (!stage) return;
    var scale = LEVELS[currentIdx];
    stage.style.fontSize = (scale * 100) + '%';
    stage.style.transition = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'font-size .2s ease';
  }

  function createControls() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    var wrap = document.createElement('div');
    wrap.id = '_font-size-controls';
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 11px;margin-top:4px;border-top:1px solid var(--bd)';

    var label = document.createElement('span');
    label.textContent = 'Text size';
    label.style.cssText = 'font-size:11px;color:var(--mut);flex:1;font-weight:600';

    function makeBtn(text, action) {
      var b = document.createElement('button');
      b.textContent = text;
      b.style.cssText = 'width:28px;height:28px;border-radius:6px;border:1px solid var(--bd);background:linear-gradient(180deg,#fff,#F8F5EF);color:var(--ink);font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s ease;padding:0;line-height:1';
      b.addEventListener('click', function () {
        action();
        apply();
        try { localStorage.setItem(STORAGE_KEY, String(currentIdx)); } catch (e) {}
      });
      b.addEventListener('mouseenter', function () { b.style.borderColor = 'var(--acc)'; b.style.boxShadow = '0 0 0 2px rgba(83,74,183,.1)'; });
      b.addEventListener('mouseleave', function () { b.style.borderColor = 'var(--bd)'; b.style.boxShadow = 'none'; });
      return b;
    }

    var dec = makeBtn('A\u2212', function () { if (currentIdx > 0) currentIdx--; });
    var inc = makeBtn('A+', function () { if (currentIdx < LEVELS.length - 1) currentIdx++; });

    wrap.appendChild(label);
    wrap.appendChild(dec);
    wrap.appendChild(inc);
    sidebar.appendChild(wrap);
  }

  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(createControls, 1400); });
  } else {
    setTimeout(createControls, 1400);
  }
})();
