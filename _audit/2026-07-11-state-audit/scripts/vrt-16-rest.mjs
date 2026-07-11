/* VERIFY F4 (companion staleness+leak), F5 (mbeat-l gutter), F6 (tn-current), F8 (msel tracks).
   Normal motion; animations settled explicitly. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
/* await only FINITE animations — activePulse/loadShimmer/headingShift are `infinite`
   and their .finished promise never resolves. */
const settle = () => p.evaluate(() => Promise.all(
  document.getAnimations()
    .filter(a => { const t = a.effect && a.effect.getTiming && a.effect.getTiming(); return t && t.iterations !== Infinity; })
    .map(a => a.finished.catch(() => {}))
));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);
const topics = await p.evaluate(() => window.TopicRegistry.ids());
const VIEWS = ['walk','drill','wb','sys','trade','model','num','rf','open'];
const HAND = new Set(['authz','aws-hardening','content-pipeline','desired-state','eav','iac','notifications','signing']);

/* ---------------- F4a: TOPIC_CMP_NOTES coverage ---------------- */
let have = 0, miss = 0; const perTopic = {};
for (const t of topics) {
  await p.goto(URL + '#' + t + '/walk', { waitUntil: 'load' });
  await p.waitForTimeout(90);
  const keys = await p.evaluate(() => Object.keys(window.TOPIC_CMP_NOTES || {}));
  perTopic[t] = keys;
  for (const v of VIEWS) (keys.includes(v) ? have++ : miss++);
}
console.log('=== F4a: companion-note coverage over 46x9 = 414 pairs ===');
console.log('  pairs WITH a note :', have);
console.log('  pairs WITHOUT     :', miss, '=', (miss / (topics.length * VIEWS.length) * 100).toFixed(1) + '%   [lens said 266 = 64.3%]');
const md = topics.filter(t => !HAND.has(t)), hand = topics.filter(t => HAND.has(t));
console.log('  md topics    key sets:', JSON.stringify([...new Set(md.map(t => perTopic[t].slice().sort().join('+')))]));
console.log('  hand topics  key sets:', JSON.stringify([...new Set(hand.map(t => perTopic[t].slice().sort().join('+')))]));

/* ---------------- F4b: FRESH-LOAD staleness (wrong view) ---------------- */
console.log('\n=== F4b: fresh load of #storage-engines/num — what does the companion say? ===');
await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p.waitForTimeout(700); await settle();
console.log(JSON.stringify(await p.evaluate(() => ({
  activeTab: document.querySelector('.sidebar .seg button.on')?.getAttribute('data-tab'),
  cmpView: document.getElementById('cmpView')?.textContent,
  cmpNote: document.getElementById('cmpNote')?.textContent?.slice(0, 90),
  hasNumNote: !!(window.TOPIC_CMP_NOTES || {}).num,
})), null, 1));

/* ---------------- F4c: IN-SESSION cross-topic LEAK ---------------- */
console.log('\n=== F4c: in-session leak — land on authz/sys, then setTopic("caching") ===');
await p.goto(URL + '#authz/sys', { waitUntil: 'load' });
await p.waitForTimeout(700); await settle();
const step1 = await p.evaluate(() => ({
  topic: window.TopicRegistry.current()?.id,
  cmpNote: document.getElementById('cmpNote')?.textContent?.slice(0, 95),
  cmpMove: document.getElementById('cmpMove')?.textContent?.slice(0, 70),
}));
console.log(' step1 (authz/sys):', JSON.stringify(step1, null, 1));
await p.evaluate(() => window.TopicRegistry.setTopic('caching'));
await p.waitForTimeout(800); await settle();
const step2 = await p.evaluate(() => ({
  topic: window.TopicRegistry.current()?.id,
  cmpTopic: document.querySelector('.cmp-topic')?.textContent,
  cmpNote: document.getElementById('cmpNote')?.textContent?.slice(0, 95),
  cmpMove: document.getElementById('cmpMove')?.textContent?.slice(0, 70),
  cachingHasSys: !!(window.TOPIC_CMP_NOTES || {}).sys,
}));
console.log(' step2 (now caching/sys):', JSON.stringify(step2, null, 1));
console.log(' >>> LEAK?', step2.cmpNote === step1.cmpNote && step1.cmpNote
  ? 'YES — cmpNote is byte-identical to authz\'s while rehearsing ' + step2.cmpTopic
  : 'NO — note changed');

/* ---------------- F5 + F8: model answers ---------------- */
console.log('\n=== F5/F8: model pane — mbeat-l label lines & msel tracks (@1440) ===');
await p.setViewportSize({ width: 1440, height: 900 });
const model = [];
for (const t of topics) {
  await p.goto(URL + '#' + t + '/model', { waitUntil: 'load' });
  await p.waitForTimeout(120);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-model-answers')?.shadowRoot;
    if (!sr) return null;
    const msel = sr.querySelector('.msel');
    const tabs = msel ? msel.querySelectorAll('button').length : 0;
    const tracks = msel ? getComputedStyle(msel).gridTemplateColumns.split(' ').length : 0;
    const labels = [...sr.querySelectorAll('.mbeat-l')].map(l => {
      const lh = parseFloat(getComputedStyle(l).lineHeight) || 12;
      return { chars: l.textContent.trim().length, lines: Math.round(l.getBoundingClientRect().height / lh), w: Math.round(l.getBoundingClientRect().width) };
    });
    return { tabs, tracks, labelW: labels[0]?.w, maxChars: Math.max(0, ...labels.map(l => l.chars)), maxLines: Math.max(0, ...labels.map(l => l.lines)) };
  });
  if (r) model.push({ t, hand: HAND.has(t), ...r });
}
const tabDist = {}; model.forEach(m => tabDist[m.tabs] = (tabDist[m.tabs] || 0) + 1);
console.log(' tab-count distribution:', JSON.stringify(tabDist), '   [lens: {2:38, 9:8}]');
console.log(' .msel grid tracks     :', JSON.stringify([...new Set(model.map(m => m.tracks))]), '  [lens: hardcoded 3]');
console.log(' 2-tab topics in a 3-track grid:', model.filter(m => m.tabs === 2 && m.tracks === 3).length);
console.log(' .mbeat-l rendered width:', [...new Set(model.map(m => m.labelW))].join(','), 'px  [lens: fixed 76px]');
console.log(' topics with a label wrapping to >=4 lines:', model.filter(m => m.maxLines >= 4).length, '/46   [lens said 34/46]');
console.log(' topics with every label <=2 lines        :', model.filter(m => m.maxLines <= 2).length, '/46   [lens said 3/46]');
model.sort((a, c) => c.maxChars - a.maxChars);
console.log(' worst labels:', model.slice(0, 5).map(m => `${m.t}(${m.maxChars}ch->${m.maxLines}ln)`).join(', '), '  [lens: stream-batch-processing 143ch->17ln]');

/* ---------------- F6: sidebar topic pill ---------------- */
console.log('\n=== F6: .tn-current truncation ===');
for (const w of [1024, 1280, 1440, 1920]) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.goto(URL + '#storage-engines/walk', { waitUntil: 'load' });
  await p.waitForTimeout(250); await settle();
  const r = await p.evaluate(() => {
    const cur = document.getElementById('tncurrent') || document.querySelector('.tn-current');
    const eb = document.querySelector('.tn-eyebrow');
    const trig = document.getElementById('tntrigger');
    const nav = document.querySelector('nav.topic-nav') || document.getElementById('topicnav');
    if (!cur) return { err: 'no .tn-current' };
    return {
      curW: Math.round(cur.getBoundingClientRect().width),
      curScrollW: cur.scrollWidth,
      text: cur.textContent.trim(),
      truncated: cur.scrollWidth > cur.clientWidth + 1,
      eyebrowW: eb ? Math.round(eb.getBoundingClientRect().width) : -1,
      eyebrowText: eb ? eb.textContent.trim() : '',
      triggerW: trig ? Math.round(trig.getBoundingClientRect().width) : -1,
      navW: nav ? Math.round(nav.getBoundingClientRect().width) : -1,
      title: cur.getAttribute('title'),
    };
  });
  console.log(` vw ${w}: .tn-current ${r.curW}px shown / ${r.curScrollW}px needed ("${r.text}") truncated=${r.truncated} | .tn-eyebrow "${r.eyebrowText}" = ${r.eyebrowW}px | trigger ${r.triggerW}px | title=${r.title}`);
}
await b.close();
