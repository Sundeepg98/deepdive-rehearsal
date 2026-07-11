/* Attribute the 4 GL "GPU stall due to ReadPixels" warnings: app, or MY screenshots? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
for (const shots of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const w = [];
  p.on('console', m => { if (m.type() === 'warning') w.push(m.text().slice(0, 70)); });
  await p.goto(URL + '#kafka-internals/walk', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  await p.click('.seg button[data-tab="viz"]');
  await p.waitForTimeout(5000);                       // let the sim run 5s
  if (shots) { for (let i = 0; i < 4; i++) { await p.screenshot({ path: 'C:/Users/Dell/AppData/Local/Temp/claude/x' + i + '.png' }); await p.waitForTimeout(200); } }
  console.log(`screenshots=${String(shots).padEnd(5)} -> warnings=${w.length}`, w.length ? w[0] : '');
  await ctx.close();
}
await b.close();
