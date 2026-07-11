// prove_visible.cjs -- the recovered content, as a READER sees it.
//
// Data reaching the module is necessary, not sufficient. This drives the real panes in the real
// Shadow DOM of the shipped deliverable and reads back the TEXT a person would see. Run it against
// the OLD build and the NEW one; the diff is the point.
//   node _audit/.../prove_visible.cjs <html>
const path = require('path');
const { chromium } = require('playwright');
const HTML = path.resolve(process.argv[2] || 'deepdive_content_pipeline_rehearsal.html');
const TOPIC = process.argv[3] || 'idempotency';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message)));
  await page.goto('file://' + HTML);
  await page.waitForTimeout(300);

  const r = await page.evaluate((id) => {
    const t = TopicRegistry.get(id);
    const mount = (tag, data) => { const el = document.createElement(tag); document.body.appendChild(el); el.renderTopic(data); return el; };
    const out = {};

    // ---- System pane: the "where it sits" chain + the pivot disclosure bodies ----
    const sys = mount('deep-system-map', t.data.sys);
    const sr = sys.shadowRoot;
    out.sysStagesRendered = sr.querySelectorAll('.stg').length;
    out.sysStageText = [...sr.querySelectorAll('.stg')].map((s) => s.textContent.trim().slice(0, 34));
    const pivs = [...sr.querySelectorAll('.piv')];
    out.pivotCount = pivs.length;
    out.pivotBodiesEmpty = pivs.filter((p) => !(p.querySelector('.pa') || {}).textContent || !p.querySelector('.pa').textContent.trim()).length;
    out.pivotBody0 = ((pivs[0] || {}).querySelector ? (pivs[0].querySelector('.pa') || {}).textContent || '' : '').trim().slice(0, 70);
    out.chip0 = ((pivs[0] || {}).querySelector ? (pivs[0].querySelector('.chip') || {}).textContent || '' : '').trim();
    sys.remove();

    // ---- Drill landing: the tier notes ----
    const dr = mount('deep-drill', t.data.drill);
    const drRoot = dr.shadowRoot;
    const tn = drRoot.querySelector('#tiernote') || drRoot.querySelector('.tiernote');
    out.tierNoteText = tn ? tn.textContent.trim().slice(0, 60) : '(no #tiernote node)';
    out.tierNoteKeys = Object.keys(t.data.drill.tierNotes || {});
    dr.remove();

    // ---- Walk step 4: does the SECOND code block render? ----
    const wk = mount('deep-walkthrough', t.data.walk);
    const wkRoot = wk.shadowRoot;
    const steps = t.data.walk.steps;
    const multi = steps.findIndex((s) => (s.blocks || []).length);
    out.walkMultiBlockStep = multi;
    if (multi >= 0) { wk._wi = multi; wk._renderW(); }
    out.walkCodeBlocksRendered = wkRoot.querySelectorAll('pre.code').length;
    out.walkCapsRendered = wkRoot.querySelectorAll('.codecap').length;
    wk.remove();

    // ---- Bank data as the mock run reads it ----
    const b = t.data.bank;
    out.curveTheme = (b.curveballs[0] || {}).theme;
    out.beat0Keys = Object.keys(b.mockBeats[0] || {});
    out.beat0Model = ((b.mockBeats[0] || {}).model || '(none)').slice(0, 60);
    out.beat0Int = ((b.mockBeats[0] || {}).int || {}).q || '(none)';
    out.beat0TaskLen = ((b.mockBeats[0] || {}).task || '').length;
    return out;
  }, TOPIC);

  console.log('RENDERED CONTENT -- topic "' + TOPIC + '" in ' + path.basename(HTML) + '\n');
  console.log('  System pane');
  console.log('    stages rendered in the chain : ' + r.sysStagesRendered + (r.sysStagesRendered ? '   ' + JSON.stringify(r.sysStageText.slice(0, 3)) : '   <<<< THE MAP IS EMPTY'));
  console.log('    pivots                       : ' + r.pivotCount);
  console.log('    pivot bodies rendering BLANK : ' + r.pivotBodiesEmpty + ' of ' + r.pivotCount + (r.pivotBodiesEmpty ? '   <<<< BLANK' : ''));
  console.log('    pivot[0] chip                : ' + JSON.stringify(r.chip0));
  console.log('    pivot[0] answer body         : ' + JSON.stringify(r.pivotBody0));
  console.log('  Drill pane');
  console.log('    tier notes in data           : ' + JSON.stringify(r.tierNoteKeys));
  console.log('    #tiernote renders            : ' + JSON.stringify(r.tierNoteText));
  console.log('  Walk pane');
  console.log('    step with >1 code block      : ' + (r.walkMultiBlockStep >= 0 ? 'step ' + (r.walkMultiBlockStep + 1) : 'none'));
  console.log('    <pre class="code"> rendered  : ' + r.walkCodeBlocksRendered);
  console.log('    .codecap captions rendered   : ' + r.walkCapsRendered);
  console.log('  Bank / mock run');
  console.log('    curveball[0].theme           : ' + JSON.stringify(r.curveTheme));
  console.log('    mockBeats[0] keys            : ' + JSON.stringify(r.beat0Keys));
  console.log('    mockBeats[0].task length     : ' + r.beat0TaskLen + ' chars');
  console.log('    mockBeats[0].model           : ' + JSON.stringify(r.beat0Model));
  console.log('    mockBeats[0].int.q           : ' + JSON.stringify(r.beat0Int));
  console.log('\n  page errors: ' + errs.length + (errs.length ? '  ' + errs.join('; ') : ''));
  await browser.close();
})();
