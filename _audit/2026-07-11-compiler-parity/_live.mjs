import { chromium } from 'playwright';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(String(e)));
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await p.waitForFunction(()=>typeof TopicRegistry!=='undefined');

  // ---- switch to a GENERATED topic
  const ids = await p.evaluate(()=>TopicRegistry.ids());
  console.log('topics registered:', ids.length);
  await p.evaluate(()=>TopicRegistry.setTopic('api-design'));
  await p.waitForTimeout(300);

  const before = await p.evaluate(()=>({
    canonCue: TOPIC_API_BANK.curveballs[0].cue.slice(0,70),
    canonTheme: TOPIC_API_BANK.curveballs[0].theme,
    beats: mockBeats.length, beatTags: mockBeats.map(x=>x.tag),
    curveIdx: mockCurveIdx, frameIdx: mockFrameIdx,
    poolLen: curveballPool.length,
    beatHasModel: mockBeats.map(x=>!!x.model), beatHasInt: mockBeats.map(x=>!!x.int),
    task0: mockBeats[0].task.slice(0,90),
    poolIsCanonical: curveballPool[0] === TOPIC_API_BANK.curveballs[0],
  }));
  console.log('\n=== BEFORE openMock (api-design) ===');
  console.log(JSON.stringify(before,null,2));

  // ---- open the mock run
  await p.evaluate(()=>{document.querySelectorAll('.ix-ov,.open').forEach(e=>e.classList.remove('open','vis'));}); await p.evaluate(()=>openMock()); await p.waitForTimeout(400);
  const dom = await p.evaluate(()=>{
    const r = document.querySelector('deep-mock-run').shadowRoot;
    const g = s => { const e=r.querySelector(s); return e? e.textContent.trim() : null; };
    return { prog:g('.mb-prog'), tag:g('.mb-tag'), cue:g('.mb-cue').slice(0,60),
             task:g('.mb-task').slice(0,120), modelHTML: r.querySelector('.mb-model').innerHTML };
  });
  console.log('\n=== MOCK BEAT 1 as RENDERED ===');
  console.log(JSON.stringify(dom,null,2));

  const after = await p.evaluate(()=>({
    canonCue: TOPIC_API_BANK.curveballs[0].cue.slice(0,70),
    canonTheme: TOPIC_API_BANK.curveballs[0].theme,
    beat0IsCanonicalCurveball: mockBeats[0] === TOPIC_API_BANK.curveballs[0],
    beat0Tag: mockBeats[0].tag,
  }));
  console.log('\n=== AFTER openMock -- CANONICAL BANK STATE ===');
  console.log(JSON.stringify(after,null,2));
  console.log('CORRUPTED:', before.canonCue !== after.canonCue);

  // ---- walk to the end screen to read the scoring
  for (let i=0;i<3;i++){ await p.evaluate(()=>{const r=document.querySelector('deep-mock-run').shadowRoot; const n=r.getElementById('mbnext'); if(n) n.click();}); await p.waitForTimeout(150); }
  const end = await p.evaluate(()=>{ const r=document.querySelector('deep-mock-run').shadowRoot;
    const q=r.querySelector('.mb-score-q'), cv=r.querySelector('.mb-end-cv'), sc=r.getElementById('mbscore');
    return { scoreQ:q?q.textContent:null, buttons: sc?sc.children.length:0,
             curveLine: cv?cv.textContent:null }; });
  console.log('\n=== MOCK END SCREEN ===');
  console.log(JSON.stringify(end,null,2));

  // ---- Mixed Fire: does the missing curveball .task render "undefined"?
  await p.evaluate(()=>closeMock()); await p.waitForTimeout(200);
  await p.evaluate(()=>openMix()); await p.waitForTimeout(300);
  const mix = await p.evaluate(()=>{
    const r=document.querySelector('deep-mixed-fire').shadowRoot;
    const out=[]; 
    for(let i=0;i<8;i++){
      const kind=r.querySelector('.mx-kind'), prompt=r.querySelector('.qq'), lab=r.querySelector('.mx-label');
      if(!kind) break;
      out.push({kind:kind.textContent, label:lab.textContent.slice(0,40), taskHTML:(r.querySelector('.mx-task')||{}).innerHTML||null, promptHasUndefined:/undefined/.test(prompt.innerHTML)});
      const s=r.getElementById('mxshow'); if(s) s.click();
      const g=r.getElementById('mxg'); if(g) g.click(); else break;
    }
    return out;
  });
  console.log('\n=== MIXED FIRE ITEMS ===');
  console.log(JSON.stringify(mix,null,2));
  console.log('\npage errors:', errs.length?errs:'(none)');
  await b.close();
})();
