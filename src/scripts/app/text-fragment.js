/* ===== TextFragment =====
   Handles #:~:text= URL fragments for linking to specific text.
   Features:
   - Parses text fragment from URL
   - Highlights matching text in active pane
   - Scrolls to first match
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  function handle() {
    var hash = location.hash;
    if (!hash || !hash.includes(':~:text=')) return;

    var match = hash.match(/:~:text=([^&]+)/);
    if (!match) return;
    var text = decodeURIComponent(match[1]);

    // Wait for view to be active
    setTimeout(function () {
      var pane = document.querySelector('.pane.on');
      if (!pane) return;

      // Simple text search and highlight
      var walker = document.createTreeWalker(pane, NodeFilter.SHOW_TEXT);
      var node;
      while (node = walker.nextNode()) {
        var idx = node.textContent.indexOf(text);
        if (idx >= 0) {
          var range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + text.length);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          // Scroll into view
          var rect = range.getBoundingClientRect();
          pane.scrollTop += rect.top - pane.getBoundingClientRect().top - 100;
          break;
        }
      }
    }, 800);
  }

  window.addEventListener('hashchange', handle);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(handle, 1000); });
  } else {
    setTimeout(handle, 1000);
  }
})();
