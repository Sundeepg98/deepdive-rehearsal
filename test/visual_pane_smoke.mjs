// End-to-end smoke of the visual pipeline promise:
//   markdown ## Visual -> TOPIC_KI_VISUAL -> conditional tab -> mounted kit.
// Run: CHROME=<path> PLAYWRIGHT_BROWSERS_PATH=<dir> node test/visual_pane_smoke.mjs [file]
import { chromium } from 'playwright';
import B from './_boot.cjs';
const FILE = process.argv[2] || process.cwd() + '/dist/index.html';

/* launchOpts() adds --disable-renderer-backgrounding and friends. THIS FILE IS WHY THEY EXIST.
   Chromium throttles rAF and timers in a tab that is backgrounded or occluded, and this check
   holds several pages open at once -- so all but one are occluded BY CONSTRUCTION. Every
   animation assertion below (frames advanced, pixels changed) measures rAF-driven progress, so a
   throttled tab makes a perfectly healthy visual look dead. That is a flake with a plausible
   cover story, which is the worst kind: it looks like a real regression. */
const b = await chromium.launch(B.launchOpts());
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
/* Remember WHICH assertions failed, not just how many. THE GATE reports a check by its LAST
   LINE, so "SMOKE: 1 FAILURE(S)" is all anyone ever sees -- a red with no cause, which reads as
   noise and gets re-run rather than diagnosed. The last line must name the thing that broke. */
const failed = [];
const chk = (n, ok, d) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok ? '' : ' -- ' + d));
  if (!ok) { fails++; failed.push(n + (d ? ' [' + String(d).slice(0, 90) + ']' : '')); }
};

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

/* A fresh 1-SECOND sampling window, re-taken until the visual proves it animates.
   The metric is px/SECOND: the comment above calibrates 3000 against a 1000ms window (culled
   measures ~1100, drawn measures 7000-10800), so the window is part of the metric and shrinking
   it would silently invalidate the threshold. Retry the WINDOW instead of widening it -- a
   window that lands in a scheduling stall under-counts, but a visual that is genuinely culled,
   blank, or dead NEVER crosses 3000 no matter how many windows you take. Broken still fails;
   slow just tries again. Returns the last sample either way, so chk() can print what it saw. */
const animWindow = async (pg, probe) => {
  await pg.evaluate(() => { window.__prevFrame = null; window.__genPrev = null; });
  await pg.evaluate(probe);            /* baseline frame */
  await pg.waitForTimeout(1000);       /* the METRIC's window, not a readiness guess */
  return pg.evaluate(probe);           /* diffs against the baseline */
};
const untilAnimating = async (pg, probe, capMs = B.ACT_MS) => {
  const t0 = Date.now();
  let s;
  do { s = await animWindow(pg, probe); } while (!(s.changed > 3000) && Date.now() - t0 < capMs);
  return s;
};

/* Open the topic nav and pick a topic BY WAITING FOR IT TO EXIST.
   The shape this replaces was: click the trigger, sleep 300-350ms, then
   [...querySelectorAll('.tn-item')].find(t).click(). If the list had not rendered inside that
   sleep, find() returns undefined and .click() throws a TypeError -- so a slow machine did not
   produce a failed assertion, it produced a HARNESS CRASH, reported to the gate as a stack trace
   with no bearing on the app. On a CI runner (~4x slower than this box) a 300ms bet on a
   46-topic list rendering is not a bet worth taking. Wait for the item, click it, then wait for
   the topic to ACTUALLY change -- the thing the next assertions read. */
const pickTopic = async (pg, label, expectId) => {
  await pg.evaluate(() => document.querySelector('.tn-trigger').click());
  await pg.waitForFunction(
    (t) => [...document.querySelectorAll('.tn-item')].some((e) => e.textContent.includes(t)),
    label, { timeout: B.ACT_MS });
  await pg.evaluate((t) => {
    const i = [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes(t));
    if (i) i.click();
  }, label);
  if (expectId) {
    await pg.waitForFunction(
      (id) => typeof TopicRegistry !== 'undefined' && TopicRegistry.current() && TopicRegistry.current().id === id,
      expectId, { timeout: B.ACT_MS }).catch(() => {});
  }
  await B.settle(pg);
};

await B.gotoApp(p, FILE);   /* explicit nav cap + wait for the app's OWN globals, not 2200ms */
/* THE ENTRY CONTRACT CHANGED, AND THIS IS THE NEW ONE.
   These assertions used to demand that a first-run boot OPENED A MODAL on itself (the index
   overlay as "start screen"). That was the bug, not the contract: a modal in front of first paint
   ate the user's first tap (measured -- a real trusted click at splash+87ms landed on the splash,
   and the overlay held pointer-events:auto over the whole viewport for 220ms after close), and it
   fired exactly ONCE PER BROWSER, EVER, because the app's own first-paint write to `viewseen.*`
   satisfied its `Store.keys('').length > 0` gate.
   The entry is now the #home ROUTE. So: a first-run boot must land on the home, with NOTHING modal
   in front of it, and the switcher must still be reachable on demand. Strictly stronger, and
   test/overlay_deadzone.cjs asserts the input side of it directly (and fails on the old build). */
await B.settle(p);
const boot = await p.evaluate(() => {
  const vz = document.querySelector('button[data-tab="viz"]');
  const leaks = [...document.querySelectorAll('[hidden]')].filter((e) => e.offsetWidth > 0)
    .map((e) => (e.id || e.className || e.tagName).toString().slice(0, 24));
  return { vizW: vz.offsetWidth, vizDisp: getComputedStyle(vz).display,
    ixOpen: !!document.querySelector('.ix-ov.open'),
    onHome: document.documentElement.dataset.view === 'home',
    cta: !!document.querySelector('#home .hm-cta'),
    rooms: document.querySelectorAll('#home .hm-room').length,
    home: !!document.getElementById('homeBtn'), leaks };
});
chk('viz tab INVISIBLE (computed) on a topic without a visual', boot.vizW === 0 && boot.vizDisp === 'none', JSON.stringify(boot));
chk('FIRST-RUN boot lands on the HOME route', boot.onHome === true, 'dataset.view=' + boot.onHome);
chk('FIRST-RUN boot opens NO modal in front of first paint', boot.ixOpen === false, 'an overlay opened itself');
chk('the home offers ONE primary action and the six rooms', boot.cta === true && boot.rooms === 6,
  'cta=' + boot.cta + ' rooms=' + boot.rooms);
chk('every [hidden] element is actually invisible (page invariant)', boot.leaks.length === 0, boot.leaks.join(','));
chk('Home button present in the chrome', boot.home === true, 'homeBtn missing');
const homeFlow = await p.evaluate(async () => {
  window.IndexOverlay.open();                                   // the switcher is reachable on demand
  await new Promise((r) => setTimeout(r, 350));
  const opened = !!document.querySelector('.ix-ov.open');
  const x = document.querySelector('.ix-x'); if (x) x.click();  // ...and closes from its own button
  await new Promise((r) => setTimeout(r, 350));
  const closed = !document.querySelector('.ix-ov.open');
  window.Router.navigate('walk');                               // leave the home for the topic UI
  await new Promise((r) => setTimeout(r, 250));
  const leftHome = document.documentElement.dataset.view !== 'home' &&
    getComputedStyle(document.querySelector('.app')).display !== 'none';
  return { opened, closed, leftHome };
});
chk('switcher opens on demand, closes, and the home hands off to the topic UI',
  homeFlow.opened && homeFlow.closed && homeFlow.leftHome, JSON.stringify(homeFlow));

await pickTopic(p, 'Kafka Internals', 'kafka-internals');
const vzOn = await p.evaluate(() => document.querySelector('button[data-tab="viz"]').offsetWidth);
chk('viz tab APPEARS (computed) on Kafka Internals', vzOn > 0, 'w=' + vzOn);

await p.evaluate(() => window.goView('viz'));
/* Wait for the kit to MOUNT, then poll until it has advanced -- instead of sleeping 1400ms,
   sampling, sleeping 1800ms and demanding that exactly those two naps contained 20 frames and
   20 units of lag. The assertions are unchanged (>20 frames, >20 lag); what changed is that a
   busy machine now takes longer to satisfy them rather than failing them. A kit that never
   mounts, or a sim that is frozen, still goes red -- it just takes the full cap to say so. */
const VS = () => (window.__VIZ ? { f: window.__VIZ.frames(), q: window.__VIZ.queues().reduce((a, c) => a + c, 0), lag: window.__VIZ.sim.totalLag() } : null);
await p.waitForFunction(() => !!window.__VIZ, null, { timeout: B.ACT_MS }).catch(() => {});
const s1 = await p.evaluate(VS);
/* OBSERVE IN-PAGE, AND RETURN THE VALUES FROM THE FRAME THAT SATISFIED THE CONDITION.
 *
 * The obvious rewrite -- waitForFunction(cond) then evaluate() to read the values back -- is
 * RACY, and measurably so: it failed 4 runs in 18 under load, and the instrumented failure is
 * unambiguous. The poll RETURNED in 1.8s (it did not time out), having genuinely observed
 * queue > 5; the follow-up read, one CDP round-trip later, came back 0.
 *
 * The queue is not monotonic. flow.js banks release credit and drains a lane's visual queue in
 * a burst, so "queue > 5" early in the run is a TRANSIENT, not a level. Between waitForFunction
 * seeing it and a second round-trip reading it, the queue empties -- and the check reports
 * [0,0], which looks exactly like a dead sim. A red that indicts the app for a harness bug is
 * the most expensive kind of flake there is.
 *
 * The fixed sleeps this replaced (1400ms, then 1800ms) dodged the race BY ACCIDENT: by 3.2s the
 * backlog is large and stable, so any sample lands well clear of the threshold. That is why
 * naively swapping them for "poll until the condition first holds" made the check WORSE -- it
 * moved the sample into the spikiest part of the run. A long sleep is not always laziness;
 * sometimes it is load-bearing, and replacing one without asking WHY it was long enough trades a
 * slow check for a flaky one. (Measured: original 0/12 failures, naive poll 4/18.)
 *
 * So: sample every frame INSIDE the page, require all three conditions in the SAME frame, and
 * return that frame's numbers. Nothing can drain between the observation and the assertion
 * because there is no longer a gap between them. A sim that never backs up still fails. */
const s2 = await p.evaluate((b0) => new Promise((res) => {
  const t0 = performance.now();
  const tick = () => {
    if (!window.__VIZ || !b0) return res(null);
    const f = window.__VIZ.frames();
    const lag = window.__VIZ.sim.totalLag();
    const q = window.__VIZ.queues().reduce((a, c) => a + c, 0);
    if (f > b0.f + 20 && lag > b0.lag + 20 && q > b0.q + 5) return res({ f, lag, q });
    if (performance.now() - t0 > 60000) return res({ f, lag, q, timedOut: true });
    requestAnimationFrame(tick);
  };
  tick();
}), s1);
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
const d2 = await untilAnimating(p, PROBE);              // re-takes the 1s window until it animates
chk('canvas has a NON-ZERO drawing buffer (0x0 = a blank pane)',
  d1.bufW > 200 && d1.bufH > 100 && d1.cssH > 100, JSON.stringify(d1));
chk('canvas actually PAINTS (non-background pixels present)',
  d2.inkPct > 1.5, 'inkPct=' + d2.inkPct);
chk('the sim is VISIBLY animating (particle layer drawn, not culled)',
  d2.changed > 3000, "changed=" + d2.changed + "px/s (culled+sized measures ~1100; drawn measures 7000-10000)");

/* These two sleeps are DELIBERATE and must stay. They are not a readiness gate -- they ARE the
   stimulus. Churning the pane fast enough to cycle WebGL contexts is the entire point of the leak
   test, and politely waiting for each mount to settle would defeat the experiment. The assertion
   that follows is race-free on its own (untilAnimating retries its own window), so the stress is
   free to stay stressful. Not every waitForTimeout is a bug; this one is the test. */
for (let i = 0; i < 20; i++) {                          // the leak: it used to die at ~17
  await p.evaluate(() => window.goView('walk'));
  await p.waitForTimeout(130);
  await p.evaluate(() => window.goView('viz'));
  await p.waitForTimeout(230);
}
await B.settle(p);
const dL = await untilAnimating(p, PROBE);             // same 1s window, retried, after the leak loop
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
/* The assertion below is that a caption APPEARS. Wait for exactly that rather than betting 1200ms
   on it; the wait expiring still lets chk() report the empty caption it actually found. */
await p.waitForFunction(() => {
  const h = document.querySelector('deep-visual');
  const c = h && h.shadowRoot ? h.shadowRoot.querySelector('#caption') : null;
  return !!c && c.textContent.trim().length > 10;
}, null, { timeout: B.ACT_MS }).catch(() => {});
const cap = await p.evaluate(() => {
  const host = document.querySelector('deep-visual');
  const c = host.shadowRoot.querySelector('#caption');
  return c ? c.textContent : '';
});
chk('story from the MARKDOWN config runs with captions', storyBtn && cap.length > 10, JSON.stringify(cap.slice(0, 40)));

await pickTopic(p, 'Event-Driven');
/* The assertion below is that the kit gets DISPOSED. Wait for exactly that, rather than sleeping
   800ms and hoping disposal beat the clock. It expiring still lets the assertion report viz=true. */
await p.waitForFunction(() => !window.__VIZ, null, { timeout: B.ACT_MS }).catch(() => {});
const after = await p.evaluate(() => ({
  viz: !!window.__VIZ,
  hidden: document.querySelector('button[data-tab="viz"]').offsetWidth === 0,
  route: ((location.hash || '').replace('#', '').split('/')[1] || (location.hash || '').replace('#', '').split('/')[0]),
}));
chk('switching to a viz-less topic disposes the kit', after.viz === false, JSON.stringify(after));
chk('...hides the tab and bounces off the viz route', after.hidden === true && after.route !== 'viz', JSON.stringify(after));
chk('zero page errors across the whole flow', errs.length === 0, errs.slice(0, 3).join(' | '));

// ---- returning-user branch: progress exists now, a reload boots into the app
await p.reload({ waitUntil: 'load', timeout: B.NAV_MS });
await p.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
/* This assertion is a NEGATIVE ("the overlay does NOT open"), and a negative that is read too
   early passes for free -- the failure mode is a green, which is the one this repo fears most.
   So give the overlay a real chance to appear and require that it does not take it. The wait
   EXPIRING is the healthy path; that is the whole point of it. */
await p.waitForFunction(() => !!document.querySelector('.ix-ov.open'), null, { timeout: 3000 }).catch(() => {});
const back = await p.evaluate(() => ({ ixOpen: !!document.querySelector('.ix-ov.open'), topic: (location.hash || '').slice(1, 30) }));
chk('RETURNING boot lands in the app (progress saved, no overlay)', back.ixOpen === false, JSON.stringify(back));
/* Close it. This page was held open for the entire run, which (a) leaked its WebGL contexts into
   the very budget the leak check below measures, and (b) forced every page opened after it to be
   an OCCLUDED tab -- where Chromium throttles the rAF loop that the animation assertions depend
   on. The launch flags now defend against that too, but not holding the page open is the fix. */
await p.close();
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
await B.gotoApp(m, FILE);        /* was: goto + a 2000ms guess that the app had booted */
/* MOBILE FIRST RUN, against the NEW entry contract (see the desktop block above). A phone used to
   get a modal announcing "46 TOPICS ACROSS 6 GROUPS" that rendered exactly ONE topic card in an
   82px scroller -- while "Reset all saved progress" sat fully visible beneath it. It now gets the
   home: a real page, with the whole viewport and one document scroll.
   The tap-target floor is measured on what a phone user ACTUALLY touches first -- the home's own
   primary CTA and its room cards. (The old check measured #homeBtn and .tn-step, which live inside
   .app and are topic chrome; on the home they are display:none and report [0,0], which is not a
   44px violation but an assertion pointed at the wrong screen.) */
await B.settle(m);
const mb = await m.evaluate(() => {
  const box = (el) => { if (!el) return [0, 0]; const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  return {
    ixOpen: !!document.querySelector('.ix-ov.open'),
    onHome: document.documentElement.dataset.view === 'home',
    vizW: document.querySelector('button[data-tab="viz"]').offsetWidth,
    ctaBox: box(document.querySelector('#home .hm-cta')),
    roomBox: box(document.querySelector('#home .hm-room')),
    actBox: box(document.querySelector('#home .hm-act')),
    cards: document.querySelectorAll('#home .ix-card').length,
  };
});
chk('MOBILE first-run boot: lands on the home, no modal, no stray viz tab',
  mb.onHome === true && mb.ixOpen === false && mb.vizW === 0, JSON.stringify(mb));
chk('MOBILE: the home reaches the WHOLE library (the modal showed 1 of 46)', mb.cards === 46, 'cards=' + mb.cards);
chk('MOBILE tap targets >= 44px (the home\'s CTA, room cards and header actions)',
  mb.ctaBox[1] >= 44 && mb.roomBox[1] >= 44 && mb.actBox[1] >= 44, JSON.stringify(mb));
/* the switcher is still reachable and still closable on a phone */
await m.evaluate(() => window.IndexOverlay.open());
await m.waitForFunction(() => !!document.querySelector('.ix-ov.open'), null, { timeout: B.ACT_MS }).catch(() => {});
await m.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
await m.waitForFunction(() => !document.querySelector('.ix-ov.open'), null, { timeout: B.ACT_MS }).catch(() => {});
await B.settle(m);
const mClosed = await m.evaluate(() => !document.querySelector('.ix-ov.open'));
chk('MOBILE switcher opens on demand and closes (44px close)', mClosed, 'still open');
await m.evaluate(() => window.Router.navigate('walk'));   /* the rest of this file tests TOPIC chrome */
await m.waitForFunction(() => document.documentElement.dataset.view !== 'home', null, { timeout: B.ACT_MS }).catch(() => {});
await B.settle(m);

/* LOAD-BEARING PIN (task #8 / _audit 2026-07-13 mobile-drift): the mobile pane-strip's immunity to
   topic-switch drift rests ENTIRELY on position:fixed -- measured 0px drift with it, 39.6-59.4px
   without (taps then land on the wrong view). Assert it computes `fixed` so a future "cleanup" of the
   pin goes red HERE instead of silently reintroducing the drift. One read, no new check file. */
const segPos = await m.evaluate(() => { const s = document.querySelector('.sidebar .seg'); return s ? getComputedStyle(s).position : '(no strip)'; });
chk('MOBILE pane-strip stays position:fixed (topic-switch drift immunity, task #8)', segPos === 'fixed', 'position=' + segPos);

// the 0x0 canvas was worst on mobile: a 2px sliver that was purely its own borders
await pickTopic(m, 'Kafka Internals', 'kafka-internals');
await m.evaluate(() => window.goView('viz'));
await m.waitForFunction(() => !!window.__VIZ, null, { timeout: B.ACT_MS }).catch(() => {});
/* Retried window, same as the desktop probes. This one bites HARDER on mobile: the drawing
   buffer is only ~358x201 (~72k px) against the desktop's much larger canvas, yet the animation
   threshold is the same flat 3000 changed px -- so it represents ~4% of the mobile buffer versus
   a far smaller fraction on desktop. A starved 1-second window under-counts, and mobile has the
   least room to absorb it. (Measured: 2 failures in 20 under saturation as a single sample.) */
const mv = await untilAnimating(m, PROBE);
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
await B.gotoApp(dl, FILE, { hash: '#kafka-internals/viz' });   /* was: goto + 2600ms */
/* A deep link never opened the overlay (window.__bootHash suppressed it) and the app no longer
   opens one at all -- so there is nothing to dismiss, and waiting 5s for a modal that cannot
   appear was pure cost. Just make sure nothing is over the visual we are about to photograph. */
await B.settle(dl);
await dl.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
await dl.waitForFunction(() => !document.querySelector('.ix-ov.open'), null, { timeout: B.ACT_MS }).catch(() => {});
await B.settle(dl);
const dlWhere = await dl.evaluate(() => ({
  hash: location.hash,
  topic: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null,
}));
const dlPix = await untilAnimating(dl, PROBE);   /* retried window, not a single 1s sample */
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
await B.gotoApp(bo, FILE, { hash: '#idempotency/viz' });       /* was: goto + 2800ms */
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

/* ===== THE OTHER MODE, WHICH NO TOPIC USES YET ================================
   kafka-internals is the only topic shipping a `## Visual`, so EVERY check above
   exercises `kafka-consumer-lag` and NOTHING exercises `queue-flow` -- the mode
   the ~12-15 pipeline topics are supposed to adopt. Untested-because-unadopted is
   how the original defect stayed invisible: `queue-flow` was Kafka's sim under a
   generic name, and the first topic to adopt it would have been the first to find
   out. So mount it here, through the SHIPPED VisualKit global, on the exact path a
   topic takes -- and assert the physics that make it safe to adopt:
     - capacity LINEAR and uncapped by lanes (Kafka caps it at the partition count)
     - adding a worker does NOT stop the world (Kafka stalls 2s)
     - no worker is structurally idle (Kafka idles the ones past the lane count)
   The numeric invariants live in visual-trainer/test/sim_invariants.mjs (gated);
   this proves they survive the bundle and reach a real canvas.               */
const gp = await b.newPage({ viewport: { width: 1280, height: 900 } });
const gerrs = []; gp.on('pageerror', (e) => gerrs.push(e.message.slice(0, 100)));
await B.gotoApp(gp, FILE);       /* was: goto + 2000ms */
await gp.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
await B.settle(gp);
const gen = await gp.evaluate(async () => {
  const host = document.createElement('div');
  host.id = 'genhost';
  host.style.cssText = 'width:900px;height:520px;position:fixed;left:0;top:0;z-index:9999';
  document.body.appendChild(host);
  const inst = window.VisualKit.mount(host, {
    mode: 'queue-flow',
    labels: { src: 'clients', queue: 'work queues', sink: 'workers' },
    params: { lanes: 6, rate: 120, sinks: 3, capacity: 30 },
  });
  window.__GEN = inst;
  const s = inst.sim;
  const at3 = s.effectiveCapacity();          // 3 x 30
  s.setSinkCount(9);                          // 9 workers, 6 lanes
  const at9 = s.effectiveCapacity();          // MUST be 270, not Kafka's 180
  const out = { shared: s.shared, at3, at9, stalled: s.stalled(),
    stallRemaining: s.state.stallRemaining, idle: s.idleSinks(),
    labels: [...host.querySelectorAll('.ctl label')].map((l) => l.textContent.split(':')[0].trim()) };
  // overload, then scale out: the capacity number must not be a lie.
  // The sim advances on rAF, so a fixed 2200/2800ms nap is a bet on the frame rate -- exactly
  // the bet that loses on a loaded box. Poll the sim's OWN state to the same thresholds the
  // assertions use (grew > 200, then drained below a quarter of that) with a hard cap. A sim
  // that does not really drain never reaches the condition and still fails.
  const waitFor = (cond, cap) => new Promise((res) => {
    const t0 = Date.now();
    const tick = () => {
      if (cond() || Date.now() - t0 > cap) return res();
      requestAnimationFrame(tick);
    };
    tick();
  });
  s.setSinkCount(2); s.setProducerRate(300);
  for (const ln of s.state.lanes) ln.lag = 0;
  await waitFor(() => s.totalLag() > 200, 20000);
  out.grew = s.totalLag();
  const target = out.grew * 0.25;
  s.setSinkCount(9); s.setProducerRate(60);
  await waitFor(() => s.totalLag() < target, 20000);
  out.drained = s.totalLag();
  return out;
});
chk('GENERIC MODE: queue-flow is registered and mounts from the shipped kit',
  gen.shared === true, JSON.stringify(gen));
chk('GENERIC MODE: capacity is LINEAR, uncapped by lanes (9x30 = 270, NOT Kafka 180)',
  gen.at3 === 90 && gen.at9 === 270, 'at3=' + gen.at3 + ' at9=' + gen.at9);
chk('GENERIC MODE: adding a worker does NOT stop the world, and nobody is idle',
  !gen.stalled && gen.stallRemaining === 0 && gen.idle === 0, JSON.stringify(gen));
chk('GENERIC MODE: honest vocabulary (Workers, not Consumers)',
  gen.labels.join(',') === 'Arrival rate (/s),Workers,Capacity each', JSON.stringify(gen.labels));
chk('GENERIC MODE: backlog grows under overload, then really DRAINS on scale-out',
  gen.grew > 200 && gen.drained < gen.grew * 0.25,
  'grew=' + (gen.grew || 0).toFixed(0) + ' drained=' + (gen.drained || 0).toFixed(0));
const GPROBE = () => new Promise((res) => requestAnimationFrame(() => {
  const c = document.getElementById('genhost').querySelector('canvas');
  const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
  const w = c ? c.width : 0, h = c ? c.height : 0;
  if (!gl || !w || !h) return res({ bufW: w, bufH: h, inkPct: 0, changed: 0 });
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let ink = 0;
  for (let i = 0; i < buf.length; i += 4) {
    if (Math.abs(buf[i] - 13) + Math.abs(buf[i + 1] - 17) + Math.abs(buf[i + 2] - 23) > 24) ink += 1;
  }
  let changed = 0;
  const prev = window.__genPrev;
  if (prev && prev.length === buf.length) {
    for (let i = 0; i < buf.length; i += 4) {
      if (Math.abs(buf[i] - prev[i]) + Math.abs(buf[i + 1] - prev[i + 1]) + Math.abs(buf[i + 2] - prev[i + 2]) > 12) changed += 1;
    }
  }
  window.__genPrev = buf;
  res({ bufW: w, bufH: h, inkPct: +(100 * ink / (w * h)).toFixed(2), changed });
}));
const gpx = await untilAnimating(gp, GPROBE);           // same 1s window, retried until it animates
chk('GENERIC MODE: it PAINTS and ANIMATES (a registered mode that draws nothing is not a mode)',
  gpx.bufW > 200 && gpx.inkPct > 1.5 && gpx.changed > 3000, JSON.stringify(gpx));
const gdisp = await gp.evaluate(() => {
  window.__GEN.dispose();
  document.getElementById('genhost').remove();
  return !document.getElementById('genhost');
});
chk('GENERIC MODE: disposes cleanly, zero page errors', gdisp && gerrs.length === 0, gerrs.slice(0, 2).join(' | '));
await gp.close();

await b.close();
console.log(fails === 0 ? 'VISUAL PIPELINE SMOKE: ALL PASS'
  : 'SMOKE: ' + fails + ' FAILURE(S): ' + failed.join(' ;; '));
await B.finish(fails ? 1 : 0);
