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
document.addEventListener('keydown', function (event) {
  const activeTag = (event.target.tagName || '').toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea') return;
  if (window.TourGuide && window.TourGuide.isActive()) return;
  if (window.SearchOverlay && window.SearchOverlay.isOpen && window.SearchOverlay.isOpen()) return;
  var _openDlgs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  for (var _oi = 0; _oi < _openDlgs.length; _oi++) { if (_openDlgs[_oi].classList.contains('open')) return; }
  if (event.key === '?') { event.preventDefault(); openKeys(); return; }
  const key = event.key.toLowerCase();
  /* g starts the guided tour */
  if (key === 'g') { if (window.TourGuide) window.TourGuide.start(); return; }
  /* q..o jump straight to a pane (the QWERTY row mirrors the tab order) */
  const tabKeys = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open' };
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
      if ((event.key === ' ' || event.key === 'Enter') && advBtn) { event.preventDefault(); advBtn.click(); }
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
  /* the tabbable, visible elements inside an overlay */
  function getFocusable(overlay) {
    const nodes = overlay.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(nodes, function (el) { return !el.disabled && el.offsetParent !== null; });
  }
  /* whichever overlay is currently open, or null */
  function openOverlay() { for (let i = 0; i < overlays.length; i++) if (overlays[i].classList.contains('open')) return overlays[i]; return null; }
  /* watch each overlay's class: on open, remember the trigger and move focus in; on close, restore it */
  overlays.forEach(function (overlay) {
    overlay.__open = overlay.classList.contains('open');
    new MutationObserver(function () {
      const isOpen = overlay.classList.contains('open');
      if (isOpen && !overlay.__open) {
        overlay.__open = true;
        returnFocusTo = document.activeElement;
        setTimeout(function () { const focusable = getFocusable(overlay); if (focusable.length) focusable[0].focus(); }, 0);
      } else if (!isOpen && overlay.__open) {
        overlay.__open = false;
        if (returnFocusTo && returnFocusTo.focus) { try { returnFocusTo.focus(); } catch (e) {} }
        returnFocusTo = null;
      }
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  });
  /* Tab / Shift-Tab cycle within the open overlay */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    const overlay = openOverlay();
    if (!overlay) return;
    const focusable = getFocusable(overlay);
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1], active = document.activeElement;
    if (!overlay.contains(active)) { event.preventDefault(); first.focus(); return; }
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
  
  function openMockbar() {
    document.body.classList.add('tools-open');
  }
  
  function closeMockbar() {
    document.body.classList.remove('tools-open');
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
    stageHead.classList.remove('headin'); void stageHead.offsetWidth; stageHead.classList.add('headin');
    const tab = activeBtn.getAttribute('data-tab');
    const deskView = document.getElementById('cmpView'), deskNote = document.getElementById('cmpNote'), deskMove = document.getElementById('cmpMove');
    const mobileView = document.getElementById('mCmpView'), mobileNote = document.getElementById('mCmpNote'), mobileMove = document.getElementById('mCmpMove');
    if (TOPIC_CMP_NOTES[tab]) {
      if (deskView) deskView.textContent = TOPIC_CMP_NOTES[tab][0];
      if (deskNote) deskNote.textContent = TOPIC_CMP_NOTES[tab][1];
      if (deskMove) deskMove.textContent = TOPIC_CMP_NOTES[tab][2];
      if (mobileView) mobileView.textContent = TOPIC_CMP_NOTES[tab][0];
      if (mobileNote) mobileNote.textContent = TOPIC_CMP_NOTES[tab][1];
      if (mobileMove) mobileMove.textContent = TOPIC_CMP_NOTES[tab][2];
    }
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


