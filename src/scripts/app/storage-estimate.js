/* ===== StorageEstimate =====
   Shows storage usage in sidebar footer.
   Features:
   - Uses navigator.storage.estimate()
   - Shows used / quota in MB
   - Warning when >80% full
   Usage: Auto-initializes.
*/
(function () {
  'use strict';
  if (!navigator.storage || !navigator.storage.estimate) return;

  async function show() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (document.getElementById('_storage-est')) return;

    var est = await navigator.storage.estimate();
    var used = est.usage || 0;
    var quota = est.quota || 1;
    var pct = Math.round((used / quota) * 100);
    var usedMB = Math.round(used / 1048576);

    var wrap = document.createElement('div');
    wrap.id = '_storage-est';
    wrap.style.cssText = 'padding:6px 11px;font-size:9px;color:var(--mut);border-top:1px solid var(--bd)';
    wrap.textContent = 'Storage: ' + usedMB + ' MB used';
    if (pct > 80) wrap.style.color = 'var(--red)';

    sidebar.appendChild(wrap);
  }

  setTimeout(show, 2000);
})();
