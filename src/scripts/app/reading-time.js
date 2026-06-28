/* ===== ReadingTime =====
   Displays estimated reading time per module.
   Features:
   - Counts words in active pane's text content
   - Assumes 200 words/min reading speed
   - Shows "X min read" badge near the header
   - Updates on view change
   - Uses ARIA live region for screen readers
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  var WPM = 200;
  var badgeEl = null;

  function createBadge() {
    if (badgeEl) return;
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;
    badgeEl = document.createElement('span');
    badgeEl.id = '_reading-time';
    badgeEl.setAttribute('aria-live', 'polite');
    badgeEl.style.cssText = 'display:inline-block;font-size:10px;font-weight:700;letter-spacing:.5px;color:var(--mut);background:rgba(83,74,183,.04);padding:3px 10px;border-radius:6px;margin-left:8px;vertical-align:middle;transition:opacity .2s ease';
    // Insert after h1
    var h1 = hdr.querySelector('h1');
    if (h1 && h1.nextSibling) {
      h1.parentNode.insertBefore(badgeEl, h1.nextSibling);
    } else if (h1) {
      h1.parentNode.appendChild(badgeEl);
    }
  }

  function estimate(pane) {
    if (!pane) return 0;
    var text = pane.textContent || '';
    var words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / WPM));
  }

  function update() {
    var pane = document.querySelector('.pane.on');
    if (!pane) return;
    var minutes = estimate(pane);
    if (!badgeEl) createBadge();
    if (badgeEl) {
      badgeEl.textContent = minutes + ' min read';
      badgeEl.style.opacity = '1';
    }
  }

  // Update on view change
  document.addEventListener('routechange', function () {
    if (badgeEl) badgeEl.style.opacity = '0';
    setTimeout(update, 400);
  });

  // Initial estimate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(update, 1500); });
  } else {
    setTimeout(update, 1500);
  }
})();
