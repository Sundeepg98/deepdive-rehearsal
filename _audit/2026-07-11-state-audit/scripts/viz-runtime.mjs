// Does the visual trainer ACTUALLY work inside the shipped dist/index.html?
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-trainer/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1200);
const R = {};

// --- 1. inventory: topics + which declare a visual --------------------------
R.inventory = await p.evaluate(() => {
  const ids = TopicRegistry.ids();
  const withViz = ids.filter(i => { const t = TopicRegistry.get(i); return !!(t && t.data && t.data.visual); });
  return { topicCount: ids.length, withVisual: withViz, modes: Object.keys(window.VisualKit.manifest.modes) };
});

// --- 2. navigate to kafka-internals -> viz ----------------------------------
await p.evaluate(() => TopicRegistry.setTopic('kafka-internals'));
await p.waitForTimeout(400);
R.tabVisibleOnKafka = await p.evaluate(() => {
  const btn = document.querySelector('button[data-tab="viz"]');
  return { hidden: btn.hidden, text: btn.textContent.trim() };
});
await p.evaluate(() => window.goView('viz'));
await p.waitForTimeout(2500);

// --- 3. is a real WebGL canvas rendering, and are frames advancing? ---------
R.render = await p.evaluate(async () => {
  const pane = document.querySelector('deep-visual');
  const root = pane && pane.shadowRoot;
  const canvas = root && root.querySelector('canvas');
  const inst = window.__VIZ;
  if (!canvas || !inst) return { mounted: false, hasPane: !!pane, hasShadow: !!root, hasCanvas: !!canvas, hasInst: !!inst };
  const f0 = inst.frames();
  const lag0 = inst.sim.totalLag();
  await new Promise(r => setTimeout(r, 1000));
  const f1 = inst.frames();
  const lag1 = inst.sim.totalLag();
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return {
    mounted: true,
    canvasSize: { w: canvas.width, h: canvas.height, cssW: canvas.clientWidth, cssH: canvas.clientHeight },
    glContext: gl ? (gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl') : 'NONE',
    framesIn1s: f1 - f0, fps: f1 - f0,
    simTimeAdvancing: inst.sim.state.t > 0,
    lagChanged: lag0 !== lag1,
    totalLag: Math.round(lag1),
    effectiveCapacity: inst.sim.effectiveCapacity(),
    status: inst.sim.status(),
    queues: inst.queues().slice(0, 6),
    controls: [...root.querySelectorAll('input[type=range]')].map(i => ({ v: i.value, min: i.min, max: i.max })),
    storyButtons: [...root.querySelectorAll('button')].map(x => x.textContent.trim()),
    readouts: [...root.querySelectorAll('.ro b')].map(x => x.textContent),
  };
});
await p.screenshot({ path: SHOTS + 'kafka-viz-pane-desktop.png' });

// --- 4. is the canvas actually PAINTED (not a black rect)? -------------------
R.pixels = await p.evaluate(() => {
  const pane = document.querySelector('deep-visual');
  const root = pane.shadowRoot;
  const canvas = root.querySelector('canvas');
  const diag = {
    attrW: canvas.width, attrH: canvas.height,
    clientW: canvas.clientWidth, clientH: canvas.clientHeight,
    styleW: canvas.style.width, styleH: canvas.style.height,
    parentClientW: canvas.parentElement.clientWidth,
    hostClientW: root.getElementById('vzhost').clientWidth,
    paneOffsetW: pane.offsetWidth,
    paneDisplay: getComputedStyle(pane).display,
    panePartDisplay: pane.parentElement ? getComputedStyle(pane.parentElement).display : null,
    panePartClass: pane.parentElement ? pane.parentElement.className : null,
  };
  if (!canvas.width || !canvas.height) return { PAINT_IMPOSSIBLE: true, reason: 'canvas backing store is 0x0', diag };
  const c2 = document.createElement('canvas');
  c2.width = canvas.width; c2.height = canvas.height;
  c2.getContext('2d').drawImage(canvas, 0, 0);
  const d = c2.getContext('2d').getImageData(0, 0, c2.width, c2.height).data;
  let nonBg = 0; const total = c2.width * c2.height;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - 13) > 8 || Math.abs(d[i + 1] - 17) > 8 || Math.abs(d[i + 2] - 23) > 8) nonBg++;
  }
  return { nonBgPct: +(100 * nonBg / total).toFixed(2), total, diag };
});

// --- 5. teaching invariant LIVE: consumers beyond partitions add zero capacity
R.teachingBeat = await p.evaluate(async () => {
  const s = window.__VIZ.sim;
  s.setConsumerCount(6); s.setProducerRate(150);
  const cap6 = s.effectiveCapacity();
  s.setConsumerCount(8);                       // 8 consumers, 6 partitions
  const cap8 = s.effectiveCapacity();
  const idle = s.state.consumerCount - s.state.partitions.length;
  return { cap6, cap8, capacityUnchanged: cap6 === cap8, idleConsumers: idle, statusDuringRebalance: s.status() };
});
await p.waitForTimeout(300);
await p.screenshot({ path: SHOTS + 'kafka-viz-idle-consumers.png' });

// --- 6. story mode drives the sim -------------------------------------------
R.story = await p.evaluate(async () => {
  const root = document.querySelector('deep-visual').shadowRoot;
  const btns = [...root.querySelectorAll('button')];
  const story = btns.find(x => /Spike/.test(x.textContent));
  if (!story) return { found: false, buttons: btns.map(x => x.textContent) };
  story.click();
  await new Promise(r => setTimeout(r, 1500));
  const cap = root.querySelector('#caption');
  const capVisible = cap && getComputedStyle(cap).display !== 'none';
  const capText1 = cap ? cap.textContent : null;
  const sinksLocked = [...root.querySelectorAll('input[type=range]')].some(i => i.disabled);
  await new Promise(r => setTimeout(r, 4000));
  const capText2 = cap ? cap.textContent : null;
  return { found: true, capVisible, capText1, capText2, captionAdvanced: capText1 !== capText2, controlsLocked: sinksLocked };
});
await p.screenshot({ path: SHOTS + 'kafka-viz-story-playing.png' });

// --- 7. dispose on leave (one GL context alive) -----------------------------
await p.evaluate(() => window.goView('walk'));
await p.waitForTimeout(600);
R.disposeOnLeave = await p.evaluate(() => ({
  instNulled: window.__VIZ === null,
  hostEmptied: document.querySelector('deep-visual').shadowRoot.querySelector('#vzhost').children.length === 0,
}));

// --- 8. a NON-visual topic: tab hidden + bounce off #viz --------------------
await p.evaluate(() => TopicRegistry.setTopic('cap-theorem'));
await p.waitForTimeout(400);
R.nonVisualTopic = await p.evaluate(() => ({
  tabHidden: document.querySelector('button[data-tab="viz"]').hidden,
}));
// deep-link straight into #viz on a topic with no visual
await p.evaluate(() => { window.goView('viz'); });
await p.waitForTimeout(600);
R.bounce = await p.evaluate(() => ({ hash: location.hash, bouncedToWalk: /walk/.test(location.hash) }));

R.consoleErrors = errs;
console.log(JSON.stringify(R, null, 2));
await b.close();
