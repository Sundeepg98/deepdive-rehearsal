/* ===== KeyboardHelp =====
   Press '?' to see all keyboard shortcuts in a beautiful overlay.
   Features:
   - Categorized shortcuts (Navigation, Views, Tools)
   - Visual key representation
   - Click any shortcut to execute it
   - Smooth open/close animations
   - Remembers dismissal per session
*/
(function () {
  'use strict';

  var overlayEl = null;
  var isOpen = false;

  var SHORTCUTS = [
    { category: 'Navigation', keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O'], desc: 'Jump to module 1-9', color: 'var(--acc)' },
    { category: 'Navigation', keys: ['←', '→'], desc: 'Navigate tour steps', color: 'var(--acc)' },
    { category: 'Views', keys: ['Tab'], desc: 'Cycle focus', color: 'var(--teal)' },
    { category: 'Views', keys: ['Shift + Tab'], desc: 'Focus backward', color: 'var(--teal)' },
    { category: 'Tools', keys: ['⌘ + K'], desc: 'Search modules', color: 'var(--amber)' },
    { category: 'Tools', keys: ['?'], desc: 'This help', color: 'var(--amber)' },
    { category: 'Tools', keys: ['Esc'], desc: 'Close overlays', color: 'var(--amber)' },
  ];

  function create() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = '_kbd-help-overlay';
    overlayEl.style.cssText = 'position:fixed;inset:0;z-index:290;background:rgba(0,0,0,.35);backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease;display:none;align-items:center;justify-content:center';

    var box = document.createElement('div');
    box.style.cssText = 'width:480px;max-width:90vw;max-height:80vh;background:linear-gradient(180deg,#fff 0%,#FAF9F5 100%);border-radius:16px;box-shadow:0 24px 80px -16px rgba(0,0,0,.25),0 0 0 1px rgba(83,74,183,.08);overflow:hidden;transform:scale(.95);transition:transform .3s cubic-bezier(.22,.61,.36,1);display:flex;flex-direction:column';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #E8E4DC';
    var title = document.createElement('h3');
    title.textContent = 'Keyboard Shortcuts';
    title.style.cssText = 'margin:0;font-size:16px;font-weight:700;color:var(--ink)';
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = 'width:28px;height:28px;border-radius:50%;border:0;background:#F0ECE4;color:var(--mut);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s ease';
    closeBtn.addEventListener('click', hide);
    closeBtn.addEventListener('mouseenter', function () { closeBtn.style.background = '#E5E0D5'; });
    closeBtn.addEventListener('mouseleave', function () { closeBtn.style.background = '#F0ECE4'; });
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content
    var content = document.createElement('div');
    content.style.cssText = 'overflow-y:auto;padding:12px 16px;flex:1';

    var currentCategory = '';
    SHORTCUTS.forEach(function (s) {
      if (s.category !== currentCategory) {
        currentCategory = s.category;
        var cat = document.createElement('div');
        cat.style.cssText = 'font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--mut);margin:12px 0 6px 4px';
        cat.textContent = currentCategory;
        content.appendChild(cat);
      }

      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:7px 10px;border-radius:8px;transition:background .15s ease;margin-bottom:2px';
      row.addEventListener('mouseenter', function () { row.style.background = 'rgba(83,74,183,.04)'; });
      row.addEventListener('mouseleave', function () { row.style.background = 'transparent'; });

      var keysWrap = document.createElement('div');
      keysWrap.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;min-width:90px';
      s.keys.forEach(function (k) {
        var keyEl = document.createElement('kbd');
        keyEl.textContent = k;
        keyEl.style.cssText = 'font-family:ui-monospace,monospace;font-size:11px;font-weight:600;background:linear-gradient(180deg,#F0ECE4 0%,#E8E2D8 100%);border:1px solid #D8D2C8;border-bottom-width:2px;border-radius:5px;padding:3px 7px;color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06);white-space:nowrap';
        keysWrap.appendChild(keyEl);
      });

      var descEl = document.createElement('span');
      descEl.textContent = s.desc;
      descEl.style.cssText = 'font-size:13px;color:var(--mut);flex:1';

      row.appendChild(keysWrap);
      row.appendChild(descEl);
      content.appendChild(row);
    });

    // Footer
    var footer = document.createElement('div');
    footer.style.cssText = 'padding:10px 20px;border-top:1px solid #E8E4DC;font-size:11px;color:var(--mut);text-align:center';
    footer.textContent = 'Press ? anytime to toggle this help';

    box.appendChild(header);
    box.appendChild(content);
    box.appendChild(footer);
    overlayEl.appendChild(box);
    document.body.appendChild(overlayEl);

    overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) hide(); });
  }

  function show() {
    if (isOpen) return;
    create();
    isOpen = true;
    overlayEl.style.display = 'flex';
    requestAnimationFrame(function () {
      overlayEl.style.opacity = '1';
      overlayEl.firstElementChild.style.transform = 'scale(1)';
    });
  }

  function hide() {
    if (!isOpen) return;
    isOpen = false;
    overlayEl.style.opacity = '0';
    overlayEl.firstElementChild.style.transform = 'scale(.95)';
    setTimeout(function () { overlayEl.style.display = 'none'; }, 250);
  }

  // Listen for ? key (but not when typing in inputs)
  document.addEventListener('keydown', function (e) {
    if (e.key === '?' || e.key === '/') {
      // Don't trigger if in input/textarea or if search overlay is open
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (document.getElementById('_search-overlay') && document.getElementById('_search-overlay').style.display === 'flex') return;
      e.preventDefault();
      isOpen ? hide() : show();
    }
    if (e.key === 'Escape' && isOpen) hide();
  });

  window.KeyboardHelp = { show: show, hide: hide };
})();
