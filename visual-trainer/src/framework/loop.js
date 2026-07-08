// framework/loop.js -- fixed-dt simulation loop + rAF render driver.
// Mode-agnostic: sims stay deterministic at DT regardless of display rate.
export function createLoop({ dt = 1 / 30, simTick, onFrame }) {
  let last = performance.now(), acc = 0, running = false;
  function frame(now) {
    if (!running) return;
    const ft = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += ft;
    while (acc >= dt) { simTick(dt); acc -= dt; }
    onFrame(ft);
    requestAnimationFrame(frame);
  }
  return {
    start: () => { running = true; last = performance.now(); requestAnimationFrame(frame); },
    stop: () => { running = false; },
  };
}
