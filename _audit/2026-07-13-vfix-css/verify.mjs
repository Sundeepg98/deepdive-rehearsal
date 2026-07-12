/* ============ DOES EACH RULE ACTUALLY MATCH ANYTHING? ============
   THE SHADOW-DOM TRAP. Ten plausible styles.css selectors aimed at pane internals are proven
   no-ops in this repo; styles.css:370 has been dead code for months and nobody noticed. A fix
   that matches zero nodes is WORSE than no fix, because it looks done. So every rule I added is
   read back OFF THE LIVE DOM with getComputedStyle, on the side of the boundary it targets.

   The one that would otherwise have been a silent half-fix is #3. A custom property's var()s are
   substituted AT THE ELEMENT THAT DECLARES IT -- so :root's --acc-a15 rung has already baked in
   the ROOM's --acc, and re-binding --acc alone on .ix-panel would leave every glow/wash/ring
   inside the panel still wearing the room. This asserts the RUNG went neutral, not just --acc. */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL = 'file:///' + path.join(HERE, '..', '..', 'dist', 'index.html').replace(/\\/g, '/');
const ROOMS = {
  'messaging-events': 'event-driven', 'data-storage': 'caching',
  'reliability-observability': 'retries-timeouts', 'platform-infra': 'iac',
  'architecture-apis': 'state-machine', 'security-tenancy': 'signing',
};
let pass = 0, fail = 0;
const chk = (name, ok, detail) => {
  (ok ? pass++ : fail++);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`);
};

/* The drill pane is built LAZILY: <deep-drill> exists in the markup long before it is upgraded
   and long before its shadow root holds any tiles. Sleeping a fixed 900ms and hoping raced it
   and reported four phantom FAILs plus "d.judge is not a function". Wait for the CONDITION --
   which is also this repo's most recent lesson (333c024: "wait for conditions, never for
   durations"). */
const drillReady = (pg) => pg.waitForFunction(() => {
  const d = document.querySelector('deep-drill');
  return !!(d && typeof d.judge === 'function' && d.shadowRoot && d.shadowRoot.querySelector('.pill.g'));
}, null, { timeout: 15000 });

const goRoom = async (pg, topic, view = 'drill') => {
  await pg.evaluate(([t, v]) => { location.hash = '#' + t + '/' + v; }, [topic, view]);
  if (view === 'drill') await drillReady(pg);
  await pg.waitForTimeout(350);
};

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1100, height: 700 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  window.__deep = (r, o) => { o = o || []; (r.querySelectorAll('*') || []).forEach((n) => { o.push(n); if (n.shadowRoot) window.__deep(n.shadowRoot, o); }); return o; };
  window.__sel = (s) => window.__deep(document).find((e) => e.matches && e.matches(s));
});
await p.goto(URL);
await p.waitForTimeout(2400);
await p.keyboard.press('Escape');
await p.waitForTimeout(500);
await goRoom(p, 'event-driven');   // the TEAL room: the one where Solid used to vanish

console.log('\n=== 1. SCOREBOARD RULES REACH INSIDE THE SHADOW ROOT (teal room) ===');
// zero score first: nothing should be filled
let s = await p.evaluate(() => {
  const g = window.__sel('.pill.g'), sh = window.__sel('.pill.s'), l = window.__sel('.pill.left');
  const cs = (e) => e ? getComputedStyle(e) : null;
  return {
    found: !!g && !!sh && !!l,
    gHasZ: g && g.classList.contains('z'),
    gBg: g && cs(g).backgroundColor, gBorder: g && cs(g).borderTopColor,
    gGlyph: g && getComputedStyle(g.querySelector('.l'), '::before').content,
    sGlyph: sh && getComputedStyle(sh.querySelector('.l'), '::before').content,
    cardBg: cs(document.querySelector('.app') || document.body).backgroundColor,
  };
});
chk('the three .pill tiles exist inside the shadow root', s.found);
chk('SOLID at 0 is NOT filled (.z suppresses the fill)', s.gHasZ && s.gBg === 'rgb(255, 255, 255)', `bg=${s.gBg} z=${s.gHasZ}`);
chk('SOLID label carries the check glyph (::before matched)', /2713|✓/.test(s.gGlyph || ''), `content=${s.gGlyph}`);
chk('REVISIT label carries the recycle glyph (::before matched)', /21BB|↻/.test(s.sGlyph || ''), `content=${s.sGlyph}`);

// now bank a good score
await p.evaluate(() => {
  const d = document.querySelector('deep-drill');
  d.got = 0; d.shk = 0; d.di = 0; d.results = [];
  for (let i = 0; i < 5; i++) d.judge(3);
  d.judge(2);
});
await p.waitForTimeout(400);
s = await p.evaluate(() => {
  const g = window.__sel('.pill.g'), sh = window.__sel('.pill.s'), l = window.__sel('.pill.left');
  const cs = (e) => getComputedStyle(e);
  const root = getComputedStyle(document.documentElement);
  return {
    stOk: root.getPropertyValue('--st-ok').trim(),
    roomAcc: root.getPropertyValue('--acc').trim(),
    gBg: cs(g).backgroundColor, gV: cs(g.querySelector('.v')).color,
    sBg: cs(sh).backgroundColor, sV: cs(sh.querySelector('.v')).color,
    lBg: cs(l).backgroundColor, lV: cs(l.querySelector('.v')).color,
    ink: root.getPropertyValue('--ink').trim(),
  };
});
chk('SOLID at 5 IS filled with --st-ok (rule matched across the boundary)',
  s.gBg === 'rgb(29, 111, 63)', `bg=${s.gBg} (--st-ok=${s.stOk})`);
chk('REVISIT is NEVER filled -- it stays on the neutral card',
  s.sBg === 'rgb(255, 255, 255)', `bg=${s.sBg}`);
chk('LEFT no longer wears the ROOM accent (was var(--acc))',
  s.lV !== s.roomAcc, `left .v=${s.lV}  room --acc=${s.roomAcc}`);

console.log('\n=== 2. --st-* STATUS TOKENS ARE ROOM-INDEPENDENT (the whole point) ===');
const stByRoom = {};
for (const [g, topic] of Object.entries(ROOMS)) {
  await goRoom(p, topic);
  stByRoom[g] = await p.evaluate(() => {
    const r = getComputedStyle(document.documentElement);
    return { ok: r.getPropertyValue('--st-ok').trim(), warn: r.getPropertyValue('--st-warn').trim(), acc: r.getPropertyValue('--acc').trim() };
  });
}
const oks = [...new Set(Object.values(stByRoom).map((v) => v.ok))];
const accs = [...new Set(Object.values(stByRoom).map((v) => v.acc))];
chk('--st-ok is IDENTICAL in all six rooms', oks.length === 1, `${oks.join(' / ')}`);
chk('--acc genuinely DOES differ per room (so the test above means something)', accs.length === 6, `${accs.length} distinct`);

console.log('\n=== 3. CROSS-GROUP PANELS ARE ROOMLESS -- INCLUDING THE ALPHA RUNGS ===');
// stand in the security room: its raspberry accent is unmistakable if it leaks into the panel
await goRoom(p, 'signing');
await p.evaluate(() => document.getElementById('idxopen').click());
await p.waitForTimeout(700);
const ix = await p.evaluate(() => {
  const panel = document.querySelector('.ix-panel');
  if (!panel) return null;
  const cs = getComputedStyle(panel), root = getComputedStyle(document.documentElement);
  const cross = document.querySelector('.ix-cross');
  return {
    panelAcc: cs.getPropertyValue('--acc').trim(),
    panelRung: cs.getPropertyValue('--acc-a15').trim(),
    rootAcc: root.getPropertyValue('--acc').trim(),
    rootRung: root.getPropertyValue('--acc-a15').trim(),
    crossStripe: cross ? getComputedStyle(cross, '::before').backgroundImage.slice(0, 40) : null,
    crossStripeW: cross ? getComputedStyle(cross, '::before').width : null,
    roomDot: getComputedStyle(document.querySelector('.ix-g-dot')).backgroundColor,
  };
});
chk('.ix-panel --acc is the roomless BRAND, not the room', ix.panelAcc === '#534AB7', `panel=${ix.panelAcc} room=${ix.rootAcc}`);
/* The computed value of an unregistered custom property is its token stream with var()s
   SUBSTITUTED but not evaluated -- so this reads back as literal `color-mix(in srgb,#534AB7 15%,
   transparent)`, hex intact, not as a resolved rgba(). That is the direct proof of the whole
   mechanism: the rung froze a hex at the element that declared it. Match the hex, not decimals. */
chk('.ix-panel --acc-a15 RUNG went neutral too (not inherited from :root)',
  /534AB7/i.test(ix.panelRung), `panel=${ix.panelRung}`);
chk('  ...and :root\'s rung really IS still the room (so #3 is a real difference)',
  ix.rootRung !== ix.panelRung, `root=${ix.rootRung}`);
chk('Cross-topic drill wears a SIX-ROOM stripe (::before matched)',
  /gradient/.test(ix.crossStripe || '') && ix.crossStripeW === '5px', `${ix.crossStripe} w=${ix.crossStripeW}`);
chk('the per-group dots inside still carry their own room colour', !!ix.roomDot && ix.roomDot !== 'rgba(0, 0, 0, 0)', ix.roomDot);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);

/* Search + the topic-nav dropdown are cross-group too and had the identical bug. Search is built
   with INLINE styles in JS -- worth asserting explicitly, because "the rebind cannot reach an
   inline var()" is a plausible-sounding wrong belief. It can: an inline var(--acc) resolves
   against the custom property INHERITED from the container, so re-binding on #_search-overlay
   retints all 8 of its var(--acc*) uses without touching a line of search-overlay.js. */
await p.evaluate(() => document.getElementById('searchopen').click());
await p.waitForTimeout(700);
const sr = await p.evaluate(() => {
  const o = document.getElementById('_search-overlay');
  const root = getComputedStyle(document.documentElement);
  if (!o) return null;
  const cs = getComputedStyle(o);
  return { acc: cs.getPropertyValue('--acc').trim(), rung: cs.getPropertyValue('--acc-a15').trim(), room: root.getPropertyValue('--acc').trim() };
});
chk('#_search-overlay (inline-styled, cross-group) is roomless', sr && sr.acc === '#534AB7', `search=${sr && sr.acc} room=${sr && sr.room}`);
chk('  ...and its rung went neutral too', sr && /534AB7/i.test(sr.rung), `rung=${sr && sr.rung}`);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
const tn = await p.evaluate(() => {
  const m = document.querySelector('.tn-menu');
  return m ? getComputedStyle(m).getPropertyValue('--acc').trim() : 'NOT FOUND';
});
chk('.tn-menu (all topics, grouped by room) is roomless', tn === '#534AB7', `tn-menu --acc=${tn}`);

console.log('\n=== 4. THE LOCATOR IS ONE LINE IN EVERY ROOM (260px sidebar) ===');
for (const [g, topic] of Object.entries(ROOMS)) {
  await goRoom(p, topic, 'walk');
  const loc = await p.evaluate(() => {
    const e = document.querySelector('.locator');
    if (!e) return null;
    const cs = getComputedStyle(e);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
    const inner = e.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return { text: (e.textContent || '').trim(), lines: Math.round(inner / lh), h: e.clientHeight, title: e.getAttribute('title'), aria: e.getAttribute('aria-label') };
  });
  chk(`${g.padEnd(26)} one line`, loc.lines <= 1, `"${loc.text}" -> ${loc.lines} line(s), title="${loc.title}"`);
}

console.log(`\n================  ${pass} PASS / ${fail} FAIL  ================\n`);
await br.close();
process.exit(fail ? 1 : 0);
