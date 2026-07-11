import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-desktop';
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(() => { const o = document.getElementById('_index-overlay'); if (o) o.classList.remove('open', 'vis'); document.body.style.overflow = ''; });

async function setView(tab) { await p.evaluate(t => document.querySelector(`.sidebar .seg button[data-tab="${t}"]`).click(), tab); await p.waitForTimeout(700); }
async function setTopic(id) { await p.evaluate(t => TopicRegistry.setTopic(t), id); await p.waitForTimeout(700); }

const R = {};
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

// ---------- A. STAGE FILL vs DEAD CANVAS (proper) ----------
R.stage = {};
for (const v of VIEWS) {
  await setView(v);
  R.stage[v] = await p.evaluate((view) => {
    const stage = document.querySelector('.stage');
    const pane = document.getElementById(view);           // real pane container
    const head = document.querySelector('.stage-head');
    const pr = pane.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const cs = getComputedStyle(stage);
    // content bottom = furthest bottom of pane's rendered content
    const host = pane.querySelector('[class],*');
    return {
      stageScrollH: stage.scrollHeight,
      stageClientH: stage.clientHeight,
      stageOverflows: stage.scrollHeight > stage.clientHeight,
      stageOverflowPx: stage.scrollHeight - stage.clientHeight,
      paneH: Math.round(pr.height),
      paneBottom: Math.round(pr.bottom),
      paneDisplay: getComputedStyle(pane).display,
      paneHidden: pane.hasAttribute('hidden'),
      viewportBottomGap: Math.round(900 - pr.bottom),   // >0 = dead canvas visible at first screen
      stagePadBottom: cs.paddingBottom,
    };
  }, v);
}

// ---------- B. COMPANION OVERFLOW (proper, all descendants) ----------
R.companion = {};
for (const v of VIEWS) {
  await setView(v);
  R.companion[v] = await p.evaluate(() => {
    const cmp = document.querySelector('.companion');
    if (!cmp) return { err: 'no .companion' };
    const cs = getComputedStyle(cmp);
    const kids = [...cmp.children];
    const last = kids[kids.length - 1];
    const lr = last ? last.getBoundingClientRect() : null;
    // deepest content bottom inside companion
    let maxBottom = 0;
    cmp.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); if (r.height > 0 && r.bottom > maxBottom) maxBottom = r.bottom; });
    return {
      scrollH: cmp.scrollHeight, clientH: cmp.clientHeight,
      overflowPx: cmp.scrollHeight - cmp.clientHeight,
      overflowY: cs.overflowY, height: cs.height, position: cs.position,
      childCount: kids.length,
      lastChildBottom: lr ? Math.round(lr.bottom) : null,
      deepestContentBottom: Math.round(maxBottom),
      contentClippedAtViewport: maxBottom > 900,
      collapsed: document.body.classList.contains('cmp-collapsed'),
    };
  });
}

// ---------- C. PRIMARY ACTION BUTTONS (correct selectors) ----------
const specs = [
  ['drill', 'deep-drill', '#revdrill'],
  ['walk', 'deep-walkthrough', '#wnext'],
  ['walk', 'deep-walkthrough', '#wprev'],
  ['wb', 'deep-whiteboard', '.wb-rev'],
  ['open', 'deep-opener', '.op-rev'],
];
R.buttons = [];
for (const [view, host, sel] of specs) {
  await setView(view);
  const m = await p.evaluate(([h, s]) => {
    const root = document.querySelector(h)?.shadowRoot;
    if (!root) return { err: 'no shadow' };
    const el = root.querySelector(s);
    if (!el) return { err: 'no match ' + s };
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return {
      txt: el.textContent.trim().slice(0, 20), w: +r.width.toFixed(1), h: +r.height.toFixed(1), area: Math.round(r.width * r.height),
      fontSize: cs.fontSize, fontWeight: cs.fontWeight, radius: cs.borderRadius,
      bg: cs.backgroundImage !== 'none' ? 'gradient' : cs.backgroundColor,
      color: cs.color, shadow: cs.boxShadow === 'none' ? 'none' : 'yes',
      disabled: el.disabled, opacity: cs.opacity, borderColor: cs.borderColor,
    };
  }, [host, sel]);
  R.buttons.push({ view, sel, ...m });
}

// ---------- D. WB FOOT EMPTY ----------
await setView('wb');
R.wbFoot = await p.evaluate(() => {
  const root = document.querySelector('deep-whiteboard')?.shadowRoot;
  if (!root) return { err: 'no shadow' };
  const foots = [...root.querySelectorAll('.wb-foot')];
  return foots.map(f => {
    const r = f.getBoundingClientRect(); const cs = getComputedStyle(f);
    return { w: Math.round(r.width), h: Math.round(r.height), text: f.textContent.trim(), textLen: f.textContent.trim().length, childCount: f.children.length, borderLeft: cs.borderLeft, bg: cs.backgroundColor, display: cs.display, html: f.innerHTML.slice(0, 80) };
  });
});
await p.screenshot({ path: SHOTS + '/wb-pane.png' });

// ---------- E. OVERLAY CHROME ----------
const ovs = [
  ['mock run', 'mockopen', 'mockov', '.mock-panel'],
  ['mixed fire', 'mixopen', 'mixov', '.mock-panel'],
  ['cram', 'cramopen', 'cramov', '.cram-panel'],
  ['session', 'sessopen', 'sessov', '.mock-panel'],
  ['keyboard', 'keyopen', 'keyov', '.mock-panel'],
  ['scope', 'scopeopen', 'scopeov', '.mock-panel'],
  ['gameplan', 'planopen', 'planov', '.mock-panel'],
  ['topic index', 'idxopen', '_index-overlay', '.ix-panel'],
  ['notes', 'notesopen', null, null],
];
R.overlays = [];
for (const [name, openId, ovId, panelSel] of ovs) {
  await p.evaluate(id => document.getElementById(id)?.click(), openId);
  await p.waitForTimeout(800);
  const m = await p.evaluate(() => {
    const open = [...document.querySelectorAll('[role="dialog"]')].find(d => d.classList.contains('open') || d.getAttribute('aria-hidden') === 'false');
    if (!open) return { err: 'none open' };
    const panel = open.firstElementChild;
    const pr = panel.getBoundingClientRect(); const pcs = getComputedStyle(panel);
    const closeBtn = open.querySelector('[aria-label*="lose"], .mock-x, .ix-x, [id$="x"]');
    const cr = closeBtn ? closeBtn.getBoundingClientRect() : null;
    const title = open.querySelector('.cram-title, .ix-title, h2, .mock-title');
    return {
      ovId: open.id,
      panelW: Math.round(pr.width), panelTop: Math.round(pr.top), panelH: Math.round(pr.height),
      radius: pcs.borderRadius,
      closeSide: cr ? (cr.left - pr.left < pr.right - cr.right ? 'LEFT' : 'RIGHT') : 'none',
      closeX: cr ? Math.round(cr.left) : null,
      titleText: title ? title.textContent.trim().slice(0, 40) : null,
      titleTransform: title ? getComputedStyle(title).textTransform : null,
      centred: Math.abs((pr.top) - (900 - pr.bottom)) < 30,
    };
  });
  R.overlays.push({ name, ...m });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
}

// ---------- F. SESSION destructive button ----------
await p.evaluate(() => document.getElementById('sessopen').click());
await p.waitForTimeout(900);
R.session = await p.evaluate(() => {
  const host = document.querySelector('deep-session'); const root = host?.shadowRoot || document;
  const btns = [...root.querySelectorAll('button')].map(el => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { txt: el.textContent.trim().slice(0, 40), cls: el.className, w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, color: cs.color, border: cs.borderColor, fontWeight: cs.fontWeight };
  }).filter(b => b.w > 0);
  return btns;
});
await p.screenshot({ path: SHOTS + '/session-overlay.png' });

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_vd-recheck.json', JSON.stringify({ R, errs }, null, 1));
console.log('ERRORS:', errs.length ? errs : 'none');
await b.close();
