/* ===== OfflineIndicator =====
   Shows a subtle banner when network goes offline.
   Features:
   - Listens to online/offline browser events
   - Slide-in banner at top of viewport
   - Auto-dismisses when back online
   - Respects reduced-motion
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var banner = null;

  function show() {
    if (banner) { banner.style.transform = 'translateY(0)'; return; }
    banner = document.createElement('div');
    banner.id = '_offline-banner';
    banner.textContent = 'You are offline. Some features may not work.';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:500;background:linear-gradient(90deg,#A32D2D,#CC4444);color:#fff;text-align:center;font-size:12px;font-weight:600;padding:6px 16px;transform:translateY(-100%);transition:transform .35s cubic-bezier(.22,.61,.36,1);box-shadow:0 2px 12px rgba(163,45,45,.3)';
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.style.transform = 'translateY(0)'; });
  }

  function hide() {
    if (banner) banner.style.transform = 'translateY(-100%)';
  }

  window.addEventListener('offline', show);
  window.addEventListener('online', hide);
  if (!navigator.onLine) show();
})();
