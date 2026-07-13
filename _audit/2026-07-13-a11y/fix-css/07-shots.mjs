/* 07-shots.mjs -- the evidence screenshots: 200% zoom, forced-colors, 320px. */
import { launch, openApp, showPane, setTheme, applyTextZoom, verifyTextZoom, settleAnimations, shot } from './lib.mjs';
const browser = await launch();

/* 1. 200% text zoom, tools sheet open, 390px */
{
  const page = await openApp(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.evaluate(() => document.getElementById('toolsfab')?.click());
  await page.waitForTimeout(500);
  await settleAnimations(page);
  await applyTextZoom(page, 2);
  await page.waitForTimeout(400);
  const zc = await verifyTextZoom(page, 2);
  console.log('  zoom200-tools.png        (zoom scaled %d elements, %d off-target)', zc.total, zc.elementsOffTarget);
  await shot(page, 'zoom200-tools-AFTER.png');
  await page.__ctx.close();
}
/* 2. forced-colors: the walkthrough (cards) + the drill scoreboard, graded */
for (const [pane, name] of [['walk', 'forced-colors-walk-AFTER.png'], ['drill', 'forced-colors-drill-AFTER.png']]) {
  const page = await openApp(browser, { forcedColors: 'active' });
  await showPane(page, pane);
  await settleAnimations(page);
  if (pane === 'drill') {
    for (let i = 0; i < 3; i++) {
      for (let g = 0; g < 8; g++) {
        const ok = await page.evaluate(() => { const a = document.querySelector('deep-drill')?.shadowRoot?.getElementById('adv'); if (a) { a.click(); return true; } return false; });
        if (!ok) break;
        await page.waitForTimeout(110);
      }
      await page.evaluate(() => document.querySelector('deep-drill')?.shadowRoot?.getElementById('jg')?.click());
      await page.waitForTimeout(200);
    }
    await settleAnimations(page);
  }
  console.log('  %s', name);
  await shot(page, name);
  await page.__ctx.close();
}
/* 3. prefers-contrast: more -- the cards, which used to get NOTHING */
{
  const page = await openApp(browser, { contrast: 'more' });
  await showPane(page, 'walk');
  await settleAnimations(page);
  console.log('  prefers-contrast-walk-AFTER.png');
  await shot(page, 'prefers-contrast-walk-AFTER.png');
  await page.__ctx.close();
}
/* 4. 320px -- the width where content was being cut off */
for (const [topic, pane, name] of [
  ['stream-batch-processing', 'walk', 'reflow-320-fbchip-AFTER.png'],
  ['debugging', 'drill', 'reflow-320-drill-AFTER.png'],
]) {
  const page = await openApp(browser, { viewport: { width: 320, height: 900 }, hasTouch: true, isMobile: true });
  await page.evaluate((t) => window.TopicRegistry.setTopic(t), topic);
  await page.waitForTimeout(700);
  await showPane(page, pane);
  await settleAnimations(page);
  console.log('  %s  (%s / %s)', name, topic, pane);
  await shot(page, name);
  await page.__ctx.close();
}
/* 5. the drill scoreboard zero state, both themes */
for (const theme of ['light', 'dark']) {
  const page = await openApp(browser, { colorScheme: theme });
  await setTheme(page, theme);
  await showPane(page, 'drill');
  await settleAnimations(page);
  console.log('  zerostate-%s-AFTER.png', theme);
  await shot(page, `zerostate-${theme}-AFTER.png`);
  await page.__ctx.close();
}
await browser.close();
console.log('\n  all evidence screenshots written to _audit/2026-07-13-a11y/fix-css/shots/');
