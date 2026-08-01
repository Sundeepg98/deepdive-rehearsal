/* ===================== THE FOCUS RING SURVIVES (W1 / G4 / W-X8) =====================
 *
 * ONE QUESTION, THREE MECHANISMS. "Does keyboard focus in this app look like this app?" The audit
 * found the answer was no, in three different ways, and this file guards all three. The third
 * (X10, the HALO) arrived in the 2026-07-30 cross-browser round, which pointed out that this file
 * could only ever read half of a focus indicator -- see arms 7-12 at the bottom.
 *
 *   P3-6  LIGHT DOM, EXPLICIT REMOVAL. Three chrome buttons wrote `outline:none` on :focus --
 *         `.ix-c-reset` (styles.css:1475), `.cmp-fold` (:1528), `.cmp-reopen` (:1530). What was
 *         left was an OPACITY CHANGE BYTE-IDENTICAL TO THEIR OWN :hover, i.e. focus and hover were
 *         the same event and neither said "you are here". Note the specificity trap: `.cmp-fold:focus`
 *         is (0,2,0) and OUTRANKS the app's `button:focus-visible` (0,1,1) at styles.css:53, so a
 *         fix that only adds a generic rule LOSES. This check reads the COMPUTED outline, so it can
 *         only pass if the fix actually wins the cascade.
 *
 *   P2-3  SHADOW DOM, UNREACHABLE RULE. `button:focus-visible` is a DOCUMENT rule and cannot cross a
 *         shadow boundary. The drill root's adoptedStyleSheets carried exactly four :focus-visible
 *         rules (.flow-go, .revset-b and two landing pads) and no generic one -- so `#adv` and the
 *         1/2/3 grade buttons, the most-pressed controls in a keyboard-driven trainer, fell back to
 *         Chrome's UA ring: ~0.7px near-black, offset 0, weakest of all in dark mode on a near-black
 *         card. Prior #20 fixed this for ONE class; the fix belongs to the pattern (BASE_SHEET).
 *
 *   X10   THE HALF THIS FILE COULD NOT READ. Every probe above returns outline only, so a focus
 *         indicator's other half -- the box-shadow halo -- was unguarded by construction. On #home
 *         a focused .hm-room wore its own room in the outline and the roomless brand indigo in the
 *         halo. Arms 7-12 read box-shadow; the long note above them explains what they assert and
 *         why there is not one colour literal in them.
 *
 * THE ASSERTION IS THE APP'S OWN RING, not merely "something is drawn": solid, >= 2px, and coloured
 * var(--acc) resolved in-page against the live room accent. `outline-style !== none` alone would
 * pass on the UA hairline this exists to eliminate. Every arm also asserts `:focus-visible` really
 * matched, so a ring that appears for some other reason cannot green it.
 *
 * Pure computed-style reads after a scripted focus() -- no clock, no fonts, no pixels.
 * WATCHED RED: the first SIX arms fail on the pre-fix build -- the original five (P2-3/P3-6), plus
 * .piv-jump, the fourth member of the P3-6 class, added by W4 (2026-07-29). The count said
 * "five" for one wave after the sixth arm landed; corrected on the cold verify's F-9. Of the six
 * added by W-X8 (2026-07-30), the four .hm-room arms are watched red on the pre-X8 build; the two
 * .hm-cta arms are regression guards on W15's fix and were watched red against a build with
 * styles.css:2007 reverted. Total 12.
 *
 * Usage: node test/focus_ring.cjs [deliverable.html]   (CHROME=<path>)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

const fails = [], notes = [];
const chk = (name, ok, detail) => {
  notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail));
  if (!ok) fails.push(name);
};

/* One ring verdict. `r` is {err} or {fv, width, style, color, offset, accRgb}. */
const judge = (label, r) => {
  if (!r || r.err) { chk(label, false, (r && r.err) || 'no result'); return; }
  const w = parseFloat(r.width);
  const ok = r.fv && r.style === 'solid' && w >= 2 && r.color === r.accRgb;
  chk(label, ok, ':focus-visible=' + r.fv + '  outline=' + r.width + ' ' + r.style + ' ' + r.color +
    ' offset=' + r.offset + '  vs --acc ' + r.accRgb +
    '  (a UA hairline is ~0.7-0.8px auto near-black at offset 0; `none` is the removal this guards)');
};

/* Runs IN PAGE against a light-DOM selector. */
const RING = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return { err: 'selector not found: ' + sel };
  if (!el.getClientRects().length) return { err: sel + ' is not rendered (cannot receive focus), so the ring cannot be measured' };
  el.focus({ focusVisible: true });     /* deterministic :focus-visible, no modality heuristic */
  if (document.activeElement !== el && !(el.getRootNode().activeElement === el)) return { err: sel + ' did not take focus' };
  const cs = getComputedStyle(el);
  const probe = document.createElement('span');
  probe.style.color = 'var(--acc)';
  el.appendChild(probe);
  const accRgb = getComputedStyle(probe).color;   /* resolve var(--acc) to rgb, compare like-for-like */
  probe.remove();
  return { fv: el.matches(':focus-visible'), width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, offset: cs.outlineOffset, accRgb: accRgb };
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  /* >=1280px: .cmp-fold / .cmp-reopen are the DESKTOP companion rail's controls and are scoped
     there in CSS. Below that they do not render, and an unrendered control cannot be focused. */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  /* ---------- 1-2. the SHADOW half: #adv and the #jg grade button inside deep-drill ----------
     Done FIRST because grading one probe is also what makes a topic non-'untouched', which is the
     precondition for the .ix-c-reset button to exist at all (panels.js:237). */
  await page.evaluate(() => { if (window.Router) window.Router.navigate('drill'); else switchTab('drill'); });
  await B.until(page, () => {
    const d = document.querySelector('#drill deep-drill');
    const r = d && d.shadowRoot;
    const b = r && r.getElementById('adv');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, 'the drill renders its #adv control');

  const SHADOW_RING = (id) => {
    const host = document.querySelector('#drill deep-drill');
    const root = host && host.shadowRoot;
    if (!root) return { err: 'deep-drill shadow root not found' };
    const el = root.getElementById(id);
    if (!el) return { err: '#' + id + ' not present in the drill shadow root' };
    if (!el.getClientRects().length) return { err: '#' + id + ' is not rendered' };
    el.focus({ focusVisible: true });
    if (root.activeElement !== el) return { err: '#' + id + ' did not take focus' };
    const cs = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.color = 'var(--acc)';
    el.appendChild(probe);
    const accRgb = getComputedStyle(probe).color;
    probe.remove();
    return { fv: el.matches(':focus-visible'), width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, offset: cs.outlineOffset, accRgb: accRgb };
  };

  judge('#adv (Reveal answer, shadow DOM) shows the app ring -- the document rule cannot cross the boundary, so BASE_SHEET must carry it',
    await page.evaluate(SHADOW_RING, 'adv'));

  /* Reveal once so the 1/2/3 grade row exists (it renders from stage >= 1). */
  await page.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const a = r.getElementById('adv'); if (a) a.click();
  });
  await B.until(page, () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const b = r && r.getElementById('jg');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, 'the grade row (#jm/#js/#jg) renders after the reveal');
  judge('#jg (Solid, the most-pressed control in the app) shows the app ring, not the ~0.7px UA hairline',
    await page.evaluate(SHADOW_RING, 'jg'));

  /* ---------- 3. .ix-c-reset -- the per-topic reset inside the index overlay ----------
     Grade the probe first: panels.js:237 emits this button only for a topic whose status is not
     'untouched', so on a cold boot the control does not exist and the arm would be untestable. */
  await page.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const g = r.getElementById('jg'); if (g) g.click();
  });
  await B.until(page, () => {
    const id = TopicRegistry.current().id;
    return typeof Progress !== 'undefined' && Progress.status(id) !== 'untouched';
  }, null, B.ACT_MS, 'the graded topic leaves the untouched state');
  await page.evaluate(() => { if (window.IndexOverlay && IndexOverlay.open) IndexOverlay.open(); });
  await B.until(page, () => {
    const b = document.querySelector('.ix-c-reset');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, '.ix-c-reset renders inside the open index overlay');
  judge('.ix-c-reset shows the app ring on keyboard focus (styles.css:1475 wrote outline:none)',
    await page.evaluate(RING, '.ix-c-reset'));
  await page.evaluate(() => { if (window.IndexOverlay && IndexOverlay.close) IndexOverlay.close(); });
  await B.until(page, () => !document.querySelector('.ix-ov.open'), null, B.ACT_MS, 'index overlay closes');

  /* ---------- 4. .cmp-fold -- fold the desktop companion rail ---------- */
  await page.evaluate(() => { if (document.body) document.body.classList.remove('cmp-collapsed'); });
  await B.until(page, () => {
    const b = document.querySelector('.cmp-fold');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, '.cmp-fold renders on the >=1280px companion rail');
  judge('.cmp-fold shows the app ring on keyboard focus (styles.css:1528 wrote outline:none; its :focus is (0,2,0) and outranks button:focus-visible)',
    await page.evaluate(RING, '.cmp-fold'));

  /* ---------- 3. .cmp-reopen -- the edge tab that brings the rail back (display:none until folded) ---------- */
  await page.evaluate(() => { if (document.body) document.body.classList.add('cmp-collapsed'); });
  await B.until(page, () => {
    const b = document.querySelector('.cmp-reopen');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, '.cmp-reopen renders once the rail is folded');
  judge('.cmp-reopen shows the app ring on keyboard focus (styles.css:1530 wrote outline:none)',
    await page.evaluate(RING, '.cmp-reopen'));
  await page.evaluate(() => { if (document.body) document.body.classList.remove('cmp-collapsed'); });

  /* ---------- 6. .piv-jump -- the System Map's pivot jump, the FOURTH member of the P3-6 class.
     Found by the W1 verifier, fixed in W4. It is a SHADOW button (deep-system-map) whose rule was
     `.piv-jump:hover,.piv-jump:focus{...outline:none}` -- (0,2,0), so it outranked BASE_SHEET's
     generic button:focus-visible, and what survived was a background swap byte-identical to its
     own :hover. It lives inside <details class="piv">, which must be OPEN for the button to be
     rendered and therefore focusable. ---------- */
  await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('sys'); });
  await B.until(page, () => {
    const h = document.querySelector('deep-system-map');
    const r = h && h.shadowRoot;
    if (!r) return false;
    const d = r.querySelector('details.piv');
    if (d) d.open = true;
    const b = r.querySelector('.piv-jump');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, 'the System Map renders a .piv-jump inside an open pivot');
  judge('.piv-jump shows the app ring on keyboard focus (system-map.js wrote :focus{outline:none}; its (0,2,0) outranked the BASE_SHEET rule)',
    await page.evaluate(() => {
      const root = document.querySelector('deep-system-map').shadowRoot;
      const el = root.querySelector('.piv-jump');
      if (!el) return { err: '.piv-jump not present in the system-map shadow root' };
      if (!el.getClientRects().length) return { err: '.piv-jump is not rendered' };
      el.focus({ focusVisible: true });
      if (root.activeElement !== el) return { err: '.piv-jump did not take focus' };
      const cs = getComputedStyle(el);
      const probe = document.createElement('span');
      probe.style.color = 'var(--acc)';
      el.appendChild(probe);
      const accRgb = getComputedStyle(probe).color;
      probe.remove();
      return { fv: el.matches(':focus-visible'), width: cs.outlineWidth, style: cs.outlineStyle,
               color: cs.outlineColor, offset: cs.outlineOffset, accRgb: accRgb };
    }));

  await page.close();

  /* ================= 7-12. THE HALO, NOT THE OUTLINE (W-X8 / audit X10) =================
     THE ARM THIS FILE STRUCTURALLY DID NOT HAVE. Every probe above returns
     {fv, width, style, color, offset, accRgb} -- OUTLINE ONLY. The cross-browser audit named that
     directly: a focus indicator is an outline AND a halo, and this check could see one of them, so
     a whole defect class was invisible to it by construction. X10 lived in the half it could not
     read: on #home a focused .hm-room computed `outline 2px solid var(--rm)` (its own room) while
     its box-shadow fell through to the generic button:focus-visible (styles.css:53) in the roomless
     brand indigo -- two hues 3px apart on one indicator, in all six rooms and both themes.

     WHAT THIS ASKS, and why it is the right question. Not "is the halo #006B63" -- a hex here would
     be a second copy of the palette that drifts the day a room is retuned, and the W15 wave already
     paid for that lesson. It asks the RELATIONAL thing: does this element's halo derive from the
     SAME room its outline claims -- the element's own --rm -- rather than from --acc? Both sides are
     resolved BY THE ENGINE, at the element, through the identical property: a hidden probe span is
     appended inside the element and given the expected box-shadow, and its COMPUTED value is
     compared to the element's own. Same inherited --rm, same serialisation path, zero literals.

     IT CARRIES ITS OWN NEGATIVE CONTROL, every invocation. The neutral halo the generic rule would
     paint is resolved the same way (var(--acc-a15)/var(--acc-a20) off the same element), and the arm
     asserts the halo is NOT that. It also asserts --rm and --acc actually DIFFER on the element
     first, and FAILS rather than passes if they do not -- otherwise on a room whose hue happened to
     equal the neutral the check would green itself for free. That precondition is not theoretical:
     platform-infra is the closest, #694EB0 against the neutral #534AB7 in light and #AD9AEE against
     #9D93F0 in dark, which is also exactly why this defect could sit in a screenshot unnoticed.
     (Hex, for the same reason styles.css uses it at the fix site: test/room_static.py greps raw
     indigo digits out of src/ and does not skip comments.)

     BOTH --rm-DERIVED HALOS, because they are one pattern with one failure mode. .hm-cta got it in
     W15 and nothing guarded it afterwards; .hm-room gets it here. The stripe assertion is the third
     question: box-shadow is ONE property, so the generic rule was also REPLACING .hm-room's rest
     `inset 3px 0 0 var(--rm)` -- a focused card lost its room stripe outright. Guarding hue without
     guarding the stripe would let the next edit drop it again silently.

     WATCHED RED on the pre-fix build: the two .hm-room arms fail in both themes (halo measures the
     neutral; no inset layer survives). The .hm-cta arms pass there -- they are a REGRESSION guard on
     W15's fix, and they are honest about that: they were watched red against a build with :2007
     reverted. Fresh contexts on the #home route, seeded theme, no clock and no pixels. */
  const HALO = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { err: 'selector not found: ' + sel };
    if (!el.getClientRects().length) return { err: sel + ' is not rendered, so its focus halo cannot be measured' };
    el.focus({ focusVisible: true });
    if (document.activeElement !== el) return { err: sel + ' did not take focus' };

    /* Resolve a declaration THROUGH THE SAME PROPERTY, inside the element, so --rm/--acc inherit
       and the computed serialisation is produced by the identical engine path. */
    const resolveShadow = (decl) => {
      const p = document.createElement('span');
      p.style.display = 'none';
      p.style.boxShadow = decl;
      el.appendChild(p);
      const out = getComputedStyle(p).boxShadow;
      p.remove();
      return out;
    };
    const resolveColor = (value) => {
      const p = document.createElement('span');
      p.style.display = 'none';
      p.style.color = value;
      el.appendChild(p);
      const out = getComputedStyle(p).color;
      p.remove();
      return (out || '').trim().toLowerCase();
    };
    /* Split a computed box-shadow into layers WITHOUT breaking on the commas inside rgb()/color(). */
    const layers = (s) => {
      const out = []; let d = 0, cur = '';
      for (const ch of s) {
        if (ch === '(') d++; else if (ch === ')') d--;
        if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
      }
      if (cur.trim()) out.push(cur.trim());
      return out;
    };
    const colourOf = (L) => {
      const m = L.match(/^(rgba?\([^)]*\)|color\([^)]*\)|[a-zA-Z]+)/);
      return m ? m[1].trim().toLowerCase() : null;
    };
    const glow = (s) => layers(s).filter((L) => !/\binset\b/.test(L)).map(colourOf);
    const inset = (s) => layers(s).filter((L) => /\binset\b/.test(L)).map(colourOf);

    const ROOM_HALO = '0 0 0 3px color-mix(in srgb,var(--rm,var(--acc)) 15%,transparent),' +
                      '0 0 16px -4px color-mix(in srgb,var(--rm,var(--acc)) 20%,transparent)';
    const NEUTRAL_HALO = '0 0 0 3px var(--acc-a15),0 0 16px -4px var(--acc-a20)';
    const expectRoom = resolveShadow(ROOM_HALO);
    const expectNeutral = resolveShadow(NEUTRAL_HALO);
    const actual = getComputedStyle(el).boxShadow;
    return {
      fv: el.matches(':focus-visible'),
      rm: resolveColor('var(--rm,var(--acc))'),
      acc: resolveColor('var(--acc)'),
      actual: actual,
      glow: glow(actual),
      inset: inset(actual),
      wantGlow: glow(expectRoom),
      neutralGlow: glow(expectNeutral),
      wantInset: inset(resolveShadow('inset 3px 0 0 var(--rm)')),
      probeAlive: expectRoom !== 'none' && expectNeutral !== 'none',
    };
  };

  /* One halo verdict. Fails CLOSED on every way the measurement itself could be untrustworthy. */
  const judgeHalo = (label, r) => {
    if (!r || r.err) { chk(label, false, (r && r.err) || 'no result'); return false; }
    if (!r.probeAlive) { chk(label, false, 'the box-shadow probe computed to `none` -- the expectation could not be resolved, so this arm cannot report a green it did not earn'); return false; }
    if (r.rm === r.acc) { chk(label, false, 'NEGATIVE CONTROL DEAD: --rm and --acc both resolve to ' + r.rm + ' on this element, so a room halo and a neutral halo are indistinguishable here and a pass would be free'); return false; }
    const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    const ok = r.fv && r.glow.length > 0 && same(r.glow, r.wantGlow) && !same(r.glow, r.neutralGlow);
    chk(label, ok, ':focus-visible=' + r.fv + '  halo=[' + r.glow.join(' | ') + ']' +
      '  want(own room --rm ' + r.rm + ')=[' + r.wantGlow.join(' | ') + ']' +
      '  the roomless --acc ' + r.acc + ' would paint=[' + r.neutralGlow.join(' | ') + ']');
    return ok;
  };

  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const hp = await ctx.newPage();
    await hp.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
    await B.gotoApp(hp, HTML, { hash: '' });
    await B.until(hp, () => !!document.querySelector('#home .hm-cta') &&
      document.querySelectorAll('#home .hm-room').length >= 6,
      null, B.ACT_MS, 'the home renders its hero and all six room cards');

    /* 7-8. the hero -- W15's fix at styles.css:2007, previously guarded by nothing. */
    /* THE QUIET-FOCUS WINDOW, and why this arm now presses a key first.
       The home autofocuses its one primary action so Enter is the whole daily loop (Z1's hard
       floor). Chromium matches :focus-visible on that LOAD-TIME programmatic focus, so with zero
       user interaction the button wore the highest-contrast edge on the screen -- measured 14.72:1
       against the panel -- which is the accessory the coherence ruling's one-signature rule exists
       to keep quiet. The decision (round 3 item 11) was to keep the autofocus and quiet only its
       ring until the first real keystroke, which is also what Firefox does natively.
       So this arm asks its own question more faithfully than before: "does keyboard focus in this
       app look like this app?" is a question about a KEYBOARD USER, and a keyboard user has by
       definition pressed a key. The keystroke below puts the page in that state; the halo
       assertion is unchanged and still measures --rm against a live negative control.
       The quiet state itself is not taken on trust -- it gets its own arm immediately after, so
       the design decision can fail too rather than merely being asserted in a freeze. */
    const quiet = await hp.evaluate(() => {
      const c = document.querySelector('#home .hm-cta[data-autofocus]');
      if (!c) return { err: 'no autofocused CTA' };
      const cs = getComputedStyle(c);
      return { focused: document.activeElement === c, outline: cs.outlineStyle, shadow: cs.boxShadow };
    });
    chk('[' + theme + '] the autofocused CTA is focused but paints NO ring before any keystroke',
      !quiet.err && quiet.focused && quiet.outline === 'none' && quiet.shadow === 'none',
      JSON.stringify(quiet));

    /* THE QUIET WINDOW IS ONCE PER SESSION, AND THIS ARM REACHES PAST FIRST PAINT.
       It shipped re-adding the quiet class and re-focusing on EVERY render -- and render() is the
       rerender callback Panels.bind holds, which the per-card reset control calls. A keyboard user
       who reset a topic therefore had focus moved to the CTA with NO indicator at all: focus on a
       control with nothing to show for it, which is the defect the whole file exists to prevent.
       Pressing a key and then forcing a re-render is the state that was broken; asserting the ring
       SURVIVES it is what makes the once-per-session rule falsifiable. */
    await hp.keyboard.press('Shift');          /* a real keystroke -- the ring re-arms for good */
    const afterRerender = await hp.evaluate(async () => {
      if (window.HomeView && HomeView.render) HomeView.render();
      await new Promise((r) => setTimeout(r, 60));
      const c = document.querySelector('#home .hm-cta[data-autofocus]');
      const host = document.getElementById('home');
      return {
        quietClass: !!(host && host.classList.contains('hm-quiet-focus')),
        focused: document.activeElement === c,
      };
    });
    chk('[' + theme + '] a RE-RENDER after any keystroke never re-quiets the ring (the reset '
      + 'control calls render(), and focus with no indicator is a trap)',
      afterRerender.quietClass === false, JSON.stringify(afterRerender));

    /* A RING THE USER CANNOT SEE IS NOT AN INDICATOR. The arm above asserts the ring is PAINTED;
       it re-rendered at scrollY 0, the one scroll position at which the CTA is guaranteed to be on
       screen, so it passed on every broken row a judge measured -- focus restored to a control
       145px above the viewport on the desktop and 1502px above it on the phone, because
       `focus({preventScroll:true})` suppressed the scroll that would reveal it. The user-facing
       outcome the whole item was written against is "a keyboard user cannot tell where focus
       went", and only this assertion measures that: re-render from DEEP in the page, then require
       the focused rect to intersect the viewport. */
    /* ITS OWN PAGE, AND A MATURE RECORD ON IT. The arm above ran on `hp`, a FRESH INSTALL, where
       the home is 1349px tall against an 800px viewport -- a maxScroll of 549. Scrolling to the
       bottom of that page and re-rendering leaves the CTA at top 220: on screen, always, whatever
       the focus call does. So the assertion was measuring a page too SHORT to stage the defect,
       and passed against BOTH mutants (the reveal pass deleted, and `preventScroll:true` restored).
       The rows the judge measured -- focus 145px above the desktop viewport, 1502px above the
       phone's -- were a POPULATED home, which is the state a user is in on every day but the
       first. Seeded the same way home_reflow seeds, and on a separate page so the halo arms above
       keep the fresh-install state their own expectations are written against. */
    const vp = await ctx.newPage();
    /* A PARTIAL record, which is what makes this page tall enough to stage the defect. A FULLY
       graded seed collapses the home -- every "up next" is spent, the weak chips are empty -- to
       668px of scroll against an 800px viewport, and `onScreen` is then true for free. Eight cards
       graded per topic with a revisit flag is a mid-campaign user: the continue block, the weak
       chips and the full library are all present, the page runs past 1000px of scroll, and it is
       the shape the judge measured focus 145px above the desktop viewport on. */
    await B.gotoApp(vp, HTML, { hash: '#home' });
    await vp.evaluate(() => {
      try {
        localStorage.clear();
        TopicRegistry.ids().forEach((id) => {
          const cards = TopicRegistry.get(id).data.bank.cards;
          const keys = CardId.forCards(cards); const map = {};
          cards.forEach((c, i) => { if (i < 8) map[keys[i]] = (i % 3) ? 3 : 2; });
          localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
            got: 5, shk: 3, done: 8, tot: cards.length,
            revisit: [keys[0]], cards: map, cv: 1, ts: Date.now() }));
        });
      } catch (e) {}
    });
    await B.gotoApp(vp, HTML, { hash: '#home' });
    await B.until(vp, () => !!document.querySelector('#home .hm-cta'), null, B.ACT_MS,
      'the seeded home renders its primary action');
    /* the same keystroke the arms above press: this is a question about a KEYBOARD user */
    await vp.keyboard.press('Tab');

    const revealed = await vp.evaluate(async () => {
      /* THE ORDER IS THE WHOLE TEST, and it is the order a user experiences: they are reading
         somewhere down the page when something re-renders the home -- the reset control, a grade
         landing, a theme flip. Focus goes to the primary action at the top. With the scroll
         suppressed it stays there, off screen, and the keyboard user has no idea where they are.

         Two things had to be true before this could fail at all, and both cost a round to find:
           - the page must be TALL. Seeded fully-graded, or not seeded at all, the home is 549-668px
             of scroll against an 800px viewport and the control is on screen no matter what the
             focus call does -- which is why the first version of this arm passed against every
             mutant it was given.
           - the scroll must SURVIVE. The home restores its own scroll position shortly after load,
             and a scrollTo issued before that lands is silently undone (measured: scrollY back to
             0). Hence the settle below, and hence `scrolledTo` is REPORTED rather than assumed --
             the caller refuses to grade a run in which the page never actually scrolled. */
      await new Promise((r) => setTimeout(r, 600));
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 200));
      const scrolledTo = Math.round(window.scrollY);
      if (window.HomeView && HomeView.render) HomeView.render();
      await new Promise((r) => setTimeout(r, 500));
      const el2 = document.activeElement;
      const r2 = el2 ? el2.getBoundingClientRect() : null;
      return {
        scrolledTo,
        afterY: Math.round(window.scrollY),
        focused: el2 ? (el2.className || el2.tagName).toString().split(' ')[0] : null,
        top: r2 ? Math.round(r2.top) : null,
        vh: window.innerHeight,
        maxScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight),
        onScreen: !!r2 && r2.bottom > 0 && r2.top < window.innerHeight,
      };
    });

    await vp.close();
    /* A PAGE THAT CANNOT STRAND FOCUS CANNOT JUDGE IT. If the seeded home is not appreciably
       taller than the viewport, `onScreen` is true for free and a green here is unearned -- which
       is exactly the state that let two mutants through. Fail loudly rather than pass cheaply. */
    /* A RUN THAT COULD NOT STAGE THE DEFECT MUST NOT REPORT A PASS. Both preconditions are
       measured, not assumed: a page tall enough to put the control off screen, and a scroll that
       actually survived to the moment of the re-render. Either one missing and `onScreen` is true
       for free -- the exact state in which this assertion once passed against a restored
       `preventScroll: true`. Verified by mutant: with the scroll suppressed this row reads
       top -845, onScreen false. */
    if (!(revealed.maxScroll > revealed.vh) || !(revealed.scrolledTo > revealed.vh / 2)) {
      chk('[' + theme + '] the visibility arm could stage the defect it judges', false,
        'maxScroll ' + revealed.maxScroll + ' / viewport ' + revealed.vh +
        ' / scrolled to ' + revealed.scrolledTo +
        ' -- the page was too short, or the scroll did not survive, so this assertion could not fail');
    } else {
      chk('[' + theme + '] after a re-render from deep in the page, the focused control is ON SCREEN '
        + '(a ring painted 1500px above the viewport is not an indicator)',
        revealed.onScreen === true, JSON.stringify(revealed));
    }

    await hp.evaluate(() => { const c = document.querySelector('#home .hm-cta'); if (c) c.blur(); });

    judgeHalo('[' + theme + '] .hm-cta focus halo derives from the room it will OPEN (--rm), not the roomless --acc -- W15 regression guard',
      await hp.evaluate(HALO, '#home .hm-cta'));

    /* 9-10. every room card, aggregated: six cards, one verdict, and the detail names the losers.
       Driven one selector at a time through the SAME HALO probe the hero uses -- data-room is the
       card's own identity attribute (panels.js:282), so the selector cannot drift with DOM order. */
    const rooms = await hp.evaluate(() =>
      Array.from(document.querySelectorAll('#home .hm-room')).map((el) => el.getAttribute('data-room')));
    const cards = [];
    for (const room of rooms) {
      const r = await hp.evaluate(HALO, '#home .hm-room[data-room="' + room + '"]');
      r.room = room;
      cards.push(r);
      await hp.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    }

    const bad = cards.filter((c) => {
      if (c.err || !c.probeAlive || c.rm === c.acc || !c.fv) return true;
      const same = (a, b) => a.length === b.length && a.every((v, j) => v === b[j]);
      return !(c.glow.length > 0 && same(c.glow, c.wantGlow) && !same(c.glow, c.neutralGlow));
    });
    chk('[' + theme + '] all six .hm-room focus halos derive from the card\'s OWN room (--rm), not the roomless --acc -- audit X10',
      cards.length === 6 && bad.length === 0,
      cards.length !== 6 ? 'measured ' + cards.length + ' cards, expected 6'
        : bad.map((c) => c.room + ': ' + (c.err || (c.rm === c.acc ? 'negative control dead (--rm == --acc == ' + c.rm + ')'
          : 'halo [' + c.glow.join(' | ') + '] vs own-room [' + c.wantGlow.join(' | ') + '] (the neutral would paint [' + c.neutralGlow.join(' | ') + '])'))).join('  //  '));

    /* 11-12. the stripe: box-shadow is ONE property, so a halo declaration REPLACES the rest inset. */
    const stripeless = cards.filter((c) => !c.err && !(c.inset.length === 1 && c.inset[0] === c.wantInset[0]));
    chk('[' + theme + '] a focused .hm-room KEEPS its inset room stripe -- box-shadow is one property, so a halo that forgets it deletes the card\'s edge identity',
      cards.length === 6 && stripeless.length === 0,
      stripeless.map((c) => c.room + ': inset=[' + c.inset.join(' | ') + '] want [' + c.wantInset.join(' | ') + ']').join('  //  '));

    await ctx.close();
  }

  await browser.close();
  notes.forEach((n) => console.log(n));
  if (fails.length) { fails.forEach((f) => console.log('  - ' + f)); return B.finish(1, 'FOCUS RING: FAIL (' + fails.length + ')'); }
  console.log('FOCUS RING: PASS  (' + notes.length + ' assertions: 3 light-DOM chrome buttons kept their ring; the shadow #adv, #jg and .piv-jump get the BASE_SHEET ring; and in both themes the .hm-cta and all six .hm-room focus HALOS derive from their own room, each against a live negative control)');
  return B.finish(0);
})().catch((e) => { console.error(e && e.stack || e); return B.finish(1, 'FOCUS RING: FAIL (harness error: ' + (e && e.message) + ')'); });
