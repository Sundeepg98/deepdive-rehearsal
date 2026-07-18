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
    btnEl.setAttribute('aria-keyshortcuts', 'F');
    btnEl.textContent = 'Focus';
    /* NOTE: `display` is deliberately NOT set here. It used to say display:inline-block, and an
       inline style beats a stylesheet rule -- which pinned this button at 60x20 and made the
       mobile tap floor in styles.css (#_focus-toggle{min-height:44px;display:inline-flex}) a
       silent no-op on the one property that could centre its label. Leave display to CSS. */
    btnEl.style.cssText = 'font-size:var(--font-size-nano);font-weight:var(--font-weight-bold);letter-spacing:.5px;text-transform:uppercase;color:var(--mut);background:var(--accbg);border:1px solid var(--acc-a12);padding:var(--space-4) var(--space-12);border-radius:8px;cursor:pointer;margin-top:var(--space-10);transition:all var(--duration-base) var(--ease-base)';
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

  /* F toggles focus mode, unless typing or the search overlay is open.
     The typing guard MUST go through KeyGuard (shell.js): this is a document-level
     listener, so e.target is retargeted to the shadow HOST -- it read "DEEP-NUMBERS",
     never "INPUT", and F collapsed the sidebar while you were typing in the Numbers
     pane's estimation fields. KeyGuard.isTyping reads composedPath()[0], the real
     target, so it sees through every shadow root -- today's four fields and any added later. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'f' && e.key !== 'F') return;
    /* plain F only. This used to preventDefault() on Ctrl/Cmd+F too, which HIJACKED the
       browser's find-in-page AND collapsed the sidebar underneath it (QW3, same class of
       bug as the shell map's Ctrl+P double-fire). A chord is not this binding. */
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (window.KeyGuard && window.KeyGuard.isTyping(e)) return;
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
