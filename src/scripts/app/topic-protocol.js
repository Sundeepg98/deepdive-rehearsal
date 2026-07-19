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
      /* role="img" is what makes the aria-label below LEGAL. ARIA PROHIBITS aria-label on a
         roleless <span> (axe: aria-prohibited-attr) -- so the comment above, which put the
         spelled-out room name in the accessible name "so a screen reader still hears
         'Architecture & APIs'", placed it on the one element where the spec says to IGNORE it.
         Chromium honours it anyway, which is why this went unnoticed; other engines and AT are
         not obliged to. The name IS needed (the visible text is "ARCingestion layer"), so the
         answer is to make it legal, not to drop it: role="img" marks the chip as one atomic
         named thing, which is the standard treatment for an abbreviation+text composite.
         This runs on EVERY topic switch and re-stamps the element, so the role has to be set
         HERE as well as in index.html's static copy -- setting it in only one of the two is a
         fix that quietly comes undone the first time the user changes topic. */
      L.setAttribute('role', 'img');
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
    /* (4) The swap. ViewTransitions.run() no longer defers into document.startViewTransition() --
       it runs `fire` synchronously. That API captured a SNAPSHOT of the page, and a browser does not
       hit-test what it has captured: for 0-500ms after every switch the app was INERT and a real
       click on a pane tab did nothing. The incoming pane still animates (`.pane.on{animation:panein}`),
       because that animates the LIVE element rather than a picture of it. See view-transitions.js for
       the measurements, and test/transition_deadzone.cjs for the guard.
       `fire` is now SYNCHRONOUS: deeptopicchange has already been delivered by the time setTopic
       returns, so afterTopicSwap below runs against panes that are ALREADY re-rendered. */
    if (window.ViewTransitions && window.ViewTransitions.run) window.ViewTransitions.run(fire);
    else fire();
    afterTopicSwap(t);                                   /* (5) scroll/focus/announce */
    if (window.Router && window.Router.setTopic) window.Router.setTopic(id); /* (6) reflect in hash, silently */
    return true;
  }
  return { register: register, current: current, get: function (i) { return byId[i]; }, ids: function () { var _a = order.slice(); if (typeof topicOrderIndex === 'function') _a.sort(function (x, y) { return topicOrderIndex(x) - topicOrderIndex(y); }); return _a; }, setTopic: setTopic, bootId: function () { return bootId; } };
})();

/* ============ PERF: deferred hidden-pane rendering (perf/chunk-proto) ============
   Measured (trace RunTask decomposition, CPU-throttled 4x): every topic entry was ONE
   855-1185ms synchronous click task, and all 10 panes re-rendered inside it -- 9 of
   them into display:none shadow roots the user cannot see. The visible pane must
   render synchronously (the thing you look at paints first); a hidden pane only has
   to be CURRENT BEFORE IT IS NEXT SEEN. So a hidden pane marks itself dirty and
   drains through this queue, ONE PANE PER MACROTASK -- each drain task is 1-25ms,
   far under the 50ms long-task line, and the browser can paint and take input
   between them.
   Every pane still renders every topic (the queue always drains; the laziness is
   WHEN, not IF -- entity_leak walks every shadow root and must keep seeing topic
   content), and switchTab() flushes a dirty pane synchronously BEFORE revealing it,
   so stale content is never on screen. Switches while queued COALESCE: a flush
   renders whatever topic is current at flush time, never a queued snapshot. */
var TopicPaneQueue = (function () {
  var q = [], timer = 0;
  function pump() {
    timer = 0;
    var el = q.shift();
    if (q.length) schedule();      /* schedule the rest FIRST: a throwing render must not stall the queue */
    if (!el) return;
    try { el.__tpFlush(); }
    catch (e) { setTimeout(function () { throw e; }, 0); }  /* surface like a listener throw; keep draining */
  }
  function schedule() { if (!timer) timer = setTimeout(pump, 0); }
  return {
    add: function (el) { if (q.indexOf(el) === -1) q.push(el); schedule(); },
    remove: function (el) { var i = q.indexOf(el); if (i > -1) q.splice(i, 1); }
  };
})();

/* The ONE lifecycle all 9 panes will inherit (Phase 1). In Phase 0 NO pane
   extends this yet -- it is defined dormant so the contract name is frozen. */
class TopicPane extends HTMLElement {
  /* subclass: static dataKey = 'walk'|'drill'|'wb'|'sys'|'trade'|'model'|'num'|'rf'|'open'
     subclass implements: sheets(), styleText(), skeleton(), init(root), renderTopic(data, topic)
     subclass MAY implement: teardownTopic() -- release timers / drop transient state before a swap
     subclass MAY set: static eagerTopic = true -- always render synchronously (deep-visual: its
     renderTopic also toggles the light-DOM viz tab, which must not lag the switch) */
  connectedCallback() {
    if (this._tpBuilt) return;                           /* one-time HOST wiring -- survives every re-render */
    this._tpBuilt = true;
    var root = this.attachShadow({ mode: 'open' });      /* shadow attached ONCE, ever */
    this._root = root;
    root.adoptedStyleSheets = this.sheets();             /* adopted ONCE, never reassigned */
    root.innerHTML = '<style>' + this.styleText() + '</style>' + this.skeleton(); /* <style> + INVARIANT shell, ONCE */
    this.init(root);                                     /* ONE-TIME: cache mount refs + DELEGATED listeners on stable nodes */
    this._onTopic = function (e) { this._tpTopic(e.detail.topic); }.bind(this);
    window.addEventListener('deeptopicchange', this._onTopic);
    this._tpTopic(TopicRegistry.current());              /* first paint: sync only when this pane is the routed one */
  }
  /* Route a topic to this pane: render NOW if the pane is (about to be) on screen,
     otherwise mark dirty and let TopicPaneQueue drain it off the critical task. */
  _tpTopic(topic) {
    if (!topic) return;
    if (this.constructor.eagerTopic || this._tpOnScreen()) {
      this._tpDirty = false;
      TopicPaneQueue.remove(this);
      this._applyTopic(topic, !this._tpRendered);
      return;
    }
    this._tpDirty = true;
    TopicPaneQueue.add(this);
  }
  /* "Is this pane what the route is showing?" -- decided from APP STATE ONLY (container
     class + route hash + the home flag). NEVER a layout read: offsetParent/offsetWidth
     here would re-create the forced-reflow cost this deferral exists to remove. A host
     with no .pane ancestor (e.g. topic_contract's probe host appended to <body>) keeps
     the old always-sync behavior. A false "on screen" merely costs one sync render --
     today's behavior -- never a stale pane. */
  _tpOnScreen() {
    var box = this.closest ? this.closest('.pane') : null;
    if (!box) return true;
    if (!box.classList.contains('on')) return false;
    if (document.documentElement.dataset.view === 'home') return false;  /* stage hidden behind the home */
    var raw = (window.location.hash || '').replace(/^#/, '');
    if (!raw) return false;               /* bare boot: the router lands the route (and flushes) in this same task */
    return ('/' + raw + '/').indexOf('/' + box.id + '/') !== -1;
  }
  /* Called by the queue, and by switchTab() just before this pane is revealed. */
  __tpFlush() {
    if (!this._tpDirty) return;
    this._tpDirty = false;
    if (!this.isConnected) return;
    var t = TopicRegistry.current();
    if (t) this._applyTopic(t, !this._tpRendered);
  }
  _applyTopic(topic, first) {
    if (!topic) return;
    this._tpRendered = true;
    if (!first && this.teardownTopic) this.teardownTopic();                  /* stop timers, clear transient state */
    var hadFocus = !first && this._root && (this.contains(document.activeElement) || this._root.activeElement);
    this.renderTopic(topic.data[this.constructor.dataKey], topic);          /* in-place repaint of child mounts ONLY */
    if (hadFocus) { var land = this._root.querySelector('[data-autofocus]') || this; try { land.focus({ preventScroll: true }); } catch (e) {} }
  }
  disconnectedCallback() {
    if (this._onTopic) window.removeEventListener('deeptopicchange', this._onTopic);
    TopicPaneQueue.remove(this);
    if (this.teardownTopic) this.teardownTopic();
  }
  /* hook defaults */
  sheets() { return [BASE_SHEET]; }
  styleText() { return ''; }
  skeleton() { return ''; }
  init() {}
  renderTopic() {}
}
