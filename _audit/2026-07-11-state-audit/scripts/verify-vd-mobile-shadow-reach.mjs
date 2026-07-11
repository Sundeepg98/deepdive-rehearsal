import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const DEEP = `
  const __deepAll=(sel,root=document)=>{const out=[...root.querySelectorAll(sel)];const walk=(r)=>{for(const e of r.querySelectorAll('*')){if(e.shadowRoot){out.push(...e.shadowRoot.querySelectorAll(sel));walk(e.shadowRoot);}}};walk(root);return out;};
  const __deepOne=(sel)=>__deepAll(sel)[0]||null;
`;
async function boot() {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(900);
  const x = await p.$('.ix-ov.open .ix-x'); if (x) { await x.click(); await p.waitForTimeout(400); }
  return { ctx, p };
}

console.log('DECISIVE TEST: can a rule in the PAGE stylesheet (styles.css) reach each element?');
console.log('Method: inject `SEL{min-height:44px!important}` (or font-size) into document head, then re-measure.');
console.log('If the measurement does NOT change -> the element is inside a shadow root -> a styles.css fix is a NO-OP.\n');

const CASES = [
  // [selector, pane to navigate to, property to test, injected css]
  ['.wb-rev', 'wb', 'height', '.wb-rev{min-height:44px!important}'],
  ['.wb-got', 'wb', 'height', '.wb-got{min-height:44px!important}'],
  ['.wb-miss', 'wb', 'height', '.wb-miss{min-height:44px!important}'],
  ['.op-rev', 'open', 'height', '.op-rev{min-height:44px!important}'],
  ['.piv-jump', 'sys', 'height', '.piv-jump{min-height:44px!important}'],
  ['.arc-t', 'walk', 'fontSize', '.arc-t{font-size:33px!important}'],
  ['.msel', 'model', 'gridTemplateColumns', '.msel{grid-template-columns:1fr!important}'],
  ['.dots i', 'walk', 'animationName', '.dots i.on{animation:none!important}'],
  ['#num input', 'num', 'fontSize', '#num input{font-size:16px!important}'],
  ['.mb-rev', null, 'height', '.mb-rev{min-height:44px!important}'],   // mock-run overlay
  // --- controls we EXPECT to be reachable (light DOM) — the control group ---
  ['.tools-fab', null, 'height', '.tools-fab{min-height:44px!important}'],
  ['#_focus-toggle', null, 'height', '#_focus-toggle{min-height:44px!important}'],
  ['.mockbtn', null, 'fontSize', '.mockbtn{font-size:16px!important}'],
  ['.crambtn', null, 'height', '.crambtn{min-height:44px!important}'],
  ['.tn-step', null, 'height', '.tn-step{min-height:60px!important}'],
  ['.mcomp', null, 'borderTopWidth', '.mcomp{border-top-width:7px!important}'],
];

const results = [];
for (const [sel, pane, prop, css] of CASES) {
  const { ctx, p } = await boot();
  if (pane) { await p.evaluate(v => window.Router.navigate(v), pane); await p.waitForTimeout(700); }
  if (sel === '.mb-rev') { await p.click('#mockopen'); await p.waitForTimeout(800); }
  const read = async () => p.evaluate(`(()=>{${DEEP}
    const e=__deepOne('${sel.replace('#num input', 'input[type=number]')}');
    if(!e) return null;
    const cs=getComputedStyle(e);
    const b=e.getBoundingClientRect();
    return { v: '${prop}'==='height' ? +b.height.toFixed(1) : cs['${prop}'], inShadow: e.getRootNode()!==document };
  })()`);
  const before = await read();
  if (!before) { console.log(`  ${sel.padEnd(16)} NOT FOUND — skipped`); await ctx.close(); continue; }
  await p.addStyleTag({ content: css });
  await p.waitForTimeout(300);
  const after = await read();
  const changed = JSON.stringify(before.v) !== JSON.stringify(after.v);
  results.push({ sel, inShadow: before.inShadow, before: before.v, after: after.v, changed });
  console.log(
    `  ${sel.padEnd(16)} inShadowRoot=${String(before.inShadow).padEnd(5)} ` +
    `${prop}: ${String(before.v).padEnd(12)} -> ${String(after.v).padEnd(12)} ` +
    `${changed ? '[page CSS APPLIED]' : '[NO-OP -- page CSS CANNOT REACH IT]'}`
  );
  await ctx.close();
}

console.log('\n\n================== VERDICT ==================');
const dead = results.filter(r => !r.changed);
const live = results.filter(r => r.changed);
console.log(`  UNREACHABLE from styles.css (a fix there is a NO-OP): ${dead.length}`);
dead.forEach(r => console.log(`     ${r.sel}   (inShadowRoot=${r.inShadow})`));
console.log(`  reachable from styles.css: ${live.length}`);
live.forEach(r => console.log(`     ${r.sel}`));
await b.close();
