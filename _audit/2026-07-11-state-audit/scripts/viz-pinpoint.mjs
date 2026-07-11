// Pinpoint WHERE the visual data stops flowing: registry -> topic-protocol -> pane.
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await p.goto(URL + '#/kafka-internals/viz', { waitUntil: 'load' });
await p.waitForTimeout(3000);

const r = await p.evaluate(() => {
  const R = window.TopicRegistry;
  const cur = R.current && R.current();
  const kafka = R.get && R.get('kafka-internals');
  const pane = document.querySelector('deep-visual');
  return {
    // A. did the topic actually switch?
    currentTopicId: cur ? cur.id : '(none)',
    hash: location.hash,
    // B. does the REGISTRY hold the visual?
    registryHasKafka: !!kafka,
    registryKafkaDataKeys: kafka && kafka.data ? Object.keys(kafka.data) : null,
    registryKafkaVisual: kafka && kafka.data && kafka.data.visual ? 'PRESENT' : 'MISSING',
    // C. does the CURRENT topic hold the visual?
    currentDataKeys: cur && cur.data ? Object.keys(cur.data) : null,
    currentVisual: cur && cur.data && cur.data.visual ? 'PRESENT' : 'MISSING',
    // D. did the PANE element get it?
    paneExists: !!pane,
    paneData: pane ? (pane._data ? 'PRESENT' : 'NULL/UNDEFINED') : 'no pane el',
    paneActive: pane ? pane._active : null,
    paneInst: pane ? !!pane._inst : null,
    // E. the raw global still there?
    globalVisual: typeof window.TOPIC_KI_VISUAL,
  };
});
console.log(JSON.stringify(r, null, 1));
console.log('errors:', errors.length, errors.slice(0, 4));
await b.close();
