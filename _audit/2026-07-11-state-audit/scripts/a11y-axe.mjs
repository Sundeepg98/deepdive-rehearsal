/* a11y-axe.mjs -- axe-core sweep across panes, topics, overlays, themes, viewports. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const SHOTS = path.join(OUT, 'shots', 'a11y');
fs.mkdirSync(SHOTS, { recursive: true });
const AXE = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const results = [];

async function runAxe(p, name, note = '') {
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async (tags) => {
    const res = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags },
      resultTypes: ['violations'],
    });
    return res.violations.map(v => ({
      id: v.id, impact: v.impact, help: v.help, tags: v.tags.filter(t => t.startsWith('wcag') || t === 'best-practice'),
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 6).map(n => ({
        sel: Array.isArray(n.target) ? n.target.join(' >>> ') : String(n.target),
        summary: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 220),
        html: (n.html || '').replace(/\s+/g, ' ').slice(0, 140),
      })),
    }));
  }, TAGS);
  results.push({ scenario: name, note, violations: r });
  const tot = r.reduce((a, v) => a + v.nodes, 0);
  console.log(`[${name}] ${r.length} rules / ${tot} nodes` + (r.length ? ': ' + r.map(v => `${v.id}(${v.impact},${v.nodes})`).join(' ') : ''));
  return r;
}

// clear localStorage so we get a deterministic first-run
async function fresh(p, { theme = null, seenBoot = false } = {}) {
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(([t, seen]) => {
    localStorage.clear();
    if (t) localStorage.setItem('ddr.v1.theme', JSON.stringify(t));
    if (seen) {
      // simulate a returning user so the app boots straight into the shell
      localStorage.setItem('ddr.v1.viewseen.content-pipeline', JSON.stringify(['walk']));
      localStorage.setItem('ddr.v1.lastvisit', JSON.stringify({ topic: 'content-pipeline', view: 'walk', at: Date.now() }));
    }
  }, [theme, seenBoot]);
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
}

const b = await chromium.launch();
const errs = [];

// ---------- DESKTOP, LIGHT ----------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));

  // 1. FIRST RUN (default load, no localStorage)
  await fresh(p);
  await p.screenshot({ path: path.join(SHOTS, '01-first-run-default.png') });
  await runAxe(p, 'first-run (default load, index overlay open)');

  // dismiss the index overlay -> app shell
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close());
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(SHOTS, '02-app-shell-walk.png') });
  await runAxe(p, 'app-shell walk (light, 1440)');

  // 2. EVERY PANE
  for (const pane of PANES) {
    await p.evaluate(v => window.switchTab(v), pane);
    await p.waitForTimeout(450);
    await runAxe(p, `pane:${pane} (light, 1440)`);
  }
  await p.evaluate(() => window.switchTab('walk'));

  // 3. SEVERAL TOPICS (walk + drill on each)
  const topicIds = await p.evaluate(() => window.TopicRegistry.ids());
  console.log('TOPIC COUNT:', topicIds.length);
  const sampleTopics = [topicIds[3], topicIds[12], topicIds[25], topicIds[40]].filter(Boolean);
  for (const t of sampleTopics) {
    await p.evaluate(id => window.TopicRegistry.setTopic(id), t);
    await p.waitForTimeout(500);
    for (const v of ['walk', 'drill', 'sys', 'num']) {
      await p.evaluate(vv => window.switchTab(vv), v);
      await p.waitForTimeout(350);
      await runAxe(p, `topic:${t} pane:${v}`);
    }
  }
  await p.evaluate(id => window.TopicRegistry.setTopic(id), topicIds[0]);
  await p.evaluate(() => window.switchTab('walk'));
  await p.waitForTimeout(400);

  // 4. EVERY OVERLAY
  const OVERLAYS = [
    ['mock-run', '#mockopen', '#mockov'],
    ['mixed-fire', '#mixopen', '#mixov'],
    ['cram-sheet', '#cramopen', '#cramov'],
    ['session', '#sessopen', '#sessov'],
    ['keyboard', '#keyopen', '#keyov'],
    ['scope', '#scopeopen', '#scopeov'],
    ['gameplan', '#planopen', '#planov'],
  ];
  for (const [name, trigger, ov] of OVERLAYS) {
    await p.evaluate(sel => { const el = document.querySelector(sel); if (el) el.click(); }, trigger);
    await p.waitForTimeout(600);
    const open = await p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.classList.contains('open') : false; }, ov);
    if (!open) { console.log(`!! overlay ${name} did NOT open via ${trigger}`); continue; }
    await p.screenshot({ path: path.join(SHOTS, `ov-${name}.png`) });
    await runAxe(p, `overlay:${name} OPEN`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    const stillOpen = await p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.classList.contains('open') : false; }, ov);
    if (stillOpen) {
      console.log(`!! ESCAPE FAILED to close overlay ${name} (${ov})`);
      await p.evaluate(sel => { const e = document.querySelector(sel); const x = e && e.querySelector('.mock-x,.cram-x,.ix-x'); if (x) x.click(); }, ov);
      await p.waitForTimeout(400);
    }
  }

  // lazily-built overlays
  const LAZY = [
    ['index', () => window.IndexOverlay.open(), () => window.IndexOverlay.isOpen()],
    ['search', () => window.SearchOverlay.open(), () => window.SearchOverlay.isOpen()],
    ['notes', () => window.NotesOverlay.open(), () => window.NotesOverlay.isOpen()],
  ];
  for (const [name] of LAZY) {
    const ok = await p.evaluate(n => {
      const api = { index: window.IndexOverlay, search: window.SearchOverlay, notes: window.NotesOverlay }[n];
      if (!api) return false; api.open(); return true;
    }, name);
    if (!ok) { console.log(`!! lazy overlay ${name} has no API`); continue; }
    await p.waitForTimeout(650);
    await p.screenshot({ path: path.join(SHOTS, `ov-${name}.png`) });
    await runAxe(p, `overlay:${name} OPEN`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(450);
    const still = await p.evaluate(n => {
      const api = { index: window.IndexOverlay, search: window.SearchOverlay, notes: window.NotesOverlay }[n];
      return api.isOpen();
    }, name);
    if (still) {
      console.log(`!! ESCAPE FAILED to close lazy overlay ${name}`);
      await p.evaluate(n => { const api = { index: window.IndexOverlay, search: window.SearchOverlay, notes: window.NotesOverlay }[n]; api.close(); }, name);
      await p.waitForTimeout(300);
    }
  }
  await p.close();
}

// ---------- DESKTOP, DARK ----------
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  p.on('pageerror', e => errs.push('PAGE-ERROR(dark): ' + e.message));
  await fresh(p, { theme: 'dark' });
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close());
  await p.waitForTimeout(500);
  const th = await p.evaluate(() => document.documentElement.dataset.theme);
  console.log('DARK THEME ACTIVE?', th);
  await p.screenshot({ path: path.join(SHOTS, '10-dark-walk.png') });
  await runAxe(p, 'DARK app-shell walk');
  for (const pane of PANES) {
    await p.evaluate(v => window.switchTab(v), pane);
    await p.waitForTimeout(400);
    await runAxe(p, `DARK pane:${pane}`);
  }
  // a couple of overlays in dark
  for (const [name, trigger, ov] of [['cram-sheet', '#cramopen', '#cramov'], ['session', '#sessopen', '#sessov'], ['mock-run', '#mockopen', '#mockov']]) {
    await p.evaluate(sel => document.querySelector(sel).click(), trigger);
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(SHOTS, `dark-ov-${name}.png`) });
    await runAxe(p, `DARK overlay:${name}`);
    await p.evaluate(sel => { const e = document.querySelector(sel); const x = e.querySelector('.mock-x,.cram-x'); if (x) x.click(); }, ov);
    await p.waitForTimeout(400);
  }
  await p.close();
}

// ---------- MOBILE 390 ----------
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push('PAGE-ERROR(mobile): ' + e.message));
  await fresh(p);
  await p.screenshot({ path: path.join(SHOTS, '20-mobile-first-run.png') });
  await runAxe(p, 'MOBILE390 first-run');
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close());
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(SHOTS, '21-mobile-walk.png') });
  await runAxe(p, 'MOBILE390 app-shell walk');
  // tools sheet open
  await p.evaluate(() => document.getElementById('toolsfab').click());
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(SHOTS, '22-mobile-tools-open.png') });
  await runAxe(p, 'MOBILE390 tools sheet OPEN');
  await p.close();
}

fs.writeFileSync(path.join(OUT, 'scripts', 'axe-raw.json'), JSON.stringify(results, null, 2));

// ---------- AGGREGATE ----------
const agg = new Map();
for (const r of results) {
  for (const v of r.violations) {
    if (!agg.has(v.id)) agg.set(v.id, { id: v.id, impact: v.impact, help: v.help, tags: v.tags, maxNodes: 0, scenarios: [], targets: new Set() });
    const a = agg.get(v.id);
    a.maxNodes = Math.max(a.maxNodes, v.nodes);
    a.scenarios.push(`${r.scenario}(${v.nodes})`);
    v.targets.forEach(t => a.targets.add(t.sel + ' :: ' + t.html));
  }
}
console.log('\n================ AGGREGATE VIOLATIONS ================');
const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const sorted = [...agg.values()].sort((x, y) => (order[x.impact] ?? 9) - (order[y.impact] ?? 9));
for (const a of sorted) {
  console.log(`\n### ${a.id}  [${a.impact}]  ${a.tags.join(',')}`);
  console.log(`    ${a.help}`);
  console.log(`    hit in ${a.scenarios.length}/${results.length} scenarios, max ${a.maxNodes} nodes`);
  console.log(`    scenarios: ${a.scenarios.slice(0, 8).join(', ')}${a.scenarios.length > 8 ? ' ...' : ''}`);
  [...a.targets].slice(0, 8).forEach(t => console.log(`      - ${t}`));
}
if (!sorted.length) console.log('NO VIOLATIONS ACROSS ALL SCENARIOS');
console.log('\n================ RUNTIME ERRORS ================');
if (errs.length) [...new Set(errs)].forEach(e => console.log(e)); else console.log('(none)');
console.log(`\nScenarios run: ${results.length}`);
await b.close();
