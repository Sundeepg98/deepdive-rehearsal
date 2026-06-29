/* ===== BatteryIndicator =====
   Shows battery level in sidebar on supported devices.
   Features:
   - Uses navigator.getBattery() API
   - Shows percentage and charging state
   - Color: green >50%, amber 20-50%, red <20%
   - Updates on level/charging change
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  if (!navigator.getBattery) return;

  function create(battery) {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (document.getElementById('_battery-ind')) return;

    var wrap = document.createElement('div');
    wrap.id = '_battery-ind';
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 11px;font-size:10px;color:var(--mut)';

    var icon = document.createElement('span');
    icon.id = '_battery-icon';
    icon.style.cssText = 'font-size:12px';

    var text = document.createElement('span');
    text.id = '_battery-text';
    text.style.cssText = 'font-weight:600';

    wrap.appendChild(icon);
    wrap.appendChild(text);
    sidebar.appendChild(wrap);

    update(battery);
  }

  function update(battery) {
    var icon = document.getElementById('_battery-icon');
    var text = document.getElementById('_battery-text');
    if (!icon || !text) return;

    var level = Math.round(battery.level * 100);
    var charging = battery.charging;

    icon.textContent = charging ? '\u26A1' : (level > 50 ? '\uD83D\udd0b' : '\uD83E\udeab');
    text.textContent = level + '%';
    text.style.color = level > 50 ? 'var(--teal)' : level > 20 ? 'var(--amber)' : 'var(--red)';
  }

  navigator.getBattery().then(function (battery) {
    create(battery);
    battery.addEventListener('levelchange', function () { update(battery); });
    battery.addEventListener('chargingchange', function () { update(battery); });
  });
})();
