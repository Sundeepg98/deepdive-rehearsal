import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/feature-surface';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 980 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.evaluate(() => window.IndexOverlay.close());
await p.waitForTimeout(400);

// EVIDENCE 1: cram sheet on Caching Strategies -> Content Pipeline body
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(700);
await p.click('#cramopen');
await p.waitForTimeout(700);
await p.screenshot({ path: `${S}/EVIDENCE-cram-caching-shows-content-pipeline.png` });
await p.click('#cramx'); await p.waitForTimeout(450);

// EVIDENCE 2: Scope it first on Caching -> file-ingestion questions
await p.click('#scopeopen');
await p.waitForTimeout(700);
await p.screenshot({ path: `${S}/EVIDENCE-scope-caching-shows-file-ingestion.png` });
await p.click('#scopex'); await p.waitForTimeout(450);

// EVIDENCE 3: companion stale — go walk then Numbers, companion still says "Probe Drill"
await p.evaluate(() => window.Router.navigate('drill')); await p.waitForTimeout(300);
await p.evaluate(() => window.Router.navigate('num'));  await p.waitForTimeout(500);
await p.screenshot({ path: `${S}/EVIDENCE-companion-stale-numbers-says-probe-drill.png` });

// EVIDENCE 4: the viz pane on a topic with no visual (via the undocumented 'v' key)
await p.keyboard.press('v');
await p.waitForTimeout(700);
await p.screenshot({ path: `${S}/EVIDENCE-viz-empty-pane-vkey.png` });

// EVIDENCE 5: kafka-internals viz — the one topic where it works
await p.evaluate(() => TopicRegistry.setTopic('kafka-internals'));
await p.waitForTimeout(800);
await p.evaluate(() => window.Router.navigate('viz'));
await p.waitForTimeout(2200);
await p.screenshot({ path: `${S}/EVIDENCE-viz-works-kafka-only.png` });

console.log('shots written');
await b.close();
