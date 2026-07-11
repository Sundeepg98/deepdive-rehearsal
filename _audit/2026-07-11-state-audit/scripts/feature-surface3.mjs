import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/feature-surface';
const b = await chromium.launch();
const errs = [];

// --- A. #viz deep-link on a topic with NO visual (45 of 46) ---
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL + '#caching/viz', { waitUntil: 'load' });
await p.waitForTimeout(1400);
const vizNoVisual = await p.evaluate(() => ({
  hash: location.hash,
  topic: TopicRegistry.current().id,
  vizPaneOn: document.getElementById('viz').classList.contains('on'),
  walkPaneOn: document.getElementById('walk').classList.contains('on'),
  vizTabHidden: document.querySelector('.seg button[data-tab="viz"]').hidden,
  docTitle: document.title,
}));

// --- B. 'v' key on a topic with no visual ---
await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close());
await p.waitForTimeout(300);
await p.evaluate(() => window.Router.navigate('walk'));
await p.waitForTimeout(200);
await p.keyboard.press('v');
await p.waitForTimeout(700);
const vKey = await p.evaluate(() => ({
  hash: location.hash,
  vizPaneOn: document.getElementById('viz').classList.contains('on'),
  walkPaneOn: document.getElementById('walk').classList.contains('on'),
  emptyMsg: document.querySelector('deep-visual')?.shadowRoot?.getElementById('vzempty')?.hidden,
  docTitle: document.title,
  railWidth: document.getElementById('rail').style.width,
}));
await p.screenshot({ path: `${SHOTS}/viz-vkey-no-visual-topic.png` });

// --- C. Persistence surface: exercise everything, dump the keys ---
const p3 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p3.goto(URL, { waitUntil: 'load' });
await p3.waitForTimeout(800);
await p3.evaluate(() => window.IndexOverlay.close());
await p3.waitForTimeout(400);
await p3.evaluate(async () => {
  // star, note, theme, text zoom, companion fold, weekly goal, num tweak
  Bookmarks.toggle('caching');
  Store.set('notes.caching', 'my note');
  Store.set('theme', 'dark');
  Store.set('ui.textzoom', 4);
  Store.set('cmp.collapsed', true);
  Store.set('goal.weekly', 7);
  Store.set('num.caching', { nq: '5' });
});
// grade one drill probe to fire the progress snapshot
await p3.evaluate(() => window.Router.navigate('drill'));
await p3.waitForTimeout(400);
await p3.evaluate(() => {
  const d = document.querySelector('#drill deep-drill');
  const r = d.shadowRoot;
  let adv; while ((adv = r.getElementById('adv'))) adv.click();
  r.getElementById('jg').click();       // Solid
});
await p3.waitForTimeout(400);
const persist = await p3.evaluate(() => ({
  keys: Object.keys(localStorage).sort(),
  progress: Store.get('progress.content-pipeline'),
  summaryStarted: Progress.summary().startedTopics,
}));
await p3.screenshot({ path: `${SHOTS}/drill-musthit-graded.png` });

// --- D. must-hit points checklist present? ---
await p3.evaluate(() => window.Router.navigate('drill'));
await p3.waitForTimeout(300);
const mhp = await p3.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  let adv; while ((adv = r.getElementById('adv'))) adv.click();
  const items = [...r.querySelectorAll('.mhp-i')].map(e => e.textContent.trim());
  return { count: items.length, sample: items.slice(0, 4), header: r.querySelector('.mhp-h')?.textContent.trim().slice(0, 60) };
});
await p3.screenshot({ path: `${SHOTS}/drill-must-hit-points.png` });

// --- E. TourGuide steps ---
const tourSteps = await p3.evaluate(() => {
  // reflect: start it and walk the dots
  window.TourGuide.start();
  const dots = document.querySelectorAll('[class*="tg-dot"], [class*="dot"]');
  return { active: window.TourGuide.isActive(), dotCount: dots.length };
});

console.log(JSON.stringify({ vizNoVisual, vKey, persist, mhp, tourSteps, errs }, null, 2));
await b.close();
