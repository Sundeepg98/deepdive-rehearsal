# Keystone A -- Topic Conductor: Build-Ready Design

Date: 2026-06-29
Status: build-ready (Phase 0 foundation not yet on disk; `src/topics/` does not exist yet -- expected)
Scope: convert the 9 single-topic deep-dive panes into a uniform, multi-topic switchable
protocol WITHOUT recreating elements, then prove it with a second topic.

---

## 0. Orientation / TL;DR

**Mechanism in one breath:** a shared `TopicPane` base class + a `TopicRegistry` singleton +
one `deeptopicchange` event. `TopicRegistry.setTopic(id)` reseeds the cross-pane working-set
globals, rewrites the scattered light-DOM identity, then fires ONE event; every pane's inherited
listener re-invokes `renderTopic(slice)` IN PLACE on the existing element -- host identity,
shadowRoot, adopted stylesheets, and host-level listeners all preserved. `renderTopic` IS each
pane's `setData()`.

**Three invariants that make in-place re-render safe:**
1. Shadow root + adopted stylesheets + the `<style>` node are created EXACTLY ONCE (in the base
   `connectedCallback`, guarded by `_tpBuilt`) and never reassigned.
2. `renderTopic` writes ONLY child mount containers (`this._x.innerHTML = ...`), NEVER
   `this._root.innerHTML` (which would delete the `<style>` node and detach the shell).
3. There is exactly ONE switch path -- `setTopic` -- and it contains zero pane-specific code.

**Why this and not the alternatives:** a mixin (`TopicPaneMixin(Base)`) buys nothing because all
9 panes already `extends HTMLElement`; a direct base is simpler to read, debug, and convert to.
Recreating elements (`createElement`/replace) would orphan every external handle the app relies
on (keyboard router's `shadowRoot.getElementById(...)`, mixed-fire's `getDecisions()`,
session-progress's `getStats()/resetAll()`) and force re-wiring. In-place re-render delivers the
uniformity of a single switch while keeping all those seams live.

---

## 1. The Best-of-Both Protocol

### 1.1 Provenance (what was merged)

- **Base mechanism = proposal C's `DeepPane`** (a plain base class, not a mixin -- the operator's
  own seed), hardened with:
- **proposal A's** registry / `onSwitch` discipline + focus management, and
- **proposal B's** explicit ordered switch sequence (`closeTransientOverlays -> publishBanks ->
  applyIdentity -> dispatch`) plus the `_applyTopic(first)` wrapper.

### 1.2 Why it delivers UNIFORMITY (one mechanism for all 9)

Every pane `extends TopicPane` and inherits ONE identical `connectedCallback` / `_applyTopic` /
`disconnectedCallback`. Each pane declares only small hooks: `static dataKey`, `sheets()`,
`styleText()`, `skeleton()`, `init()`, `renderTopic()` (+ optional `teardownTopic()`).
`setTopic` emits ONE `deeptopicchange`; all 9 react identically by calling `renderTopic(newSlice)`
in place. The currently-divergent pane shapes collapse onto the same contract:

- the 3 fully-baked panes (trade / rf / open) become "renderTopic fills a mount from a data array",
  exactly like the already-array-driven panes;
- the model-answers closure (`currentAnswer` / `renderModel`) is hoisted to instance members;
- drill's banks flow through the same `publishBanks` + `renderTopic`.

The non-component surfaces (scattered identity, drill working-set globals, overlay cleanup) ride
the SAME emit, not special cases: **one signal, N uniform subscribers.** A 10th pane is
`extends TopicPane` + two methods.

### 1.3 Why it delivers LEVERAGE (in-place re-render, host identity preserved)

Because the swap re-invokes `renderTopic` on the EXISTING instances, every identity-bearing seam
keeps working untouched:

- keyboard router: `document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'|'jg'|'js')`
- `#walk deep-walkthrough`.prev()/next()
- mixed-fire's `#trade deep-trade-offs`.getDecisions()
- session-progress's `#wb deep-whiteboard`.getStats()/resetAll()/rerunMissed() and
  `#drill deep-drill`.reset()/weak()/getStats()

All resolve to the same live objects, with host-level listeners (the `deeptopicchange`
subscription) and adopted stylesheets preserved across switches. Each pane still keeps fine-grained
per-component control: `renderTopic` IS that pane's `setData()` and `teardownTopic` IS its release
hook (drill re-seeds its set + resets to study mode + clears its timer; num recomputes from new
defaults/ceilings via `compute()`; trade repaints its ledger AND serves `getDecisions()` from data,
killing the fragile shadow reverse-scrape at the source; model rebuilds selectors and resets
`this._cur`).

This is the "recreate-the-element" uniformity (one code path refreshes everything) WITHOUT actually
recreating anything. Best of both.

---

## 2. Canonical Base API + Lifecycle

### 2.1 Foundation file: `src/scripts/app/topic-protocol.js`

Included AFTER shared-sheets.js / base-styles.js (so `BASE_SHEET`, `*_SHEET` exist) and BEFORE
the topic-data bundle + the 9 pane classes, so `TopicRegistry` + the base class + the cross-pane
globals exist before the first `customElements.define()` upgrades a pane (red-flags is first, at
app.js:4).

```js
// ============ src/scripts/app/topic-protocol.js  (FOUNDATION) ============

/* Cross-pane WORKING SET. drill, mixed-fire AND mock-run read these as module globals --
   so the registry OWNS them here and republishes them in ONE place on every switch.
   (drill/logic.js's `var _allCards=cards` etc. move out to here.) */
var cards = [], speakLines = [], _allCards = [], _allSpeak = [];
var curveballPool = [], mockBeats = [], framePool = [], mockCurveIdx = 0, mockFrameIdx = 0;
var TOPIC_CMP_NOTES = {};   // num/shell.js __syncCompanion reads this (was a closure-local map)

/* Reseed cross-pane globals from a topic's bank, synchronously, BEFORE the event fires and
   before any overlay re-reads them. mock-run MUTATES mockBeats in place, so it gets a private
   deep-ish copy; the canonical topic data is never clobbered. */
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

/* The ONLY home for the scattered light-DOM identity (index.html x6 + mobile mcomp mirror +
   cmpNotes + cram + report). Called on every switch; topic 1 stays hard-coded in index.html for
   first paint, so applyIdentity does NOT run at boot. */
function applyIdentity(idn) {
  var q = function (s) { return document.querySelector(s); },
      byId = function (i) { return document.getElementById(i); };
  var L = q('.locator'); if (L) L.innerHTML = 'Topic ' + idn.index + ' of ' + idn.total + ' &middot; ' + idn.locatorTail;
  var H = q('.hdr h1'); if (H) H.textContent = idn.h1;
  var S = q('.hdr .sub'); if (S) S.innerHTML = idn.sub;
  if (byId('cmpTopic')) byId('cmpTopic').textContent = idn.companionTopic;   // desktop right rail
  if (q('.cmp-thesis')) q('.cmp-thesis').innerHTML = idn.thesis;
  var spineHtml = idn.spine.map(function (s) { return '<li><span class="cmp-dot"></span><span>' + s + '</span></li>'; }).join('');
  document.querySelectorAll('.cmp-spine').forEach(function (ul) { ul.innerHTML = spineHtml; });
  var cramT = q('.cram-title'); if (cramT) cramT.innerHTML = 'Cram sheet &middot; ' + idn.cramTitle;
  TOPIC_CMP_NOTES = idn.cmpNotes;                       // per-view coaching for __syncCompanion
  if (window.__syncCompanion) window.__syncCompanion();// repaints stage head + desktop & mobile companion
  if (window.ViewManager && ViewManager.refreshTitle) ViewManager.refreshTitle();
}

/* In-flight mock/mixed/session runs hold a topic-bound snapshot. Close them on switch so a
   half-finished run can't bleed across topics. */
function closeTransientOverlays() {
  ['mixov', 'mockov', 'sessov'].forEach(function (id) {
    var ov = document.getElementById(id);
    if (ov && ov.classList.contains('open')) { var x = ov.querySelector('.mock-x,.cram-x'); if (x) x.click(); }
  });
}

/* Content is brand-new after a swap: reset scroll, park focus on a stable landmark (so it is not
   dropped to <body> when the focused node is repainted away), announce. */
function afterTopicSwap(t) {
  try { window.scrollTo(0, 0); } catch (e) {}
  var st = document.querySelector('.stage'); if (st) st.scrollTop = 0;
  var head = document.getElementById('stagehead');
  if (head) { try { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); } catch (e) {} }
  if (window.ViewManager && ViewManager.announce) ViewManager.announce('Topic ' + t.identity.index + ': ' + t.identity.h1);
}

var TopicRegistry = (function () {
  var byId = {}, order = [], cur = null;
  function register(t) {
    byId[t.id] = t; order.push(t.id);
    if (cur === null) { cur = t.id; publishBanks(t); TOPIC_CMP_NOTES = t.identity.cmpNotes; } // first topic seeds the data side; light DOM already correct in index.html
  }
  function current() { return cur ? byId[cur] : null; }
  function setTopic(id) {
    if (!byId[id] || id === cur) return false;          // ignore unknown / no-op -> kills re-entrancy
    cur = id; var t = byId[id];
    closeTransientOverlays();                           // (1)
    publishBanks(t);                                    // (2) reseed globals BEFORE anyone reads
    applyIdentity(t.identity);                          // (3) one identity home
    var fire = function () { window.dispatchEvent(new CustomEvent('deeptopicchange', { detail: { topic: t, id: id } })); };
    if (window.ViewTransitions && window.ViewTransitions.run && document.querySelector('.pane.on'))
      window.ViewTransitions.run(fire);                 // (4) cross-fade ONLY the visible pane; other 8 are display:none
    else fire();
    afterTopicSwap(t);                                  // (5) scroll/focus/announce
    if (window.Router && window.Router.setTopic) window.Router.setTopic(id); // (6) reflect in hash, silently
    return true;
  }
  return { register: register, current: current, get: function (i) { return byId[i]; }, ids: function () { return order.slice(); }, setTopic: setTopic };
})();
```

### 2.2 The `TopicPane` base class -- the ONE lifecycle all 9 panes inherit

```js
class TopicPane extends HTMLElement {
  // subclass: static dataKey = 'walk'|'drill'|'wb'|'sys'|'trade'|'model'|'num'|'rf'|'open'
  // subclass implements: sheets(), styleText(), skeleton(), init(root), renderTopic(data, topic)
  // subclass MAY implement: teardownTopic()  -- release timers / drop transient state before a swap
  connectedCallback() {
    if (this._tpBuilt) return;                          // one-time HOST wiring -- survives every re-render
    this._tpBuilt = true;
    var root = this.attachShadow({ mode: 'open' });     // shadow attached ONCE, ever
    this._root = root;
    root.adoptedStyleSheets = this.sheets();            // adopted ONCE, never reassigned
    root.innerHTML = '<style>' + this.styleText() + '</style>' + this.skeleton(); // <style> + INVARIANT shell, ONCE
    this.init(root);                                    // ONE-TIME: cache mount refs + DELEGATED listeners on stable nodes
    this._onTopic = function (e) { this._applyTopic(e.detail.topic, false); }.bind(this);
    window.addEventListener('deeptopicchange', this._onTopic);
    this._applyTopic(TopicRegistry.current(), true);    // first paint
  }
  _applyTopic(topic, first) {
    if (!topic) return;
    if (!first && this.teardownTopic) this.teardownTopic();                  // stop timers, clear transient state
    var hadFocus = !first && this._root && (this.contains(document.activeElement) || this._root.activeElement);
    this.renderTopic(topic.data[this.constructor.dataKey], topic);          // in-place repaint of child mounts ONLY
    if (hadFocus) { var land = this._root.querySelector('[data-autofocus]') || this; try { land.focus({ preventScroll: true }); } catch (e) {} }
  }
  disconnectedCallback() {
    if (this._onTopic) window.removeEventListener('deeptopicchange', this._onTopic);
    if (this.teardownTopic) this.teardownTopic();
  }
  // hook defaults
  sheets() { return [BASE_SHEET]; }
  styleText() { return ''; }
  skeleton() { return ''; }
  init() {}
  renderTopic() {}
}
```

### 2.3 init() vs renderTopic(): split by LIFETIME

Today's `connectedCallback(){ if(this._built)return; ... }` does THREE jobs behind one guard. The
base splits them by lifetime:

| Job | Lifetime | Where it goes |
|-----|----------|---------------|
| A: attachShadow + adopt sheets + `<style>` + INVARIANT shell (empty mounts) | ONCE | base `connectedCallback` via `sheets()` / `styleText()` / `skeleton()` |
| B: cache refs + wire DELEGATED listeners on STABLE shell nodes | ONCE | `init(root)` |
| C: read the data slice + paint the child mounts + reset transient state | first paint AND every `deeptopicchange` | `renderTopic(data, topic)` |

**CRITICAL refinement (from proposal C):** anything built from `data.length` or per-topic labels
-- walk dots+arc, wb `<li>` list, model `.msel` buttons -- moves OUT of `init` INTO `renderTopic`,
because a new topic can have a different step/answer count. `teardownTopic` runs immediately BEFORE
`renderTopic` on a swap (not on first paint) to `clearInterval` timers and drop index-keyed
transient state.

### 2.4 The stylesheet/shadow invariant that makes in-place safe

`adoptedStyleSheets` is a property of the ShadowRoot, set ONCE in A and never reassigned; the shared
singletons (`BASE_SHEET`, `ANS_SHEET`, `OPT_SHEET`, `MBEAT_SHEET`, `DISC_SHEET`) are adopted BY
REFERENCE across all instances/topics and are NEVER mutated per-topic. The `<style>` node is
written once and never rewritten.

**THE ONE HARD RULE:** `renderTopic` writes child mounts, NEVER `this._root.innerHTML` (which would
delete the `<style>` + detach the shell). Because neither the adopted sheets nor the `<style>` node
is ever the thing being replaced, styling is structurally immune to re-render -- no re-adoption,
no `<style>` re-parse, no FOUC, no keyframe/transition restart. Because 8 of 9 panes are
`display:none` at switch time, their `renderTopic` runs off-screen and free; only the active pane
repaints visibly (and only it is View-Transition captured).

Optional v2 polish (NOT required): promote each pane's `<style>` string to a constructable sheet
adopted in `sheets()`. The child-mount-only rule already covers it; keeping it optional makes the
9 conversions purely mechanical.

### 2.5 Exemplars

**drill (most state; mixed-fire-facing banks):**

```js
class DeepDrill extends TopicPane {
  static dataKey = 'drill';
  sheets()   { return [BASE_SHEET, ANS_SHEET]; }
  styleText(){ return DRILL_STYLE; }
  skeleton() { return DRILL_HTML; }            // stable chrome: modetog/tiertog/score/#dwrap/#dnav (empty mounts)
  init(root) {
    this._dwrap = root.getElementById('dwrap'); this._dfill = root.getElementById('dfill');
    this._sGot = root.getElementById('sGot'); this._sShk = root.getElementById('sShk'); this._sLeft = root.getElementById('sLeft');
    this._timerEl = root.getElementById('timer');
    this._modetog = root.getElementById('modetog'); this._tiertog = root.getElementById('tiertog');
    var self = this;                            // DELEGATED, wired ONCE on stable shell nodes
    root.getElementById('dnav').addEventListener('click', function (e) { var b = e.target.closest('.dn-step'); if (b) { self.di = +b.getAttribute('data-i'); self.renderD(); } });
    this._modetog.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) self.setMode(b.getAttribute('data-m')); });
    this._tiertog.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) self.setTier(b.getAttribute('data-tier')); });
    root.getElementById('revdrill').addEventListener('click', function () { self.drillRevset(); });
  }
  renderTopic(d) {                              // == drill.setData(): registry already reseeded cards/_allCards via publishBanks
    DRILL_TIER_NOTES = d.tierNotes;
    this.tierFilter = 'all'; this.revisitMode = false;
    this.setMode('study');                      // existing full re-render path, now over the new working set
  }
  teardownTopic() { this.stopTimer(); this.di = this.got = this.shk = 0; this.results = []; this.revisit = {}; this.revisitMode = false; }
}
customElements.define('deep-drill', DeepDrill);
```

**trade (fully-baked + shadow-scrape hard case):**

```js
class DeepTradeOffs extends TopicPane {
  static dataKey = 'trade';
  sheets()   { return [BASE_SHEET, OPT_SHEET]; }
  styleText(){ return TRADE_STYLE; }
  skeleton() { return '<div class="ledger"><div class="lead" id="tlead"></div><div id="tdecs"></div></div>'; }
  init(root) { this._lead = root.getElementById('tlead'); this._decs = root.getElementById('tdecs'); }
  renderTopic(d) {
    this._decisions = d.decisions;             // serve from data -> KILLS the fragile shadow reverse-scrape
    this._lead.innerHTML = d.lead;
    this._decs.innerHTML = d.decisions.map(renderDec).join('');   // renderDec(): old baked .dec markup, now from data
  }
  getDecisions() { return this._decisions || []; }  // mixed-fire's el.getDecisions() now returns current-topic data
}
customElements.define('deep-trade-offs', DeepTradeOffs);
```

### 2.6 Per-pane conversion recipe (identical shape for all 9)

1. `extends TopicPane` + `static dataKey`.
2. DELETE `connectedCallback` / `if(this._built)` / `attachShadow` (now in base).
3. per-pane `<style>` -> `styleText()`; INVARIANT shell w/ empty mounts -> `skeleton()`.
4. ref-cache + DELEGATED listeners on stable mounts -> `init()`.
5. the data-reading render -> `renderTopic(data)`.
6. move COUNT/LABEL-dependent structure (walk dots+arc, wb `<li>` list, model `.msel` buttons)
   OUT of `init` INTO `renderTopic`.
7. keep all public API (getStats/getDecisions/resetAll/rerunMissed/reset/weak/prev/next)
   byte-identical so external callers + the keyboard handler are untouched.

---

## 3. Per-Topic Data Schema

One record per topic, authored as a per-topic DATA BUNDLE (file layout in section 4). Everything is
7-bit ASCII (HTML entities / `\uXXXX`), like the existing arrays, so `ascii_guard` passes. The 3
fully-baked panes (trade/rf/open) and the 2 baked blobs (wb diagram, walk model-script) MOVE their
HTML into this contract and get rendered the way the data-driven panes already render arrays.

### 3.1 Record shape (abbreviated canonical)

```js
{
  id: 'content-pipeline',          // hash-safe slug; UNIQUE; never collides with the 9 short view ids

  // ---- IDENTITY: every scattered light-DOM string, centralized ----
  identity: {
    index: 1, total: 8,            // "Topic 1 of 8"
    locatorTail: 'ingestion layer',// .locator -> "Topic 1 of 8 . <locatorTail>"   (index.html:22)
    title: 'Content Pipeline',     // <title> base + ViewManager weave            (index.html:15)
    h1: 'Content Pipeline',        // .hdr h1                                       (index.html:24)
    sub: '<b>Mechanics</b> &rarr; ...',                  // .hdr .sub innerHTML     (index.html:25)
    companionTopic: 'Content Pipeline',                  // #cmpTopic / .cmp-topic  (index.html:65)
    thesis: 'A file-processing service ...',             // .cmp-thesis             (index.html:66)
    spine: [ '...', '...', '...', '...' ],               // .cmp-spine <li>s        (index.html:79-84 + mobile :43)
    cramTitle: 'Content Pipeline', // .cram-title  (cram.html:5)
    reportTitle: 'Content Pipeline',// session-progress report strings (session-progress.js:75,93)
    cmpNotes: {                     // per-VIEW coaching map (was closure-local in numbers-nalsd.js:264-274)
      walk:  ['Walkthrough','...','...'],
      drill: ['Probe Drill','...','...'],
      wb:    ['Whiteboard','...','...'],
      sys:   ['System Map','...','...'],
      trade: ['Trade-offs','...','...'],
      model: ['Model Answers','...','...'],
      num:   ['Numbers','...','...'],
      rf:    ['Red Flags','...','...'],
      open:  ['30-Second','...','...']
    }
  },

  // ---- DATA: one slice per pane (key == pane.dataKey) + a cross-pane bank ----
  data: {
    walk:  { steps: [ {k,t,flow,ins,deep?,code?,cap?} x9 ], modelScript: [ {ml,t} / {mq} / {ml,t,ans} ] },
    drill: { cards: [ {tier,signal,q,a,f:[{q,a}],senior} x20 ], speak: [ '...' x20 ], tierNotes: {all,SDE2,SDE3,Staff} },
    wb:    { steps: [ {c,a} x9 ], diagram: '<div class="dgm">...', foot: '...', sub: '...', okVerdict: '...' },
    sys:   { intro: '...', stages: [ {n,d,cur?} x6 ], pivots: [ {q,chip,a} x7 ], heads: {whereHead,pivHead,pivSub} },
    trade: { lead: '...', decisions: [ {q,opts:[{n,when}],tell} x7 ] },
    model: { selectors: [ '...' x9 ], answers: [ {opener,sub,beats:[{l,c,t}]} x9 ] },
    num:   { lead, tell, inputs: [ {id,label,value,min,step?} x4 ], compute: function(vals, fmt){ ... return rows; } },
    rf:    { lead: '...', flags: [ {bad,note,tell,fix} x9 ] },
    open:  { cards: [ {kind,k,t,lead,items:[{n,ht,a}],hooks?,foot} x2 ] },

    // ---- BANK: what NON-pane code (mock-run, mixed-fire) reads via the globals ----
    bank: { cards:  /*ref*/ TOPIC_CP_DRILL.cards,   // SAME array as data.drill.cards (one source of truth)
            speak:  /*ref*/ TOPIC_CP_DRILL.speak,
            curveballs: [ {tag:'CURVEBALL',theme,cue,task,model,int:{q,a}} ],
            frames:     [ '"Design the content pipeline ..."' ],
            mockBeats:  [ {tag:'FRAME',cue,task,model,int:{q,a},int2:{q,a}} x6 ] }
  }
}
```

### 3.2 Schema EXTENSIONS beyond the abbreviated canonical (flag, then adopt)

The contract's `topicSchema` is abbreviated; two panes legitimately extend their slice because
per-topic PROSE is hard-coded in code today and would otherwise pin the count/topic:

- **wb** adds `sub` (the `.step-sub` "Produce all nine cold ..." copy, whiteboard.js:96) and
  `okVerdict` (the OK-branch "All nine cold" verdict, whiteboard.js:168). Both hard-code the word
  "nine"/"this system" -- same KIND as `foot` (already data). Without them wb is silently pinned at
  9 steps and topic-2 copy is wrong. Cost: 2 strings + 2 trivial code lines.
- **sys** adds `heads` = `{whereHead, pivHead, pivSub}` (the two card headings + pivot subhead,
  system-map.js:89/92/93). Card-1 heading "Where this pipeline lives" contains topic-specific
  wording. If you prefer the literal canonical `{intro,stages,pivots}`, bake the 3 headings in
  `skeleton()` instead -- the spec recommends the `heads` superset.
- **num** carries a `compute(vals, fmt)` FUNCTION (arithmetic + the 1000/100 ceilings), not a plain
  array. This is the explicit parametric escape hatch; it returns the row array the component
  renders verbatim (`v` is a DISPLAY STRING so a structurally-different topic can format freely).

These are intentional and adopted. They are the only deviations from the abbreviated schema.

---

## 4. File Layout (disjoint parallel builds)

GOAL: the 9 parallel pane builds touch DISJOINT files -- no two pane agents share a file, and none
touch the frozen foundation files. Achieved by splitting topic DATA from pane LOGIC and giving every
pane its OWN data file under a per-topic folder, behind FROZEN global names the foundation
establishes up front.

### 4.1 NEW per-topic bundle (one folder per topic)

```
src/topics/content-pipeline.js            <-- include wrapper: pulls the 12 partials below, then registers
src/topics/content-pipeline/identity.js   var TOPIC_CP_IDENTITY = {...}   [FOUNDATION owns]
src/topics/content-pipeline/bank.js       var TOPIC_CP_BANK = {...}       [FOUNDATION owns: cross-pane mock/curveball/frame]
src/topics/content-pipeline/walk.js       var TOPIC_CP_WALK  = {...}      [walk agent]
src/topics/content-pipeline/drill.js      var TOPIC_CP_DRILL = {...}      [drill agent]
src/topics/content-pipeline/wb.js         var TOPIC_CP_WB    = {...}      [wb agent]
src/topics/content-pipeline/sys.js        var TOPIC_CP_SYS   = {...}      [sys agent]
src/topics/content-pipeline/trade.js      var TOPIC_CP_TRADE = {...}      [trade agent]
src/topics/content-pipeline/model.js      var TOPIC_CP_MODEL = {...}      [model agent]
src/topics/content-pipeline/num.js        var TOPIC_CP_NUM   = {...}      [num agent]
src/topics/content-pipeline/rf.js         var TOPIC_CP_RF    = {...}      [rf agent]
src/topics/content-pipeline/open.js       var TOPIC_CP_OPEN  = {...}      [open agent]
src/topics/content-pipeline/register.js   TopicRegistry.register({ id, identity, data:{...,bank} })  [FOUNDATION]
```

### 4.2 SHARED FOUNDATION files (written/frozen in Phase 0, BEFORE any parallel work)

```
src/scripts/app/topic-protocol.js   (NEW: base class + registry + setTopic/publishBanks/applyIdentity/etc.)
src/scripts/app/router.js           (edit: topic axis + Router.setTopic)
src/scripts/app/view-manager.js     (edit: applyRoute reads topic; announce/refreshTitle helpers)
src/scripts/app/num/shell.js        (NEW: switchTab + global keyboard + __syncCompanion[reads TOPIC_CMP_NOTES] + mobile sheet -- LIFTED out of numbers-nalsd.js)
src/index.html                      (edit: add ids if needed; topic-1 identity STAYS hard-coded for first paint)
src/scripts/app.js                  (edit: include order, see buildOrder)
test/unit_tests.py                  (edit: data_files manifest -- shared gate file, see section 8)
```

### 4.3 PER-PANE OWNERSHIP (each agent's COMPLETE, disjoint file set)

| Pane | Files owned |
|------|-------------|
| walk  | topics/content-pipeline/walk.js  + walkthrough.js + walkthrough/steps.js + walkthrough/logic.js |
| drill | topics/content-pipeline/drill.js + drill.js + drill/cards.js + drill/speak-lines.js + drill/logic.js |
| wb    | topics/content-pipeline/wb.js     + whiteboard.js |
| sys   | topics/content-pipeline/sys.js    + system-map.js |
| trade | topics/content-pipeline/trade.js  + trade-offs.js |
| model | topics/content-pipeline/model.js  + model-answers.js + model-answers/answers.js + model-answers/logic.js |
| num   | topics/content-pipeline/num.js    + num/logic.js (the DeepNumbers class only; shell.js is foundation's) |
| rf    | topics/content-pipeline/rf.js      + red-flags.js |
| open  | topics/content-pipeline/open.js    + opener-altitude.js |

### 4.4 WHY THIS IS CONFLICT-FREE

The foundation freezes the CONTRACT NAMES (`TOPIC_CP_<PANE>`, `TOPIC_CP_DRILL.cards/.speak`
referenced by bank.js, the 5 base hooks, the dataKey strings) and writes register.js + bank.js +
app.js + the include wrapper ONCE. It seeds each data file as a thin ALIAS to the still-global
arrays (e.g. `var TOPIC_CP_DRILL = {cards:cards, speak:speakLines, tierNotes:DRILL_TIER_NOTES}`) so
the gate is green with the panes UNCONVERTED. Each pane agent then rewrites ONLY its 2-5
own-namespace files. No pane agent edits register.js, bank.js, app.js, index.html, or another pane
-- so 9 worktrees never collide on a shared file at merge.

(Caveat: thin aliasing only works where a pre-existing global array exists -- drill, walk steps, wb
steps, sys, model answers. The 3 fully-baked panes have NO global to alias; see section 8.)

---

## 5. Switch Path, Router Axis, Identity Binder

### 5.1 setTopic(id) -- the SINGLE switch path (ordering is load-bearing)

1. **GUARD:** `if (!byId[id] || id === cur) return false` -- unknown id and no-op switch both
   short-circuit, which also defuses rapid/re-entrant switches (the event is dispatched
   synchronously, so every subscriber finishes before setTopic returns; a second setTopic cannot
   interleave).
2. **closeTransientOverlays()** -- click the `.mock-x`/`.cram-x` of any open
   `#mixov`/`#mockov`/`#sessov`. Their snapshots are of the OLD topic; closing first guarantees no
   half-finished run bleeds across. They rebuild from the reseeded globals on next open.
3. **publishBanks(t)** -- reassign `_allCards`/`_allSpeak`/`cards`/`speakLines`/`curveballPool`/
   `mockBeats(copy)`/`framePool`/`mockCurveIdx`/`mockFrameIdx` in ONE place, SYNCHRONOUSLY, BEFORE
   the event and before any overlay re-reads. drill, mixed-fire and mock-run all see a consistent
   working set; mixed-fire stays oblivious to topics.
4. **applyIdentity(t.identity)** -- rewrite all scattered light DOM + set `TOPIC_CMP_NOTES` + call
   `__syncCompanion` + refresh `<title>`.
5. **DISPATCH:** emit ONE `deeptopicchange`. Every pane's inherited listener runs
   `_applyTopic -> (teardownTopic) -> renderTopic(newSlice)` IN PLACE. The data mutation in 3/4 is
   already complete; only the repaint dispatch is optionally wrapped in `ViewTransitions.run` -- and
   ONLY when a `.pane.on` exists (the other 8 are display:none, off-screen, never VT-captured).
   Never nest this inside switchTab's pane-swap transition; a topic switch keeps the CURRENT view
   (it does not call switchTab) so there is no double root-snapshot.
6. **afterTopicSwap(t)** -- scroll window + `.stage` to 0, park focus on `#stagehead`
   (tabindex=-1) so it is not dropped to `<body>`, aria-announce "Topic N: <h1>".
7. **Router.setTopic(id)** -- reflect the topic in the hash via replaceState, SILENTLY (no
   re-emit), so the URL is deep-linkable without looping back into applyRoute.

Per-pane swap semantics live in `renderTopic` + `teardownTopic`, NOT in setTopic (which never knows
drill from trade). A topic switch is a deliberate context reset (fresh rehearsal); per-topic
progress persistence, if ever wanted, layers on later by snapshotting each pane's `getStats()` keyed
by topic id on switch-out -- same hooks, no contract change.

### 5.2 Router topic axis (above the existing pane router; no deep-link breaks)

New canonical shape: `#<topic>/<view>/<sub>`; old `#<view>` and `#<view>/<sub>` keep working
verbatim. The topic slug is hyphenated and can NEVER equal one of the 9 short view ids, so the
back-compat test is unambiguous:

```js
var parts = raw.split('/');
var topicId = null, rest = parts;
if (TopicRegistry.get(parts[0]) && !ROUTES[parts[0]]) { topicId = parts[0]; rest = parts.slice(1); } // NEW shape
var viewId = (rest[0] || DEFAULT_ROUTE).toLowerCase().trim();
if (!ROUTES[viewId]) viewId = DEFAULT_ROUTE;          // existing guard unchanged
return { topic: topicId, view: viewId, sub: rest.slice(1).join('/') || null, route: ROUTES[viewId], raw: raw };
// topic===null means "current/default topic" -> a bare #drill stays exactly a view switch under the active topic.
```

Router gains:
- `navigate(view, sub)`: unchanged contract, but the pushed hash is prefixed with the CURRENT topic
  id when a non-default topic is active (`#<cur>/<view>`); for topic 1 it can stay bare `#<view>` to
  keep the common deliverable's URLs identical to today.
- `setTopic(id)`: replaceState to `#<id>/<currentView>` and DOES NOT emit (the registry already
  drove the switch) -- prevents a routechange -> applyRoute -> setTopic loop.
- `replace(view, sub, topic)`: superset used internally.

`ViewManager.applyRoute(route)`:
- if `route.topic && route.topic !== TopicRegistry.current().id` -> `TopicRegistry.setTopic(route.topic)`
  BEFORE `switchTab(view)`, so panes are on the right topic before the view shows (no
  topic-1-then-flip flash).
- then `switchTab(route.view)` (idempotent), `document.title = view + ' -- ' + topic.title + ' -- Deep Rehearsal'`, existing aria announce.
- Re-entrancy: setTopic -> Router.setTopic (silent replaceState) does NOT re-emit, so applyRoute is
  not re-triggered; back/forward (popstate) to a different-topic hash emits once -> applyRoute sees
  topic != current -> setTopic -> renders. Latest-wins.

A topic-picker UI (added with topic 2, in num/shell.js's side-id or the mockbar) simply calls
`TopicRegistry.setTopic(id)`; ROUTES and switchTab are untouched -- the topic axis is orthogonal to
the pane axis.

### 5.3 Identity binder (collapse 8+ smeared sites into one writer)

PROBLEM: identity is smeared across index.html (title:15, locator:22, h1:24, sub:25,
companion/thesis/spine:65-84, mobile mcomp mirror:43), the cmpNotes map (numbers-nalsd.js:264-274),
cram.html:5, session-progress.js:75/93, tour-guide.js:22, system-map.js:90 (sys intro).

SOLUTION: collapse ALL of it into `topic.identity` and ONE binder, `applyIdentity(idn)`, that
subscribes to the SAME switch the panes do.

- SOURCE OF TRUTH: `topics/content-pipeline/identity.js` holds `TOPIC_CP_IDENTITY` with every string
  above. The sys intro moves into `data.sys.intro` (rendered by the sys pane), NOT identity, since it
  lives in a shadow.
- `applyIdentity` is the ONLY writer of the light DOM. It assigns `TOPIC_CMP_NOTES = idn.cmpNotes`,
  then calls `__syncCompanion()` (which mirrors the active view's note into BOTH the desktop
  companion AND the mobile mcomp) and `ViewManager.refreshTitle()`.
- cmpNotes DE-SCATTER: `__syncCompanion`'s closure-local `cmpNotes` moves into num/shell.js and reads
  the module global `TOPIC_CMP_NOTES` instead. The global is declared in topic-protocol.js and seeded
  for topic 1 at `register()` time, so the companion works before any switch.
- session report + cram + tour: read `TopicRegistry.current().identity.reportTitle/.cramTitle` at
  render time (both re-render on open, so no event needed); tour-guide composes from
  `current().identity.h1`.
- FIRST PAINT: topic 1's identity STAYS hard-coded in index.html so the initial render is correct,
  byte-stable, FOUC-free -- `applyIdentity` runs ONLY on a switch. identity.js duplicates those
  strings as the switchable source (a deliberate, tiny duplication that buys a clean first paint).
- One emit -> N uniform subscribers: the 9 panes' `renderTopic` PLUS this single IdentityBinder all
  react to `deeptopicchange`, so even the surfaces that cannot be custom elements ride the same signal.

---

## 6. Per-Pane Specs

### 6.1 Summary table

| Pane (element) | Current state | dataShape (slice key) | Effort | Top gotchas |
|----------------|---------------|------------------------|--------|-------------|
| walk (`<deep-walkthrough>`) | DATA-DRIVEN (steps[]) + 1 baked blob (model-script) | `walk: {steps[9], modelScript[8]}` | S | Move dots+arc build init->renderTopic; delegate arc clicks; `.mbeat.ans` MUST stay last; swap every `steps` global -> `this._steps` |
| drill (`<deep-drill>`) | DATA-DRIVEN (20 cards + 20 speak, index-parallel); NO baked HTML | `drill: {cards[20], speak[20], tierNotes{4}}` | L | speak[i] pairs cards[i]; revisit map is index-keyed -> reset in teardownTopic; stop mock setInterval on swap; patch 2 baked literals ("All 20", tiernote) |
| wb (`<deep-whiteboard>`) | HYBRID (steps[] + baked diagram/foot/sub) | `wb: {steps[9], diagram, foot, sub, okVerdict}` | M | sub+okVerdict hard-code "nine" -> must be data; 27 per-item closures -> 1 delegate; keep `<div class="dgm">` root; cue must contain ` &mdash; ` |
| sys (`<deep-system-map>`) | DATA-DRIVEN (stages[]+pivots[]) + baked intro/headings | `sys: {intro, stages[6], pivots[7], heads{3}}` | S | Keep class="chain" + class="card" (zoom/spotlight match live); SYS_STYLE stays in pane; stateless -> no teardown |
| trade (`<deep-trade-offs>`) | FULLY BAKED + shadow reverse-scrape | `trade: {lead, decisions[7]}` | S | getDecisions() MUST return `{q,optsHtml,tell}` (not opts[]); pane-scope helper names; do NOT edit mixed-fire |
| model (`<deep-model-answers>`) | DATA-DRIVEN answers[] + baked selector labels | `model: {selectors[9], answers[9]}` | S | Move .msel buttons init->renderTopic; ONE delegate (not per-button); `l-<c>` classes are dead but KEEP; closure->instance `this._cur` |
| num (`<deep-numbers>`) | PARAMETRIC calculator (not array) | `num: {lead, tell, inputs[4], compute(fn)}` | S | File is 2/3 GLOBAL SHELL (F3 extracts shell.js); ceilings 1000/100 move into compute; delegate input listener; read inputs dynamically |
| rf (`<deep-red-flags>`) | FULLY BAKED, zero consumers | `rf: {lead, flags[9]}` | S | Only flag #9 has `note` (leading-space guard); chrome (x chip, arrow) stays in template; no alias possible (extract in agent PR) |
| open (`<deep-opener>`) | FULLY BAKED, zero consumers | `open: {cards[2]}` (open + close) | S | entity_leak descends shadow -> use innerHTML never textContent; ONE delegated `.op-rev` listener on stable mount; no teardown |

Effort tally: 7 x S, 1 x M (wb), 1 x L (drill).

---

### 6.2 walk (`<deep-walkthrough>`) -- effort S

**Current:** DATA-DRIVEN steps array + ONE small baked blob (model-script). 3 files behind
walkthrough.js: walkthrough/steps.js (`var steps=[...]`, 9 objects) + walkthrough/logic.js
(WALK_STYLE, WALK_HTML shell, `class DeepWalkthrough`). connectedCallback does all 3 jobs behind
`if(this._built)return`: attach+adopt `[BASE_SHEET,MBEAT_SHEET,DISC_SHEET]`, innerHTML, cache 6
refs, build dots loop + arc loop over `steps.length` (per-button `btn.onclick`), wire prev/next,
`_renderW()`. Transient state = ONLY `this._wi`. Public API prev()/next() consumed by keyboard
handler. The baked model-script lives at logic.js:86-93 inside `<div class="mbody">`.

**dataShape:** `walk: { steps:[{k,t,flow,ins,deep?,code?,cap?} x9], modelScript:[...8 beats] }`.
`deep` on steps 1,3,5,6; `code`+`cap` on 2,4,7,8,9; none has both. modelScript = 6 plain `.mbeat`,
then 1 `.mq` interviewer line, then 1 `.mbeat.ans` (MUST stay last).

**renderTopic split:**
- `sheets()` = `[BASE_SHEET, MBEAT_SHEET, DISC_SHEET]`; `styleText()` = WALK_STYLE;
  `skeleton()` = WALK_HTML with the baked model body replaced by an EMPTY mount
  `<div class="mbody" id="wmbody"></div>`.
- `init(root)`: cache `_card/_dots/_ctr/_prev/_next/_arc` + NEW `_mbody`; wire `_prev/_next.onclick`;
  ONE DELEGATED arc click on stable `#warc` reading `data-i`.
- `renderTopic(d)`: `this._steps = d.steps`; `this._wi = 0`; CLEAR + rebuild dots
  (`_dots.innerHTML=''` then append per step); CLEAR + rebuild arc with `data-i`; fill `#wmbody` via
  `d.modelScript.map(renderBeat)`; `_renderW()`.
- helper `renderBeat(b)` lives in logic.js (module scope), reproduces logic.js:86-93 byte-for-byte.
- `_renderW`/prev/next: swap `steps` -> `this._steps`. NO teardownTopic.

**cpDataBundle:** `var TOPIC_CP_WALK`. steps = lift steps.js:2-42 verbatim (already perfect array).
modelScript = extract the 8 rows at logic.js:86-93 (labels: 'Frame it before diving', 'Headline in
one breath', 'Walk the path', 'Name the risk yourself', 'Name the trade-off line', 'Be honest about
the ceiling', the `.mq` interviewer line, 'Absorb the follow-up' with `ans:true`).

**Consumer rewires:** keyboard handler `.prev()/.next()` -- NO change (host preserved). tour-guide
selector -- NO change. DELETE `var steps` (steps.js) + its include line from walkthrough.js. Repoint
test/unit_tests.py:37 manifest row `app/walkthrough/steps.js` -> the new data file (SHARED gate file
-- best done in foundation).

**Gotchas:** dots loop + arc loop MUST move init->renderTopic (a topic with !=9 steps keeps stale
dots otherwise); per-button onclick dies on rebuild -> delegate; swap EVERY `steps` ref (logic.js
133/143/145/148); `.mbeat.ans` MUST stay last (WALK_STYLE:52 + MBEAT_SHEET last-child rules);
generic chrome (`<details class="model">` summary, `.arc-h` header) stays in skeleton; gate file
unit_tests.py:48 forbids innerHTML/appendChild/createElement/adoptedStyleSheets/attachShadow inside
data files -- keep renderBeat in logic.js; load order (logic.js after topic-protocol.js + bundle);
walk's model-script has NO index.html duplicate (lived only in shadow) -> F5 include order is what
prevents a blank model area at boot.

---

### 6.3 drill (`<deep-drill>`) -- effort L

**Current:** DATA-DRIVEN already (arrays; NO baked HTML). 3 partials: drill/cards.js
(`var cards=[...]`, 20 cards `{tier,signal,q,a,f:[{q,a}],senior}`), drill/speak-lines.js
(`var speakLines=[...]`, 20 strings INDEX-PARALLEL to cards), drill/logic.js. Key facts:
`DRILL_TIER_CLASS` (structural, stays a const), `DRILL_TIER_NOTES` (per-topic, 4 keys
all/SDE2/SDE3/Staff), `var _allCards=cards, _allSpeak=speakLines` (mixed-fire.js reads `_allCards`),
DRILL_HTML shell with 2 topic-1-baked literals ("All 20" :19, tiernote default :20), `dShuffle`
(shared bare fn, mixed-fire calls it), the class (connectedCallback build-once, setMode/drillWeak/
drillRevset REASSIGN `cards`/`speakLines` to filtered subsets, per-card controls #adv/#jg/#js
rendered+rewired by drawCard every draw). Public API: getStats() -> `{dTot,dDone,dGot,dShk,revisit:[signals]}`,
reset(), weak(). Mock timer 22min via startTimer setInterval.

**dataShape:** `drill: { cards:[{tier,signal,q,a,f:[{q,a}],senior} x20], speak:[x20], tierNotes:{all,SDE2,SDE3,Staff} }`.
ORDER IS LOAD-BEARING: speak[i] pairs cards[i]. bank aliases the SAME arrays
(`bank.cards = TOPIC_CP_DRILL.cards`); publishBanks does `_allCards=bank.cards; cards=_allCards.slice()`.
`DRILL_TIER_CLASS` + `dShuffle` stay module-level in logic.js (NOT in the slice).

**renderTopic split:** `sheets()`=`[BASE_SHEET,ANS_SHEET]`; `styleText()`=DRILL_STYLE;
`skeleton()`=DRILL_HTML. `init` caches refs (incl. `_tiernote`) + DELEGATED listeners on stable
dnav/modetog/tiertog/revdrill. `renderTopic(d)`: `DRILL_TIER_NOTES = d.tierNotes`; reset
`tierFilter='all'`, `revisitMode=false`; re-highlight the 'all' tier button; `_tiernote.innerHTML =
d.tierNotes.all`; fix the "All N" label = `'All '+_allCards.length`; `setMode('study')`.
`teardownTopic()`: `stopTimer()` + reset di/got/shk/results + `revisit={}` + revisitMode=false.
Delete the pane's own disconnectedCallback (base handles teardown on disconnect). UNCHANGED:
renderNav/renderD/drawCard/judge/getStats/reset/weak/etc.

**cpDataBundle:** `var TOPIC_CP_DRILL`. cards = lift cards.js:2-185 verbatim (20 elements; drop the
`var cards=[`/`];`). speak = lift speak-lines.js:2-21 verbatim. tierNotes = lift the object VALUE at
logic.js:6. Tier mix: SDE2 x3, SDE3 x8, Staff x8, EXTEND x1. (Large pane -- spec gives line ranges,
not retyped prose; agent lifts bytes.)

**Consumer rewires:** the `var` declarations for `cards/speakLines/_allCards/_allSpeak` MOVE to the
foundation (topic-protocol.js declares them). drill DELETES logic.js:10 + the data arrays + the
cards.js/speak-lines.js include lines. mixed-fire.js (reads `_allCards`/`curveballPool`/`dShuffle`)
-- NO change (publishBanks reseeds before the event; closeTransientOverlays shuts #mixov first).
Keyboard handler `.shadowRoot.getElementById('adv'|'jg'|'js')` -- NO change (keep those ids
byte-identical in drawCard). session-progress getStats()/reset()/weak() -- NO change. opener-altitude
comment in logic.js:2-3 is STALE -- correct/drop it.

**Gotchas:** index parallelism load-bearing; revisit map is `_allCards`-index-keyed (topic-relative)
-> MUST reset in teardownTopic; mock setInterval leak -> stopTimer first on swap; 2 baked literals
need patching in renderTopic; setMode('study') does NOT reset tier UI; tierNotes has EXACTLY 4 keys
(no EXTEND); DRILL_TIER_CLASS structural; #adv/#jg/#js are transient (stay in drawCard); 22:00 mock
duration is a rehearsal constant (out of scope); ascii_guard -- lift entities verbatim.

---

### 6.4 wb (`<deep-whiteboard>`) -- effort M

**Current:** HYBRID. `DeepWhiteboard` (whiteboard.js:123-210). `WB_STEPS` (9 `{c,a}`); BAKED inside
WB_HTML: `.step-sub` (:96), `.wb-foot` (:100), assembled `.dgm` diagram (:105-119). connectedCallback
builds 9 `<li>` via createElement + PER-ITEM reveal/got/miss closures (:134-155). `_updCount` OK
branch hard-codes 'All nine cold' (:168). getStats() -> `{total, items:[{got,missed,cue:s.c}]}`.
ALL state is in the DOM (li.got/.missed, .wb-ans.show, button.disabled). External consumers:
session-progress wbEl() -> resetAll()/getStats()/rerunMissed(); zoom-diagrams matches `.dgm`.

**dataShape:** `wb: {steps:[{c,a} x9], diagram:'<div class="dgm">...', foot, sub, okVerdict}`.
getStats cue split on '&mdash;' -> author each `c` with a ` &mdash; ` segment. `sub` + `okVerdict`
are the schema extension (see 3.2). No bank entry (wb not read by mock/mixed).

**renderTopic split:** `sheets()`=`[BASE_SHEET,DISC_SHEET]`; `styleText()`=WB_STYLE;
`skeleton()`=WB_HTML with the 3 data regions EMPTIED (use CLASS refs `.wb-foot`/`.disc .body`/
`.step-sub`, keep getElementById('wblist'|'wbcount'|'wbverdict')). `init` caches refs + ONE
delegated `#wblist` listener (replaces 27 closures; relies on native disabled-button gating).
`renderTopic(d)`: stash `_steps`/`_okVerdict`; fill `_sub`/`_foot`/`_dgm`; rebuild `#wblist`
innerHTML from steps (count-driven -> here, not init); `_updCount()`. `_updCount`: `WB_STEPS.length`
-> `this._steps.length`, OK literal -> `this._okVerdict`. NO teardownTopic (rebuild IS the reset).

**cpDataBundle:** `var TOPIC_CP_WB`. steps = lift whiteboard.js:16-24 verbatim. diagram = lift
:105-119 (whole `<div class="dgm">` block). foot = inner of `.wb-foot` (:100). sub = inner of
`.step-sub` (:96). okVerdict = OK-branch literal (:168). Static chrome stays in skeleton (`.step-k`
'Reconstruct from blank', `.step-t` 'What you draw, in order', `<summary>`).

**Consumer rewires:** NONE external (host + API preserved). INTERNAL: WB_STEPS -> `this._steps`;
move li-build init->renderTopic; 27 closures -> 1 delegate; OK literal -> `this._okVerdict`; delete
baked diagram/foot/sub from whiteboard.js. Foundation pre-seeds wb.js alias
`{steps:WB_STEPS,diagram:'',foot:'',sub:'',okVerdict:''}`; wb agent replaces with real data.

**Gotchas:** sub+okVerdict hard-code "nine" -> must be data (else pinned at 9); native `disabled`
button emits no click -> don't add redundant guards / don't remove `disabled`; `#wbrerun` lives in
#wbverdict (not #wblist), keep its inline onclick; no teardown needed; diagram MUST keep
`<div class="dgm">` root; getStats cue must stay raw (`s.c`); HARD rule child-mounts-only; WB_STYLE
byte-identical (dark-theme flip tokens); use class refs for new mounts (no new ids).

---

### 6.5 sys (`<deep-system-map>`) -- effort S

**Current:** DATA-DRIVEN (`SYS_STAGES` 6, `SYS_PIVOTS` 7) + ONE baked intro + two baked card
headings. Single file system-map.js (98 lines). `adoptedStyleSheets=[BASE_SHEET]`; per-pane CSS is
a `<style>` node. Two `.map` builders in connectedCallback (chain dot number `i+1`, `.cur` class +
"you are here" badge; native `<details class="piv">`). STATELESS: no methods, no state, no timers,
no listeners. ZERO external method calls (grep-confirmed).

**dataShape:** `sys: {intro, stages:[{n,d,cur?} x6], pivots:[{q,chip,a} x7], heads:{whereHead,pivHead,pivSub}}`.
Exactly ONE stage has `cur:true`. `heads` is the recommended superset (see 3.2).

**renderTopic split:** one-time `init()` caches 6 mount refs, wires NO listeners (native details);
re-runnable `renderTopic(d)` fills `.sm-intro`/`.chain`/`.pivs` (+ 3 heading mounts), moving BOTH
`.map` builders out of build-once (counts are per-topic); no teardownTopic.

**cpDataBundle:** `var TOPIC_CP_SYS`. intro = system-map.js:90. stages = :10-17 (6 objects). pivots
= lift :19-34 verbatim (7 objects; long `a:` bridge bodies have escaped `\'`). heads = :89/92/93.
SYS_STYLE (:36-67) stays in the pane as `styleText()`.

**Consumer rewires:** NONE (stateless minimal case). zoom-diagrams (`.chain,.dgm`) +
card-spotlight (`.card`) re-resolve via composedPath per event -> keep class="chain" + class="card".
search-overlay static nav entry is topic-agnostic. The only "rewire" is the DATA MOVE within the
sys agent's two files.

**Gotchas:** PRESERVE class="chain" + class="card" (zoom/spotlight match live); SYS_STYLE stays in
pane; sys intro is DATA not identity (applyIdentity does NOT touch it); card-1 heading
topic-specific -> `heads.whereHead`; exactly one `cur:true`; prefix mount ids with `sm`; stateless
-> no teardown/listeners/methods; no `[data-autofocus]` needed; load order after topic-protocol.js.

---

### 6.6 trade (`<deep-trade-offs>`) -- effort S (HARD: shadow-scrape kill)

**Current:** FULLY BAKED HTML + shadow reverse-scrape. trade-offs.js (102 lines). canonical
build-once connectedCallback; adopt `[BASE_SHEET,OPT_SHEET]`. TRADE_HTML = `.ledger` + `.lead` + 7
`.dec` blocks (opt counts 2,2,3,2,3,2,2). ZERO interactivity. `getDecisions()` (:87-99) is the
SHADOW REVERSE-SCRAPE: `querySelectorAll('.dec')`, reads `.dec-q`.innerHTML, concatenates each
`.opt`.outerHTML, reads `.dec-tell`.innerHTML; returns `[{q, optsHtml, tell}]`. SOLE runtime consumer:
mixed-fire.js getTrades() (:30-39) reads `d.q`/`d.optsHtml`/`d.tell`.

**dataShape:** `trade: {lead, decisions:[{q, opts:[{n,when}], tell} x7]}`. The "pick when" pill text
is hard-coded in the renderer, NOT data. getDecisions() PROJECTS this to the cross-pane
`{q, optsHtml, tell}` shape mixed-fire already consumes -- `optsHtml = decision.opts.map(tradeRenderOpt).join('')`.

**renderTopic split:** simplest stateless conversion. Module-level PANE-SCOPED helpers
`tradeRenderOpt(o)` + `tradeRenderDec(d)` (bare names would clash with rf/open in the same wave).
`skeleton()` = `<div class="ledger"><div class="lead" id="tlead"></div><div id="tdecs"></div></div>`.
`init` caches `_lead`/`_decs` (no listeners). `renderTopic(d)`: stash `_decisions`; fill
`_lead.innerHTML`/`_decs.innerHTML`. `getDecisions()` derives optsHtml from `this._decisions` (no
scrape). No teardownTopic, no focus target.

**cpDataBundle:** `var TOPIC_CP_TRADE`. lead = :24; 7 decisions from blocks :26-31,:33-38,:40-46,
:48-53,:55-61,:63-68,:70-75. (Spec includes the FULL extracted object -- 7 decisions with opts +
tell, all 7-bit ASCII.) bank.js does NOT reference trade.

**Consumer rewires:** mixed-fire.js getTrades() -- ZERO change (deliberate; getDecisions keeps the
exact `{q,optsHtml,tell}` shape; editing the un-owned mixed-fire would break disjoint-files). The
ONLY rewire is INTERNAL: getDecisions() now data-sourced. DECISION RECORD: do NOT relitigate
returning raw `{q,opts,tell}` -- rejected because it forces a mixed-fire edit for zero benefit.

**Gotchas:** getDecisions MUST keep `{q,optsHtml,tell}` (NOT opts[]); tradeRenderOpt emits IDENTICAL
`.opt` markup incl. the literal "pick when" pill; PANE-SCOPE the helper names; ASCII-only
(`&mdash;`/`&nbsp;`/`&lt;`); skeleton nests 7 `.dec` in `#tdecs` (safe -- no `.ledger>.dec` child
combinator); do NOT touch TRADE_STYLE/OPT_SHEET (flip tokens defined in styles.css); build order
(register before trade-offs); foundation CANNOT thin-alias trade (no pre-existing global -- see
section 8); guard `getDecisions` with `(this._decisions || [])`; child-mounts-only.

---

### 6.7 model (`<deep-model-answers>`) -- effort S

**Current:** DATA-DRIVEN answer bodies + BAKED selector-label seam. model-answers/answers.js
(`var modelAnswers=[...]`, 9 `{opener,sub,beats:[{l,c,t}]}`, beat counts 7,7,7,7,7,7,5,6,5) +
model-answers/logic.js (MODEL_STYLE, MODEL_HTML = `.msel` strip with 9 hard-coded
`<button data-i=N>` + `<div class="card" id="modelBody">`, `class DeepModelAnswers`). currentAnswer +
renderModel are CLOSURE-LOCAL; NO public API. Per-button `.onclick` loop.

**dataShape:** `model: {selectors:[x9], answers:[{opener,sub,beats:[{l,c,t}]} x9]}`. selectors[i]
selects answers[i] (parallel, indexed by data-i). Selector LABEL ('Make it reliable') DISTINCT from
opener ('How would you make this reliable?').

**renderTopic split:** `sheets()`=`[BASE_SHEET,MBEAT_SHEET]`; `styleText()`=MODEL_STYLE;
`skeleton()` = two EMPTY mounts `<div class="msel" id="msel"></div><div class="card" id="modelBody"></div>`
(buttons removed). `init`: cache `_msel`/`_modelBody` + ONE DELEGATED `.msel` click listener
(reads data-i -> `_cur` -> renderModel). `renderTopic(d)`: stash `_answers`; `_cur=0`; build button
strip into `.msel` mount from `d.selectors`; renderModel(). `renderModel()` hoisted from closure to
instance METHOD (called by both the handler and renderTopic). NO teardownTopic (effectively
stateless).

**cpDataBundle:** `var TOPIC_CP_MODEL`. selectors (full): `['Make it reliable','Make it scale','Walk
a failure','Defend the design','Operate it','Cut scope','One you built','Test it','Name the limits']`.
answers = lift answers.js:2-95 verbatim. answers.js then emptied/deleted.

**Consumer rewires:** NONE on the method side (no public API). Inline modelAnswers -> TOPIC_CP_MODEL,
delete answers.js array + its include. NOT the model agent's job (foundation owns): cmpNotes.model,
ROUTES.model, tabKeys 'y', search-overlay, touch-swipe ORDER -- these are the pane-axis id 'model',
not the component.

**Gotchas:** move .msel buttons init->renderTopic; ONE delegate not per-button; `l-<c>` beat-label
classes are dead CSS but KEEP emitting; selectors[]/answers[] parallel (carry BOTH); closure->
`this._cur`, renderModel must be a METHOD; child-mounts-only; ASCII (keep `\u`/entities);
FOUNDATION HAZARD: `modelAnswers` is PANE-LOCAL (not a pre-declared cross-pane global) -> a thin
alias `answers: modelAnswers` forward-references a global defined LATER in app.js order; foundation
must seed the real array directly (see section 8). Optional: tag active button `[data-autofocus]`.

---

### 6.8 num (`<deep-numbers>`) -- effort S (HARD: parametric + shell-split trap)

**Current:** PARAMETRIC calculator, NOT array-driven. numbers-nalsd.js. `class DeepNumbers`
(:46-88): NUM_STYLE (topic-invariant), NUM_HTML (lead + 4 inputs + #nout mount + tell),
connectedCallback adopts `[BASE_SHEET]`, wires input listeners on 4 FIXED ids, `_calc()`. Helpers
`_fmtN`/`_fmtTB` (pure), `_nval`. `_calc` HARDCODES ceilings Lambda 1000 / Postgres 100, builds a
6-row array. ZERO external reach-in. **TRAP:** ~2/3 of the file (lines 90-333) is the GLOBAL SHELL
(switchTab, keyboard, modal focus-trap, mobile sheet, `__syncCompanion` with closure-local cmpNotes,
nav-strip) -- lifted by FOUNDATION F3 to num/shell.js, NOT by the num agent.

**dataShape:** `num: {lead, tell, inputs:[{id,label,value,min,step?} x4], compute: function(vals, fmt){...}}`.
The parametric escape hatch: arithmetic + ceilings move INTO `compute`. `vals = {<id>: parsed number}`;
`fmt = {n:fmtN, tb:fmtTB}`. Returns the row array; `v` is a DISPLAY STRING.

**renderTopic split:** NUM_STYLE stays in num/logic.js; `_fmtN`/`_fmtTB`/`_nval` stay (pure).
`sheets()` inheritable (`[BASE_SHEET]`). `skeleton()` = invariant shell with lead/tell as mounts +
stable `#ninp` container + `#nout`. `init`: cache `_lead`/`_ninp`/`_out`/`_tell`; ONE DELEGATED
`input` listener on stable `#ninp`. `renderTopic(d)`: stash `_inputs`/`_compute`; fill lead/tell;
rebuild `#ninp` fields from d.inputs (count per-topic -> here, not init); `_calc()`. `_calc()`: read
inputs DYNAMICALLY (iterate `this._inputs`), call `this._compute(vals, {n,tb})`, render rows. NO
teardownTopic.

**cpDataBundle:** `var TOPIC_CP_NUM` (FULL, paste-ready in spec). lead = NUM_HTML:31; tell = :45;
inputs = the value/min/step attrs :35-38; compute body = `_calc` :69-79 with mechanical swaps
(`this._nval('n_obj')` -> `vals.n_obj`, `this._fmtN`/`this._fmtTB` -> `fmt.n`/`fmt.tb`). Ceilings
1000/100 now live in compute. cmpNotes.num goes to identity.js (NOT this file).

**Consumer rewires:** NONE on the pane (zero reach-in). The "rewires" around num belong to
FOUNDATION (F3 shell extraction; cmpNotes.num -> identity; app.js include order). num agent owns ONLY
num/logic.js + topics/content-pipeline/num.js.

**Gotchas:** THE FILE IS A TRAP (extract only DeepNumbers + NUM_STYLE; verify num/shell.js exists
first); parametric (compute fn in data); ceilings move into compute; delegate input listener; read
inputs dynamically; keep `_fmtN`/`_fmtTB` in component, pass `fmt` into compute (storage row's
`fmt.tb(stDay).split(' ')` split must reproduce byte-identically); first-paint ordering (logic.js
after the bundle or renderTopic renders blank); no teardown; ASCII (keep div/times/mdash escapes);
the `isn't` apostrophe in tell -> double-quote the string; sheets() omittable.

---

### 6.9 rf (`<deep-red-flags>`) -- effort S

**Current:** FULLY BAKED, no data layer -- the canonical static presentational pane and the easiest
of the 9. red-flags.js (87 lines). RF_STYLE (pane-exclusive). RF_HTML = one `.rflead` + NINE `.rf`
cards (each `.rf-bad` [x chip + `<b>` quote + optional `.rf-note`] + `.rf-tell` + `.rf-fix` [arrow
chip + fix]). canonical build-once; adopt `[BASE_SHEET]`. ZERO state/methods/listeners/timers. NO
downstream consumer (grep-confirmed). Load-order: FIRST pane include (app.js:4), so first to upgrade.

**dataShape:** `rf: {lead, flags:[{bad, note|null, tell, fix} x9]}`. Only flag #9 has a `note`.
Invariant chrome (x chip `&#10007;`, arrow `&rarr;`, wrappers) lives in the rfCard template, NOT data.

**renderTopic split:** `sheets()`=`[BASE_SHEET]`; `styleText()`=RF_STYLE;
`skeleton()`=`<div class="rflead" id="rflead"></div><div id="rflist"></div>`. `init`: cache
`_lead`/`_list` (NO listeners -- non-interactive; simplest init of all 9).
`renderTopic(d)`: `_lead.innerHTML=d.lead; _list.innerHTML=d.flags.map(rfCard).join('')`. Module-level
`rfCard(f)` with the note guard `(f.note ? ' <span class="rf-note">'+f.note+'</span>' : '')`. NO
teardownTopic, NO public API.

**cpDataBundle:** `var TOPIC_CP_RF` (FULL extraction in spec). lead = :23; 9 flags from :25-76
(bad = inner of `<b>`; tell = `.rf-tell`; fix = inner of `.rf-t` in `.rf-fix`; note = `.rf-note`,
#9 only). Double-quoted JS strings (cards.js convention).

**Consumer rewires:** NONE (clean case). rf agent touches EXACTLY TWO files (red-flags.js +
topics/content-pipeline/rf.js). cmpNotes.rf lives in identity.js (not here).

**Gotchas:** no pre-existing array to alias -> foundation can only stub `{lead:'',flags:[]}`; real
extraction is the rf agent's own PR; load-order dependency (first to upgrade -- rely on foundation,
don't touch app.js); note guard LEADING space; invariant chrome in template not data; ASCII (keep
entities; DOUBLE-quote strings so apostrophes need no escaping); child-mounts-only; nesting cards in
`#rflist` is safe (flat class selectors); no teardown / no focus target.

---

### 6.10 open (`<deep-opener>`) -- effort S

**Current:** FULLY BAKED, zero data layer -- the simplest of the 9. opener-altitude.js (116 lines).
OP_STYLE (3 dark-mode flip tokens; `.op-rev` border `#cfc7f0` hardcoded). OP_HTML = TWO baked
`<div class="card">` blocks: card 1 'open/altitude' (2 reveal cards + an `.op-hooks` block of 3
hooks + foot), card 2 'close/land it' (3 reveal cards, NO hooks). `DeepOpener`: build-once, adopt
`[BASE_SHEET]`, per-button `btn.onclick` loop (reveal -> show .op-a + disable + 'Revealed'). NO
public API. `.card`/`.step-k`/`.step-t` come from BASE_SHEET (so `sheets()`=`[BASE_SHEET]` only). The
`pop` animation leaks from light-DOM @keyframes.

**dataShape:** `open: {cards:[{kind,k,t,lead,items:[{n,ht,a}],hooks:{lead,items:[{q,d,tab}]}|null,foot} x2]}`.
cards[0]=open (has hooks), cards[1]=close (hooks:null). The arrow span, `.op-arr`/`.op-tab` wrapper,
and 'Reveal mine' label are STATIC in the renderer, not data.

**renderTopic split:** `sheets()`=`[BASE_SHEET]`; `styleText()`=OP_STYLE (keep the 3 flip tokens +
`#cfc7f0`); `skeleton()`=`<div id="opbody"></div>` (single stable mount). `init`: cache `_body` +
ONE delegated `.op-rev` click on the stable mount (guard `if(!btn||btn.disabled)return`; resolve
answer via `btn.closest('.op').querySelector('.op-a')`). `renderTopic(d)`:
`this._body.innerHTML = d.cards.map(renderOpenCard).join('')`. Module-level `renderOpenCard(c)`
emits items, THEN hooks (if `c.hooks`), THEN foot. NO teardownTopic (reveal/disabled is transient
DOM destroyed by the innerHTML rewrite -> auto-resets to all-hidden on switch).

**cpDataBundle:** `var TOPIC_CP_OPEN` (FULL extraction in spec). Lift long strings VERBATIM from the
cited lines (card 1: k:40/t:41/lead:42/items 45-46,51-52/hooks 57-68/foot 72; card 2: k:75/t:76/
lead:77/items 79-90/foot 93). Note line-93 foot's dangling `<i>` -- preserve. open has NO global to
alias -> recommend shipping the FULL object in F4.

**Consumer rewires:** NONE (zero-consumer pane). open agent edits ONLY open.js + opener-altitude.js.
search-overlay static nav entry is view-level/topic-agnostic -- leave it.

**Gotchas:** entity_leak.cjs descends shadow -> renderTopic MUST use innerHTML never textContent;
delegated listener on STABLE `#opbody` (per-item nodes destroyed each render); no teardown (auto-reset);
`sheets()`=`[BASE_SHEET]` only; `pop` keyframe leaks from styles.css (don't relocate); child-mounts-only
(wrap the 2 cards in inert `#opbody`); whitespace differs but visually identical; reproduce every
class/entity + cards->items->hooks->foot ORDER; coordination -- ship full TOPIC_CP_OPEN in F4
(thin alias impossible).

---

## 7. Build Order

SHARED FOUNDATION first (serial, one warm agent, check_all-gated, lands GREEN with the mechanism
present but DORMANT and zero behavior change), THEN 9 parallel worktree-isolated pane BUILDS, THEN
a SERIAL verified merge (one at a time, gate-gated, never stack unverified merges), THEN topic 2 as
the proof.

### 7.1 PHASE 0 -- FOUNDATION (the contract; byte-rebuildable + gate-green on its own)

- **F1.** Add topic-protocol.js: TopicPane base + TopicRegistry + setTopic/publishBanks/
  applyIdentity/afterTopicSwap/closeTransientOverlays + declare the registry-owned cross-pane
  globals. Move drill/logic.js's `var _allCards=cards` ownership here.
- **F2.** router.js + view-manager.js: topic axis + Router.setTopic(silent) + applyRoute reads
  route.topic (back-compat: 1 topic == identical behavior).
- **F3.** Split numbers-nalsd.js -> num/shell.js (switchTab + keyboard + `__syncCompanion`[now reads
  TOPIC_CMP_NOTES] + mobile sheet) + num/logic.js (DeepNumbers, still plain for now). Pure refactor.
- **F4.** Create the topic bundle: identity.js (extract ALL identity + cmpNotes), bank.js (relocate
  mock-run/data.js's mockBeats/curveballs/frames), register.js (register topic 1),
  content-pipeline.js wrapper, and the 9 per-pane data files as thin ALIASES to the existing globals
  -- EXCEPT the panes with no global to alias (trade/rf/open seed real-or-stub data; model seeds the
  real array, not a forward-referencing alias -- see section 8).
- **F5.** app.js include order (data BEFORE base BEFORE panes so customElements.define upgrades with
  current()!=null):
  ```
  base-styles -> content-sheet -> shared-sheets
    -> topic-protocol.js                  (registry + base exist)
    -> topics/content-pipeline.js         (identity, 9 data aliases, bank, register -> topic 1 current, banks seeded)
    -> red-flags ... opener-altitude      (the 9 pane classes; still plain in F4)
    -> mock-run, mixed-fire               (read the seeded bank globals)
    -> num/shell.js (was numbers-nalsd tail), router, view-manager, ...overlays
  ```
- **F6.** Rebuild (`python build.py`) + commit deliverable; check_all GREEN. (build_integrity is
  rebuild==committed, NOT a freeze of the old monolith -- output legitimately changes;
  visual_regression + e2e are the "topic-1 still renders identically" oracle.)

### 7.2 PHASE 1 -- PARALLEL PANE BUILDS (9 agents, disjoint files, each merges serially + gated)

Recommended wave order by leverage/risk (NOT a dependency chain -- they are independent):

- **1st wave: rf, open, trade** -- the 3 FULLY-BAKED panes; they prove the "baked HTML -> data
  array -> fill mount" path. trade also data-izes getDecisions() and unblocks mixed-fire's scrape
  coupling.
- **2nd wave: sys, wb, walk, model** -- data-driven/hybrid; move the 2 baked blobs (wb diagram, walk
  model-script) + model selector labels + sys intro into data.
- **last: num** -- parametric; introduce `compute(vals)->rows` so the 1000/100 ceilings become
  per-topic (escape hatch for structurally-different estimations).

After each MERGE: that pane renders via the registry; the not-yet-merged panes still alias -- both
green, because `current().data[key]` returns the slice either way.

### 7.3 PHASE 2 -- PROVE THE CONTRACT

Add `topics/topic-2/` (identity + 9 data + bank) + register + a topic-picker that calls
`TopicRegistry.setTopic`. ZERO foundation/pane changes -- a 10th file set lights up multi-topic.
This is the payoff the whole protocol exists for, and the regression check that the contract is
genuinely uniform.

### 7.4 Which panes are the HARD ones

Two distinct difficulty axes -- keep them separate:

- **By raw effort (LOC):** drill (L) is the biggest, then wb (M). But both are LOW-NOVELTY -- they
  are already array-shaped/hybrid, so the conversion is mechanical (lift arrays, split lifecycle).
- **By NOVELTY / risk (the genuinely hard conversions, which is why the build order sequences them):**
  - **trade / rf / open** -- the 3 FULLY-BAKED panes. They have NO data layer today and (for trade)
    NO pre-existing global to alias, so the foundation cannot thin-alias them; the agent must EXTRACT
    HTML to data and convert the class atomically. trade additionally must kill the mixed-fire shadow
    reverse-scrape while keeping `getDecisions()` byte-identical. These prove the core "baked ->
    data" pattern, so they go FIRST.
  - **num** -- the PARAMETRIC outlier. Its "data" is a `compute()` FUNCTION (the only data file with
    executable logic), and its source file is 2/3 global shell that FOUNDATION must split first (the
    F3 trap). It goes LAST as the structural escape hatch.

So: drill/wb are the heavy lifts; trade/rf/open/num are the conceptually hard / highest-risk-to-get-
the-contract-right conversions. rf and open are mechanically simple (zero consumers) once the
fully-baked pattern is established by the first wave.

---

## 8. Dropped / Incomplete / Flagged (honest)

1. **The per-topic schema in the contract is ABBREVIATED; the real authored shape has per-pane
   extensions.** Adopted and documented in 3.2: wb adds `sub` + `okVerdict`; sys adds `heads`; num's
   `compute` is a function, not an array. Anyone building to the literal `topicSchema` would pin
   wb/sys copy to topic 1. Not a defect -- but the canonical schema must be read WITH section 3.2.

2. **Large-pane cpDataBundles are line-range pointers, not inlined content.** drill (cards.js:2-185,
   speak-lines.js:2-21) and walk (steps.js:2-42) specs say "lift verbatim" rather than reproducing
   the bytes (deliberate -- avoids entity-transcription drift). Consequence: those two pane specs are
   NOT self-contained; the agent MUST read the source files. The small/baked panes (trade, rf, open,
   num, sys headings, model selectors) ARE fully inlined in their specs.

3. **Foundation aliasing is NOT uniform -- three exceptions the foundation must handle, or F4 ships a
   broken/forward-referencing alias:**
   - **model** -- `modelAnswers` is PANE-LOCAL (defined at app.js:19, AFTER the topics bundle). A
     thin alias `answers: modelAnswers` captures `undefined`. Foundation MUST seed the real array
     (or reorder answers.js before the bundle, or use a getter). The model agent's end-state (literal
     array in model.js) is forward-ref-free.
   - **trade / rf / open** -- FULLY BAKED, no pre-existing global to alias. Foundation either seeds
     the REAL extracted data up front (recommended for open; viable for trade) or seeds a tolerable
     stub (`{lead:'',decisions:[]}` / `{lead:'',flags:[]}`) and leaves the pane baked-and-green until
     the agent converts. Either keeps the gate green; the agent owns extraction + class conversion
     atomically in its worktree. This is a real coordination decision the foundation phase must make
     explicit, not assume.

4. **test/unit_tests.py `data_files` manifest is a SHARED gate file every pane data-extraction
   touches** (walk flags it: row `app/walkthrough/steps.js` must be repointed to the new data file;
   the same applies to drill's cards.js/speak-lines.js, model's answers.js, etc.). If 9 agents each
   edit it in their worktree, they collide at merge. RECOMMENDATION: handle the manifest in the
   FOUNDATION phase when seeding the aliases (foundation knows the final file set), so pane agents
   never touch it. This is currently UNDER-SPECIFIED in the per-pane fileLayout (only walk calls it
   out) and is the most likely cross-worktree merge conflict if not pre-empted.

5. **num.js carries executable logic in a "data" file.** The `compute(vals, fmt)` function is the
   sanctioned escape hatch, but it means num.js is the one data file that is not pure data. It must
   still pass the unit_tests.py:48 guard (forbids innerHTML/appendChild/createElement/
   adoptedStyleSheets/attachShadow) -- compute does arithmetic + string building only, so it should
   pass, but this is the file most likely to trip a future tightening of that guard. Flag for the num
   agent: keep compute DOM-method-free.

6. **Phase 2 (topic 2) is real CONTENT AUTHORING, not just wiring.** The build order frames topic 2
   as "a 10th file set lights up multi-topic" (true for the MECHANISM), but it requires authoring a
   complete second topic: identity + 9 data slices + bank (curveballs/mockBeats/frames). The
   protocol work is zero-change; the content work is a full topic's worth. Budget it as an authoring
   task (~M), not a wiring task.

7. **bank.js cross-pane content (curveballs/mockBeats/frames) is owned by FOUNDATION but its
   extraction source is thin in the specs.** The schema shows the shape and notes it relocates from
   `mock-run/data.js`, but no per-pane spec details the curveball/mockBeat extraction (it is not a
   pane's job). The foundation agent must extract these from the current mock-run/mixed-fire data
   during F4. Flagged so it is not lost between the pane specs (which disclaim it) and the foundation
   (which must own it).

8. **Minor / cosmetic (noted, not blocking):** stale comment in drill/logic.js:2-3 ("opener pane
   reads cards" -- wrong; opener's `cards` is a local `querySelectorAll`); the trade-offs.js comment
   calling `--dec-tell-b-fg` "exclusive" is wrong (numbers-nalsd.js:29 also uses it); model's
   `l-<c>` beat-label classes are dead CSS (KEEP emitting); CSS entry animations (walk dots/arc, sys
   curPulse) legitimately restart on switch (deliberate reset, 8/9 panes off-screen anyway).

---

## Appendix: load-order one-line invariant

`base-styles -> content-sheet -> shared-sheets -> topic-protocol.js -> topics/content-pipeline.js
(registers topic 1) -> the 9 pane classes -> mock-run/mixed-fire -> num/shell.js -> router ->
view-manager -> overlays.` If any pane class is defined before the topic bundle registers, its
base `connectedCallback` calls `TopicRegistry.current()` === null and `_applyTopic`'s
`if(!topic)return` silently paints a BLANK pane. This single ordering fact is the boot-correctness
keystone.
