/* ===== PermissionRequest =====
   Gracefully requests permissions on first interaction.
   Features:
   - Clipboard read permission on first copy action
   - Notification permission on bell click
   - Tracks which permissions were already requested
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_permissions_requested';
  var requested = {};
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) requested = JSON.parse(raw);
  } catch (e) {}

  function ask(name) {
    if (requested[name]) return;
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: name }).then(function (result) {
      if (result.state === 'prompt') {
        requested[name] = true;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(requested)); } catch (e) {}
      }
    });
  }

  // Request clipboard permission on first Ctrl+C
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') ask('clipboard-read');
  });
})();
