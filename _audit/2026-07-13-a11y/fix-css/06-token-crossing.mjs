/* 06-token-crossing.mjs -- verify the claim I put in a comment when deleting the v157 dark rules.
 * CLAIM: `html[data-theme="dark"] .card{box-shadow:...}` was dead AND redundant, because
 * .card{box-shadow:var(--card-sh)} already reads a TOKEN, and --card-sh is re-declared in the dark
 * block -- and custom properties DO cross the shadow boundary.
 * If that is wrong, I have just deleted the dark card shadow and shipped a flat card. VERIFY. */
import { launch, openApp, setTheme, showPane, settleAnimations, computedIn } from './lib.mjs';
const browser = await launch();
const page = await openApp(browser);
await showPane(page, 'walk');
await settleAnimations(page);

const read = async () => ({
  card: (await computedIn(page, '.card', ['box-shadow']))['box-shadow'],
  thread: (await computedIn(page, '.thread', ['box-shadow']))['box-shadow'],
  cardSh: await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--card-sh').trim().slice(0, 40)),
});

await setTheme(page, 'light');
await settleAnimations(page);
const light = await read();
await setTheme(page, 'dark');
await settleAnimations(page);
await showPane(page, 'drill'); await settleAnimations(page);
const darkThread = (await computedIn(page, '.thread', ['box-shadow']))['box-shadow'];
await showPane(page, 'walk'); await settleAnimations(page);
const dark = await read();

console.log('\n=== DOES THE THEME TOKEN STILL CROSS THE SHADOW BOUNDARY? ===\n');
console.log('  --card-sh (on <html>, light) : %s...', light.cardSh);
console.log('  --card-sh (on <html>, dark)  : %s...', dark.cardSh);
console.log('');
console.log('  .card box-shadow  light : %s', String(light.card).slice(0, 62));
console.log('  .card box-shadow  dark  : %s', String(dark.card).slice(0, 62));
const cardOk = light.card !== dark.card && String(dark.card) !== 'none' && String(dark.card).length > 4;
console.log('  -> .card shadow is theme-aware INSIDE the shadow root: %s', cardOk ? 'YES' : '*** NO -- I BROKE IT ***');

// .thread only exists on the drill pane
await showPane(page, 'drill'); await settleAnimations(page);
await setTheme(page, 'light'); await settleAnimations(page);
const lightThread = (await computedIn(page, '.thread', ['box-shadow']))['box-shadow'];
console.log('');
console.log('  .thread box-shadow light : %s', String(lightThread).slice(0, 62));
console.log('  .thread box-shadow dark  : %s', String(darkThread).slice(0, 62));
const threadOk = lightThread !== darkThread && String(darkThread) !== 'none';
console.log('  -> .thread shadow is theme-aware INSIDE the shadow root: %s', threadOk ? 'YES' : '*** NO -- I BROKE IT ***');

await browser.close();
const ok = cardOk && threadOk;
console.log('\n  VERDICT: %s\n', ok
  ? 'PASS -- the deleted v157 rules really were redundant. Custom properties cross the boundary;\n           the dark card/thread elevation still works, via --card-sh / --surf-sh.'
  : 'FAIL -- deleting the v157 rules FLATTENED the dark cards. Put them back (in BASE_SHEET).');
process.exit(ok ? 0 : 1);
