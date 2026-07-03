/* ============ topics switcher (the topic axis UI) ============
   Builds the sidebar dropdown from the TopicRegistry: one row per registered
   topic, current one marked, each row calls TopicRegistry.setTopic(id). Rebuilds
   the current marker on every deeptopicchange, and HIDES the whole control when
   fewer than two topics are registered (nothing to switch to -- so the single-topic
   deliverable shows no switcher and is visually unchanged). Loads after the topic
   bundle + router, so the registry is already populated when init() runs.
   Offline-safe: no network, storage, or permission calls. */
(function () {
  function init() {
    if (typeof TopicRegistry === 'undefined') return;
    var nav = document.getElementById('topicnav');
    var trigger = document.getElementById('tntrigger');
    var menu = document.getElementById('tnmenu');
    var current = document.getElementById('tncurrent');
    if (!nav || !trigger || !menu || !current) return;

    function esc(s) { return String(s == null ? '' : s); }

    function build() {
      var ids = TopicRegistry.ids();
      if (ids.length < 2) { nav.hidden = true; close(); return; }  /* nothing to switch to */
      nav.hidden = false;
      var cur = TopicRegistry.current();
      current.textContent = cur ? cur.identity.title.replace(/&mdash;/g, '\u2014') : '';
      menu.innerHTML = ids.map(function (id) {
        var t = TopicRegistry.get(id), on = !!(cur && cur.id === id), idn = t.identity;
        return '<button class="tn-item' + (on ? ' on' : '') + '" role="menuitem" type="button"' +
          ' data-topic="' + esc(id) + '"' + (on ? ' aria-current="true"' : '') + '>' +
          '<span class="tn-i-idx">' + esc(idn.index) + '</span>' +
          '<span class="tn-i-name">' + esc(idn.title) + '</span>' +
          '<span class="tn-i-tail">' + esc(idn.locatorTail) + '</span></button>';
      }).join('');
    }
    function open() { menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); nav.classList.add('tn-open'); }
    function close() { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); nav.classList.remove('tn-open'); }
    function toggle() { if (menu.hidden) open(); else close(); }

    trigger.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.tn-item') : null;
      if (!b) return;
      var id = b.getAttribute('data-topic');
      close();
      if (id) TopicRegistry.setTopic(id);        /* the ONE switch path -- fires deeptopicchange -> build() re-marks */
    });
    document.addEventListener('click', function (e) { if (!menu.hidden && !nav.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.keyCode === 27) && !menu.hidden) { close(); try { trigger.focus(); } catch (x) {} }
    });
    window.addEventListener('deeptopicchange', build);
    build();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
