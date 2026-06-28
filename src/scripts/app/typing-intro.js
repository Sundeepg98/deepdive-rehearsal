/* ===== TypingIntro =====
   Typewriter effect on the main heading.
   Types out the title once on initial load.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_typing_seen';

  function type(element, text, speed) {
    element.textContent = '';
    element.style.borderRight = '2px solid var(--acc)';
    element.style.paddingRight = '2px';
    element.style.animation = 'cursorBlink .8s step-end infinite';

    var i = 0;
    var interval = setInterval(function () {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
        element.style.borderRight = 'none';
        element.style.animation = 'none';
      }
    }, speed);
  }

  function init() {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) { return; }

    var h1 = document.querySelector('.hdr h1');
    if (!h1) return;
    var original = h1.textContent.trim();
    if (!original) return;

    // Only type if reduced motion not preferred
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    type(h1, original, 65);

    // Inject cursor blink keyframe
    if (!document.getElementById('_cursor-blink-style')) {
      var style = document.createElement('style');
      style.id = '_cursor-blink-style';
      style.textContent = '@keyframes cursorBlink{0%,100%{border-color:var(--acc)}50%{border-color:transparent}}';
      document.head.appendChild(style);
    }
  }

  setTimeout(init, 800);
})();
