/* AXE MATRIX v2 — ANIMATION-SETTLED.

   v1 was WRONG and its wrongness is the point. The app fades in <body> (@keyframes bodyIn)
   and every pane (@keyframes panein). v1 sampled ~300ms after a pane switch — INSIDE the
   fade — so axe faithfully measured a transient blended frame and reported 12 "serious"
   colour-contrast violations that do not exist at rest. A pixel probe (calibrated against
   known ratios) showed the settled text is #6b6862 @ 4.71:1, i.e. PASSING, where axe
   mid-fade saw #73716b @ 4.17:1.

   v2 blocks on document.getAnimations() until every running animation is finished (this
   reaches into shadow trees in Chromium) before every single scan. Sampling a transitional
   frame is a check that reports a number nobody can read — the same family of error as
   certifying a blank page. */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const AXE = readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = `${OUT}/shots/axe`;
mkdirSync(SHOTS, { recursive: true });

const ROOMS = [
  ['messaging-events',          'event-driven'],
  ['data-storage',              'caching'],
  ['reliability-observability', 'retries-timeouts'],
  ['platform-infra',            'iac'],
  ['architecture-apis',         'state-machine'],
  ['security-tenancy',          'signing'],
];
const THEMES = ['light', 'dark'];
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'];
const OVERLAYS = [
  { key: 'cram', btn: 'cramopen', sel: '#cramov' }, { key: 'scope', btn: 'scopeopen', sel: '#scopeov' },
  { key: 'gameplan', btn: 'planopen', sel: '#planov' }, { key: 'keyboard', btn: 'keyopen', sel: '#keyov' },
  { key: 'mock', btn: 'mockopen', sel: '#mockov' }, { key: 'mixed', btn: 'mixopen', sel: '#mixov' },
  { key: 'session', btn: 'sessopen', sel: '#sessov' }, { key: 'index', btn: 'idxopen', sel: '#_index-overlay' },
  { key: 'search', btn: 'searchopen', sel: '#_search-overlay' }, { key: 'notes', btn: 'notesopen', sel: '#_notes-overlay' },
];

const findings = [], coverage = [], skipped = [];
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => skipped.push({ what: 'pageerror', detail: String(e).slice(0, 140) }));

/* THE FIX: block until nothing is animating. */
async function settle() {
  await page.evaluate(async () => {
    for (let i = 0; i < 60; i++) {
      const running = document.getAnimations().filter(a => a.playState === 'running');
      if (!running.length) break;
      try { await Promise.race([Promise.all(running.map(a => a.finished)), new Promise(r => setTimeout(r, 500))]); } catch (e) { /* cancelled */ }
    }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await page.waitForTimeout(120);
}
/* assert nothing is animating at scan time — if this ever trips, the scan is invalid */
async function assertStill(tag) {
  const n = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
  if (n > 0) skipped.push({ what: 'NOT-SETTLED', tag, running: n });
  return n === 0;
}

async function scan(room, theme, surface, rootSel) {
  await settle();
  await assertStill(`${room}/${theme}/${surface}`);
  let res;
  try {
    res = await page.evaluate(async (rs) => {
      const ctx = rs ? document.querySelector(rs) : document;
      if (!ctx) return { __missing: true };
      const r = await axe.run(ctx, { resultTypes: ['violations', 'incomplete'] });
      const pack = (bk) => r[bk].map(v => ({ rule: v.id, impact: v.impact, help: v.help,
        nodes: v.nodes.map(n => ({ target: n.target.flat().join(' >>> '), html: (n.html || '').slice(0, 130),
          msg: ((n.any && n.any[0] && n.any[0].message) || (n.all && n.all[0] && n.all[0].message) || ''),
          data: (n.any && n.any[0] && n.any[0].data) || null })) }));
      return { violations: pack('violations'), incomplete: pack('incomplete') };
    }, rootSel);
  } catch (e) { skipped.push({ room, theme, surface, err: String(e).slice(0, 110) }); return; }
  if (!res || res.__missing) { skipped.push({ room, theme, surface, err: 'root missing ' + rootSel }); return; }

  let vN = 0, iN = 0;
  for (const bk of ['violations', 'incomplete'])
    for (const v of res[bk])
      for (const n of v.nodes) {
        findings.push({ room, theme, surface, bucket: bk, rule: v.rule, impact: v.impact || 'n/a', help: v.help, target: n.target, html: n.html, msg: n.msg, data: n.data });
        bk === 'violations' ? vN++ : iN++;
      }
  coverage.push({ room, theme, surface, violations: vN, incomplete: iN });
  return { vN, iN };
}

async function closeOverlays() {
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelectorAll('[role=dialog].open').forEach(o => {
    const x = o.querySelector('.mock-x,.cram-x'); if (x) x.click(); o.classList.remove('open');
  }));
  await settle();
}

let totV = 0;
console.log('room                        theme  surface        viol  incompl');
console.log('-'.repeat(64));
for (const [room, topicId] of ROOMS) {
  for (const theme of THEMES) {
    await page.goto(URL, { waitUntil: 'load' });
    await settle();                                     // <-- lets bodyIn finish before anything
    await page.addScriptTag({ content: AXE });
    await page.evaluate((id) => TopicRegistry.setTopic(id), topicId);
    await settle();
    await page.evaluate((t) => { const de = document.documentElement; if ((de.dataset.theme || 'light') !== t) document.getElementById('themetog').click(); }, theme);
    await settle();

    const st = await page.evaluate(() => ({ g: document.documentElement.getAttribute('data-group'), t: document.documentElement.dataset.theme || 'light' }));
    if (st.g !== room || st.t !== theme) { skipped.push({ room, theme, err: `stamp ${st.g}/${st.t}` }); continue; }

    let r = await scan(room, theme, 'shell', null);
    totV += r?.vN || 0;
    console.log(`${room.padEnd(27)} ${theme.padEnd(6)} ${'shell'.padEnd(14)} ${String(r?.vN ?? '-').padStart(4)} ${String(r?.iN ?? '-').padStart(8)}`);

    for (const pane of PANES) {
      await page.evaluate((p) => { window.location.hash = '#' + p; }, pane);
      await settle();
      if (pane === 'drill') {
        await page.evaluate(() => {
          const dd = document.querySelector('#drill deep-drill'); if (!dd?.shadowRoot) return;
          const r = dd.shadowRoot, press = (id) => r.getElementById(id)?.click();
          for (let i = 0; i < 5; i++) { press('adv'); press(['jg', 'js', 'jm', 'jg', 'jg'][i]); }
        });
        await settle();
      }
      r = await scan(room, theme, 'pane:' + pane, '#' + pane);
      totV += r?.vN || 0;
      console.log(`${room.padEnd(27)} ${theme.padEnd(6)} ${('pane:' + pane).padEnd(14)} ${String(r?.vN ?? '-').padStart(4)} ${String(r?.iN ?? '-').padStart(8)}`);
    }

    await page.evaluate(() => { window.location.hash = '#walk'; });
    await settle();
    for (const ov of OVERLAYS) {
      await closeOverlays();
      const ok = await page.evaluate((o) => { const btn = document.getElementById(o.btn); if (!btn) return false; btn.click(); return true; }, ov);
      if (!ok) { skipped.push({ room, theme, surface: 'ov:' + ov.key, err: 'no trigger' }); continue; }
      await settle();
      const vis = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false;
        const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01; }, ov.sel);
      if (!vis) { skipped.push({ room, theme, surface: 'ov:' + ov.key, err: 'did not open' }); continue; }
      r = await scan(room, theme, 'ov:' + ov.key, ov.sel);
      totV += r?.vN || 0;
      console.log(`${room.padEnd(27)} ${theme.padEnd(6)} ${('ov:' + ov.key).padEnd(14)} ${String(r?.vN ?? '-').padStart(4)} ${String(r?.iN ?? '-').padStart(8)}`);
      if (room === 'architecture-apis') { try { await page.screenshot({ path: `${SHOTS}/ov-${ov.key}-${theme}.png` }); } catch {} }
    }
    await closeOverlays();
  }
}

writeFileSync(`${OUT}/axe-findings-settled.json`, JSON.stringify({ findings, coverage, skipped }, null, 2));
console.log('\n=== SUMMARY (animation-settled) ===');
console.log('surfaces scanned :', coverage.length);
console.log('violations       :', findings.filter(f => f.bucket === 'violations').length);
console.log('incomplete       :', findings.filter(f => f.bucket === 'incomplete').length);
console.log('not-settled scans:', skipped.filter(s => s.what === 'NOT-SETTLED').length, '(must be 0)');
console.log('skipped/errors   :', skipped.filter(s => s.what !== 'NOT-SETTLED').length);
if (skipped.length) console.log(JSON.stringify(skipped.slice(0, 10), null, 2));
await b.close();
