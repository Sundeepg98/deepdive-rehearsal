/* ============================================================================
   VERIFIER for the screen-reader drill fixes. Run against THIS worktree's dist.

   Four assertions, each with a NEGATIVE CONTROL that must be observed flipping:

     A. Grading a probe produces >=1 live-region announcement carrying the
        outcome AND the score.            CONTROL: stub ViewManager.announce -> must go 0.
     B. Focus after a grade is NOT <body>. CONTROL: activeElement.blur() -> probe must say body.
        (document.body.focus() is a NO-OP -- the audit learned this the hard way.)
     C. .locator exposes an accessible NAME in the real AX tree, with a role that
        makes aria-label legal.           CONTROL: strip aria-label -> name must vanish.
     D. The mock timer is NOT a live region (role=timer keeps its implicit live=off).
        GROUND TRUTH = Chromium's COMPUTED AX `live` property, NOT a role regex.
        (The audit's own monitor hardcodes /timer/ as live-by-role, which is wrong per
        ARIA and would have reported this fix as a no-op.)
        CONTROL: re-add aria-live=polite -> computed live must go back to "polite".

   Usage: node _audit/2026-07-13-a11y/sr-verify.mjs
   Exit code 0 = all assertions AND all controls passed. Non-zero = red.
   ============================================================================ */
import { chromium } from 'playwright';

const APP = 'file:///D:/claude-workspace/_worktrees/deepdive-rehearsal/a11y-sr/dist/index.html';

const results = [];
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));
function assert(name, pass, detail) {
  results.push({ name, pass, detail });
  log(`   ${pass ? 'PASS' : '!! FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

/* ---------------- in-page instruments ---------------- */
const INSTRUMENTS = () => {
  /* Announcement capture: watch EVERY aria-live region in the light DOM (that is where
     ViewManager's announcer lives) and record each non-empty text it settles on.
     We record the TEXT, so we can assert on content, not just "something happened". */
  window.__ann = [];
  window.__annObs = [];
  window.__watchAnn = () => {
    window.__ann = [];
    window.__annObs.forEach(o => o.disconnect());
    window.__annObs = [];
    const regions = Array.from(document.querySelectorAll('[aria-live]'))
      .filter(el => (el.getAttribute('aria-live') || 'off') !== 'off');
    regions.forEach(r => {
      const o = new MutationObserver(() => {
        const t = (r.textContent || '').trim();
        if (t) window.__ann.push({ text: t, from: r.tagName.toLowerCase() + (r.id ? '#' + r.id : '') + '.' + (r.className || '') });
      });
      o.observe(r, { subtree: true, childList: true, characterData: true });
      window.__annObs.push(o);
    });
    return regions.length;
  };
  window.__stopAnn = () => { window.__annObs.forEach(o => o.disconnect()); window.__annObs = []; return window.__ann; };

  /* Focus probe: walk activeElement THROUGH shadow roots. Returns a readable path.
     If it ends at <body>, focus was destroyed. */
  window.__focus = () => {
    let el = document.activeElement, path = [];
    while (el) {
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      else if (typeof el.className === 'string' && el.className) s += '.' + el.className.trim().split(/\s+/)[0];
      path.push(s);
      if (el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
      else break;
    }
    return path.join(' >> ');
  };

  const sr = () => document.querySelector('deep-drill').shadowRoot;
  window.__drill = sr;
  window.__toJudge = () => {
    for (let i = 0; i < 12; i++) {
      if (sr().getElementById('jg')) return true;
      const b = sr().getElementById('adv');
      if (!b) return false;
      b.click();
    }
    return !!sr().getElementById('jg');
  };
};

/* ---------------- CDP AX helpers (ground truth) ---------------- */
/* CDP wraps every value in an AXValue: {type:'token', value:'polite'}. Unwrapping only ONE
   level yields that OBJECT, so `live === 'polite'` is never true and the check can never
   PASS -- the mirror image of this repo's "checks that cannot fail". D-CONTROL caught it.
   Unwrap to the primitive. */
const val = (p) => {
  if (!p || p.value === undefined) return undefined;
  const v = p.value;
  return (v && typeof v === 'object' && v.value !== undefined) ? v.value : v;
};
const propOf = (n, k) => { const p = (n.properties || []).find(x => x.name === k); return p ? val(p) : undefined; };

async function axOf(cdp, page, expression) {
  const { result } = await cdp.send('Runtime.evaluate', { expression, returnByValue: false });
  if (!result || !result.objectId) return null;
  const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId });
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId, fetchRelatives: false });
  await cdp.send('Runtime.releaseObject', { objectId: result.objectId }).catch(() => {});
  const n = nodes[0];
  if (!n) return null;
  return { role: val(n.role), name: val(n.name), live: propOf(n, 'live'), ignored: n.ignored };
}

/* ============================== RUN ============================== */
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.addInitScript(INSTRUMENTS);
await page.goto(APP, { waitUntil: 'load' });
await page.waitForTimeout(1800);

const cdp = await ctx.newCDPSession(page);
await cdp.send('Accessibility.enable');
await cdp.send('DOM.enable');

/* dismiss the auto-opening topic-index modal */
for (let i = 0; i < 4; i++) {
  const open = await page.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"]'))
    .filter(d => { const r = d.getBoundingClientRect(); return (r.width || r.height) && getComputedStyle(d).visibility !== 'hidden'; }).length);
  if (!open) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}
await page.click('button[data-tab="drill"]');
await page.waitForTimeout(700);

/* ---------------------------------------------------------------- */
hr('A. GRADING ANNOUNCES THE OUTCOME + THE SCORE');

await page.evaluate(() => window.__toJudge());
await page.waitForTimeout(250);
const nRegions = await page.evaluate(() => window.__watchAnn());
log(`   watching ${nRegions} live region(s) in the light DOM`);
await page.evaluate(() => window.__drill().getElementById('jg').click());
await page.waitForTimeout(500);
const ann = await page.evaluate(() => window.__stopAnn());
log('   captured:', JSON.stringify(ann.map(a => a.text)));

const joined = ann.map(a => a.text).join(' | ');
assert('A1 >=1 announcement on grade', ann.length >= 1, `${ann.length} captured`);
assert('A2 announcement names the OUTCOME', /solid/i.test(joined), JSON.stringify(joined.slice(0, 80)));
assert('A3 announcement carries the SCORE', /\d+\s*solid/i.test(joined) && /\d+\s*left/i.test(joined), JSON.stringify(joined.slice(0, 80)));

/* --- CONTROL A: stub the announcer. Capture MUST go to 0. --- */
log('\n   [CONTROL A] stubbing ViewManager.announce -> capture must go to 0');
await page.evaluate(() => { window.__realAnn = window.ViewManager.announce; window.ViewManager.announce = function () {}; });
await page.evaluate(() => window.__toJudge());
await page.waitForTimeout(200);
await page.evaluate(() => window.__watchAnn());
await page.evaluate(() => window.__drill().getElementById('jg').click());
await page.waitForTimeout(500);
const annCtl = await page.evaluate(() => window.__stopAnn());
log('   captured with announcer stubbed:', JSON.stringify(annCtl.map(a => a.text)));
assert('A-CONTROL capture goes to 0 when the call is removed', annCtl.length === 0,
  annCtl.length === 0 ? 'the capture is measuring OUR call, not noise' : 'CAPTURE IS DECORATION -- it fires without the call');
await page.evaluate(() => { window.ViewManager.announce = window.__realAnn; });
log('   restored.');

/* ---------------------------------------------------------------- */
hr('B. FOCUS SURVIVES THE RE-RENDER (activeElement is not <body>)');

await page.evaluate(() => window.__toJudge());
await page.waitForTimeout(200);
const fBefore = await page.evaluate(() => { window.__drill().getElementById('jg').focus(); return window.__focus(); });
log(`   focus BEFORE grade : ${fBefore}`);
await page.evaluate(() => window.__drill().getElementById('jg').click());
await page.waitForTimeout(500);
const fAfter = await page.evaluate(() => window.__focus());
log(`   focus AFTER  grade : ${fAfter}`);
assert('B1 focus is NOT body after a grade', fAfter !== 'body' && fAfter.length > 0, fAfter);
assert('B2 focus landed inside the drill', /deep-drill/.test(fAfter), fAfter);

/* reveal path */
const fRevBefore = await page.evaluate(() => {
  const b = window.__drill().getElementById('adv');
  if (b) { b.focus(); return window.__focus(); } return '(no #adv)';
});
await page.evaluate(() => { const b = window.__drill().getElementById('adv'); if (b) b.click(); });
await page.waitForTimeout(400);
const fRevAfter = await page.evaluate(() => window.__focus());
log(`\n   focus BEFORE reveal: ${fRevBefore}`);
log(`   focus AFTER  reveal: ${fRevAfter}`);
assert('B3 focus is NOT body after a reveal', fRevAfter !== 'body' && fRevAfter.length > 0, fRevAfter);

/* --- CONTROL B: blur() really does dump focus to body. body.focus() is a NO-OP. --- */
log('\n   [CONTROL B] activeElement.blur() -> probe MUST report body');
const fBlur = await page.evaluate(() => {
  let el = document.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
  el.blur();
  return window.__focus();
});
log(`   focus after blur()  : ${fBlur}`);
assert('B-CONTROL probe CAN report body', fBlur === 'body',
  fBlur === 'body' ? 'the probe distinguishes retention from loss' : 'PROBE IS BLIND -- it never reports body');

/* ---------------------------------------------------------------- */
hr('C. .locator KEEPS ITS ACCESSIBLE NAME, LEGALLY');

const locAX = await axOf(cdp, page, `document.querySelector('.locator')`);
log('   AX node:', JSON.stringify(locAX));
const locRole = await page.evaluate(() => document.querySelector('.locator').getAttribute('role'));
assert('C1 .locator has an accessible NAME', !!(locAX && locAX.name && locAX.name.length > 3), JSON.stringify(locAX && locAX.name));
assert('C2 the name is not IGNORED by the AX tree', !!(locAX && !locAX.ignored), `ignored=${locAX && locAX.ignored}`);
assert('C3 aria-label is now LEGAL (role makes it allowed)', locRole === 'img', `role="${locRole}"`);

/* --- CONTROL C: strip EVERY name source -> the name must vanish.
   First attempt stripped only aria-label and the name did NOT vanish -- it fell back to
   "Architecture & APIs" from the title attribute, because for role=img the name computation
   is aria-label -> title. That is not a blind read (the string demonstrably changed), it is a
   SECOND name source. Same trap the audit hit on form fields, where the control had to strip
   aria-label AND placeholder. Strip both; do not weaken the assertion. --- */
log('\n   [CONTROL C] strip aria-label AND title (both name sources) -> AX name must vanish');
const locLabelOnly = await page.evaluate(() => {
  const L = document.querySelector('.locator');
  L.removeAttribute('aria-label');
  return true;
});
const locMid = await axOf(cdp, page, `document.querySelector('.locator')`);
log(`   with aria-label stripped (title remains): name=${JSON.stringify(locMid && locMid.name)}  <- falls back to title (locLabelOnly=${locLabelOnly})`);
await page.evaluate(() => document.querySelector('.locator').removeAttribute('title'));
const locNo = await axOf(cdp, page, `document.querySelector('.locator')`);
log('   with BOTH stripped:', JSON.stringify(locNo));
assert('C-CONTROL the AX-name read CAN go red', !(locNo && locNo.name && locNo.name.length > 3),
  `name=${JSON.stringify(locNo && locNo.name)}`);

/* restore + re-verify it comes back (proves we are reading live, not a cache) */
const restored = await page.evaluate(() => {
  const L = document.querySelector('.locator');
  L.setAttribute('title', 'Architecture & APIs');
  L.setAttribute('aria-label', 'Architecture & APIs — ingestion layer');
  return true;
});
const locBack = await axOf(cdp, page, `document.querySelector('.locator')`);
log(`   restored -> name=${JSON.stringify(locBack && locBack.name)}  (restored=${restored})`);

/* also: the runtime rewriter (topic-protocol applyIdentity) must ALSO set role=img,
   not just the static index.html. Switch topic and re-read. */
log('\n   [topic switch] the runtime rewriter must re-apply role=img, not just the static markup');
const switched = await page.evaluate(() => {
  if (typeof TopicRegistry === 'undefined') return null;
  const ids = TopicRegistry.ids ? TopicRegistry.ids() : null;
  const cur = TopicRegistry.current();
  const next = (ids || []).find(x => x !== (cur && cur.id));
  if (!next) return null;
  TopicRegistry.setTopic(next);
  return next;
});
await page.waitForTimeout(600);
if (switched) {
  const locAfterSwitch = await axOf(cdp, page, `document.querySelector('.locator')`);
  const roleAfter = await page.evaluate(() => document.querySelector('.locator').getAttribute('role'));
  log(`   after setTopic('${switched}'):`, JSON.stringify(locAfterSwitch), `role="${roleAfter}"`);
  assert('C4 role=img SURVIVES the runtime topic rewrite', roleAfter === 'img', `role="${roleAfter}"`);
  assert('C5 the name is re-applied for the new topic', !!(locAfterSwitch && locAfterSwitch.name && locAfterSwitch.name.length > 3), JSON.stringify(locAfterSwitch && locAfterSwitch.name));
} else {
  log('   (only one topic registered -- skipped)');
}

/* ---------------------------------------------------------------- */
hr('D. THE MOCK TIMER IS NOT A LIVE REGION (computed AX live, not a role regex)');

await page.evaluate(() => { const d = document.querySelector('deep-drill'); d.setMode && d.setMode('mock'); });
await page.waitForTimeout(700);
const tAX = await axOf(cdp, page, `document.querySelector('deep-drill').shadowRoot.getElementById('timer')`);
const tAttr = await page.evaluate(() => {
  const t = document.querySelector('deep-drill').shadowRoot.getElementById('timer');
  return { ariaLive: t.getAttribute('aria-live'), role: t.getAttribute('role'), display: getComputedStyle(t).display };
});
log('   timer AX  :', JSON.stringify(tAX));
log('   timer attrs:', JSON.stringify(tAttr));
assert('D1 timer keeps role=timer', tAX && tAX.role === 'timer', `role=${tAX && tAX.role}`);
assert('D2 computed AX live is OFF (not polite)', !tAX || !tAX.live || tAX.live === 'off',
  `live=${JSON.stringify(tAX && tAX.live)}`);
assert('D3 no explicit aria-live attribute remains', tAttr.ariaLive === null, `aria-live=${tAttr.ariaLive}`);

/* --- CONTROL D: put aria-live back -> computed live MUST go to polite. --- */
log('\n   [CONTROL D] re-add aria-live=polite -> computed AX live must go back to "polite"');
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('timer').setAttribute('aria-live', 'polite'));
const tAX2 = await axOf(cdp, page, `document.querySelector('deep-drill').shadowRoot.getElementById('timer')`);
log('   timer AX with aria-live re-added:', JSON.stringify(tAX2));
assert('D-CONTROL the live-property read CAN go red', tAX2 && tAX2.live === 'polite',
  `live=${JSON.stringify(tAX2 && tAX2.live)}`);
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('timer').removeAttribute('aria-live'));
log('   restored.');

/* ---------------------------------------------------------------- */
hr('E. NO NEW BUGS: focus is not STOLEN, and the shadow CSS actually took effect');

/* E1/E2. The focus move is opt-in precisely so boot and topic-switch do NOT steal focus into
   a pane the user is not looking at. renderTopic -> setMode('study') -> renderD runs for EVERY
   pane on boot, drill included, visible or not. Prove it does not grab focus. */
const page2 = await ctx.newPage();
await page2.addInitScript(INSTRUMENTS);
await page2.goto(APP, { waitUntil: 'load' });
await page2.waitForTimeout(1800);
const bootFocus = await page2.evaluate(() => window.__focus());
log(`   focus after BOOT (drill pane rendered but not shown): ${bootFocus}`);
assert('E1 boot does NOT steal focus into the drill', !/deep-drill/.test(bootFocus), bootFocus);

/* park focus on a known control OUTSIDE the drill, switch topic, and prove it is not yanked */
for (let i = 0; i < 4; i++) {
  const openN = await page2.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"]'))
    .filter(d => { const r = d.getBoundingClientRect(); return (r.width || r.height) && getComputedStyle(d).visibility !== 'hidden'; }).length);
  if (!openN) break;
  await page2.keyboard.press('Escape');
  await page2.waitForTimeout(300);
}
await page2.evaluate(() => { const b = document.querySelector('button[data-tab="walk"]'); if (b) b.focus(); });
const beforeSwitch = await page2.evaluate(() => window.__focus());
await page2.evaluate(() => {
  const ids = TopicRegistry.ids ? TopicRegistry.ids() : [];
  const cur = TopicRegistry.current();
  const next = ids.find(x => x !== (cur && cur.id));
  if (next) TopicRegistry.setTopic(next);
});
await page2.waitForTimeout(700);
const afterSwitch = await page2.evaluate(() => window.__focus());
log(`   focus before topic switch: ${beforeSwitch}`);
log(`   focus after  topic switch: ${afterSwitch}`);
assert('E2 a topic switch does NOT steal focus into the drill', !/deep-drill/.test(afterSwitch), afterSwitch);
await page2.close();

/* E3. The announcer must be in the a11y tree BEFORE the first message (the eager-creation fix).
   A region created and populated in one breath is commonly missed by NVDA/JAWS. */
const page3 = await ctx.newPage();
await page3.goto(APP, { waitUntil: 'load' });
await page3.waitForTimeout(1500);
const regionAtBoot = await page3.evaluate(() => {
  const r = Array.from(document.querySelectorAll('[aria-live="polite"][aria-atomic="true"]'))
    .filter(el => el.style && el.style.position === 'absolute');
  return { count: r.length, text: r.length ? r[0].textContent : null };
});
log('   announcer region present at boot:', JSON.stringify(regionAtBoot));
assert('E3 announcer exists in the DOM before any drill message', regionAtBoot.count >= 1,
  `${regionAtBoot.count} region(s)`);
await page3.close();

/* E4/E5. The focus-ring CSS lives in DRILL_STYLE -- the shadow root's own <style> -- which
   cascades BEFORE adoptedStyleSheets (BASE_SHEET, ANS_SHEET) and would therefore LOSE a tie.
   Prove at RUNTIME, with getComputedStyle on the node that ACTUALLY received focus, that the
   rule took effect -- rather than assuming a selector that may match nothing.
   Sequencing matters: back to study mode and perform a REAL reveal first. (Reading this after
   a plain setMode() found no [tabindex] at all, because setMode deliberately does not move
   focus -- the check was measuring a card that had never been focused.) */
await page.evaluate(() => { document.querySelector('deep-drill').setMode('study'); });
await page.waitForTimeout(400);
await page.evaluate(() => { const b = window.__drill().getElementById('adv'); if (b) { b.focus(); b.click(); } });
await page.waitForTimeout(400);
const outline = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const el = sr.activeElement;                       /* the node that ACTUALLY has focus */
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  return {
    found: true, sel: el.tagName.toLowerCase() + '.' + (el.className || ''),
    tabindex: el.getAttribute('tabindex'),
    outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth,
  };
});
log('   computed style on the node that ACTUALLY has focus:', JSON.stringify(outline));
assert('E4 the focused node is the revealed block, with tabindex=-1',
  outline.found && outline.tabindex === '-1' && /ans|thread|fu/.test(outline.sel), JSON.stringify(outline));
/* HONESTY NOTE: on its own this one is WEAK -- `outline-style:none` is also the UA default for a
   non-:focus-visible node, so it cannot distinguish my rule from no rule (its first control
   proved exactly that). It is meaningful ONLY as the POINTER half of a pair: pointer => no ring,
   keyboard => ring (E8). If both halves read the same, the styling is not modality-aware and one
   of them is wrong. The load-bearing, control-proven assertion is E8. */
assert('E5 a POINTER-driven focus move paints NO ring (weak alone; pairs with E8)',
  outline.found && outline.outlineStyle === 'none', `outline-style=${outline.outlineStyle}`);

/* E5 above is NOT, on its own, a real check -- and its first control proved it.
   Deleting my `outline:none` rule left the computed style at `none` REGARDLESS, because the UA
   only paints a ring on :focus-visible, which a script-focus after a MOUSE click does not match.
   So `outline:none` is indistinguishable from the default in that state: E5 would have passed
   with my CSS deleted entirely. It was decoration.
   The DISCRIMINATING measurement is the :focus-visible rule, exercised from a real KEYBOARD
   interaction -- which is also the question that actually matters for a sighted keyboard user:
   can they SEE where focus went? Expect my ring (solid 2px). Then delete the rule and watch it
   change: THAT is the control. */
hr('E5-KB. KEYBOARD MODALITY: the ring must appear for keyboard users, and be MY ring');

await page.evaluate(() => { document.querySelector('deep-drill').setMode('study'); });
await page.waitForTimeout(400);
await page.evaluate(() => { const b = window.__drill().getElementById('adv'); if (b) b.focus(); });
await page.keyboard.press('Enter');                  /* a REAL keypress -> keyboard modality */
await page.waitForTimeout(400);

const kb = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const el = sr.activeElement;
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  return {
    found: true, sel: el.tagName.toLowerCase() + '.' + (el.className || ''),
    matchesFV: el.matches(':focus-visible'),
    outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor,
  };
});
log('   after a KEYBOARD-driven reveal:', JSON.stringify(kb));
assert('E7 keyboard reveal moves focus to the revealed block', kb.found && /ans|fu|thread/.test(kb.sel), JSON.stringify(kb.sel));
assert('E8 a sighted KEYBOARD user gets a visible focus ring', kb.found && kb.outlineStyle === 'solid' && kb.outlineWidth === '2px',
  `outline=${kb.outlineStyle} ${kb.outlineWidth} (focus-visible=${kb.matchesFV})`);

/* THE control: delete the :focus-visible rule from the shadow root's own <style> and re-read.
   If the ring does not change, the rule was never what was painting it. */
const kbCtl = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const st = sr.querySelector('style');
  const saved = st.textContent;
  const stripped = saved.replace(/\.thread\[tabindex\]:focus-visible[^}]*\}/, '');
  const changed = stripped !== saved;
  st.textContent = stripped;
  const without = getComputedStyle(sr.activeElement).outlineStyle + ' ' + getComputedStyle(sr.activeElement).outlineWidth;
  st.textContent = saved;                            /* restore */
  const after = getComputedStyle(sr.activeElement).outlineStyle + ' ' + getComputedStyle(sr.activeElement).outlineWidth;
  return { ruleWasFound: changed, without: without, restored: after };
});
log('   [CONTROL E8] with the :focus-visible rule deleted:', JSON.stringify(kbCtl));
assert('E8-CONTROL the ring is MY rule (deleting it changes the computed outline)',
  kbCtl.ruleWasFound && kbCtl.without !== 'solid 2px' && kbCtl.restored === 'solid 2px',
  `found=${kbCtl.ruleWasFound} without="${kbCtl.without}" restored="${kbCtl.restored}"`);

/* E6. Ticking a must-hit point must NOT destroy focus (it only sets textContent/classes --
   confirming a path that was already correct, so a future refactor cannot silently break it). */
await page.evaluate(() => { const d = document.querySelector('deep-drill'); d.setMode('study'); });
await page.waitForTimeout(400);
await page.evaluate(() => window.__toJudge());
await page.waitForTimeout(300);
const mhpFocus = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const it = sr.querySelector('.mhp-i');
  if (!it) return '(no must-hit points on this card)';
  it.focus(); it.click();
  return window.__focus();
});
log(`   focus after ticking a must-hit point: ${mhpFocus}`);
assert('E6 ticking a must-hit point preserves focus', !/^body$/.test(mhpFocus), mhpFocus);

/* ---------------------------------------------------------------- */
hr('SUMMARY');
const failed = results.filter(r => !r.pass);
results.forEach(r => log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`));
log(`\n  ${results.length - failed.length}/${results.length} passed`);
log(`  page errors: ${errs.length}${errs.length ? ' -> ' + errs.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (failed.length || errs.length) { log('\n  RED'); process.exit(1); }
log('\n  GREEN');
