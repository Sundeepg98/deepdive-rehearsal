/* mock-run runtime state. The cross-pane BANK (mockBeats/curveballPool/framePool +
   their indices) was relocated to topics/content-pipeline/bank.js by the Keystone A
   foundation and is seeded into the registry-owned globals by publishBanks(); this
   file keeps only mock-run's own per-run cursor + DOM refs. */
var mockBeat=0, mockSec=0, mockClock=null, mockStartMs=0, mockKeyCtrl=null, mockLastScore=null, mockLastOutOf=null, mockLastTime=null, mockRuns=0, mockInterrupt=false, mockIntSet={}, mockLastInt=0;
/* ===== PER-TOPIC MOCK RECORD (Wave 0 re-key) =====
   The mock outcome (score / OUT OF WHAT / time / run count / interruptions) is stored PER TOPIC
   under `mock.<id>`, NOT the old GLOBAL `mock.last`. That single global key was a topic-less lie:
   sessStats/pickRec read it as THIS topic's truth, so a mock run on topic A then the panel opened
   on topic B recommended A's mock to a B audience (the moment a user touched two topics, the
   engine was fed a lie). Keyed by the topic the run belonged to, every reader is honest by
   construction. Mirrors Progress's per-topic record (`progress.<id>`) and its
   load-on-`deeptopicchange` discipline.
   `outOf` is the beat count of the run that produced `score`: a topic's mock is scored out of ITS
   beats (6 for the hand-coded 8, 2 for the markdown topics), so a bare score cannot be rendered or
   judged without it. Absent (a record from before `outOf` was stored) -> readers fall back to 6,
   the only denominator that existed then (see mOut() in session-progress.js). */
function mockCurId() { try { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null; } catch (e) { return null; } }
function mockKey(id) { return 'mock.' + id; }
function mockPersist() { try { var id = mockCurId(); if (id && typeof Store !== 'undefined' && Store.set) Store.set(mockKey(id), { score: mockLastScore, outOf: mockLastOutOf, time: mockLastTime, runs: mockRuns, int: mockLastInt }); } catch (e) {} }
/* Load THIS topic's mock record into the live globals -- or ZERO them when the topic has none, so
   switching from a mocked topic to an un-mocked one shows "not run" instead of leaking the last
   topic's numbers. Fired on every deeptopicchange and once for the boot topic (register() seeds
   the boot topic WITHOUT firing deeptopicchange, exactly as Progress.migrate() must boot-run). */
function mockLoadForTopic(id) {
  var m = (id && typeof Store !== 'undefined' && Store.get) ? Store.get(mockKey(id), null) : null;
  if (m && typeof m === 'object') {
    mockLastScore = (m.score != null) ? m.score : null;
    mockLastOutOf = (m.outOf != null) ? m.outOf : null;
    mockLastTime = (m.time != null) ? m.time : null;
    mockRuns = m.runs || 0;
    mockLastInt = m.int || 0;
  } else {
    mockLastScore = null; mockLastOutOf = null; mockLastTime = null; mockRuns = 0; mockLastInt = 0;
  }
}
/* Has the user run a mock on ANY topic? The re-key means the live `mockRuns` global now speaks
   only for the CURRENT topic, but panels.js's engaged() needs the cross-topic answer ("mocked, or
   mixed-fired -- that is engagement"). Enumerate the per-topic keys, defensively skipping the
   discarded legacy global in case enumeration ever races the boot migration. */
function mockRanAny() {
  try {
    if (typeof Store === 'undefined' || !Store.keys) return false;
    var ks = Store.keys('mock.');
    for (var i = 0; i < ks.length; i++) { if (ks[i] !== 'mock.last') return true; }
  } catch (e) {}
  return false;
}
/* ===== LEGACY MIGRATION (one-time, idempotent, reported) =====
   The old GLOBAL `mock.last` carried NO topic id, so it is GENUINELY UNATTRIBUTABLE: the mock
   could have been run on any of the 46 topics, and pinning it onto whatever topic is current at
   boot would be a guess. Progress's migration doctrine is binding here -- "a wrong grade is worse
   than a missing one, because the user cannot see that it is wrong" (progress.js) -- so we DISCARD
   rather than mis-attribute. Idempotent (removing an absent key is a no-op; re-runs report 'none')
   and non-silent (recorded in __mockMig). Cost: a user who ONLY mocked pre-upgrade loses that one
   unplaceable record; the alternative is to lie about which topic it belonged to. */
var __mockMig = { legacy: 'none' };
function mockMigrateLegacy() {
  try {
    if (typeof Store === 'undefined' || !Store.get) return;
    if (Store.get('mock.last', null) != null) { __mockMig.legacy = 'discarded'; Store.remove('mock.last'); }
  } catch (e) {}
}
window.addEventListener('deeptopicchange', function (e) { mockLoadForTopic(e && e.detail ? e.detail.id : mockCurId()); });
(function () {
  function boot() { mockMigrateLegacy(); mockLoadForTopic(mockCurId()); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
var mockov=document.getElementById('mockov'),
    mockbody=null, mockRoot=null,
    mockclockEl=document.getElementById('mockclock');
