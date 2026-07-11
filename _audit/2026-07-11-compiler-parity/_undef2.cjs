const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport:{width:1280,height:900} });
  await pg.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await pg.waitForTimeout(1500);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { const o=document.getElementById('_index-overlay'); if(o){o.classList.remove('open','vis'); o.style.display='none';} });
  for (const [id,label] of [['idempotency','md-38'],['content-pipeline','HAND-8']]) {
    await pg.evaluate(i => TopicRegistry.setTopic(i), id);
    await pg.evaluate(() => document.querySelector('button[data-tab="drill"]').click());
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => {
      const sr = document.querySelector('deep-drill').shadowRoot;
      const tn = sr.getElementById('tiernote');
      const t  = TopicRegistry.current();
      return { text: tn ? JSON.stringify(tn.textContent) : 'NO NODE',
               visible: tn ? (tn.getClientRects().length > 0) : false,
               tierNotesKeys: Object.keys((t.data.drill||{}).tierNotes || {}),
               sysHeads: Object.keys(((t.data.sys||{}).heads)||{}),
               sysHeadsUndef: ['whereHead','pivHead','pivSub'].filter(k => ((t.data.sys||{}).heads||{})[k] === undefined) };
    });
    console.log(`${label.padEnd(8)} ${id.padEnd(18)} drill #tiernote = ${r.text.padEnd(14)} visible=${r.visible}`);
    console.log(`         drill.tierNotes keys: [${r.tierNotesKeys}]`);
    console.log(`         sys.heads keys: [${r.sysHeads}]   undefined: [${r.sysHeadsUndef}]  <-- SYS`);
  }
  await b.close();
})();
