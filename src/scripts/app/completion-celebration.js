/* ===== CompletionCelebration =====
   Subtle confetti burst when user scrolls to bottom of a module.
   Features:
   - Triggers once per session when scroll reaches 95%+ 
   - Uses CSS-only particles (no canvas, no library)
   - 15-20 small colored dots burst upward and fade
   - Respects prefers-reduced-motion
   - Only fires once per module per session
   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  // Skip if reduced motion preferred
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var celebrated = {}; // track which modules we've celebrated
  var COLORS = ['#534AB7', '#6D5FD6', '#0F6E56', '#A32D2D', '#9A5B0B', '#8B7FE8'];

  function celebrate(pane) {
    var viewId = pane.id;
    if (!viewId || celebrated[viewId]) return;
    celebrated[viewId] = true;

    var rect = pane.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var bottomY = rect.bottom - 40;

    for (var i = 0; i < 18; i++) {
      (function (index) {
        setTimeout(function () {
          var dot = document.createElement('span');
          var color = COLORS[Math.floor(Math.random() * COLORS.length)];
          var size = 4 + Math.random() * 5;
          var angle = (Math.random() - 0.5) * Math.PI; // upward arc
          var velocity = 60 + Math.random() * 80;
          var tx = Math.sin(angle) * velocity;
          var ty = -Math.cos(angle) * velocity - 30;

          dot.style.cssText = 'position:fixed;left:' + centerX + 'px;top:' + bottomY + 'px;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';pointer-events:none;z-index:200;box-shadow:0 0 4px ' + color + ';animation:confettiPop .9s cubic-bezier(.22,.61,.36,1) forwards;';
          dot.style.setProperty('--ctx', tx + 'px');
          dot.style.setProperty('--cty', ty + 'px');

          document.body.appendChild(dot);
          setTimeout(function () { dot.remove(); }, 950);
        }, index * 40);
      })(i);
    }
  }

  // Inject keyframe
  if (!document.getElementById('_confetti-style')) {
    var style = document.createElement('style');
    style.id = '_confetti-style';
    style.textContent = '@keyframes confettiPop{0%{transform:translate(0,0) scale(1);opacity:1}70%{opacity:.8}100%{transform:translate(var(--ctx),var(--cty)) scale(0);opacity:0}}';
    document.head.appendChild(style);
  }

  // Listen to scroll on all panes
  function attach(pane) {
    if (pane.dataset._celebration) return;
    pane.dataset._celebration = '1';

    pane.addEventListener('scroll', function () {
      var scrollTop = pane.scrollTop;
      var scrollHeight = pane.scrollHeight - pane.clientHeight;
      if (scrollHeight <= 0) return;
      var pct = scrollTop / scrollHeight;
      if (pct >= 0.95) {
        celebrate(pane);
      }
    }, { passive: true });
  }

  document.querySelectorAll('.pane').forEach(attach);
  // Also attach to new panes on view change
  document.addEventListener('routechange', function () {
    setTimeout(function () {
      document.querySelectorAll('.pane').forEach(attach);
    }, 300);
  });
})();
