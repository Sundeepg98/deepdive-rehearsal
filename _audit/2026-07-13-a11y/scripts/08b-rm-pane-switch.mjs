/* The drill ink came back byte-identical to the walkthrough ink (2584045 both).
 * Two different panes cannot paint the same number of pixels. Either the pane
 * switch silently failed under reduced-motion - which would be exactly the family
 * of bug this app already shipped once - or my screenshot raced the transition.
 * Find out which.
 */
import { launch, phone, installDeep, inkOf, ensureDirs, PHONES } from './lib.mjs';
ensureDirs();

const b = await launch();
for (const motion of ['no-preference', 'reduce']) {
  const p = await phone(b, PHONES.p390, { reducedMotion: motion });
  await installDeep(p);
  await p.locator('.ix-card').first().tap().catch(() => {});
  await p.waitForTimeout(1100);

  const before = await p.evaluate(() => ({
    activeTab: document.querySelector('.seg button.on')?.dataset.tab,
    visiblePane: [...document.querySelectorAll('.pane')].filter((e) => e.checkVisibility()).map((e) => e.className).join(','),
    drillHostVisible: document.querySelector('deep-drill')?.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
  }));
  const inkA = await inkOf(p, null);

  await p.evaluate(() => document.querySelector('.seg button[data-tab="drill"]').click());
  await p.waitForTimeout(1500); // generous
  const after = await p.evaluate(() => ({
    activeTab: document.querySelector('.seg button.on')?.dataset.tab,
    visiblePane: [...document.querySelectorAll('.pane')].filter((e) => e.checkVisibility()).map((e) => e.className).join(','),
    drillHostVisible: document.querySelector('deep-drill')?.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    drillRect: (() => { const r = document.querySelector('deep-drill').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })(),
    scoreboardText: document.querySelector('deep-drill')?.shadowRoot?.querySelector('.dsc')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 40),
  }));
  const inkB = await inkOf(p, `08b-390-${motion}-after-drill-click.png`);

  console.log(`\n===== reducedMotion: ${motion} =====`);
  console.log('  before click:', JSON.stringify(before));
  console.log('  after  click:', JSON.stringify(after));
  console.log(`  ink: ${inkA.painted} -> ${inkB.painted}  (delta ${inkB.painted - inkA.painted})`);
  console.log('  ' + (after.activeTab === 'drill' && after.drillHostVisible
    ? 'pane switch WORKED (drill host is rendered)' + (inkA.painted === inkB.painted ? ' - identical ink was a screenshot race, not a bug' : '')
    : '*** PANE SWITCH FAILED under ' + motion + ' ***'));
  await p.context().close();
}
await b.close();
