// End-to-end smoke of the visual pipeline promise:
//   markdown ## Visual -> TOPIC_KI_VISUAL -> conditional tab -> mounted kit.
// Run: CHROME=<path> PLAYWRIGHT_BROWSERS_PATH=<dir> node test/visual_pane_smoke.mjs [file]
import { chromium } from 'playwright';
const FILE = process.argv[2] || process.cwd() + '/dist/index.html';
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 110)));
// Chrome evicts the oldest WebGL context past ~16 live ones. Match ONLY that
// message: the GL driver also emits unrelated "Performance" warnings.
const ctxWarn = [];
p.on('console', (m) => { if (/too many active webgl contexts/i.test(m.text())) ctxWarn.push(m.text().slice(0, 90)); });
// Count every WebGL context the page creates, and how many are still LIVE.
// Idempotent: re-getting an existing context must not inflate the count.
await p.addInitScript(() => {
  window.__GL = { created: 0, ctxs: [] };
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const c = orig.call(this, type, attrs);
    if (c && String(type).indexOf('webgl') === 0 && window.__GL.ctxs.indexOf(c) === -1) {
      window.__GL.created += 1; window.__GL.ctxs.push(c);
    }
    return c;
  };
});
let fails = 0;
const chk = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok ? '' : ' -- ' + d)); if (!ok) fails++; };

/* ---- the pixel probe -------------------------------------------------------
   Read the GL drawing buffer directly, inside a rAF registered AFTER the kit's
   own loop rAF (so the frame it just drew is still intact; compositing happens
   after all rAF callbacks, which is why preserveDrawingBuffer:false is fine).
   Playwright's ELEMENT screenshot cannot see this WebGL layer at all -- it
   returns a fully transparent image in every browser config tested, headed
   included -- so a screenshot-based assertion here would be measuring nothing. */
const PROBE = () => new Promise((res) => requestAnimationFrame(() => {
  const dv = document.querySelector('deep-visual');
  const c = dv && dv.shadowRoot ? dv.shadowRoot.querySelector('canvas') : null;
  if (!c) return res({ err: 'no canvas' });
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  const w = c.width, h = c.height;                       // the DRAWING BUFFER, not CSS
  const r = c.getBoundingClientRect();
  const base = { bufW: w, bufH: h, cssW: Math.round(r.width), cssH: Math.round(r.height),
    fits: Math.round(r.right) <= document.documentElement.clientWidth + 1,
    live: window.__GL.ctxs.filter((x) => { try { return !x.isContextLost(); } catch (e) { return false; } }).length,
    created: window.__GL.created };
  if (!gl || !w || !h) return res({ ...base, ink: 0, inkPct: 0, changed: 0 });
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let ink = 0;                                            // clear colour is #0d1117
  for (let i = 0; i < buf.length; i += 4) {
    if (Math.abs(buf[i] - 13) + Math.abs(buf[i + 1] - 17) + Math.abs(buf[i + 2] - 23) > 24) ink += 1;
  }
  let changed = 0;
  const prev = window.__prevFrame;
  if (prev && prev.length === buf.length) {
    for (let i = 0; i < buf.length; i += 4) {
      if (Math.abs(buf[i] - prev[i]) + Math.abs(buf[i + 1] - prev[i + 1]) + Math.abs(buf[i + 2] - prev[i + 2]) > 12) changed += 1;
    }
  }
  window.__prevFrame = buf;
  res({ ...base, ink, inkPct: +(100 * ink / (w * h)).toFixed(2), changed });
}));

await p.goto('file://' + FILE, { waitUntil: 'load' });
await p.waitForTimeout(2200);
const boot = await p.evaluate(() => {
  const vz = document.querySelector('button[data-tab="viz"]');
  const leaks = [...document.querySelectorAll('[hidden]')].filter((e) => e.offsetWidth > 0)
    .map((e) => (e.id || e.className || e.tagName).toString().slice(0, 24));
  return { vizW: vz.offsetWidth, vizDisp: getComputedStyle(vz).display,
    ixOpen: !!document.querySelector('.ix-ov.open'), home: !!document.getElementById('homeBtn'), leaks };
});
chk('viz tab INVISIBLE (computed) on a topic without a visual', boot.vizW === 0 && boot.vizDisp === 'none', JSON.stringify(boot));
chk('FIRST-RUN boot opens the start screen (index overlay)', boot.ixOpen === true, 'ixOpen=' + boot.ixOpen);
chk('every [hidden] element is actually invisible (page invariant)', boot.leaks.length === 0, boot.leaks.join(','));
chk('Home button present in the chrome', boot.home === true, 'homeBtn missing');
const homeFlow = await p.evaluate(async () => {
  const x0 = document.querySelector('.ix-x'); if (x0) x0.click();          // close the first-run screen
  await new Promise((r) => setTimeout(r, 350));
  const closedFirst = !document.querySelector('.ix-ov.open');
  document.getElementById('homeBtn').click();                               // Home reopens it on demand
  await new Promise((r) => setTimeout(r, 350));
  const opened = !!document.querySelector('.ix-ov.open');
  const x = document.querySelector('.ix-x'); if (x) x.click();
  await new Promise((r) => setTimeout(r, 350));
  return { closedFirst, opened, closed: !document.querySelector('.ix-ov.open') };
});
chk('start screen closable; Home reopens; close works', homeFlow.closedFirst && homeFlow.opened && homeFlow.closed, JSON.stringify(homeFlow));

await p.evaluate(() => document.querySelector('.tn-trigger').click());
await p.waitForTimeout(350);
await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals')).click());
await p.waitForTimeout(700);
const vzOn = await p.evaluate(() => document.querySelector('button[data-tab="viz"]').offsetWidth);
chk('viz tab APPEARS (computed) on Kafka Internals', vzOn > 0, 'w=' + vzOn);

await p.evaluate(() => window.goView('viz'));
await p.waitForTimeout(1400);
const s1 = await p.evaluate(() => window.__VIZ ? { f: window.__VIZ.frames(), q: window.__VIZ.queues().reduce((a, c) => a + c, 0), lag: window.__VIZ.sim.totalLag() } : null);
await p.waitForTimeout(1800);
const s2 = await p.evaluate(() => window.__VIZ ? { f: window.__VIZ.frames(), q: window.__VIZ.queues().reduce((a, c) => a + c, 0), lag: window.__VIZ.sim.totalLag() } : null);
chk('kit mounted from TOPIC config; frames advancing', !!s1 && !!s2 && s2.f > s1.f + 20, JSON.stringify([s1 && s1.f, s2 && s2.f]));
chk('sim live (lag grows at authored params 120 vs 90)', !!s2 && s2.lag > (s1 ? s1.lag : 0) + 20, s1 && s2 ? s1.lag.toFixed(0) + '->' + s2.lag.toFixed(0) : 'null');
chk('queue choreography live inside the app pane', !!s2 && s2.q > (s1 ? s1.q : 0) + 5, JSON.stringify([s1 && s1.q, s2 && s2.q]));

/* ===== DOES IT ACTUALLY DRAW? =================================================
   Everything above this line passed for months while the pane rendered NOTHING:
   the sim ticked, frames advanced and queues grew on a canvas whose drawing
   buffer was 0x0 and whose particle layer was frustum-culled. "Frames are
   advancing" is not "pixels are on screen". These four checks are the
   difference, and each one maps to a real bug that shipped:
     1. buffer size   -- the canvas was sized while the pane was still
                         display:none (the app defers the .pane.on swap into
                         startViewTransition), measured 0x0, and never resized
                         again. Now a ResizeObserver sizes it on first paint.
     2. ink           -- the canvas is not blank.
     3. motion        -- MEASURED: with the particle layer culled (but the canvas
                         correctly sized) only the lag bars creep, and the frame
                         changes ~1,100 px/s. With the particles drawn it changes
                         7,000-10,800 px/s. The 3,000 threshold sits between, so
                         this goes red if the InstancedMesh is ever frustum-culled
                         back into invisibility.
     4. GL contexts   -- one leaked per pane visit; Chrome hard-drops the oldest
                         past ~16, so the visual died permanently after ~17
                         opens. Contexts must not accumulate.
   Do not relax these to make a build green. A 0x0 canvas is a blank page. */
await p.evaluate(() => { window.__prevFrame = null; });
const d1 = await p.evaluate(PROBE);
await p.waitForTimeout(1000);
const d2 = await p.evaluate(PROBE);                     // diffs against d1's frame
chk('canvas has a NON-ZERO drawing buffer (0x0 = a blank pane)',
  d1.bufW > 200 && d1.bufH > 100 && d1.cssH > 100, JSON.stringify(d1));
chk('canvas actually PAINTS (non-background pixels present)',
  d2.inkPct > 1.5, 'inkPct=' + d2.inkPct);
chk('the sim is VISIBLY animating (particle layer drawn, not culled)',
  d2.changed > 3000, "changed=" + d2.changed + "px/s (culled+sized measures ~1100; drawn measures 7000-10000)");

for (let i = 0; i < 20; i++) {                          // the leak: it used to die at ~17
  await p.evaluate(() => window.goView('walk'));
  await p.waitForTimeout(130);
  await p.evaluate(() => window.goView('viz'));
  await p.waitForTimeout(230);
}
await p.waitForTimeout(800);
await p.evaluate(() => { window.__prevFrame = null; });
await p.evaluate(PROBE);
await p.waitForTimeout(1000);
const dL = await p.evaluate(PROBE);
chk('20 pane open/close cycles leak NO WebGL context', dL.live <= 2 && ctxWarn.length === 0,
  'live=' + dL.live + '/' + dL.created + ' created, ctxLossWarnings=' + ctxWarn.length);
chk('...and the visual still renders + animates after 20 cycles',
  dL.bufW > 200 && dL.inkPct > 1.5 && dL.changed > 3000, JSON.stringify(dL));

const storyBtn = await p.evaluate(() => {
  const host = document.querySelector('deep-visual');
  const btns = [...host.shadowRoot.querySelectorAll('button')].filter((b) => b.textContent.includes('Spike'));
  if (btns[0]) { btns[0].click(); return true; }
  return false;
});
await p.waitForTimeout(1200);
const cap = await p.evaluate(() => {
  const host = document.querySelector('deep-visual');
  const c = host.shadowRoot.querySelector('#caption');
  return c ? c.textContent : '';
});
chk('story from the MARKDOWN config runs with captions', storyBtn && cap.length > 10, JSON.stringify(cap.slice(0, 40)));

await p.evaluate(() => document.querySelector('.tn-trigger').click());
await p.waitForTimeout(300);
await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Event-Driven')).click());
await p.waitForTimeout(800);
const after = await p.evaluate(() => ({
  viz: !!window.__VIZ,
  hidden: document.querySelector('button[data-tab="viz"]').offsetWidth === 0,
  route: ((location.hash || '').replace('#', '').split('/')[1] || (location.hash || '').replace('#', '').split('/')[0]),
}));
chk('switching to a viz-less topic disposes the kit', after.viz === false, JSON.stringify(after));
chk('...hides the tab and bounces off the viz route', after.hidden === true && after.route !== 'viz', JSON.stringify(after));
chk('zero page errors across the whole flow', errs.length === 0, errs.slice(0, 3).join(' | '));

// ---- returning-user branch: progress exists now, a reload boots into the app
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(1800);
const back = await p.evaluate(() => ({ ixOpen: !!document.querySelector('.ix-ov.open'), topic: (location.hash || '').slice(1, 30) }));
chk('RETURNING boot lands in the app (progress saved, no overlay)', back.ixOpen === false, JSON.stringify(back));
// ---- mobile context: same guarantees at 390px --------------------------------
const m = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const merrs = []; m.on('pageerror', (e) => merrs.push(e.message.slice(0, 100)));
await m.addInitScript(() => {
  window.__GL = { created: 0, ctxs: [] };
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const c = orig.call(this, type, attrs);
    if (c && String(type).indexOf('webgl') === 0 && window.__GL.ctxs.indexOf(c) === -1) {
      window.__GL.created += 1; window.__GL.ctxs.push(c);
    }
    return c;
  };
});
await m.goto('file://' + FILE, { waitUntil: 'load' });
await m.waitForTimeout(2000);
const mb = await m.evaluate(() => ({
  ixOpen: !!document.querySelector('.ix-ov.open'),
  vizW: document.querySelector('button[data-tab="viz"]').offsetWidth,
  homeBox: (() => { const r = document.getElementById('homeBtn').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
  stepBox: (() => { const r = document.querySelector('.tn-step:not(.tn-home)').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
}));
chk('MOBILE first-run boot: start screen opens, no stray viz tab', mb.ixOpen === true && mb.vizW === 0, JSON.stringify(mb));
await m.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
await m.waitForTimeout(400);
const mClosed = await m.evaluate(() => !document.querySelector('.ix-ov.open'));
chk('MOBILE start screen closable (44px close)', mClosed, 'still open');
chk('MOBILE tap targets >= 44px (home + steppers)', mb.homeBox[0] >= 44 && mb.homeBox[1] >= 44 && mb.stepBox[0] >= 44 && mb.stepBox[1] >= 44, JSON.stringify(mb));

// the 0x0 canvas was worst on mobile: a 2px sliver that was purely its own borders
await m.evaluate(() => document.querySelector('.tn-trigger').click());
await m.waitForTimeout(350);
await m.evaluate(() => {
  const i = [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals'));
  if (i) i.click();
});
await m.waitForTimeout(800);
await m.evaluate(() => window.goView('viz'));
await m.waitForTimeout(1800);
await m.evaluate(() => { window.__prevFrame = null; });
await m.evaluate(PROBE);
await m.waitForTimeout(1000);
const mv = await m.evaluate(PROBE);
chk('MOBILE 390px: visual renders, animates, and fits the viewport',
  mv.bufW > 200 && mv.cssH > 80 && mv.inkPct > 1.5 && mv.changed > 3000 && mv.fits === true, JSON.stringify(mv));
const mOv = await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
chk('MOBILE 390px: the visual pane causes NO horizontal overflow', mOv === false, 'scrollWidth > clientWidth');

chk('MOBILE zero page errors', merrs.length === 0, merrs.join(' | '));
await m.close();

/* ===== IS THE VISUAL REACHABLE BY URL? ========================================
   viz was the ONE route that could not be deep-linked. deep-visual's renderTopic()
   also runs at FIRST PAINT, when the registry still holds the DEFAULT topic (no
   .visual) -- so its "bounce off a viz-less topic" fired and called goView('walk')
   -> pushState, overwriting the deep-linked hash BEFORE Router.init() ever parsed
   it. Measured: "#kafka-internals/viz" silently landed on "#content-pipeline/walk"
   with no canvas at all. Every other route deep-linked fine, so nothing caught it.
   The bounce now decides from the PENDING topic's data, not the stale current one. */
const dl = await b.newPage({ viewport: { width: 1280, height: 900 } });
const dlerrs = []; dl.on('pageerror', (e) => dlerrs.push(e.message.slice(0, 100)));
/* PROBE reads window.__GL, so this page needs the same context counter the others get. */
await dl.addInitScript(() => {
  window.__prevFrame = null;
  window.__GL = { created: 0, ctxs: [] };
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const c = orig.call(this, type, attrs);
    if (c && String(type).indexOf('webgl') === 0 && window.__GL.ctxs.indexOf(c) === -1) {
      window.__GL.created += 1; window.__GL.ctxs.push(c);
    }
    return c;
  };
});
await dl.goto('file://' + FILE + '#kafka-internals/viz', { waitUntil: 'load' });
await dl.waitForTimeout(2600);
await dl.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
await dl.waitForTimeout(1600);
const dlWhere = await dl.evaluate(() => ({
  hash: location.hash,
  topic: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null,
}));
await dl.evaluate(PROBE);
await dl.waitForTimeout(1000);
const dlPix = await dl.evaluate(PROBE);
chk('DEEP LINK "#<topic>/viz" lands on that topic, on viz',
  dlWhere.topic === 'kafka-internals' && dlWhere.hash.indexOf('viz') !== -1, JSON.stringify(dlWhere));
chk('DEEP LINK: the visual actually RENDERS on a cold boot (not just after clicking in)',
  dlPix.bufW > 200 && dlPix.inkPct > 1.5 && dlPix.changed > 3000, JSON.stringify(dlPix));
chk('DEEP LINK: zero page errors', dlerrs.length === 0, dlerrs.join(' | '));
await dl.close();

/* The bounce must still FIRE for a topic that genuinely has no visual -- and must
   leave the viz PANE off, not merely rewrite the hash. (switchTab('viz') and
   switchTab('walk') both defer their DOM swap into startViewTransition(); when they
   overlap the viz callback resolves LAST and wins, stranding the viz pane visibly on
   under a "/walk" hash. Landing the topic before bouncing means viz is never queued.) */
const bo = await b.newPage({ viewport: { width: 1280, height: 900 } });
await bo.goto('file://' + FILE + '#idempotency/viz', { waitUntil: 'load' });
await bo.waitForTimeout(2800);
const boS = await bo.evaluate(() => ({
  hash: location.hash,
  topic: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null,
  vizPaneOn: document.getElementById('viz').classList.contains('on'),
  vizTabHidden: document.querySelector('button[data-tab="viz"]').hidden,
}));
chk('BOUNCE still fires: "/viz" on a viz-LESS topic keeps the topic, drops the pane',
  boS.topic === 'idempotency' && boS.hash.indexOf('viz') === -1 && boS.vizPaneOn === false && boS.vizTabHidden === true,
  JSON.stringify(boS));
await bo.close();

await b.close();
console.log(fails === 0 ? 'VISUAL PIPELINE SMOKE: ALL PASS' : 'SMOKE: ' + fails + ' FAILURE(S)');
process.exit(fails ? 1 : 0);
