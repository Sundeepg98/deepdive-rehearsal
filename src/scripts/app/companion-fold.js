/* ===== scripts/app/companion-fold.js -- fold the desktop companion rail (U2) =====
   The 290px coaching rail (shown only >=1280px) can be folded away to give the
   content panes more width; a slim edge tab brings it back. State persists. The
   mobile companion is a <details> that already collapses on its own, so this is
   desktop-only -- the reopen tab is scoped to >=1280px in CSS. This script sits near
   the end of <body>, so the persisted state is applied before first paint (no flash). */
(function () {
  'use strict';
  var KEY = 'cmp.collapsed';
  function get() { try { return (typeof Store !== 'undefined') ? !!Store.get(KEY) : false; } catch (e) { return false; } }
  function set(v) { try { if (typeof Store !== 'undefined') Store.set(KEY, !!v); } catch (e) {} }
  function apply(v) { if (document.body) document.body.classList.toggle('cmp-collapsed', !!v); }
  apply(get());
  function wire() {
    apply(get());
    var fold = document.querySelector('.cmp-fold'), reopen = document.querySelector('.cmp-reopen');
    if (fold) fold.addEventListener('click', function () { apply(true); set(true); if (reopen) reopen.focus(); });
    if (reopen) reopen.addEventListener('click', function () { apply(false); set(false); if (fold) fold.focus(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
