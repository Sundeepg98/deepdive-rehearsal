import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-desktop';
fs.mkdirSync(SHOT, { recursive: true });

const TABS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const OVERLAYS = [
  ['mockopen', 'mockx', 'mock-run'],
  ['cramopen', 'cramx', 'cram'],
  ['sessopen', 'sessx', 'session'],
  ['keyopen', 'keyx', 'keyboard'],
  ['planopen', 'planx', 'gameplan'],
  ['scopeopen', 'scopex', 'scope'],
  ['mixopen', 'mixx', 'mixed-fire'],
  ['notesopen', null, 'notes'],
];

const b = await chromium.launch();
const errs = [];

async function run(theme) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(`[${theme}] PAGE-ERROR ${e.message}`));
  p.on('console', m => { if (m.type() === 'error') errs.push(`[${theme}] CONSOLE-ERROR ${m.text()}`); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1000);

  if (theme === 'dark') {
    await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await p.waitForTimeout(400);
  }

  // 1. HOME (topic index overlay is open at boot)
  await p.waitForSelector('.ix-ov.open', { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${SHOT}/${theme}-00-home.png` });
  await p.screenshot({ path: `${SHOT}/${theme}-00-home-full.png`, fullPage: true });

  // enter a topic: click the first topic card
  const card = await p.$('.ix-card');
  if (card) { await card.click(); } else { await p.keyboard.press('Escape'); }
  await p.waitForTimeout(900);

  // 2. the 9 panes
  for (const t of TABS) {
    await p.click(`.seg button[data-tab="${t}"]`);
    await p.waitForTimeout(950);            // pane + card stagger animations
    await p.screenshot({ path: `${SHOT}/${theme}-pane-${t}.png` });
    await p.screenshot({ path: `${SHOT}/${theme}-pane-${t}-full.png`, fullPage: true });
  }

  // back to walk for a stable base
  await p.click('.seg button[data-tab="walk"]');
  await p.waitForTimeout(500);

  // 3. overlays
  for (const [openId, closeId, name] of OVERLAYS) {
    const btn = await p.$(`#${openId}`);
    if (!btn) { errs.push(`[${theme}] missing #${openId}`); continue; }
    await btn.click();
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${SHOT}/${theme}-ov-${name}.png` });
    // close
    if (closeId && await p.$(`#${closeId}`)) { await p.click(`#${closeId}`); }
    else { await p.keyboard.press('Escape'); }
    await p.waitForTimeout(600);
  }

  // 4. topic-nav dropdown open
  await p.click('#tntrigger').catch(() => {});
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${SHOT}/${theme}-topicnav-open.png` });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);

  // 5. sidebar hover state on a nav item + a tools row
  await p.hover('.seg button[data-tab="trade"]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SHOT}/${theme}-hover-nav.png`, clip: { x: 0, y: 0, width: 300, height: 900 } });

  await p.close();
}

await run('light');
await run('dark');
await b.close();
console.log('ERRORS:\n' + (errs.length ? errs.join('\n') : '(none)'));
console.log('done');
