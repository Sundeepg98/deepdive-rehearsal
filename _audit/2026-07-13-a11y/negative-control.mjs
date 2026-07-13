/* NEGATIVE CONTROL v2 — prove the axe harness can go RED.
   v1 taught us two things:
     - my button-name control was WRONG (#themetog has real text, so stripping aria-label
       left it correctly named — axe was right to stay green)
     - color-contrast is LIVE but 100% DEFEATED by this app: all 158 text nodes land in
       `incomplete` (pseudo-elements / gradients), never in `violations`.
   So the contrast control below proves the rule FIRES on a clean flat element — i.e. the
   instrument works, and the app's own painting is what blinds it. That distinction is the
   whole finding. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const AXE = readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.addScriptTag({ content: AXE });

async function run(rule) {
  return await p.evaluate(async (r) => {
    const res = await axe.run(document, { runOnly: { type: 'rule', values: [r] } });
    const cnt = (bk) => res[bk].reduce((n, v) => n + v.nodes.length, 0);
    return {
      violations: cnt('violations'),
      incomplete: cnt('incomplete'),
      targets: res.violations.flatMap(v => v.nodes.map(n => n.target.flat().join(' >>> '))).slice(0, 2),
    };
  }, rule);
}

const results = [];
async function control(name, rule, breakFn, restoreFn) {
  const before = await run(rule);
  await p.evaluate(breakFn);
  const after = await run(rule);
  await p.evaluate(restoreFn);
  const restored = await run(rule);
  const wentRed = after.violations > before.violations;
  const wentGreen = restored.violations === before.violations;
  const ok = wentRed && wentGreen;
  results.push({ name, rule, baseline: before.violations, broken: after.violations, restored: restored.violations, WENT_RED: ok, caught: after.targets[0] || null });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(52)} baseline=${before.violations} broken=${after.violations} restored=${restored.violations}`);
  if (after.targets[0]) console.log(`       caught -> ${after.targets[0]}`);
  return ok;
}

console.log('=== NEGATIVE CONTROLS v2 — each must go RED when broken, GREEN when restored ===\n');

// 1. button-name — a genuinely NAMELESS button (no text, no aria-label). v1's control was invalid.
await control('1. button-name (nameless icon button)', 'button-name',
  () => { const x = document.createElement('button'); x.id = '__nc1'; x.type = 'button';
          x.innerHTML = '<span aria-hidden="true">★</span>'; document.querySelector('.hdr').appendChild(x); },
  () => { const x = document.getElementById('__nc1'); if (x) x.remove(); });

// 2. color-contrast — prove the RULE IS LIVE on a clean, flat-background element
//    (no pseudo, no gradient). If this fires, the rule works and the APP is what blinds it.
await control('2. color-contrast (clean flat element, #b9b9b9 on #fff)', 'color-contrast',
  () => { const x = document.createElement('p'); x.id = '__nc2';
          x.textContent = 'Deliberately low contrast text for the negative control';
          x.style.cssText = 'color:#b9b9b9;background:#ffffff;font-size:14px;padding:8px;position:relative;z-index:99999';
          document.querySelector('.hdr').appendChild(x); },
  () => { const x = document.getElementById('__nc2'); if (x) x.remove(); });

// 3. color-contrast INSIDE A SHADOW ROOT — clean flat element inside the walkthrough pane's
//    shadow tree. This is where the room system's var(--acc*) usages actually live, so the
//    rule must be able to reach in there at all.
await control('3. color-contrast (clean flat element INSIDE shadow root)', 'color-contrast',
  () => { const root = document.querySelector('#walk deep-walkthrough').shadowRoot;
          const x = document.createElement('p'); x.id = '__nc3';
          x.textContent = 'Low contrast text inside the shadow root';
          x.style.cssText = 'color:#bcbcbc;background:#ffffff;font-size:14px;padding:8px;position:relative;z-index:99999';
          root.appendChild(x); },
  () => { const root = document.querySelector('#walk deep-walkthrough').shadowRoot;
          const x = root.getElementById('__nc3'); if (x) x.remove(); });

// 4. aria-hidden-focus — a focusable element hidden from AT (classic overlay bug)
await control('4. aria-hidden-focus (focusable inside aria-hidden)', 'aria-hidden-focus',
  () => { const w = document.createElement('div'); w.id = '__nc4'; w.setAttribute('aria-hidden', 'true');
          w.innerHTML = '<button type="button">reachable but hidden</button>'; document.querySelector('.hdr').appendChild(w); },
  () => { const x = document.getElementById('__nc4'); if (x) x.remove(); });

// 5. label — form control with no accessible name
await control('5. label (unlabelled input)', 'label',
  () => { const i = document.createElement('input'); i.type = 'text'; i.id = '__nc5'; document.querySelector('.hdr').appendChild(i); },
  () => { const i = document.getElementById('__nc5'); if (i) i.remove(); });

// 6. image-alt
await control('6. image-alt (img with no alt)', 'image-alt',
  () => { const i = document.createElement('img'); i.id = '__nc6';
          i.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          i.style.cssText = 'width:40px;height:40px'; document.querySelector('.hdr').appendChild(i); },
  () => { const i = document.getElementById('__nc6'); if (i) i.remove(); });

console.log('\n=== VERDICT ===');
const allRed = results.every(r => r.WENT_RED);
console.log(allRed
  ? 'ALL 6 CONTROLS WENT RED THEN GREEN — the axe harness is live and CAN fail.\n  color-contrast fires on clean elements in BOTH light DOM and shadow DOM,\n  which means the 158 `incomplete` results on the real page are the APP defeating\n  the rule (pseudo-elements + gradients), not the rule being absent.'
  : 'SOME CONTROL DID NOT GO RED — harness NOT trustworthy for those rules.');
console.log(JSON.stringify(results, null, 2));
await b.close();
process.exit(allRed ? 0 : 1);
