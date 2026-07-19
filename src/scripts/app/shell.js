/* ============ Global application shell (shell.js) ============
   The app-level chrome shared by every view (NOT a feature module -- no numbers/
   view-specific logic): switchTab + the
   global keyboard handler + the modal focus-trap + the mobile companion sheet +
   __syncCompanion. The per-view coaching map that used to be a closure-local `cmpNotes`
   here now reads the registry-owned global TOPIC_CMP_NOTES (seeded for topic 1 at
   register() time, re-set on every topic switch by applyIdentity). Byte-identical
   companion output. Offline-safe: no network/storage/permission. */
/* ============ TABS + RAIL + KEYBOARD ============ */
const segBtns = document.querySelectorAll('.seg button');
/* E2: a per-topic trail of which of the nine views you've opened -- a subtle dot on the
   seg-tabs you've already visited for the current topic (each topic keeps its own set,
   keyed by TopicRegistry.current()). */
function paintSeenTabs() {
  try {
    var _c = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    var tid = _c ? _c.id : null;
    var seen = (tid && typeof Store !== 'undefined') ? (Store.get('viewseen.' + tid, []) || []) : [];
    for (var i = 0; i < segBtns.length; i++) { segBtns[i].classList.toggle('seen', seen.indexOf(segBtns[i].getAttribute('data-tab')) > -1); }
  } catch (e) {}
}
function markViewSeen(view) {
  try {
    var _c = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    var tid = _c ? _c.id : null;
    if (tid && typeof Store !== 'undefined') {
      var key = 'viewseen.' + tid, seen = Store.get(key, []) || [];
      if (seen.indexOf(view) === -1) { seen.push(view); Store.set(key, seen); }
    }
    paintSeenTabs();
  } catch (e) {}
}
window.addEventListener('deeptopicchange', function () { markViewSeen(current); });
const panes = document.querySelectorAll('.pane');
const railEl = document.getElementById('rail');
const railPos = { walk: 25, drill: 50, wb: 75, sys: 100 };
var current = 'walk';
/* Apply a view. Toggles the segmented-control buttons + rail + companion
   synchronously (so coaching/rail update immediately), then swaps the panes --
   through the View Transitions API when available (view-transitions.js),
   otherwise the existing .pane.on CSS animation, which is byte-for-behavior
   identical to before. This is the single visual applier: clicks, keyboard,
   search and the tour all funnel here via the HashRouter (goView below). */
function switchTab(t) {
  var target = document.getElementById(t);
  if (!target) return;
  /* PERF (perf/chunk-proto): a pane deferred by TopicPaneQueue must be CURRENT before it
     is shown. __tpFlush() is a no-op unless the pane is dirty (topic-protocol.js), so the
     common case costs one property lookup; the reveal case renders synchronously HERE --
     before the .on toggle below -- so stale content is never on screen. */
  for (var _pc = target.firstElementChild; _pc; _pc = _pc.nextElementSibling) {
    if (typeof _pc.__tpFlush === 'function') _pc.__tpFlush();
  }
  for (let i = 0; i < segBtns.length; i++) segBtns[i].classList.toggle('on', segBtns[i].getAttribute('data-tab') === t);
  if (railEl) railEl.style.width = railPos[t] + '%';
  current = t;
  markViewSeen(t);
  if (window.__syncCompanion) window.__syncCompanion();
  var swap = function () {
    for (let i = 0; i < panes.length; i++) panes[i].classList.toggle('on', panes[i].id === t);
  };
  if (!target.classList.contains('on') && window.ViewTransitions && window.ViewTransitions.run) window.ViewTransitions.run(swap);
  else swap();
  try { window.scrollTo(0, 0); } catch (e) {}
  var st = document.querySelector('.stage'); if (st) st.scrollTop = 0;
}
window.switchTab = switchTab;
/* Intent -> Router.navigate (updates the URL hash + history) -> ViewManager ->
   switchTab. Falls back to a direct switchTab if the router has not loaded. */
function goView(t) { if (window.Router) window.Router.navigate(t); else switchTab(t); }
for (let i = 0; i < segBtns.length; i++) {
  segBtns[i].onclick = function () { goView(this.getAttribute('data-tab')); };
}
/* Global keyboard shortcuts. Ignored while typing in a field, and suppressed
   whenever any overlay is open (the overlay's own handlers take over). */
/* Density: cycles the spacing scale via a single --density-scale token override on <html>.
   Reaches shadow DOM through custom-property inheritance; spacing only, font untouched. */
window.Density = (function () {
  var modes = ['default', 'compact', 'cozy'];
  function set(m) { if (m === 'default') delete document.documentElement.dataset.density; else document.documentElement.dataset.density = m; }
  function cycle() { var cur = document.documentElement.dataset.density || 'default'; set(modes[(modes.indexOf(cur) + 1) % modes.length]); }
  return { set: set, cycle: cycle };
})();
/* ============ KeyGuard -- WHERE IS FOCUS, REALLY? ============
   Every global shortcut in this app is a DOCUMENT-level keydown listener, and a
   document-level listener cannot see into a shadow root: on its way out, the event is
   RETARGETED to the host. So while you type in the Numbers pane's four estimation
   fields (they live in deep-numbers' shadow root):

       event.target.tagName      = "DEEP-NUMBERS"   <- what the old guard tested
       event.composedPath()[0]   = "INPUT"          <- what it actually is

   ...which is why `activeTag === 'input'` never matched and 14 of 17 shortcuts fired
   WHILE TYPING. Typing "1e6" -- legal scientific notation in a type=number field --
   navigated to the Whiteboard on the "e" and destroyed the entry. The three overlay
   text fields only looked clean because the handler below bails while a dialog is open,
   so the tagName guard was never exercised there: it has been silently broken for every
   shadow-DOM field and would have broken the next one added.

   These are the only correct way to ask "where is focus" from a document-level handler
   in this app. Nine of the panes are shadow DOM; a light-DOM-only check is a no-op that
   LOOKS like a guard. Never test event.target / document.activeElement directly here.

     isTyping(event)     -- focus is on a surface that consumes typed characters.
                            Every letter/punctuation shortcut must bail on this.
     isActivatable(el)   -- the control handles Enter/Space ITSELF. A pane-level
                            Enter/Space shortcut must not steal the key from it.
     eventTarget(event)  -- composedPath()[0]: the real target, before retargeting.
                            (composedPath() is only valid DURING dispatch.)
     deepActiveElement() -- document.activeElement, recursed through every shadow root. */
window.KeyGuard = (function () {
  /* roles that own Enter/Space the way a native button does */
  var ACTIVATION_ROLES = ['button', 'link', 'checkbox', 'radio', 'switch', 'tab',
    'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'textbox', 'searchbox', 'combobox'];

  /* the REAL focused element -- document.activeElement stops at the shadow HOST, so
     walk each root's own activeElement all the way down (shadow roots nest). */
  function deepActiveElement() {
    var el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }

  /* the element the key ACTUALLY went to, before shadow retargeting */
  function eventTarget(event) {
    if (event && typeof event.composedPath === 'function') {
      var path = event.composedPath();
      if (path && path.length) return path[0];
    }
    return (event && event.target) || deepActiveElement();
  }

  /* a surface that consumes typed characters */
  function isTypingSurface(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return el.isContentEditable === true;
  }
  function isTyping(event) { return isTypingSurface(eventTarget(event)); }

  /* a control that handles Enter/Space itself: stealing the key from it breaks it */
  function isActivatable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.disabled) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select' ||
        tag === 'summary' || tag === 'details' || tag === 'audio' || tag === 'video') return true;
    if ((tag === 'a' || tag === 'area') && el.hasAttribute('href')) return true;
    if (el.isContentEditable === true) return true;
    /* anything the author made focusable is presumed to want its own keys */
    var ti = el.getAttribute && el.getAttribute('tabindex');
    if (ti !== null && ti !== undefined && ti !== '' && parseInt(ti, 10) >= 0) return true;
    var role = (el.getAttribute && el.getAttribute('role') || '').toLowerCase();
    return ACTIVATION_ROLES.indexOf(role) > -1;
  }

  /* Enter/Space belongs to a PANE-level shortcut only when focus is not parked on a
     control that would handle the key itself -- i.e. focus is on <body> or on inert
     content ("you are in the pane"), not on a button/link/field anywhere in the app,
     shadow root or not. Gate on FOCUS, never on which pane happens to be showing. */
  function ownsActivationKeys(event) { return !isActivatable(eventTarget(event)); }

  return {
    deepActiveElement: deepActiveElement,
    eventTarget: eventTarget,
    isTypingSurface: isTypingSurface,
    isTyping: isTyping,
    isActivatable: isActivatable,
    ownsActivationKeys: ownsActivationKeys
  };
})();
document.addEventListener('keydown', function (event) {
  /* THE typing guard. Reads through shadow roots -- see KeyGuard above. */
  if (window.KeyGuard.isTyping(event)) return;
  /* THE MODIFIER GUARD (QW3). Every binding in this map is a PLAIN key; a chord is the
     browser's (or another handler's), not this map's. Without this, Ctrl+P opened the
     Session panel UNDERNEATH print-qa's popup (both are document-level 'p' listeners --
     MEASURED: the stray dialog then swallowed every subsequent key, which is how the
     probe caught it), and Alt+ArrowLeft (browser Back) also stepped the walkthrough.
     THE CARVE-OUTS ARE LAYOUTS, NOT CHORDS. event.key is layout-relative, and on real
     keyboards some of THESE VERY BINDINGS arrive wearing a modifier: '\' is AltGr+eszett on a
     German PC (Chromium reports AltGr as ctrl+alt BOTH true) and Alt+Shift+7 on a German
     Mac. So: block Cmd/Win-anything; block Ctrl-without-Alt (a real Ctrl chord -- AltGr
     always sets both); block Alt only for NON-printable keys (Alt+ArrowLeft is Back;
     Alt+"\" is a person typing a backslash). Shift is never blocked: '?' IS Shift+/. */
  if (event.metaKey || (event.ctrlKey && !event.altKey) ||
      (event.altKey && !event.ctrlKey && event.key.length > 1)) return;
  if (window.TourGuide && window.TourGuide.isActive()) return;
  if (window.SearchOverlay && window.SearchOverlay.isOpen && window.SearchOverlay.isOpen()) return;
  /* `.open:not(.closing)` -- THE INTERACTIVITY INVARIANT (styles.css). `.open` alone stays set for
     the whole fade-out, so every keystroke was swallowed for 220ms (index) / 500ms (mock, cram)
     after a close. NOT `.vis`: only .ix-ov ever sets it, so a .vis gate would let `w`, `\` and `d`
     fire UNDERNEATH an open Mock Run. */
  var _openDlgs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  for (var _oi = 0; _oi < _openDlgs.length; _oi++) {
    var _d = _openDlgs[_oi];
    if (_d.classList.contains('open') && !_d.classList.contains('closing')) return;
  }
  if (event.key === '?') { event.preventDefault(); openKeys(); return; }
  const key = event.key.toLowerCase();

  /* ---- THE HOME IS A DESTINATION, NOT A MODAL ----
     h goes home from anywhere (and Back returns -- free, because it is a real route; it was
     impossible while the "home" was a modal). Escape does NOT leave the home: nothing to escape.
     On the home there is no current topic view, so the topic/pane keys must not silently act on
     the BOOT topic -- measured, `w` on the home ran goView('drill') -> '#drill' -> the drill of a
     topic the user never chose. They retarget to the resume topic, or do nothing. */
  const onHome = document.documentElement.dataset.view === 'home';
  if (key === 'h') { if (window.Router) window.Router.navigate('home'); return; }
  if (onHome) {
    if (key >= '1' && key <= '6') {                       /* the six rooms. Safe: the 1/2/3 grade
                                                            keys are scoped to current==='drill'. */
      if (window.HomeView && HomeView.openRoomByIndex && HomeView.openRoomByIndex(+key)) event.preventDefault();
      return;
    }
    if (key === '[' || key === ']') return;               /* stepping topics invisibly: no. */
    const homeTabKeys = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open', v: 'viz' };
    if (homeTabKeys[key]) {
      const rid = (window.LastVisit && LastVisit.topicId) ? LastVisit.topicId() : null;
      if (!rid || typeof TopicRegistry === 'undefined' || !TopicRegistry.get(rid)) return;   /* no topic to mean */
      const c = TopicRegistry.current();
      if (!c || c.id !== rid) TopicRegistry.setTopic(rid);
      goView(homeTabKeys[key]);
      return;
    }
    /* everything else (/ \ ? d g) is topic-agnostic and falls through unchanged */
  }

  /* g starts the guided tour */
  if (key === 'g') { if (window.TourGuide) window.TourGuide.start(); return; }
  /* p opens the per-topic session panel (Progress) */
  if (key === 'p') { var _sp = document.getElementById('sessopen'); if (_sp) _sp.click(); return; }
  /* q..o jump straight to a pane (the QWERTY row mirrors the tab order) */
  const tabKeys = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open', v: 'viz' };
  if (tabKeys[key]) { goView(tabKeys[key]); return; }
  if (key === 'd') { if (window.Density) window.Density.cycle(); return; }  /* d cycles density: default -> compact -> cozy */
  if (key === '/') { event.preventDefault(); if (window.SearchOverlay && window.SearchOverlay.open) window.SearchOverlay.open(); return; }
  if (key === '[') { if (window.stepTopic) window.stepTopic(-1); return; }
  if (key === ']') { if (window.stepTopic) window.stepTopic(1); return; }
  if (key === '\\') { event.preventDefault(); if (window.IndexOverlay && window.IndexOverlay.open) window.IndexOverlay.open(); return; }
  if (current === 'walk') {
    /* arrows step through the walkthrough (bounds handled inside prev/next) */
    const w = document.querySelector('#walk deep-walkthrough');
    if (w) {
      if (event.key === 'ArrowLeft') w.prev();
      if (event.key === 'ArrowRight') w.next();
    }
  } else if (current === 'drill') {
    /* space/enter advances; 1/2/3 self-grade (missed/shaky/solid) -- the controls live in the
       drill's shadow now, so reach through it rather than the document */
    const dd = document.querySelector('#drill deep-drill');
    if (dd) {
      const r = dd.shadowRoot;
      const advBtn = r.getElementById('adv');
      /* Space/Enter advance the drill ONLY when focus is not on some other control.
         This used to be gated on the active PANE alone, so while the drill was showing it
         preventDefault()-ed and swallowed EVERY Enter and EVERY Space in the document and
         redirected it into #adv: you could Tab 27 times to the "Whiteboard" pane button,
         press Enter, and stay on the drill. The visible pane switcher -- and every other
         control in the app -- was dead to the keyboard, and the only way out was a letter
         shortcut nobody is told about. (It went dormant at the grading stage only because
         #adv and the judge row are mutually exclusive, which is why casual testing missed
         it.) Gate on FOCUS: if the key belongs to the focused control, let it have it --
         the browser then activates that control natively, exactly once.
         Focus on <body>/the drill surface still advances, so the drill's own flow is intact. */
      if ((event.key === ' ' || event.key === 'Enter') && window.KeyGuard.ownsActivationKeys(event)) {
        if (advBtn) { event.preventDefault(); advBtn.click(); }
        else {
          /* W1 keymap extension: at the debrief (no #adv), Space/Enter take the ONE forward
             hand-off -- the strip's .flow-go (clean debrief / #vrestart verdict) or #dweak (shaky),
             the SELF-deduped affordance -- so the debrief's next step is reachable without a
             pointer, else the restart. Same focus gate: a focused control keeps its own keys. */
          var fwd = r.querySelector('.flow-go') || r.getElementById('dweak') || r.getElementById('drestart') || r.getElementById('vrestart');
          if (fwd) { event.preventDefault(); fwd.click(); }
        }
      }
      if (key === '1') { const jmBtn = r.getElementById('jm'); if (jmBtn) jmBtn.click(); }
      if (key === '2') { const jsBtn = r.getElementById('js'); if (jsBtn) jsBtn.click(); }
      if (key === '3') { const jgBtn = r.getElementById('jg'); if (jgBtn) jgBtn.click(); }
    }
  }
});
/* Modal focus management: dialogs are aria-modal, so trap Tab inside the open
   overlay and restore focus to the trigger when it closes. The overlay set is
   derived from the DOM &mdash; every [role=dialog][aria-modal] is auto-covered, so a
   newly added overlay can never be forgotten (the old keyov/mixov bug class). */
(function () {
  const overlays = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"][aria-modal="true"]'));
  let returnFocusTo = null;
  const FOCUS_SEL = 'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])';

  /* THE SHADOW BOUNDARY, INSIDE THE FOCUS TRAP ITSELF.
     Every one of these dialogs hosts its BODY in a shadow root -- <deep-mock-run>, <deep-cram>,
     <deep-session>, <deep-mixed-fire>, <deep-keyboard>, <deep-scope>, <deep-gameplan>. And
     querySelectorAll DOES NOT CROSS INTO A SHADOW ROOT. So this list used to contain only the
     light-DOM chrome, and the wrap below then computed first/last from it:

       mock run / session / mixed fire / keyboard -> exactly ONE light-DOM focusable, the close
       button. first === last === #mockx, so EVERY Tab hit `!shiftKey && active === last` and was
       preventDefault()-ed straight back onto it. MEASURED: 1 distinct tab stop across 8 presses.
       The entire dialog body -- the mock run's Reveal/Next, the end screen's score buttons and
       "Run again", the session tracker's controls -- was UNREACHABLE BY KEYBOARD.
       cram / game plan / scope -> the ring cycled the light-DOM chrome and wrapped at the last
       one, so their shadow content was skipped too. All seven were affected.

     A light-DOM scan of a shadow-DOM app is a no-op that LOOKS done. Walk the roots. */
  function getFocusable(overlay) {
    const out = [];
    (function walk(node) {
      const kids = node.children;
      for (let i = 0; i < kids.length; i++) {
        const el = kids[i];
        if (el.matches && el.matches(FOCUS_SEL) && !el.disabled && el.offsetParent !== null) out.push(el);
        /* shadow content is sequentially focused AT THE HOST'S POSITION -- recurse there, so this
           list stays in true tab order and first/last are the real ends of the ring. */
        if (el.shadowRoot) walk(el.shadowRoot);
        walk(el);
      }
    })(overlay);
    return out;
  }
  /* `overlay.contains(node)` is FALSE for a node inside the overlay's own shadow root -- contains()
     stops at the boundary too. Hop out through each root's host until we reach the light tree. */
  function deepContains(overlay, node) {
    let n = node;
    while (n) {
      if (overlay.contains(n)) return true;
      const root = n.getRootNode && n.getRootNode();
      n = root && root.host;
    }
    return false;
  }
  /* whichever overlay is currently INTERACTIVE, or null. `.open:not(.closing)` -- the same
     invariant again: Tab must not be trapped inside, and Escape must not target, a dialog that is
     already fading out and already non-interactive. */
  function openOverlay() {
    for (let i = 0; i < overlays.length; i++) {
      const o = overlays[i];
      if (o.classList.contains('open') && !o.classList.contains('closing')) return o;
    }
    return null;
  }
  /* Watch each overlay's class: on open, remember the trigger and move focus in; on close, restore it.
     THE PREDICATE IS `.open:not(.closing)` -- the same INTERACTIVITY INVARIANT the CSS and the
     global keymap read (see styles.css). It used to be `.open` alone, which is not removed until
     the fade-out FINISHES: ovHide() holds it for up to 500ms. So focus stayed parked on a button
     inside a dialog that was already invisible and already non-interactive, and only left when the
     browser reset it at display:none. Reading `.closing` restores focus to the trigger the instant
     the dialog stops being interactive -- so focus is never inside a layer the user cannot use.
     Caught by test/overlay_deadzone.cjs, which asserts it for every [role=dialog][aria-modal]. */
  overlays.forEach(function (overlay) {
    const interactive = function () { return overlay.classList.contains('open') && !overlay.classList.contains('closing'); };
    overlay.__open = interactive();
    new MutationObserver(function () {
      const isOpen = interactive();
      if (isOpen && !overlay.__open) {
        overlay.__open = true;
        returnFocusTo = document.activeElement;
        setTimeout(function () {
          /* AN OVERLAY MAY NOMINATE ITS OWN INITIAL FOCUS TARGET, and the mock run does.
             Defaulting to focusable[0] means landing the user on the CLOSE BUTTON -- it is the
             first thing in .mock-top in every one of these dialogs. For a dialog that is just a
             document (cram, keyboard, game plan) that is harmless. For the mock run it is the
             whole bug: focus parked on a control means the run's own Space/Enter cannot be
             gated on focus without killing them, which is exactly why this defect survived a
             one-line fix. The run nominates its SURFACE instead (see mock-run/logic.js). */
          const want = (typeof overlay.__initialFocus === 'function' && overlay.__initialFocus()) || getFocusable(overlay)[0];
          if (want) { try { want.focus(); } catch (e) {} }
        }, 0);
      } else if (!isOpen && overlay.__open) {
        overlay.__open = false;
        const a = window.KeyGuard.deepActiveElement();
        if (a && a.blur && deepContains(overlay, a)) { try { a.blur(); } catch (e) {} }
        if (returnFocusTo && returnFocusTo.focus && returnFocusTo !== document.body && returnFocusTo !== document.documentElement) {
          try { returnFocusTo.focus(); } catch (e) {}
        }
        returnFocusTo = null;
      }
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  });
  /* Tab / Shift-Tab cycle within the open overlay.
     `active` MUST be the DEEP active element: document.activeElement stops at the shadow HOST, so
     with a shadow-aware `focusable` list it would never equal first or last (they are the real
     nodes, inside the root) and the ring would never wrap -- Tab would walk straight out of the
     modal into the page behind it. Read through the boundary on BOTH sides or not at all. */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    const overlay = openOverlay();
    if (!overlay) return;
    const focusable = getFocusable(overlay);
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    const active = window.KeyGuard.deepActiveElement();
    if (!deepContains(overlay, active)) { event.preventDefault(); first.focus(); return; }
    if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  }, true);
  /* unified Escape: close whichever overlay is open via its own close button */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const overlay = openOverlay();
    if (!overlay) return;
    const closeBtn = overlay.querySelector('.mock-x,.cram-x');
    if (closeBtn) closeBtn.click();
  });
})();

/* ===== shell: mobile tools sheet (v75) ===== */
/* The floating "tools" button toggles the mock-bar sheet on mobile; a click
   outside it (or on any sheet button other than the toggles) closes it.
   CSS handles visibility via transform:translateY(115%) -> transform:none
   with a var(--duration-moderate) var(--ease-base) transition. No display manipulation needed. */
(function () {
  const toolsFab = document.getElementById('toolsfab');
  const mockbar = document.querySelector('.mockbar');

  /* The sheet's bottom scroll cue (visual-sweep row 17). The vertical sibling of v80's --fl/--fr:
     --fb is 24px while rows are still hidden below the sheet's fold, 0px once the scroll bottoms
     out; the mobile-only .sidebar .mockbar::after in styles.css turns any positive flag into the
     bottom scrim and collapses it at 0. Why the sheet needs its own flag rather than reusing
     v80's: that block is scoped to the .seg strip and its axis is horizontal. The initial call
     is honest even though the sheet boots translated off-screen -- transform skips layout, so
     scrollHeight/clientHeight are already real. On desktop the mockbar is not a scroller
     (the .sidebar is), so the flag rests at 0px and the ::after does not exist there anyway. */
  function updateSheetCue() {
    if (!mockbar) return;   /* same null-tolerance as every other lookup in this block */
    const more = mockbar.scrollTop + mockbar.clientHeight < mockbar.scrollHeight - 4;
    mockbar.style.setProperty('--fb', more ? '24px' : '0px');
  }

  function openMockbar() {
    document.body.classList.add('tools-open');
    updateSheetCue();   /* row set can have changed since boot (text zoom, font swap) */
  }

  function closeMockbar() {
    document.body.classList.remove('tools-open');
  }

  if (mockbar) {
    mockbar.addEventListener('scroll', updateSheetCue, { passive: true });
    window.addEventListener('resize', updateSheetCue);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateSheetCue);
    updateSheetCue();
  }

  if (toolsFab) {
    toolsFab.addEventListener('click', function (event) {
      event.stopPropagation();
      if (document.body.classList.contains('tools-open')) {
        closeMockbar();
      } else {
        openMockbar();
      }
    });
  }
  
  document.addEventListener('click', function (event) {
    if (!document.body.classList.contains('tools-open')) return;
    if (mockbar && mockbar.contains(event.target)) return;
    if (toolsFab && toolsFab.contains(event.target)) return;
    closeMockbar();
  });
  
  if (mockbar) {
    mockbar.addEventListener('click', function (event) {
      const btn = event.target.closest && event.target.closest('button');
      if (!btn) return;
      if (btn.id === 'inttog' || btn.id === 'themetog') return;
      closeMockbar();
    });
  }
})();


/* ===== v76: reset scroll to top on view switch -- now handled inside
   switchTab(), so it applies to every navigation path (click, keyboard,
   router back/forward, search, tour), not just nav clicks. ===== */


/* ===== v77: stage header sync ===== */
(function(){
  /* The rail's per-view slots: the desktop companion and the mobile <details> mirror.
     Column index is the cmpNotes tuple index -- 0 = view title, 1 = note, 2 = the move. */
  const CMP_SLOTS = [['cmpView', 'cmpNote', 'cmpMove'], ['mCmpView', 'mCmpNote', 'mCmpMove']];

  /* The ACTIVE topic's coaching map. The registry OWNS the current topic, so its identity is the
     only source that cannot go stale; TOPIC_CMP_NOTES is the same object republished by
     applyIdentity, kept as the fallback for the boot window before any topic registers.
     Returns null ONLY when there is no topic at all -- index.html's hard-coded first paint is the
     truth then, and blanking it would leave the rail empty on load. */
  function activeCmpNotes() {
    const t = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    if (t) return (t.identity && t.identity.cmpNotes) || {};
    if (typeof TOPIC_CMP_NOTES !== 'undefined' && TOPIC_CMP_NOTES && Object.keys(TOPIC_CMP_NOTES).length) return TOPIC_CMP_NOTES;
    return null;
  }

  /* Write one (topic, view) note into the rail -- or, for `null`, write its ABSENCE.
     There is no such thing as a safe stale note: leaving the DOM untouched when a topic authors
     no note for the active pane is what put ANOTHER TOPIC'S coaching on screen for 266 of the 414
     combos (the 38 compiled topics author only walk + drill). So absence is rendered explicitly:
       - blank the text, so no foreign string survives in the DOM even unrendered -- a leak becomes
         structurally impossible rather than merely invisible, and no later CSS or media-query
         change can resurrect one;
       - fold the two per-view blocks away, so the rail closes up instead of showing headed empty
         boxes. The topic-level blocks (thesis, spine, related) are untouched and keep the rail
         useful, and the stage header still names the view -- nothing is lost.
     `hidden` is honoured because both blocks are LIGHT DOM and neither sets `display` in
     styles.css; test/rail_integrity.cjs asserts the computed display at runtime rather than
     trusting that. */
  function paintCmp(note) {
    for (let i = 0; i < CMP_SLOTS.length; i++) {
      for (let j = 0; j < CMP_SLOTS[i].length; j++) {
        const el = document.getElementById(CMP_SLOTS[i][j]);
        if (!el) continue;
        el.textContent = note ? note[j] : '';
        const block = el.closest('.cmp-block, .mcomp-block');
        if (block) block.hidden = !note;
      }
    }
  }

  /* PERF (perf/chunk-proto): restart the masthead entrance WITHOUT the classic
     `remove class; void offsetWidth; add class` trick. That offsetWidth read forces a
     FULL-DOCUMENT style+layout flush -- and upd() runs twice per topic entry and once
     per pane switch (measured 69-379ms per switch at 4x CPU; ~337ms of every entry
     task). Instead: the class is added ONCE (which starts the CSS animation), the
     resulting CSSAnimation object is captured on a later SETTLED frame (style is clean
     there, so getAnimations() flushes nothing), and every restart after that is
     cancel()+play() -- pure writes, zero style/layout reads on the switch path.
     Under prefers-reduced-motion the animation completes in .01ms and is gone by
     capture time, so headAnim stays null and nothing restarts -- exactly what the
     reduced-motion block demands (the old reflow trick also showed no motion there). */
  let headAnim = null, headAnimArmed = false;
  function armHeadAnim(stageHead) {
    if (headAnimArmed || headAnim) return;
    headAnimArmed = true;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      const list = (stageHead.getAnimations ? stageHead.getAnimations() : []);
      for (let i = 0; i < list.length; i++) {
        if (list[i].animationName === 'headin') { headAnim = list[i]; break; }
      }
      if (!headAnim) headAnimArmed = false;   /* finished too fast (throttled tab): retry on a later switch */
    }); });
  }
  /* Mirror the active tab's label into the stage header and the desktop +
     mobile "companion" panels (view name, note, and pivot move from cmpNotes). */
  function upd() {
    const activeBtn = document.querySelector('.sidebar .seg button.on');
    const stageHead = document.getElementById('stagehead');
    if (!activeBtn || !stageHead) return;
    const nameSpan = activeBtn.querySelector('span:not(.n)'), kickSpan = activeBtn.querySelector('.n');
    stageHead.textContent = '';
    const kickEl = document.createElement('div'); kickEl.className = 'sh-kick'; kickEl.textContent = kickSpan ? kickSpan.textContent : '';
    const nameEl = document.createElement('div'); nameEl.className = 'sh-name'; nameEl.textContent = nameSpan ? nameSpan.textContent : '';
    stageHead.appendChild(kickEl); stageHead.appendChild(nameEl);
    if (!stageHead.classList.contains('headin')) stageHead.classList.add('headin');
    else if (headAnim) { headAnim.cancel(); headAnim.play(); }
    armHeadAnim(stageHead);                    /* no-op once captured */
    const tab = activeBtn.getAttribute('data-tab');
    const notes = activeCmpNotes();
    if (!notes) return;                 /* no topic yet -- leave the first-paint markup alone */
    paintCmp(notes[tab] || null);       /* the `else` that was missing: no note -> clear + fold */
  }
  /* switchTab() calls this on every navigation path (click, keyboard, router
     back/forward, search, tour), so the companion stays in sync everywhere -- a
     plain nav-click listener used to miss keyboard and routed navigation. */
  window.__syncCompanion = upd;
  upd();
})();

/* v80: mobile nav strip &mdash; fade the scroll edges and keep the active view in view */
(function () {
  const strip = document.querySelector('.sidebar .seg');
  if (!strip) return;
  /* show a fade hint on whichever edge still has strip to scroll toward */
  function updateFades() {
    const scrolledLeft = strip.scrollLeft > 4;
    const scrolledRight = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4;
    strip.style.setProperty('--fl', scrolledLeft ? '24px' : '0px');
    strip.style.setProperty('--fr', scrolledRight ? '24px' : '0px');
  }
  /* on mobile, scroll the active button back into view if it's clipped */
  function ensureActiveVisible() {
    if (!window.matchMedia('(max-width:919px)').matches) return;
    const activeBtn = strip.querySelector('button.on');
    if (!activeBtn) return;
    const stripRect = strip.getBoundingClientRect(), btnRect = activeBtn.getBoundingClientRect();
    if (btnRect.left < stripRect.left + 10 || btnRect.right > stripRect.right - 10) {
      activeBtn.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }
  }
  strip.addEventListener('scroll', updateFades, { passive: true });
  window.addEventListener('resize', function () { updateFades(); });
  const buttons = strip.querySelectorAll('button');
  for (let i = 0; i < buttons.length; i++) buttons[i].addEventListener('click', function () { setTimeout(function () { updateFades(); ensureActiveVisible(); }, 30); });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(updateFades); }
  updateFades();
})();


