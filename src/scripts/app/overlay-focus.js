/* ============ overlay-focus.js -- shared modal behaviours for the dynamic overlays ============
   The search / notes / index overlays are built lazily on first open, AFTER shell.js's
   one-time [role=dialog][aria-modal] scan -- so they can't ride its centralized focus
   manager, and each used to re-implement the same Tab focus-trap + Escape-to-close +
   focus capture/restore. This wires that shared core for a given overlay and returns
   capture()/restore() for the overlay's own open()/close() to call.

   The keydown listener is document-level and gated on the overlay's own isOpen() -- so
   Escape closes and Tab traps even when opening the overlay didn't move focus inside it
   (matching the search overlay's original document-level handler). Backdrop click-out
   stays in each overlay (interleaved with overlay-specific click logic). Offline-safe. */
window.__overlayModal = function (el, close, isOpen) {
  var ret = null;
  function focusables() {
    return Array.prototype.filter.call(
      el.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'),
      function (x) { return !x.disabled && !x.hidden && x.offsetParent !== null; });
  }
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!el.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });
  return {
    capture: function () { ret = document.activeElement; },
    restore: function () { if (ret && ret.focus) { try { ret.focus(); } catch (e) {} } ret = null; }
  };
};
