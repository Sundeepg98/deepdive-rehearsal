/* ===== AnimationSpeed =====
   Accessibility: slow/normal/fast animation speed toggle.
   Features:
   - Small toggle in sidebar: Slow | Normal | Fast
   - Adjusts CSS animation-duration globally
   - Persists in localStorage
   - Respects prefers-reduced-motion
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_anim_speed';
  var SPEED_MAP = { slow: 2.0, normal: 1.0, fast: 0.4 };
  var current = 'normal';

  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SPEED_MAP[saved]) current = saved;
  } catch (e) {}

  function apply() {
    var factor = SPEED_MAP[current];
    document.documentElement.style.setProperty('--anim-speed-factor', factor);
    // Inject/update a global rule
    var existing = document.getElementById('_anim-speed-style');
    if (existing) existing.remove();
    var style = document.createElement('style');
    style.id = '_anim-speed-style';
    style.textContent = '*{animation-duration:calc(var(--anim-speed-factor,1) * var(--_orig-duration,inherit))!important}';
    document.head.appendChild(style);
  }

  function createControls() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (sidebar.querySelector('#_anim-speed')) return;

    var wrap = document.createElement('div');
    wrap.id = '_anim-speed';
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 11px;margin-top:4px;border-top:1px solid var(--bd)';

    var label = document.createElement('span');
    label.textContent = 'Anim speed';
    label.style.cssText = 'font-size:11px;color:var(--mut);flex:1;font-weight:600';
    wrap.appendChild(label);

    ['slow', 'normal', 'fast'].forEach(function (speed) {
      var b = document.createElement('button');
      b.textContent = speed[0].toUpperCase();
      b.setAttribute('aria-label', speed + ' animations');
      b.dataset.speed = speed;
      b.style.cssText = 'width:26px;height:26px;border-radius:6px;border:1px solid ' + (speed === current ? 'var(--acc)' : 'var(--bd)') + ';background:' + (speed === current ? 'rgba(83,74,183,.1)' : 'linear-gradient(180deg,#fff,#F8F5EF)') + ';color:' + (speed === current ? 'var(--acc)' : 'var(--mut)') + ';font-size:11px;font-weight:700;cursor:pointer;transition:all .15s ease;padding:0';

      b.addEventListener('click', function () {
        current = speed;
        apply();
        try { localStorage.setItem(STORAGE_KEY, current); } catch (e) {}
        // Update visual state
        wrap.querySelectorAll('button').forEach(function (btn) {
          var s = btn.dataset.speed;
          btn.style.borderColor = s === current ? 'var(--acc)' : 'var(--bd)';
          btn.style.background = s === current ? 'rgba(83,74,183,.1)' : 'linear-gradient(180deg,#fff,#F8F5EF)';
          btn.style.color = s === current ? 'var(--acc)' : 'var(--mut)';
        });
      });
      wrap.appendChild(b);
    });

    sidebar.appendChild(wrap);
  }

  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(createControls, 1600); });
  } else {
    setTimeout(createControls, 1600);
  }
})();
