import { chromium } from 'playwright';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await p.waitForFunction(()=>typeof TopicRegistry!=='undefined');
  await p.evaluate(()=>TopicRegistry.setTopic('api-design'));
  await p.waitForTimeout(250);
  const snap = ()=>p.evaluate(()=>({
      canonicalCurveballCue: TOPIC_API_BANK.curveballs[0].cue.slice(0,64),
      mixPrompt: (()=>{ buildMix(); const c=mxPool.find(x=>x.kind==='Curveball'); return c? c.prompt.replace(/<[^>]+>/g,'|').slice(0,64):'(none)';})()
  }));
  console.log('1) CLEAN  ', JSON.stringify(await snap(),null,1));
  await p.evaluate(()=>openMock());  await p.waitForTimeout(200);
  await p.evaluate(()=>closeMock()); await p.waitForTimeout(200);
  console.log('2) AFTER ONE MOCK RUN ', JSON.stringify(await snap(),null,1));
  // does switching topic away and back HEAL it?
  await p.evaluate(()=>TopicRegistry.setTopic('caching')); await p.waitForTimeout(200);
  await p.evaluate(()=>TopicRegistry.setTopic('api-design')); await p.waitForTimeout(200);
  console.log('3) AFTER TOPIC SWITCH AWAY+BACK ', JSON.stringify(await snap(),null,1));
  await b.close();
})();
