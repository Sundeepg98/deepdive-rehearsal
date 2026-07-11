#!/usr/bin/env node
/*
 * skeptic_browser_proof.cjs -- does the recovered content REACH A READER?
 *
 * Data in a JS object is not content until it renders. This drives the real built app in a real
 * browser and checks the six things that were broken, on all 46 topics (not a hand-picked few),
 * reading the REAL Shadow DOM.
 *
 *   1 SYSTEM MAP     stages actually render (they were empty on 38/46)
 *   2 UNDEFINED      the literal word "undefined" is gone from visible text
 *   3 JUMP BUTTONS   cross-topic jumps land on the topic the chip names
 *   4 COACHING RAIL  the rail shows THIS topic's note, not another topic's
 *   5 MOCK RUN       scored against the real beat count
 *   6 CONSOLE        zero page/console errors
 *
 *   node _audit/2026-07-11-compiler-parity/skeptic_browser_proof.cjs
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const HTML = path.join(__dirname, '..', '..', 'dist', 'index.html');
const SHOTS = path.join(__dirname, 'shots', 'proof');
const THE_8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];
const FOCUS = ['caching', 'sharding-strategies', 'idempotency', 'kafka-internals'];
fs.mkdirSync(SHOTS, { recursive: true });

const setTopic = async (page, id) => {
  await page.evaluate((i) => window.TopicProtocol ? TopicProtocol.setTopic(i) : TopicRegistry.setTopic(i), id);
  await page.waitForTimeout(180);
};
const showPane = async (page, tab) => {
  await page.click(`.sidebar .seg button[data-tab="${tab}"]`).catch(() => {});
  await page.waitForTimeout(160);
};

(async () => {
  const errs = [];
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto('file://' + HTML);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen && IndexOverlay.isOpen()) IndexOverlay.close(); });
  await page.waitForTimeout(300);

  const ids = await page.evaluate(() => TopicRegistry.ids());
  const R = { sys: [], undef: [], jump: [], rail: [], mock: [] };

  for (const id of ids) {
    await setTopic(page, id);

    // ---- 1 SYSTEM MAP: stages RENDER (read the real Shadow DOM) --------------------------
    await showPane(page, 'sys');
    const sys = await page.evaluate(() => {
      const el = document.querySelector('#sys deep-system-map');
      if (!el || !el.shadowRoot) return { err: 'no component' };
      const r = el.shadowRoot;
      // the stage element is .stg (system-map.js:70 sysRenderStage) -- NOT .st/.stage
      const stages = r.querySelectorAll('.stg');
      const cur = r.querySelectorAll('.stg.cur');
      // a stage is only REAL if it painted: non-zero box + visible text
      let painted = 0;
      stages.forEach((s) => {
        const b = s.getBoundingClientRect();
        if (b.width > 0 && b.height > 0 && (s.textContent || '').trim()) painted++;
      });
      const jumps = [...r.querySelectorAll('.piv-jump')].map((b) => b.dataset.goto);
      const chips = [...r.querySelectorAll('.chip')].map((c) => (c.textContent || '').trim());
      // pivot bodies: an answer that is blank means the chip swallowed it
      const blankBodies = [...r.querySelectorAll('.piv .pa')].filter((p) => (p.textContent || '').replace(/Jump to.*$/s, '').trim().length < 5).length;
      return { stagesRendered: stages.length, painted, cur: cur.length, jumps, chips, blankBodies };
    });
    R.sys.push({ id, ...sys });

    // ---- 2 UNDEFINED: sweep every pane's VISIBLE text, incl. shadow roots ----------------
    const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
    for (const p of PANES) {
      await showPane(page, p);
      const hits = await page.evaluate((pane) => {
        const host = document.querySelector('#' + pane);
        if (!host) return [];
        const texts = [];
        const grab = (root) => {
          root.querySelectorAll('*').forEach((el) => {
            if (el.shadowRoot) grab(el.shadowRoot);
            for (const n of el.childNodes) {
              if (n.nodeType === 3 && /\bundefined\b/.test(n.textContent)) {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) texts.push(n.textContent.trim().slice(0, 70));
              }
            }
          });
        };
        grab(host);
        return texts;
      }, p);
      hits.forEach((h) => R.undef.push({ id, pane: p, text: h }));
    }

    // ---- 4 COACHING RAIL: is it THIS topic's note? ---------------------------------------
    await showPane(page, 'sys');
    // cmpNotes[pane] is an ARRAY [viewTitle, note, move] (shell.js:238) -- #cmpNote is [1].
    // The rail shows the note for the ACTIVE pane, so compare against THAT pane's entry.
    const rail = await page.evaluate((tid) => {
      const noteEl = document.getElementById('cmpNote');
      const note = noteEl ? (noteEl.textContent || '').trim() : '';
      const activeBtn = document.querySelector('.sidebar .seg button.on, .sidebar .seg button[aria-selected="true"]');
      const tab = activeBtn ? activeBtn.getAttribute('data-tab') : 'sys';
      // Compare on letters/digits only. The data carries HTML entities (&rsquo;) that the DOM
      // renders as glyphs; stripping everything but alphanumerics makes the two sides comparable
      // without decoding entities (and without touching innerHTML).
      const norm = (s) => String(s).toLowerCase().replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/[^a-z0-9]+/g, '');
      const mine = (TopicRegistry.get(tid).identity.cmpNotes || {});
      const want = mine[tab] ? norm(mine[tab][1]) : null;
      const isMine = !!want && want === norm(note);
      let leakedFrom = null;
      if (!isMine && note) {
        for (const other of TopicRegistry.ids()) {
          if (other === tid) continue;
          const on = TopicRegistry.get(other).identity.cmpNotes || {};
          if (Object.values(on).some((v) => Array.isArray(v) && norm(v[1]) === norm(note))) { leakedFrom = other; break; }
        }
      }
      return { note: note.slice(0, 50), tab, isMine, leakedFrom, hasNote: !!note };
    }, id);
    R.rail.push({ id, ...rail });

    // ---- 5 MOCK RUN: scored against the REAL beat count -----------------------------------
    const mock = await page.evaluate((tid) => {
      const t = TopicRegistry.get(tid);
      const authored = ((t.data.bank || {}).mockBeats || []).length;
      const live = (typeof mockBeats !== 'undefined' && mockBeats) ? mockBeats.length : -1;
      return { authored, live };
    }, id);
    R.mock.push({ id, ...mock });
  }

  // ---- 3 JUMP BUTTONS: click EVERY ONE on all 46 and see where we actually land -----------
  // The old fused chip carried the ANSWER's prose, so resolveChipTarget's title fallback matched
  // topics merely MENTIONED in the answer -- spurious buttons that navigated out of topic. Click
  // every button that exists now and assert it lands where the chip points.
  const withJumps = R.sys.filter((r) => r.jumps && r.jumps.length).map((r) => r.id);
  for (const id of withJumps) {
    await setTopic(page, id);
    await showPane(page, 'sys');
    const n = await page.evaluate(() => {
      const r = document.querySelector('#sys deep-system-map').shadowRoot;
      r.querySelectorAll('.piv').forEach((d) => { d.open = true; });
      return r.querySelectorAll('.piv-jump').length;
    });
    for (let i = 0; i < n; i++) {
      await setTopic(page, id);
      await showPane(page, 'sys');
      const res = await page.evaluate((k) => {
        const r = document.querySelector('#sys deep-system-map').shadowRoot;
        r.querySelectorAll('.piv').forEach((d) => { d.open = true; });
        const btns = r.querySelectorAll('.piv-jump');
        const b = btns[k];
        if (!b) return null;
        const want = b.dataset.goto;
        const chip = b.closest('.piv').querySelector('.chip').textContent.trim();
        b.click();
        return { want, chip };
      }, i);
      if (!res) continue;
      await page.waitForTimeout(260);
      const landed = await page.evaluate(() => TopicRegistry.current().id);
      R.jump.push({ from: id, chip: res.chip.slice(0, 46), want: res.want, landed, ok: landed === res.want });
    }
  }

  // ---- SCREENSHOTS: the recovered content, visible ---------------------------------------
  await page.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen && IndexOverlay.isOpen()) IndexOverlay.close(); });
  for (const id of FOCUS.concat(['notifications', 'authz'])) {
    await setTopic(page, id);
    for (const pane of ['sys', 'drill']) {
      await showPane(page, pane);
      await page.waitForTimeout(220);
      await page.screenshot({ path: path.join(SHOTS, `${id}__${pane}.png`), fullPage: false });
    }
  }

  // ---------------------------------------------------------------------------------------
  const the38 = (r) => !THE_8.includes(r.id);
  const sysEmpty38 = R.sys.filter((r) => the38(r) && r.painted === 0);
  const sysEmpty8 = R.sys.filter((r) => !the38(r) && r.painted === 0);
  const blank = R.sys.filter((r) => r.blankBodies > 0);
  const railBad = R.rail.filter((r) => r.hasNote && !r.isMine);
  const mockBad = R.mock.filter((r) => r.live !== r.authored && r.live >= 0);
  const jumpBad = R.jump.filter((j) => !j.ok);

  const L = [];
  L.push('BROWSER PROOF -- the real built app, real Shadow DOM, all ' + ids.length + ' topics\n');
  L.push('1 SYSTEM MAP stages painted');
  L.push('    THE 38 with an EMPTY system map: ' + sysEmpty38.length + '/38   (was 38/38)');
  L.push('    THE 8  with an EMPTY system map: ' + sysEmpty8.length + '/8');
  L.push('    stages painted, the 38: ' + R.sys.filter(the38).reduce((n, r) => n + r.painted, 0));
  L.push('    "you are here" (.cur) present on the 38: ' + R.sys.filter((r) => the38(r) && r.cur > 0).length + '/38');
  L.push('    pivot bodies left BLANK (chip swallowed the answer): ' + blank.reduce((n, r) => n + r.blankBodies, 0));
  L.push('\n2 LITERAL "undefined" in visible text');
  L.push('    occurrences across all 46 topics x 9 panes: ' + R.undef.length);
  R.undef.slice(0, 6).forEach((u) => L.push('      ' + u.id + ' [' + u.pane + '] ' + JSON.stringify(u.text)));
  L.push('\n3 CROSS-TOPIC JUMP buttons (clicked for real)');
  L.push("    jump buttons across all 46: " + R.jump.length + '   landed on the topic the chip names: ' + R.jump.filter((j) => j.ok).length);
  L.push('    MIS-NAVIGATIONS: ' + jumpBad.length);
  jumpBad.slice(0, 5).forEach((j) => L.push('      ' + j.from + ' -> wanted ' + j.want + ', landed ' + j.landed + '  chip=' + JSON.stringify(j.chip)));
  R.jump.slice(0, 6).forEach((j) => L.push('      OK  ' + j.from + '  ' + JSON.stringify(j.chip) + ' -> ' + j.landed));
  L.push('\n4 COACHING RAIL note ownership');
  L.push('    topics whose rail shows ANOTHER topic\'s note: ' + railBad.length + '/' + ids.length);
  railBad.slice(0, 5).forEach((r) => L.push('      ' + r.id + ' leaked from ' + r.leakedFrom));
  L.push('\n5 MOCK RUN beat count');
  L.push('    topics where the live beat count != authored mockBeats: ' + mockBad.length);
  mockBad.slice(0, 5).forEach((m) => L.push('      ' + m.id + ' authored=' + m.authored + ' live=' + m.live));
  const mockRange = R.mock.filter(the38).map((m) => m.authored);
  L.push('    the 38 now run mock with ' + Math.min(...mockRange) + '-' + Math.max(...mockRange) + ' beats each (was 2 scored of 6)');
  L.push('\n6 CONSOLE / PAGE ERRORS: ' + errs.length);
  errs.slice(0, 8).forEach((e) => L.push('      ' + e));

  const pass = sysEmpty38.length === 0 && R.undef.length === 0 && jumpBad.length === 0
    && railBad.length === 0 && mockBad.length === 0 && errs.length === 0;
  L.push('\n' + '='.repeat(64));
  L.push(pass ? 'BROWSER PROOF: PASS -- the recovered content reaches a reader on all 46.'
              : 'BROWSER PROOF: FAIL -- see above.');
  console.log(L.join('\n'));
  fs.writeFileSync(path.join(__dirname, 'browser_proof.txt'), L.join('\n') + '\n');
  fs.writeFileSync(path.join(__dirname, 'browser_proof.json'), JSON.stringify(R, null, 1));
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
