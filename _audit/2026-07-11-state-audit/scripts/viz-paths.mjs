// Is the 0x0 canvas universal, or does some entry path escape it?
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-trainer/';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const R = {};
const size = (p) => p.evaluate(() => {
  const pane = document.querySelector('deep-visual');
  const sr = pane && pane.shadowRoot;
  const c = sr && sr.querySelector('canvas');
  const empty = sr && sr.getElementById('vzempty');
  const base = {
    curTopic: TopicRegistry.current() && TopicRegistry.current().id,
    hash: location.hash,
    vizTabHidden: document.querySelector('button[data-tab="viz"]').hidden,
    kitMounted: !!window.__VIZ,
    emptyMsgShown: empty ? !empty.hidden : null,
    emptyMsgText: empty ? empty.textContent : null,
  };
  if (!c) return { ...base, canvas: 'NONE -- kit never mounted' };
  const r = c.getBoundingClientRect();
  return { ...base, backing: [c.width, c.height], rect: [Math.round(r.width), Math.round(r.height)] };
});
const killOv = (p) => p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.close) window.IndexOverlay.close(); document.querySelectorAll('.ix-x').forEach(x => x.click()); });

// --- path 1: normal click-through (baseline, already known broken) ----------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(900); await killOv(p);
  await p.evaluate(() => { TopicRegistry.setTopic('kafka-internals'); window.goView('viz'); });
  await p.waitForTimeout(1500);
  R.path1_clickThrough = await size(p);
  // --- path 2: leave to another pane and come BACK (fresh mount) ------------
  await p.evaluate(() => window.goView('walk')); await p.waitForTimeout(500);
  await p.evaluate(() => window.goView('viz')); await p.waitForTimeout(1500);
  R.path2_leaveAndReturn = await size(p);
  await p.close();
}
// --- path 3: DEEP LINK straight to #kafka-internals/viz on cold load --------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL + '#kafka-internals/viz', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await killOv(p);
  await p.waitForTimeout(500);
  R.path3_deepLinkColdLoad = await size(p);
  await p.screenshot({ path: SHOTS + 'P-deeplink-coldload.png' });
  await p.close();
}
// --- path 4: deep link, then reload (returning user, no overlay) ------------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(900); await killOv(p);
  await p.evaluate(() => { TopicRegistry.setTopic('kafka-internals'); window.goView('viz'); });
  await p.waitForTimeout(1000);
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(2500);
  R.path4_reloadOnVizRoute = await size(p);
  await p.screenshot({ path: SHOTS + 'P-reload-on-viz.png' });
  await p.close();
}
console.log(JSON.stringify(R, null, 2));
await b.close();
