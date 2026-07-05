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
var curveballPool = [], mockBeats = [], framePool = [], mockCurveIdx = 0, mockFrameIdx = 0;
var TOPIC_CMP_NOTES = {};   /* shell.js __syncCompanion reads this (was a closure-local map) */

/* Reseed cross-pane globals from a topic's bank, synchronously, BEFORE the event
   fires and before any overlay re-reads them. mock-run MUTATES mockBeats in
   place, so it gets a private deep-ish copy; the canonical topic data is never
   clobbered. */
function publishBanks(t) {
  var b = t.data.bank;
  _allCards = b.cards; _allSpeak = b.speak;
  cards = _allCards.slice(); speakLines = _allSpeak.slice();
  curveballPool = b.curveballs.slice();
  mockBeats = b.mockBeats.map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; return o; });
  mockCurveIdx = 0; mockFrameIdx = 0;
  for (var i = 0; i < mockBeats.length; i++) {
    if (mockBeats[i].tag === 'CURVEBALL') mockCurveIdx = i;
    if (mockBeats[i].tag === 'FRAME') mockFrameIdx = i;
  }
  framePool = (b.frames && b.frames.slice()) || [mockBeats[mockFrameIdx] && mockBeats[mockFrameIdx].cue];
}

/* The ONLY home for the scattered light-DOM identity (index.html x6 + mobile
   mcomp mirror + cmpNotes + cram). Called on every switch; topic 1 stays
   hard-coded in index.html for first paint, so applyIdentity does NOT run at
   boot. */
function applyIdentity(idn) {
  var q = function (s) { return document.querySelector(s); },
      byId = function (i) { return document.getElementById(i); };
  var L = q('.locator'); if (L) { var _gl = '', _gc = ''; if (typeof TOPIC_GROUPS !== 'undefined' && idn.group) { for (var _gi = 0; _gi < TOPIC_GROUPS.length; _gi++) { if (TOPIC_GROUPS[_gi].id === idn.group) { _gl = TOPIC_GROUPS[_gi].label; _gc = TOPIC_GROUPS[_gi].color || ''; break; } } } var _dot = _gc ? '<span class="loc-dot" style="background:' + _gc + '"></span>' : ''; L.innerHTML = _dot + (_gl ? _gl + ' &middot; ' : '') + idn.locatorTail; }
  var H = q('.hdr h1'); if (H) H.textContent = idn.h1;
  var S = q('.hdr .sub'); if (S) S.innerHTML = idn.sub;
  document.querySelectorAll('.cmp-topic').forEach(function (el) { el.textContent = idn.companionTopic; });
  if (q('.cmp-thesis')) q('.cmp-thesis').innerHTML = idn.thesis;
  var spineHtml = idn.spine.map(function (s) { return '<li><span class="cmp-dot"></span><span>' + s + '</span></li>'; }).join('');
  document.querySelectorAll('.cmp-spine').forEach(function (ul) { ul.innerHTML = spineHtml; });
  var cramT = q('.cram-title'); if (cramT) cramT.innerHTML = 'Cram sheet &middot; ' + idn.cramTitle;
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
      rel.innerHTML = '<div class="cmp-h">More in <span style="color:' + (_bkt.group.color || 'var(--acc)') + '">' + _bkt.group.label + '</span></div><div class="cmp-rel-list">' + _links + '</div>';
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
  var byId = {}, order = [], cur = null;
  function register(t) {
    byId[t.id] = t; order.push(t.id);
    if (cur === null) { cur = t.id; publishBanks(t); TOPIC_CMP_NOTES = t.identity.cmpNotes; } /* first topic seeds the data side; light DOM already correct in index.html */
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
  return { register: register, current: current, get: function (i) { return byId[i]; }, ids: function () { var _a = order.slice(); if (typeof topicOrderIndex === 'function') _a.sort(function (x, y) { return topicOrderIndex(x) - topicOrderIndex(y); }); return _a; }, setTopic: setTopic };
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
