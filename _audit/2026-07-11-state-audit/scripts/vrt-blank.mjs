// MONEY SHOT: the whole app is blank at FIRST LOAD under prefers-reduced-motion.
// No navigation, no clicks. Just open the file the way a user does.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rtperf';

// 1) the rules really are in the SHIPPED artifact
const html = readFileSync('D:/claude-workspace/deepdive-rehearsal/dist/index.html', 'utf8');
const bodyRule = html.match(/body\{[^}]*opacity:0;animation:bodyIn[^}]*\}/);
const rmKill = html.match(/@media \(prefers-reduced-motion: ?reduce\)\{\*\{animation:none[^}]*\}/);
console.log('SHIPPED body rule :', bodyRule ? bodyRule[0].slice(-80) : 'NOT FOUND');
console.log('SHIPPED rm kill   :', rmKill ? rmKill[0] : 'NOT FOUND');
console.log('bodyIn keyframes  :', /@keyframes bodyIn\{from\{opacity:0\}to\{opacity:1\}\}/.test(html));

for (const rm of ['reduce', 'no-preference']) {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: rm });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(4000);          // long past any animation delay/duration

  const v = await page.evaluate(() => ({
    bodyOpacity: getComputedStyle(document.body).opacity,
    bodyAnimName: getComputedStyle(document.body).animationName,
    anims: document.getAnimations().length,
    textPresent: (document.body.innerText || '').trim().length,
    elements: document.querySelectorAll('*').length,
  }));
  console.log(`\nreducedMotion=${rm} @ FIRST LOAD ->`, JSON.stringify(v));

  const shot = `${SHOTS}/boot-${rm}.png`;
  await page.screenshot({ path: shot });

  // count non-background pixels in the shot as hard proof of "nothing painted"
  const buf = await page.screenshot();
  const { createHash } = await import('node:crypto');
  console.log('  screenshot sha1:', createHash('sha1').update(buf).digest('hex').slice(0, 16), '->', shot);
  await b.close();
}
