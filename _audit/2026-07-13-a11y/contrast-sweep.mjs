/* CONTRAST SWEEP — cover axe's blind spot with painted pixels.

   axe lands 9,276/9,288 checks in `incomplete`: it can evaluate contrast on only ~8% of this
   app's text (gradients + pseudo-elements defeat its background model). The room system IS a
   colour system — 177 `color:var(--acc*)` text rules — so the one thing axe cannot do is
   exactly the thing that needed checking.

   This measures the REAL painted contrast of every visible leaf text node, in every room and
   theme, by differential rendering:
      A = surface as shipped
      B = same surface, every text node forced transparent
      background := dominant colour of B inside the node's box  (whatever painted it)
      glyphs     := pixels that CHANGED between A and B         (can only be that node's text)
      foreground := modal colour of the glyph core (darkest decile — excludes anti-aliasing)
   Animation-settled, because sampling mid-fade is how the earlier run invented 12 phantom
   violations.

   NEGATIVE CONTROL: known-bad and known-boundary elements are injected into every single
   surface sweep. If the sweep ever fails to flag the known-bad one, that sweep is void. */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = `${OUT}/shots/axe`;
mkdirSync(SHOTS, { recursive: true });

const ROOMS = ['messaging-events', 'data-storage', 'reliability-observability', 'platform-infra', 'architecture-apis', 'security-tenancy'];
const THEMES = ['light', 'dark'];
const PANES = ['walk', 'drill', 'trade', 'rf', 'model', 'num', 'sys'];
const FIXED_TOPIC = 'state-machine';   // content held constant so ONLY the room varies

const HELPERS = `
window.__lum = (r,g,b) => { const c=[r,g,b].map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
window.__cr  = (l1,l2) => { const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };

/* every VISIBLE LEAF text node, piercing shadow roots. Leaf-only: its box then contains its
   own glyphs and nothing else's, which is what makes the differential exact. */
window.__textLeaves = function (rootSel) {
  const out = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      if (el.children.length) continue;
      const txt = (el.textContent || '').trim();
      if (txt.length < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.99) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
      const fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight) || 400;
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      out.push({ id: out.length, sel: (el.tagName.toLowerCase() + (el.className && typeof el.className==='string' && el.className.trim() ? '.'+el.className.trim().split(/\\s+/).slice(0,2).join('.') : '')),
                 text: txt.slice(0,40), fontSize: fs, weight: fw, threshold: large ? 3.0 : 4.5,
                 declared: cs.color,
                 box: { x: Math.max(0,r.x+0.5), y: Math.max(0,r.y+0.5), w: Math.min(r.width-1, innerWidth-r.x-1), h: Math.min(r.height-1, innerHeight-r.y-1) } });
      el.__sweepId = out.length - 1;
    }
  };
  walk(rootSel ? document.querySelector(rootSel) : document.body);
  window.__leaves = out;
  return out;
};
window.__hideText = function () {
  const hide = (root) => { for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) hide(el.shadowRoot);
    if (el.__sweepId !== undefined) { el.__prevC = el.style.getPropertyValue('color'); el.style.setProperty('color','transparent','important'); } } };
  hide(document.body);
};
window.__showText = function () {
  const show = (root) => { for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) show(el.shadowRoot);
    if (el.__sweepId !== undefined) { el.style.removeProperty('color'); if (el.__prevC) el.style.setProperty('color', el.__prevC); } } };
  show(document.body);
};
window.__decode = async function (url) {
  const img = new Image(); await new Promise(r => { img.onload = r; img.src = url; });
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  return { d: g.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height };
};
window.__sweep = async function (urlA, urlB) {
  const A = await window.__decode(urlA), B = await window.__decode(urlB);
  const res = [];
  for (const L of window.__leaves) {
    const x0 = Math.round(L.box.x), y0 = Math.round(L.box.y);
    const w = Math.round(L.box.w), h = Math.round(L.box.h);
    if (w < 4 || h < 4 || x0 + w > A.w || y0 + h > A.h) continue;
    const bgH = new Map(); const glyph = [];
    for (let yy = y0; yy < y0 + h; yy++) for (let xx = x0; xx < x0 + w; xx++) {
      const i = (yy * A.w + xx) * 4;
      const kb = (B.d[i] << 16) | (B.d[i+1] << 8) | B.d[i+2];
      bgH.set(kb, (bgH.get(kb) || 0) + 1);
      if (Math.abs(A.d[i]-B.d[i]) + Math.abs(A.d[i+1]-B.d[i+1]) + Math.abs(A.d[i+2]-B.d[i+2]) > 12)
        glyph.push([A.d[i], A.d[i+1], A.d[i+2]]);
    }
    if (!glyph.length || !bgH.size) continue;
    const bgSorted = [...bgH.entries()].sort((a,b)=>b[1]-a[1]);
    const bk = bgSorted[0][0], bp = [(bk>>16)&255,(bk>>8)&255,bk&255], bl = window.__lum(...bp);
    const scored = glyph.map(p => ({p, d: Math.abs(window.__lum(...p) - bl)})).sort((a,b)=>b.d-a.d);
    const core = scored.slice(0, Math.max(1, Math.floor(scored.length*0.10)));
    const cH = new Map(); for (const {p} of core) { const k=(p[0]<<16)|(p[1]<<8)|p[2]; cH.set(k,(cH.get(k)||0)+1); }
    const fk = [...cH.entries()].sort((a,b)=>b[1]-a[1])[0][0], fp=[(fk>>16)&255,(fk>>8)&255,fk&255];
    const ratio = +window.__cr(window.__lum(...fp), bl).toFixed(2);
    const hex = p => '#'+p.map(v=>v.toString(16).padStart(2,'0')).join('');
    res.push({ ...L, bg: hex(bp), fg: hex(fp), ratio, pass: ratio >= L.threshold, glyphPx: glyph.length });
  }
  return res;
};`;

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

async function settle() {
  await page.evaluate(async () => {
    for (let i = 0; i < 50; i++) { const r = document.getAnimations().filter(a => a.playState === 'running');
      if (!r.length) break;
      try { await Promise.race([Promise.all(r.map(a=>a.finished)), new Promise(z=>setTimeout(z,400))]); } catch(e){} }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await page.waitForTimeout(90);
}

/* On a VIRGIN first visit the app auto-opens the index overlay with a rgba(30,28,24,.45)
   scrim over the whole page. The first sweep cell measured every text node THROUGH that
   scrim and invented a screenful of failures. Assert a clean, unscrimmed surface first. */
async function ensureClean() {
  await page.evaluate(() => {
    document.querySelectorAll('[role=dialog].open, .ix-ov.open').forEach(o => {
      const x = o.querySelector('.mock-x,.cram-x,.ix-x'); if (x) x.click();
      o.classList.remove('open', 'vis');
    });
  });
  await page.keyboard.press('Escape');
  await settle();
  return await page.evaluate(() => {
    const scrims = [...document.querySelectorAll('body *')].filter(e => {
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      return r.width > 1100 && r.height > 600 && +c.opacity > 0.02 &&
             c.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
             (c.position === 'fixed' || c.position === 'absolute') && (parseInt(c.zIndex) || 0) > 0;
    });
    return { clean: scrims.length === 0, scrims: scrims.map(e => e.id || e.className) };
  });
}

/* Measure the two calibration elements ON THIS SURFACE, in a pass of their own, so a
   position:fixed control can never paint over — and be mistaken for — real content.
   (v1 attributed its own #b9b9b9-on-#fff control colours to the nav item beneath it.) */
async function validateSurface() {
  await page.evaluate(() => {
    const mk = (id, fg, bg, top) => { const p = document.createElement('p'); p.id = id;
      p.textContent = 'negative control text sample';
      p.style.cssText = `position:fixed;top:${top}px;left:8px;z-index:2147483647;margin:0;padding:10px;width:300px;font:400 15px monospace;color:${fg};background:${bg}`;
      document.body.appendChild(p); };
    mk('__ncbad', '#b9b9b9', '#ffffff', 700);   // MUST be flagged  (~1.9:1)
    mk('__ncok',  '#000000', '#ffffff', 760);   // MUST pass        (21:1)
  });
  await settle();
  await page.evaluate(() => window.__textLeaves(null));
  const a = await page.screenshot({ clip: { x:0,y:0,width:1440,height:900 } });
  await page.evaluate(() => window.__hideText());
  await page.waitForTimeout(120);
  const b2 = await page.screenshot({ clip: { x:0,y:0,width:1440,height:900 } });
  await page.evaluate(() => window.__showText());
  const res = await page.evaluate(async ({ a, b2 }) => await window.__sweep(a, b2),
    { a: 'data:image/png;base64,' + a.toString('base64'), b2: 'data:image/png;base64,' + b2.toString('base64') });
  await page.evaluate(() => { document.getElementById('__ncbad')?.remove(); document.getElementById('__ncok')?.remove(); });
  await settle();
  const ctl = res.filter(r => r.text.startsWith('negative control'));
  const bad = ctl.find(r => r.ratio < 2.5), ok = ctl.find(r => r.ratio > 15);
  return { valid: !!bad && !!ok, ctlBad: bad?.ratio ?? null, ctlOk: ok?.ratio ?? null };
}

async function sweepSurface(room, theme, pane) {
  await page.evaluate((p) => { window.location.hash = '#' + p; }, pane);
  await settle();
  await page.evaluate((g) => document.documentElement.setAttribute('data-group', g), room);
  await settle();
  if (pane === 'drill') {   // drive the REWORKED scoreboard into a graded state
    await page.evaluate(() => { const dd = document.querySelector('#drill deep-drill'); if (!dd?.shadowRoot) return;
      const r = dd.shadowRoot, press = id => r.getElementById(id)?.click();
      for (let i=0;i<5;i++){ press('adv'); press(['jg','js','jm','jg','jg'][i]); } });
    await settle();
  }
  const clean = await ensureClean();
  if (!clean.clean) return { valid: false, reason: 'scrim present: ' + clean.scrims.join(','), nodes: [] };

  // 1) validate the instrument ON THIS SURFACE (controls in their own pass)
  const v = await validateSurface();
  if (!v.valid) return { valid: false, reason: 'controls not recovered', nodes: [] };

  // 2) now measure the REAL content, with no controls on screen
  await page.evaluate(() => window.__textLeaves(null));
  const shotA = await page.screenshot({ clip: { x:0, y:0, width:1440, height:900 } });
  await page.evaluate(() => window.__hideText());
  await page.waitForTimeout(120);
  const shotB = await page.screenshot({ clip: { x:0, y:0, width:1440, height:900 } });
  await page.evaluate(() => window.__showText());
  const res = await page.evaluate(async ({ a, b2 }) => await window.__sweep(a, b2),
    { a: 'data:image/png;base64,' + shotA.toString('base64'), b2: 'data:image/png;base64,' + shotB.toString('base64') });

  return { valid: true, ctlBad: v.ctlBad, ctlOk: v.ctlOk, nodes: res.filter(r => !r.text.startsWith('negative control')) };
}

const all = [];
const voids = [];
console.log('room                        theme  pane   nodes  FAIL  worst   control(bad/ok)');
console.log('-'.repeat(80));
for (const room of ROOMS) {
  for (const theme of THEMES) {
    await page.goto(URL, { waitUntil: 'load' });
    await settle();
    await page.addScriptTag({ content: HELPERS });
    await page.evaluate((t) => TopicRegistry.setTopic(t), FIXED_TOPIC);
    await settle();
    await page.evaluate((t) => { const de=document.documentElement; if((de.dataset.theme||'light')!==t) document.getElementById('themetog').click(); }, theme);
    await settle();
    for (const pane of PANES) {
      const s = await sweepSurface(room, theme, pane);
      if (!s.valid) { voids.push({ room, theme, pane, reason: s.reason });
        console.log(`${room.padEnd(27)} ${theme.padEnd(6)} ${pane.padEnd(6)} VOID — ${s.reason}`); continue; }
      const fails = s.nodes.filter(n => !n.pass);
      const worst = s.nodes.length ? Math.min(...s.nodes.map(n=>n.ratio)) : null;
      for (const n of s.nodes) all.push({ room, theme, pane, ...n });
      console.log(`${room.padEnd(27)} ${theme.padEnd(6)} ${pane.padEnd(6)} ${String(s.nodes.length).padStart(5)} ${String(fails.length).padStart(5)}  ${String(worst).padStart(5)}   ${s.ctlBad}/${s.ctlOk}`);
    }
  }
}

writeFileSync(`${OUT}/contrast-sweep.json`, JSON.stringify({ all, voids }, null, 2));
const fails = all.filter(n => !n.pass);
console.log('\n=== SWEEP SUMMARY (painted pixels, animation-settled) ===');
console.log('  text nodes measured :', all.length);
console.log('  void surfaces       :', voids.length, '(negative control must be recovered on every surface)');
console.log('  FAILING nodes       :', fails.length);
if (fails.length) {
  const g = {};
  for (const f of fails) { const k = `${f.sel} | "${f.text.slice(0,26)}"`; (g[k] ||= []).push(f); }
  console.log('\n  --- failures, grouped ---');
  for (const [k, list] of Object.entries(g).sort((a,b)=>a[1][0].ratio-b[1][0].ratio)) {
    const rooms = [...new Set(list.map(f=>`${f.room}/${f.theme}`))];
    const worst = Math.min(...list.map(f=>f.ratio));
    console.log(`   ${worst.toFixed(2)}:1 (need ${list[0].threshold})  ${k}`);
    console.log(`        fg ${list[0].fg} on ${list[0].bg} | ${list[0].fontSize}px/${list[0].weight} | panes: ${[...new Set(list.map(f=>f.pane))].join(',')}`);
    console.log(`        in ${rooms.length}/12 room-theme cells: ${rooms.join(', ')}`);
  }
}
await b.close();
