const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport:{width:1280,height:900} });
  await pg.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await pg.waitForTimeout(1500);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { const o=document.getElementById('_index-overlay'); if(o){o.classList.remove('open','vis'); o.style.display='none';}
                            document.querySelector('button[data-tab="sys"]').click(); });
  await pg.waitForTimeout(300);
  const probe = ['api-design','debugging','distributed-locks','error-propagation','saga','sharding-strategies',
                 'caching','idempotency','content-pipeline','notifications'];
  const EIGHT = ['content-pipeline','signing','authz','aws-hardening','notifications','eav','desired-state','iac'];
  console.log('topic'.padEnd(22),'src'.padEnd(5),'.stg  maxChipPx  chipOverflowsCard  jumps(data-goto)         jumpLabelChars');
  for (const id of probe) {
    await pg.evaluate(i => TopicRegistry.setTopic(i), id);
    await pg.waitForFunction(i => {
      const sys = TopicRegistry.get(i).data.sys || {};
      const sr = document.querySelector('deep-system-map').shadowRoot;
      const pqs = [...sr.querySelectorAll('.pq')].map(e => e.innerHTML);
      const want = (sys.pivots||[]).map(p => p.q);
      return pqs.length === want.length && pqs.every((v,k) => v === want[k]);
    }, id, { timeout: 4000 }).catch(()=>console.log('   (wait timed out for '+id+')'));
    const r = await pg.evaluate(() => {
      const sr = document.querySelector('deep-system-map').shadowRoot;
      const chips = [...sr.querySelectorAll('.chip')];
      return { stg: sr.querySelectorAll('.stg').length,
        maxChipPx: chips.length?Math.max(...chips.map(c=>Math.round(c.scrollWidth))):0,
        over: chips.filter(c => { const card = c.closest('.piv'); return card && c.scrollWidth > card.clientWidth; }).length,
        jumps: [...sr.querySelectorAll('.piv-jump')].map(j=>j.getAttribute('data-goto')),
        lbl: Math.max(0,...[...sr.querySelectorAll('.piv-jump')].map(j=>j.textContent.trim().length)) };
    });
    console.log(id.padEnd(22), (EIGHT.includes(id)?'HAND':'md').padEnd(5),
      String(r.stg).padStart(4), String(r.maxChipPx+'px').padStart(10), String(r.over).padStart(18),
      '  ' + (r.jumps.join(',')||'-').padEnd(24), String(r.lbl).padStart(6));
  }
  await b.close();
})();
