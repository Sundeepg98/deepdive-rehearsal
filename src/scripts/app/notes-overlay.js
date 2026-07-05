/* ===== scripts/app/notes-overlay.js -- per-topic notes + all-notes search (O5) =====
   A self-contained modal (created on first open, like the index). Two modes:
   "This topic" is a textarea for the current topic's notes, saved to Store on input
   (debounced), keyed by topic; "All notes" is a searchable read-through of every
   topic that has notes, with click-to-jump. A dot on the tools-bar button marks
   topics that already have notes. */
(function () {
  var el = null, ta = null, subEl = null, allWrap = null, listEl = null, searchEl = null;
  var isOpen = false, saveT = null, _modal = null, mode = 'one';
  var N = 'notes.';
  function nkey(id) { return N + id; }
  function reg() { return (typeof TopicRegistry !== 'undefined') ? TopicRegistry : null; }
  function curId() { var r = reg(); return (r && r.current()) ? r.current().id : null; }
  function curTitle() { var r = reg(); return (r && r.current()) ? r.current().identity.title : ''; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function markBtn() {
    var btn = document.getElementById('notesopen'); if (!btn) return;
    var id = curId();
    btn.classList.toggle('has-notes', !!(id && Store.get(nkey(id))));
  }
  function save() {
    var id = curId(); if (!id || !ta) return;
    var v = ta.value;
    if (v && v.replace(/\s+/g, '')) Store.set(nkey(id), v); else Store.remove(nkey(id));
    markBtn();
  }

  /* Gather every stored note into {id, title, text}, sorted by topic title. */
  function allNotes() {
    var out = [], r = reg();
    try {
      var keys = Store.keys ? Store.keys('') : [];
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(N) !== 0) continue;
        var id = keys[i].slice(N.length), v = Store.get(keys[i]);
        if (!v || !v.replace(/\s+/g, '')) continue;
        var t = r ? r.get(id) : null;
        out.push({ id: id, title: t ? t.identity.title : id, text: v });
      }
    } catch (e) {}
    out.sort(function (a, b) { return a.title.localeCompare(b.title); });
    return out;
  }

  function renderList(q) {
    if (!listEl) return;
    var notes = allNotes();
    if (!notes.length) { listEl.innerHTML = '<div class="nt-empty">No notes yet. Switch to <b>This topic</b> and jot something &mdash; it shows up here across every topic.</div>'; return; }
    q = (q || '').trim().toLowerCase();
    if (q) notes = notes.filter(function (n) { return n.title.toLowerCase().indexOf(q) > -1 || n.text.toLowerCase().indexOf(q) > -1; });
    if (!notes.length) { listEl.innerHTML = '<div class="nt-empty">Nothing matches &ldquo;' + esc(q) + '&rdquo;.</div>'; return; }
    listEl.innerHTML = notes.map(function (n) {
      return '<button class="nt-item" type="button" data-note-topic="' + esc(n.id) + '">' +
        '<span class="nt-item-t">' + esc(n.title) + '</span>' +
        '<span class="nt-item-x">' + esc(n.text) + '</span></button>';
    }).join('');
  }

  function setMode(m) {
    mode = m;
    if (tabsSync) tabsSync();
    if (m === 'all') {
      if (ta) ta.hidden = true;
      if (allWrap) allWrap.hidden = false;
      renderList(searchEl ? searchEl.value : '');
      setTimeout(function () { if (searchEl) searchEl.focus(); }, 40);
    } else {
      if (allWrap) allWrap.hidden = true;
      if (ta) { ta.hidden = false; loadCur(); setTimeout(function () { ta.focus(); }, 40); }
    }
  }
  var tabsSync = null;

  function create() {
    if (el) return;
    el = document.createElement('div');
    el.id = '_notes-overlay'; el.className = 'nt-ov';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Your notes');
    el.innerHTML = '<div class="nt-panel"><div class="nt-head"><div class="nt-htxt"><div class="nt-title">Your notes</div><div class="nt-sub"></div></div>' +
      '<div class="nt-tabs"><button class="nt-tab on" type="button" data-mode="one">This topic</button><button class="nt-tab" type="button" data-mode="all">All notes</button></div>' +
      '<button class="nt-x" type="button" aria-label="Close notes">&#215;</button></div>' +
      '<textarea class="nt-ta" placeholder="Jot your own notes, mnemonics, and gotchas for this topic&#8230;" aria-label="Notes for this topic"></textarea>' +
      '<div class="nt-all" hidden><input class="nt-search" type="text" placeholder="Search all your notes&#8230;" aria-label="Search notes" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="nt-list"></div></div>' +
      '<div class="nt-foot">Saved automatically to this browser.</div></div>';
    document.body.appendChild(el);
    _modal = window.__overlayModal(el, close, function () { return isOpen; });
    ta = el.querySelector('.nt-ta'); subEl = el.querySelector('.nt-sub');
    allWrap = el.querySelector('.nt-all'); listEl = el.querySelector('.nt-list'); searchEl = el.querySelector('.nt-search');
    var tabs = el.querySelectorAll('.nt-tab');
    tabsSync = function () { for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-mode') === mode); };

    el.addEventListener('click', function (e) {
      if (e.target === el || (e.target.closest && e.target.closest('.nt-x'))) { close(); return; }
      var tab = e.target.closest ? e.target.closest('.nt-tab') : null;
      if (tab) { setMode(tab.getAttribute('data-mode')); return; }
      var item = e.target.closest ? e.target.closest('.nt-item') : null;
      if (item) { var id = item.getAttribute('data-note-topic'); var r = reg(); if (id && r && r.setTopic) { r.setTopic(id); setMode('one'); } }
    });
    ta.addEventListener('input', function () { if (saveT) clearTimeout(saveT); saveT = setTimeout(save, 300); });
    if (searchEl) searchEl.addEventListener('input', function () { renderList(searchEl.value); });
    /* Tab focus-trap + Escape-to-close: handled by __overlayModal (overlay-focus.js) */
  }

  function loadCur() {
    var id = curId();
    if (subEl) subEl.textContent = curTitle();
    if (ta) ta.value = (id ? Store.get(nkey(id), '') : '') || '';
  }
  function open() {
    if (isOpen) return;
    create();
    if (!curId()) return;
    mode = 'one'; if (tabsSync) tabsSync();
    if (ta) ta.hidden = false; if (allWrap) allWrap.hidden = true;
    loadCur();
    _modal.capture();
    el.classList.add('open'); isOpen = true;
    setTimeout(function () { if (ta) ta.focus(); }, 40);
  }
  function close() {
    if (!isOpen) return;
    save();
    if (saveT) { clearTimeout(saveT); saveT = null; }
    el.classList.remove('open'); isOpen = false;
    _modal.restore();
  }

  function wire() {
    var btn = document.getElementById('notesopen');
    if (btn) btn.addEventListener('click', open);
    window.addEventListener('deeptopicchange', function () { if (isOpen && mode === 'one') { save(); loadCur(); } markBtn(); });
    markBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  window.NotesOverlay = { open: open, close: close, isOpen: function () { return isOpen; } };
})();
