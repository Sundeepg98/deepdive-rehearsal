/* Probe F: first-run onboarding trap -- is G (the ONLY tour entry) dead on the start screen? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-inv-features';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });          // FRESH browser: index overlay auto-opens
await p.waitForTimeout(800);

const boot = await p.evaluate(() => ({
  indexOpen: !!(window.IndexOverlay && window.IndexOverlay.isOpen()),
  openModal: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(d => d.classList.contains('open')).map(d => d.id)
}));
console.log('FIRST RUN (fresh browser, no saved progress):', JSON.stringify(boot));
await p.screenshot({ path: SHOTS + '/F1-first-run-start-screen.png' });

/* the ONLY way to start the tour is G. Does it work here -- where a new user actually is? */
await p.keyboard.press('g');
await p.waitForTimeout(600);
const tourAfterG = await p.evaluate(() => ({
  tourActive: !!(window.TourGuide && window.TourGuide.isActive && window.TourGuide.isActive()),
  spotlight: !!document.querySelector('[class*="tour"],[id*="tour"]')
}));
console.log('press G on the start screen -> tour active:', tourAfterG.tourActive);

await p.keyboard.press('?');
await p.waitForTimeout(400);
const keysAfter = await p.evaluate(() => document.getElementById('keyov').classList.contains('open'));
console.log('press ? on the start screen -> shortcuts overlay open:', keysAfter);

/* now dismiss the start screen and retry */
await p.evaluate(() => window.IndexOverlay.close());
await p.waitForTimeout(400);
await p.mouse.click(700, 12);
await p.waitForTimeout(150);
await p.keyboard.press('g');
await p.waitForTimeout(800);
const tourAfterClose = await p.evaluate(() => !!(window.TourGuide && window.TourGuide.isActive && window.TourGuide.isActive()));
console.log('press G AFTER dismissing the start screen -> tour active:', tourAfterClose);
await p.screenshot({ path: SHOTS + '/F2-tour-only-after-dismissing-start-screen.png' });

console.log('\n>> ONBOARDING TRAP:', boot.indexOpen && !tourAfterG.tourActive && tourAfterClose);
console.log('   The start screen a first-time user lands on suppresses the ONLY key that starts the tour.');
await b.close();
