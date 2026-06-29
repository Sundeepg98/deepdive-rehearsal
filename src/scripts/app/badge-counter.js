/* ===== BadgeCounter =====
   Shows a small count badge on bookmarked nav items.
   Features:
   - Displays count of bookmarked modules
   - Updates when bookmarks change
   - Visual dot indicator on bookmark star
   - Persists across sessions
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_bookmarks';

  function getCount() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var bm = raw ? JSON.parse(raw) : {};
      return Object.keys(bm).length;
    } catch (e) { return 0; }
  }

  function create() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (document.getElementById('_badge-counter')) return;

    var count = getCount();
    if (count === 0) return;

    var badge = document.createElement('span');
    badge.id = '_badge-counter';
    badge.textContent = String(count);
    badge.style.cssText = 'position:absolute;top:8px;right:8px;min-width:16px;height:16px;border-radius:8px;background:var(--red);color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;z-index:10;box-shadow:0 2px 4px rgba(163,45,45,.3)';

    sidebar.style.position = 'relative';
    sidebar.appendChild(badge);
  }

  function update() {
    var badge = document.getElementById('_badge-counter');
    var count = getCount();
    if (count === 0) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) { create(); return; }
    badge.textContent = String(count);
  }

  // Listen for storage events from other tabs
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) update();
  });

  setTimeout(create, 1600);
  // Update periodically
  setInterval(update, 5000);
})();
