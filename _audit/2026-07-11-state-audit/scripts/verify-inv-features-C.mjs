/* Probe C: re-test EVERY keyboard-driven claim with the auto-opened Topic-index overlay DISMISSED. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-inv-features';
const b = await chromium.launch();

async function ready(vp = { width: 1440, height: 900 }, hash = '') {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto(URL + hash, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  // DISMISS the auto-opened index overlay -- otherwise it swallows all global keys
  await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()) window.IndexOverlay.close(); });
  await p.waitForTimeout(300);
  const stillOpen = await p.evaluate(() => !!(window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()));
  const anyModal = await p.evaluate(() => [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(d => d.classList.contains('open')));
  p.__errs = errs;
  if (stillOpen || anyModal) console.log('   !! WARNING: a modal is still open (keys will be suppressed)');
  return p;
}

/* ---------- 0. PROVE the overlay-swallows-keys confound ---------- */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(700);
  const bootState = await p.evaluate(() => ({
    indexOpen: !!(window.IndexOverlay && window.IndexOverlay.isOpen()),
    openModals: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(d => d.classList.contains('open')).map(d => d.id)
  }));
  await p.keyboard.press('d');
  await p.waitForTimeout(200);
  const dWhileOpen = await p.evaluate(() => document.documentElement.dataset.density || '(none)');
  await p.evaluate(() => window.IndexOverlay.close()); await p.waitForTimeout(250);
  await p.keyboard.press('d');
  await p.waitForTimeout(200);
  const dWhileClosed = await p.evaluate(() => document.documentElement.dataset.density || '(none)');
  console.log('=== BOOT CONFOUND (fresh browser) ===');
  console.log('  at boot:', JSON.stringify(bootState));
  console.log('  press `d` WITH index overlay open  -> data-density =', dWhileOpen);
  console.log('  press `d` AFTER closing it         -> data-density =', dWhileClosed);
  await p.screenshot({ path: SHOTS + '/C0-boot-index-overlay-open.png' });
  await ctx.close();
}

/* ---------- DENSITY (properly) ---------- */
{
  const p = await ready();
  const seq = [];
  for (let i = 0; i < 3; i++) { await p.keyboard.press('d'); await p.waitForTimeout(150); seq.push(await p.evaluate(() => document.documentElement.dataset.density || '(none)')); }
  const ui = await p.evaluate(() => {
    let n = 0; const walk = r => { r.querySelectorAll('button,select,input,a').forEach(e => { if (/density|spacing/i.test(e.textContent + ' ' + (e.getAttribute('aria-label') || '') + ' ' + e.id)) n++; }); r.querySelectorAll('*').forEach(e => e.shadowRoot && walk(e.shadowRoot)); };
    walk(document);
    return { controls: n, byId: !!document.querySelector('#densitytog,.density-btn,[data-density-control]'), storeKeys: Object.keys(localStorage).filter(k => /density/i.test(k)) };
  });
  // set compact then reload
  await p.evaluate(() => window.Density.set('compact')); await p.waitForTimeout(150);
  const before = await p.evaluate(() => document.documentElement.dataset.density);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
  const after = await p.evaluate(() => document.documentElement.dataset.density || '(none)');
  console.log('\n=== DENSITY (overlay closed) ===');
  console.log('  d,d,d cycles ->', JSON.stringify(seq));
  console.log('  UI controls found anywhere (incl shadow):', ui.controls, '| by known id:', ui.byId, '| store keys:', JSON.stringify(ui.storeKeys));
  console.log('  set compact ->', before, '| after reload ->', after, '| PERSISTS:', after === 'compact');
  await p.context().close();
}

/* ---------- FOCUS MODE via F ---------- */
{
  const p = await ready();
  const b4 = await p.evaluate(() => (document.getElementById('_focus-toggle') || {}).getAttribute?.('aria-pressed'));
  await p.keyboard.press('f'); await p.waitForTimeout(300);
  const af = await p.evaluate(() => ({
    pressed: (document.getElementById('_focus-toggle') || {}).getAttribute?.('aria-pressed'),
    htmlAttr: document.documentElement.getAttribute('data-focus'),
    bodyCls: document.body.className, htmlCls: document.documentElement.className
  }));
  console.log('\n=== FOCUS MODE (F key, overlay closed) ===');
  console.log('  aria-pressed before:', b4, '-> after:', af.pressed, '| html data-focus:', af.htmlAttr, '| body class:', JSON.stringify(af.bodyCls));
  await p.screenshot({ path: SHOTS + '/C1-focus-mode-on.png' });
  await p.context().close();
}

/* ---------- V KEY on a viz-less topic: real dead-end, or clean bounce? ---------- */
{
  const p = await ready();
  await p.evaluate(() => TopicRegistry.setTopic('caching'));
  await p.waitForTimeout(350);
  const pre = await p.evaluate(() => ({ hash: location.hash, tab: (document.querySelector('.seg button.on') || {}).getAttribute?.('data-tab') }));
  await p.keyboard.press('v');
  await p.waitForTimeout(60);          // IMMEDIATELY after
  const immediate = await p.evaluate(() => ({
    hash: location.hash,
    vizPaneOn: document.getElementById('viz').classList.contains('on'),
    activeTab: (document.querySelector('.seg button.on') || {}).getAttribute?.('data-tab') || '(NONE HIGHLIGHTED)',
    stageHead: (document.getElementById('stagehead') || {}).textContent,
    emptyShown: (() => { const sr = document.querySelector('deep-visual').shadowRoot; return !sr.getElementById('vzempty').hidden; })(),
    vizTabHidden: document.querySelector('.seg button[data-tab="viz"]').hidden
  }));
  await p.screenshot({ path: SHOTS + '/C2-vkey-caching-IMMEDIATE.png' });
  await p.waitForTimeout(1200);        // after any bounce would have run
  const settled = await p.evaluate(() => ({
    hash: location.hash,
    vizPaneOn: document.getElementById('viz').classList.contains('on'),
    activeTab: (document.querySelector('.seg button.on') || {}).getAttribute?.('data-tab') || '(NONE HIGHLIGHTED)',
    stageHead: (document.getElementById('stagehead') || {}).textContent
  }));
  console.log('\n=== V KEY on caching (no visual data), overlay closed ===');
  console.log('  before  :', JSON.stringify(pre));
  console.log('  +60ms   :', JSON.stringify(immediate));
  console.log('  +1.2s   :', JSON.stringify(settled));
  console.log('  >> STRANDED ON EMPTY VIZ PANE:', settled.vizPaneOn === true);
  await p.screenshot({ path: SHOTS + '/C3-vkey-caching-SETTLED.png' });
  await p.context().close();
}

/* ---------- V KEY on kafka-internals (the one that HAS it) ---------- */
{
  const p = await ready();
  await p.evaluate(() => TopicRegistry.setTopic('kafka-internals'));
  await p.waitForTimeout(400);
  await p.keyboard.press('v');
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-visual').shadowRoot;
    const c = sr.querySelector('canvas');
    return {
      hash: location.hash, vizPaneOn: document.getElementById('viz').classList.contains('on'),
      tabHidden: document.querySelector('.seg button[data-tab="viz"]').hidden,
      hasCanvas: !!c, canvasSize: c ? c.width + 'x' + c.height : null,
      glCtx: c ? (!!c.getContext ? 'canvas-present' : 'n/a') : null,
      vizLive: !!window.__VIZ
    };
  });
  console.log('\n=== V KEY on kafka-internals ===', JSON.stringify(r));
  console.log('  console errors:', p.__errs.length ? p.__errs : 'none');
  await p.screenshot({ path: SHOTS + '/C4-viz-kafka-works.png' });
  await p.context().close();
}

/* ---------- DRILL: what do 1 / 2 / 3 actually do? ---------- */
{
  const p = await ready();
  await p.evaluate(() => window.goView('drill')); await p.waitForTimeout(500);
  // reveal the answer so the judge row renders
  await p.evaluate(() => { const r = document.querySelector('#drill deep-drill').shadowRoot; const a = r.getElementById('adv'); if (a) a.click(); });
  await p.waitForTimeout(400);
  const labels = await p.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const g = id => { const e = r.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim() : '(absent)'; };
    return { jm: g('jm'), js: g('js'), jg: g('jg'), judgeRow: !!r.querySelector('.judge') };
  });
  console.log('\n=== DRILL judge buttons ===');
  console.log('  judge row rendered:', labels.judgeRow);
  console.log('  key [1] -> #jm =', JSON.stringify(labels.jm));
  console.log('  key [2] -> #js =', JSON.stringify(labels.js));
  console.log('  key [3] -> #jg =', JSON.stringify(labels.jg));
  await p.screenshot({ path: SHOTS + '/C5-drill-judge-row.png' });
  const s0 = await p.evaluate(() => document.querySelector('#drill deep-drill').getStats());
  await p.keyboard.press('1'); await p.waitForTimeout(400);
  const s1 = await p.evaluate(() => document.querySelector('#drill deep-drill').getStats());
  console.log('  BEFORE key 1: dGot(solid)=' + s0.dGot + ' dShk(revisit)=' + s0.dShk);
  console.log('  AFTER  key 1: dGot(solid)=' + s1.dGot + ' dShk(revisit)=' + s1.dShk + ' revisit=' + JSON.stringify(s1.revisit));
  console.log('  >> the ? overlay says 1 = "Solid". Reality: key 1 recorded',
    s1.dGot > s0.dGot ? 'SOLID (overlay correct)' : 'a REVISIT/MISS (overlay WRONG)');
  await p.context().close();
}

/* ---------- MOCK BLEED: render the session overlay on a different topic ---------- */
{
  const p = await ready();
  await p.evaluate(() => { window.print = () => {}; Store.set('mock.last', { score: 6, time: 361, runs: 1, int: 0 }); });
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(700);
  await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.isOpen()) window.IndexOverlay.close(); window.print = () => {}; });
  await p.evaluate(() => TopicRegistry.setTopic('multi-tenant')); await p.waitForTimeout(400);
  const clicked = await p.evaluate(() => {
    const walk = (root, re, out) => { root.querySelectorAll('button,a').forEach(b => { if (re.test(b.textContent)) out.push(b); }); root.querySelectorAll('*').forEach(e => e.shadowRoot && walk(e.shadowRoot, re, out)); return out; };
    const b = walk(document, /session progress/i, []); if (b.length) { b[0].click(); return b[0].textContent.trim(); }
    if (window.openSess) { window.openSess(); return '(openSess)'; }
    return null;
  });
  await p.waitForTimeout(600);
  const sess = await p.evaluate(() => {
    const ov = document.getElementById('sessov');
    let all = ov ? ov.textContent : '';
    const walk = r => { r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) { all += ' ' + e.shadowRoot.textContent; walk(e.shadowRoot); } }); };
    if (ov) walk(ov);
    all = all.replace(/\s+/g, ' ').trim();
    return { topic: TopicRegistry.current().id, drill: (all.match(/Probe Drill[^]{0,55}/i) || [''])[0], mock: (all.match(/Mock Run[^]{0,70}/i) || [''])[0] };
  });
  console.log('\n=== MOCK BLEED (mock scored globally, now viewing multi-tenant) ===');
  console.log('  opened via:', JSON.stringify(clicked), '| current topic:', sess.topic);
  console.log('  session card >', JSON.stringify(sess.drill));
  console.log('  session card >', JSON.stringify(sess.mock));
  // export code
  const code = await p.evaluate(() => {
    const walk = (root, re, out) => { root.querySelectorAll('button,a').forEach(b => { if (re.test(b.textContent)) out.push(b); }); root.querySelectorAll('*').forEach(e => e.shadowRoot && walk(e.shadowRoot, re, out)); return out; };
    const b = walk(document, /copy.*code|session code|export/i, []);
    return b.map(x => x.textContent.trim()).slice(0, 4);
  });
  console.log('  export buttons present:', JSON.stringify(code));
  await p.screenshot({ path: SHOTS + '/C6-mock-bleed-multitenant.png' });
  await p.context().close();
}

/* ---------- RAIL on a NON-sequential path ---------- */
{
  const p = await ready();
  const r0 = await p.evaluate(() => document.getElementById('rail').style.width);
  await p.evaluate(() => window.goView('trade')); await p.waitForTimeout(250);
  const r1 = await p.evaluate(() => ({ w: document.getElementById('rail').style.width, tab: (document.querySelector('.seg button.on') || {}).getAttribute?.('data-tab') }));
  await p.evaluate(() => window.goView('open')); await p.waitForTimeout(250);
  const r2 = await p.evaluate(() => document.getElementById('rail').style.width);
  await p.evaluate(() => window.goView('walk')); await p.waitForTimeout(250);
  const r3 = await p.evaluate(() => document.getElementById('rail').style.width);
  await p.evaluate(() => window.goView('rf')); await p.waitForTimeout(250);
  const r4 = await p.evaluate(() => document.getElementById('rail').style.width);
  console.log('\n=== RAIL on a NON-sequential path (fresh: walk) ===');
  console.log('  boot(walk)=' + r0 + '  -> trade=' + r1.w + ' (tab=' + r1.tab + ')  -> open=' + r2 + '  -> walk=' + r3 + '  -> rf=' + r4);
  console.log('  >> rail is STUCK at the last mapped view, not "always 100%"');
  await p.screenshot({ path: SHOTS + '/C7-rail-nonsequential.png' });
  await p.context().close();
}

/* ---------- copy-link: does it really copy location.href? ---------- */
{
  const p = await ready();
  await p.evaluate(() => TopicRegistry.setTopic('event-driven')); await p.waitForTimeout(350);
  const cl = await p.evaluate(async () => {
    let copied = null;
    try { navigator.clipboard.writeText = (t) => { copied = t; return Promise.resolve(); }; } catch (e) {}
    const walk = (root, re, out) => { root.querySelectorAll('button,a').forEach(b => { if (re.test(b.textContent + ' ' + (b.getAttribute('aria-label') || ''))) out.push(b); }); root.querySelectorAll('*').forEach(e => e.shadowRoot && walk(e.shadowRoot, re, out)); return out; };
    const btns = walk(document, /copy link/i, []);
    if (btns.length) btns[0].click();
    await new Promise(r => setTimeout(r, 300));
    return { btnFound: btns.length, copied, href: location.href };
  });
  console.log('\n=== COPY LINK button (on event-driven) ===');
  console.log('  button found:', cl.btnFound, '| copied text:', JSON.stringify(cl.copied && cl.copied.split(/[\\/]/).pop()));
  console.log('  location.href tail:', JSON.stringify(cl.href.split(/[\\/]/).pop()));
  await p.context().close();
}

await b.close();
