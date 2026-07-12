/* ===== FocusMode =====
   Distraction-free reading: collapses the sidebar (nav + tools) and the
   companion rail so the current surface fills the width.
   - Toggle via a "Focus" button in the header or the F key
   - Implemented as a single class on .app plus an injected stylesheet, so it
     reverts cleanly (no inline-style bookkeeping)
   - Off by default; never affects the initial layout

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var isFocused = false;
  var btnEl = null;

  function injectStyle() {
    if (document.getElementById('_focus-style')) return;
    var st = document.createElement('style');
    st.id = '_focus-style';
    st.textContent =
      '.app._focus-mode .sidebar,.app._focus-mode .companion{opacity:0;visibility:hidden;width:0;min-width:0;padding:0;margin:0;border:0;overflow:hidden;transition:opacity var(--duration-slow) var(--ease-base),width var(--duration-slow) var(--ease-base)}' +
      '@media(prefers-reduced-motion:reduce){.app._focus-mode .sidebar,.app._focus-mode .companion{transition:none}}';
    document.head.appendChild(st);
  }

  function createButton() {
    if (btnEl) return;
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;
    btnEl = document.createElement('button');
    btnEl.type = 'button';
    btnEl.id = '_focus-toggle';
    btnEl.setAttribute('aria-label', 'Toggle focus mode');
    btnEl.setAttribute('aria-pressed', 'false');
    btnEl.textContent = 'Focus';
    btnEl.style.cssText = 'display:inline-block;font-size:var(--font-size-nano);font-weight:var(--font-weight-bold);letter-spacing:.5px;text-transform:uppercase;color:var(--mut);background:var(--accbg);border:1px solid var(--acc-a12);padding:var(--space-4) var(--space-12);border-radius:8px;cursor:pointer;margin-top:var(--space-10);transition:all var(--duration-base) var(--ease-base)';
    btnEl.addEventListener('click', toggle);
    hdr.appendChild(btnEl);
  }

  function toggle() {
    var app = document.querySelector('.app');
    if (!app) return;
    injectStyle();
    isFocused = !isFocused;
    app.classList.toggle('_focus-mode', isFocused);
    if (btnEl) {
      btnEl.textContent = isFocused ? 'Exit focus' : 'Focus';
      btnEl.style.color = isFocused ? 'var(--acc)' : 'var(--mut)';
      btnEl.setAttribute('aria-pressed', isFocused ? 'true' : 'false');
    }
  }

  /* F toggles focus mode, unless typing or the search overlay is open */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'f' && e.key !== 'F') return;
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (window.SearchOverlay && window.SearchOverlay.isOpen && window.SearchOverlay.isOpen()) return;
    e.preventDefault();
    toggle();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createButton);
  } else {
    createButton();
  }

  window.FocusMode = { toggle: toggle, isFocused: function () { return isFocused; } };
})();
