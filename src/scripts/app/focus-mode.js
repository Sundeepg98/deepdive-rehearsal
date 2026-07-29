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
      '@media(prefers-reduced-motion:reduce){.app._focus-mode .sidebar,.app._focus-mode .companion{transition:none}}' +
      /* ===== W2 / audit P1-1: ICON-ONLY ON A PHONE =====
         The mobile identity block is now ONE row, and this button was 66px of it -- against a
         topic title that had 102px left and rendered "Production Debugging and Incident
         Diagnosis" at 31%. As a 44px square it gives 22px back to the title and keeps the full
         tap target.
         The label survives because it never came from the text: aria-label="Toggle focus mode"
         is the accessible name, and it is untouched (the visible word "Focus" was always
         redundant with it). aria-pressed still carries the state.
         AND THIS RULE LIVES HERE, NOT IN styles.css, FOR TWO REASONS. (1) This <style> is
         injected into <head> UNLAYERED, and unlayered author styles beat everything in
         styles.css's @layer app no matter the source order -- a mobile override written over
         there could not win. (2) The button's own base look is set INLINE by createButton(), and
         an inline declaration beats any stylesheet rule that is not !important; the two
         properties that have to change (font-size and padding) are therefore moved out of that
         inline style and set here, so nothing in this file needs !important to beat itself.
         That is the same trap the `display` note in createButton() records. */
      '#_focus-toggle{font-size:var(--font-size-nano);padding:var(--space-4) var(--space-12)}' +
      '@media(max-width:919px){' +
      '#_focus-toggle{font-size:0;min-width:44px;padding-left:0;padding-right:0;justify-content:center}' +
      '#_focus-toggle::before{content:"\\25A3";font-size:var(--font-size-subhead);line-height:1;color:var(--acc)}' +
      '}';
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
    /* font-size and padding are NOT set here any more -- they moved into injectStyle()'s sheet so
       the mobile icon rule can override them without !important (an inline declaration beats every
       non-important stylesheet rule, which is the same trap the `display` note above records).
       Everything else stays inline and unchanged, so the desktop button is byte-identical. */
    btnEl.style.cssText = 'font-weight:var(--font-weight-bold);letter-spacing:.5px;text-transform:uppercase;color:var(--mut);background:var(--accbg);border:1px solid var(--acc-a12);border-radius:8px;cursor:pointer;margin-top:var(--space-10);transition:all var(--duration-base) var(--ease-base)';
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

  /* injectStyle() USED TO BE LAZY -- called only from toggle(), because everything in the sheet was
     an `.app._focus-mode` rule that could not matter until focus mode was first switched on. That
     stopped being true when the sheet gained the button's OWN base look (see injectStyle): a rule
     the button needs at first paint cannot be installed on first use.
     MEASURED, and this is why it is called here now: with the sheet still lazy, the desktop toggle
     rendered at the UA default 13.33px with padding 0 instead of 9px/4px 12px -- 20px tall became
     17px, .hdr lost 1px, and every element below it in the sidebar moved up one pixel. That is
     14 of 16 VR baselines red (walk, wb, num, all five rooms, both mobile walks), from a change
     that was supposed to be mobile-only. injectStyle is idempotent, so calling it twice is free. */
  function init() { injectStyle(); createButton(); createExit(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FocusMode = { toggle: toggle, isFocused: function () { return isFocused; } };
})();
