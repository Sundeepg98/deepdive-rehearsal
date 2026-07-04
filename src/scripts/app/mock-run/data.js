/* mock-run runtime state. The cross-pane BANK (mockBeats/curveballPool/framePool +
   their indices) was relocated to topics/content-pipeline/bank.js by the Keystone A
   foundation and is seeded into the registry-owned globals by publishBanks(); this
   file keeps only mock-run's own per-run cursor + DOM refs. */
var mockBeat=0, mockSec=0, mockClock=null, mockStartMs=0, mockKeyCtrl=null, mockLastScore=null, mockLastTime=null, mockRuns=0, mockInterrupt=false, mockIntSet={}, mockLastInt=0;
/* Persist the last mock outcome (score / time / run count / interruptions) so a
   reload keeps it and the session-progress recommendation survives. */
function mockPersist() { try { if (typeof Store !== 'undefined' && Store.set) Store.set('mock.last', { score: mockLastScore, time: mockLastTime, runs: mockRuns, int: mockLastInt }); } catch (e) {} }
(function () { try { if (typeof Store !== 'undefined' && Store.get) { var m = Store.get('mock.last', null); if (m && typeof m === 'object') { if (m.score != null) mockLastScore = m.score; if (m.time != null) mockLastTime = m.time; mockRuns = m.runs || 0; mockLastInt = m.int || 0; } } } catch (e) {} })();
var mockov=document.getElementById('mockov'),
    mockbody=null, mockRoot=null,
    mockclockEl=document.getElementById('mockclock');
