import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();

for (const [w, h] of [[320, 568], [360, 640], [390, 844], [414, 896]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL + '#api-design/walk', { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const r = await p.evaluate(() => {
    const de = document.documentElement;
    const sw = () => de.scrollWidth;
    const vw = de.clientWidth;
    const out = { vw, baseline: sw() };

    const tn = document.getElementById('topicnav');
    const trig = document.getElementById('tntrigger');
    const cur = document.getElementById('tncurrent');
    const cta = document.querySelector('.mockcta');
    const seg = document.querySelector('.sidebar .seg');
    const rail = document.querySelector('.rail');

    const box = e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { w: +b.width.toFixed(1), right: +b.right.toFixed(1), pos: cs.position, minW: cs.minWidth, flex: cs.flex, ws: cs.whiteSpace, overflow: cs.overflowX }; };
    out.topicnav = box(tn);
    out.tntrigger = box(trig);
    out.tncurrent = { ...box(cur), text: cur.textContent.trim() };
    out.mockcta = box(cta);
    out.seg = box(seg);
    out.rail = rail ? box(rail) : null;
    out.sideId = box(document.querySelector('.side-id'));

    // --- bisect: hide topicnav ---
    tn.style.display = 'none';
    out.without_topicnav = sw();
    tn.style.display = '';

    // --- bisect: let the trigger shrink (the classic flex min-width:auto trap) ---
    const prev = { tnMin: tn.style.minWidth, trigMin: trig.style.minWidth, curMin: cur.style.minWidth };
    trig.style.minWidth = '0'; cur.style.minWidth = '0'; cur.style.overflow = 'hidden'; cur.style.textOverflow = 'ellipsis';
    out.with_minwidth0_on_trigger = sw();
    trig.style.minWidth = prev.trigMin; cur.style.minWidth = prev.curMin; cur.style.overflow = ''; cur.style.textOverflow = '';

    // --- bisect: hide the whole side-id header ---
    const si = document.querySelector('.side-id');
    si.style.display = 'none';
    out.without_sideId = sw();
    si.style.display = '';

    // --- bisect: hide mockcta ---
    cta.style.display = 'none';
    out.without_mockcta = sw();
    cta.style.display = '';

    // --- what is `html > body > div` (the 4th offender)? ---
    const bodyDivs = [...document.body.children].filter(e => e.tagName === 'DIV');
    out.bodyDivs = bodyDivs.map(e => ({ cls: e.className, id: e.id, ...box(e), scrollW: e.scrollWidth, clientW: e.clientWidth }));

    // min-content width of the trigger's parts
    out.tnCurrentScrollW = cur.scrollWidth;
    out.tnMenuHidden = document.getElementById('tnmenu')?.hasAttribute('hidden');
    return out;
  });
  console.log(`\n===== viewport ${w}x${h} (clientWidth=${r.vw}) =====`);
  console.log(`  baseline scrollWidth      : ${r.baseline}   (overflow +${r.baseline - r.vw}px)`);
  console.log(`  WITHOUT #topicnav         : ${r.without_topicnav}   (overflow +${r.without_topicnav - r.vw}px)  <-- ${r.without_topicnav <= r.vw ? 'FIXED' : 'still over'}`);
  console.log(`  trigger min-width:0       : ${r.with_minwidth0_on_trigger}   (overflow +${r.with_minwidth0_on_trigger - r.vw}px)  <-- ${r.with_minwidth0_on_trigger <= r.vw ? 'FIXED' : 'still over'}`);
  console.log(`  WITHOUT .side-id          : ${r.without_sideId}   (overflow +${r.without_sideId - r.vw}px)`);
  console.log(`  WITHOUT .mockcta          : ${r.without_mockcta}   (overflow +${r.without_mockcta - r.vw}px)`);
  console.log(`  #topicnav  : w=${r.topicnav.w} right=${r.topicnav.right} pos=${r.topicnav.pos}`);
  console.log(`  #tntrigger : w=${r.tntrigger.w} minW=${r.tntrigger.minW} flex=${r.tntrigger.flex}`);
  console.log(`  #tncurrent : w=${r.tncurrent.w} whiteSpace=${r.tncurrent.ws} scrollW=${r.tnCurrentScrollW} text="${r.tncurrent.text}"`);
  console.log(`  .seg       : w=${r.seg.w} pos=${r.seg.pos} (fixed bar stretched by widened ICB)`);
  console.log(`  .mockcta   : w=${r.mockcta.w} pos=${r.mockcta.pos}`);
  console.log(`  body>div    :`, JSON.stringify(r.bodyDivs));
  await ctx.close();
}
await b.close();
