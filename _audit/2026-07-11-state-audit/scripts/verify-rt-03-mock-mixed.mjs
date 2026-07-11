/* VERIFY Finding 3 (mock beat clobber) + probe two things the lens did NOT check:
   (A) does MIXED FIRE print the same literal "undefined"? (it reads cb.task too)
   (B) does openMock() MUTATE THE CANONICAL topic bank? publishBanks does
       curveballPool = b.curveballs.slice()  <- SHALLOW: objects are shared refs
       openMock does  mockBeats[curveIdx] = curveballPool[r]; mockBeats[frameIdx].cue = ...
       When curveIdx === frameIdx === 0 (the 38 topics), the 2nd line mutates the
       SHARED canonical curveball object. topic-protocol.js:25-27 explicitly claims
       "the canonical topic data is never clobbered". */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-interactions/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(500);

const TOPIC = 'caching';

// ---------- STEP 1: canonical bank BEFORE any mock run ----------
const before = await p.evaluate((t) => {
  TopicRegistry.setTopic(t);
  const bank = TopicRegistry.get(t).data.bank;
  return {
    authoredBeat0: { tag: bank.mockBeats[0].tag, cue: bank.mockBeats[0].cue, task: bank.mockBeats[0].task },
    canonCurveball: { theme: bank.curveballs[0].theme, cue: bank.curveballs[0].cue, hasTask: 'task' in bank.curveballs[0] },
    frames: bank.frames.slice(),
  };
}, TOPIC);
await p.waitForTimeout(300);

// ---------- STEP 2: MIXED FIRE **BEFORE** ever opening the mock run ----------
// (isolates: is the "undefined" a mixed-fire bug in its own right?)
await p.evaluate(() => window.openMix());
await p.waitForTimeout(500);
const mixPre = await p.evaluate(() => {
  const root = document.querySelector('#mixov deep-mixed-fire')?.shadowRoot
            || document.querySelector('#mixov').querySelector('*')?.shadowRoot;
  const host = document.querySelector('#mixov');
  const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean);
  const scope = sr || host;
  // walk the whole pool: click through until we land on a Curveball item
  const grab = () => {
    const kind = scope.querySelector('.mx-kind')?.textContent?.trim();
    const prompt = scope.querySelector('.qq')?.textContent || '';
    const task = scope.querySelector('.mx-task')?.textContent ?? null;
    return { kind, prompt: prompt.slice(0, 120), task };
  };
  return { first: grab(), hasShadow: !!sr };
});

// step through mixed fire to find the Curveball item and read its task
const mixCurve = await p.evaluate(() => {
  const host = document.querySelector('#mixov');
  const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean);
  const scope = sr || host;
  const out = [];
  for (let i = 0; i < 12; i++) {
    const kind = scope.querySelector('.mx-kind')?.textContent?.trim();
    const taskEl = scope.querySelector('.mx-task');
    const prompt = scope.querySelector('.qq')?.textContent || '';
    out.push({ i, kind, task: taskEl ? taskEl.textContent : null, prompt: prompt.slice(0, 90) });
    if (kind === 'Curveball') break;
    // reveal then advance: click reveal, then a grade button to move on
    const show = scope.querySelector('#mxshow');
    if (show) show.click();
    const gradeBtns = [...scope.querySelectorAll('button')].filter(x => /got it|shaky|solid|revisit/i.test(x.textContent));
    if (gradeBtns[0]) gradeBtns[0].click(); else break;
  }
  return out;
});
await p.screenshot({ path: SHOT + 'mixedfire-caching-curveball.png' });
await p.evaluate(() => { const x = document.querySelector('#mixov .mock-x,#mixov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(400);

// ---------- STEP 3: open the MOCK RUN (the claimed defect) ----------
await p.evaluate(() => window.openMock());
await p.waitForTimeout(600);
const mock = await p.evaluate(() => {
  const host = document.querySelector('#mockov');
  const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean);
  const scope = sr || host;
  const taskEl = scope.querySelector('.mb-task');
  const r = taskEl ? taskEl.getBoundingClientRect() : null;
  return {
    prog: scope.querySelector('.mb-prog')?.textContent,
    tag: scope.querySelector('.mb-tag')?.textContent,
    cue: scope.querySelector('.mb-cue')?.textContent,
    taskText: taskEl ? taskEl.textContent : null,
    taskVisible: !!(r && r.width > 0 && r.height > 0),
    taskRect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
    liveBeat0: { tag: mockBeats[0].tag, cue: mockBeats[0].cue, task: mockBeats[0].task },
    curveIdx: mockCurveIdx, frameIdx: mockFrameIdx,
  };
});
await p.screenshot({ path: SHOT + 'mockrun-caching-undefined.png' });

// ---------- STEP 4: is the CANONICAL bank now corrupted? ----------
const after = await p.evaluate((t) => {
  const bank = TopicRegistry.get(t).data.bank;
  return {
    canonCurveball: { theme: bank.curveballs[0].theme, cue: bank.curveballs[0].cue },
    canonBeat0: { tag: bank.mockBeats[0].tag, cue: bank.mockBeats[0].cue },
  };
}, TOPIC);

// ---------- STEP 5: switch AWAY and BACK, then re-open mixed fire ----------
// If the canonical object was mutated, the corruption SURVIVES a topic switch
// (publishBanks re-slices from the same corrupted objects).
await p.evaluate(() => { const x = document.querySelector('#mockov .mock-x,#mockov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(300);
await p.evaluate(() => TopicRegistry.setTopic('saga'));
await p.waitForTimeout(400);
await p.evaluate((t) => TopicRegistry.setTopic(t), TOPIC);
await p.waitForTimeout(400);
const afterRoundTrip = await p.evaluate((t) => {
  const bank = TopicRegistry.get(t).data.bank;
  return {
    canonCurveballCue: bank.curveballs[0].cue,
    livePoolCue: curveballPool[0].cue,
  };
}, TOPIC);

console.log('=== TOPIC:', TOPIC, '===');
console.log('\n[1] AUTHORED beat 0 (canonical, before):');
console.log('    tag :', before.authoredBeat0.tag);
console.log('    cue :', before.authoredBeat0.cue);
console.log('    task:', String(before.authoredBeat0.task).slice(0, 80));
console.log('\n[2] CANONICAL curveball (before mock run):');
console.log('    theme  :', before.canonCurveball.theme);
console.log('    cue    :', before.canonCurveball.cue);
console.log('    hasTask:', before.canonCurveball.hasTask);
console.log('    frames :', JSON.stringify(before.frames));

console.log('\n[3] MIXED FIRE (opened BEFORE any mock run) — items until Curveball:');
mixCurve.forEach(m => console.log('    #' + m.i, 'kind=' + m.kind, '| task=' + JSON.stringify(m.task), '| prompt=' + m.prompt));

console.log('\n[4] MOCK RUN beat 1 (live render):');
console.log('    curveIdx=' + mock.curveIdx, 'frameIdx=' + mock.frameIdx);
console.log('    prog :', mock.prog);
console.log('    tag  :', mock.tag);
console.log('    cue  :', mock.cue);
console.log('    .mb-task textContent :', JSON.stringify(mock.taskText));
console.log('    .mb-task VISIBLE     :', mock.taskVisible, JSON.stringify(mock.taskRect));

console.log('\n[5] CANONICAL BANK **AFTER** openMock (corruption check):');
console.log('    canon curveball cue :', after.canonCurveball.cue);
console.log('    canon beat0        :', JSON.stringify(after.canonBeat0));
console.log('    CUE MUTATED?       :', before.canonCurveball.cue !== after.canonCurveball.cue ? '*** YES — CANONICAL DATA CLOBBERED ***' : 'no');
console.log('    (new cue is a FRAME bullet?)', before.frames.includes(after.canonCurveball.cue) ? '*** YES ***' : 'no');

console.log('\n[6] AFTER topic switch AWAY and BACK (does corruption persist?):');
console.log('    canon curveball cue:', afterRoundTrip.canonCurveballCue);
console.log('    live pool cue      :', afterRoundTrip.livePoolCue);
console.log('    STILL CORRUPTED?   :', afterRoundTrip.canonCurveballCue !== before.canonCurveball.cue ? '*** YES — PERSISTS ***' : 'no (recovered)');

console.log('\nCONSOLE/PAGE ERRORS:', errs.length, errs.slice(0, 5));
await b.close();
