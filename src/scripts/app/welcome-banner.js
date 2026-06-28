/* ===== WelcomeBanner =====
   Shows a dismissible welcome banner on first visit.
   Displays tips and new feature announcements.
   Features:
   - Only shows once per browser (localStorage)
   - Dismissible with X button or Escape key
   - Smooth slide-in animation
   - Shows current feature count
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_welcome_seen';

  function init() {
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch (e) { return; }

    var banner = document.createElement('div');
    banner.id = '_welcome-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;top:16px;right:16px;z-index:300;width:320px;max-width:calc(100vw - 32px);background:linear-gradient(135deg,#fff 0%,#FAF9F5 100%);border-radius:14px;box-shadow:0 12px 40px -8px rgba(83,74,183,.18),0 0 0 1px rgba(83,74,183,.08);padding:16px 18px;transform:translateX(120%);opacity:0;transition:transform .45s cubic-bezier(.22,.61,.36,1),opacity .3s ease;overflow:hidden';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px';

    var title = document.createElement('h4');
    title.textContent = 'Welcome to DeepDive';
    title.style.cssText = 'margin:0;font-size:14px;font-weight:700;color:var(--ink)';

    var close = document.createElement('button');
    close.innerHTML = '&times;';
    close.setAttribute('aria-label', 'Dismiss');
    close.style.cssText = 'width:22px;height:22px;border-radius:50%;border:0;background:#F0ECE4;color:var(--mut);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1';
    close.addEventListener('click', dismiss);

    header.appendChild(title);
    header.appendChild(close);

    var body = document.createElement('div');
    body.style.cssText = 'font-size:12px;color:var(--mut);line-height:1.6';
    body.innerHTML = '<p style="margin:0 0 8px">Your interview rehearsal companion with <strong style="color:var(--acc)">18 unique features</strong>.</p><ul style="margin:0;padding-left:16px"><li>Press <kbd style="font-family:monospace;font-size:10px;background:#F0ECE4;border:1px solid #DDD7CD;border-radius:3px;padding:1px 4px">Q-O</kbd> to jump between modules</li><li><kbd style="font-family:monospace;font-size:10px;background:#F0ECE4;border:1px solid #DDD7CD;border-radius:3px;padding:1px 4px">Cmd+K</kbd> for global search</li><li><kbd style="font-family:monospace;font-size:10px;background:#F0ECE4;border:1px solid #DDD7CD;border-radius:3px;padding:1px 4px">F</kbd> for focus mode</li><li>Star modules to bookmark them</li></ul>';

    banner.appendChild(header);
    banner.appendChild(body);
    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.style.transform = 'translateX(0)';
        banner.style.opacity = '1';
      });
    });

    // Escape to dismiss
    function onKey(e) { if (e.key === 'Escape') dismiss(); }
    document.addEventListener('keydown', onKey);

    function dismiss() {
      banner.style.transform = 'translateX(120%)';
      banner.style.opacity = '0';
      document.removeEventListener('keydown', onKey);
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
      setTimeout(function () { banner.remove(); }, 400);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 2000); });
  } else {
    setTimeout(init, 2000);
  }
})();
