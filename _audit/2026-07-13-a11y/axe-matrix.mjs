/* AXE MATRIX — 6 rooms x 2 themes x (10 panes + 10 overlays), plus the shell.
   Harness proven live by negative-control.mjs (6/6 controls go red then green;
   color-contrast fires in BOTH light DOM and inside shadow roots).

   Captures violations AND incomplete. The `incomplete` bucket is NOT optional here:
   axe's color-contrast rule lands 100% of this app's text nodes in `incomplete`
   (pseudo-elements + gradients), so a violations-only report would silently certify
   the room system's colour work as clean while never having evaluated it once. */
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
  { key: 'cram',    btn: 'cramopen',   sel: '#cramov' },
  { key: 'scope',   btn: 'scopeopen',  sel: '#scopeov' },
  { key: 'gameplan',btn: 'planopen',   sel: '#planov' },
  { key: 'keyboard',btn: 'keyopen',    sel: '#keyov' },
  { key: 'mock',    btn: 'mockopen',   sel: '#mockov' },
  { key: 'mixed',   btn: 'mixopen',    sel: '#mixov' },
  { key: 'session', btn: 'sessopen',   sel: '#sessov' },
  { key: 'index',   btn: 'idxopen',    sel: '#_index-overlay' },
  { key: 'search',  btn: 'searchopen', sel: '#_search-overlay' },
  { key: 'notes',   btn: 'notesopen',  sel: '#_notes-overlay' },
];

const findings = [];      // flat: {room,theme,surface,bucket,rule,impact,target,html,msg}
const coverage = [];      // what we actually scanned
const skipped = [];

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => skipped.push({ what: 'pageerror', detail: String(e).slice(0, 160) }));

/* run axe scoped to a root selector (or whole document) */
async function scan(room, theme, surface, rootSel) {
  let res;
  try {
    res = await page.evaluate(async (rs) => {
      const ctx = rs ? document.querySelector(rs) : document;
      if (!ctx) return { __missing: true };
      const r = await axe.run(ctx, { resultTypes: ['violations', 'incomplete'] });
      const pack = (bucket) => r[bucket].map(v => ({
        rule: v.id, impact: v.impact, help: v.help,
        nodes: v.nodes.map(n => ({
          target: n.target.flat().join(' >>> '),
          html: (n.html || '').slice(0, 130),
          msg: ((n.any && n.any[0] && n.any[0].message) || (n.all && n.all[0] && n.all[0].message) || ''),
        })),
      }));
      return { violations: pack('violations'), incomplete: pack('incomplete') };
    }, rootSel);
  } catch (e) {
    skipped.push({ room, theme, surface, err: String(e).slice(0, 120) });
    return;
  }
  if (!res || res.__missing) { skipped.push({ room, theme, surface, err: 'root not found: ' + rootSel }); return; }

  let vN = 0, iN = 0;
  for (const bucket of ['violations', 'incomplete']) {
    for (const v of res[bucket]) {
      for (const n of v.nodes) {
        findings.push({ room, theme, surface, bucket, rule: v.rule, impact: v.impact || 'n/a', help: v.help, target: n.target, html: n.html, msg: n.msg });
        if (bucket === 'violations') vN++; else iN++;
      }
    }
  }
  coverage.push({ room, theme, surface, violations: vN, incomplete: iN });
  return { vN, iN };
}

async function setTheme(t) {
  await page.evaluate((want) => {
    const de = document.documentElement;
    if ((de.dataset.theme || 'light') !== want) document.getElementById('themetog').click();
  }, t);
  await page.waitForTimeout(120);
}
async function closeAllOverlays() {
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    document.querySelectorAll('[role=dialog].open').forEach(o => {
      const x = o.querySelector('.mock-x,.cram-x,[class*=close]'); if (x) x.click();
      o.classList.remove('open');
    });
  });
  await page.waitForTimeout(100);
}

console.log('room                        theme  surface      viol  incompl');
console.log('-'.repeat(66));

for (const [room, topicId] of ROOMS) {
  for (const theme of THEMES) {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    await page.addScriptTag({ content: AXE });
    await page.evaluate((id) => { if (typeof TopicRegistry !== 'undefined') TopicRegistry.setTopic(id); }, topicId);
    await page.waitForTimeout(400);
    await setTheme(theme);

    const stamped = await page.evaluate(() => ({
      g: document.documentElement.getAttribute('data-group'),
      t: document.documentElement.getAttribute('data-theme') || 'light',
    }));
    if (stamped.g !== room || stamped.t !== theme) {
      skipped.push({ room, theme, err: `stamp mismatch: got group=${stamped.g} theme=${stamped.t}` });
      continue;
    }

    // ---- SHELL / home surface: full-document scan (page-level rules live here) ----
    let r = await scan(room, theme, 'shell', null);
    console.log(`${room.padEnd(27)} ${theme.padEnd(6)} ${'shell'.padEnd(12)} ${String(r?.vN ?? '-').padStart(4)} ${String(r?.iN ?? '-').padStart(8)}`);

    // ---- PANES ----
    for (const pane of PANES) {
      await page.evaluate((p) => { window.location.hash = '#' + p; }, pane);
      await page.waitForTimeout(320);

      // The drill scoreboard is the surface that was REWORKED — drive it into a real
      // graded state (solid / revisit / left all non-zero) before scanning it.
      if (pane === 'drill') {
        await page.evaluate(() => {
          const dd = document.querySelector('#drill deep-drill'); if (!dd || !dd.shadowRoot) return;
          const r = dd.shadowRoot;
          const press = (id) => { const b = r.getElementById(id); if (b) b.click(); };
          for (let i = 0; i < 5; i++) {                 // grade a few probes: solid, shaky, missed
            press('adv');
            press(['jg', 'js', 'jm', 'jg', 'jg'][i]);
          }
        });
        await page.waitForTimeout(300);
      }
      r = await scan(room, theme, 'pane:' + pane, '#' + pane);
      console.log(`${room.padEnd(27)} ${theme.padEnd(6)} ${('pane:' + pane).padEnd(12)} ${String(r?.vN ?? '-').padStart(4)} ${String(r?.iN ?? '-').padStart(8)}`);
    }

    // ---- OVERLAYS (open) ----
    await page.evaluate(() => { window.location.hash = '#walk'; });
    await page.waitForTimeout(200);
    for (const ov of OVERLAYS) {
      await closeAllOverlays();
      const opened = await page.evaluate((o) => {
        const btn = document.getElementById(o.btn);
        if (!btn) return { ok: false, why: 'no trigger #' + o.btn };
        btn.click();
        return { ok: true };
      }, ov);
      if (!opened.ok) { skipped.push({ room, theme, surface: 'ov:' + ov.key, err: opened.why }); continue; }
      await page.waitForTimeout(420);

      const present = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return { there: false };
        const cs = getComputedStyle(el);
        return { there: true, visible: cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0' };
      }, ov.sel);
      if (!present.there || !present.visible) {
        skipped.push({ room, theme, surface: 'ov:' + ov.key, err: 'did not open/визible=' + JSON.stringify(present) });
        continue;
      }
      r = await scan(room, theme, 'ov:' + ov.key, ov.sel);
      console.log(`${room.padEnd(27)} ${theme.padEnd(6)} ${('ov:' + ov.key).padEnd(12)} ${String(r?.vN ?? '-').padStart(4)} ${String(r?.iN ?? '-').padStart(8)}`);

      // screenshot each overlay once per theme in the first room, for the record
      if (room === ROOMS[0][0]) {
        try { await page.screenshot({ path: `${SHOTS}/ov-${ov.key}-${theme}.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } }); } catch {}
      }
    }
    await closeAllOverlays();
  }
}

writeFileSync(`${OUT}/axe-findings.json`, JSON.stringify({ findings, coverage, skipped }, null, 2));
console.log('\n=== SUMMARY ===');
console.log('surfaces scanned :', coverage.length);
console.log('violations       :', findings.filter(f => f.bucket === 'violations').length);
console.log('incomplete       :', findings.filter(f => f.bucket === 'incomplete').length);
console.log('skipped          :', skipped.length);
if (skipped.length) console.log(JSON.stringify(skipped.slice(0, 12), null, 2));
await b.close();
