/* ===== scripts/app/cross-drill.js -- cross-topic random drill (F6) =====
   "Surprise me across all topics": pulls random probes from every registered
   topic, one at a time -> reveal -> self-grade -> summary. Reads the topic banks
   (t.data.bank.cards) directly; its own light-DOM surface so it stays decoupled
   from the per-topic drill and the mixed-fire shadow component. */
(function () {
  var el = null, body = null, pool = [], idx = 0, got = 0, shk = 0, revealed = false, isOpen = false, restoreFocus = null, mode = 'all';
  var COUNT = 12;

  function gather() {
    var out = [];
    if (typeof TopicRegistry === 'undefined') return out;
    var ids = TopicRegistry.ids();
    var weakOnly = (mode === 'weak' && typeof Progress !== 'undefined' && Progress.status);
    for (var i = 0; i < ids.length; i++) {
      if (weakOnly && Progress.status(ids[i]) !== 'weak') continue;
      var t = TopicRegistry.get(ids[i]);
      if (t && t.data && t.data.bank && t.data.bank.cards) {
        var cs = t.data.bank.cards;
        for (var j = 0; j < cs.length; j++) out.push({ card: cs[j], title: t.identity.title });
      }
    }
    return out;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function build() { var all = shuffle(gather()); pool = all.slice(0, Math.min(COUNT, all.length)); idx = 0; got = 0; shk = 0; revealed = false; }
  function focusables() { return Array.prototype.filter.call(el.querySelectorAll('button'), function (b) { return !b.disabled && b.offsetParent !== null; }); }

  function renderItem() {
    revealed = false;
    if (idx >= pool.length) { renderEnd(); return; }
    var it = pool[idx], c = it.card;
    body.innerHTML =
      '<div class="xd-top"><span class="xd-prog">Probe ' + (idx + 1) + ' / ' + pool.length + '</span><span class="xd-from">' + it.title + '</span></div>' +
      '<div class="xd-q">' + c.q + '</div>' +
      '<div class="xd-rev" id="_xd-rev"></div>' +
      '<button class="xd-reveal" id="_xd-reveal" type="button">Reveal a strong answer</button>';
    var r = el.querySelector('#_xd-reveal'); if (r) r.onclick = reveal;
  }
  function reveal() {
    var it = pool[idx], c = it.card;
    var html = '<div class="xd-ans">' + c.a + '</div>';
    if (c.f && c.f.length) html += c.f.map(function (x) { return '<div class="xd-fu"><div class="xd-fu-l">Interviewer pushes further</div><div class="xd-fu-q">' + x.q + '</div><div class="xd-fu-a">' + x.a + '</div></div>'; }).join('');
    if (c.senior) html += '<div class="xd-senior"><div class="xd-senior-l">What sounds senior here</div>' + c.senior + '</div>';
    el.querySelector('#_xd-rev').innerHTML = html;
    var rb = el.querySelector('#_xd-reveal'); if (rb) rb.style.display = 'none';
    var jr = document.createElement('div'); jr.className = 'xd-judge';
    jr.innerHTML = '<button class="xd-got" id="_xd-got" type="button">&#10003; Handled it <span class="xd-hint">[1]</span></button><button class="xd-shk" id="_xd-shk" type="button">&#126; Shaky <span class="xd-hint">[2]</span></button>';
    body.appendChild(jr);
    revealed = true;
    el.querySelector('#_xd-got').onclick = function () { grade(true); };
    el.querySelector('#_xd-shk').onclick = function () { grade(false); };
  }
  function grade(ok) { if (ok) got++; else shk++; idx++; renderItem(); }
  function renderEnd() {
    var pct = pool.length ? Math.round(got / pool.length * 100) : 0;
    body.innerHTML =
      '<div class="xd-end"><div class="xd-end-pct">' + pct + '%</div>' +
      '<div class="xd-end-sub">' + got + ' handled &middot; ' + shk + ' shaky &middot; ' + pool.length + ' probes across the curriculum</div>' +
      '<button class="xd-again" id="_xd-again" type="button">Shuffle another set &rarr;</button></div>';
    var a = el.querySelector('#_xd-again'); if (a) a.onclick = function () { build(); renderItem(); setTimeout(function () { var r = el.querySelector('#_xd-reveal'); if (r) r.focus(); }, 20); };
  }

  function create() {
    if (el) return;
    el = document.createElement('div'); el.id = '_cross-overlay'; el.className = 'xd-ov';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Cross-topic drill');
    el.innerHTML = '<div class="xd-panel"><div class="xd-head"><div><div class="xd-title">Cross-topic drill</div><div class="xd-sub">Random probes from every topic &mdash; the interview shuffle</div></div><button class="xd-x" type="button" aria-label="Close">&#215;</button></div><div class="xd-body"></div></div>';
    document.body.appendChild(el);
    body = el.querySelector('.xd-body');
    el.addEventListener('click', function (e) { if (e.target === el || (e.target.closest && e.target.closest('.xd-x'))) close(); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (revealed && e.key === '1') { e.preventDefault(); grade(true); return; }
      if (revealed && e.key === '2') { e.preventDefault(); grade(false); return; }
      if (e.key === 'Tab') { var f = focusables(); if (!f.length) return; var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
  }
  function open(m) {
    if (isOpen) return;
    mode = (m === 'weak') ? 'weak' : 'all';
    create();
    if (!gather().length) return;
    var tEl = el.querySelector('.xd-title'), sEl = el.querySelector('.xd-sub');
    if (mode === 'weak') { tEl.textContent = 'Weak-spot review'; sEl.innerHTML = 'Probes drawn only from the topics you have been shaky on'; }
    else { tEl.textContent = 'Cross-topic drill'; sEl.innerHTML = 'Random probes from every topic &mdash; the interview shuffle'; }
    build(); renderItem();
    restoreFocus = document.activeElement;
    el.classList.add('open'); isOpen = true;
    setTimeout(function () { var r = el.querySelector('#_xd-reveal'); if (r) r.focus(); }, 40);
  }
  function close() {
    if (!isOpen) return;
    el.classList.remove('open'); isOpen = false;
    if (restoreFocus && restoreFocus.focus) { try { restoreFocus.focus(); } catch (e) {} }
    restoreFocus = null;
  }
  window.CrossDrill = { open: open, close: close, isOpen: function () { return isOpen; } };
})();
