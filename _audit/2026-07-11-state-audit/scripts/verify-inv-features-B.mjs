/* Adversarial verification probe B: viz, routing/copy-link, mock bleed, density, shortcuts, tour, clock */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-inv-features';
const b = await chromium.launch();

async function fresh(vp = { width: 1440, height: 900 }, hash = '') {
  const ctx = await b.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto(URL + hash, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  p.__errs = errs;
  return p;
}

/* ================= 4b. SESSION REPORT via the REAL print button ================= */
{
  const p = await fresh();
  await p.evaluate(() => { window.print = () => {}; });          // stub the print dialog
  await p.evaluate(() => TopicRegistry.setTopic('kafka-internals'));
  await p.waitForTimeout(300);
  const found = await p.evaluate(() => {
    const sess = document.getElementById('sessov');
    if (window.openSess) window.openSess();
    else { const btn = [...document.querySelectorAll('button')].find(b => /session progress/i.test(b.textContent)); if (btn) btn.click(); }
    return !!sess;
  });
  await p.waitForTimeout(400);
  // find the "Save this session as a PDF" button (light DOM or shadow)
  const clicked = await p.evaluate(() => {
    function deepFind(re) {
      const out = [];
      const walk = (root) => {
        root.querySelectorAll('button,a').forEach(b => { if (re.test(b.textContent)) out.push(b); });
        root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
      };
      walk(document); return out;
    }
    const btns = deepFind(/pdf|save this session/i);
    if (btns.length) { btns[0].click(); return btns[0].textContent.trim(); }
    return null;
  });
  await p.waitForTimeout(400);
  const rep = await p.evaluate(() => {
    const r = document.getElementById('sessreport');
    return {
      ttl: r ? (r.querySelector('.sr-ttl') || {}).textContent : null,
      foot: r ? (r.querySelector('.sr-foot') || {}).textContent : null,
      reportTitleData: TopicRegistry.current().identity.reportTitle,
      h1: document.querySelector('.hdr h1').textContent
    };
  });
  console.log('=== SESSION REPORT (kafka-internals, via real PDF button) ===');
  console.log('sessov open:', found, '| clicked button:', JSON.stringify(clicked));
  console.log('h1                    :', JSON.stringify(rep.h1));
  console.log('identity.reportTitle  :', JSON.stringify(rep.reportTitleData));
  console.log('rendered .sr-ttl      :', JSON.stringify(rep.ttl));
  console.log('rendered .sr-foot     :', JSON.stringify((rep.foot || '').slice(0, 60)));
  await p.screenshot({ path: SHOTS + '/B1-sessreport-kafka.png' });
  await p.context().close();
}

/* ================= 5. VIZ: V key on a viz-less topic + deep link ================= */
{
  const p = await fresh();
  await p.evaluate(() => TopicRegistry.setTopic('caching'));
  await p.waitForTimeout(300);
  await p.keyboard.press('v');
  await p.waitForTimeout(500);
  const vres = await p.evaluate(() => {
    const pane = document.getElementById('viz');
    const el = document.querySelector('deep-visual');
    const sr = el && el.shadowRoot;
    return {
      hash: location.hash,
      vizPaneOn: pane ? pane.classList.contains('on') : null,
      emptyVisible: sr ? !sr.getElementById('vzempty').hidden : null,
      emptyText: sr ? sr.getElementById('vzempty').textContent : null,
      vizTabHidden: document.querySelector('.seg button[data-tab="viz"]').hidden,
      anyTabHighlighted: !!document.querySelector('.seg button.on'),
      activeTab: (document.querySelector('.seg button.on') || {}).getAttribute?.('data-tab') || null,
      stageHead: (document.getElementById('stagehead') || {}).textContent,
      topic: TopicRegistry.current().id
    };
  });
  console.log('\n=== VIZ: press V on caching (no visual data) ===');
  console.log(JSON.stringify(vres, null, 1));
  await p.screenshot({ path: SHOTS + '/B2-vkey-deadend-caching.png' });
  await p.context().close();
}
{ /* V on kafka-internals (the one topic that HAS it) */
  const p = await fresh();
  await p.evaluate(() => TopicRegistry.setTopic('kafka-internals'));
  await p.waitForTimeout(400);
  await p.keyboard.press('v');
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({
    hash: location.hash,
    tabHidden: document.querySelector('.seg button[data-tab="viz"]').hidden,
    hasCanvas: !!(document.querySelector('deep-visual') && document.querySelector('deep-visual').shadowRoot.querySelector('canvas')),
    vizLive: !!window.__VIZ
  }));
  console.log('\n=== VIZ on kafka-internals ===', JSON.stringify(r));
  await p.screenshot({ path: SHOTS + '/B3-viz-works-kafka.png' });
  console.log('errors:', p.__errs.length ? p.__errs : 'none');
  await p.context().close();
}
{ /* DEEP LINK #caching/viz on a FRESH page */
  const p = await fresh({ width: 1440, height: 900 }, '#caching/viz');
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({
    hash: location.hash,
    topic: TopicRegistry.current().id,
    h1: document.querySelector('.hdr h1').textContent
  }));
  console.log('\n=== DEEP LINK: opened file://...#caching/viz on a fresh page ===');
  console.log('  final hash :', JSON.stringify(r.hash));
  console.log('  final topic:', JSON.stringify(r.topic), '| h1:', JSON.stringify(r.h1));
  await p.screenshot({ path: SHOTS + '/B4-deeplink-caching-viz-lands-elsewhere.png' });
  await p.context().close();
}
{ /* control: deep link to a NON-viz view on the same topic */
  const p = await fresh({ width: 1440, height: 900 }, '#caching/num');
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => ({ hash: location.hash, topic: TopicRegistry.current().id, h1: document.querySelector('.hdr h1').textContent }));
  console.log('=== CONTROL deep link #caching/num ===', JSON.stringify(r));
  await p.context().close();
}

/* ================= 7. COPY LINK / bare-hash default-topic mismatch ================= */
{
  const p = await fresh();
  await p.evaluate(() => TopicRegistry.setTopic('event-driven'));
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({
    hash: location.hash, href: location.href.split('/').pop(),
    topic: TopicRegistry.current().id, h1: document.querySelector('.hdr h1').textContent,
    idsFirst: TopicRegistry.ids()[0]
  }));
  console.log('\n=== COPY LINK: on event-driven ===');
  console.log('  hash after switching to event-driven:', JSON.stringify(r.hash), '(ids()[0] =', r.idsFirst + ')');
  console.log('  h1:', JSON.stringify(r.h1));
  await p.context().close();
  /* now open that bare hash fresh */
  const p2 = await fresh({ width: 1440, height: 900 }, r.hash);
  await p2.waitForTimeout(700);
  const r2 = await p2.evaluate(() => ({ hash: location.hash, topic: TopicRegistry.current().id, h1: document.querySelector('.hdr h1').textContent }));
  console.log('  RE-OPENING that URL fresh ->', JSON.stringify(r2));
  await p2.screenshot({ path: SHOTS + '/B5-copylink-eventdriven-reopens-as-cp.png' });
  await p2.context().close();
}

/* ================= 6. MOCK BLEED across topics ================= */
{
  const p = await fresh();
  // score a mock on content-pipeline by driving the real overlay
  await p.evaluate(() => {
    // seed a mock result the way the app does, then persist
    if (typeof mockLastScore !== 'undefined') { }
  });
  const seeded = await p.evaluate(() => {
    try {
      Store.set('mock.last', { score: 6, time: 361, runs: 1, int: 0 });
      return Store.get('mock.last', null);
    } catch (e) { return 'ERR ' + e.message; }
  });
  console.log('\n=== MOCK BLEED ===');
  console.log('  seeded mock.last (global key, no topic id):', JSON.stringify(seeded));
  // reload so the module picks it up, then check the key list
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(700);
  await p.evaluate(() => { window.print = () => {}; });
  await p.evaluate(() => TopicRegistry.setTopic('multi-tenant'));
  await p.waitForTimeout(400);
  const keys = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('ddr.v1.')).sort());
  console.log('  ALL ddr.v1.* keys:', JSON.stringify(keys));
  // open session progress on multi-tenant and read the Mock card
  await p.evaluate(() => { if (window.openSess) window.openSess(); });
  await p.waitForTimeout(500);
  const sess = await p.evaluate(() => {
    function deepText(sel) {
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; } }
        const n = root.querySelector(sel); return n ? n.textContent : null;
      };
      return walk(document);
    }
    const ov = document.getElementById('sessov');
    const txt = ov ? ov.textContent.replace(/\s+/g, ' ') : '';
    // also grab shadow content
    let shadow = '';
    ov && ov.querySelectorAll('*').forEach(el => { if (el.shadowRoot) shadow += ' ' + el.shadowRoot.textContent.replace(/\s+/g, ' '); });
    return { topic: TopicRegistry.current().id, combined: (txt + shadow).replace(/\s+/g, ' ').trim().slice(0, 900) };
  });
  console.log('  topic now:', sess.topic);
  const m = sess.combined.match(/Mock Run[^]{0,90}/i);
  const d = sess.combined.match(/Probe Drill[^]{0,60}/i);
  console.log('  session overlay says -> ', d ? d[0] : '(no drill text)');
  console.log('  session overlay says -> ', m ? m[0] : '(no mock text)');
  await p.screenshot({ path: SHOTS + '/B6-mock-bleeds-multitenant.png' });
  await p.context().close();
}

/* ================= 11. DENSITY: no UI, not persisted ================= */
{
  const p = await fresh();
  await p.keyboard.press('d');
  await p.waitForTimeout(200);
  const after = await p.evaluate(() => ({
    density: document.documentElement.dataset.density || '(none)',
    anyControl: !!document.querySelector('#densitytog,.density-btn,[data-density-control],[data-density]'),
    anyLabelled: [...document.querySelectorAll('button,select,input')].filter(e => /density|spacing/i.test(e.textContent + ' ' + (e.getAttribute('aria-label') || ''))).length,
    storeKeys: Object.keys(localStorage).filter(k => /density/i.test(k))
  }));
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);
  const afterReload = await p.evaluate(() => document.documentElement.dataset.density || '(none)');
  console.log('\n=== DENSITY ===');
  console.log('  after pressing d :', JSON.stringify(after));
  console.log('  after reload     :', JSON.stringify(afterReload));
  await p.context().close();
}

/* ================= 9. SHORTCUTS liveness: V / F / Cmd+K / Cmd+P ================= */
{
  const p = await fresh();
  const before = await p.evaluate(() => ({ focus: document.body.classList.contains('focus-mode') || !!document.querySelector('.focus-mode,[data-focus="on"]') }));
  await p.keyboard.press('f');
  await p.waitForTimeout(300);
  const fRes = await p.evaluate(() => {
    const btn = document.getElementById('_focus-toggle');
    return { btnExists: !!btn, pressed: btn ? btn.getAttribute('aria-pressed') : null, htmlClasses: document.documentElement.className, bodyClasses: document.body.className };
  });
  console.log('\n=== SHORTCUTS ===');
  console.log('  F -> focus mode:', JSON.stringify(fRes));
  await p.keyboard.press('Control+k');
  await p.waitForTimeout(400);
  const kRes = await p.evaluate(() => ({ searchOpen: window.SearchOverlay && window.SearchOverlay.isOpen ? window.SearchOverlay.isOpen() : 'n/a' }));
  console.log('  Ctrl+K -> search open:', JSON.stringify(kRes));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // is Ctrl+P intercepted?
  const pIntercepted = await p.evaluate(() => {
    let prevented = false;
    const h = (e) => { if (e.defaultPrevented) prevented = true; };
    window.addEventListener('keydown', h, true);
    return new Promise(res => setTimeout(() => { window.removeEventListener('keydown', h, true); res(prevented); }, 50));
  });
  // check the keyboard overlay's documented set
  const doc = await p.evaluate(() => {
    if (window.openKeys) window.openKeys();
    const el = document.querySelector('deep-keyboard');
    const sr = el && el.shadowRoot;
    if (!sr) return null;
    const kbds = [...sr.querySelectorAll('kbd')].map(k => k.textContent.trim());
    const gradeRow = [...sr.querySelectorAll('.ks-row2')].map(r => r.textContent.replace(/\s+/g, ' ').trim()).filter(t => /score the probe/i.test(t));
    return { kbds: [...new Set(kbds)], gradeRow };
  });
  console.log('  keyboard overlay documents kbds:', JSON.stringify(doc && doc.kbds));
  console.log('  keyboard overlay grading row  :', JSON.stringify(doc && doc.gradeRow));
  await p.screenshot({ path: SHOTS + '/B7-keyboard-overlay-grading-row.png' });
  await p.context().close();
}

/* ================= drill grading: what does key `1` ACTUALLY record? ================= */
{
  const p = await fresh();
  await p.evaluate(() => window.goView('drill'));
  await p.waitForTimeout(500);
  const btns = await p.evaluate(() => {
    const dd = document.querySelector('#drill deep-drill'); const r = dd.shadowRoot;
    const adv = r.getElementById('adv'); if (adv) adv.click();
    return null;
  });
  await p.waitForTimeout(300);
  const labels = await p.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    return { jm: (r.getElementById('jm') || {}).textContent, js: (r.getElementById('js') || {}).textContent, jg: (r.getElementById('jg') || {}).textContent };
  });
  console.log('\n=== DRILL grade buttons (what 1/2/3 map to) ===');
  console.log('  key [1] -> #jm =', JSON.stringify((labels.jm || '').replace(/\s+/g, ' ').trim()));
  console.log('  key [2] -> #js =', JSON.stringify((labels.js || '').replace(/\s+/g, ' ').trim()));
  console.log('  key [3] -> #jg =', JSON.stringify((labels.jg || '').replace(/\s+/g, ' ').trim()));
  // press 1 and see what got recorded
  await p.keyboard.press('1');
  await p.waitForTimeout(300);
  const st = await p.evaluate(() => document.querySelector('#drill deep-drill').getStats());
  console.log('  after pressing `1`: dGot(solid)=' + st.dGot + '  dShk(revisit)=' + st.dShk + '  revisit=' + JSON.stringify(st.revisit));
  await p.context().close();
}

/* ================= 10. TOUR reachability at 390px ================= */
{
  const p = await fresh({ width: 390, height: 844 });
  const t = await p.evaluate(() => {
    const k = document.getElementById('keyopen');
    const cs = k ? getComputedStyle(k) : null;
    // any element anywhere (incl. shadow) that starts the tour by click?
    let tourBtns = 0;
    const walk = (root) => {
      root.querySelectorAll('button,a').forEach(b => { if (/tour/i.test(b.textContent + ' ' + (b.getAttribute('aria-label') || ''))) tourBtns++; });
      root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
    };
    walk(document);
    return {
      keyopenExists: !!k,
      keyopenClass: k ? k.className : null,
      keyopenDisplay: cs ? cs.display : null,
      keyopenVisible: k ? k.offsetParent !== null : null,
      tourButtonsAnywhere: tourBtns,
      tourGuideExists: !!window.TourGuide
    };
  });
  console.log('\n=== TOUR at 390px ===');
  console.log(JSON.stringify(t, null, 1));
  await p.screenshot({ path: SHOTS + '/B8-mobile-390-no-tour-entry.png' });
  await p.context().close();
}

/* ================= 13. MOCK CLOCK after "Round complete" ================= */
{
  const p = await fresh();
  await p.evaluate(() => { if (window.openMock) window.openMock(); });
  await p.waitForTimeout(600);
  // click through all beats to the end
  for (let i = 0; i < 14; i++) {
    const done = await p.evaluate(() => {
      const el = document.querySelector('deep-mock-run');
      const r = el && el.shadowRoot; if (!r) return 'no-shadow';
      if (r.querySelector('.mb-end')) return true;
      const rev = r.getElementById('mbrev'); if (rev && !rev.disabled) { rev.click(); return false; }
      const nx = r.getElementById('mbnext'); if (nx) { nx.click(); return false; }
      const ir = r.getElementById('mbirev'); if (ir && !ir.disabled) { ir.click(); return false; }
      return 'stuck';
    });
    await p.waitForTimeout(150);
    if (done === true) break;
  }
  const atEnd = await p.evaluate(() => {
    const r = document.querySelector('deep-mock-run').shadowRoot;
    return { ended: !!r.querySelector('.mb-end'), clock: document.getElementById('mockclock').textContent };
  });
  console.log('\n=== MOCK CLOCK ===');
  console.log('  reached "Round complete":', atEnd.ended, '| clock at end screen:', JSON.stringify(atEnd.clock));
  await p.waitForTimeout(3200);
  const later = await p.evaluate(() => ({ clock: document.getElementById('mockclock').textContent, stillEnded: !!document.querySelector('deep-mock-run').shadowRoot.querySelector('.mb-end') }));
  console.log('  3.2s later, still on end screen:', later.stillEnded, '| clock now:', JSON.stringify(later.clock));
  console.log('  CLOCK STILL TICKING AFTER END:', atEnd.clock !== later.clock);
  await p.screenshot({ path: SHOTS + '/B9-mock-clock-ticking-after-end.png' });
  await p.context().close();
}

await b.close();
