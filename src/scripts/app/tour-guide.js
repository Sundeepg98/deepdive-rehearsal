/* ===== TourGuide =====
   Opt-in onboarding tour: a spotlight + tooltips that walk through navigation,
   keyboard shortcuts and the key surfaces.

   - Spotlight overlay (darkens everything except the highlighted element)
   - Progress dots + step counter, Prev/Next buttons
   - Keyboard: ArrowRight/ArrowLeft to step, Escape to dismiss
   - Started on demand via TourGuide.start() (wired to the "g" shortcut and the
     keyboard-shortcuts overlay). It does NOT auto-start, and dismissal is
     remembered only for the current page session (an in-memory flag).

   Offline-safe: no network, storage, or permission calls. */

(function () {
  'use strict';

  var SPOTLIGHT_PADDING = 12;
  var TOOLTIP_WIDTH = 340;
  var dismissed = false; /* in-memory only; no storage */

  var STEPS = [
    { selector: '.hdr h1', title: 'Welcome to Deep Rehearsal', text: 'A self-contained, offline trainer &mdash; a growing set of deep-dive topics, each with 9 rehearsal surfaces.', position: 'bottom' },
    { selector: '#topicnav', title: 'Topics', text: 'The trainer spans multiple topics, grouped into six themes. Switch with this control, the <b>[</b> and <b>]</b> keys, or the Topic index in the tools.', position: 'bottom' },
    { selector: '.seg', title: 'Surfaces', text: 'Nine surfaces per topic &mdash; walkthrough, drill, whiteboard, system map and more. Switch here or by key (<b>Q</b>&ndash;<b>O</b>).', position: 'bottom' },
    { selector: '.companion', title: 'Companion', text: 'Coaching for the current surface: the move to make and the spine of a strong answer.', position: 'left' },
    { selector: 'deep-walkthrough', title: 'Walkthrough', text: 'Step through the flow with the arrow keys or the on-screen controls.', position: 'right' },
    { selector: '.tools-fab', title: 'Tools', text: 'Mock run on the clock, mixed fire, cram sheet, session progress, the Topic index and search &mdash; all here.', position: 'top' },
    { selector: '.seg button[data-tab="drill"]', title: 'Probe Drill', text: 'Graded follow-ups with self-assessment. Press Space to reveal, 1/2 to grade.', position: 'bottom' },
    { selector: null, title: 'You are ready', text: 'Press <b>/</b> (or Cmd+K) to search topics and surfaces, <b>[</b> <b>]</b> to change topic, <b>?</b> for all shortcuts, Escape to close any overlay. Good luck.', position: 'center' }
  ];

  var currentStep = -1;
  var overlayEl = null, spotlightEl = null, tooltipEl = null;
  var isActive = false;

  function createElements() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.id = '_tour-overlay';
    overlayEl.style.cssText = 'position:fixed;inset:0;z-index:var(--z-modal);background:rgba(0,0,0,.55);opacity:0;transition:opacity .5s ease;pointer-events:none';

    spotlightEl = document.createElement('div');
    spotlightEl.id = '_tour-spotlight';
    spotlightEl.style.cssText = 'position:fixed;z-index:var(--z-modal-fore);border-radius:16px;box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 0 40px rgba(83,74,183,.3);transition:all .6s cubic-bezier(.22,.61,.36,1);pointer-events:none;opacity:0';

    tooltipEl = document.createElement('div');
    tooltipEl.id = '_tour-tooltip';
    tooltipEl.setAttribute('role', 'dialog');
    tooltipEl.setAttribute('aria-label', 'Tour step');
    tooltipEl.style.cssText = 'position:fixed;z-index:var(--z-modal-top);width:' + TOOLTIP_WIDTH + 'px;max-width:90vw;background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:var(--space-24);box-shadow:0 20px 60px -20px rgba(0,0,0,.4);opacity:0;transform:translateY(20px) scale(.96);transition:all .5s cubic-bezier(.22,.61,.36,1);pointer-events:auto';

    document.body.appendChild(overlayEl);
    document.body.appendChild(spotlightEl);
    document.body.appendChild(tooltipEl);
  }

  function positionSpotlight(selector) {
    if (!selector) {
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      var size = Math.min(window.innerWidth, window.innerHeight) * 0.3;
      spotlightEl.style.left = (cx - size / 2) + 'px';
      spotlightEl.style.top = (cy - size / 2) + 'px';
      spotlightEl.style.width = size + 'px';
      spotlightEl.style.height = size + 'px';
      spotlightEl.style.borderRadius = '50%';
      return { x: cx, y: cy + size / 2 + 20 };
    }
    var el = document.querySelector(selector);
    if (!el) return null;
    var rect = el.getBoundingClientRect();
    spotlightEl.style.left = (rect.left - SPOTLIGHT_PADDING) + 'px';
    spotlightEl.style.top = (rect.top - SPOTLIGHT_PADDING) + 'px';
    spotlightEl.style.width = (rect.width + SPOTLIGHT_PADDING * 2) + 'px';
    spotlightEl.style.height = (rect.height + SPOTLIGHT_PADDING * 2) + 'px';
    spotlightEl.style.borderRadius = '16px';
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height + 20, rect: rect };
  }

  function positionTooltip(pos, step) {
    var left, top, tw = TOOLTIP_WIDTH;
    if (step.position === 'center' || !step.selector) {
      left = (window.innerWidth - tw) / 2; top = (window.innerHeight - 200) / 2;
    } else if (step.position === 'top') {
      left = Math.max(20, Math.min(window.innerWidth - tw - 20, pos.x - tw / 2)); top = Math.max(20, pos.rect.top - 220);
    } else if (step.position === 'left') {
      left = Math.max(20, pos.rect.left - tw - 20); top = Math.max(20, Math.min(window.innerHeight - 250, pos.y - 100));
    } else if (step.position === 'right') {
      left = Math.min(window.innerWidth - tw - 20, pos.rect.right + 20); top = Math.max(20, Math.min(window.innerHeight - 250, pos.y - 100));
    } else {
      left = Math.max(20, Math.min(window.innerWidth - tw - 20, pos.x - tw / 2)); top = Math.min(window.innerHeight - 250, pos.y);
    }
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  /* tooltip content is built from the static STEPS table (no user input) */
  function buildTooltip(step, index) {
    var total = STEPS.length, dots = '';
    for (var i = 0; i < total; i++) {
      dots += '<span style="display:inline-block;width:var(--space-8);height:var(--space-8);border-radius:50%;margin:0 var(--space-4);background:' + (i === index ? 'var(--acc)' : 'var(--bd)') + ';transition:background .3s ease"></span>';
    }
    tooltipEl.innerHTML =
      '<div style="font:800 15px -apple-system,sans-serif;color:var(--ink);margin-bottom:var(--space-8);letter-spacing:-.3px">' + step.title + '</div>' +
      '<div style="font-size:var(--font-size-small);color:var(--mut);line-height:1.55;margin-bottom:var(--space-16)">' + step.text + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center">' + dots + '</div>' +
        '<div style="display:flex;gap:var(--space-8)">' +
          (index > 0 ? '<button type="button" id="_tour-prev" style="background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:var(--space-6) var(--space-14);font:650 12px -apple-system,sans-serif;color:var(--mut);cursor:pointer">Prev</button>' : '') +
          '<button type="button" id="_tour-next" style="background:linear-gradient(135deg,var(--acc) 0%,var(--acc2) 100%);border:none;border-radius:10px;padding:var(--space-6) var(--space-18);font:650 12px -apple-system,sans-serif;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(83,74,183,.3)">' + (index < total - 1 ? 'Next' : 'Finish') + '</button>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:var(--font-size-nano);color:var(--mut2);margin-top:var(--space-10);text-align:right">' + (index + 1) + ' / ' + total + '</div>';
    var prevBtn = document.getElementById('_tour-prev'), nextBtn = document.getElementById('_tour-next');
    if (prevBtn) prevBtn.onclick = function () { goToStep(index - 1); };
    if (nextBtn) nextBtn.onclick = function () { if (index < total - 1) goToStep(index + 1); else destroy(); };
  }

  function goToStep(index) {
    if (index < 0 || index >= STEPS.length) return;
    currentStep = index;
    var step = STEPS[index];
    tooltipEl.style.opacity = '0';
    tooltipEl.style.transform = 'translateY(20px) scale(.96)';
    setTimeout(function () {
      var pos = positionSpotlight(step.selector);
      if (pos) positionTooltip(pos, step);
      buildTooltip(step, index);
      requestAnimationFrame(function () {
        spotlightEl.style.opacity = '1';
        tooltipEl.style.opacity = '1';
        tooltipEl.style.transform = 'translateY(0) scale(1)';
      });
    }, 300);
  }

  function start() {
    if (isActive || dismissed) return;
    isActive = true;
    createElements();
    requestAnimationFrame(function () {
      overlayEl.style.opacity = '1';
      overlayEl.style.pointerEvents = 'auto';
    });
    goToStep(0);
  }

  function destroy() {
    if (!isActive) return;
    isActive = false;
    dismissed = true;
    if (spotlightEl) spotlightEl.style.opacity = '0';
    if (tooltipEl) tooltipEl.style.opacity = '0';
    if (overlayEl) overlayEl.style.opacity = '0';
    setTimeout(function () { if (overlayEl) overlayEl.style.pointerEvents = 'none'; }, 500);
    currentStep = -1;
  }

  document.addEventListener('keydown', function (e) {
    if (!isActive) return;
    if (e.key === 'Escape') { destroy(); return; }
    if (e.key === 'ArrowRight') { goToStep(currentStep + 1); return; }
    if (e.key === 'ArrowLeft') { goToStep(currentStep - 1); return; }
  });

  window.TourGuide = {
    start: start,
    destroy: destroy,
    goToStep: goToStep,
    isActive: function () { return isActive; },
    reset: function () { dismissed = false; }
  };

})();
