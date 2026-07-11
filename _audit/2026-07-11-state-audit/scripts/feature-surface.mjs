import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/feature-surface';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);

// ---------- 0. Boot: the Topic Index auto-opens as the start screen (index-overlay.js:427) ----------
const bootIndexOpen = await p.evaluate(() => !!window.IndexOverlay && window.IndexOverlay.isOpen());
await p.screenshot({ path: `${SHOTS}/boot-00-index-autoopens.png` });
await p.evaluate(() => window.IndexOverlay.close());
await p.waitForTimeout(500);

// ---------- 1. Registry inventory ----------
const inv = await p.evaluate(() => {
  const ids = TopicRegistry.ids();
  const withVisual = ids.filter(i => { const t = TopicRegistry.get(i); return !!(t && t.data && t.data.visual); });
  const dataKeys = {};
  ids.forEach(i => { const t = TopicRegistry.get(i); Object.keys(t.data || {}).forEach(k => dataKeys[k] = (dataKeys[k] || 0) + 1); });
  return {
    nTopics: ids.length,
    first: ids[0],
    dataKeysPerTopic: dataKeys,
    topicsWithVisual: withVisual,
    groups: (typeof TOPIC_GROUPS !== 'undefined') ? TOPIC_GROUPS.map(g => g.id) : [],
    orderLen: (typeof TOPIC_ORDER !== 'undefined') ? TOPIC_ORDER.length : -1,
    totalsField: [...new Set(ids.map(i => TopicRegistry.get(i).identity.total))],
    globals: ['Store','Progress','Bookmarks','Router','ViewManager','SearchOverlay','IndexOverlay','NotesOverlay','CrossDrill','PrintQA','TourGuide','FocusMode','Density','LastVisit','ViewTransitions','VisualKit']
      .filter(g => typeof window[g] !== 'undefined'),
  };
});

// ---------- 2. Seg tabs (the panes) ----------
const tabs = await p.$$eval('.seg button', els => els.map(e => ({
  tab: e.dataset.tab, label: e.querySelector('span:not(.n)')?.textContent,
  kicker: e.querySelector('.n')?.textContent, hidden: e.hidden,
})));

// ---------- 3. Tools bar (mockbar) entry points ----------
const tools = await p.$$eval('.mockbar button, .mockcta button', els => els.map(e => ({
  id: e.id, text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70),
})));

// ---------- 4. Overlays present in DOM ----------
const overlays = await p.$$eval('[role="dialog"]', els => els.map(e => ({ id: e.id, label: e.getAttribute('aria-label') })));

// ---------- 5. RAIL: switchTab railPos only covers 4 of 10 views ----------
const railByView = {};
for (const v of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
  await p.evaluate(t => window.Router.navigate(t), v);
  await p.waitForTimeout(120);
  railByView[v] = await p.$eval('#rail', e => e.style.width || '(empty)');
}

// ---------- 6. CRAM SHEET on the DEFAULT topic (content-pipeline) ----------
await p.evaluate(() => window.Router.navigate('walk'));
await p.waitForTimeout(150);
await p.click('#cramopen');
await p.waitForTimeout(500);
const cramCP = await p.evaluate(() => ({
  title: document.querySelector('#cramov .cram-title')?.textContent.trim(),
  body: (document.querySelector('deep-cram')?.shadowRoot?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 190),
}));
await p.screenshot({ path: `${SHOTS}/cram-01-content-pipeline.png` });
await p.click('#cramx');
await p.waitForTimeout(400);

// ---------- 7. SWITCH TOPIC -> kafka-internals, re-open cram + scope ----------
await p.evaluate(() => TopicRegistry.setTopic('kafka-internals'));
await p.waitForTimeout(700);
const kafkaHdr = await p.$eval('.hdr h1', e => e.textContent.trim());
const vizTabAfter = await p.$eval('.seg button[data-tab="viz"]', e => e.hidden);

await p.click('#cramopen');
await p.waitForTimeout(500);
const cramKafka = await p.evaluate(() => ({
  title: document.querySelector('#cramov .cram-title')?.textContent.trim(),
  body: (document.querySelector('deep-cram')?.shadowRoot?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 190),
}));
await p.screenshot({ path: `${SHOTS}/cram-02-kafka-STALE.png` });
await p.click('#cramx');
await p.waitForTimeout(400);

await p.click('#scopeopen');
await p.waitForTimeout(500);
const scopeKafka = await p.evaluate(() => ({
  title: document.querySelector('#scopeov .cram-title')?.textContent.trim(),
  body: (document.querySelector('deep-scope')?.shadowRoot?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 190),
}));
await p.screenshot({ path: `${SHOTS}/scope-kafka-STALE.png` });
await p.click('#scopex');
await p.waitForTimeout(400);

// ---------- 8. VIZ pane on kafka ----------
await p.evaluate(() => window.Router.navigate('viz'));
await p.waitForTimeout(1600);
const vizState = await p.evaluate(() => ({
  paneOn: document.getElementById('viz')?.classList.contains('on'),
  hash: location.hash,
  vizInstance: !!window.__VIZ,
  canvas: !!document.querySelector('deep-visual')?.shadowRoot?.querySelector('canvas'),
  cmpView: document.getElementById('cmpView')?.textContent,
  cmpNoteHasVizKey: (typeof TOPIC_CMP_NOTES !== 'undefined') ? Object.keys(TOPIC_CMP_NOTES) : [],
}));
await p.screenshot({ path: `${SHOTS}/viz-pane-kafka.png` });

// ---------- 9. Session report title (hard-coded?) ----------
const sessReport = await p.evaluate(() => {
  buildSessReport();
  const el = document.getElementById('sessreport');
  return {
    reportTitle: el.querySelector('.sr-ttl')?.textContent,
    reportFoot: el.querySelector('.sr-foot')?.textContent?.slice(0, 90),
    identityReportTitle: TopicRegistry.current().identity.reportTitle,
    sessionCode: encodeSession(),
  };
});

// ---------- 10. Density (keyboard 'd', no UI, no persist) ----------
await p.evaluate(() => window.Router.navigate('walk'));
await p.waitForTimeout(150);
await p.keyboard.press('d');
await p.waitForTimeout(120);
const dens1 = await p.evaluate(() => document.documentElement.dataset.density || '(none)');
const densUI = await p.evaluate(() => !!document.querySelector('[data-density-control],#densitytog,.density-btn'));

// ---------- 11. localStorage keys ----------
const lsKeys = await p.evaluate(() => Object.keys(localStorage).sort());

// ---------- 12. Sidebar widgets ----------
const widgets = await p.evaluate(() => ({
  textzoom: !!document.getElementById('textzoom'),
  pomodoro: !!document.getElementById('pomodoro'),
  scrolltop: !!document.getElementById('scrolltop'),
  focusBtn: !!document.getElementById('_focus-toggle'),
  cmpFold: !!document.querySelector('.cmp-fold'),
  cmpReopen: !!document.querySelector('.cmp-reopen'),
}));

console.log(JSON.stringify({
  bootIndexOpen, inv, tabs, tools, overlays, railByView,
  cramCP, cramKafka, scopeKafka, kafkaHdr, vizTabAfter, vizState,
  sessReport, density: { afterKeyD: dens1, hasUIControl: densUI }, lsKeys, widgets, errs,
}, null, 2));

await b.close();
