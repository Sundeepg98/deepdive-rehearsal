/* ===== MouseGlow =====
   A subtle radial gradient spotlight that follows the cursor.
   Creates an ambient light effect on the hero/background area.
   Features:
   - Smooth lerp-following cursor (not instant, feels organic)
   - Respects prefers-reduced-motion
   - Auto-disables on touch devices
   - Very subtle — 8% opacity, large 600px radius
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  // Skip on touch devices
  if ('ontouchstart' in window) return;
  // Skip reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var glow = document.createElement('div');
  glow.id = '_mouse-glow';
  glow.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0;transition:opacity .6s ease;background:radial-gradient(600px circle at var(--gx,50%) var(--gy,50%),rgba(83,74,183,.08),transparent 70%);mix-blend-mode:screen';
  document.body.appendChild(glow);

  // Fade in after page loads
  setTimeout(function () { glow.style.opacity = '1'; }, 500);

  var targetX = 50, targetY = 50;
  var currentX = 50, currentY = 50;

  document.addEventListener('mousemove', function (e) {
    targetX = (e.clientX / window.innerWidth) * 100;
    targetY = (e.clientY / window.innerHeight) * 100;
  });

  function tick() {
    // Lerp for smooth following (0.08 = slow/smooth)
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    glow.style.setProperty('--gx', currentX + '%');
    glow.style.setProperty('--gy', currentY + '%');
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
