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
  var exitEl = null;

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

  /* THE ALWAYS-REACHABLE EXIT. The header's own #_focus-toggle lives INSIDE .sidebar, and focus
     mode COLLAPSES .sidebar (opacity:0;visibility:hidden;width:0) -- so entering focus mode hides
     the one control that reverses it, and on mobile (no F key) that was a hard trap whose only
     escape was a full reload. This floating chip is a SIBLING of .sidebar/.companion (appended to
     .app), so the collapse cannot reach it; styles.css shows it only while .app._focus-mode is set.
     Its `display` is left to CSS on purpose -- an inline display would beat the .app._focus-mode
     rule and strand it, the same trap the #_focus-toggle note above records. */
  function createExit() {
    if (exitEl) return;
    var app = document.querySelector('.app');
    if (!app) return;
    exitEl = document.createElement('button');
    exitEl.type = 'button';
    exitEl.id = '_focus-exit';
    exitEl.setAttribute('aria-label', 'Exit focus mode');
    exitEl.setAttribute('aria-keyshortcuts', 'Escape');
    /* built with DOM nodes, not innerHTML: the icon is a decorative glyph and the label is plain
       text, so there is nothing to parse and no string to trust. A \u2715 escape (renders as a close
       X) keeps the source ASCII, as ascii_guard requires. */
    var ic = document.createElement('span');
    ic.setAttribute('aria-hidden', 'true');
    ic.textContent = '\u2715';
    exitEl.appendChild(ic);
    exitEl.appendChild(document.createTextNode(' Exit focus'));
    exitEl.addEventListener('click', toggle);
    app.appendChild(exitEl);
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

  /* Escape exits focus mode -- the keyboard counterpart to the floating chip, and the reflex a
     user reaches for first when a mode has "trapped" them. It respects the SAME dialog-bail order
     the global keymap uses (shell.js): an open modal / the search overlay / an active tour owns
     Escape first, and shell.js's unified Escape closes an open overlay -- so this only ever fires
     when nothing else claims the key and focus mode is actually on. It never no-ops silently and
     never fights another handler: shell's Escape does nothing when no overlay is open, and this
     bails whenever one is. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!isFocused) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (window.KeyGuard && window.KeyGuard.isTyping && window.KeyGuard.isTyping(e)) return;
    if (window.SearchOverlay && window.SearchOverlay.isOpen && window.SearchOverlay.isOpen()) return;
    if (window.TourGuide && window.TourGuide.isActive && window.TourGuide.isActive()) return;
    var dlgs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    for (var i = 0; i < dlgs.length; i++) {
      if (dlgs[i].classList.contains('open') && !dlgs[i].classList.contains('closing')) return;
    }
    e.preventDefault();
    toggle();
  });

  function init() { createButton(); createExit(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FocusMode = { toggle: toggle, isFocused: function () { return isFocused; } };
})();
