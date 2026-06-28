/* ===== Dynamic Features =====
   Infuses the static sidebar with life:
   - Ripple effect on all button clicks
   - Animated sidebar active indicator (sliding glow)
   - Progress dots per section
   - Nav button hover sound (visual)
   - Toast notifications
   - View transition counter animation

   Usage: Auto-initializes on DOMContentLoaded.
*/
(function () {
  'use strict';

  /* ---------- Ripple Effect ---------- */
  function initRipple() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.seg button, .tools-fab, .mockbtn, .crambtn');
      if (!btn) return;

      var ripple = document.createElement('span');
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var x = e.clientX - rect.left - size / 2;
      var y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = 'position:absolute;border-radius:50%;background:rgba(83,74,183,.18);width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;transform:scale(0);animation:rippleEffect .55s cubic-bezier(.22,.61,.36,1);pointer-events:none;opacity:0.6';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 600);
    });

    // Inject ripple keyframe
    if (!document.getElementById('_ripple-style')) {
      var style = document.createElement('style');
      style.id = '_ripple-style';
      style.textContent = '@keyframes rippleEffect{to{transform:scale(2.5);opacity:0}}';
      document.head.appendChild(style);
    }
  }

  /* ---------- Sliding Active Indicator ---------- */
  function initSlidingIndicator() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    var seg = sidebar.querySelector('.seg');
    if (!seg) return;

    var indicator = document.createElement('div');
    indicator.id = '_slide-indicator';
    indicator.style.cssText = 'position:absolute;left:0;width:3px;background:linear-gradient(180deg,var(--acc),var(--acc2),#8B7FE8);border-radius:0 3px 3px 0;box-shadow:0 0 8px rgba(83,74,183,.3),0 0 20px rgba(83,74,183,.15);transition:top .35s cubic-bezier(.22,.61,.36,1),height .35s cubic-bezier(.22,.61,.36,1),opacity .2s ease;opacity:0;z-index:2;pointer-events:none';
    seg.style.position = 'relative';
    seg.appendChild(indicator);

    function updateIndicator() {
      var active = seg.querySelector('button.on');
      if (!active) { indicator.style.opacity = '0'; return; }
      var top = active.offsetTop;
      var height = active.offsetHeight;
      indicator.style.top = top + 4 + 'px';
      indicator.style.height = height - 8 + 'px';
      indicator.style.opacity = '1';
    }

    // Observe class changes on buttons
    var observer = new MutationObserver(updateIndicator);
    seg.querySelectorAll('button').forEach(function (b) {
      observer.observe(b, { attributes: true, attributeFilter: ['class'] });
    });

    // Initial + periodic update
    updateIndicator();
    setTimeout(updateIndicator, 500);
  }

  /* ---------- Progress Tracking ---------- */
  function initProgressTracker() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    var seg = sidebar.querySelector('.seg');
    if (!seg) return;

    // Create progress container
    var progressDiv = document.createElement('div');
    progressDiv.id = '_progress-tracker';
    progressDiv.style.cssText = 'margin-bottom:12px;padding:0 4px';

    var label = document.createElement('div');
    label.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--mut);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center';

    var labelText = document.createElement('span');
    labelText.textContent = 'Session Progress';

    var counter = document.createElement('span');
    counter.id = '_progress-counter';
    counter.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--acc);font-weight:700';
    counter.textContent = '1 / 9';

    label.appendChild(labelText);
    label.appendChild(counter);
    progressDiv.appendChild(label);

    // Progress bar
    var barContainer = document.createElement('div');
    barContainer.style.cssText = 'height:4px;background:#E8E4DC;border-radius:2px;overflow:hidden';

    var barFill = document.createElement('div');
    barFill.id = '_progress-fill';
    barFill.style.cssText = 'height:100%;width:11.1%;background:linear-gradient(90deg,var(--acc),var(--acc2));border-radius:2px;transition:width .5s cubic-bezier(.22,.61,.36,1);box-shadow:0 0 6px rgba(83,74,183,.2)';

    barContainer.appendChild(barFill);
    progressDiv.appendChild(barContainer);

    // Insert before seg
    seg.parentNode.insertBefore(progressDiv, seg);

    // Listen to route changes
    document.addEventListener('routechange', function (e) {
      var detail = e.detail || {};
      var viewId = detail.view || '';
      var order = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
      var idx = order.indexOf(viewId);
      if (idx < 0) idx = 0;
      counter.textContent = (idx + 1) + ' / 9';
      barFill.style.width = ((idx + 1) / 9 * 100) + '%';
    });
  }

  /* ---------- Toast Notifications ---------- */
  var toastContainer = null;
  function initToast() {
    toastContainer = document.createElement('div');
    toastContainer.id = '_toast-container';
    toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:400;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(toastContainer);
  }

  window.showToast = function (message, type) {
    type = type || 'info';
    if (!toastContainer) initToast();

    var toast = document.createElement('div');
    var bg = type === 'success' ? 'linear-gradient(135deg,#0F6E56,#1A9A7A)' : type === 'error' ? 'linear-gradient(135deg,#A32D2D,#CC4444)' : 'linear-gradient(135deg,var(--acc),var(--acc2))';
    toast.style.cssText = 'background:' + bg + ';color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:550;box-shadow:0 8px 24px -6px rgba(0,0,0,.2);transform:translateX(120px);opacity:0;transition:all .35s cubic-bezier(.22,.61,.36,1);pointer-events:auto;max-width:280px';
    toast.textContent = message;

    toastContainer.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    setTimeout(function () {
      toast.style.transform = 'translateX(120px)';
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 350);
    }, 3000);
  };

  /* ---------- Nav hover sparkle ---------- */
  function initNavSparkle() {
    var seg = document.querySelector('.sidebar .seg') || document.querySelector('.seg');
    if (!seg) return;

    seg.addEventListener('mousemove', function (e) {
      var btn = e.target.closest('button');
      if (!btn || btn.classList.contains('on')) return;

      // Only create sparkle occasionally
      if (Math.random() > 0.15) return;

      var sparkle = document.createElement('span');
      sparkle.style.cssText = 'position:absolute;width:3px;height:3px;background:rgba(83,74,183,.35);border-radius:50%;pointer-events:none;left:' + (e.offsetX || 0) + 'px;top:' + (e.offsetY || 0) + 'px;animation:sparkleFade .6s ease forwards';
      btn.appendChild(sparkle);
      setTimeout(function () { sparkle.remove(); }, 600);
    });

    if (!document.getElementById('_sparkle-style')) {
      var style = document.createElement('style');
      style.id = '_sparkle-style';
      style.textContent = '@keyframes sparkleFade{0%{transform:scale(1);opacity:.5}100%{transform:scale(0);opacity:0}}';
      document.head.appendChild(style);
    }
  }

  /* ---------- Animated route change flash ---------- */
  function initRouteFlash() {
    document.addEventListener('routechange', function (e) {
      var stage = document.querySelector('.stage');
      if (!stage) return;

      var flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;inset:0;background:rgba(83,74,183,.02);pointer-events:none;z-index:5;opacity:0;animation:routeFlash .4s ease';
      stage.style.position = 'relative';
      stage.appendChild(flash);
      setTimeout(function () { flash.remove(); }, 450);
    });

    if (!document.getElementById('_route-flash-style')) {
      var style = document.createElement('style');
      style.id = '_route-flash-style';
      style.textContent = '@keyframes routeFlash{0%{opacity:1}100%{opacity:0}}';
      document.head.appendChild(style);
    }
  }

  /* ---------- Initialize everything ---------- */
  function init() {
    initRipple();
    initSlidingIndicator();
    initProgressTracker();
    initToast();
    initNavSparkle();
    initRouteFlash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
