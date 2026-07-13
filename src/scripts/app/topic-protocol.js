/* ============ TopicPane protocol -- FOUNDATION (Keystone A, Phase 0) ============
   The DORMANT multi-topic machinery: a TopicPane base class + a TopicRegistry
   singleton + the single switch path (setTopic) + the cross-pane working-set
   globals the registry OWNS and republishes on every switch.

   Phase 0 contract: this loads AFTER shared-sheets/base-styles (so BASE_SHEET /
   *_SHEET exist) and BEFORE the topic-data bundle + the 9 pane classes. In Phase
   0 NO pane extends TopicPane yet -- the panes stay plain HTMLElement and read
   these globals as before. The registry exists, current() is non-null after the
   bundle registers topic 1, but no pane subscribes to deeptopicchange until its
   agent converts it. Topic 1 renders byte-identically with zero behaviour change.

   Offline-safe: no network, storage, or permission calls. */

/* Cross-pane WORKING SET. drill, mixed-fire AND mock-run read these as module
   globals -- so the registry OWNS them here and republishes them in ONE place on
   every switch. (drill/logic.js's `var _allCards=cards` etc. move out to here;
   mock-run/data.js's mockBeats/curveballPool/framePool/indices move to bank.js
   and are seeded here by publishBanks.) */
var cards = [], speakLines = [], _allCards = [], _allSpeak = [];
var curveballPool = [], mockBeats = [], mockBeatsBank = [], framePool = [], mockCurveIdx = -1, mockFrameIdx = -1;
var TOPIC_CMP_NOTES = {};   /* shell.js __syncCompanion reads this (was a closure-local map) */

/* Copy a beat / curveball off the canonical bank. A beat is flat strings PLUS the
   nested int/int2 QA objects, so a `for (k in x)` copy alone still hands out live
   references to those two -- clone them explicitly. */
function cloneBeat(x) {
  var o = {}, k;
  for (k in x) o[k] = x[k];
  if (x.int) o.int = { q: x.int.q, a: x.int.a };
  if (x.int2) o.int2 = { q: x.int2.q, a: x.int2.a };
  return o;
}

/* Fresh beats for ONE mock run, off the pristine per-topic bank, with the
   curveball/frame slots re-derived from the tags. Called by publishBanks on every
   topic switch AND by openMock on every run: a run therefore always starts from
   the AUTHORED arc, so a previous run's curveball swap or frame-cue roll can never
   accumulate, and no run can write through into the topic bank.
   -1 = the topic authored no such beat (the 38 markdown topics tag their two beats
   SCALE + DESIGN, so they have NEITHER a FRAME nor a CURVEBALL slot). It must not
   silently fall back to 0, which aimed both writes at beat 0. */
function resetMockBeats() {
  mockBeats = mockBeatsBank.map(cloneBeat);
  mockCurveIdx = -1; mockFrameIdx = -1;
  for (var i = 0; i < mockBeats.length; i++) {
    if (mockBeats[i].tag === 'CURVEBALL') mockCurveIdx = i;
    if (mockBeats[i].tag === 'FRAME') mockFrameIdx = i;
  }
}

/* Reseed cross-pane globals from a topic's bank, synchronously, BEFORE the event
   fires and before any overlay re-reads them. mock-run MUTATES its beats in place,
   so it renders from a private copy; the canonical topic data is never clobbered.

   THE POOL IS CLONED, NOT SLICED. Both bank builders assemble the curveball pool as
   [ the CURVEBALL mockBeat, ...extras ] -- each topic's own bank.js, and parse_md.mjs's
   `curveballs: (cb ? [cb] : []).concat(extraCurve)` -- so pool[0] IS a canonical beat
   object. A .slice() copies the ARRAY and shares the OBJECTS, so a write through any
   pool entry lands in t.data.bank -- permanently, for the whole session, across topic
   switches -- and mixed-fire, which draws from this same pool, renders the damage. */
function publishBanks(t) {
  var b = t.data.bank;
  _allCards = b.cards; _allSpeak = b.speak;
  cards = _allCards.slice(); speakLines = _allSpeak.slice();
  curveballPool = b.curveballs.map(cloneBeat);
  mockBeatsBank = b.mockBeats.map(cloneBeat);
  resetMockBeats();
  framePool = (b.frames && b.frames.slice()) || (mockFrameIdx >= 0 ? [mockBeats[mockFrameIdx].cue] : []);
}

/* The ONLY home for the scattered light-DOM identity (index.html x6 + mobile
   mcomp mirror + cmpNotes + cram). Called on every switch; topic 1 stays
   hard-coded in index.html for first paint, so applyIdentity does NOT run at
   boot. */
function applyIdentity(idn) {
  var q = function (s) { return document.querySelector(s); },
      byId = function (i) { return document.getElementById(i); };
  /* Stamp the ROOM on <html>. Every var(--acc)/--acc-aNN in every shadow sheet then
     retints to this room's ink (styles.css THE SIX ROOMS). Boot is pre-stamped in
     index.html, so this only has to hold the room across switches. */
  if (idn.group) document.documentElement.setAttribute('data-group', idn.group);
  var LOC_KEYS = { 'messaging-events': 'MSG', 'data-storage': 'DAT', 'reliability-observability': 'REL', 'platform-infra': 'PLT', 'architecture-apis': 'ARC', 'security-tenancy': 'SEC' };
  /* THE LOCATOR NAMES THE ROOM ONCE. It used to render `ARC | ARCHITECTURE & APIS . ingestion
     layer` -- a three-letter code immediately followed by the very words it abbreviates. Beyond
     the stutter, the redundancy cost real space: at 260px the badge WRAPPED TO TWO LINES in the
     longer rooms (REL / ARC), where before the room pass it was one clean line.
     The CODE is the one that stays: it is the CVD/greyscale-safe room marker that styles.css
     added .loc-key for in the first place ("colour alone, across six hues, fails; the letters
     do not"), and it is a fixed 3 chars in every room, so the badge cannot wrap again. The
     spelled-out label is not lost -- it moves to the ACCESSIBLE name, which costs zero width:
     title= for a hover expansion, aria-label= so a screen reader still hears "Architecture &
     APIs" rather than spelling out three letters. */
  var L = q('.locator');
  if (L) {
    var _gl = '';
    if (typeof TOPIC_GROUPS !== 'undefined' && idn.group) {
      for (var _gi = 0; _gi < TOPIC_GROUPS.length; _gi++) {
        if (TOPIC_GROUPS[_gi].id === idn.group) { _gl = TOPIC_GROUPS[_gi].label; break; }
      }
    }
    var _key = LOC_KEYS[idn.group] || '';
    var _kh = _key ? '<span class="loc-key">' + _key + '</span>' : '';
    L.innerHTML = _kh + idn.locatorTail;
    var _txt = L.textContent || '';
    var _tail = (_key && _txt.indexOf(_key) === 0) ? _txt.slice(_key.length) : _txt;
    var _plain = _gl.replace(/&amp;/g, '&');
    if (_plain) {
      L.setAttribute('title', _plain);
      L.setAttribute('aria-label', _plain + ' \u2014 ' + _tail);
    }
  }
  var H = q('.hdr h1'); if (H) H.textContent = idn.h1;
  var S = q('.hdr .sub'); if (S) S.innerHTML = idn.sub;
  document.querySelectorAll('.cmp-topic').forEach(function (el) { el.textContent = idn.companionTopic; });
  if (q('.cmp-thesis')) q('.cmp-thesis').innerHTML = idn.thesis;
  var spineHtml = idn.spine.map(function (s) { return '<li><span class="cmp-dot"></span><span>' + s + '</span></li>'; }).join('');
  document.querySelectorAll('.cmp-spine').forEach(function (ul) { ul.innerHTML = spineHtml; });
  /* Both overlay headers, BY ID. (They share the .cram-title class, so the old
     q('.cram-title') only ever renamed whichever came first in the DOM -- the cram
     one -- and left the scope header naming no topic at all.) */
  var cramT = byId('cramtitle'); if (cramT) cramT.innerHTML = 'Cram sheet &middot; ' + idn.cramTitle;
  var scopeT = byId('scopetitle'); if (scopeT) scopeT.innerHTML = 'Scope it first &middot; ' + idn.cramTitle;
  /* A6: related topics in the same group -- rendered per topic, wired to setTopic */
  var rel = byId('cmpRelated');
  if (rel && typeof groupedTopicIds === 'function' && typeof TopicRegistry !== 'undefined') {
    var _cur = TopicRegistry.current(), _curId = _cur ? _cur.id : null, _bkt = null, _gg = groupedTopicIds();
    for (var _ri = 0; _ri < _gg.length; _ri++) { if (_gg[_ri].group.id === idn.group) { _bkt = _gg[_ri]; break; } }
    var _sibs = _bkt ? _bkt.ids.filter(function (x) { return x !== _curId; }) : [];
    if (_sibs.length) {
      var _links = _sibs.slice(0, 3).map(function (x) {
        var _tp = TopicRegistry.get(x), _ti = _tp ? _tp.identity : null;
        return '<button class="cmp-rel" type="button" data-topic="' + x + '"><span class="cmp-rel-t">' + (_ti ? _ti.title : x) + '</span><span class="cmp-rel-d">' + (_ti && _ti.locatorTail ? _ti.locatorTail : '') + '</span></button>';
      }).join('');
      rel.innerHTML = '<div class="cmp-h">More in <span style="color:var(--room-' + _bkt.group.id + ')">' + _bkt.group.label + '</span></div><div class="cmp-rel-list">' + _links + '</div>';
      rel.hidden = false;
      rel.onclick = function (e) { var b = e.target && e.target.closest ? e.target.closest('[data-topic]') : null; if (b) TopicRegistry.setTopic(b.getAttribute('data-topic')); };
    } else { rel.hidden = true; rel.innerHTML = ''; }
  }
  TOPIC_CMP_NOTES = idn.cmpNotes;
  if (window.__syncCompanion) window.__syncCompanion();
  if (window.ViewManager && ViewManager.refreshTitle) ViewManager.refreshTitle();
}

/* In-flight mock/mixed/session runs hold a topic-bound snapshot. Close them on
   switch so a half-finished run can't bleed across topics. */
function closeTransientOverlays() {
  ['mixov', 'mockov', 'sessov'].forEach(function (id) {
    var ov = document.getElementById(id);
    if (ov && ov.classList.contains('open')) { var x = ov.querySelector('.mock-x,.cram-x'); if (x) x.click(); }
  });
}

/* Content is brand-new after a swap: reset scroll, park focus on a stable
   landmark (so it is not dropped to <body> when the focused node is repainted
   away), announce. */
function afterTopicSwap(t) {
  try { window.scrollTo(0, 0); } catch (e) {}
  var st = document.querySelector('.stage'); if (st) st.scrollTop = 0;
  var head = document.getElementById('stagehead');
  if (head) { try { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); } catch (e) {} }
  var _grp = '';
  if (typeof TOPIC_GROUPS !== 'undefined' && t.identity.group) { for (var _ai = 0; _ai < TOPIC_GROUPS.length; _ai++) { if (TOPIC_GROUPS[_ai].id === t.identity.group) { _grp = TOPIC_GROUPS[_ai].label.replace(/&amp;/g, '&'); break; } } }
  if (window.ViewManager && ViewManager.announce) ViewManager.announce((_grp ? _grp + ': ' : '') + t.identity.h1);
}

var TopicRegistry = (function () {
  var byId = {}, order = [], cur = null, bootId = null;
  function register(t) {
    byId[t.id] = t; order.push(t.id);
    /* bootId = THE TOPIC A BARE HASH DECODES TO. The registry boots on the FIRST-REGISTERED topic
       (index.html's light DOM is hard-coded to it -- see applyIdentity, which deliberately does
       NOT run at boot), while ids() returns the DISPLAY order (sorted by topicOrderIndex). Those
       are different topics. router.js's topicPrefix() compared against ids()[0] and so disagreed
       with its own decoder: see the note there. Exposing the boot topic is what lets the encoder
       and the decoder agree on what "bare" means. */
    if (cur === null) { cur = t.id; bootId = t.id; publishBanks(t); TOPIC_CMP_NOTES = t.identity.cmpNotes; } /* first topic seeds the data side; light DOM already correct in index.html */
  }
  function current() { return cur ? byId[cur] : null; }
  function setTopic(id) {
    if (!byId[id] || id === cur) return false;          /* ignore unknown / no-op -> kills re-entrancy */
    cur = id; var t = byId[id];
    closeTransientOverlays();                            /* (1) */
    publishBanks(t);                                     /* (2) reseed globals BEFORE anyone reads */
    applyIdentity(t.identity);                           /* (3) one identity home */
    var fire = function () { window.dispatchEvent(new CustomEvent('deeptopicchange', { detail: { topic: t, id: id } })); };
    if (window.ViewTransitions && window.ViewTransitions.run && document.querySelector('.pane.on'))
      window.ViewTransitions.run(fire);                  /* (4) cross-fade ONLY the visible pane; other 8 are display:none */
    else fire();
    afterTopicSwap(t);                                   /* (5) scroll/focus/announce */
    if (window.Router && window.Router.setTopic) window.Router.setTopic(id); /* (6) reflect in hash, silently */
    return true;
  }
  return { register: register, current: current, get: function (i) { return byId[i]; }, ids: function () { var _a = order.slice(); if (typeof topicOrderIndex === 'function') _a.sort(function (x, y) { return topicOrderIndex(x) - topicOrderIndex(y); }); return _a; }, setTopic: setTopic, bootId: function () { return bootId; } };
})();

/* The ONE lifecycle all 9 panes will inherit (Phase 1). In Phase 0 NO pane
   extends this yet -- it is defined dormant so the contract name is frozen. */
class TopicPane extends HTMLElement {
  /* subclass: static dataKey = 'walk'|'drill'|'wb'|'sys'|'trade'|'model'|'num'|'rf'|'open'
     subclass implements: sheets(), styleText(), skeleton(), init(root), renderTopic(data, topic)
     subclass MAY implement: teardownTopic() -- release timers / drop transient state before a swap */
  connectedCallback() {
    if (this._tpBuilt) return;                           /* one-time HOST wiring -- survives every re-render */
    this._tpBuilt = true;
    var root = this.attachShadow({ mode: 'open' });      /* shadow attached ONCE, ever */
    this._root = root;
    root.adoptedStyleSheets = this.sheets();             /* adopted ONCE, never reassigned */
    root.innerHTML = '<style>' + this.styleText() + '</style>' + this.skeleton(); /* <style> + INVARIANT shell, ONCE */
    this.init(root);                                     /* ONE-TIME: cache mount refs + DELEGATED listeners on stable nodes */
    this._onTopic = function (e) { this._applyTopic(e.detail.topic, false); }.bind(this);
    window.addEventListener('deeptopicchange', this._onTopic);
    this._applyTopic(TopicRegistry.current(), true);     /* first paint */
  }
  _applyTopic(topic, first) {
    if (!topic) return;
    if (!first && this.teardownTopic) this.teardownTopic();                  /* stop timers, clear transient state */
    var hadFocus = !first && this._root && (this.contains(document.activeElement) || this._root.activeElement);
    this.renderTopic(topic.data[this.constructor.dataKey], topic);          /* in-place repaint of child mounts ONLY */
    if (hadFocus) { var land = this._root.querySelector('[data-autofocus]') || this; try { land.focus({ preventScroll: true }); } catch (e) {} }
  }
  disconnectedCallback() {
    if (this._onTopic) window.removeEventListener('deeptopicchange', this._onTopic);
    if (this.teardownTopic) this.teardownTopic();
  }
  /* hook defaults */
  sheets() { return [BASE_SHEET]; }
  styleText() { return ''; }
  skeleton() { return ''; }
  init() {}
  renderTopic() {}
}
