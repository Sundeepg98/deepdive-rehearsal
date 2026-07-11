import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile';
const b = await chromium.launch();
const DEEP = `
  const __deepAll=(sel,root=document)=>{const out=[...root.querySelectorAll(sel)];const walk=(r)=>{for(const e of r.querySelectorAll('*')){if(e.shadowRoot){out.push(...e.shadowRoot.querySelectorAll(sel));walk(e.shadowRoot);}}};walk(root);return out;};
  const __deepOne=(sel)=>__deepAll(sel)[0]||null;
`;
async function boot(w = 390) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(900);
  const x = await p.$('.ix-ov.open .ix-x'); if (x) { await x.click(); await p.waitForTimeout(500); }
  return { ctx, p };
}
const line = s => console.log(s);
const H = t => console.log('\n\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));

/* ---- F15b: MODEL ANSWERS — inspect the REAL DOM (no guessed selectors) ---- */
H('F15b. MODEL ANSWERS PANE — real DOM structure (lens: "2-col grid, 9 chips, \'Name the limits\' orphaned")');
{
  const { ctx, p } = await boot();
  await p.evaluate(() => window.Router.navigate('model')); await p.waitForTimeout(1000);
  const m = await p.evaluate(`(()=>{${DEEP}
    const host=document.querySelector('deep-model-answers');
    const root=host&&host.shadowRoot?host.shadowRoot:document.querySelector('#model');
    // find every element whose computed display is grid/flex, inside the model pane
    const grids=[...root.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);return cs.display==='grid'||cs.display==='inline-grid';})
      .map(e=>{const cs=getComputedStyle(e);const b=e.getBoundingClientRect();
        return {cls:e.className.toString().slice(0,40), tag:e.tagName.toLowerCase(), cols:cs.gridTemplateColumns, n:e.children.length, w:+b.width.toFixed(0),
                childTexts:[...e.children].map(c=>c.textContent.trim().slice(0,22))};});
    // does 'Name the limits' exist anywhere?
    const all=[...root.querySelectorAll('*')].filter(e=>e.children.length===0 && /name the limits/i.test(e.textContent));
    return {hasHost:!!host, grids, nameTheLimits: all.map(e=>({cls:e.className.toString(), tag:e.tagName.toLowerCase()}))};
  })()`);
  line('  deep-model-answers shadow host: ' + m.hasHost);
  line('  GRID containers found inside the model pane: ' + m.grids.length);
  m.grids.forEach(g => {
    line(`     <${g.tag}.${g.cls}>  grid-template-columns="${g.cols}"  children=${g.n}  width=${g.w}`);
    line(`        children: ${JSON.stringify(g.childTexts)}`);
  });
  line('  elements containing "Name the limits": ' + JSON.stringify(m.nameTheLimits));
  await p.screenshot({ path: `${SHOTS}/f15b-model-390.png` });
  await ctx.close();
}

/* ---- F13b: .dots i.on animation ---- */
H('F13b. .dots i.on  (dotActivePulse — box-shadow animation)');
{
  const { ctx, p } = await boot();
  await p.evaluate(() => window.Router.navigate('walk')); await p.waitForTimeout(800);
  const m = await p.evaluate(`(()=>{${DEEP}
    const dot=__deepOne('.dots i.on')||__deepOne('.dots i');
    if(!dot) return {found:false};
    const cs=getComputedStyle(dot);
    return {found:true, cls:dot.className, animation:cs.animation, boxShadow:cs.boxShadow, inShadowRoot: dot.getRootNode()!==document, count:__deepAll('.dots i').length};
  })()`);
  line('  ' + JSON.stringify(m));
  await ctx.close();
}

/* ---- F15c: tab strip — which tabs are visible / clipped mid-word ---- */
H('F15c. TAB STRIP visibility (lens: only ~3.5 of 9 tabs visible; "Syste[m]" permanently clipped mid-word)');
{
  const { ctx, p } = await boot();
  const m = await p.evaluate(() => {
    const strip = document.querySelector('.sidebar .seg');
    const sr = strip.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    return {
      vw, stripClientW: strip.clientWidth, stripScrollW: strip.scrollWidth,
      tabs: [...strip.querySelectorAll('button')].map(bt => {
        const r = bt.getBoundingClientRect();
        const visInViewport = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
        return { label: bt.querySelector('span')?.textContent.trim(), w: +r.width.toFixed(0), left: +r.left.toFixed(0), visiblePx: +visInViewport.toFixed(0), pctVisible: +(100 * visInViewport / r.width).toFixed(0) };
      })
    };
  });
  line(`  strip: clientWidth=${m.stripClientW} scrollWidth=${m.stripScrollW}  visual viewport=${m.vw}`);
  m.tabs.forEach(t => line(`     ${String(t.label).padEnd(14)} w=${String(t.w).padStart(4)} left=${String(t.left).padStart(4)}  visible ${String(t.pctVisible).padStart(3)}%  (${t.visiblePx}px)`));
  const fully = m.tabs.filter(t => t.pctVisible === 100).length;
  const partial = m.tabs.filter(t => t.pctVisible > 0 && t.pctVisible < 100);
  line(`  => ${fully} of ${m.tabs.length} tabs fully visible; partially clipped: ${partial.map(t => `${t.label}(${t.pctVisible}%)`).join(', ') || 'none'}`);
  await ctx.close();
}

/* ---- DEDUP: honest count of DISTINCT sub-44px targets ---- */
H('F8b. HONEST DISTINCT COUNT of sub-44px interactive elements (dedup by element identity)');
{
  const { ctx, p } = await boot();
  await p.evaluate(`window.__seen = new Set(); window.__rows = [];`);
  for (const v of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
    await p.evaluate(view => window.Router.navigate(view), v);
    await p.waitForTimeout(650);
    await p.evaluate(`(()=>{${DEEP}
      const els=__deepAll('button, a[href], input, select, textarea, summary, [role="button"]');
      for(const e of els){ const b=e.getBoundingClientRect(); if(!b.width||!b.height) continue;
        const cs=getComputedStyle(e); if(cs.visibility==='hidden') continue;
        if(b.height<44||b.width<44){ if(window.__seen.has(e)) continue; window.__seen.add(e);
          window.__rows.push({k:(e.className&&e.className.toString().split(' ')[0])||e.id||e.tagName.toLowerCase(), w:+b.width.toFixed(1), h:+b.height.toFixed(1)}); } }
    })()`);
  }
  const r = await p.evaluate(() => {
    const agg = {};
    for (const x of window.__rows) { if (!agg[x.k]) agg[x.k] = { n: 0, w: x.w, h: x.h }; agg[x.k].n++; }
    return { total: window.__rows.length, agg };
  });
  line(`  DISTINCT sub-44px interactive elements (each DOM node counted ONCE) = ${r.total}`);
  line(`  [lens reported 216 — that number double-counts persistent chrome across pane visits]`);
  Object.entries(r.agg).sort((a, c) => c[1].n - a[1].n).slice(0, 16)
    .forEach(([k, v]) => line(`     ${String(v.n).padStart(3)}x  ${k.padEnd(20)} ${v.w} x ${v.h}`));
  await ctx.close();
}

/* ---- EVIDENCE SHOT: bottom bar at 430px on the longest topic (Tools button gone) ---- */
H('EVIDENCE SHOT — bottom bar, 430px, longest topic');
{
  const { ctx, p } = await boot(430);
  await p.click('#tntrigger'); await p.waitForTimeout(400);
  await p.evaluate(() => {
    const items = [...document.querySelectorAll('.tn-item')];
    let best = null, L = 0;
    for (const i of items) { const n = i.querySelector('.tn-i-name')?.textContent.trim() || ''; if (n.length > L) { L = n.length; best = i; } }
    best?.click();
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${SHOTS}/EVIDENCE-bottombar-430-longtopic.png`, clip: { x: 0, y: 700, width: 430, height: 144 } });
  await p.screenshot({ path: `${SHOTS}/EVIDENCE-topicnav-430-longtopic.png`, clip: { x: 0, y: 100, width: 430, height: 120 } });
  const m = await p.evaluate(() => {
    const f = document.querySelector('#toolsfab').getBoundingClientRect();
    return { vw: document.documentElement.clientWidth, toolsfabLeft: +f.left.toFixed(0), toolsfabRight: +f.right.toFixed(0), offScreenBy: +(f.left - document.documentElement.clientWidth).toFixed(0) };
  });
  line('  @430px on "Production Debugging...": #toolsfab left=' + m.toolsfabLeft + ' right=' + m.toolsfabRight + ' | visual viewport=' + m.vw);
  line('  => the Tools button starts ' + m.offScreenBy + 'px BEYOND the right edge of the screen. Entirely unreachable (page cannot pan).');
  await ctx.close();
}

await b.close();
