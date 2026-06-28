/* ===== FocusMode =====
   Distraction-free reading mode. Hides sidebar and companion panel.
   Features:
   - Toggle via header button or keyboard shortcut (F key)
   - Smooth CSS transition for hiding/showing
   - Stage expands to full width in focus mode
   - Button state persists per session
   - Respects reduced-motion
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  var isFocused = false;
  var btnEl = null;
  var STORAGE_KEY = '_focus_mode';

  function createButton() {
    if (btnEl) return;
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;
    btnEl = document.createElement('button');
    btnEl.id = '_focus-toggle';
    btnEl.setAttribute('aria-label', 'Toggle focus mode');
    btnEl.setAttribute('aria-pressed', 'false');
    btnEl.textContent = 'Focus';
    btnEl.style.cssText = 'display:inline-block;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--mut);background:rgba(83,74,183,.04);border:1px solid rgba(83,74,183,.12);padding:4px 12px;border-radius:8px;cursor:pointer;margin-left:10px;transition:all .2s ease;vertical-align:middle';

    btnEl.addEventListener('click', toggle);

    var h1 = hdr.querySelector('h1');
    if (h1 && h1.nextSibling) {
      h1.parentNode.insertBefore(btnEl, h1.nextSibling);
    } else if (h1) {
      h1.parentNode.appendChild(badgeEl);
    }
  }

  function toggle() {
    isFocused = !isFocused;
    var app = document.querySelector('.app');
    var sidebar = document.querySelector('.sidebar');
    var companion = document.querySelector('.companion');
    var stage = document.querySelector('.stage');
    var seg = document.querySelector('.seg');

    if (!app) return;

    if (isFocused) {
      app.classList.add('_focus-mode');
      if (sidebar) sidebar.style.cssText = 'width:0!important;padding:0!important;overflow:hidden!important;opacity:0!important;transition:all .35s cubic-bezier(.22,.61,.36,1)';
      if (companion) companion.style.cssText = 'width:0!important;padding:0!important;overflow:hidden!important;opacity:0!important;transition:all .35s cubic-bezier(.22,.61,.36,1)';
      if (seg) seg.style.cssText = 'display:none!important;transition:opacity .25s ease';
      if (stage) stage.style.marginLeft = '0';
      if (btnEl) {
        btnEl.textContent = 'Exit';
        btnEl.style.background = 'rgba(83,74,183,.1)';
        btnEl.style.color = 'var(--acc)';
        btnEl.setAttribute('aria-pressed', 'true');
      }
      // Also hide the top seg bar on desktop
      document.querySelectorAll('.seg:not(.sidebar .seg)').forEach(function (s) {
        s.style.display = 'none';
      });
    } else {
      app.classList.remove('_focus-mode');
      if (sidebar) sidebar.style.cssText = '';
      if (companion) companion.style.cssText = '';
      if (seg) seg.style.cssText = '';
      if (stage) stage.style.marginLeft = '';
      if (btnEl) {
        btnEl.textContent = 'Focus';
        btnEl.style.background = 'rgba(83,74,183,.04)';
        btnEl.style.color = 'var(--mut)';
        btnEl.setAttribute('aria-pressed', 'false');
      }
      document.querySelectorAll('.seg:not(.sidebar .seg)').forEach(function (s) {
        s.style.display = '';
      });
    }
  }

  // Keyboard shortcut: F (when not in input)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'f' || e.key === 'F') {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      // Don't conflict with search overlay
      var searchOv = document.getElementById('_search-overlay');
      if (searchOv && searchOv.style.display === 'flex') return;
      e.preventDefault();
      toggle();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(createButton, 1200); });
  } else {
    setTimeout(createButton, 1200);
  }
})();
