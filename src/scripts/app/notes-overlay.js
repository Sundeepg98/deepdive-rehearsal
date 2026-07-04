/* ===== scripts/app/notes-overlay.js -- per-topic notes (O5) =====
   A self-contained modal (created on first open, like the index) with a textarea
   for the current topic's notes. Saves to Store on input (debounced), keyed by
   topic; a dot on the tools-bar button marks topics that already have notes. */
(function () {
  var el = null, ta = null, subEl = null, isOpen = false, saveT = null, restoreFocus = null;
  var N = 'notes.';
  function nkey(id) { return N + id; }
  function reg() { return (typeof TopicRegistry !== 'undefined') ? TopicRegistry : null; }
  function curId() { var r = reg(); return (r && r.current()) ? r.current().id : null; }
  function curTitle() { var r = reg(); return (r && r.current()) ? r.current().identity.title : ''; }

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

  function create() {
    if (el) return;
    el = document.createElement('div');
    el.id = '_notes-overlay'; el.className = 'nt-ov';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Your notes');
    el.innerHTML = '<div class="nt-panel"><div class="nt-head"><div><div class="nt-title">Your notes</div><div class="nt-sub"></div></div><button class="nt-x" type="button" aria-label="Close notes">&#215;</button></div>' +
      '<textarea class="nt-ta" placeholder="Jot your own notes, mnemonics, and gotchas for this topic&#8230;" aria-label="Notes for this topic"></textarea>' +
      '<div class="nt-foot">Saved automatically to this browser.</div></div>';
    document.body.appendChild(el);
    ta = el.querySelector('.nt-ta'); subEl = el.querySelector('.nt-sub');
    el.addEventListener('click', function (e) { if (e.target === el || (e.target.closest && e.target.closest('.nt-x'))) close(); });
    ta.addEventListener('input', function () { if (saveT) clearTimeout(saveT); saveT = setTimeout(save, 300); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(el.querySelectorAll('button,textarea'), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
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
    loadCur();
    restoreFocus = document.activeElement;
    el.classList.add('open'); isOpen = true;
    setTimeout(function () { if (ta) ta.focus(); }, 40);
  }
  function close() {
    if (!isOpen) return;
    save();
    if (saveT) { clearTimeout(saveT); saveT = null; }
    el.classList.remove('open'); isOpen = false;
    if (restoreFocus && restoreFocus.focus) { try { restoreFocus.focus(); } catch (e) {} }
    restoreFocus = null;
  }

  function wire() {
    var btn = document.getElementById('notesopen');
    if (btn) btn.addEventListener('click', open);
    window.addEventListener('deeptopicchange', function () { if (isOpen) { save(); loadCur(); } markBtn(); });
    markBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  window.NotesOverlay = { open: open, close: close, isOpen: function () { return isOpen; } };
})();
