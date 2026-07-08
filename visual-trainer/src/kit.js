// kit.js -- the app-facing entry. Bundled by tools/build-visual-kit.mjs into
// one ASCII IIFE (global: VisualKit) that the app includes once. A topic's
// TOPIC_<P>_VISUAL config (authored as the ## Visual section of its own
// markdown) is handed to mount(); the kit builds the entire pane UI inside
// the host (a shadow root), wires sim + scene + stories, and returns a
// disposable instance. One mount alive at a time is the caller's contract.
import { createLoop } from './framework/loop.js';
import { createHUD, createStoryDriver, makeControlLocker } from './framework/hud.js';
import { queueFlowMode } from './modes/queue-flow/index.js';
import { KIT_MANIFEST } from './manifest.js';

const MODES = { 'queue-flow': queueFlowMode };

const KIT_CSS = [
  ':host { display: block; }',
  '.vz { font: 13px/1.45 system-ui, sans-serif; color: #c9d1d9; }',
  '.vz .stageInner { position: relative; }',
  '.vz canvas { width: 100%; display: block; border: 1px solid #21262d;',
  '  border-radius: 8px; background: #0d1117; }',
  '.vz #banner { display: none; position: absolute; top: 10px; left: 50%;',
  '  transform: translateX(-50%); background: #8a6d1d; color: #fff;',
  '  padding: 5px 12px; border-radius: 8px; font-weight: 700; font-size: 12px; }',
  '.vz #caption { display: none; margin-top: 8px; background: #1c2530;',
  '  border: 1px solid #2b3a4d; border-radius: 8px; padding: 8px 12px;',
  '  font-size: 14px; min-height: 20px; }',
  '.vz .panel { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end;',
  '  margin-top: 10px; }',
  '.vz .ro { display: flex; gap: 14px; margin-top: 10px; align-items: center; }',
  '.vz .ro b { font-size: 15px; }',
  '.vz .ro span { color: #8b949e; font-size: 12px; margin-right: 4px; }',
  '.vz .badge { padding: 2px 8px; border-radius: 10px; font-size: 11px;',
  '  font-weight: 700; }',
  '.vz .badge.ok { background: #1f6f43; color: #fff; } .vz .badge.bad { background: #8e2c2c; color: #fff; }',
  '.vz .badge.warn { background: #8a6d1d; color: #fff; }',
  '.vz label { display: block; font-size: 11px; color: #8b949e; margin-bottom: 2px; }',
  '.vz .ctl { min-width: 140px; }',
  '.vz input[type=range] { width: 100%; }',
  '.vz button { background: #21262d; color: #c9d1d9; border: 1px solid #30363d;',
  '  border-radius: 6px; padding: 5px 10px; margin: 2px 4px 2px 0; cursor: pointer; }',
  '.vz button:hover { background: #30363d; }',
  '.vz button:disabled { opacity: 0.4; cursor: default; }',
  '.vz #stopStory { display: none; background: #6e2c2c; }',
  '.vz .lg { color: #8b949e; font-size: 12px; margin-top: 8px; }',
].join('\n');

function el(root, tag, attrs, html) {
  const e = root.ownerDocument ? root.ownerDocument.createElement(tag) : document.createElement(tag);
  for (const k in (attrs || {})) e.setAttribute(k, attrs[k]);
  if (html != null) e.innerHTML = html;
  return e;
}

export function mount(host, config) {
  const mode = MODES[config.mode];
  if (!mode) throw new Error('VisualKit: unknown mode "' + config.mode + '"');
  const doc = host.ownerDocument || document;

  // --- DOM ------------------------------------------------------------------
  const style = doc.createElement('style');
  style.textContent = KIT_CSS;
  host.appendChild(style);
  const wrap = el(host, 'div', { class: 'vz' });
  const stage = el(host, 'div', { class: 'stageInner' });
  const canvas = el(host, 'canvas', { width: '1280', height: '720' });
  const banner = el(host, 'div', { id: 'banner' });
  stage.appendChild(canvas); stage.appendChild(banner);
  wrap.appendChild(stage);
  const ro = el(host, 'div', { class: 'ro' });
  wrap.appendChild(ro);
  wrap.appendChild(el(host, 'div', { id: 'caption' }));
  const panel = el(host, 'div', { class: 'panel' });
  wrap.appendChild(panel);
  const labels = config.labels || {};
  wrap.appendChild(el(host, 'div', { class: 'lg' },
    (labels.src || 'sources') + ' (left) -&gt; ' + (labels.queue || 'queues') +
    ' backing up (middle) -&gt; ' + (labels.sink || 'sinks') + ' (right)'));
  host.appendChild(wrap);

  // --- sim + scene ------------------------------------------------------------
  const sim = mode.createSim(config.params || {});
  const scene = mode.buildScene(canvas, sim);

  // --- readouts + controls ------------------------------------------------------
  const badge = el(host, 'span', { class: 'badge ok', id: 'status' }, 'STEADY');
  ro.appendChild(badge);
  const roVals = [];
  for (const r of mode.readouts(sim)) {
    const holder = el(host, 'span', null, '<span>' + r.label + '</span><b></b>');
    ro.appendChild(holder);
    roVals.push(holder.querySelector('b'));
  }
  const inputs = [];
  for (const c of mode.controls) {
    const box = el(host, 'div', { class: 'ctl' });
    const lab = el(host, 'label', null, c.label + ': <span></span>');
    const inp = el(host, 'input', { type: 'range', min: c.min, max: c.max, step: c.step });
    inp.value = c.get(sim);
    inp.addEventListener('input', () => { mode.apply(sim, { [c.set]: +inp.value }); sync(); });
    box.appendChild(lab); box.appendChild(inp);
    panel.appendChild(box);
    inputs.push({ c, inp, span: lab.querySelector('span') });
  }
  function sync() {
    for (const i of inputs) { i.inp.value = i.c.get(sim); i.span.textContent = Math.round(i.c.get(sim)); }
  }
  sync();

  // --- stories -------------------------------------------------------------------
  const hud = createHUD({ root: host });
  const lockControls = makeControlLocker({ root: host });
  const driver = createStoryDriver({ now: () => sim.state.t, hud, lockControls });
  const stories = config.stories || [];
  for (const s of stories) {
    const b = el(host, 'button', null, s.name);
    b.addEventListener('click', () => driver.run(
      s.steps.map((st) => ({ t: st.t, cap: st.cap, do: st.set ? () => { mode.apply(sim, st.set); sync(); } : undefined })),
      { init: () => { mode.reset(sim, config.params || {}); sync(); },
        onEnd: () => { mode.reset(sim, config.params || {}); sync(); } },
    ));
    panel.appendChild(b);
  }
  const stopB = el(host, 'button', { id: 'stopStory' }, 'Stop');
  stopB.addEventListener('click', () => driver.stop());
  panel.appendChild(stopB);

  // --- loop -----------------------------------------------------------------------
  let frames = 0;
  const loop = createLoop({
    simTick: (dt) => { sim.tick(dt); driver.tick(); },
    onFrame: (ft) => {
      scene.stepParticles(ft);
      scene.draw();
      frames += 1;
      const rs = mode.readouts(sim);
      for (let i = 0; i < roVals.length; i++) roVals[i].textContent = rs[i].value;
      const st = mode.status(sim);
      hud.setBadge(st.text, st.tone);
      hud.banner(st.banner);
    },
  });
  loop.start();

  return {
    sim,
    frames: () => frames,
    queues: () => (scene.queues ? scene.queues() : []),
    dispose() {
      loop.stop();
      driver.stop();
      try { scene.renderer.dispose(); } catch (e) { /* context loss is fine */ }
      host.innerHTML = '';
    },
  };
}

export const manifest = KIT_MANIFEST;
export const version = KIT_MANIFEST.version;
