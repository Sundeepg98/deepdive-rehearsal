/* mock-run runtime state. The cross-pane BANK (mockBeats/curveballPool/framePool +
   their indices) was relocated to topics/content-pipeline/bank.js by the Keystone A
   foundation and is seeded into the registry-owned globals by publishBanks(); this
   file keeps only mock-run's own per-run cursor + DOM refs. */
var mockBeat=0, mockSec=0, mockClock=null, mockStartMs=0, mockKeyCtrl=null, mockLastScore=null, mockLastTime=null, mockRuns=0, mockInterrupt=false, mockIntSet={}, mockLastInt=0;
var mockov=document.getElementById('mockov'),
    mockbody=null, mockRoot=null,
    mockclockEl=document.getElementById('mockclock');
