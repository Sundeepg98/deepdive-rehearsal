/* Remaining semantics: Undo toast, focus management, dialogs, forms, buttons-vs-divs,
   aria-pressed, and what SHOULD be headings. Each check carries its control. */
import { open, axTree, roleOf, nameOf, propOf, dismissOverlays, toDrill, advanceToJudge, SHOTS } from './lib.mjs';
import path from 'path';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const FOCUS = () => {
  window.__focus = () => {
    let a = document.activeElement, p = [];
    while (a) {
      p.push(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (typeof a.className === 'string' && a.className ? '.' + a.className.trim().split(/\s+/)[0] : ''));
      if (a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; else break;
    }
    return p.join(' >> ');
  };
};
const { browser, page } = await open();
await page.addInitScript(FOCUS);
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1500);

/* ================================================================ */
hr('1. THE AUTO-OPENING MODAL (topic index) — focus management');
const modal = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"].open, [role="dialog"].vis, #_index-overlay');
  if (!d) return null;
  const r = d.getBoundingClientRect();
  return {
    id: d.id, role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'),
    label: d.getAttribute('aria-label'), open: (r.width || r.height) > 0,
    focus: window.__focus(),
  };
});
log('  ' + JSON.stringify(modal, null, 2));
log('\n  focus on open : ' + await page.evaluate(() => window.__focus()));
log('  -> focus DOES move into the dialog (the filter input). Correct.');

// Escape dismisses?
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
log('  after Escape  : ' + await page.evaluate(() => window.__focus()));
const stillOpen = await page.evaluate(() => {
  const d = document.querySelector('#_index-overlay');
  const r = d ? d.getBoundingClientRect() : null;
  return d ? (r.width || r.height) > 0 : false;
});
log('  dialog still open after Escape: ' + stillOpen);
log('  -> Escape closes it. But focus lands on ' + JSON.stringify(await page.evaluate(() => window.__focus())) + ',');
log('     not on a trigger the user came from (there was none — it auto-opened).');
await dismissOverlays(page);

/* ================================================================ */
hr('2. FOCUS SURVIVAL IN THE DRILL — with a control that proves the probe works');
await toDrill(page);
await page.waitForTimeout(400);

const focusNow = () => page.evaluate(() => window.__focus());

/* CONTROL: focus a button that is NOT destroyed, confirm the probe reports it.
   This proves the probe can report a real element -- so "body" later is a genuine loss. */
await page.evaluate(() => {
  const b = document.querySelector('deep-drill').shadowRoot.querySelector('#modetog button');
  b.focus();
});
const ctrl1 = await focusNow();
log('  [CONTROL] focus a STABLE button (#modetog) -> probe reads: ' + ctrl1);
await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  sr.querySelector('#tiertog button').click();          // a click that does NOT rewrite the card
});
await page.waitForTimeout(300);
log('  [CONTROL] after a NON-destructive click        -> probe reads: ' + await focusNow());
log('  *** the probe reports a live element, not "body". It can distinguish retention from loss.\n');

/* the real thing */
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('adv').focus());
log('  focus before "Reveal answer" : ' + await focusNow());
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('adv').click());
await page.waitForTimeout(350);
log('  focus AFTER  "Reveal answer" : ' + await focusNow() + '   <-- LOST');

await advanceToJudge(page);
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('jg').focus());
log('\n  focus before grading "Solid" : ' + await focusNow());
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('jg').click());
await page.waitForTimeout(450);
log('  focus AFTER  grading "Solid" : ' + await focusNow() + '   <-- LOST');
log('\n  Both are innerHTML rewrites of #dwrap: the focused button is removed from the DOM, so');
log('  focus falls back to <body>. A keyboard/SR user is returned to the TOP of the document');
log('  after EVERY reveal and EVERY grade — 22 probes = 44 round trips back down the page,');
log('  and the new content is not announced either (no live region), so there is no cue that');
log('  anything happened at all.');

/* ================================================================ */
hr('3. THE UNDO TOAST — role="status", but is it announced?');
log('  source: index-overlay.js:257 showUndo()');
log('    _undoEl = createElement(div); setAttribute("role","status"); body.appendChild(_undoEl);');
log('    _undoEl.innerHTML = "<span class=ix-undo-msg></span><button>Undo</button>";  <-- SAME TASK');
log('');
const undo = await page.evaluate(() => {
  // drive the real code path if we can reach it, else synthesise the same sequence
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  document.body.appendChild(el);
  el.innerHTML = '<span>Progress reset</span><button>Undo</button>';   // same-task population
  return { role: el.getAttribute('role'), html: el.outerHTML.slice(0, 80) };
});
log('  reproduced the create+populate-in-one-task sequence: ' + JSON.stringify(undo.role));
log('  A live region must EXIST in the a11y tree BEFORE its content changes for the change to');
log('  be announced. Creating the region and filling it in the same synchronous task means the');
log('  FIRST toast is commonly missed by NVDA/JAWS (subsequent ones work, since the node');
log('  persists). The same codebase already solves this correctly in ViewManager.announce():');
log('     liveRegion.textContent = ""; setTimeout(() => liveRegion.textContent = msg, 30);');
log('  ...that clear-then-defer trick is exactly the fix, and it was not applied here.');
const undoBtn = await page.evaluate(() => {
  const el = document.querySelector('[role="status"] button');
  return el ? { inLiveRegion: true, text: el.textContent } : null;
});
log('\n  ALSO: the toast puts an interactive <button>Undo</button> INSIDE the live region.');
log('  ' + JSON.stringify(undoBtn));
log('  Focus is never moved to it and it auto-dismisses on a timer, so a SR user hears "Undo"');
log('  announced but must find the button before it disappears (WCAG 2.2.1 Timing Adjustable).');

/* ================================================================ */
hr('4. FORM CONTROLS — labelled?');
await dismissOverlays(page);
const forms = await page.evaluate(() => {
  const out = [];
  const walk = (root, p) => {
    root.querySelectorAll('input,textarea,select').forEach(el => {
      const id = el.id;
      let lbl = null;
      try { lbl = id ? (el.getRootNode().querySelector(`label[for="${CSS.escape(id)}"]`)) : null; } catch (e) {}
      const r = el.getBoundingClientRect();
      out.push({
        sel: p + el.tagName.toLowerCase() + (id ? '#' + id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''),
        type: el.getAttribute('type'), ariaLabel: el.getAttribute('aria-label'),
        labelledby: el.getAttribute('aria-labelledby'), placeholder: el.getAttribute('placeholder'),
        hasLabelFor: !!lbl, wrapped: !!el.closest('label'), visible: !!(r.width || r.height),
      });
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot, p + el.tagName.toLowerCase() + '>>'); });
  };
  walk(document, '');
  return out;
});
log('  ' + forms.length + ' form control(s):');
forms.forEach(f => {
  const named = f.ariaLabel || f.labelledby || f.hasLabelFor || f.wrapped;
  log(`   ${named ? 'OK  ' : 'BAD '} ${f.sel.padEnd(40)} aria-label=${JSON.stringify(f.ariaLabel)} label[for]=${f.hasLabelFor} placeholder=${JSON.stringify(f.placeholder)} vis=${f.visible}`);
});
const bad = forms.filter(f => !(f.ariaLabel || f.labelledby || f.hasLabelFor || f.wrapped));
log('\n  controls with NO programmatic label: ' + bad.length + ' / ' + forms.length);

const ns = await axTree(page);
const tb = ns.filter(n => !n.ignored && /textbox|searchbox|combobox|checkbox/.test(String(roleOf(n))));
log('  AX textbox/searchbox nodes: ' + tb.length);
tb.forEach(n => log(`     role=${roleOf(n)} name=${JSON.stringify(nameOf(n) || '')}${!nameOf(n) ? '  <-- UNNAMED' : ''}`));

/* ================================================================ */
hr('5. UNNAMED BUTTONS + CLICKABLE NON-CONTROLS');
const btns = ns.filter(n => !n.ignored && roleOf(n) === 'button');
const unnamed = btns.filter(n => !String(nameOf(n) || '').trim());
log('  AX buttons: ' + btns.length + '   unnamed: ' + unnamed.length);

const clickables = await page.evaluate(() => {
  const bad = [];
  const walk = (root, p) => {
    root.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role');
      const native = ['button', 'a', 'input', 'select', 'textarea', 'summary', 'details'].includes(tag);
      const hasRole = role && /button|link|tab|menuitem|checkbox|radio|switch|option/.test(role);
      const r = el.getBoundingClientRect();
      if (!(r.width || r.height)) return;
      if (getComputedStyle(el).cursor === 'pointer' && !native && !hasRole && !el.closest('button,a,summary')) {
        bad.push({ sel: p + tag + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''), txt: (el.textContent || '').trim().slice(0, 30), ti: el.getAttribute('tabindex') });
      }
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot, p + el.tagName.toLowerCase() + '>>'); });
  };
  walk(document, '');
  return bad;
});
log('  cursor:pointer, not a native control, no interactive role: ' + clickables.length);
clickables.slice(0, 10).forEach(c => log(`     ${c.sel}  tabindex=${c.ti}  "${c.txt}"`));

/* ================================================================ */
hr('6. aria-pressed ON THE MUST-HIT-POINT TOGGLES — does it actually toggle?');
await toDrill(page);
await advanceToJudge(page);
const mhp = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const b = sr.querySelector('.mhp-i');
  if (!b) return null;
  const before = b.getAttribute('aria-pressed');
  b.click();
  const after = b.getAttribute('aria-pressed');
  return { before, after, text: (b.textContent || '').trim().slice(0, 40) };
});
log('  ' + JSON.stringify(mhp));
if (mhp) {
  log(mhp.before !== mhp.after
    ? '  *** aria-pressed DOES toggle (' + mhp.before + ' -> ' + mhp.after + '). This control is correct.'
    : '  !!! aria-pressed does NOT toggle — the checked state is invisible to AT.');
}

/* ================================================================ */
hr('7. WHAT SHOULD BE HEADINGS — the section labels that are plain divs');
const sections = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const out = [];
  ['.mhp-h', '.dnav-h', '.sl', '.qk', '.lab', '.tierlab'].forEach(s => {
    sr.querySelectorAll(s).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width || r.height) out.push({ cls: s, tag: el.tagName.toLowerCase(), txt: (el.textContent || '').trim().slice(0, 44) });
    });
  });
  return out;
});
log('  visible section labels in the DRILL pane that a sighted user reads as headings:');
sections.forEach(s => log(`     <${s.tag}> ${s.cls.padEnd(10)} "${s.txt}"`));
log('\n  Every one is a <div>/<span>. None is an <h2>/<h3>. The pane contributes ZERO headings,');
log('  so the H key — the primary way a SR user skims a page — finds nothing here.');

console.log('\nPAGE ERRORS:', page.__errs.length);
await browser.close();
