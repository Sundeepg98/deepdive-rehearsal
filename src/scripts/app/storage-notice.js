/* ===== scripts/app/storage-notice.js =====
   A dismissible banner shown ONLY when persistence is degraded (private/incognito
   mode, storage disabled, or quota full). Without it, saves silently fall back to
   memory and the user's work vanishes on reload with no warning. The banner says so
   plainly and offers an immediate Export so nothing is lost. Offline-safe. */
(function () {
  var dismissed = false, shown = false;
  function show() {
    if (shown || dismissed) return;
    if (!(typeof Store !== 'undefined' && Store.degraded && Store.degraded())) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', show); return; }
    shown = true;
    var bar = document.createElement('div');
    bar.className = 'storage-notice'; bar.setAttribute('role', 'status'); bar.style.zIndex = '2000';
    bar.innerHTML = '<span class="storage-notice-t">This browser isn\u2019t saving your progress \u2014 private mode or storage is full, so your work will be lost on reload.</span>' +
      '<button type="button" class="storage-notice-exp">Export a backup</button>' +
      '<button type="button" class="storage-notice-x" aria-label="Dismiss this notice">&#215;</button>';
    document.body.appendChild(bar);
    bar.querySelector('.storage-notice-exp').addEventListener('click', function () { if (window.IndexOverlay && IndexOverlay.exportBackup) IndexOverlay.exportBackup(); });
    bar.querySelector('.storage-notice-x').addEventListener('click', function () { dismissed = true; if (bar.parentNode) bar.parentNode.removeChild(bar); });
  }
  window.addEventListener('storagedegraded', show);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
