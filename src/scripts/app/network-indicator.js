/* ===== NetworkIndicator =====
   Shows connection speed indicator in sidebar.
   Features:
   - Uses navigator.connection.effectiveType
   - Shows 4G/3G/2G/offline badge
   - Color-coded: green=fast, amber=medium, red=slow
   - Updates on connection change
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return;

  function getLabel() {
    var type = conn.effectiveType || 'unknown';
    return type.toUpperCase();
  }

  function getColor() {
    var type = conn.effectiveType;
    if (type === '4g') return 'var(--teal)';
    if (type === '3g') return 'var(--amber)';
    return 'var(--red)';
  }

  function create() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (document.getElementById('_network-ind')) return;

    var wrap = document.createElement('div');
    wrap.id = '_network-ind';
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 11px;font-size:10px;color:var(--mut)';

    var dot = document.createElement('span');
    dot.id = '_network-dot';
    dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:' + getColor() + ';box-shadow:0 0 4px ' + getColor() + ';transition:background .3s ease';

    var label = document.createElement('span');
    label.id = '_network-label';
    label.textContent = getLabel();
    label.style.cssText = 'font-weight:700;letter-spacing:.5px';

    wrap.appendChild(dot);
    wrap.appendChild(label);
    sidebar.appendChild(wrap);
  }

  function update() {
    var dot = document.getElementById('_network-dot');
    var label = document.getElementById('_network-label');
    if (dot) dot.style.background = getColor();
    if (label) label.textContent = getLabel();
  }

  create();
  if (conn) conn.addEventListener('change', update);
})();
