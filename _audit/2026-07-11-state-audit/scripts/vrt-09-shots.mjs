/* Visual ground truth. Dismiss the first-run topic-index overlay (Escape), THEN shoot. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();

const shoot = async (t, v, w, h, name) => {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await p.goto(URL + `#${t}/${v}`, { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.keyboard.press('Escape');           // close the first-run topic index
  await p.waitForTimeout(450);
  const open = await p.evaluate(() => { const o = document.getElementById('_index-overlay'); return o ? o.className : 'gone'; });
  await p.screenshot({ path: SH + name });
  // also crop the stage
  const box = await p.evaluate(() => { const s = document.querySelector('.stage').getBoundingClientRect(); return { x: s.x, y: s.y, w: s.width, h: s.height }; });
  await p.screenshot({ path: SH + name.replace('.png', '-stage.png'), clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, 820) } });
  console.log(name, '| overlay class after Escape:', open);
  await p.close();
};

await shoot('storage-engines', 'num', 1280, 900, 'f3-num-1280-storage-engines-VERIFY.png');
await shoot('storage-engines', 'num', 1920, 900, 'f3-num-1920-storage-engines-VERIFY.png');
await shoot('load-balancing', 'num', 1280, 900, 'f3-num-1280-load-balancing-VERIFY.png');
await shoot('caching', 'sys', 1280, 900, 'f1-sys-1280-caching-VERIFY.png');
await shoot('authz', 'sys', 1280, 900, 'f1-sys-1280-authz-VERIFY.png');
await b.close();
