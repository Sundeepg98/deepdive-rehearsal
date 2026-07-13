/* Chrome's real accessibility tree (via CDP - what TalkBack/VoiceOver consume),
 * plus axe-core at a phone viewport. Corrected focus-obscured maths: a control
 * that IS the fixed bar cannot be "buried under" the fixed bar.
 */
import fs from 'node:fs';
import { launch, phone, installDeep, ensureDirs, save, PHONES } from './lib.mjs';
ensureDirs();

const AXE = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');
const b = await launch();
const out = {};
const p = await phone(b, PHONES.p390);
await installDeep(p);
await p.locator('.ix-card').first().tap().catch(() => {});
await p.waitForTimeout(1000);

/* ---------- corrected WCAG 2.4.11: exclude the chrome's own children ---------- */
const focus = [];
await p.evaluate(() => document.body.focus());
for (let i = 0; i < 40; i++) {
  await p.keyboard.press('Tab');
  const info = await p.evaluate(() => {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    if (!a || a === document.body) return null;
    const r = a.getBoundingClientRect();
    const chrome = [...document.querySelectorAll('.mockcta, #scrolltop')].filter((e) => {
      const cs = getComputedStyle(e); const cr = e.getBoundingClientRect();
      return cs.position === 'fixed' && cr.height > 0 && cr.top < innerHeight;
    });
    // a control that lives INSIDE the bar is not obscured BY the bar
    if (chrome.some((c) => c.contains(a))) return { el: a.id || a.tagName, isChrome: true, coveredPct: 0 };
    let covered = 0;
    for (const c of chrome) {
      const cr = c.getBoundingClientRect();
      const ox = Math.min(r.right, cr.right) - Math.max(r.left, cr.left);
      const oy = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top);
      if (ox > 0 && oy > 0) covered += ox * oy;
    }
    const area = Math.max(1, r.width * r.height);
    return {
      el: a.tagName.toLowerCase() + (a.id ? '#' + a.id : '.' + (a.getAttribute('class') || '').split(' ')[0]),
      label: (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      y: Math.round(r.top), isChrome: false,
      coveredPct: Math.min(100, Math.round((covered / area) * 100)),
    };
  });
  if (info && !info.isChrome) focus.push(info);
}
const fully = focus.filter((f) => f.coveredPct >= 100);
const partly = focus.filter((f) => f.coveredPct > 0 && f.coveredPct < 100);
console.log('=============== WCAG 2.4.11 FOCUS NOT OBSCURED (corrected) ===============');
console.log(`  focus stops examined (excluding the bar's own buttons): ${focus.length}`);
console.log(`  ENTIRELY hidden behind the fixed bar (2.4.11 AA fail)  : ${fully.length}`);
console.log(`  partially hidden (passes 2.4.11 AA, fails 2.4.12 AAA)  : ${partly.length}`);
for (const f of partly) console.log(`     ${f.coveredPct}% covered  ${f.el}  "${f.label}"`);
out.focusObscured = { fully, partly, n: focus.length };

/* ---------- Chrome's accessibility tree via CDP ---------- */
const cdp = await p.context().newCDPSession(p);
await cdp.send('Accessibility.enable');
const { nodes } = await cdp.send('Accessibility.getFullAXTree');
const live = nodes.filter((n) => !n.ignored);
const named = live.filter((n) => n.name && n.name.value);
const sheetNames = ['Topic index', 'Search', 'Copy link', 'Star this topic', 'Your notes', 'Print Q&A', 'One-page cram sheet', 'Session progress', 'Mixed fire', 'Game plan', 'Scope it first', 'Dark mode'];
const exposed = sheetNames.filter((s) => named.some((n) => (n.name.value || '').startsWith(s)));
console.log('\n=============== CHROME ACCESSIBILITY TREE (tools sheet CLOSED) ===============');
console.log(`  AX nodes total ${nodes.length}, exposed (not ignored) ${live.length}`);
console.log(`  controls from the CLOSED, off-screen tools sheet STILL announced: ${exposed.length}/${sheetNames.length}`);
console.log(`    ${exposed.join(' | ')}`);
const roles = {};
for (const n of live) { const r = n.role?.value || '?'; roles[r] = (roles[r] || 0) + 1; }
console.log(`  headings exposed: ${roles.heading || 0} | buttons: ${roles.button || 0} | landmarks: main=${roles.main || 0} nav=${roles.navigation || 0} banner=${roles.banner || 0}`);
out.axTree = { total: nodes.length, exposed: live.length, exposedClosedSheet: exposed, roles };

/* ---------- axe-core ---------- */
await p.evaluate(AXE);
const res = await p.evaluate(async () => await window.axe.run(document, {
  resultTypes: ['violations'],
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
}));
console.log('\n=============== AXE-CORE @ 390x844 (WCAG A/AA) ===============');
const vs = res.violations.sort((a, c) => c.nodes.length - a.nodes.length);
for (const v of vs) {
  console.log(`  [${v.impact}] ${v.id}  (${v.nodes.length} nodes) - ${v.help}`);
  for (const n of v.nodes.slice(0, 4)) console.log(`       ${n.target.join(' ')}`);
}
console.log(`  => ${vs.length} violation types / ${vs.reduce((a, v) => a + v.nodes.length, 0)} nodes`);
console.log('  NOTE: axe walks the light DOM; it cannot see inside the 17 closed shadow roots,');
console.log('        which is where roughly 40% of this app\'s controls live. Not a clean bill.');
out.axe = vs.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 6).map((n) => n.target.join(' ')) }));

/* axe negative control */
await p.evaluate(() => {
  const btn = document.createElement('button');
  btn.id = '__nc_nolabel'; btn.style.cssText = 'position:fixed;top:0;left:0;width:30px;height:30px';
  document.body.appendChild(btn);
  const img = document.createElement('img');
  img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  document.body.appendChild(img);
});
const res2 = await p.evaluate(async () => await window.axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }));
const cb = res2.violations.some((v) => v.id === 'button-name');
const ci = res2.violations.some((v) => v.id === 'image-alt');
console.log('\n=============== NEGATIVE CONTROL (axe) ===============');
console.log(`  unlabelled <button> -> axe raised button-name: ${cb}`);
console.log(`  <img> with no alt   -> axe raised image-alt  : ${ci}`);
console.log('  ' + (cb && ci ? 'OK — axe is live and CAN fail on this page.' : '*** axe not firing ***'));
out.axeNC = { cb, ci };

await b.close();
save('07b-axtree-axe.json', out);
