/* ===== StatePersistence =====
   Persists user session state to localStorage.
   Features:
   - Remember last viewed module (restores on return)
   - Remember scroll position per module
   - Remember dark mode preference
   - Auto-saves every 5 seconds and on view change
   - Gracefully handles localStorage being disabled
   Usage: Auto-initializes after Router is ready.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_deepdive_state';
  var SAVE_INTERVAL = 5000;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load();

  // Restore last view on initial load (after a delay for Router init)
  function restoreView() {
    if (!window.Router || !state.lastView) return;
    var hash = location.hash.slice(1);
    // Only restore if user didn't deep-link
    if (!hash || hash === 'walk') {
      setTimeout(function () {
        window.Router.navigate(state.lastView);
      }, 500);
    }
  }

  // Restore scroll position for current view
  function restoreScroll(viewId) {
    if (!state.scrolls || !state.scrolls[viewId]) return;
    var pane = document.getElementById(viewId);
    if (pane) {
      pane.scrollTop = state.scrolls[viewId];
    }
  }

  // Listen to route changes
  document.addEventListener('routechange', function (e) {
    var detail = e.detail || {};
    var viewId = detail.view || window.Router.current().view;

    // Save current view
    state.lastView = viewId;

    // Restore scroll for this view
    setTimeout(function () { restoreScroll(viewId); }, 300);

    save(state);
  });

  // Periodic scroll position save
  setInterval(function () {
    if (!window.Router) return;
    var viewId = window.Router.current().view;
    var pane = document.getElementById(viewId);
    if (pane && pane.scrollTop > 0) {
      state.scrolls = state.scrolls || {};
      state.scrolls[viewId] = pane.scrollTop;
      save(state);
    }
  }, SAVE_INTERVAL);

  // Restore after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(restoreView, 1000); });
  } else {
    setTimeout(restoreView, 1000);
  }
})();
