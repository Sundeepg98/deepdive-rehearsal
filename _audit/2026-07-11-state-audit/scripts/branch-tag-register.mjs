// Smoke the CURRENT built artifact, to establish that master's deliverable is
// healthy -- i.e. a good artifact exists; the broken CI is the only reason the
// live gh-pages site is 183 commits stale.
import { chromium } from 'playwright';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/branch-tag-register';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2500);

// Ground truth about what this artifact actually is
const info = await p.evaluate(() => {
  const topics = (window.TOPIC_ORDER && window.TOPIC_ORDER.length)
    || (window.TOPICS && Object.keys(window.TOPICS).length) || null;
  const panes = document.querySelectorAll('[id^="pane-"], .pane, section[id]').length;
  return {
    title: document.title,
    topicCount: topics,
    customEls: ['deep-trade-offs','deep-model-answers','deep-system-map','deep-whiteboard','deep-red-flags']
      .filter(t => customElements.get(t)).length,
    bodyText: document.body.innerText.slice(0, 90).replace(/\s+/g, ' '),
    paneNodes: panes,
  };
});

await p.screenshot({ path: `${OUT}/dist-artifact-healthy.png` });
console.log('--- current built artifact (dist/index.html) ---');
console.log(JSON.stringify(info, null, 2));
console.log('console/page errors:', errs.length ? errs : 'NONE');
console.log('shot:', `${OUT}/dist-artifact-healthy.png`);
await b.close();
