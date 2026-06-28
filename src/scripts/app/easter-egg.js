/* ===== EasterEgg =====
   Konami code (↑↑↓↓←→←→BA) triggers a fun surprise.
   Features:
   - Classic 10-key sequence detection
   - Rainbow gradient background animation on success
   - Auto-resets after 30 seconds
   - No interference with normal usage
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var CODE = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var pos = 0;
  var active = false;

  document.addEventListener('keydown', function (e) {
    if (e.key === CODE[pos]) {
      pos++;
      if (pos >= CODE.length) {
        pos = 0;
        activate();
      }
    } else {
      pos = 0;
    }
  });

  function activate() {
    if (active) return;
    active = true;
    if (window.showToast) window.showToast('Easter egg unlocked!', 'success');

    var overlay = document.createElement('div');
    overlay.id = '_easter-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:400;pointer-events:none;opacity:0;transition:opacity .5s ease;background:linear-gradient(45deg,#534AB7,#6D5FD6,#0F6E56,#9A5B0B,#A32D2D,#AA9DF5);background-size:400% 400%;animation:rainbowShift 6s ease infinite;mix-blend-mode:overlay';

    if (!document.getElementById('_easter-style')) {
      var style = document.createElement('style');
      style.id = '_easter-style';
      style.textContent = '@keyframes rainbowShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}';
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.style.opacity = '0.12'; });

    setTimeout(function () {
      overlay.style.opacity = '0';
      setTimeout(function () { overlay.remove(); active = false; }, 500);
    }, 30000);
  }
})();
