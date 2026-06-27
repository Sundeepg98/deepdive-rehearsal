/* ===== AmbientBackground =====
   Subtle animated gradient mesh that shifts slowly behind the app.
   Very lightweight — uses CSS animations, not canvas/JS loop.
   Creates a living, breathing feel without being distracting.

   Features:
   - 3 overlapping radial gradients that drift slowly
   - Responds to prefers-reduced-motion (static fallback)
   - Pure CSS, zero JS overhead after init
*/
(function () {
  'use strict';

  function init() {
    // Check for reduced motion preference
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    var container = document.querySelector('.app') || document.body;

    var mesh = document.createElement('div');
    mesh.id = '_ambient-mesh';
    mesh.setAttribute('aria-hidden', 'true');
    mesh.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden';

    // Blob 1: top-right, purple
    var blob1 = document.createElement('div');
    blob1.style.cssText = 'position:absolute;width:60vw;height:60vw;border-radius:50%;background:radial-gradient(circle,rgba(83,74,183,.035) 0%,transparent 70%);top:-20%;right:-15%;animation:blobDrift1 20s ease-in-out infinite';

    // Blob 2: bottom-left, teal accent
    var blob2 = document.createElement('div');
    blob2.style.cssText = 'position:absolute;width:50vw;height:50vw;border-radius:50%;background:radial-gradient(circle,rgba(15,110,86,.025) 0%,transparent 70%);bottom:-15%;left:-10%;animation:blobDrift2 25s ease-in-out infinite';

    // Blob 3: center, warm accent
    var blob3 = document.createElement('div');
    blob3.style.cssText = 'position:absolute;width:45vw;height:45vw;border-radius:50%;background:radial-gradient(circle,rgba(154,91,11,.018) 0%,transparent 70%);top:40%;left:35%;animation:blobDrift3 18s ease-in-out infinite';

    mesh.appendChild(blob1);
    mesh.appendChild(blob2);
    mesh.appendChild(blob3);

    // Insert as first child so it's behind everything
    container.insertBefore(mesh, container.firstChild);

    // Inject keyframes
    if (!document.getElementById('_ambient-keyframes')) {
      var style = document.createElement('style');
      style.id = '_ambient-keyframes';
      style.textContent =
        '@keyframes blobDrift1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-5vw,8vh) scale(1.05)}66%{transform:translate(3vw,-4vh) scale(.97)}}' +
        '@keyframes blobDrift2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(6vw,-6vh) scale(1.03)}66%{transform:translate(-4vw,5vh) scale(.98)}}' +
        '@keyframes blobDrift3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-3vw,4vh) scale(1.04)}}';
      document.head.appendChild(style);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
