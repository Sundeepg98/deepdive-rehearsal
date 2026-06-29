/* ===== NotificationSystem =====
   Custom notification dropdown in header area.
   Features:
   - Bell icon with unread count
   - Dropdown with notification list
   - Example: "New module available", "Study streak"
   - Marks as read on click
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var STORAGE_KEY = '_notifications';
  var notifications = [
    { id: 1, text: 'Try focus mode (F key) for distraction-free study', read: false, time: Date.now() },
    { id: 2, text: 'Bookmark modules with the star icon', read: false, time: Date.now() - 3600000 },
    { id: 3, text: '18 unique features now available!', read: false, time: Date.now() - 7200000 }
  ];

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) notifications = JSON.parse(raw);
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)); } catch (e) {}
  }

  function unreadCount() {
    return notifications.filter(function (n) { return !n.read; }).length;
  }

  function create() {
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;
    if (document.getElementById('_notif-bell')) return;

    var bell = document.createElement('div');
    bell.id = '_notif-bell';
    bell.style.cssText = 'position:relative;margin-left:auto;cursor:pointer;padding:4px';

    var icon = document.createElement('span');
    icon.textContent = '\uD83D\udd14';
    icon.style.cssText = 'font-size:16px';

    var count = unreadCount();
    var badge = document.createElement('span');
    badge.id = '_notif-badge';
    badge.textContent = String(count);
    badge.style.cssText = 'position:absolute;top:-2px;right:-2px;min-width:14px;height:14px;border-radius:7px;background:var(--red);color:#fff;font-size:8px;font-weight:800;display:' + (count > 0 ? 'flex' : 'none') + ';align-items:center;justify-content:center';

    bell.appendChild(icon);
    bell.appendChild(badge);

    var dropdown = document.createElement('div');
    dropdown.id = '_notif-dropdown';
    dropdown.style.cssText = 'position:absolute;top:32px;right:0;width:240px;background:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);display:none;overflow:hidden;z-index:300';

    function render() {
      dropdown.innerHTML = '';
      if (notifications.length === 0) {
        var empty = document.createElement('div');
        empty.textContent = 'No notifications';
        empty.style.cssText = 'padding:16px;text-align:center;font-size:12px;color:var(--mut)';
        dropdown.appendChild(empty);
        return;
      }
      notifications.forEach(function (n) {
        var item = document.createElement('div');
        item.style.cssText = 'padding:8px 12px;font-size:11px;border-bottom:1px solid var(--bd);cursor:pointer;transition:background .15s ease;background:' + (n.read ? 'transparent' : 'rgba(83,74,183,.03)') + ';font-weight:' + (n.read ? '400' : '600') + ';color:' + (n.read ? 'var(--mut)' : 'var(--ink)') + '';
        item.textContent = n.text;
        item.addEventListener('click', function () {
          n.read = true; save(); render(); updateBadge();
        });
        dropdown.appendChild(item);
      });
    }

    bell.addEventListener('click', function () {
      render();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', function (e) {
      if (!bell.contains(e.target)) dropdown.style.display = 'none';
    });

    bell.appendChild(dropdown);
    hdr.appendChild(bell);
  }

  function updateBadge() {
    var badge = document.getElementById('_notif-badge');
    if (!badge) return;
    var count = unreadCount();
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  load();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(create, 1200); });
  } else {
    setTimeout(create, 1200);
  }
})();
