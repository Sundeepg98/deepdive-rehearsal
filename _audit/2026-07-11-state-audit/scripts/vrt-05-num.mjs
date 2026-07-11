/* VERIFY F3: "Numbers pane silently truncates its numbers in 22/46 topics".
   <deep-numbers> shadow root. Checks: (a) the storage-engines text truncation claim,
   (b) which ancestor really clips, (c) the 414-pair scope claim at 5 widths. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

/* ---------- A: storage-engines side-by-side, 1280 vs 1920 ---------- */
console.log('=== F3-A: storage-engines /num — is the VALUE visually cut off? ===');
for (const w of [1280, 1920]) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const d = await p.evaluate(() => {
    const host = document.querySelector('deep-numbers');
    const sr = host.shadowRoot;
    const rows = [...sr.querySelectorAll('.nrow')];
    // find the clipping ancestor of a row
    const findClipper = (el) => {
      let n = el.parentNode;
      while (n) {
        if (n.nodeType === 1) {
          const cs = getComputedStyle(n);
          if (cs.overflowX === 'hidden' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') {
            return { el: n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/)[0] : ''), overflowX: cs.overflowX, right: Math.round(n.getBoundingClientRect().right), clip: Math.round(n.scrollWidth - n.clientWidth) };
          }
        }
        n = n.parentNode ? n.parentNode : (n.host || null);
      }
      return null;
    };
    return {
      vw: innerWidth,
      clipper: rows[0] ? findClipper(rows[0]) : null,
      rows: rows.map(r => {
        const k = r.querySelector('.nrow-k'), v = r.querySelector('.nrow-v');
        const vr = v ? v.getBoundingClientRect() : null;
        const cont = r.parentNode; // .card or similar
        const contR = cont ? cont.getBoundingClientRect() : null;
        return {
          k: k ? k.textContent.trim() : '',
          vFull: v ? v.textContent.trim() : '',
          vRight: vr ? Math.round(vr.right) : -1,
          contRight: contR ? Math.round(contR.right) : -1,
          cutPx: (vr && contR) ? Math.round(vr.right - contR.right) : 0,
          rowClip: Math.round(r.scrollWidth - r.clientWidth),
        };
      }),
    };
  });
  console.log(`\n--- viewport ${w} --- (row clipper: ${JSON.stringify(d.clipper)})`);
  d.rows.forEach(r => {
    const cut = r.cutPx > 0;
    console.log(`  ${cut ? 'CUT ' : 'ok  '} "${r.k}" = "${r.vFull}"  ${cut ? '<< value right edge is +' + r.cutPx + 'px PAST its container' : ''}`);
  });
  await p.screenshot({ path: SH + `f3-num-${w}-storage-engines.png` });
}

/* ---------- B: full 46 topics x 9 views scope claim ---------- */
const VIEWS = ['walk','drill','wb','sys','trade','model','num','rf','open'];
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(500);
const topics = await p.evaluate(() => window.TopicRegistry.ids());
console.log('\n=== F3-B: clipping pairs across 46 topics x 9 views (the lens said 414 pairs) ===');
console.log('pairs =', topics.length * VIEWS.length);

for (const w of [768, 1024, 1280, 1440, 1920]) {
  await p.setViewportSize({ width: w, height: 900 });
  let clipPairs = [], nonNum = [];
  for (const t of topics) {
    for (const v of VIEWS) {
      await p.goto(URL + '#' + t + '/' + v, { waitUntil: 'load' });
      await p.waitForTimeout(90);
      const r = await p.evaluate(() => {
        const st = document.querySelector('.stage');
        const stageClip = st ? Math.round(st.scrollWidth - st.clientWidth) : 0;
        // deepest true clip: any element inside the active pane's shadow root overflowing its own scroll box
        const pane = document.querySelector('.stage .pane.on');
        let inner = 0, who = '';
        if (pane) {
          const host = [...pane.children].find(c => c.shadowRoot);
          if (host) {
            const sr = host.shadowRoot;
            for (const el of sr.querySelectorAll('*')) {
              const cs = getComputedStyle(el);
              if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
                const c = el.scrollWidth - el.clientWidth;
                if (c > inner) { inner = Math.round(c); who = el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : ''); }
              }
            }
          }
        }
        return { stageClip, inner, who };
      });
      if (r.stageClip > 0) { clipPairs.push({ t, v, px: r.stageClip }); if (v !== 'num') nonNum.push({ t, v, px: r.stageClip }); }
    }
  }
  clipPairs.sort((a, c) => c.px - a.px);
  console.log(`\n vw ${w}: .stage-clipping pairs = ${clipPairs.length}/414` +
    (clipPairs.length ? `  worst: ${clipPairs[0].t}/${clipPairs[0].v} +${clipPairs[0].px}px` : ''));
  console.log(`         distinct topics = ${new Set(clipPairs.map(x => x.t)).size}; views involved = ${[...new Set(clipPairs.map(x => x.v))].join(',') || '(none)'}`);
  if (nonNum.length) console.log('         NON-num clipping pairs:', nonNum.slice(0, 6).map(x => x.t + '/' + x.v + '+' + x.px).join(', '));
}
await b.close();
