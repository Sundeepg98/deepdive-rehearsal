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
  const ids = await pg.evaluate(() => TopicRegistry.ids());
  const EIGHT = ['content-pipeline','signing','authz','aws-hardening','notifications','eav','desired-state','iac'];
  const rows = [];
  for (const id of ids) {
    // RELIABLE change signal: wait until the rendered pivot HTML equals THIS topic's expected pivot HTML
    await pg.evaluate((i) => TopicRegistry.setTopic(i), id);
    await pg.waitForFunction((i) => {
      const t = TopicRegistry.get(i); const sys = t.data.sys || {};
      const sr = document.querySelector('deep-system-map').shadowRoot;
      const pqs = [...sr.querySelectorAll('.pq')].map(e => e.innerHTML);
      const want = (sys.pivots||[]).map(p => p.q);
      return pqs.length === want.length && pqs.every((v,k) => v === want[k]);
    }, id, { timeout: 6000 }).catch(()=>{});
    const r = await pg.evaluate(() => {
      const sr = document.querySelector('deep-system-map').shadowRoot;
      const chips = [...sr.querySelectorAll('.chip')];
      const pivs  = [...sr.querySelectorAll('.piv')];
      return { stg: sr.querySelectorAll('.stg').length,
               jumps: [...sr.querySelectorAll('.piv-jump')].map(j => j.getAttribute('data-goto')),
               maxChipPx: chips.length ? Math.max(...chips.map(c=>Math.round(c.scrollWidth))) : 0,
               // a chip wider than the .piv card that clips it (overflow:hidden, system-map.js:38)
               chipsOverflowingCard: chips.filter(c => c.scrollWidth > (c.closest('.piv')||c).clientWidth).length,
               maxJumpLabel: Math.max(0, ...[...sr.querySelectorAll('.piv-jump')].map(j=>j.textContent.trim().length)) };
    });
    rows.push({ id, hand: EIGHT.includes(id), ...r });
  }
  const H = rows.filter(r=>r.hand), M = rows.filter(r=>!r.hand);
  const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
  console.log('=== GROUND TRUTH (reliable per-topic repaint wait), sys pane visible ===\n');
  console.log('              stages/topic   maxChipPx   chips overflowing their card   jump buttons   longest jump label');
  console.log('HAND 8   :', (sum(H,r=>r.stg)/H.length).toFixed(1).padStart(9),
              String(Math.max(...H.map(r=>r.maxChipPx))+'px').padStart(12),
              String(sum(H,r=>r.chipsOverflowingCard)).padStart(24),
              String(sum(H,r=>r.jumps.length)).padStart(14),
              String(Math.max(...H.map(r=>r.maxJumpLabel))+' ch').padStart(18));
  console.log('MD  38   :', (sum(M,r=>r.stg)/M.length).toFixed(1).padStart(9),
              String(Math.max(...M.map(r=>r.maxChipPx))+'px').padStart(12),
              String(sum(M,r=>r.chipsOverflowingCard)).padStart(24),
              String(sum(M,r=>r.jumps.length)).padStart(14),
              String(Math.max(...M.map(r=>r.maxJumpLabel))+' ch').padStart(18));
  console.log('\nmd jump buttons actually rendered:');
  M.filter(r=>r.jumps.length).forEach(r => console.log('   ', r.id, '->', r.jumps.join(',')));
  await b.close();
})();
