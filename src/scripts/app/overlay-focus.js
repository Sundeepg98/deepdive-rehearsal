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
    /* FOCUS MUST LEAVE THE DIALOG THE INSTANT IT STARTS CLOSING.
       restore() used to only re-focus the CAPTURED TRIGGER -- and when the overlay opens ITSELF
       (the boot start screen) the captured trigger is <body>, which is not focusable, so .focus()
       was a SILENT NO-OP and focus stayed parked in the overlay's .ix-filter <input>. shell.js
       bails on `activeTag === 'input'` at :79, BEFORE it reaches the dialog gate at :82 -- so
       every keystroke was swallowed until the browser reset activeElement at display:none, 220ms
       later. Measured: activeElement = INPUT.ix-filter at close+0/60/150/210ms; BODY at +300.
       Fixing the dialog gate alone does NOT fix this; both halves are required.
       Shared by the search / notes / index overlays -- all three benefit. */
    restore: function () {
      var a = document.activeElement;
      if (a && a.blur && el.contains(a)) { try { a.blur(); } catch (e) {} }
      if (ret && ret.focus && ret !== document.body && ret !== document.documentElement) {
        try { ret.focus(); } catch (e) {}
      }
      ret = null;
    }
  };
};
