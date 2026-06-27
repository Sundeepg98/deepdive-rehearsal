/* ===== View Transition Manager =====
   Smooth SPA-like transitions between views. Uses the View Transitions API
   when available (Chrome 111+), with a CSS animation fallback for all other
   browsers. The transition system integrates with the existing switchTab()
   function — no changes needed to component code.

   Features:
   - Cross-fade + slide-up animation between views
   - Scroll position memory (each view remembers its scroll)
   - Loading indicator for slow-render views
   - Keyboard navigation debounce (prevents rapid-fire switching)
   - Graceful degradation: works in all browsers */

(function () {
  'use strict';

  /* ----- configuration ----- */
  var DURATION = 280;          // transition duration in ms
  var EASING = 'cubic-bezier(.22,.61,.36,1)'; // ease-out-cubic
  var STAGGER = 40;            // delay between outgoing and incoming

  /* ----- state ----- */
  var scrollMemory = {};       // per-view scroll positions
  var isTransitioning = false; // lock during transition
  var loadingEl = null;        // lazy-created loading indicator

  /* ----- loading indicator ----- */
  function getLoadingEl() {
    if (loadingEl) return loadingEl;
    loadingEl = document.createElement('div');
    loadingEl.id = '_vt-loading';
    loadingEl.innerHTML = '<span></span><span></span><span></span>';
    loadingEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:90;display:none;gap:6px;pointer-events:none';
    var st = document.createElement('style');
    st.textContent = '#_vt-loading{display:flex!important;opacity:0;transition:opacity .15s ease}#_vt-loading._vt-show{opacity:1}#_vt-loading span{width:8px;height:8px;border-radius:50%;background:var(--acc);animation:_vt-bounce 1.4s ease-in-out infinite both}#_vt-loading span:nth-child(1){animation-delay:-.32s}#_vt-loading span:nth-child(2){animation-delay:-.16s}@keyframes _vt-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}';
    document.head.appendChild(st);
    document.body.appendChild(loadingEl);
    return loadingEl;
  }
  function showLoading() { getLoadingEl().classList.add('_vt-show'); }
  function hideLoading() { getLoadingEl().classList.remove('_vt-show'); }

  /* ----- core: switch with animation ----- */
  function animateSwitch(targetTab, onComplete) {
    var stage = document.querySelector('.stage');
    var outgoing = document.querySelector('.pane.on');
    var incoming = document.getElementById(targetTab);
    if (!incoming) { onComplete(); return; }

    // Remember outgoing scroll
    if (outgoing && stage) scrollMemory[outgoing.id] = stage.scrollTop;

    isTransitioning = true;

    // Use View Transitions API if available
    if (document.startViewTransition) {
      document.startViewTransition(function () {
        onComplete();
        // Restore scroll after DOM update
        requestAnimationFrame(function () {
          if (stage && scrollMemory[targetTab] != null) {
            stage.scrollTop = scrollMemory[targetTab];
          }
        });
      });
      setTimeout(function () { isTransitioning = false; }, DURATION + STAGGER);
      return;
    }

    // CSS fallback: animate outgoing, swap, animate incoming
    if (outgoing) {
      outgoing.style.transition = 'opacity ' + (DURATION * 0.6) + 'ms ' + EASING + ', transform ' + DURATION + 'ms ' + EASING;
      outgoing.style.opacity = '0';
      outgoing.style.transform = 'translateY(-8px) scale(.995)';
    }

    setTimeout(function () {
      onComplete();

      // Prepare incoming for entrance
      if (incoming) {
        incoming.style.transition = 'none';
        incoming.style.opacity = '0';
        incoming.style.transform = 'translateY(12px) scale(.99)';
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (incoming) {
            incoming.style.transition = 'opacity ' + DURATION + 'ms ' + EASING + ', transform ' + DURATION + 'ms ' + EASING;
            incoming.style.opacity = '1';
            incoming.style.transform = 'translateY(0) scale(1)';
          }

          // Restore scroll
          if (stage && scrollMemory[targetTab] != null) {
            stage.scrollTop = scrollMemory[targetTab];
          }

          setTimeout(function () {
            if (incoming) {
              incoming.style.transition = '';
              incoming.style.transform = '';
              incoming.style.opacity = '';
            }
            isTransitioning = false;
          }, DURATION + 50);
        });
      });
    }, outgoing ? (DURATION * 0.6) : 0);
  }

  /* ----- public: switch view with transition ----- */
  window.switchView = function (targetTab) {
    if (isTransitioning || targetTab === window._currentTab) return;

    var btn = document.querySelector('.seg button[data-tab="' + targetTab + '"]');
    if (!btn) return;

    // Update nav buttons immediately (responsive feedback)
    var segBtns = document.querySelectorAll('.seg button');
    for (var i = 0; i < segBtns.length; i++) {
      segBtns[i].classList.toggle('on', segBtns[i].getAttribute('data-tab') === targetTab);
    }

    // Show loading for views that may render slowly
    showLoading();

    animateSwitch(targetTab, function () {
      // Execute the actual tab switch
      if (typeof switchTab === 'function') {
        // Override the button sync since we already did it
        var panes = document.querySelectorAll('.pane');
        var railEl = document.getElementById('rail');
        var railPos = { walk: 25, drill: 50, wb: 75, sys: 100, trade: 75, model: 75, num: 75, rf: 75, open: 75 };
        for (var j = 0; j < panes.length; j++) {
          panes[j].classList.toggle('on', panes[j].id === targetTab);
        }
        if (railEl) railEl.style.width = (railPos[targetTab] || 75) + '%';
        window._currentTab = targetTab;
      }
      hideLoading();
    });
  };

  /* ----- intercept existing switchTab calls ----- */
  // Store original for internal use
  var _origSwitchTab = window.switchTab;
  window.switchTab = function (t) {
    window.switchView(t);
  };

  /* ----- nav button click handlers ----- */
  function setupNavListeners() {
    var btns = document.querySelectorAll('.seg button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function () {
        window.switchView(this.getAttribute('data-tab'));
      };
    }
  }

  /* ----- keyboard debounce ----- */
  var keyDebounce = null;
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    var tabKeys = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open' };
    var target = tabKeys[e.key.toLowerCase()];
    if (!target) return;
    e.preventDefault();
    clearTimeout(keyDebounce);
    keyDebounce = setTimeout(function () {
      window.switchView(target);
    }, 80);
  });

  /* ----- init ----- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavListeners);
  } else {
    setupNavListeners();
  }
  window._currentTab = 'walk';

})();
