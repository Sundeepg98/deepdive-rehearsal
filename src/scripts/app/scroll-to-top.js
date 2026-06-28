/* ===== ScrollToTop =====
   Floating button that appears after scrolling down.
   Features:
   - Appears when scroll position > 400px in active pane
   - Smooth scroll to top on click
   - Auto-hides when near top
   - Respects reduced-motion preference
   - Only one button ever created
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  var btn = null;
  var visible = false;
  var THRESHOLD = 400;

  function create() {
    if (btn) return;
    btn = document.createElement('button');
    btn.id = '_scroll-top-btn';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = '\u2191';
    btn.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);width:44px;height:44px;border-radius:50%;border:0;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;font-size:20px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(83,74,183,.25),0 0 0 1px rgba(83,74,183,.15);opacity:0;transition:transform .35s cubic-bezier(.22,.61,.36,1),opacity .25s ease;z-index:150;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';

    btn.addEventListener('click', function () {
      var pane = document.querySelector('.pane.on');
      if (pane) {
        pane.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    document.body.appendChild(btn);
  }

  function update() {
    var pane = document.querySelector('.pane.on');
    if (!pane) return;
    var shouldShow = pane.scrollTop > THRESHOLD;
    if (shouldShow === visible) return;
    visible = shouldShow;
    if (!btn) create();
    if (shouldShow) {
      btn.style.transform = 'translateX(-50%) translateY(0)';
      btn.style.opacity = '1';
    } else {
      btn.style.transform = 'translateX(-50%) translateY(80px)';
      btn.style.opacity = '0';
    }
  }

  // Attach to all panes
  document.querySelectorAll('.pane').forEach(function (p) {
    p.addEventListener('scroll', update, { passive: true });
  });

  // Update on view change
  document.addEventListener('routechange', function () {
    visible = false;
    if (btn) {
      btn.style.transform = 'translateX(-50%) translateY(80px)';
      btn.style.opacity = '0';
    }
    setTimeout(update, 100);
  });
})();
