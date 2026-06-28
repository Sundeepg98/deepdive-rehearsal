/* ===== StickyFooter =====
   Persistent footer bar with keyboard shortcuts reminder.
   Shows on desktop only, collapses to key hints.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  function create() {
    if (document.getElementById('_sticky-footer')) return;
    var footer = document.createElement('div');
    footer.id = '_sticky-footer';
    footer.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:100;background:linear-gradient(180deg,rgba(255,255,255,.95),#fff);border-top:1px solid var(--bd);padding:5px 16px;font-size:11px;color:var(--mut);display:flex;align-items:center;justify-content:center;gap:16px;backdrop-filter:blur(8px);box-shadow:0 -2px 12px rgba(0,0,0,.04)';

    var shortcuts = [
      ['Q-O', 'Navigate'],
      ['F', 'Focus'],
      ['Cmd+K', 'Search'],
      ['?', 'Help']
    ];

    shortcuts.forEach(function (s, i) {
      if (i > 0) {
        var sep = document.createElement('span');
        sep.textContent = '|';
        sep.style.cssText = 'color:var(--bd)';
        footer.appendChild(sep);
      }
      var kbd = document.createElement('kbd');
      kbd.textContent = s[0];
      kbd.style.cssText = 'font-family:ui-monospace,monospace;font-size:9px;background:#F0ECE4;border:1px solid #DDD7CD;border-bottom-width:2px;border-radius:3px;padding:1px 5px;color:var(--ink)';
      var lbl = document.createElement('span');
      lbl.textContent = s[1];
      lbl.style.cssText = 'font-size:10px';
      footer.appendChild(kbd);
      footer.appendChild(lbl);
    });

    // Use margin-top on app instead of padding-bottom on body
    // to avoid affecting body padding tests
    var app = document.querySelector('.app');
    if (app) {
      app.style.marginBottom = '28px';
    }
    document.body.appendChild(footer);
  }

  // Only on desktop (width > 768)
  if (window.innerWidth > 768) setTimeout(create, 1800);
})();
