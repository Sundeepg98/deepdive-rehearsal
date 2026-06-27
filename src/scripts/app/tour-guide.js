/* ===== TourGuide =====
   Interactive onboarding tour with spotlight, tooltips, and smooth
   transitions. Highlights key UI elements, explains navigation,
   keyboard shortcuts, and features.

   Features:
   - Spotlight overlay (darkens everything except highlighted element)
   - Animated tooltips with explanations
   - Progress dots and step counter
   - Keyboard: ArrowRight/ArrowLeft for navigation, Escape to dismiss
   - Remembers dismissal in sessionStorage
   - Smooth CSS transitions between steps

   Usage:
     TourGuide.start();   // Start the tour
     TourGuide.destroy(); // End and clean up
*/

(function () {
  'use strict';

  /* ----- configuration ----- */
  var STORAGE_KEY = '_tour_dismissed';
  var SPOTLIGHT_PADDING = 12;
  var TOOLTIP_WIDTH = 340;

  /* ----- tour steps ----- */
  var STEPS = [
    {
      selector: '.hdr h1',
      title: 'Welcome to Deep Rehearsal',
      text: 'Your complete interview preparation system. 9 modules to master the Content Pipeline deep-dive.',
      position: 'bottom'
    },
    {
      selector: '.seg',
      title: 'Navigation',
      text: 'Switch between modules. Each tab represents a different interview section. Try keyboard shortcuts: Q, W, E, R...',
      position: 'bottom'
    },
    {
      selector: '.companion',
      title: 'Companion Panel',
      text: 'Quick reference, keyboard shortcuts, and study aids. Always visible on desktop.',
      position: 'left'
    },
    {
      selector: 'deep-walkthrough',
      title: 'Walkthrough',
      text: 'The main study guide. Step through each section with arrow keys or click the dots.',
      position: 'right'
    },
    {
      selector: '.stage-head .sh-name',
      title: 'Context Header',
      text: 'Shows your current position in the interview flow. Changes as you navigate.',
      position: 'bottom'
    },
    {
      selector: '.tools-fab',
      title: 'Tools',
      text: 'Access practice tools, mock runs, and configuration options.',
      position: 'top'
    },
    {
      selector: '.seg button[data-tab="drill"]',
      title: 'Probe Drill',
      text: 'Practice answering probing questions with model answers and self-assessment.',
      position: 'bottom'
    },
    {
      selector: null,  // fullscreen final step
      title: 'You\'re Ready!',
      text: 'Use keyboard shortcuts (Q-W-E-R-T-Y-U-I-O) for rapid navigation. Press Escape anytime to close overlays. Good luck!',
      position: 'center'
    }
  ];

  /* ----- state ----- */
  var currentStep = -1;
  var overlayEl = null;
  var spotlightEl = null;
  var tooltipEl = null;
  var isActive = false;

  /* ----- create DOM elements ----- */
  function createElements() {
    if (overlayEl) return;

    // Dark overlay
    overlayEl = document.createElement('div');
    overlayEl.id = '_tour-overlay';
    overlayEl.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.55);opacity:0;transition:opacity .5s ease;pointer-events:none';

    // Spotlight (hole in overlay)
    spotlightEl = document.createElement('div');
    spotlightEl.id = '_tour-spotlight';
    spotlightEl.style.cssText = 'position:fixed;z-index:201;border-radius:16px;box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 0 40px rgba(83,74,183,.3);transition:all .6s cubic-bezier(.22,.61,.36,1);pointer-events:none;opacity:0';

    // Tooltip
    tooltipEl = document.createElement('div');
    tooltipEl.id = '_tour-tooltip';
    tooltipEl.style.cssText = 'position:fixed;z-index:202;width:' + TOOLTIP_WIDTH + 'px;background:linear-gradient(135deg,#fff 0%,#faf8f4 100%);border:1px solid var(--bd);border-radius:20px;padding:24px;box-shadow:0 20px 60px -20px rgba(0,0,0,.3),0 0 0 1px rgba(83,74,183,.08);opacity:0;transform:translateY(20px) scale(.96);transition:all .5s cubic-bezier(.22,.61,.36,1);pointer-events:auto';

    document.body.appendChild(overlayEl);
    document.body.appendChild(spotlightEl);
    document.body.appendChild(tooltipEl);
  }

  /* ----- position spotlight around element ----- */
  function positionSpotlight(selector) {
    if (!selector) {
      // Center spotlight for fullscreen step
      var cx = window.innerWidth / 2;
      var cy = window.innerHeight / 2;
      var size = Math.min(window.innerWidth, window.innerHeight) * 0.3;
      spotlightEl.style.left = (cx - size/2) + 'px';
      spotlightEl.style.top = (cy - size/2) + 'px';
      spotlightEl.style.width = size + 'px';
      spotlightEl.style.height = size + 'px';
      spotlightEl.style.borderRadius = '50%';
      return { x: cx, y: cy + size/2 + 20 };
    }

    var el = document.querySelector(selector);
    if (!el) return null;

    var rect = el.getBoundingClientRect();
    var left = rect.left - SPOTLIGHT_PADDING;
    var top = rect.top - SPOTLIGHT_PADDING;
    var width = rect.width + SPOTLIGHT_PADDING * 2;
    var height = rect.height + SPOTLIGHT_PADDING * 2;

    spotlightEl.style.left = left + 'px';
    spotlightEl.style.top = top + 'px';
    spotlightEl.style.width = width + 'px';
    spotlightEl.style.height = height + 'px';
    spotlightEl.style.borderRadius = '16px';

    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height + 20,
      rect: rect
    };
  }

  /* ----- position tooltip ----- */
  function positionTooltip(pos, step) {
    var left, top;
    var tw = TOOLTIP_WIDTH;

    if (step.position === 'center' || !step.selector) {
      left = (window.innerWidth - tw) / 2;
      top = (window.innerHeight - 200) / 2;
    } else if (step.position === 'top') {
      left = Math.max(20, Math.min(window.innerWidth - tw - 20, pos.x - tw / 2));
      top = Math.max(20, pos.rect.top - 220);
    } else if (step.position === 'left') {
      left = Math.max(20, pos.rect.left - tw - 20);
      top = Math.max(20, Math.min(window.innerHeight - 250, pos.y - 100));
    } else if (step.position === 'right') {
      left = Math.min(window.innerWidth - tw - 20, pos.rect.right + 20);
      top = Math.max(20, Math.min(window.innerHeight - 250, pos.y - 100));
    } else {
      // bottom (default)
      left = Math.max(20, Math.min(window.innerWidth - tw - 20, pos.x - tw / 2));
      top = Math.min(window.innerHeight - 250, pos.y);
    }

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  /* ----- build tooltip content ----- */
  function buildTooltip(step, index) {
    var total = STEPS.length;
    var dots = '';
    for (var i = 0; i < total; i++) {
      dots += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px;background:' + (i === index ? 'var(--acc)' : 'var(--bd)') + ';transition:background .3s ease"></span>';
    }

    tooltipEl.innerHTML =
      '<div style="font:800 15px -apple-system,sans-serif;color:var(--ink);margin-bottom:8px;letter-spacing:-.3px">' + step.title + '</div>' +
      '<div style="font-size:13px;color:var(--mut);line-height:1.55;margin-bottom:16px">' + step.text + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center">' + dots + '</div>' +
        '<div style="display:flex;gap:8px">' +
          (index > 0 ? '<button id="_tour-prev" style="background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:6px 14px;font:650 12px -apple-system,sans-serif;color:var(--mut);cursor:pointer;transition:all .2s ease">Prev</button>' : '') +
          '<button id="_tour-next" style="background:linear-gradient(135deg,var(--accent) 0%,var(--accent2) 100%);border:none;border-radius:10px;padding:6px 18px;font:650 12px -apple-system,sans-serif;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(83,74,183,.3);transition:all .2s ease">' + (index < total - 1 ? 'Next' : 'Finish') + '</button>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--mut2);margin-top:10px;text-align:right">' + (index + 1) + ' / ' + total + '</div>';

    // Bind buttons
    var prevBtn = document.getElementById('_tour-prev');
    var nextBtn = document.getElementById('_tour-next');
    if (prevBtn) prevBtn.onclick = function () { goToStep(index - 1); };
    if (nextBtn) nextBtn.onclick = function () { if (index < total - 1) goToStep(index + 1); else destroy(); };
  }

  /* ----- go to specific step ----- */
  function goToStep(index) {
    if (index < 0 || index >= STEPS.length) return;
    currentStep = index;
    var step = STEPS[index];

    // Hide tooltip briefly for transition
    tooltipEl.style.opacity = '0';
    tooltipEl.style.transform = 'translateY(20px) scale(.96)';

    setTimeout(function () {
      var pos = positionSpotlight(step.selector);
      if (pos) positionTooltip(pos, step);
      buildTooltip(step, index);

      // Show
      requestAnimationFrame(function () {
        spotlightEl.style.opacity = '1';
        tooltipEl.style.opacity = '1';
        tooltipEl.style.transform = 'translateY(0) scale(1)';
      });
    }, 300);
  }

  /* ----- start tour ----- */
  function start() {
    if (isActive) return;
    // Check if dismissed
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch (e) {}

    isActive = true;
    createElements();

    // Show overlay
    requestAnimationFrame(function () {
      overlayEl.style.opacity = '1';
      overlayEl.style.pointerEvents = 'auto';
    });

    goToStep(0);
  }

  /* ----- destroy tour ----- */
  function destroy() {
    if (!isActive) return;
    isActive = false;

    if (spotlightEl) spotlightEl.style.opacity = '0';
    if (tooltipEl) tooltipEl.style.opacity = '0';
    if (overlayEl) overlayEl.style.opacity = '0';

    setTimeout(function () {
      if (overlayEl) { overlayEl.style.pointerEvents = 'none'; }
    }, 500);

    // Remember dismissal
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}

    currentStep = -1;
  }

  /* ----- keyboard handlers ----- */
  function onKeyDown(e) {
    if (!isActive) return;
    if (e.key === 'Escape') { destroy(); return; }
    if (e.key === 'ArrowRight') { goToStep(currentStep + 1); return; }
    if (e.key === 'ArrowLeft') { goToStep(currentStep - 1); return; }
  }

  document.addEventListener('keydown', onKeyDown);

  /* ----- public API ----- */
  window.TourGuide = {
    start: start,
    destroy: destroy,
    goToStep: goToStep,
    isActive: function () { return isActive; },
    reset: function () {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
  };

  /* ----- auto-start on first visit (after delay) ----- */
  setTimeout(function () {
    if (!window.TourGuide.isActive()) {
      window.TourGuide.start();
    }
  }, 3000);

})();
