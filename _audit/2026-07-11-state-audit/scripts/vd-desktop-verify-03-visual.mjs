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

async function setView(tab) { await p.evaluate(t => document.querySelector(`.sidebar .seg button[data-tab="${t}"]`).click(), tab); await p.waitForTimeout(600); }

const R = {};

// ---------- 1. CHEVRON ::after (css collision) ----------
R.chevron = await p.evaluate(() => {
  return [...document.querySelectorAll('.crambtn')].slice(0, 4).map(el => {
    const cs = getComputedStyle(el, '::after');
    const btn = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      id: el.id, isTog: el.classList.contains('cram-tog'),
      after: { content: cs.content, position: cs.position, inset: cs.inset, top: cs.top, left: cs.left, right: cs.right, marginLeft: cs.marginLeft, opacity: cs.opacity, fontSize: cs.fontSize, background: cs.backgroundImage.slice(0, 40) },
      btn: { overflow: btn.overflow, position: btn.position, borderRadius: btn.borderRadius },
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
    };
  });
});

// ---------- 2. MESH SEAM (pixel probe) ----------
// hard-stop the mesh animation so the sample is deterministic, then sample a row of pixels
R.meshCSS = await p.evaluate(() => {
  const bef = getComputedStyle(document.querySelector('.stage'), '::before');
  const aft = getComputedStyle(document.querySelector('.stage'), '::after');
  const st = getComputedStyle(document.querySelector('.stage'));
  return {
    stage: { overflowX: st.overflowX, overflowY: st.overflowY, position: st.position },
    before: { position: bef.position, w: bef.width, h: bef.height, top: bef.top, left: bef.left, animation: bef.animationName },
    after: { position: aft.position, w: aft.width, h: aft.height, bottom: aft.bottom, right: aft.right, animation: aft.animationName },
  };
});
await setView('rf');
// freeze animations for a deterministic pixel read
await p.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused !important;animation-delay:0s !important;animation-duration:0s !important;transition:none !important}' });
await p.waitForTimeout(400);
await p.screenshot({ path: SHOTS + '/mesh-rf-light.png' });

// sample pixels across the stage at a y with exposed canvas
const shot = await p.screenshot({ clip: { x: 296, y: 780, width: 854, height: 2 } });
fs.writeFileSync(SHOTS + '/mesh-strip.png', shot);

// ---------- 3. PRIMARY ACTION BUTTON SPREAD ----------
const btnSpec = {
  drill: ['deep-drill', '#revdrill, .drev, [id*=rev]'],
  walk: ['deep-walkthrough', '.wnext, [class*=next]'],
  wb: ['deep-whiteboard', '.wb-rev'],
  open: ['deep-opener', '.op-rev'],
};
R.buttons = {};
for (const [view, [host, sel]] of Object.entries(btnSpec)) {
  await setView(view);
  R.buttons[view] = await p.evaluate(([h, s]) => {
    const root = document.querySelector(h)?.shadowRoot;
    if (!root) return { err: 'no shadow for ' + h };
    const el = root.querySelector(s);
    if (!el) return { err: 'no match ' + s, candidates: [...root.querySelectorAll('button')].map(x => ({ cls: x.className, id: x.id, txt: x.textContent.trim().slice(0, 20) })) };
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { txt: el.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), area: Math.round(r.width * r.height), fontSize: cs.fontSize, fontWeight: cs.fontWeight, radius: cs.borderRadius, bg: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 45) : cs.backgroundColor, color: cs.color, shadow: cs.boxShadow.slice(0, 30) };
  }, [host, sel]);
}
// sidebar mock CTA
R.mockCTA = await p.evaluate(() => {
  const el = document.querySelector('.mockbtn');
  if (!el) return null;
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  return { txt: el.textContent.trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), area: Math.round(r.width * r.height), fontSize: cs.fontSize, fontWeight: cs.fontWeight, bg: cs.backgroundImage.slice(0, 45), shadow: cs.boxShadow.slice(0, 40) };
});
// sidebar animated H1 + stage head
R.headings = await p.evaluate(() => {
  const h1 = document.querySelector('.side-id h1, .sidebar h1');
  const sh = document.querySelector('.stage-head .sh-name');
  const g = e => { if (!e) return null; const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { txt: e.textContent.trim().slice(0, 30), fontSize: c.fontSize, fontWeight: c.fontWeight, animation: c.animationName, animDur: c.animationDuration, bgClip: c.webkitBackgroundClip || c.backgroundClip, color: c.color, w: Math.round(r.width), h: Math.round(r.height) }; };
  return { sidebarH1: g(h1), stageName: g(sh) };
});

// ---------- 4. DEAD CANVAS + COMPANION OVERFLOW ----------
R.space = {};
for (const v of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
  await setView(v);
  R.space[v] = await p.evaluate(() => {
    const stage = document.querySelector('.stage');
    const pane = document.querySelector('.pane:not([hidden])');
    const cmp = document.querySelector('.companion');
    const paneR = pane ? pane.getBoundingClientRect() : null;
    const inner = cmp ? cmp.querySelector('.cmp-body, .cmp-inner') || cmp : null;
    return {
      stageScrollH: stage.scrollHeight, stageClientH: stage.clientHeight,
      paneBottom: paneR ? Math.round(paneR.bottom) : null,
      deadCanvas: paneR ? Math.round(900 - paneR.bottom) : null,
      cmpScrollH: cmp ? cmp.scrollHeight : null, cmpClientH: cmp ? cmp.clientHeight : null,
      cmpOverflow: cmp ? cmp.scrollHeight - cmp.clientHeight : null,
      cmpOverflowStyle: cmp ? getComputedStyle(cmp).overflowY : null,
    };
  });
}

// ---------- 5. GROUP COLOURS ----------
await p.evaluate(() => document.getElementById('idxopen').click());
await p.waitForTimeout(800);
R.groupColors = await p.evaluate(() => {
  const dots = [...document.querySelectorAll('.ix-g-dot')];
  const seen = new Map();
  dots.forEach(d => { const c = getComputedStyle(d).backgroundColor; const r = d.getBoundingClientRect(); if (!seen.has(c)) seen.set(c, { c, w: Math.round(r.width), h: Math.round(r.height) }); });
  return [...seen.values()];
});
await p.keyboard.press('Escape');
await p.waitForTimeout(500);
// does the group colour reach the stage?
R.stageAccent = await p.evaluate(() => {
  const kick = document.querySelector('.sh-kick');
  const eyebrow = document.querySelector('.cmp-eyebrow');
  return {
    shKick: kick ? getComputedStyle(kick).color : null,
    cmpEyebrow: eyebrow ? getComputedStyle(eyebrow).color : null,
    topicAccentVar: getComputedStyle(document.documentElement).getPropertyValue('--topic-accent') || '(unset)',
    accVar: getComputedStyle(document.documentElement).getPropertyValue('--acc'),
  };
});

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_vd-visual.json', JSON.stringify({ R, errs }, null, 1));
console.log(JSON.stringify(R, null, 1));
console.log('ERRORS:', errs.length ? errs : 'none');
await b.close();
