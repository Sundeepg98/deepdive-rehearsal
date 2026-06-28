/* ===== UndoToast =====
   Shows undo option after destructive actions.
   Features:
   - Public API: showUndoToast(message, onUndo)
   - Auto-dismisses after 5 seconds
   - Calls onUndo callback if clicked
   - Slides in from bottom
   Usage: window.showUndoToast(msg, undoFn)
*/
(function () {
  'use strict';

  var current = null;

  window.showUndoToast = function (message, onUndo) {
    if (current) { current.remove(); current = null; }

    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%) translateY(100px);z-index:350;background:var(--ink);color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:550;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transition:all .35s cubic-bezier(.22,.61,.36,1);display:flex;align-items:center;gap:12px';

    var msg = document.createElement('span');
    msg.textContent = message;

    var undo = document.createElement('button');
    undo.textContent = 'Undo';
    undo.style.cssText = 'background:rgba(83,74,183,.3);color:#C4B5FD;border:0;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer';
    undo.addEventListener('click', function () {
      if (onUndo) onUndo();
      dismiss();
    });

    toast.appendChild(msg);
    toast.appendChild(undo);
    document.body.appendChild(toast);
    current = toast;

    requestAnimationFrame(function () {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    });

    var timer = setTimeout(dismiss, 5000);

    function dismiss() {
      clearTimeout(timer);
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); if (current === toast) current = null; }, 350);
    }
  };
})();
