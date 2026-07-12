const { chromium } = require('playwright');
const B = require('../../test/_boot.cjs');
(async () => {
  const b = await chromium.launch(B.launchOpts());
  const pg = await b.newPage();
  await B.gotoApp(pg, 'deepdive_content_pipeline_rehearsal.html');
  const blocked = await pg.evaluate(() => !!document.querySelector('.ix-ov.open'));
  console.log('  landing overlay open at boot (its backdrop eats trusted clicks): ' + blocked);
  for (const [open, close] of [['#mockopen','#mockx'], ['#mixopen','#mixx'], ['#sessopen','#sessx']]) {
    const t = Date.now();
    try { await pg.click(open, { timeout: 4000 }); console.log(`  click ${open}: LANDED in ${Date.now()-t}ms`); await pg.click(close, {timeout:4000}); }
    catch (e) { console.log(`  click ${open}: *** TIMED OUT after ${Date.now()-t}ms -- silently swallowed by catch(e){} ***`); }
  }
  await b.close();
})();
