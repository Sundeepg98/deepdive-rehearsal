/* ===== DoubleTap =====
   Double-tap on content to trigger bookmark/star.
   Visual feedback: heart burst animation.
   Only on touch devices.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';
  if (!('ontouchstart' in window)) return;

  var lastTap = 0;
  var TAP_DELAY = 300;

  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTap < TAP_DELAY) {
      var el = e.target.closest('.pane, .card');
      if (el) {
        showFeedback(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    }
    lastTap = now;
  }, { passive: true });

  function showFeedback(x, y) {
    var heart = document.createElement('span');
    heart.textContent = '\u2665';
    heart.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;z-index:300;font-size:24px;color:#E25A5A;pointer-events:none;transform:translate(-50%,-50%) scale(0);animation:heartPop .6s ease forwards;text-shadow:0 0 8px rgba(226,90,90,.4)';
    document.body.appendChild(heart);
    setTimeout(function () { heart.remove(); }, 600);
  }

  if (!document.getElementById('_heart-pop-style')) {
    var style = document.createElement('style');
    style.id = '_heart-pop-style';
    style.textContent = '@keyframes heartPop{0%{transform:translate(-50%,-50%) scale(0);opacity:1}50%{transform:translate(-50%,-70%) scale(1.2);opacity:.8}100%{transform:translate(-50%,-100%) scale(0);opacity:0}}';
    document.head.appendChild(style);
  }
})();
