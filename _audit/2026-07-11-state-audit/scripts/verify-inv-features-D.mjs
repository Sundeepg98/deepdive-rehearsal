/* Probe D: nail the drill grading keys, the F key, Ctrl+P, and the cram P key. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-inv-features';
const b = await chromium.launch();

async function ready() {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.isOpen()) window.IndexOverlay.close(); });
  await p.waitForTimeout(350);
  await p.evaluate(() => { document.body.focus(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await p.mouse.click(700, 12);           // park focus on inert chrome
  await p.waitForTimeout(200);
  p.__errs = errs;
  return p;
}

/* ============ DRILL: does key `1` record Solid (as the ? overlay says) or Missed? ============ */
{
  const p = await ready();
  await p.evaluate(() => window.goView('drill'));
  await p.waitForTimeout(500);
  // click #adv until the judge row renders
  let clicks = 0;
  for (let i = 0; i < 6; i++) {
    const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.querySelector('.judge'));
    if (has) break;
    const advTxt = await p.evaluate(() => {
      const r = document.querySelector('#drill deep-drill').shadowRoot;
      const a = r.getElementById('adv'); if (!a) return null;
      const t = a.textContent.trim(); a.click(); return t;
    });
    clicks++;
    await p.waitForTimeout(300);
    if (!advTxt) break;
  }
  const labels = await p.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const g = id => { const e = r.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim() : '(absent)'; };
    return { judgeRow: !!r.querySelector('.judge'), jm: g('jm'), js: g('js'), jg: g('jg') };
  });
  console.log('=== DRILL judge row (after ' + clicks + ' #adv clicks) ===');
  console.log('  judge row present:', labels.judgeRow);
  console.log('  #jm (key 1) =', JSON.stringify(labels.jm));
  console.log('  #js (key 2) =', JSON.stringify(labels.js));
  console.log('  #jg (key 3) =', JSON.stringify(labels.jg));
  await p.screenshot({ path: SHOTS + '/D1-drill-judge-row-1-missed-3-solid.png' });

  const s0 = await p.evaluate(() => document.querySelector('#drill deep-drill').getStats());
  await p.keyboard.press('1');
  await p.waitForTimeout(500);
  const s1 = await p.evaluate(() => document.querySelector('#drill deep-drill').getStats());
  console.log('\n  BEFORE pressing `1`: solid(dGot)=' + s0.dGot + '  revisit(dShk)=' + s0.dShk + '  graded=' + s0.dDone);
  console.log('  AFTER  pressing `1`: solid(dGot)=' + s1.dGot + '  revisit(dShk)=' + s1.dShk + '  graded=' + s1.dDone);
  const recordedSolid = s1.dGot > s0.dGot, recordedRevisit = s1.dShk > s0.dShk;
  console.log('  >> key `1` recorded:', recordedSolid ? 'SOLID' : recordedRevisit ? 'REVISIT / MISSED' : 'NOTHING');
  console.log('  >> the `?` overlay documents: "1 2 — In the drill, score the probe — Solid or Revisit"');
  console.log('  >> OVERLAY IS WRONG:', recordedRevisit === true);
  console.log('  >> revisit set after grading with `1`:', JSON.stringify(s1.revisit));
  await p.screenshot({ path: SHOTS + '/D2-after-key1-recorded-revisit.png' });
  await p.context().close();
}

/* ============ Now key `3` on a fresh drill -> should be Solid ============ */
{
  const p = await ready();
  await p.evaluate(() => window.goView('drill'));
  await p.waitForTimeout(500);
  for (let i = 0; i < 6; i++) {
    const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.querySelector('.judge'));
    if (has) break;
    await p.evaluate(() => { const a = document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'); if (a) a.click(); });
    await p.waitForTimeout(300);
  }
  const s0 = await p.evaluate(() => document.querySelector('#drill deep-drill').getStats());
  await p.keyboard.press('3');
  await p.waitForTimeout(500);
  const s1 = await p.evaluate(() => document.querySelector('#drill deep-drill').getStats());
  console.log('\n=== DRILL key `3` (the UNDOCUMENTED one) ===');
  console.log('  before: solid=' + s0.dGot + ' revisit=' + s0.dShk + ' | after: solid=' + s1.dGot + ' revisit=' + s1.dShk);
  console.log('  >> key `3` recorded:', s1.dGot > s0.dGot ? 'SOLID (and it is undocumented in the ? overlay)' : 'not solid');
  await p.context().close();
}

/* ============ F key (focus mode) with focus parked on inert chrome ============ */
{
  const p = await ready();
  const before = await p.evaluate(() => ({
    pressed: (document.getElementById('_focus-toggle') || {}).getAttribute?.('aria-pressed'),
    active: document.activeElement.tagName
  }));
  await p.keyboard.press('f');
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => ({
    pressed: (document.getElementById('_focus-toggle') || {}).getAttribute?.('aria-pressed'),
    htmlCls: document.documentElement.className, bodyCls: document.body.className,
    sidebarVisible: (() => { const s = document.querySelector('.sidebar'); return s ? s.offsetParent !== null : null; })(),
    companionVisible: (() => { const c = document.querySelector('.companion'); return c ? c.offsetParent !== null : null; })()
  }));
  console.log('\n=== FOCUS MODE (F key, focus parked on chrome) ===');
  console.log('  before:', JSON.stringify(before));
  console.log('  after :', JSON.stringify(after));
  console.log('  >> F IS LIVE:', before.pressed !== after.pressed);
  await p.screenshot({ path: SHOTS + '/D3-focus-mode-via-F.png' });
  await p.context().close();
}

/* ============ F key WHILE an overlay is open (shell.js guards; focus-mode.js does NOT) ============ */
{
  const p = await ready();
  await p.evaluate(() => { if (window.openCram) window.openCram(); });
  await p.waitForTimeout(500);
  const st = await p.evaluate(() => ({
    cramOpen: document.getElementById('cramov').classList.contains('open'),
    pressed: (document.getElementById('_focus-toggle') || {}).getAttribute?.('aria-pressed')
  }));
  await p.keyboard.press('f');
  await p.waitForTimeout(400);
  const st2 = await p.evaluate(() => ({
    cramOpen: document.getElementById('cramov').classList.contains('open'),
    pressed: (document.getElementById('_focus-toggle') || {}).getAttribute?.('aria-pressed')
  }));
  console.log('\n=== F pressed WHILE the cram overlay is open ===');
  console.log('  before:', JSON.stringify(st), '-> after:', JSON.stringify(st2));
  console.log('  >> focus mode toggled BEHIND the open modal:', st.pressed !== st2.pressed,
    '(shell.js suppresses its keys while a modal is open; focus-mode.js has no such guard)');
  await p.screenshot({ path: SHOTS + '/D4-F-toggles-behind-open-modal.png' });
  await p.context().close();
}

/* ============ Ctrl+P -> Print Q&A ============ */
{
  const p = await ready();
  await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await p.keyboard.press('Control+p');
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({
    printed: window.__printed || 0,
    bodyCls: document.body.className,
    printContainer: !!document.querySelector('#printqa,.print-qa,[id*="print"]')
  }));
  console.log('\n=== Ctrl+P -> Print Q&A ===');
  console.log(' ', JSON.stringify(r));
  console.log('  >> Ctrl+P is intercepted by the app:', r.printed > 0 || /print/.test(r.bodyCls));
  await p.context().close();
}

/* ============ documented vs live shortcut set ============ */
{
  const p = await ready();
  const doc = await p.evaluate(() => {
    if (window.openKeys) window.openKeys();
    const sr = document.querySelector('deep-keyboard').shadowRoot;
    return [...new Set([...sr.querySelectorAll('kbd')].map(k => k.textContent.trim()))];
  });
  const LIVE = ['Q','W','E','R','T','Y','U','I','O','V','←','→','Space','Enter','1','2','3','/','\\','[',']','G','D','F','Esc','?','Ctrl+K','Ctrl+P','P (cram open)'];
  console.log('\n=== SHORTCUT DOC COVERAGE ===');
  console.log('  documented in ? overlay:', JSON.stringify(doc));
  const missing = LIVE.filter(k => !doc.includes(k));
  console.log('  LIVE but UNDOCUMENTED  :', JSON.stringify(missing));
  await p.context().close();
}

await b.close();
