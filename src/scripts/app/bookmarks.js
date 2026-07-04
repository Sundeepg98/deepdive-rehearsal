/* ===== scripts/app/bookmarks.js -- starred topics =====
   A Store-backed list of bookmarked topic ids, surfaced as a "Star this topic"
   toggle in the tools bar and a Starred shelf on the home. */
var Bookmarks = (function () {
  var KEY = 'bookmarks';
  function all() { var a = Store.get(KEY, []); return Array.isArray(a) ? a : []; }
  function has(id) { return all().indexOf(id) !== -1; }
  function toggle(id) {
    var a = all(), i = a.indexOf(id);
    if (i === -1) a.push(id); else a.splice(i, 1);
    Store.set(KEY, a); return i === -1;
  }
  function clear() { Store.remove(KEY); }
  return { all: all, has: has, toggle: toggle, clear: clear };
})();
window.Bookmarks = Bookmarks;

/* wire the tools-bar star toggle: reflects the current topic, updates on switch */
(function () {
  var btn = document.getElementById('starbtn');
  if (!btn) return;
  var t = btn.querySelector('.mb-t'), d = btn.querySelector('.mb-d');
  function curId() { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null; }
  function sync() {
    var id = curId(); if (!id) return;
    var on = Bookmarks.has(id);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('starred', on);
    if (t) t.textContent = on ? 'Starred' : 'Star this topic';
    if (d) d.innerHTML = on ? ' &mdash; saved to your bookmarks on the home' : ' &mdash; save it to your bookmarks on the home';
  }
  btn.addEventListener('click', function () { var id = curId(); if (!id) return; Bookmarks.toggle(id); sync(); });
  window.addEventListener('deeptopicchange', sync);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();
