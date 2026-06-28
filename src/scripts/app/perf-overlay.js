/* ===== PerfOverlay =====
   Optional performance stats overlay (FPS, memory).
   Toggle with triple-press of the ` key.
   Only shown when explicitly activated.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var active = false;
  var overlay = null;
  var lastTime = performance.now();
  var frames = 0;
  var pressCount = 0;
  var pressTimer = null;

  function create() {
    overlay = document.createElement('div');
    overlay.id = '_perf-overlay';
    overlay.style.cssText = 'position:fixed;top:8px;left:8px;z-index:500;background:rgba(0,0,0,.75);color:#0f0;font-family:ui-monospace,monospace;font-size:11px;padding:8px 12px;border-radius:8px;backdrop-filter:blur(4px);display:none;line-height:1.6';
    document.body.appendChild(overlay);
  }

  function update() {
    if (!active) return;
    frames++;
    var now = performance.now();
    if (now - lastTime >= 1000) {
      var fps = Math.round(frames * 1000 / (now - lastTime));
      var mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'N/A';
      overlay.innerHTML = 'FPS: ' + fps + '<br>Mem: ' + mem + '<br><span style="color:#888;font-size:9px">Press ` 3x to hide</span>';
      frames = 0; lastTime = now;
    }
    requestAnimationFrame(update);
  }

  function toggle() {
    active = !active;
    if (!overlay) create();
    overlay.style.display = active ? 'block' : 'none';
    if (active) { frames = 0; lastTime = performance.now(); requestAnimationFrame(update); }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === '`' || e.key === '~') {
      e.preventDefault();
      pressCount++;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(function () { pressCount = 0; }, 400);
      if (pressCount >= 3) { pressCount = 0; toggle(); }
    }
  });
})();
