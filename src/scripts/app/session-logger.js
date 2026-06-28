/* ===== SessionLogger =====
   Tracks study session history.
   Features:
   - Logs each module visit with timestamp
   - Shows "Recently viewed" in sidebar
   - Session duration tracking
   - Persisted in localStorage
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_session_log';
  var MAX_RECENT = 5;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function save(log) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(-50))); } catch (e) {}
  }

  function getLabel(viewId) {
    var labels = {walk:'Walkthrough',drill:'Drill',wb:'Whiteboard',sys:'System Map',
                  trade:'Trade-offs',model:'Model Answers',num:'Numbers',rf:'Red Flags',open:'30-Second'};
    return labels[viewId] || viewId;
  }

  function render(log) {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    var existing = document.getElementById('_recent-views');
    if (existing) existing.remove();

    if (log.length === 0) return;

    var wrap = document.createElement('div');
    wrap.id = '_recent-views';
    wrap.style.cssText = 'padding:8px 11px;margin-top:4px;border-top:1px solid var(--bd)';

    var title = document.createElement('div');
    title.textContent = 'Recent';
    title.style.cssText = 'font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--mut);margin-bottom:4px';
    wrap.appendChild(title);

    // Get unique recent views (most recent first)
    var seen = new Set();
    var recent = [];
    for (var i = log.length - 1; i >= 0 && recent.length < MAX_RECENT; i--) {
      var v = log[i].view;
      if (!seen.has(v)) { seen.add(v); recent.push(v); }
    }

    recent.forEach(function (v) {
      var row = document.createElement('div');
      row.textContent = getLabel(v);
      row.style.cssText = 'font-size:11px;color:var(--ink);padding:3px 0;cursor:pointer;transition:color .15s ease';
      row.addEventListener('mouseenter', function () { row.style.color = 'var(--acc)'; });
      row.addEventListener('mouseleave', function () { row.style.color = 'var(--ink)'; });
      row.addEventListener('click', function () {
        if (window.Router) window.Router.navigate(v);
      });
      wrap.appendChild(row);
    });

    sidebar.appendChild(wrap);
  }

  var log = load();
  render(log);

  document.addEventListener('routechange', function (e) {
    var view = e.detail && e.detail.view ? e.detail.view : '';
    if (!view) return;
    log.push({ view: view, time: Date.now() });
    save(log);
    render(log);
  });
})();
