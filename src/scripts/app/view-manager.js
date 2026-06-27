/* ===== ViewManager =====
   Manages the 9-pane SPA lifecycle: enter/leave animations, state
   preservation, loading skeletons, and focus management. Integrates
   with HashRouter for route-driven view switching.

   Lifecycle per view switch:
   1. beforeLeave(current)  → save scroll, focus, details state
   2. beforeEnter(next)     → show skeleton, prepare DOM
   3. enter(next)           → animate in (cross-fade + slide)
   4. afterEnter(next)      → hide skeleton, restore scroll, set focus

   Features:
   - Transition lock prevents rapid-fire switching
   - Per-view scroll position memory
   - Per-view open <details> state memory
   - Loading skeleton with staggered pulse animation
   - Focus management (save/restore/initial)
   - ARIA live region for screen reader announcements */

(function () {
  'use strict';

  /* ----- config ----- */
  var ENTER_DURATION = 320;   // ms — view enter animation
  var LEAVE_DURATION = 200;   // ms — view leave animation
  var SKELETON_DELAY = 80;    // ms — before showing skeleton
  var STAGGER_CARD = 60;      // ms — between card entrances
  var EASING = 'cubic-bezier(.22,.61,.36,1)';

  /* ----- state ----- */
  var currentView = null;
  var isTransitioning = false;
  var viewStates = {};        // per-view state cache
  var skeletonEl = null;
  var liveRegion = null;

  /* ----- ARIA live region for announcements ----- */
  function getLiveRegion() {
    if (liveRegion) return liveRegion;
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(liveRegion);
    return liveRegion;
  }
  function announce(msg) {
    getLiveRegion().textContent = msg;
    setTimeout(function () { getLiveRegion().textContent = ''; }, 1000);
  }

  /* ----- loading skeleton ----- */
  function getSkeleton() {
    if (skeletonEl) return skeletonEl;
    skeletonEl = document.createElement('div');
    skeletonEl.id = '_vm-skeleton';
    skeletonEl.innerHTML =
      '<div class="_sk-head"><div class="_sk-line _sk-w40"></div><div class="_sk-line _sk-w60"></div></div>' +
      '<div class="_sk-card"><div class="_sk-line _sk-w80"></div><div class="_sk-line _sk-w100"></div><div class="_sk-line _sk-w70"></div></div>' +
      '<div class="_sk-card"><div class="_sk-line _sk-w60"></div><div class="_sk-line _sk-w90"></div><div class="_sk-line _sk-w50"></div></div>' +
      '<div class="_sk-card"><div class="_sk-line _sk-w70"></div><div class="_sk-line _sk-w80"></div><div class="_sk-line _sk-w40"></div></div>';
    var stage = document.querySelector('.stage');
    if (stage) stage.appendChild(skeletonEl);
    return skeletonEl;
  }
  function showSkeleton() {
    getSkeleton().classList.add('_sk-show');
    getSkeleton().classList.remove('_sk-hide');
  }
  function hideSkeleton() {
    if (!skeletonEl) return;
    skeletonEl.classList.add('_sk-hide');
    setTimeout(function () {
      if (skeletonEl) {
        skeletonEl.classList.remove('_sk-show', '_sk-hide');
        /* v221-fix: remove from DOM to prevent scroll overflow */
        if (skeletonEl.parentNode) skeletonEl.parentNode.removeChild(skeletonEl);
        skeletonEl = null;
      }
    }, 150);
  }

  /* ----- save/restore view state ----- */
  function saveViewState(viewId) {
    var pane = document.getElementById(viewId);
    var stage = document.querySelector('.stage');
    if (!pane || !stage) return;
    var openDetails = [];
    var details = pane.querySelectorAll('details[open]');
    for (var i = 0; i < details.length; i++) {
      // Check if details is inside a shadow DOM
      try { openDetails.push(details[i].getAttribute('data-id') || i); } catch (e) {}
    }
    viewStates[viewId] = {
      scrollTop: stage.scrollTop,
      timestamp: Date.now(),
      openDetails: openDetails
    };
    // Try to get sub-state from web components
    var wc = pane.querySelector(pane.tagName.toLowerCase().replace('div#', '').split('-')[0] ? '[class^="deep-"]' : '*');
    try {
      if (pane.id === 'walk') {
        var wt = pane.querySelector('deep-walkthrough');
        if (wt && wt.currentStep !== undefined) viewStates[viewId].step = wt.currentStep;
      }
      if (pane.id === 'drill') {
        var dd = pane.querySelector('deep-drill');
        if (dd && dd.currentIndex !== undefined) viewStates[viewId].probe = dd.currentIndex;
      }
    } catch (e) {}
  }
  function restoreViewState(viewId) {
    var state = viewStates[viewId];
    if (!state) return;
    var stage = document.querySelector('.stage');
    if (stage && state.scrollTop != null) {
      requestAnimationFrame(function () {
        stage.scrollTop = state.scrollTop;
      });
    }
  }

  /* ----- update nav buttons ----- */
  function updateNav(viewId) {
    var btns = document.querySelectorAll('.seg button, .sidebar .seg button');
    for (var i = 0; i < btns.length; i++) {
      var tab = btns[i].getAttribute('data-tab');
      btns[i].classList.toggle('on', tab === viewId);
    }
    // Update rail
    var rail = document.getElementById('rail');
    if (rail) {
      var positions = { walk: 25, drill: 50, wb: 75, sys: 100, trade: 75, model: 75, num: 75, rf: 75, open: 75 };
      rail.style.width = (positions[viewId] || 75) + '%';
    }
  }

  /* ----- update document title ----- */
  function updateTitle(route) {
    var base = 'Content Pipeline — Deep Rehearsal';
    if (route && route.route) {
      document.title = route.route.title + ' — ' + base;
    } else {
      document.title = base;
    }
  }

  /* ----- focus management ----- */
  var savedFocus = null;
  function saveFocus() {
    savedFocus = document.activeElement;
  }
  function restoreFocus() {
    if (savedFocus && savedFocus.focus) {
      try { savedFocus.focus(); } catch (e) {}
    }
    savedFocus = null;
  }
  function setInitialFocus(viewId) {
    var pane = document.getElementById(viewId);
    if (!pane) return;
    // Focus first interactive element
    var first = pane.querySelector('button, a, [tabindex]:not([tabindex="-1"])');
    if (first) {
      setTimeout(function () { first.focus({ preventScroll: true }); }, ENTER_DURATION + 50);
    }
  }

  /* ----- animate view enter ----- */
  function animateEnter(pane, done) {
    if (!pane) { done(); return; }
    pane.style.display = 'block';
    // Prepare for entrance
    pane.style.opacity = '0';
    pane.style.transform = 'translateY(16px) scale(.992)';
    pane.style.transition = 'none';
    pane.classList.add('on');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        pane.style.transition = 'opacity ' + ENTER_DURATION + 'ms ' + EASING + ', transform ' + ENTER_DURATION + 'ms ' + EASING;
        pane.style.opacity = '1';
        pane.style.transform = 'translateY(0) scale(1)';

        setTimeout(function () {
          pane.style.transition = '';
          pane.style.transform = '';
          pane.style.opacity = '';
          done();
        }, ENTER_DURATION + 30);
      });
    });
  }

  /* ----- animate view leave ----- */
  function animateLeave(pane, done) {
    if (!pane) { done(); return; }
    pane.style.transition = 'opacity ' + LEAVE_DURATION + 'ms ' + EASING + ', transform ' + LEAVE_DURATION + 'ms ' + EASING;
    pane.style.opacity = '0';
    pane.style.transform = 'translateY(-10px) scale(.995)';

    setTimeout(function () {
      pane.classList.remove('on');
      pane.style.display = 'none';
      pane.style.transition = '';
      pane.style.transform = '';
      pane.style.opacity = '';
      done();
    }, LEAVE_DURATION + 20);
  }

  /* ----- core: switch view ----- */
  function switchView(route) {
    if (!route || !route.view) return;
    var viewId = route.view;

    // Lock during transition
    if (isTransitioning) return;
    if (viewId === currentView) return;
    isTransitioning = true;

    var outgoingPane = currentView ? document.getElementById(currentView) : null;
    var incomingPane = document.getElementById(viewId);
    if (!incomingPane) { isTransitioning = false; return; }

    // v221-fix: On first navigation, clear any existing .on from HTML initial state
    if (!currentView) {
      var allPanes = document.querySelectorAll('.pane.on');
      for (var pi = 0; pi < allPanes.length; pi++) {
        if (allPanes[pi].id !== viewId) allPanes[pi].classList.remove('on');
      }
    }

    // 1. Before leave — save state
    if (currentView) saveViewState(currentView);
    saveFocus();

    // 2. Before enter — show skeleton, update nav
    var skeletonTimer = setTimeout(showSkeleton, SKELETON_DELAY);
    updateNav(viewId);
    updateTitle(route);

    // 3. Animate leave then enter
    animateLeave(outgoingPane, function () {
      // 4. Enter
      clearTimeout(skeletonTimer);
      hideSkeleton();
      animateEnter(incomingPane, function () {
        // 5. After enter
        restoreViewState(viewId);
        setInitialFocus(viewId);
        restoreFocus();
        announce('Navigated to ' + (route.route ? route.route.label : viewId));
        currentView = viewId;
        isTransitioning = false;
      });
    });
  }

  /* ----- handle deep-link sub-state ----- */
  function handleDeepLink(route) {
    if (!route.sub) return;
    var pane = document.getElementById(route.view);
    if (!pane) return;

    // Handle sub-state after view is rendered
    setTimeout(function () {
      // Walkthrough step: #walk/step-5
      var stepMatch = route.sub.match(/^step-(\d+)$/);
      if (stepMatch && route.view === 'walk') {
        var wt = pane.querySelector('deep-walkthrough');
        if (wt && wt.goTo) wt.goTo(parseInt(stepMatch[1], 10) - 1);
      }
      // Drill probe: #drill/probe-3
      var probeMatch = route.sub.match(/^probe-(\d+)$/);
      if (probeMatch && route.view === 'drill') {
        var dd = pane.querySelector('deep-drill');
        if (dd && dd.jumpTo) dd.jumpTo(parseInt(probeMatch[1], 10) - 1);
      }
    }, ENTER_DURATION + 100);
  }

  /* ----- init: subscribe to router ----- */
  function init() {
    if (!window.Router) return;
    window.Router.subscribe(function (route) {
      switchView(route);
      handleDeepLink(route);
    });
    // Override nav button clicks to use router
    var allNavBtns = document.querySelectorAll('.seg button, .sidebar .seg button');
    for (var i = 0; i < allNavBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function (e) {
          var tab = btn.getAttribute('data-tab');
          if (tab) {
            e.preventDefault();
            window.Router.navigate(tab);
          }
        });
      })(allNavBtns[i]);
    }
    // Override keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var tabKeys = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open' };
      var target = tabKeys[e.key.toLowerCase()];
      if (target && window.Router) {
        e.preventDefault();
        window.Router.navigate(target);
      }
    });
  }

  /* ----- public API ----- */
  window.ViewManager = {
    switchView: switchView,
    saveViewState: saveViewState,
    restoreViewState: restoreViewState,
    currentView: function () { return currentView; },
    isTransitioning: function () { return isTransitioning; },
    init: init
  };

})();
