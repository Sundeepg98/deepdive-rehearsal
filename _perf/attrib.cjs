/* ============================================================================
 * D3-perf ATTRIBUTION instrument  (wall-clock band, 4x CPU throttle)
 * ----------------------------------------------------------------------------
 * Answers, on a CALM box, on the base build:
 *   1. drill first-activation  -- is the 218/276/326ms audit band even
 *      reproducible calm? and is the cost SCRIPT (drawCard) or reveal LAYOUT?
 *   2. five P2 panes first-visit (trade/model/wb/num/sys)
 *   3. topic-open variance (180-332ms tail)
 *
 * METHOD (the perf track's own law):
 *   - repo Chromium (playwright 1.61), file:// the built 11.7MB deliverable
 *   - CDP Emulation.setCPUThrottlingRate, VERIFIED each cycle by a calibration
 *     spin (a fixed busy loop; its 4x/1x ratio must be ~4, and its absolute 4x
 *     time is the per-cycle LOAD covariate -- inflated spin == a loaded box).
 *   - FIRST-VISIT semantics: each pane's first activation is measured in its
 *     OWN fresh reload (target is the 2nd pane of the session, after walk), so
 *     no warm layout leaks between samples.
 *   - metric: in-page wall-clock. t0 just before a SYNTHETIC click through the
 *     real onclick->goView->navigate->switchTab path (all synchronous, verified
 *     in router.js emit() + view-transitions.js run()); then rAF for the first
 *     painted frame. `sync` = JS+forced-layout in the click task; `toPaint` =
 *     input->first paint (what the user feels); their split tells forced-vs-
 *     natural layout.
 *   - NEVER the longtask API (it drops big throttled tasks at 4x -- track erratum).
 *
 * Usage:  node _perf/attrib.cjs [--samples N] [--html PATH] [--throttle R] [--tag LABEL]
 * ==========================================================================*/
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const boot = require('../test/_boot.cjs');

function argv(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const SAMPLES = Number(argv('samples', 6));
const THROTTLE = Number(argv('throttle', 4));
const HTML = path.resolve(argv('html', path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html')));
const TAG = argv('tag', 'base');
const OUT = path.join(__dirname, 'results');
fs.mkdirSync(OUT, { recursive: true });

/* the audit's slow set (drill separate P1; trade/model/wb/num/sys the P2 five);
   walk = fast-half control. Override with --panes drill,trade,... */
const PANES = argv('panes', 'drill,trade,model,wb,num,sys,walk').split(',');

function stats(xs) {
  if (!xs.length) return { n: 0 };
  const s = xs.slice().sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { n: xs.length, min: s[0], p50: q(0.5), p90: q(0.9), max: s[s.length - 1], mean: +mean.toFixed(1) };
}

/* in-page probe: install once per page. Measures a pane switch by synthetic
   click through the real handler, bracketed t0->click-return->rAF(paint). */
const PROBE = () => {
  window.__perf = {
    // fixed busy loop; caller times it at 1x and 4x. Longer than a frame so the
    // 4x reading is stable; JIT is warmed by the caller before it's trusted.
    spin() {
      const t0 = performance.now();
      let x = 0;
      for (let i = 0; i < 2e7; i++) { x += Math.sqrt(i + 1) * 1.0000001; }
      return { ms: performance.now() - t0, x };
    },
    tabs() {
      return Array.prototype.map.call(document.querySelectorAll('.seg button'), (b) => b.getAttribute('data-tab'));
    },
    onTab(t) { const el = document.getElementById(t); return !!el && el.classList.contains('on'); },
    switchPane(tab) {
      return new Promise((resolve) => {
        const btn = document.querySelector('.seg button[data-tab="' + tab + '"]');
        if (!btn) return resolve({ err: 'no-btn:' + tab });
        const already = this.onTab(tab);
        void document.body.offsetHeight;             // flush pending layout so we measure only the switch
        const t0 = performance.now();
        btn.click();                                 // synchronous switch task
        const tSync = performance.now();
        requestAnimationFrame(() => {
          const tF1 = performance.now();
          requestAnimationFrame(() => {
            const tF2 = performance.now();
            resolve({
              tab, already,
              sync: +(tSync - t0).toFixed(1),
              toPaint: +(tF1 - t0).toFixed(1),
              toF2: +(tF2 - t0).toFixed(1),
            });
          });
        });
      });
    },
    switchTopic(id) {
      return new Promise((resolve) => {
        void document.body.offsetHeight;
        const t0 = performance.now();
        const ok = window.TopicRegistry && TopicRegistry.setTopic(id);
        const tSync = performance.now();
        requestAnimationFrame(() => {
          const tF1 = performance.now();
          requestAnimationFrame(() => {
            resolve({ id, ok, sync: +(tSync - t0).toFixed(1), toPaint: +(tF1 - t0).toFixed(1) });
          });
        });
      });
    },
    topicIds() { return window.TopicRegistry ? TopicRegistry.ids() : []; },
  };
};

async function newThrottledPage(browser) {
  const page = await browser.newPage();
  const client = await page.context().newCDPSession(page);
  return { page, client };
}

async function calibrate(page, client) {
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  // WARM the JIT first (2 discarded) -- else the cold base vs hot throttled read
  // manufactures a ratio < 1 (seen in the smoke run: 9ms "4x" spins).
  await page.evaluate(() => window.__perf.spin());
  await page.evaluate(() => window.__perf.spin());
  const base = (await page.evaluate(() => window.__perf.spin())).ms;
  await client.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  const thr = (await page.evaluate(() => window.__perf.spin())).ms;
  return { base: +base.toFixed(1), thr: +thr.toFixed(1), ratio: +(thr / base).toFixed(2) };
}

async function run() {
  const browser = await chromium.launch(boot.launchOpts());
  const result = { tag: TAG, html: HTML, throttle: THROTTLE, samples: SAMPLES, when: new Date().toISOString(), panes: {}, topicOpen: [], calib: [] };

  // ---- pane first-activation: each pane in its OWN fresh reload ----
  for (const pane of PANES) {
    const rows = [];
    for (let s = 0; s < SAMPLES; s++) {
      const { page, client } = await newThrottledPage(browser);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await boot.gotoApp(page, HTML);
      await page.evaluate(PROBE);
      await boot.enterApp(page);        // lands on walk (1st pane of session)
      await boot.settle(page);
      const cal = await calibrate(page, client); // sets throttle to THROTTLE, records load
      // measure THIS pane's first activation (2nd pane of the session)
      const m = await page.evaluate((t) => window.__perf.switchPane(t), pane);
      m.spin4x = cal.thr; m.ratio = cal.ratio;
      rows.push(m);
      result.calib.push(cal);
      await page.close();
    }
    result.panes[pane] = rows;
  }

  // ---- topic-open variance: cycle across a size-spread of topics in one load ----
  {
    const { page, client } = await newThrottledPage(browser);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await boot.gotoApp(page, HTML);
    await page.evaluate(PROBE);
    await boot.enterApp(page);
    await boot.settle(page);
    const ids = await page.evaluate(() => window.__perf.topicIds());
    const cal = await calibrate(page, client);
    // walk a spread: first ~12 ids, then re-visit to expose variance
    const walkIds = ids.slice(0, Math.min(12, ids.length));
    for (let pass = 0; pass < 2; pass++) {
      for (const id of walkIds) {
        // ensure we're on walk so the topic switch renders the visible walk pane
        await page.evaluate(() => window.__perf.switchPane('walk'));
        await boot.settle(page);
        const m = await page.evaluate((i) => window.__perf.switchTopic(i), id);
        m.spin4x = cal.thr; m.pass = pass;
        result.topicOpen.push(m);
      }
    }
    await page.close();
  }

  await browser.close();

  // ---- summarize ----
  const outfile = path.join(OUT, 'attrib-' + TAG + '.json');
  fs.writeFileSync(outfile, JSON.stringify(result, null, 2));

  console.log('\n=== D3 ATTRIBUTION  tag=' + TAG + '  throttle=' + THROTTLE + 'x  samples=' + SAMPLES + ' ===');
  console.log('calib: 1x spin ~' + stats(result.calib.map(c => c.base)).p50 + 'ms  ' + THROTTLE + 'x spin band ' +
    stats(result.calib.map(c => c.thr)).min + '-' + stats(result.calib.map(c => c.thr)).max +
    'ms (p50 ' + stats(result.calib.map(c => c.thr)).p50 + ')  ratio p50 ' + stats(result.calib.map(c => c.ratio)).p50);
  // CALM cutoff: a cycle is "calm" if its 4x spin is within 1.25x of the
  // theoretical (4 x median warm 1x base). Inflated spin == a loaded box, and
  // this track's whole deflation history is load-inflated absolutes.
  const base50 = stats(result.calib.map(c => c.base)).p50;
  const CALM = base50 * THROTTLE * 1.25;
  result.calmCutoffMs = +CALM.toFixed(1);
  const calm = (r) => r.spin4x <= CALM;

  console.log('\nCALM cutoff: spin4x <= ' + CALM.toFixed(0) + 'ms  (' + THROTTLE + 'x * ' + base50 + 'ms base * 1.25)');
  console.log('\nPANE first-activation input->paint ms   [ALL cycles]   ||   [CALM cycles only]');
  console.log('pane   n  min  p50  p90  max  mean  syncP50 || nC min p50 max  syncP50');
  for (const pane of PANES) {
    const rows = result.panes[pane].filter(r => !r.err);
    const cr = rows.filter(calm);
    const tp = stats(rows.map(r => r.toPaint)), sy = stats(rows.map(r => r.sync));
    const ctp = stats(cr.map(r => r.toPaint)), csy = stats(cr.map(r => r.sync));
    console.log(
      pane.padEnd(6),
      String(tp.n).padStart(2), String(tp.min).padStart(5), String(tp.p50).padStart(5),
      String(tp.p90).padStart(5), String(tp.max).padStart(5), String(tp.mean).padStart(6), String(sy.p50).padStart(7),
      ' ||', String(ctp.n || 0).padStart(2), String(ctp.min || '-').padStart(5),
      String(ctp.p50 || '-').padStart(5), String(ctp.max || '-').padStart(5), String(csy.p50 || '-').padStart(7));
  }
  const to = result.topicOpen.filter(r => r.ok);
  const tos = stats(to.map(r => r.toPaint));
  console.log('\nTOPIC-OPEN (input->paint ms) n=' + tos.n + ':  min ' + tos.min + '  p50 ' + tos.p50 + '  p90 ' + tos.p90 + '  max ' + tos.max + '  mean ' + tos.mean);
  console.log('  sync p50 ' + stats(to.map(r => r.sync)).p50 + 'ms');
  console.log('\nwrote ' + outfile);
}

run().catch((e) => { console.error(e); process.exit(1); });
