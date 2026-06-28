/* ===== WebShare =====
   Uses navigator.share() on supported devices.
   Falls back to clipboard copy.
   Added to the share button if API is available.
   Usage: Auto-enhances share-url.js button.
*/
(function () {
  'use strict';

  if (!navigator.share) return; // No Web Share API

  function enhance() {
    var btn = document.getElementById('_share-url-btn');
    if (!btn || btn.dataset._webshare) return;
    btn.dataset._webshare = '1';

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var title = document.title || 'DeepDive Interview Rehearsal';
      var url = window.location.href;
      navigator.share({ title: title, url: url }).catch(function () {});
    });
  }

  setTimeout(enhance, 2000);
})();
