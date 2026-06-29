/* ===== SelectionAPI =====
   Enhances text selection with actions.
   Features:
   - Shows floating toolbar on text selection
   - Copy selected text button
   - Search selected text in current module
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var toolbar = null;

  function showToolbar() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.toString().trim().length < 2) {
      hideToolbar();
      return;
    }

    var rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!toolbar) createToolbar();

    toolbar.style.left = (rect.left + rect.width / 2 - 40) + 'px';
    toolbar.style.top = (rect.top - 36) + 'px';
    toolbar.style.opacity = '1';
    toolbar.style.transform = 'translateY(0)';
  }

  function hideToolbar() {
    if (toolbar) {
      toolbar.style.opacity = '0';
      toolbar.style.transform = 'translateY(8px)';
    }
  }

  function createToolbar() {
    toolbar = document.createElement('div');
    toolbar.id = '_selection-toolbar';
    toolbar.style.cssText = 'position:fixed;z-index:300;background:var(--ink);border-radius:8px;padding:4px 8px;display:flex;gap:4px;opacity:0;transform:translateY(8px);transition:all .2s ease;box-shadow:0 4px 16px rgba(0,0,0,.2);pointer-events:auto';

    var copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.style.cssText = 'background:transparent;color:#fff;border:0;font-size:11px;font-weight:600;padding:4px 8px;border-radius:4px;cursor:pointer;transition:background .15s ease';
    copyBtn.addEventListener('click', function () {
      var text = window.getSelection().toString();
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      hideToolbar();
    });
    copyBtn.addEventListener('mouseenter', function () { copyBtn.style.background = 'rgba(255,255,255,.15)'; });
    copyBtn.addEventListener('mouseleave', function () { copyBtn.style.background = 'transparent'; });

    toolbar.appendChild(copyBtn);
    document.body.appendChild(toolbar);
  }

  document.addEventListener('selectionchange', function () {
    clearTimeout(window._selTimeout);
    window._selTimeout = setTimeout(showToolbar, 200);
  });

  document.addEventListener('click', function (e) {
    if (toolbar && !toolbar.contains(e.target)) hideToolbar();
  });
})();
