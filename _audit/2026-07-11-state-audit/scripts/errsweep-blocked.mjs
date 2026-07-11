/* Why is the tab bar UNCLICKABLE after many topic switches?
   Playwright click actionability = visible + STABLE (bbox unchanged 2 frames) + hit-target + enabled.
   Suspects: (a) a never-ending animation -> never "stable"
             (b) something covering the tabs -> hit-target fails
             (c) the page stopped rendering (rAF dead) -> both
   We reproduce, then inspect getAnimations(), elementFromPoint and rAF liveness. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1800);

const diag = async label => {
  const d = await p.evaluate(async () => {
    // is the page still painting? (rAF liveness)
    const rafAlive = await new Promise(res => {
      let done = false;
      requestAnimationFrame(() => { done = true; res(true); });
      setTimeout(() => { if (!done) res(false); }, 900);
    });
    const tab = document.querySelector('[data-tab="num"]');
    const r = tab ? tab.getBoundingClientRect() : null;
    const cx = r ? Math.round(r.left + r.width / 2) : 0;
    const cy = r ? Math.round(r.top + r.height / 2) : 0;
    const hit = r ? document.elementFromPoint(cx, cy) : null;
    const anims = document.getAnimations ? document.getAnimations() : [];
    const running = anims.filter(a => a.playState === 'running');
    return {
      rafAlive,
      tabRect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      hitTarget: hit ? `${hit.tagName.toLowerCase()}${hit.id ? '#' + hit.id : ''}${hit.className && typeof hit.className === 'string' ? '.' + hit.className.split(' ').filter(Boolean).slice(0, 2).join('.') : ''}` : null,
      hitIsTheTab: hit === tab || (tab && tab.contains(hit)),
      totalAnimations: anims.length,
      runningAnimations: running.length,
      runningDetail: running.slice(0, 8).map(a => {
        const t = a.effect && a.effect.target;
        const name = (a.animationName || (a.effect && a.effect.getKeyframes && 'css') || 'anim');
        return `${name} on ${t ? t.tagName.toLowerCase() + (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ')[0] : '') : '?'} [${a.playState}] iter=${a.effect?.getTiming?.().iterations}`;
      }),
      onPane: document.querySelector('.pane.on')?.id,
      activeTab: document.querySelector('.seg button.on')?.getAttribute('data-tab'),
      topic: TopicRegistry.current().id,
      bodyKids: document.body.children.length,
      // any full-viewport overlay sitting on top?
      topAtCenter: (() => { const e = document.elementFromPoint(640, 450); return e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') : null; })(),
    };
  });
  console.log(`\n--- ${label} ---`);
  console.log('  rAF alive        :', d.rafAlive, d.rafAlive ? '' : '  *** PAGE IS NOT PAINTING ***');
  console.log('  onPane/activeTab :', d.onPane, '/', d.activeTab, '  topic:', d.topic);
  console.log('  #num tab rect    :', JSON.stringify(d.tabRect));
  console.log('  hit target       :', d.hitTarget, d.hitIsTheTab ? '(the tab -- clickable)' : '*** COVERED ***');
  console.log('  animations       : total=' + d.totalAnimations + ' running=' + d.runningAnimations);
  if (d.runningDetail.length) d.runningDetail.forEach(x => console.log('      ', x));
  console.log('  body children    :', d.bodyKids, ' elem at viewport centre:', d.topAtCenter);
  return d;
};

await diag('BASELINE (fresh load)');

const ids = await p.evaluate(() => TopicRegistry.ids());
// reproduce matrix3's exact drive: every topic, every pane
const panes = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'];
let stalledAt = -1;

for (let i = 0; i < ids.length; i++) {
  await p.evaluate(id => TopicRegistry.setTopic(id), ids[i]);
  await p.waitForTimeout(70);
  for (const v of panes) {
    await p.evaluate(view => window.switchTab(view), v);
    await p.waitForTimeout(v === 'viz' ? 380 : 45);
  }
  // after each topic, is the tab still clickable?
  if (stalledAt < 0) {
    const clickable = await p.locator('[data-tab="num"]').first().click({ timeout: 1200, trial: true })
      .then(() => true).catch(() => false);
    if (!clickable) {
      stalledAt = i;
      console.log(`\n*** TAB BAR WENT UNCLICKABLE after topic #${i} (${ids[i]}) ***`);
      await diag(`STALLED (after ${i + 1} topics, ${(i + 1) * 10} pane switches)`);
      await p.screenshot({ path: `${SHOTS}/blocked-stalled.png` });
    }
  }
}
console.log('\nstalled at topic index:', stalledAt);
await diag('END OF RUN (all 46 topics)');
await p.screenshot({ path: `${SHOTS}/blocked-end.png` });

// Does it RECOVER if we just wait?
await p.waitForTimeout(4000);
await diag('AFTER WAITING 4s');

// bodyKids growth check -- is the DOM leaking nodes per topic switch?
const leak = await p.evaluate(() => ({
  body: document.body.children.length,
  vtPseudo: !!document.querySelector('::view-transition'),
  allEls: document.querySelectorAll('*').length,
}));
console.log('\nDOM size at end:', JSON.stringify(leak));

await b.close();
