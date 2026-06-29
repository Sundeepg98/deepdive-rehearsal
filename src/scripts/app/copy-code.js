/* ===== CopyCode =====
   Adds a hover "Copy" button to light-DOM code blocks.
   - Uses the synchronous document.execCommand('copy') path only, so there is
     NO clipboard-permission prompt and nothing is requested at runtime
     (offline-safe; the async permission-scoped clipboard API is avoided).
   - Shows "Copied!" feedback briefly.

   Note: most rehearsal content lives inside component shadow roots; this scans
   the light DOM, so it is a no-op where there are no light-DOM code blocks.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var COPY_STYLE = 'position:absolute;top:6px;right:6px;font-size:10px;font-weight:650;letter-spacing:.5px;text-transform:uppercase;padding:4px 10px;border-radius:6px;border:1px solid var(--bd);background:var(--card);color:var(--mut);cursor:pointer;opacity:0;transition:opacity .2s ease,background .2s ease;z-index:5';

  function copyText(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {}
  }

  function addCopyButton(block) {
    if (block.dataset._copyBtn) return;
    block.dataset._copyBtn = '1';
    block.style.position = 'relative';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code');
    btn.style.cssText = COPY_STYLE;

    btn.addEventListener('click', function () {
      copyText(block.textContent || '');
      btn.textContent = 'Copied!';
      btn.style.color = 'var(--teal)';
      btn.style.borderColor = 'rgba(15,110,86,.3)';
      setTimeout(function () {
        btn.textContent = 'Copy';
        btn.style.color = 'var(--mut)';
        btn.style.borderColor = 'var(--bd)';
      }, 2000);
    });

    block.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
    block.addEventListener('mouseleave', function () { btn.style.opacity = '0'; });
    block.appendChild(btn);
  }

  function scan() {
    var blocks = document.querySelectorAll('pre, .code-block');
    for (var i = 0; i < blocks.length; i++) {
      if ((blocks[i].textContent || '').length > 20) addCopyButton(blocks[i]);
    }
  }

  scan();
  document.addEventListener('routechange', function () { setTimeout(scan, 400); });
})();
