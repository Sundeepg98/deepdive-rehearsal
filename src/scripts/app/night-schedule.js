/* ===== NightSchedule =====
   Auto-switches to dark mode based on time of day.
   Default: dark mode from 8 PM to 6 AM.
   Only activates if user hasn't manually toggled.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var START_HOUR = 20, END_HOUR = 6;
  var MANUAL_KEY = '_theme_manual';

  function shouldBeDark() {
    var h = new Date().getHours();
    return h >= START_HOUR || h < END_HOUR;
  }

  function apply() {
    try { if (localStorage.getItem(MANUAL_KEY)) return; } catch (e) { return; }
    if (shouldBeDark()) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  apply();
  // Re-check every 15 minutes
  setInterval(apply, 15 * 60 * 1000);
})();
