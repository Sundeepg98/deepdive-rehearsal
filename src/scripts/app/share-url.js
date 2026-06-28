/* ===== ShareUrl =====
   Copies the current module's deep-link URL to clipboard.
   Features:
   - Small "Share" button near the header
   - Copies window.location.href with current hash
   - Shows "Link copied!" feedback for 2 seconds
   - Uses modern Clipboard API with fallback
   - Updates text on route change
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  var btnEl = null;

  function createButton() {
    if (btnEl) return;
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;
    btnEl = document.createElement('button');
    btnEl.id = '_share-url-btn';
    btnEl.setAttribute('aria-label', 'Copy page link');
    btnEl.textContent = 'Share';
    btnEl.style.cssText = 'display:inline-block;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--mut);background:rgba(83,74,183,.04);border:1px solid rgba(83,74,183,.12);padding:4px 12px;border-radius:8px;cursor:pointer;margin-left:8px;transition:all .2s ease;vertical-align:middle';

    btnEl.addEventListener('click', function () {
      var url = window.location.href;
      var copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { copied = true; }).catch(function () {});
      }
      if (!copied) {
        try {
          var ta = document.createElement('textarea');
          ta.value = url;
          ta.style.cssText = 'position:fixed;left:-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (e) {}
      }
      btnEl.textContent = 'Link copied!';
      btnEl.style.background = 'rgba(83,74,183,.1)';
      btnEl.style.color = 'var(--acc)';
      setTimeout(function () {
        btnEl.textContent = 'Share';
        btnEl.style.background = 'rgba(83,74,183,.04)';
        btnEl.style.color = 'var(--mut)';
      }, 2000);
    });

    var h1 = hdr.querySelector('h1');
    if (h1 && h1.nextSibling) {
      h1.parentNode.insertBefore(btnEl, h1.nextSibling);
    } else if (h1) {
      h1.parentNode.appendChild(btnEl);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(createButton, 1300); });
  } else {
    setTimeout(createButton, 1300);
  }
})();
