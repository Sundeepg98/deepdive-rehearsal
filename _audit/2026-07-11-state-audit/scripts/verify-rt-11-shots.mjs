/* My earlier screenshots caught the BOOT INDEX OVERLAY stacked on top of the tool
   overlay — the DOM measurements were sound, but the images did not SHOW the defect.
   Redo them properly: dismiss the boot overlay FIRST, assert the tool overlay is the
   topmost open dialog, and assert the defect text is actually on screen (hit-test the
   centre of .mb-task via elementFromPoint) before shooting. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-interactions/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(700);

const dismissBoot = async () => {
  for (let i = 0; i < 4; i++) {
    const open = await p.evaluate(() =>
      [...document.querySelectorAll('[role=dialog]')].filter(d => d.classList.contains('open')).map(d => d.id));
    if (!open.length) return open;
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
  }
  return p.evaluate(() =>
    [...document.querySelectorAll('[role=dialog]')].filter(d => d.classList.contains('open')).map(d => d.id));
};

const openDialogs = () => p.evaluate(() =>
  [...document.querySelectorAll('[role=dialog]')].filter(d => d.classList.contains('open')).map(d => d.id));

// ---------- MOCK RUN on caching ----------
let left = await dismissBoot();
console.log('open dialogs after dismissing boot overlay:', JSON.stringify(left));
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(400);
await p.evaluate(() => window.openMock());
await p.waitForTimeout(700);
console.log('open dialogs with mock run up  :', JSON.stringify(await openDialogs()));

// hit-test: is the "undefined" text actually the topmost thing at its own centre?
const hit = await p.evaluate(() => {
  const host = document.querySelector('#mockov');
  const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean);
  const el = sr.querySelector('.mb-task');
  const r = el.getBoundingClientRect();
  const cx = Math.round(r.x + r.width / 2), cy = Math.round(r.y + r.height / 2);
  const top = document.elementFromPoint(cx, cy);           // pierces to the shadow host
  const topInShadow = sr.elementFromPoint ? sr.elementFromPoint(cx, cy) : null;
  return {
    text: el.textContent,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    topElementAtCentre: top ? top.tagName + (top.id ? '#' + top.id : '') : null,
    topInShadow: topInShadow ? topInShadow.className : null,
    occluded: !(top && top.closest && top.closest('#mockov')),
    tag: sr.querySelector('.mb-tag')?.textContent,
    cue: sr.querySelector('.mb-cue')?.textContent,
  };
});
console.log('\n.mb-task hit-test:', JSON.stringify(hit, null, 1));
console.log('OCCLUDED?', hit.occluded ? '*** YES — shot would be invalid ***' : 'no — the text is genuinely on screen');
await p.screenshot({ path: SHOT + 'FIXED-mockrun-caching-undefined.png' });
// tight crop around the beat
await p.screenshot({ path: SHOT + 'FIXED-mockrun-caching-undefined-crop.png',
  clip: { x: hit.rect.x - 40, y: hit.rect.y - 110, width: Math.min(620, hit.rect.w + 90), height: 190 } });

// ---------- MOCK RUN END SCREEN (theme = "CURVEBALL") ----------
for (let i = 0; i < 4; i++) {
  await p.evaluate(() => {
    const host = document.querySelector('#mockov');
    const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean);
    const nx = sr && sr.getElementById('mbnext'); if (nx) nx.click();
  });
  await p.waitForTimeout(250);
}
const endHit = await p.evaluate(() => {
  const host = document.querySelector('#mockov');
  const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean);
  const cv = sr.querySelector('.mb-end-cv');
  if (!cv) return null;
  const r = cv.getBoundingClientRect();
  const top = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
  return { text: cv.textContent.trim(), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
           occluded: !(top && top.closest && top.closest('#mockov')) };
});
console.log('\nEND SCREEN .mb-end-cv:', JSON.stringify(endHit, null, 1));
await p.screenshot({ path: SHOT + 'FIXED-mockrun-end-theme-CURVEBALL.png' });
if (endHit && !endHit.occluded) {
  await p.screenshot({ path: SHOT + 'FIXED-mockrun-end-crop.png',
    clip: { x: endHit.rect.x - 10, y: endHit.rect.y - 10, width: Math.min(700, endHit.rect.w + 20), height: endHit.rect.h + 20 } });
}
await p.evaluate(() => { const x = document.querySelector('#mockov .mock-x,#mockov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(400);

// ---------- MIXED FIRE curveball (undefined + CURVEBALL label + stray prefix) ----------
await p.evaluate(() => window.openMix());
await p.waitForTimeout(600);
console.log('\nopen dialogs with mixed fire up:', JSON.stringify(await openDialogs()));
const mixHit = await p.evaluate(() => {
  const host = document.querySelector('#mixov');
  const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean) || host;
  for (let i = 0; i < 14; i++) {
    if (sr.querySelector('.mx-kind')?.textContent?.trim() === 'Curveball') {
      const t = sr.querySelector('.mx-task');
      const r = t.getBoundingClientRect();
      const top = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
      return { label: sr.querySelector('.mx-label')?.textContent?.trim(),
               prompt: sr.querySelector('.qq')?.textContent?.trim(),
               task: t.textContent,
               rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
               occluded: !(top && top.closest && top.closest('#mixov')) };
    }
    const s = sr.querySelector('#mxshow'); if (s) s.click();
    const g = [...sr.querySelectorAll('button')].filter(x => /got it|shaky|solid|revisit/i.test(x.textContent));
    if (g[0]) g[0].click(); else break;
  }
  return null;
});
console.log('MIXED FIRE curveball:', JSON.stringify(mixHit, null, 1));
await p.screenshot({ path: SHOT + 'FIXED-mixedfire-caching-undefined.png' });
if (mixHit && !mixHit.occluded) {
  await p.screenshot({ path: SHOT + 'FIXED-mixedfire-caching-undefined-crop.png',
    clip: { x: Math.max(0, mixHit.rect.x - 30), y: Math.max(0, mixHit.rect.y - 150), width: 640, height: 230 } });
}

// ---------- CRAM SHEET on caching ----------
await p.evaluate(() => { const x = document.querySelector('#mixov .mock-x,#mixov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(400);
await p.evaluate(() => window.openCram());
await p.waitForTimeout(700);
console.log('\nopen dialogs with cram up      :', JSON.stringify(await openDialogs()));
const cramHit = await p.evaluate(() => {
  const ov = document.querySelector('#cramov');
  const title = ov.querySelector('.cram-title')?.textContent?.trim();
  const sr = ov.querySelector('deep-cram').shadowRoot;
  const one = sr.querySelector('.cs-one');
  const r = one.getBoundingClientRect();
  const top = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
  return { title, firstLine: one.textContent.trim().slice(0, 120),
           occluded: !(top && top.closest && top.closest('#cramov')) };
});
console.log('CRAM:', JSON.stringify(cramHit, null, 1));
await p.screenshot({ path: SHOT + 'FIXED-cram-caching.png' });
await b.close();
