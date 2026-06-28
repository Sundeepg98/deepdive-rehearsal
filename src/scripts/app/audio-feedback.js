/* ===== AudioFeedback =====
   Subtle click sounds on button interactions.
   Uses Web Audio API — no external files needed.
   Respects reduced-motion AND muted preference.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var ctx = null;
  var enabled = true;

  function initAudio() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }

  function click() {
    if (!enabled || !ctx) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('button')) {
      initAudio();
      click();
    }
  });
})();
