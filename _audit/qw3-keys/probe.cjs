/* QW3 probe -- exercise EVERY keyboard binding in the app with real key presses and
 * record what each one actually does. Run against a deliverable html:
 *     node _qw3_keys_probe.cjs <deliverable.html>
 * Untracked evidence instrument (repo precedent: _mob_diag.mjs). Real page.keyboard input,
 * bounded condition-waits, no sleeps-as-assertions. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('../../test/_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', '..', 'deepdive_content_pipeline_rehearsal.html');

const results = [];
let failCount = 0;
function rec(key, what, ok, detail) {
  results.push({ key, what, ok, detail: detail || '' });
  if (!ok) failCount++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + String(key).padEnd(16) + what + (detail ? '  -- ' + detail : ''));
}

const ACTIVE_TAB = () => {
  const b = document.querySelector('.seg button.on');
  return b ? b.getAttribute('data-tab') : null;
};
const NO_OPEN_DIALOG = () => !document.querySelector('[role="dialog"][aria-modal="true"].open');

async function keyThen(page, key, cond, arg, label) {
  await page.keyboard.press(key);
  try {
    await page.waitForFunction(cond, arg, { timeout: 8000 });
    return true;
  } catch (e) {
    return false;
  }
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  /* stub window.print so Ctrl+P's popup document can't hang headless; record window.open */
  await page.addInitScript(() => {
    window.__opened = [];
    const realOpen = window.open;
    window.open = function () {
      window.__opened.push(String(arguments[0] || '(blank)'));
      const w = realOpen.apply(window, arguments);
      if (w) { try { w.print = function () { w.__printed = true; }; } catch (e) {} }
      return w;
    };
    window.print = function () { window.__printed = true; };
  });
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);
  await B.settle(page);
  await page.waitForFunction(NO_OPEN_DIALOG, null, { timeout: 10000 });

  console.log('=== QW3 keyboard binding inventory (' + path.basename(HTML) + ') ===');

  /* ---------- 1. the pane keys q w e r t y u i o ---------- */
  const tabKeys = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open' };
  for (const k of Object.keys(tabKeys)) {
    const ok = await keyThen(page, k, (t) => {
      const b = document.querySelector('.seg button.on');
      return b && b.getAttribute('data-tab') === t;
    }, tabKeys[k], k + ' -> ' + tabKeys[k]);
    rec(k, 'jumps to pane "' + tabKeys[k] + '"', ok, ok ? '' : 'active tab stayed ' + await page.evaluate(ACTIVE_TAB));
    await B.settle(page);
  }

  /* ---------- 2. v -> viz, on a topic that HAS a visual ---------- */
  const vizTopic = await page.evaluate(() => {
    const cur = TopicRegistry.current().id;
    const btn = document.querySelector('.seg button[data-tab="viz"]');
    if (btn && !btn.hidden) return cur;
    for (const id of TopicRegistry.ids()) {
      TopicRegistry.setTopic(id);
      if (btn && !btn.hidden) return id;
    }
    TopicRegistry.setTopic(cur);
    return null;
  });
  if (vizTopic) {
    await B.settle(page);
    const ok = await keyThen(page, 'v', () => {
      const b = document.querySelector('.seg button.on');
      return b && b.getAttribute('data-tab') === 'viz';
    }, null, 'v -> viz');
    rec('v', 'jumps to "viz" on topic with a visual (' + vizTopic + ')', ok);
    await page.keyboard.press('q');
    await page.waitForFunction((t) => document.querySelector('.seg button.on').getAttribute('data-tab') === t, 'walk', { timeout: 8000 });
  } else {
    rec('v', 'viz key: NO topic reveals the viz tab', false, 'inventory says viz is conditional; none found');
  }
  /* restore boot topic */
  await page.evaluate(() => TopicRegistry.setTopic(TopicRegistry.ids()[0]));
  await B.settle(page);

  /* ---------- 3. d cycles density ---------- */
  const d1 = await keyThen(page, 'd', () => document.documentElement.dataset.density === 'compact', null, 'd1');
  const d2 = await keyThen(page, 'd', () => document.documentElement.dataset.density === 'cozy', null, 'd2');
  const d3 = await keyThen(page, 'd', () => !document.documentElement.dataset.density, null, 'd3');
  rec('d', 'cycles density default -> compact -> cozy -> default', d1 && d2 && d3, [d1, d2, d3].join(','));

  /* ---------- 4. [ and ] step the topic ---------- */
  const t0 = await page.evaluate(() => TopicRegistry.current().id);
  const nOk = await keyThen(page, ']', (prev) => TopicRegistry.current().id !== prev, t0, 'next topic');
  const t1 = await page.evaluate(() => TopicRegistry.current().id);
  const pOk = await keyThen(page, '[', (prev) => TopicRegistry.current().id !== prev, t1, 'prev topic');
  const t2 = await page.evaluate(() => TopicRegistry.current().id);
  rec(']', 'steps to the next topic', nOk, t0 + ' -> ' + t1);
  rec('[', 'steps back to the previous topic', pOk && t2 === t0, t1 + ' -> ' + t2);
  await B.settle(page);

  /* ---------- 5. \ index overlay; Escape closes ---------- */
  const ixOpen = await keyThen(page, '\\', () => {
    const ov = document.querySelector('.ix-ov');
    return !!ov && ov.classList.contains('open');
  }, null, 'index overlay');
  rec('\\', 'opens the Topic index overlay', ixOpen);
  const ixClosed = await keyThen(page, 'Escape', () => !document.querySelector('.ix-ov.open'), null, 'index closed');
  rec('Escape', 'closes the Topic index', ixClosed);
  await B.settle(page);

  /* ---------- 6. / and Ctrl+K search; Escape closes ---------- */
  const sOpen = await keyThen(page, '/', () => window.SearchOverlay && window.SearchOverlay.isOpen(), null, 'search');
  rec('/', 'opens Search', sOpen);
  const sClosed = await keyThen(page, 'Escape', () => window.SearchOverlay && !window.SearchOverlay.isOpen(), null, 'search closed');
  rec('Escape', 'closes Search', sClosed);
  await B.settle(page);
  const kOpen = await keyThen(page, 'Control+k', () => window.SearchOverlay && window.SearchOverlay.isOpen(), null, 'ctrl+k');
  rec('Ctrl+K', 'opens Search (alias of /)', kOpen);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.SearchOverlay && !window.SearchOverlay.isOpen(), null, { timeout: 8000 });
  await B.settle(page);

  /* ---------- 7. ? keyboard overlay; also read what keyov DOCUMENTS for the drill grade ---------- */
  const kv = await keyThen(page, '?', () => {
    const ov = document.getElementById('keyov');
    return !!ov && ov.classList.contains('open');
  }, null, 'keyov');
  rec('?', 'opens the Keyboard shortcuts overlay', kv);
  const keyovDoc = await page.evaluate(() => {
    const dk = document.querySelector('deep-keyboard');
    if (!dk || !dk.shadowRoot) return '(no deep-keyboard shadow)';
    const rows = [...dk.shadowRoot.querySelectorAll('.ks-row2')].map((r) => r.textContent.trim().replace(/\s+/g, ' '));
    const grid = [...dk.shadowRoot.querySelectorAll('.ks-row')].map((r) => r.textContent.trim().replace(/\s+/g, ' '));
    return JSON.stringify({ grid, rows });
  });
  console.log('  keyov documents: ' + keyovDoc);
  const kvClosed = await keyThen(page, 'Escape', () => !document.getElementById('keyov').classList.contains('open'), null, 'keyov closed');
  rec('Escape', 'closes the Keyboard overlay', kvClosed);
  await B.settle(page);

  /* ---------- 8. p session progress ---------- */
  const pv = await keyThen(page, 'p', () => {
    const ov = document.getElementById('sessov');
    return !!ov && ov.classList.contains('open');
  }, null, 'sessov');
  rec('p', 'opens Session progress', pv);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('sessov').classList.contains('open'), null, { timeout: 8000 });
  await B.settle(page);

  /* ---------- 9. f focus mode ---------- */
  const fOn = await keyThen(page, 'f', () => window.FocusMode && window.FocusMode.isFocused(), null, 'focus on');
  const fOff = await keyThen(page, 'f', () => window.FocusMode && !window.FocusMode.isFocused(), null, 'focus off');
  rec('f', 'toggles Focus mode on and off', fOn && fOff);
  await B.settle(page);

  /* ---------- 10. Ctrl+P printable Q&A ---------- */
  const prOk = await keyThen(page, 'Control+p', () => window.__opened && window.__opened.length > 0, null, 'print window');
  rec('Ctrl+P', 'opens the printable Q&A (routes native print)', prOk,
    await page.evaluate(() => (window.__opened || []).join(',')));
  /* the modifier guard: Ctrl+P must NOT also fire the plain-'p' Session binding underneath */
  let sessLeak = false;
  try {
    await page.waitForFunction(() => document.getElementById('sessov').classList.contains('open'), null, { timeout: 1500 });
    sessLeak = true;
  } catch (e) { /* good: it never opened */ }
  rec('Ctrl+P', 'does NOT also open the Session panel (modifier guard)', !sessLeak,
    sessLeak ? 'plain-p handler fired on a chord' : 'sessov stayed closed for 1.5s');
  if (sessLeak) { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('sessov').classList.contains('open'), null, { timeout: 8000 }); }
  /* close any popup pages it opened */
  for (const p2 of ctx.pages()) { if (p2 !== page) await p2.close().catch(() => {}); }
  await B.settle(page);

  /* ---------- 10b. Ctrl+F must NOT toggle focus mode (browser find stays the browser's) ---------- */
  let fLeak = false;
  await page.keyboard.press('Control+f');
  try {
    await page.waitForFunction(() => window.FocusMode && window.FocusMode.isFocused(), null, { timeout: 1500 });
    fLeak = true;
  } catch (e) { /* good */ }
  rec('Ctrl+F', 'does NOT toggle Focus mode (modifier guard)', !fLeak,
    fLeak ? 'focus-mode hijacked the chord' : 'FocusMode stayed off for 1.5s');
  if (fLeak) await page.keyboard.press('f');
  await B.settle(page);

  /* ---------- 10c. the LAYOUT carve-out: AltGr punctuation still binds ---------- */
  /* AltGr arrives as ctrl+alt BOTH true in Chromium ('\' is AltGr+ss on a German PC).
     The guard must not eat it: a person typing a backslash is invoking the binding. */
  const agOk = await keyThen(page, 'Control+Alt+\\', () => {
    const ov = document.querySelector('.ix-ov');
    return !!ov && ov.classList.contains('open');
  }, null, 'altgr backslash');
  rec('AltGr+\\', 'opens the Topic index (ctrl+alt = AltGr carve-out)', agOk);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.ix-ov.open'), null, { timeout: 8000 });
  await B.settle(page);

  /* Alt+ArrowLeft is the browser's Back -- the walkthrough must NOT also step on it */
  await page.evaluate(() => window.switchTab('walk'));
  await B.settle(page);
  const wiA = await page.evaluate(() => document.querySelector('#walk deep-walkthrough')._wi);
  await page.keyboard.press('ArrowRight');   /* ensure there is room to step back */
  await page.waitForFunction((p) => document.querySelector('#walk deep-walkthrough')._wi === p + 1, wiA, { timeout: 8000 });
  let altStep = false;
  await page.keyboard.press('Alt+ArrowLeft');
  try {
    await page.waitForFunction((p) => document.querySelector('#walk deep-walkthrough')._wi === p, wiA, { timeout: 1500 });
    altStep = true;
  } catch (e) { /* good: it stayed put */ }
  rec('Alt+ArrowLeft', 'does NOT step the walkthrough (that chord is the browser\'s Back)', !altStep,
    altStep ? 'the walkthrough consumed a browser-navigation chord' : 'step index held for 1.5s');
  await page.keyboard.press('ArrowLeft');    /* restore step position */
  await B.settle(page);

  /* ---------- 11. walk arrows ---------- */
  await page.evaluate(() => window.switchTab('walk'));
  await B.settle(page);
  const wi0 = await page.evaluate(() => document.querySelector('#walk deep-walkthrough')._wi);
  const arrR = await keyThen(page, 'ArrowRight', (prev) =>
    document.querySelector('#walk deep-walkthrough')._wi === prev + 1, wi0, 'arrow right');
  const arrL = await keyThen(page, 'ArrowLeft', (prev) =>
    document.querySelector('#walk deep-walkthrough')._wi === prev, wi0, 'arrow left');
  rec('ArrowRight', 'steps the walkthrough forward (walk pane)', arrR, 'step ' + wi0 + ' -> ' + (wi0 + 1));
  rec('ArrowLeft', 'steps the walkthrough back (walk pane)', arrL);

  /* ---------- 12. drill: Space/Enter advance; 1/2/3 grade ---------- */
  await page.evaluate(() => window.switchTab('drill'));
  await B.settle(page);
  await page.evaluate(() => {
    const host = document.querySelector('#drill deep-drill');
    window.__drillClicks = [];
    if (!host.__qw3armed) {
      host.__qw3armed = 1;
      host.shadowRoot.addEventListener('click', (ev) => {
        let el = ev.composedPath()[0];
        while (el && el.nodeType === 1 && !el.id) el = el.parentNode;
        window.__drillClicks.push(el && el.id ? el.id : '(no id)');
      }, true);
    }
  });
  const spaceOk = await keyThen(page, ' ', () => window.__drillClicks.includes('adv'), null, 'space->adv');
  rec('Space', 'advances the drill (clicks #adv "Reveal answer")', spaceOk,
    await page.evaluate(() => window.__drillClicks.join(',')));
  await page.evaluate(() => { window.__drillClicks = []; });
  const enterOk = await keyThen(page, 'Enter', () => window.__drillClicks.includes('adv'), null, 'enter->adv');
  rec('Enter', 'advances the drill (clicks #adv)', enterOk);

  /* advance to the judge row, then grade with 1 / 2 / 3 across three cards */
  const gradeIds = { '1': 'jm', '2': 'js', '3': 'jg' };
  const gradeLabel = {};
  for (const key of ['1', '2', '3']) {
    for (let i = 0; i < 10; i++) {
      const hasJudge = await page.evaluate(() =>
        !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('jm'));
      if (hasJudge) break;
      await page.keyboard.press(' ');
      await page.waitForTimeout(120);
    }
    const labels = await page.evaluate(() => {
      const r = document.querySelector('#drill deep-drill').shadowRoot;
      const g = (id) => { const b = r.getElementById(id); return b ? b.textContent.trim().replace(/\s+/g, ' ') : null; };
      return { jm: g('jm'), js: g('js'), jg: g('jg') };
    });
    gradeLabel[key] = labels[gradeIds[key]];
    await page.evaluate(() => { window.__drillClicks = []; });
    const ok = await keyThen(page, key, (want) => window.__drillClicks.includes(want), gradeIds[key], key + '->' + gradeIds[key]);
    rec(key, 'grades the probe (clicks #' + gradeIds[key] + ' = "' + labels[gradeIds[key]] + '")', ok,
      await page.evaluate(() => window.__drillClicks.join(',')));
    await B.settle(page);
  }

  /* ---------- 13. g guided tour; Escape dismisses ---------- */
  const gOk = await keyThen(page, 'g', () => window.TourGuide && window.TourGuide.isActive(), null, 'tour');
  rec('g', 'starts the guided tour', gOk);
  const gEsc = await keyThen(page, 'Escape', () => window.TourGuide && !window.TourGuide.isActive(), null, 'tour done');
  rec('Escape', 'dismisses the tour', gEsc);
  await B.settle(page);

  /* ---------- 14. h home; home keys 1-6 + pane retarget ---------- */
  const hOk = await keyThen(page, 'h', () => document.documentElement.dataset.view === 'home', null, 'home');
  rec('h', 'goes to the Home (topic index) view', hOk);
  await B.settle(page);
  await page.evaluate(() => {
    window.__homeClicks = [];
    document.addEventListener('click', (ev) => {
      let el = ev.composedPath()[0];
      while (el && el.nodeType === 1 && !(el.classList && el.classList.contains('hm-room'))) el = el.parentNode;
      if (el && el.nodeType === 1) window.__homeClicks.push('hm-room');
    }, true);
  });
  const r1 = await keyThen(page, '1', () => window.__homeClicks.length > 0, null, 'room 1');
  rec('1 (home)', 'opens room #1 on the home view', r1);
  await B.settle(page);
  /* pane key on home retargets to the last-visited topic */
  const wHome = await keyThen(page, 'w', () => {
    if (document.documentElement.dataset.view === 'home') return false;
    const b = document.querySelector('.seg button.on');
    return b && b.getAttribute('data-tab') === 'drill';
  }, null, 'home w');
  rec('w (home)', 'leaves home into the resume topic\'s drill', wHome,
    await page.evaluate(() => (window.LastVisit && LastVisit.topicId && LastVisit.topicId()) || '(none)'));

  /* ---------- 15. discoverability layer: badges, zero-layout proof, aria-keyshortcuts ---------- */
  /* back into the topic view on the boot topic, walk pane */
  await page.evaluate(() => { window.Router.navigate('walk'); });
  await page.waitForFunction(() => document.documentElement.dataset.view !== 'home', null, { timeout: 8000 });
  await B.settle(page);

  const badgeState = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.seg button')];
    const out = [];
    for (const b of btns) {
      const k = b.querySelector('.seg-key');
      const r = k ? k.getBoundingClientRect() : null;
      out.push({
        tab: b.getAttribute('data-tab'),
        tabHidden: b.hidden,
        btnH: Math.round(b.getBoundingClientRect().height * 10) / 10,
        btnY: Math.round(b.getBoundingClientRect().top * 10) / 10,
        badge: k ? k.textContent : null,
        badgeShown: !!(k && r.width > 0 && r.height > 0 && getComputedStyle(k).display !== 'none'),
        aria: b.getAttribute('aria-keyshortcuts'),
      });
    }
    return out;
  });
  const wantBadge = { walk: 'Q', drill: 'W', wb: 'E', sys: 'R', trade: 'T', model: 'Y', num: 'U', rf: 'I', open: 'O', viz: 'V' };
  const visible = badgeState.filter((b) => !b.tabHidden);
  const badgeOk = visible.every((b) => b.badgeShown && b.badge === wantBadge[b.tab] && b.aria === wantBadge[b.tab]);
  rec('badges', 'every rendered tab wears its key badge + matching aria-keyshortcuts (desktop)', badgeOk,
    visible.map((b) => b.tab + ':' + b.badge + (b.badgeShown ? '' : '(HIDDEN)') + '/aria=' + b.aria).join(' '));

  /* ZERO-LAYOUT PROOF: force the badges away and demand NOTHING moves. */
  const withBadges = badgeState.map((b) => b.tab + '@' + b.btnY + 'h' + b.btnH).join(',');
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.id = '__qw3_nobadge';
    s.textContent = '.seg button .seg-key{display:none!important}';
    document.head.appendChild(s);
  });
  await B.settle(page);
  const withoutBadges = await page.evaluate(() => [...document.querySelectorAll('.seg button')]
    .map((b) => b.getAttribute('data-tab') + '@' + Math.round(b.getBoundingClientRect().top * 10) / 10 + 'h' + Math.round(b.getBoundingClientRect().height * 10) / 10).join(','));
  await page.evaluate(() => document.getElementById('__qw3_nobadge').remove());
  rec('badges', 'add ZERO layout: tab y + height byte-identical with badges hidden', withBadges === withoutBadges,
    withBadges === withoutBadges ? withBadges : withBadges + '  vs  ' + withoutBadges);

  /* the tabs still clear the 44px floor claim on desktop? (brief: must not push tabs below 44px) */
  const minH = Math.min(...visible.map((b) => b.btnH));
  console.log('  ....  desktop tab heights: min ' + minH + 'px  (' + visible.map((b) => b.tab + ':' + b.btnH).join(' ') + ')');

  /* aria-keyshortcuts census: light DOM + the shadow-rendered controls */
  const ariaCensus = await page.evaluate(() => {
    const light = [...document.querySelectorAll('[aria-keyshortcuts]')]
      .map((e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '[data-tab=' + e.getAttribute('data-tab') + ']') + '=' + e.getAttribute('aria-keyshortcuts'));
    const shadow = [];
    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) {
          for (const s of el.shadowRoot.querySelectorAll('[aria-keyshortcuts]')) {
            shadow.push(el.tagName.toLowerCase() + ' #' + s.id + '=' + s.getAttribute('aria-keyshortcuts'));
          }
          walk(el.shadowRoot);
        }
      }
    };
    walk(document);
    return { light, shadow };
  });
  console.log('  ....  aria-keyshortcuts LIGHT (' + ariaCensus.light.length + '): ' + ariaCensus.light.join('  '));
  console.log('  ....  aria-keyshortcuts SHADOW now rendered (' + ariaCensus.shadow.length + '): ' + ariaCensus.shadow.join('  '));
  rec('aria', 'aria-keyshortcuts present across the app (was 0 document-wide)',
    ariaCensus.light.length >= 19 && ariaCensus.shadow.length >= 1,
    ariaCensus.light.length + ' light + ' + ariaCensus.shadow.length + ' shadow');

  /* ---------- summary ---------- */
  await ctx.close();

  /* ---------- 16. mobile 360: badges must NOT render; strip tabs keep the 44px floor ---------- */
  const mctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });
  const mpage = await mctx.newPage();
  await B.gotoApp(mpage, HTML, { hash: '#walk' });
  await B.enterApp(mpage);
  await B.settle(mpage);
  const mob = await mpage.evaluate(() => {
    const badges = [...document.querySelectorAll('.seg button .seg-key')];
    const shown = badges.filter((k) => {
      const r = k.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(k).display !== 'none';
    });
    const hs = [...document.querySelectorAll('.seg button')].filter((b) => !b.hidden)
      .map((b) => Math.round(b.getBoundingClientRect().height * 10) / 10);
    return { total: badges.length, shown: shown.length, minH: Math.min(...hs) };
  });
  rec('badges@360', 'NOT rendered on mobile (' + mob.total + ' in DOM, ' + mob.shown + ' painted)', mob.shown === 0);
  rec('tabs@360', 'mobile strip tabs keep the 44px tap floor (min ' + mob.minH + 'px)', mob.minH >= 44);
  await mctx.close();
  await browser.close();
  const total = results.length;
  console.log('---');
  console.log('QW3 PROBE: ' + (total - failCount) + '/' + total + ' bindings behaved as inventoried' +
    (failCount ? ' -- ' + failCount + ' FAILED' : ''));
  console.log('drill grade labels: 1=' + JSON.stringify(gradeLabel['1']) + ' 2=' + JSON.stringify(gradeLabel['2']) + ' 3=' + JSON.stringify(gradeLabel['3']));
  process.exit(failCount ? 1 : 0);
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
