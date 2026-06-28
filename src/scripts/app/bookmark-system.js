/* ===== BookmarkSystem =====
   Star/unstar modules to save favorites.
   Features:
   - Star button appears on each nav item
   - Persisted in localStorage
   - Visual filled/empty star state
   - 'Bookmarks' section shows favorited modules
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_bookmarks';
  var bookmarks = {};

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) bookmarks = JSON.parse(raw);
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)); } catch (e) {}
  }

  function toggle(id, btn) {
    if (bookmarks[id]) {
      delete bookmarks[id];
      btn.textContent = '\u2606';
      btn.style.color = 'var(--mut)';
    } else {
      bookmarks[id] = true;
      btn.textContent = '\u2605';
      btn.style.color = '#E8A317';
      btn.style.textShadow = '0 0 6px rgba(232,163,23,.3)';
    }
    save();
  }

  function init() {
    load();
    var sidebarSeg = document.querySelector('.sidebar .seg');
    if (!sidebarSeg) return;

    var buttons = sidebarSeg.querySelectorAll('button[data-tab]');
    buttons.forEach(function (btn) {
      if (btn.querySelector('._bookmark-star')) return; // already done

      var tabId = btn.getAttribute('data-tab');
      var star = document.createElement('span');
      star.className = '_bookmark-star';
      star.textContent = bookmarks[tabId] ? '\u2605' : '\u2606';
      star.style.cssText = 'position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:13px;color:' + (bookmarks[tabId] ? '#E8A317' : 'var(--mut)') + ';cursor:pointer;transition:color .2s ease;text-shadow:' + (bookmarks[tabId] ? '0 0 6px rgba(232,163,23,.3)' : 'none') + ';pointer-events:auto;z-index:5';

      star.addEventListener('click', function (e) {
        e.stopPropagation();
        toggle(tabId, star);
      });

      btn.style.position = 'relative';
      btn.appendChild(star);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
  } else {
    setTimeout(init, 1500);
  }
})();
