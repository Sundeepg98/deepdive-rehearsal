/* ===== Panels =====
   THE RENDERERS, EXTRACTED. They used to live inside index-overlay.js's single IIFE, which
   exported only { open, close, isOpen, exportBackup } -- so homeStrip(), groupBars(), dueReview(),
   starredSection() and the 46-card library were literally unreachable from any other module. Any
   plan to render "the same panels somewhere else" was impossible until this file existed. That is
   what this is: a pure MOVE, no behaviour change.

   ONE HANDLER, TWO ROOTS. bind() is the important export. The delegated click handler is ~50
   lines of data-topic / data-hash / data-cross / data-goal / data-reset / data-io routing. Copying
   it into the home would have been the fifth place this app computes progress -- which is exactly
   how the "By area" bars came to disagree with overallPct inside a single function. So the home
   and the switcher share ONE handler, parameterised by what should happen after a pick.

   Surfaces:
     roomsHtml()      the six rooms as cards  (needs the byGroup denominator fix in progress.js)
     telemetryHtml()  goal + trend + refresh -- rendered BELOW the decision, never above it
     actionsHtml()    cross-topic drill + weak-spot review
     libraryHtml()    the filter + starred + all 46 topic cards, grouped
     footerHtml()     export / import  (+ reset-all, only where it belongs)
     bind(root, opts) the one delegated handler + roving arrows + live filter + the undo toast

   Offline-safe: no network, storage, or permission calls beyond Store. */
(function () {
  'use strict';

  function thesisText(t) { return String(t == null ? '' : t).replace(/<[^>]+>/g, ''); }

  /* A topic's group colour, as a live CSS reference into the room palette (styles.css --room-*,
     the flat per-group map that carries both light and dark variants) -- NOT a baked hex. Keyed by
     the topic's group id, so the star pill's edge matches its room card / index dot exactly and
     retints per theme for free. Falls back to the current accent only when the topic/group is
     unknown. */
  function groupColorFor(id) {
    var t = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.get(id) : null;
    var g = (t && t.identity) ? t.identity.group : null;
    return g ? 'var(--room-' + g + ')' : 'var(--acc)';
  }

  /* THE ENGAGEMENT PREDICATE -- the one true answer to "has this user done anything?".
     `Store.keys('').length > 0` is NOT it, and never was: it is satisfied by the app's OWN
     first-paint write (markViewSeen -> `viewseen.<topic>`), and by a theme toggle, and by a
     dismissed storage notice. So the first-run screen disarmed itself on visit 2 for a user who
     had written nothing. Drilled, whiteboarded, mocked, or mixed-fired -- that is engagement. */
  function engaged() {
    if (typeof Progress === 'undefined') return false;
    var sum = Progress.summary();
    /* Wave 0: mock/mix records are now PER TOPIC, so the live mockRuns/mixLog globals speak only
       for the CURRENT topic. "Has the user mocked or mixed-fired on ANY topic?" is a cross-topic
       question -- mockRanAny()/mixRanAny() enumerate the per-topic keys (skipping the discarded
       legacy globals). A user who only ever mocked, on a topic they are not currently viewing,
       stays correctly "engaged" -- reading the live globals here would have flipped them to the
       first-run screen the moment they navigated away from the topic they mocked. */
    var mocked = (typeof mockRanAny === 'function') ? mockRanAny() : false;
    var mixed = (typeof mixRanAny === 'function') ? mixRanAny() : false;
    return sum.startedTopics > 0 || mocked || mixed;
  }

  /* ---- the pieces of the dashboard ------------------------------------------------------ */

  /* a glanceable sparkline of drill-solid across recent sessions, from the auto-captured trend log */
  function trendSparkHome() {
    try {
      if (typeof Store === 'undefined' || typeof parseCodes !== 'function' || typeof spark !== 'function') return '';
      var v = Store.get('trend.hist'); if (!v) return '';
      var hist = JSON.parse(v); if (!Array.isArray(hist) || hist.length < 2) return '';
      var objs = parseCodes(hist.join('\n')); if (objs.length < 2) return '';
      var series = objs.map(function (o) { return o.dGot; });
      return '<div class="ix-trend"><div class="ix-home-k">Recent sessions</div>' +
        '<div class="ix-trend-s">' + spark(series) + '</div>' +
        '<div class="ix-trend-v">solid drilled, last ' + series.length + ' sessions</div></div>';
    } catch (e) { return ''; }
  }

  /* consecutive calendar days with a logged session. 0 if the last was 2+ days ago (broken). */
  function studyStreak() {
    try {
      if (typeof Store === 'undefined') return 0;
      var v = Store.get('trend.hist'); if (!v) return 0;
      var hist = JSON.parse(v); if (!Array.isArray(hist) || !hist.length) return 0;
      var set = {};
      for (var i = 0; i < hist.length; i++) { var m = /CPR1\.(\d{8})\./.exec(hist[i]); if (m) set[m[1]] = 1; }
      var days = Object.keys(set).sort(); if (!days.length) return 0;
      function toD(x) { return new Date(+x.slice(0, 4), +x.slice(4, 6) - 1, +x.slice(6, 8)); }
      var DAY = 86400000, now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var last = toD(days[days.length - 1]);
      if (Math.round((today - last) / DAY) > 1) return 0;
      var streak = 1;
      for (var j = days.length - 2; j >= 0; j--) { if (Math.round((toD(days[j + 1]) - toD(days[j])) / DAY) === 1) streak++; else break; }
      return streak;
    } catch (e) { return 0; }
  }

  /* spaced-repetition nudge: topics drilled fully CLEAN but long enough ago to be worth a refresh.
     (Only works because migrate() no longer restamps ts -- see progress.js. It was silently empty
     for every user after every content release.) */
  function dueReview() {
    if (typeof Progress === 'undefined' || typeof TopicRegistry === 'undefined') return '';
    var all = Progress.all(), now = Date.now(), DAY = 86400000, ids = TopicRegistry.ids(), due = [];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], pr = all[id];
      if (!pr || !pr.ts || !pr.done || !pr.tot) continue;
      var shaky = (pr.shk > 0) || (pr.revisit && pr.revisit.length);
      if (shaky || pr.done < pr.tot) continue;
      var days = Math.floor((now - pr.ts) / DAY);
      if (days >= 7) due.push({ id: id, days: days });
    }
    if (!due.length) return '';
    due.sort(function (a, b) { return b.days - a.days; });
    var pills = due.slice(0, 4).map(function (d) {
      var t = TopicRegistry.get(d.id);
      return '<button class="ix-due-b" type="button" data-topic="' + d.id + '">' + (t ? t.identity.title : d.id) + '<span class="ix-due-n">' + d.days + 'd</span></button>';
    }).join('');
    return '<div class="ix-due"><div class="ix-home-k">Refresh &middot; drilled clean a while ago</div><div class="ix-due-list">' + pills + '</div></div>';
  }

  function weekStartMs() {
    var n = new Date(), d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    var back = (d.getDay() === 0) ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - back); return d.getTime();
  }
  function goalTarget() {
    try { if (typeof Store !== 'undefined') { var t = Store.get('goal.weekly', 5); if (typeof t === 'number' && t >= 1 && t <= 20) return t; } } catch (e) {}
    return 5;
  }
  function weeklyGoal() {
    var target = goalTarget(), done = 0;
    try { if (typeof Progress !== 'undefined') { var a = Progress.all(), ws = weekStartMs(); for (var id in a) { if (a[id] && a[id].done > 0 && a[id].ts >= ws) done++; } } } catch (e) {}
    return { target: target, done: done, pct: target > 0 ? Math.min(100, Math.round(done / target * 100)) : 0, met: done >= target };
  }
  function goalStrip() {
    var g = weeklyGoal(), left = g.target - g.done;
    var note = g.met ? 'Goal met &mdash; nice work.' : left + ' more to go';
    return '<div class="ix-goal"><div class="ix-goal-top"><span class="ix-home-k">This week&rsquo;s goal</span>' +
      '<span class="ix-goal-set"><button type="button" class="ix-goal-b" data-goal="dec" aria-label="Lower the weekly goal">&minus;</button>' +
      '<span class="ix-goal-t" aria-live="polite">' + g.target + '</span>' +
      '<button type="button" class="ix-goal-b" data-goal="inc" aria-label="Raise the weekly goal">+</button></span></div>' +
      '<div class="ix-goal-bar' + (g.met ? ' met' : '') + '"><span style="width:' + g.pct + '%"></span></div>' +
      '<div class="ix-home-v"><b>' + g.done + '</b> of ' + g.target + ' topics drilled this week &middot; ' + note + '</div></div>';
  }

  /* WHERE THE USER LEFT OFF. LastVisit (topic+view) first; the most recently graded topic as a
     fallback for a user who drilled before nav.last existed. */
  function resumeTarget() {
    if (typeof Progress === 'undefined' || typeof TopicRegistry === 'undefined') return null;
    var all = Progress.all(), lastId = null, lastTs = 0;
    for (var id in all) { if (all[id] && all[id].ts > lastTs) { lastTs = all[id].ts; lastId = id; } }
    var visitId = (typeof LastVisit !== 'undefined' && LastVisit.topicId) ? LastVisit.topicId() : null;
    var useVisit = !!(visitId && TopicRegistry.get(visitId));
    var resumeId = useVisit ? visitId : lastId;
    if (!resumeId || !TopicRegistry.get(resumeId)) return null;
    return {
      id: resumeId,
      topic: TopicRegistry.get(resumeId),
      hash: (useVisit && LastVisit.hash) ? LastVisit.hash() : null,
    };
  }

  function weakChips(n) {
    if (typeof Progress === 'undefined' || typeof TopicRegistry === 'undefined') return { chips: '', concepts: '' };
    var sum = Progress.summary();
    var weak = sum.weakest.slice(0, n || 3).map(function (w) {
      var t = TopicRegistry.get(w.id);
      return '<button class="ix-weak-b" type="button" data-topic="' + w.id + '">' + (t ? t.identity.title : w.id) + (w.shk ? '<span class="ix-weak-n">' + w.shk + '</span>' : '') + '</button>';
    }).join('');
    var concepts = [];
    sum.weakest.slice(0, n || 3).forEach(function (w) {
      var pr = Progress.get(w.id);
      if (pr && pr.revisit && pr.revisit.length) { for (var ci = 0; ci < pr.revisit.length && concepts.length < 5; ci++) concepts.push(pr.revisit[ci]); }
    });
    return {
      chips: weak,
      concepts: concepts.length ? '<div class="ix-weak-concepts">' + concepts.map(function (c) { return '<span class="ix-wc">' + c + '</span>'; }).join('') + '</div>' : '',
    };
  }

  /* ---- the actions ---------------------------------------------------------------------- */

  function weakCount() {
    if (typeof TopicRegistry === 'undefined' || typeof Progress === 'undefined' || !Progress.status) return 0;
    var ids = TopicRegistry.ids(), n = 0;
    for (var i = 0; i < ids.length; i++) if (Progress.status(ids[i]) === 'weak') n++;
    return n;
  }
  function weakDrillBar() {
    var n = weakCount();
    if (!n) return '';
    return '<button class="ix-cross ix-cross-weak" type="button" data-cross="weak"><span class="ix-cross-tx"><span class="ix-cross-k">Weak-spot review</span><span class="ix-cross-d">Drill probes from the ' + n + ' topic' + (n === 1 ? '' : 's') + ' you have been shaky on</span></span><span class="ix-cross-ar">&rarr;</span></button>';
  }
  function crossDrillBar() {
    if (typeof TopicRegistry === 'undefined' || !TopicRegistry.ids().length) return '';
    return '<button class="ix-cross" type="button" data-cross="1"><span class="ix-cross-tx"><span class="ix-cross-k">Cross-topic drill</span><span class="ix-cross-d">Random probes from every topic &mdash; the interview shuffle</span></span><span class="ix-cross-ar">&rarr;</span></button>';
  }
  function actionsHtml() { return crossDrillBar() + weakDrillBar(); }

  /* THE TELEMETRY, as its own surface. On the old entry screen goal + streak + trend + refresh sat
     ABOVE the single choice on offer -- roughly 40-45% of the surface, all of it a report on the
     past. The home renders this BELOW the decision. The old "By area" bars (groupBars) are GONE,
     not moved: roomsHtml() supersedes them outright -- it shows all six rooms, not just the ones
     you happen to have touched, with honest coverage, a weak count and a started count. */
  function telemetryHtml() {
    if (!engaged()) return '';
    return goalStrip() + trendSparkHome() + dueReview();
  }

  /* ---- the library --------------------------------------------------------------------- */

  function starredSection() {
    if (typeof Bookmarks === 'undefined' || typeof TopicRegistry === 'undefined') return '';
    var ids = Bookmarks.all().filter(function (id) { return !!TopicRegistry.get(id); });
    if (!ids.length) return '';
    var pills = ids.map(function (id) {
      var t = TopicRegistry.get(id);
      return '<button class="ix-star-pill" type="button" data-topic="' + id + '" style="box-shadow:inset 3px 0 0 ' + groupColorFor(id) + '"><span class="ix-star-ic">&#9733;</span>' + t.identity.title + '</button>';
    }).join('');
    return '<section class="ix-starred"><div class="ix-g-head"><span class="ix-g-dot" style="background:#f59e0b"></span>Starred <span class="ix-g-n">' + ids.length + '</span></div><div class="ix-star-row">' + pills + '</div></section>';
  }

  function topicCard(id, groupId, curId) {
    var t = TopicRegistry.get(id), idn = t.identity, on = (id === curId);
    var th = thesisText(idn.thesis || '');
    var _st = (typeof Progress !== 'undefined') ? Progress.status(id) : 'untouched';
    var _pr = (typeof Progress !== 'undefined') ? Progress.get(id) : null;
    var _wb = (typeof Progress !== 'undefined' && Progress.wbGet) ? Progress.wbGet(id) : null;
    var _wbFull = !!(_wb && _wb.total && _wb.got >= _wb.total), _wbSome = !!(_wb && _wb.got > 0);
    var _wbMark = _wbSome ? '<b class="ix-c-wb" title="Design recalled on the whiteboard">&#9998;</b>' : '';
    var _bdg = '';
    if (_st === 'in-progress' && _pr) _bdg = '<span class="ix-c-badge"><i style="background:var(--acc)"></i>' + _pr.done + '/' + _pr.tot + _wbMark + '</span>';
    else if (_st === 'weak') { var _wn = (_pr ? _pr.shk : 0) + ((typeof Progress !== 'undefined' && Progress.shakyMarks) ? Progress.shakyMarks(id) : 0); _bdg = '<span class="ix-c-badge"><i style="background:#dc2626"></i>' + _wn + ' weak' + _wbMark + '</span>'; }
    else if (_st === 'solid') _bdg = _wbFull
      ? '<span class="ix-c-badge ix-c-ready"><i style="background:var(--acc)"></i>ready</span>'
      : '<span class="ix-c-badge"><i style="background:#0d9488"></i>done' + _wbMark + '</span>';
    else if (_wbSome) _bdg = '<span class="ix-c-badge"><i style="background:var(--acc)"></i>recalled</span>';
    var filt = ((idn.title || '') + ' ' + (idn.locatorTail || '') + ' ' + th).toLowerCase().replace(/&[a-z#0-9]+;/g, ' ').replace(/"/g, '');
    var resetBtn = (_st !== 'untouched') ? '<button class="ix-c-reset" type="button" data-reset="' + id + '" title="Reset progress for this topic" aria-label="Reset progress for ' + idn.title + '">&#8635;</button>' : '';
    return '<div class="ix-cell"><button class="ix-card' + (on ? ' on' : '') + '" type="button" data-topic="' + id + '" data-filter="' + filt + '" style="box-shadow:inset 3px 0 0 var(--room-' + groupId + ')"' +
      (on ? ' aria-current="true"' : '') + '>' + _bdg +
      '<span class="ix-c-name">' + idn.title + '</span>' +
      '<span class="ix-c-tail">' + idn.locatorTail + '</span>' +
      (th ? '<span class="ix-c-thesis">' + th + '</span>' : '') + '</button>' + resetBtn + '</div>';
  }

  function buckets() { return (typeof groupedTopicIds === 'function') ? groupedTopicIds() : []; }

  /* The filter row + starred + all 46 cards, grouped. Shared by the switcher and the home.
     `lead` is markup placed INSIDE the scroller, above Starred. The switcher passes actionsHtml()
     there so the two drill bars scroll AWAY and give the library the box back; the home renders
     its actions as their own section and passes nothing. */
  function libraryHtml(lead) {
    var bks = buckets();
    var cur = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    var curId = cur ? cur.id : null;
    var filter = '<div class="ix-filter-row"><input class="ix-filter" type="text" placeholder="Filter topics by name or idea..." aria-label="Filter topics"><span class="ix-nores" hidden>No topics match.</span></div>';
    var body = bks.map(function (b) {
      var cards = b.ids.map(function (id) { return topicCard(id, b.group.id, curId); }).join('');
      return '<section class="ix-group" data-group="' + b.group.id + '" style="--rm:var(--room-' + b.group.id + ')"><div class="ix-g-head"><span class="ix-g-dot" style="background:var(--rm)"></span>' + b.group.label +
        ' <span class="ix-g-n">' + b.ids.length + '</span>' +
        '<button class="ix-g-cram" type="button" data-cross="group:' + b.group.id + '">Cram &rarr;</button></div>' +
        (b.group.desc ? '<div class="ix-g-desc">' + b.group.desc + '</div>' : '') +
        '<div class="ix-grid">' + cards + '</div></section>';
    }).join('');
    return filter + '<div class="ix-scroll">' + (lead || '') + starredSection() +
      (bks.length ? body : '<div class="ix-empty">No topics registered.</div>') + '</div>';
  }

  /* THE SIX ROOMS. A cold user's real question is "what is in here?" -- six rooms answers it;
     forty-six tiles does not. Coverage is honest only because progress.js now counts untouched
     topics in the denominator. */
  function roomsHtml() {
    if (typeof TOPIC_GROUPS === 'undefined' || typeof Progress === 'undefined') return '';
    var bks = buckets(); if (!bks.length) return '';
    var sum = Progress.summary(), bg = sum.byGroup || {};
    var cards = bks.map(function (b, i) {
      var g = b.group, d = bg[g.id] || { done: 0, tot: 0, touched: 0, n: b.ids.length };
      var pc = d.tot > 0 ? Math.round(d.done / d.tot * 100) : 0;
      var weak = 0;
      b.ids.forEach(function (id) { if (Progress.status(id) === 'weak') weak++; });
      var meta = d.touched + ' of ' + b.ids.length + ' started';
      var weakHtml = weak ? '<span class="hm-room-weak">' + weak + ' weak</span>' : '';
      return '<button class="hm-room" type="button" data-room="' + g.id + '" style="--rm:var(--room-' + g.id + ')">' +
        '<span class="hm-room-k"><span class="hm-room-n">' + (i + 1) + '</span>' + g.label + '</span>' +
        '<span class="hm-room-c">' + b.ids.length + ' topics &middot; ' + meta + '</span>' +
        '<span class="hm-room-bar"><i style="width:' + pc + '%"></i></span>' +
        '<span class="hm-room-f"><span class="hm-room-pct">' + pc + '% drilled</span>' + weakHtml + '</span>' +
        '</button>';
    }).join('');
    return '<section class="hm-rooms"><h2 class="hm-h">Choose a room</h2><div class="hm-room-grid">' + cards + '</div></section>';
  }

  /* ---- the footer ---------------------------------------------------------------------- */

  /* `withReset` is deliberately opt-IN. "Reset all saved progress" is destructive and
     irreversible; it does not belong on the surface the app opens on. It lives in Tools.

     NOTE the predicate here is deliberately NOT engaged(). Export and Reset act on the STORE, so
     the right question is "is there stored data?", not "has the user studied?" -- a user with only
     a theme saved does have something to export. engaged() answers a different question (should we
     show the first-run prompt), and conflating the two is what put the wrong one in the boot gate. */
  function footerHtml(withReset) {
    var any = (typeof Store !== 'undefined' && Store.keys && Store.keys('').length > 0);
    var io = '<button class="ix-io" type="button" data-io="export"' + (any ? '' : ' disabled') + '>Export a backup</button>' +
      '<button class="ix-io" type="button" data-io="import-btn">Import a backup</button>' +
      '<input type="file" accept="application/json,.json" hidden data-io="import">';
    var reset = (withReset && any) ? '<button class="ix-reset" type="button">Reset all saved progress</button>' : '';
    return '<div class="ix-foot">' + io + reset + '</div>';
  }

  /* ---- backup / restore ------------------------------------------------------------------ */

  function downloadBackup() {
    if (typeof Store === 'undefined' || !Store.dump) return;
    var payload = { app: 'deepdive-rehearsal', v: 1, exported: new Date().toISOString(), data: Store.dump() };
    var json = JSON.stringify(payload, null, 2);
    try {
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'deepdive-rehearsal-backup.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 120);
    } catch (e) { try { window.prompt('Copy your backup JSON:', json); } catch (e2) {} }
  }
  function importBackup(file) {
    if (!file || typeof Store === 'undefined' || !Store.restore) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed; try { parsed = JSON.parse(reader.result); } catch (e) { window.alert('That file is not valid JSON.'); return; }
      var data = (parsed && parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
      if (!data || typeof data !== 'object') { window.alert('That does not look like a backup.'); return; }
      if (window.confirm('Import this backup? It merges into your current data and reloads.')) { Store.restore(data); location.reload(); }
    };
    reader.readAsText(file);
  }

  /* soft undo for per-topic resets: snapshot the topic's keys, offer a few-seconds Undo. */
  var _undoT = null, _undoEl = null;
  function topicKeys(id) { return ['progress.' + id, 'shakymark.' + id, 'wbprog.' + id]; }
  function captureTopic(id) { var ks = topicKeys(id), snap = {}; for (var i = 0; i < ks.length; i++) { var v = (typeof Store !== 'undefined') ? Store.get(ks[i]) : null; if (v !== null && v !== undefined) snap[ks[i]] = v; } return snap; }
  function restoreTopic(snap) { if (typeof Store === 'undefined') return; for (var k in snap) if (snap.hasOwnProperty(k)) Store.set(k, snap[k]); }
  function showUndo(msg, onUndo) {
    if (!_undoEl) { _undoEl = document.createElement('div'); _undoEl.className = 'ix-undo'; _undoEl.setAttribute('role', 'status'); document.body.appendChild(_undoEl); }
    _undoEl.innerHTML = '<span class="ix-undo-msg"></span><button class="ix-undo-btn" type="button">Undo</button>';
    _undoEl.querySelector('.ix-undo-msg').textContent = msg;
    _undoEl.classList.add('show');
    var hide = function () { if (_undoEl) _undoEl.classList.remove('show'); if (_undoT) { clearTimeout(_undoT); _undoT = null; } };
    _undoEl.querySelector('.ix-undo-btn').onclick = function () { hide(); if (onUndo) onUndo(); };
    if (_undoT) clearTimeout(_undoT);
    _undoT = setTimeout(hide, 6000);
  }

  /* live filter: show only cards whose data-filter contains the query, hide empty groups. */
  function applyFilter(root, q) {
    if (!root) return;
    q = (q || '').trim().toLowerCase();
    var groups = root.querySelectorAll('.ix-group'), anyGlobal = false;
    for (var i = 0; i < groups.length; i++) {
      var cards = groups[i].querySelectorAll('.ix-card'), anyG = false;
      for (var j = 0; j < cards.length; j++) {
        var match = !q || (cards[j].getAttribute('data-filter') || '').indexOf(q) > -1;
        cards[j].style.display = match ? '' : 'none';
        if (match) { anyG = true; anyGlobal = true; }
      }
      groups[i].style.display = anyG ? '' : 'none';
    }
    var nores = root.querySelector('.ix-nores');
    if (nores) nores.hidden = !(q && !anyGlobal);
  }
  /* the visible cards, in DOM order -- the filter's live result set */
  function visibleCards(root) {
    return Array.prototype.filter.call(root.querySelectorAll('.ix-card'), function (c) { return c.offsetParent !== null; });
  }

  /* ===== THE ONE DELEGATED HANDLER, for BOTH roots =====
     opts.rerender()    re-render this root in place (the caller owns its own markup)
     opts.onPick(kind)  something was chosen, BEFORE it is acted on. kind is 'topic' | 'hash' |
                        'cross'. The switcher closes on any of them. The home has to distinguish:
                        a 'hash' pick assigns location.hash, which routes away from #home on its
                        own, so navigating first as well would push a junk history entry and break
                        the Back button. A 'topic' pick calls TopicRegistry.setTopic, whose
                        Router.setTopic is a NO-OP on a topic-less route -- so the home MUST
                        navigate itself or nothing would happen at all.
     opts.onClose()     the .ix-x button + backdrop click. Omit on the home: it is not a modal.
     opts.onRoom(id)    a room card was chosen (home only) */
  function bind(root, opts) {
    opts = opts || {};
    var rerender = opts.rerender || function () {};
    var pick = opts.onPick || function () {};

    root.addEventListener('change', function (e) {
      var fi = e.target.closest ? e.target.closest('[data-io="import"]') : null;
      if (fi && fi.files && fi.files[0]) { importBackup(fi.files[0]); fi.value = ''; }
    });

    root.addEventListener('click', function (e) {
      if (opts.onClose && e.target === root) { opts.onClose(); return; }        /* backdrop */
      var closer = e.target.closest ? e.target.closest('.ix-x') : null;
      if (closer && opts.onClose) { opts.onClose(); return; }

      var resetBtn = e.target.closest ? e.target.closest('.ix-reset') : null;
      if (resetBtn) {
        if (window.confirm('Clear all saved progress and data? This cannot be undone.')) {
          if (typeof Store !== 'undefined' && Store.clearAll) Store.clearAll();
          rerender();
        }
        return;
      }
      var ioBtn = e.target.closest ? e.target.closest('[data-io="export"]') : null;
      if (ioBtn) { downloadBackup(); return; }
      var impBtn = e.target.closest ? e.target.closest('[data-io="import-btn"]') : null;
      if (impBtn) { var fi = root.querySelector('[data-io="import"]'); if (fi) fi.click(); return; }

      var crossBtn = e.target.closest ? e.target.closest('[data-cross]') : null;
      if (crossBtn) { var _m = crossBtn.getAttribute('data-cross'); pick('cross'); if (window.CrossDrill && CrossDrill.open) CrossDrill.open(_m); return; }

      var roomBtn = e.target.closest ? e.target.closest('[data-room]') : null;
      if (roomBtn && opts.onRoom) { opts.onRoom(roomBtn.getAttribute('data-room')); return; }

      var hashBtn = e.target.closest ? e.target.closest('[data-hash]') : null;
      if (hashBtn) { var _h = hashBtn.getAttribute('data-hash'); pick('hash'); try { location.hash = _h; } catch (e2) {} return; }

      var perReset = e.target.closest ? e.target.closest('[data-reset]') : null;
      if (perReset) {
        var rid = perReset.getAttribute('data-reset');
        var rt2 = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.get(rid) : null;
        var nm = rt2 ? rt2.identity.title.replace(/&[a-z#0-9]+;/g, ' ').trim() : 'this topic';
        var _snap = captureTopic(rid);
        if (typeof Progress !== 'undefined' && Progress.clear) Progress.clear(rid);
        rerender();
        showUndo('Cleared progress for ' + nm, function () { restoreTopic(_snap); rerender(); });
        return;
      }

      var goalBtn = e.target.closest ? e.target.closest('[data-goal]') : null;
      if (goalBtn) {
        var gdir = goalBtn.getAttribute('data-goal');
        var gcur = goalTarget();
        gcur = gdir === 'inc' ? Math.min(20, gcur + 1) : Math.max(1, gcur - 1);
        try { if (typeof Store !== 'undefined') Store.set('goal.weekly', gcur); } catch (e3) {}
        var gEl = root.querySelector('.ix-goal');
        if (gEl) { var _gt = document.createElement('div'); _gt.innerHTML = goalStrip(); if (_gt.firstChild) gEl.replaceWith(_gt.firstChild); }
        var _nb = root.querySelector('[data-goal="' + gdir + '"]'); if (_nb) _nb.focus();
        return;
      }

      var card = e.target.closest ? e.target.closest('[data-topic]') : null;
      if (card) {
        var id = card.getAttribute('data-topic');
        pick('topic');
        if (id && typeof TopicRegistry !== 'undefined' && TopicRegistry.setTopic) TopicRegistry.setTopic(id);
      }
    });

    /* the live filter + ENTER COMMITS THE TOP MATCH. Typing `saga` narrows 46 -> 1 and Enter used
       to do nothing -- you had to ArrowDown first. That is the whole difference between a list
       with a filter and a command palette. */
    var filt = root.querySelector('.ix-filter');
    if (filt) {
      filt.addEventListener('input', function () { applyFilter(root, filt.value); });
      filt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var vis = visibleCards(root);
          if (vis.length) { e.preventDefault(); vis[0].click(); }
        } else if (e.key === 'ArrowDown') {
          var v2 = visibleCards(root);
          if (v2.length) { e.preventDefault(); v2[0].focus(); }
        }
      });
    }

    /* roving arrows across the visible cards */
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (e.target && e.target.classList && e.target.classList.contains('ix-filter')) return;   /* the input owns its own keys */
        var cards = visibleCards(root);
        if (!cards.length) return;
        e.preventDefault();
        var idx = Array.prototype.indexOf.call(cards, document.activeElement);
        var fwd = (e.key === 'ArrowDown' || e.key === 'ArrowRight');
        var nx = idx === -1 ? (fwd ? cards[0] : cards[cards.length - 1]) : cards[fwd ? Math.min(idx + 1, cards.length - 1) : Math.max(idx - 1, 0)];
        nx.focus();
      }
    });
  }

  /* Reset-all now lives in Tools (index.html), not on any entry surface. Same confirm, same
     Store.clearAll; a reload because every surface in the app reads this store. */
  function wireToolsReset() {
    var b = document.getElementById('resetall');
    if (!b) return;
    b.addEventListener('click', function () {
      if (window.confirm('Clear all saved progress and data? This cannot be undone.')) {
        if (typeof Store !== 'undefined' && Store.clearAll) Store.clearAll();
        try { location.reload(); } catch (e) {}
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireToolsReset);
  else wireToolsReset();

  window.Panels = {
    roomsHtml: roomsHtml,
    actionsHtml: actionsHtml,
    telemetryHtml: telemetryHtml,
    libraryHtml: libraryHtml,
    footerHtml: footerHtml,
    bind: bind,
    engaged: engaged,
    studyStreak: studyStreak,
    resumeTarget: resumeTarget,
    weakChips: weakChips,
    downloadBackup: downloadBackup,
  };
})();
