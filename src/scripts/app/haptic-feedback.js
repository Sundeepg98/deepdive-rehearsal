/* ===== HapticFeedback =====
   Vibration feedback on button clicks (mobile).
   Features:
   - 15ms micro-vibration on all button clicks
   - Only on devices with vibration support
   - Respects reduced-motion preference
   Usage: Auto-initializes.
*/
(function () {
  'use strict';
  if (!navigator.vibrate) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('click', function (e) {
    if (e.target.closest('button')) {
      navigator.vibrate(15);
    }
  });
})();
