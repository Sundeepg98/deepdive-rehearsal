/* ===== IndexOverlay =====
   THE TOPIC SWITCHER. Every registered topic, grouped by the six thematic groups: the browse /
   jump surface for the full set. Trigger: the 'Topic index' button (#idxopen), the topic pill, or
   the backslash key. Selecting a topic switches via setTopic and closes.

   IT IS NO LONGER THE HOME. It used to be both -- a 46-topic library AND the curriculum
   dashboard -- inside one 84vh modal, and it was losing that fight badly: on a phone the panel
   headed "46 TOPICS ACROSS 6 GROUPS" rendered ONE topic card, with "Reset all saved progress"
   fully visible beneath it. The dashboard moved to the #home route (home-view.js); this got its
   box back. Both render from the SAME Panels module, so there is exactly one place that knows what
   a topic card looks like and exactly one handler that knows what clicking one means.

   It also no longer opens itself at boot. A modal that appears unrequested in front of first paint
   is a modal that eats the user's first tap -- and this one did, measurably. The home is a ROUTE,
   and a route cannot self-disarm the way the old `Store.keys('').length > 0` gate did (it was
   satisfied by the app's own `viewseen.*` write, so it fired exactly once per browser, ever).

   Theme-aware; offline-safe: no network, storage, or permission calls beyond Store. */
(function () {
  'use strict';
  var overlayEl = null, isOpen = false, hideTimer = null, _modal = null;

  function panelHtml() {
    var bks = (typeof groupedTopicIds === 'function') ? groupedTopicIds() : [];
    var n = 0; bks.forEach(function (b) { n += b.ids.length; });
    var head = '<div class="ix-head"><div><div class="ix-title">Topic index</div>' +
      '<div class="ix-sub">' + n + ' topic' + (n === 1 ? '' : 's') + ' across ' +
      bks.length + ' group' + (bks.length === 1 ? '' : 's') + '</div></div>' +
      '<button class="ix-x" type="button" aria-label="Close index">&#215;</button></div>';
    /* The actions go INSIDE the scroller (Panels.libraryHtml's `lead`), so they scroll away and
       give the library its box back. The dashboard is not here at all any more -- it is the home.
       Removing it is what makes this panel good at its actual job: it was a 46-topic library and a
       curriculum dashboard fighting over 84vh, and on a phone the library was losing 46-to-1. */
    return '<div class="ix-panel">' + head + Panels.libraryHtml(Panels.actionsHtml()) +
      Panels.footerHtml(false) + '</div>';
  }

  function render() {
    overlayEl.innerHTML = panelHtml();
    var filt = overlayEl.querySelector('.ix-filter');
    if (filt) setTimeout(function () { try { filt.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }

  function create() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.id = '_index-overlay';
    _modal = window.__overlayModal(overlayEl, close, function () { return isOpen; });
    overlayEl.className = 'ix-ov';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Topic index');
    document.body.appendChild(overlayEl);
    /* ONE handler, shared with the home. Picking a topic closes the switcher; the home stays put. */
    Panels.bind(overlayEl, {
      rerender: function () { overlayEl.innerHTML = panelHtml(); },
      onPick: close,
      onClose: close,
    });
  }

  function open() {
    if (isOpen) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    create();
    _modal.capture();
    isOpen = true;
    overlayEl.classList.remove('closing');   /* re-opened mid fade-out: it is interactive again */
    overlayEl.classList.add('open');
    render();
    requestAnimationFrame(function () { overlayEl.classList.add('vis'); });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlayEl.classList.remove('vis');
    /* `.closing` = PAINTED BUT NOT INTERACTIVE -- the same convention ovHide() already uses for
       mock/cram. Without it this overlay kept pointer-events:auto over the whole viewport for the
       full 220ms of its fade-out, and ate the user's next tap. See THE INTERACTIVITY INVARIANT in
       styles.css, and test/overlay_deadzone.cjs, which fails without it. */
    overlayEl.classList.add('closing');
    hideTimer = setTimeout(function () { if (overlayEl) overlayEl.classList.remove('open', 'closing'); hideTimer = null; }, 220);
    _modal.restore();
  }

  /* Escape while open: handled by __overlayModal (overlay-focus.js) */
  function wire() {
    var btn = document.getElementById('idxopen'); if (btn) btn.addEventListener('click', open);
    /* #homeBtn finally does what its aria-label has claimed all along: it goes HOME.
       It used to open this modal -- the label said "Home", the button said "topic index". */
    var hb = document.getElementById('homeBtn');
    if (hb) hb.addEventListener('click', function () { if (window.Router) Router.navigate('home'); });
    /* NO BOOT-OPEN GATE. It lived here; the #home route replaces it. */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.IndexOverlay = { open: open, close: close, isOpen: function () { return isOpen; }, exportBackup: Panels.downloadBackup };
})();
