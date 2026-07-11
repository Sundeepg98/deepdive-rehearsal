import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-mobile';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();

/* ---------- A. what is CLIPPED inside main.stage? ---------- */
console.log('===== A. content clipped by .stage{overflow-x:hidden} =====');
for (const [topic, pane] of [['sharding-strategies', 'walk'], ['api-design', 'num'], ['api-design', 'sys'], ['content-pipeline', 'wb']]) {
  await p.goto(`${URL}#${topic}/${pane}`, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const stage = document.querySelector('main.stage');
    const out = { stageClientW: stage.clientWidth, stageScrollW: stage.scrollWidth, over: stage.scrollWidth - stage.clientWidth, culprits: [] };
    if (out.over <= 1) return out;
    // deep-walk for the widest visible elements that stick out past the stage's right edge
    const sr = stage.getBoundingClientRect();
    const all = [];
    const walk = n => { for (const e of n.querySelectorAll('*')) { all.push(e); if (e.shadowRoot) walk(e.shadowRoot); } };
    walk(stage);
    for (const e of all) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const b = e.getBoundingClientRect();
      if (b.width <= 0) continue;
      const past = b.right - sr.right;
      if (past > 1) out.culprits.push({
        sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : ''),
        w: +b.width.toFixed(1), past: +past.toFixed(1), ws: cs.whiteSpace, ox: cs.overflowX,
        txt: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 55)
      });
    }
    out.culprits.sort((a, b) => b.past - a.past);
    out.culprits = out.culprits.slice(0, 5);
    return out;
  });
  console.log(`\n  ${topic}/${pane}: stage clientW=${r.stageClientW} scrollW=${r.stageScrollW} -> CUT OFF +${r.over}px`);
  r.culprits.forEach(c => console.log(`     ${c.sel} w=${c.w} past-right-edge=+${c.past}px ws=${c.ws} ox=${c.ox} "${c.txt}"`));
  if (r.over > 1) await p.screenshot({ path: `${S}/stage-clip-${topic}-${pane}-360.png` });
}

/* ---------- B. the .piv chip clipped in sys ---------- */
console.log('\n\n===== B. .piv pivot chip clipped in System Map =====');
await p.goto(`${URL}#api-design/sys`, { waitUntil: 'load' });
await p.waitForTimeout(900);
const piv = await p.evaluate(() => {
  const sr = document.querySelector('deep-system-map').shadowRoot;
  return [...sr.querySelectorAll('details.piv')].map(d => {
    const chip = d.querySelector('span.chip');
    const cb = chip?.getBoundingClientRect();
    const db = d.getBoundingClientRect();
    return {
      detailsOpen: d.open,
      detailsW: +db.width.toFixed(1), detailsOverflow: getComputedStyle(d).overflow,
      chipW: chip ? +cb.width.toFixed(1) : null,
      chipWhiteSpace: chip ? getComputedStyle(chip).whiteSpace : null,
      chipVisiblePx: chip ? +(db.right - cb.left).toFixed(1) : null,
      chipCutOffPx: chip ? +(cb.right - db.right).toFixed(1) : null,
      chipText: chip ? chip.textContent.trim().replace(/\s+/g, ' ') : null
    };
  });
});
console.log(JSON.stringify(piv, null, 2));
await p.screenshot({ path: `${S}/sys-piv-chip-clipped-360.png` });

/* ---------- C. vertical: phantom whitespace + bottom-bar occlusion (RCA root causes 1 & 2) ---------- */
console.log('\n\n===== C. vertical scroll / phantom whitespace / bottom-bar occlusion =====');
for (const pane of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
  await p.goto(`${URL}#content-pipeline/${pane}`, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  const v = await p.evaluate(() => {
    const de = document.documentElement;
    // scroll to the very bottom
    window.scrollTo(0, de.scrollHeight);
    return new Promise(res => setTimeout(() => {
      const cta = document.querySelector('.mockcta').getBoundingClientRect();
      const stage = document.querySelector('main.stage');
      // last real content element in the stage (deepest last visible child)
      const all = [];
      const walk = n => { for (const e of n.querySelectorAll('*')) { const cs = getComputedStyle(e); if (cs.display !== 'none' && cs.visibility !== 'hidden' && e.getBoundingClientRect().height > 0) all.push(e); if (e.shadowRoot) walk(e.shadowRoot); } };
      walk(stage);
      const maxBottom = Math.max(...all.map(e => e.getBoundingClientRect().bottom));
      res({
        scrollH: de.scrollHeight, clientH: de.clientHeight, scrollY: Math.round(window.scrollY),
        atBottom: Math.round(window.scrollY + de.clientHeight) >= de.scrollHeight - 1,
        lastContentBottom: +maxBottom.toFixed(1),
        ctaTop: +cta.top.toFixed(1),
        // >0 => last content sits UNDER the fixed bottom bar (occluded)
        occludedBy: +(maxBottom - cta.top).toFixed(1),
        // dead space between last content and the bottom of the scroll range
        deadSpaceBelowContent: +(de.clientHeight - maxBottom).toFixed(1)
      });
    }, 400));
  });
  const flag = v.occludedBy > 0 ? `  <-- CONTENT UNDER BAR (+${v.occludedBy}px)` : '';
  console.log(`  ${pane.padEnd(6)} scrollH=${v.scrollH} clientH=${v.clientH} | lastContentBottom=${v.lastContentBottom} ctaTop=${v.ctaTop} occluded=${v.occludedBy}px deadSpace=${v.deadSpaceBelowContent}px${flag}`);
}

/* ---------- D. mesh-gradient pseudo-element regression (RCA root cause 1) ---------- */
console.log('\n\n===== D. RCA root-cause-1 check: .stage::before/::after containment =====');
const mesh = await p.evaluate(() => {
  const stage = document.querySelector('.stage');
  const cs = getComputedStyle(stage);
  const before = getComputedStyle(stage, '::before');
  const after = getComputedStyle(stage, '::after');
  const de = document.documentElement;
  const base = de.scrollHeight;
  return {
    stagePosition: cs.position,          // must be 'relative' (the RCA fix)
    beforePosition: before.position, beforeContent: before.content,
    afterPosition: after.position, afterContent: after.content,
    docScrollHeight: base, docClientHeight: de.clientHeight
  };
});
console.log(JSON.stringify(mesh, null, 2));
console.log(mesh.stagePosition === 'relative'
  ? '  => .stage IS position:relative -> pseudo-elements contained. RCA root cause 1 has NOT regressed.'
  : '  => !! .stage is NOT position:relative -> RCA root cause 1 HAS REGRESSED.');
await b.close();
