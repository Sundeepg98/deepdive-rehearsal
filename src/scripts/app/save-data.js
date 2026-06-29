/* ===== SaveData =====
   Detects data saver mode and reduces animations.
   Features:
   - Checks connection.saveData
   - Adds .save-data class to body
   - CSS can reduce animations when active
   Usage: Auto-initializes.
*/
(function () {
  'use strict';
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return;

  function check() {
    if (conn.saveData) {
      document.body.classList.add('save-data');
      document.documentElement.style.setProperty('--anim-intensity', '0.3');
    } else {
      document.body.classList.remove('save-data');
      document.documentElement.style.removeProperty('--anim-intensity');
    }
  }

  check();
  if (conn.addEventListener) conn.addEventListener('change', check);
})();
