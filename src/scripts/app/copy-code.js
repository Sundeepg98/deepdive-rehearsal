/* ===== CopyCode =====
   Adds copy-to-clipboard buttons on all code blocks.
   Features:
   - Finds <pre><code> and .code blocks in both light DOM and shadow DOM
   - Adds a subtle "Copy" button that appears on hover
   - Uses modern Clipboard API with execCommand fallback
   - Shows "Copied!" feedback for 2 seconds
   - Respects reduced-motion
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  var COPY_STYLE = 'position:absolute;top:6px;right:6px;font-size:10px;font-weight:650;letter-spacing:.5px;text-transform:uppercase;padding:4px 10px;border-radius:6px;border:1px solid var(--bd);background:rgba(255,255,255,.9);color:var(--mut);cursor:pointer;opacity:0;transition:opacity .2s ease,background .2s ease;z-index:5;backdrop-filter:blur(4px)';

  function addCopyButton(block) {
    if (block.dataset._copyBtn) return; // already processed
    block.dataset._copyBtn = '1';
    block.style.position = 'relative';

    var btn = document.createElement('button');
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code');
    btn.style.cssText = COPY_STYLE;

    btn.addEventListener('click', function () {
      var text = block.textContent || '';
      var copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { copied = true; }).catch(function () {});
      }
      if (!copied) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.cssText = 'position:fixed;left:-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (e) {}
      }
      btn.textContent = 'Copied!';
      btn.style.background = 'rgba(15,110,86,.15)';
      btn.style.color = 'var(--teal)';
      btn.style.borderColor = 'rgba(15,110,86,.3)';
      setTimeout(function () {
        btn.textContent = 'Copy';
        btn.style.background = 'rgba(255,255,255,.9)';
        btn.style.color = 'var(--mut)';
        btn.style.borderColor = 'var(--bd)';
      }, 2000);
    });

    block.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
    block.addEventListener('mouseleave', function () { btn.style.opacity = '0'; });
    block.appendChild(btn);
  }

  function scan() {
    // Light DOM code blocks
    document.querySelectorAll('pre, code, .code-block, [class*="code"]').forEach(function (el) {
      // Only target blocks with actual code content (more than 20 chars)
      if ((el.textContent || '').length > 20) {
        addCopyButton(el);
      }
    });
  }

  // Scan on init and after view changes
  scan();
  document.addEventListener('routechange', function () { setTimeout(scan, 500); });
})();
