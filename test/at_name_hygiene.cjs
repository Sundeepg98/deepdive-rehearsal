#!/usr/bin/env node
'use strict';
/* THE NAME-HYGIENE RATCHET -- the static half of Real-AT Wave A.
 *
 * WHY THIS IS A SOURCE CHECK AND NOT A BROWSER CHECK, stated first because it is the design
 * decision that matters. The AT-1 round measured, on this app, that the string NVDA speaks for a
 * composed control is NOT Chromium's accessible name:
 *
 *     Chromium accname (CDP, measured) : "1 Messaging & Events 7 topics ... 0% drilled"
 *     NVDA, same control (at1-d1)      : "1Messaging and Events 7 topics 0 of 7 started ..."
 *
 * The space after the numeral is present in one and absent in the other. The audit saw the same
 * split from the other side (F10: one read carries the U+203A chevron and one does not -- "one name
 * from the accessibility API and one from the flattened virtual-buffer text -- two sources"). So a
 * browser check that asserts on the accname would have reported these controls GREEN while a real
 * screen reader glued them, which is precisely the class of check this repo already refuses to
 * write ("a test whose reference is derived from the system under test cannot fail when that system
 * is wrong"). Chromium's own name-composition heuristic is exactly such a reference here.
 *
 * What survives BOTH paths is a real character in a real text node. That is the fix this file
 * ratchets, and asserting it is a property of the SOURCE, not of any engine -- which is also why
 * this check is platform-deterministic and never SKIPs: no browser, no fonts, no pixels.
 *
 * The as-heard proof lives outside the gate, in the NVDA re-drive receipt filed with the wave
 * (_audit/2026-07-31-w24-names.md). This file is the thing that keeps it fixed.
 *
 * FOUR ARMS:
 *   A  every Wave-A composition site carries an AUTHORED separator between its parts -- and the
 *      separator primitive is genuinely off-screen and its text is EXACTLY ", ", at all twelve
 *      sites including the one built through the DOM rather than authored in markup.
 *   B  every decorative glyph in the H1/H2/H3 inventory is out of the nameable subtree.
 *   C  the two families the audit found colliding (home header, per-group Cram) carry
 *      per-instance names.
 *   D  THE ACCIDENTAL-REPAIR GUARD. The audit's binding rule: the separator defect is systemic in
 *      MARKUP and must never be "fixed" by rewriting the two content strings NVDA happened to
 *      expose. This arm fails if a separator is authored into the corpus, or if either receipted
 *      description string is edited away.
 *
 * SELF-TEST: every arm is re-run against a source map with its own fix REVERTED, and this check
 * aborts unless the arm goes red. A check that cannot fail is not a check.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const P = (p) => path.join(ROOT, p.split('/').join(path.sep));

const FILES = [
  'src/styles.css',
  'src/index.html',
  'src/scripts/app/base-styles.js',
  'src/scripts/app/shared-sheets.js',
  'src/scripts/app/home-view.js',
  'src/scripts/app/panels.js',
  'src/scripts/app/pomodoro.js',
  'src/scripts/app/cram-derive.js',
  'src/scripts/app/topic-protocol.js',
  'src/scripts/app/cross-drill.js',
  'src/scripts/app/session-progress.js',
  'src/scripts/app/drill/logic.js',
  'src/scripts/app/walkthrough/logic.js',
];

function load() {
  const m = {};
  for (const f of FILES) m[f] = fs.readFileSync(P(f), 'utf8');
  return m;
}

/* A bounded-gap matcher: "<a> ... <marker> ... <b>", with the gap capped so a marker somewhere
   else in the file cannot satisfy a site it does not belong to. */
function gapped(parts, gaps) {
  let src = '';
  for (let i = 0; i < parts.length; i++) {
    src += parts[i];
    if (i < parts.length - 1) src += '[\\s\\S]{0,' + gaps[i] + '}?';
  }
  return new RegExp(src);
}
const lit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ===================== ARM A -- authored separators ===================== */
/* Each site names the two parts the audit heard fused, and asserts the separator primitive sits
   between them. `heard` is the verbatim NVDA string from the AT-1 logs, so a future reader can see
   what each line is holding shut. */
const SEP_SITES = [
  { id: 'room numeral / room name', file: 'src/scripts/app/panels.js',
    heard: '1Messaging and Events (at1-d1 C-home-tab-04, 6 of 6)',
    re: gapped([lit('hm-room-n'), lit('nsep'), lit('g.label')], [140, 60]) },
  { id: 'card badge / card title', file: 'src/scripts/app/panels.js',
    heard: 'H17 worst case "3/22Content Pipeline" -- badge is first in the name',
    re: gapped([lit('_bdg +'), lit('nsep'), lit('ix-c-name')], [80, 60]) },
  { id: 'card title / card kicker', file: 'src/scripts/app/panels.js',
    heard: 'Attribute Store ATTRIBUTE BOUNDARY (repaired by the splitter, not by markup)',
    re: gapped([lit('ix-c-name'), lit('nsep'), lit('ix-c-tail')], [120, 80]) },
  { id: 'card kicker / card description', file: 'src/scripts/app/panels.js',
    heard: 'ATTRIBUTE BOUNDARYA schema-flexible (at1-d1 C-home-tab-23) + SPECTRUMA (-26)',
    re: gapped([lit('ix-c-tail'), lit('nsep'), lit('ix-c-thesis')], [140, 90]) },
  { id: 'weak chip title / count', file: 'src/scripts/app/panels.js',
    heard: 'H18 worst case "Content Pipeline3"',
    re: gapped([lit('ix-weak-b'), lit('nsep'), lit('ix-weak-n')], [220, 60]) },
  { id: 'refresh pill title / days', file: 'src/scripts/app/panels.js',
    heard: 'H18 worst case "Caching12d"',
    re: gapped([lit('ix-due-b'), lit('nsep'), lit('ix-due-n')], [220, 60]) },
  /* appeal/home-instrument: the home's weakness chip gained a third field, so it gained a second
     seam. Both are pinned here rather than left to the count alone -- the count says "someone
     decided", these say "and here is the decision". */
  { id: 'aged weak chip title / count', file: 'src/scripts/app/panels.js',
    heard: 'without it, "Notifications5"',
    re: gapped([lit('hm-chip"'), lit('nsep'), lit('hm-chip-n')], [260, 60]) },
  { id: 'aged weak chip count / age', file: 'src/scripts/app/panels.js',
    heard: 'without it, "51d" -- the count and the age fuse into one number',
    re: gapped([lit('hm-chip-n'), lit('nsep'), lit('hm-chip-age')], [200, 60]) },
  { id: 'companion relation title / tail', file: 'src/scripts/app/topic-protocol.js',
    heard: 'Infrastructure as Codeprovisioning boundary (at1-d4 S1-shortcuts-find-15..17)',
    re: gapped([lit('cmp-rel-t'), lit('nsep'), lit('cmp-rel-d')], [140, 80]) },
  { id: 'cram sheet one-liner label / body', file: 'src/scripts/app/cram-derive.js',
    heard: 'THE ONE-LINERA private bucket (at1-d4 S4-cram-3-tab-02, x4)',
    re: gapped([lit('cs-one-l'), lit('nsep')], [120]) },
  { id: 'focus timer value / phase', file: 'src/scripts/app/pomodoro.js',
    heard: '25:00FOCUS (at1-d5b B1-arrow-read-24)',
    re: gapped([lit('timeText'), lit('nsep'), lit('phaseText')], [400, 400]) },
  { id: 'probe nav numeral / signal', file: 'src/scripts/app/drill/logic.js',
    heard: 'H15 -- same construction as the room buttons, 22 chips per topic',
    re: gapped([lit('dn-n'), lit('nsep'), lit('dn-t')], [120, 80]) },
  { id: 'walkthrough step numeral / title', file: 'src/scripts/app/walkthrough/logic.js',
    heard: '1The bucket the pipeline writes to .. 9Versioning (at1-d4, 9 of 9)',
    re: gapped([lit('arc-n'), lit('nsep'), lit('arc-t')], [120, 80]) },
  { id: 'model-script summary / sub', file: 'src/scripts/app/walkthrough/logic.js',
    heard: 'sounds likemodel script (at1-d4 x2) -- an AUTHORED SPACE that blockification ate',
    re: gapped([lit('complete answer sounds like'), lit('nsep')], [60]) },
];

/* The separator PRIMITIVE itself. Three properties, all load-bearing:
   - it must be genuinely off-screen, or every one of the sites above paints a comma;
   - its text must be EXACTLY ", ". Not "non-whitespace" -- that was the first version of this
     assertion and a cold verify broke it in one line: a period is non-whitespace, so drive 1's
     defect (NVDA speaking the word "dot" on every card) could be reintroduced at all twelve sites
     with the gate still green. The one finding this wave turns on has to be the one thing the
     gate pins hardest. A space is rejected for the older reason: the model-script summary already
     authored a literal space at exactly this seam and was still heard as "likemodel", because
     whitespace at a block boundary is collapsed away; and
   - the check must reach the DOM-API site too. Eleven separators are authored in markup and one
     is built with createElement (the focus timer), and a scan of `class="nsep"...>text<` cannot
     see the twelfth -- so the timer's separator could be set to a bare space and pass. */
function armA(m) {
  const out = [];
  const css = m['src/styles.css'];
  const base = m['src/scripts/app/base-styles.js'];
  const hidden = /\.nsep\{[^}]*position:absolute[^}]*\}/;
  const clipped = /\.nsep\{[^}]*clip(-path)?:[^}]*\}/;
  out.push(['[nsep] the light-DOM primitive is declared and taken out of flow',
    hidden.test(css) && clipped.test(css), 'src/styles.css has no off-screen .nsep rule']);
  out.push(['[nsep] the shadow-root primitive is declared (BASE_SHEET reaches all 17 hosts)',
    hidden.test(base) && clipped.test(base), 'base-styles.js has no off-screen .nsep rule']);

  const SEP = ', ';
  let found = 0;
  const wrong = [];
  for (const f of FILES) {
    const re = /class="nsep"[^>]*>([^<]*)</g;
    let mm;
    while ((mm = re.exec(m[f]))) { found++; if (mm[1] !== SEP) wrong.push(f + ' -> ' + JSON.stringify(mm[1])); }
  }
  /* the twelfth separator is built through the DOM, so it is invisible to the scan above */
  const pom = m['src/scripts/app/pomodoro.js'];
  const domSep = /className = 'nsep';[\s\S]{0,120}?textContent = ('[^']*')/.exec(pom);
  if (!domSep) wrong.push('pomodoro.js -> no DOM-API separator found at all');
  else { found++; if (domSep[1] !== "', '") wrong.push('pomodoro.js -> ' + domSep[1]); }
  /* 12 -> 14 (appeal/home-instrument). The count is a RATCHET, not a fact about the design: it
     exists so a new fused name cannot ship without someone deciding what NVDA should hear at the
     seam. Two seams were added, both in Panels.weakChipsAged, and both were decided:
        "Notifications, 5, 1d"   title / count  and  count / age
     The age is a new field on the weakness chip -- how long since you last worked that topic --
     and without a separator NVDA fuses it onto the count and speaks "51d". Raising the number
     without adding the separators is the failure mode this assertion is guarding against, so the
     two new sites are pinned by SEP_SITES below as well as counted here. */
  out.push(['[nsep] every separator is EXACTLY ", " -- markup AND the DOM-API site',
    found === 14 && wrong.length === 0,
    wrong.length ? 'wrong separator text (a period is SPOKEN, a space is collapsed): ' + wrong.join(', ')
      : 'expected 14 separators, found ' + found]);

  for (const s of SEP_SITES) {
    out.push(['[sep] ' + s.id, s.re.test(m[s.file]),
      s.file + ' -- no authored separator between the two parts. NVDA heard: ' + s.heard]);
  }
  return out;
}

/* ===================== ARM B -- decorative glyphs out of the name ===================== */
/* Four fix shapes, chosen per site by what is provably zero-reflow there:
 *   existing decorative span            -> aria-hidden="true"        (attribute only)
 *   bare glyph in a NON-flex container  -> wrap in aria-hidden span  (inert inline box)
 *   bare glyph in a FLEX/GRID container -> aria-label on the control (a new child would become a
 *                                          flex item and eat the literal space next to it)
 *   CSS generated content               -> two declarations: the plain one, then the alt-text one.
 *                                          An engine without alt-text support drops only the
 *                                          SECOND, so the glyph still paints -- no regression, and
 *                                          the fix lands wherever it is understood.
 */
const GLYPHS = [
  { id: 'crambtn chevron U+203A (13 tool buttons, H1)', file: 'src/styles.css',
    re: /\.crambtn:not\(\.cram-tog\)::after\{[\s\S]{0,200}?content:"\\203A" \/ ""/ },
  { id: 'starred star U+2605 stacker (H1)', file: 'src/styles.css',
    re: /\.crambtn\.starred \.mb-t::after\{[\s\S]{0,120}?content:" \\2605" \/ ""/ },
  { id: 'has-notes dot U+25CF stacker (H1)', file: 'src/styles.css',
    re: /\.crambtn\.has-notes \.mb-t::after\{[\s\S]{0,120}?content:" \\25CF" \/ ""/ },
  { id: 'follow-up label hook U+21B3 (heard x10)', file: 'src/scripts/app/shared-sheets.js',
    re: /\.fu \.lab::before\{[\s\S]{0,120}?content:"\\\\21B3" \/ ""/ },
  { id: 'mock-run play U+25B6 (heard "play button")', file: 'src/index.html',
    re: gapped([lit('mb-ic'), lit('aria-hidden="true"'), lit('&#9654;')], [40, 20]) },
  { id: 'theme moon U+263D', file: 'src/index.html',
    re: gapped([lit('mb-ic'), lit('aria-hidden="true"'), lit('&#9789;')], [40, 20]) },
  { id: 'home hero arrow (heard "dot right arrow")', file: 'src/scripts/app/home-view.js',
    re: /hm-cta-ar" aria-hidden="true"/ },
  { id: 'cross-drill bar arrows (heard "right arrow")', file: 'src/scripts/app/panels.js',
    re: /ix-cross-ar" aria-hidden="true"/ },
  { id: 'starred pill star U+2605', file: 'src/scripts/app/panels.js',
    re: /ix-star-ic" aria-hidden="true"/ },
  { id: 'judge Missed U+2717 (heard "x-shaped bullet")', file: 'src/scripts/app/drill/logic.js',
    re: gapped([lit('class="miss"'), lit('aria-hidden="true"'), lit('&#10007;')], [90, 20]) },
  { id: 'judge Shaky tilde (kept consistent with the other two)', file: 'src/scripts/app/drill/logic.js',
    re: gapped([lit('class="shk"'), lit('aria-hidden="true"'), lit('&#126;')], [90, 20]) },
  { id: 'judge Solid U+2713 (heard "check")', file: 'src/scripts/app/drill/logic.js',
    re: gapped([lit('class="got"'), lit('aria-hidden="true"'), lit('&#10003;')], [90, 20]) },
  { id: 'reveal push hook U+21B3 on #adv', file: 'src/scripts/app/drill/logic.js',
    re: gapped([lit('aria-hidden="true"'), lit('&#8627;')], [30]) },
  { id: 'must-hit check U+2713 (H2 -- it contradicts aria-pressed)', file: 'src/scripts/app/drill/logic.js',
    re: gapped([lit('mhp-box'), lit('aria-hidden="true"'), lit('&#10003;')], [40, 20]) },
  { id: 'revisit-drill glyph U+21BB (flex container -> aria-label)', file: 'src/scripts/app/drill/logic.js',
    re: gapped([lit("getElementById('revdrill')"), lit("setAttribute('aria-label'")], [60]) },
  { id: 'cross-drill grade glyphs', file: 'src/scripts/app/cross-drill.js',
    re: gapped([lit('xd-got'), lit('aria-hidden="true"'), lit('&#10003;')], [90, 20]) },
  { id: 'walkthrough prev/next arrows (heard "right arrow")', file: 'src/scripts/app/walkthrough/logic.js',
    re: gapped([lit('wnext'), lit('aria-hidden="true"'), lit('&rarr;')], [80, 20]) },
  { id: 'dock CTA arrow (heard "Start the drill right arrow")', file: 'src/scripts/app/session-progress.js',
    re: gapped([lit('class="nd-go"'), lit('aria-hidden="true"')], [260]) },
  { id: 'home header kbd glyphs (P3-3 -- the empty spoken field)', file: 'src/scripts/app/home-view.js',
    re: /<kbd aria-hidden="true">/ },
  /* The last three were found by a RUNTIME sweep of every control's computed name, not by the
     audit's inventory -- two because they live in the session overlay the AT-1 round never opened,
     and #wnext because a per-step innerHTML writer put the arrow back after the template hid it.
     A source inventory can only hold shut what someone thought to list; these are listed now. */
  { id: 'walkthrough next -- the RUNTIME writer, not just the template', file: 'src/scripts/app/walkthrough/logic.js',
    re: gapped([lit('_next.innerHTML'), lit('aria-hidden="true"')], [220]) },
  { id: 'session panel forward CTA (#ssgo)', file: 'src/scripts/app/session-progress.js',
    re: gapped([lit('id="ssgo"'), lit('aria-hidden="true"')], [120]) },
  { id: 'session panel print button (#ssprint)', file: 'src/scripts/app/session-progress.js',
    re: gapped([lit('id="ssprint"'), lit('aria-hidden="true"')], [90]) },
  /* Three more CSS-generated glyphs, and the reason they were missed is worth keeping. All three
     are in a STATE or on a ROLE the first pass never instantiated: the completed walkthrough step
     only exists after you finish one, and Chromium reports a <summary> as DisclosureTriangle, not
     button -- which is the role filter the wave's own runtime sweep used. So the sweep that caught
     #wnext could not have caught these. The completed step was found by the cold verify and heard
     as "check"; the two triangles were found by widening the sweep to every generated-content
     glyph in the source and then measuring their names, and they are heard as "filled
     right-pointing small triangle" in at1-d4 and at1-d5. */
  { id: 'completed walkthrough step U+2713 (heard as "check")', file: 'src/scripts/app/walkthrough/logic.js',
    re: /\.arc-step\.done \.arc-n::after\{[\s\S]{0,140}?content:"\\\\2713" \/ ""/ },
  { id: 'model-script disclosure triangle U+25B8', file: 'src/scripts/app/walkthrough/logic.js',
    re: /details\.model>summary::before\{[\s\S]{0,140}?content:"\\\\25B8" \/ ""/ },
  { id: 'inline disclosure triangle U+25B8 (Go deeper / See the code)', file: 'src/scripts/app/shared-sheets.js',
    re: /details\.disc summary::before\{[\s\S]{0,140}?content:"\\\\25B8" \/ ""/ },
];

/* P3-8: all four toggles must say their state ONCE, through aria-pressed. Two of them shipped the
   word in the accessible name as well ("Dark mode -- off, toggle button, not pressed"). */
const TOGGLES = [
  { id: 'theme toggle names the ACTION, not the state', file: 'src/index.html',
    re: gapped([lit('id="themetog"'), lit('aria-label="Dark mode"')], [120]) },
  { id: 'interviewer toggle names the ACTION, not the state', file: 'src/index.html',
    re: gapped([lit('id="inttog"'), lit('aria-label="Interviewer cuts in mid-answer"')], [120]) },
];

function armB(m) {
  const out = [];
  for (const g of GLYPHS) out.push(['[glyph] ' + g.id, g.re.test(m[g.file]), g.file + ' -- glyph is still inside a nameable subtree']);
  for (const t of TOGGLES) out.push(['[toggle] ' + t.id, t.re.test(m[t.file]), t.file + ' -- state is stated twice (name + aria-pressed)']);
  return out;
}

/* ===================== ARM C -- name collisions ===================== */
function armC(m) {
  const out = [];
  const panels = m['src/scripts/app/panels.js'];
  const home = m['src/scripts/app/home-view.js'];
  /* Four controls announced exactly "Cram right arrow, button" (at1-d1 stops 14/22/33 and
     at1-d3 A-find-start-09/-17/-28/-37). The name has to carry the group, and the group is only
     available at emit time -- so the assertion is that the label INTERPOLATES it. */
  out.push(['[collision] the per-group Cram button interpolates its group into its name',
    gapped([lit('ix-g-cram'), lit('aria-label="Cram: \' + b.group.label')], [200]).test(panels),
    'panels.js -- all six Cram buttons still share one name']);
  out.push(['[collision] the per-group Cram name keeps its visible text (WCAG 2.5.3)',
    /aria-label="Cram: ' \+ b\.group\.label/.test(panels) && /ix-g-cram[\s\S]{0,300}?>Cram /.test(panels),
    'panels.js -- the accessible name must still contain the visible word "Cram"']);
  /* P3-3: the three header buttons that HAVE a key must declare it where AT reports keys, instead
     of leaking the glyph into the name (which is what produced "Topic index, , button"). */
  for (const [act, keys] of [['search', '/ Control\\+K Meta\\+K'], ['index', '\\\\\\\\'], ['keys', '\\?']]) {
    out.push(['[collision] home header "' + act + '" declares its shortcut as aria-keyshortcuts',
      new RegExp('data-act="' + act + '"[^>]*aria-keyshortcuts="' + keys + '"').test(home)
      || new RegExp('aria-keyshortcuts="' + keys + '"[^>]*data-act="' + act + '"').test(home),
      'home-view.js -- the key is only in a <kbd> inside the name']);
  }
  return out;
}

/* ===================== ARM D -- the accidental-repair guard ===================== */
/* The audit's rule, made mechanical. "Rewriting 'A schema-flexible attribute store' to 'This
   schema-flexible attribute store' would silence today's symptom and leave the defect in place on
   all 20 cards." This arm makes that edit fail the gate. */
const CORPUS_DIRS = ['src/topics', 'src/topics-md'];
const PINNED = [
  ['src/topics/eav/identity.js', 'A schema-flexible attribute store'],
  ['src/topics-md/consistency-models.md', 'A consistency model is the contract'],
];
function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}
/* Word-bounded on purpose: the corpus contains "inseparable" (leader-election, replication), and a
   bare substring match flagged three clean files on the first run. */
const CORPUS_LEAK = /class="nsep"|(^|[^A-Za-z])nsep([^A-Za-z]|$)/;
function armD(extraCorpus) {
  const out = [];
  const files = [];
  for (const d of CORPUS_DIRS) walk(P(d), files);
  const leaked = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    if (CORPUS_LEAK.test(txt)) leaked.push(path.relative(ROOT, f));
  }
  if (extraCorpus) for (const [name, txt] of extraCorpus) if (CORPUS_LEAK.test(txt)) leaked.push(name);
  out.push(['[corpus] no separator is authored into topic CONTENT -- markup only',
    leaked.length === 0, 'separator leaked into the corpus: ' + leaked.join(', ')]);
  for (const [f, s] of PINNED) {
    const txt = (extraCorpus && extraCorpus.find((x) => x[0] === f)) ? extraCorpus.find((x) => x[0] === f)[1]
      : fs.readFileSync(P(f), 'utf8');
    out.push(['[corpus] the receipted description is UNEDITED: ' + f,
      txt.indexOf(s) !== -1,
      'the string NVDA exposed was rewritten instead of fixing the markup: ' + JSON.stringify(s)]);
  }
  return out;
}

/* ===================== SELF-TEST ===================== */
/* Revert each fix in a COPY of the sources and require the owning arm to go red. If a mutation is
   invisible to its arm, the arm is decorative and this check aborts rather than reporting a green
   it did not earn. */
const MUTANTS = [
  ['A', 'strip every authored separator', (m) => {
    const o = Object.assign({}, m);
    for (const f of FILES) o[f] = o[f].replace(/<span class="nsep">[^<]*<\/span>/g, '').replace(/nsep/g, 'zzsep');
    return o;
  }],
  ['A', 'make the separator whitespace-only (the likemodel bug)', (m) => {
    const o = Object.assign({}, m);
    for (const f of FILES) o[f] = o[f].replace(/(class="nsep"[^>]*>)[^<]*(<)/g, '$1 $2');
    return o;
  }],
  /* Drive 1's exact defect, at one site and at all twelve. The first version of arm A asserted
     only "non-whitespace" and passed both of these 47/47. */
  ['A', 'a period at ONE separator site (drive 1s exact defect)', (m) => {
    const o = Object.assign({}, m);
    o['src/scripts/app/panels.js'] = o['src/scripts/app/panels.js']
      .replace('<span class="nsep">, </span>', '<span class="nsep">. </span>');
    return o;
  }],
  ['A', 'a period at EVERY separator site', (m) => {
    const o = Object.assign({}, m);
    for (const f of FILES) o[f] = o[f].replace(/(class="nsep"[^>]*>), (<)/g, '$1. $2');
    return o;
  }],
  ['A', 'a bare space at the DOM-API separator (invisible to a markup scan)', (m) => {
    const o = Object.assign({}, m);
    o['src/scripts/app/pomodoro.js'] = o['src/scripts/app/pomodoro.js']
      .replace("sep.textContent = ', ';", "sep.textContent = ' ';");
    return o;
  }],
  ['A', 'let the separator primitive paint (drop position:absolute)', (m) => {
    const o = Object.assign({}, m);
    o['src/styles.css'] = o['src/styles.css'].replace(/(\.nsep\{)position:absolute!important;/, '$1');
    return o;
  }],
  ['B', 'un-hide the decorative glyphs', (m) => {
    const o = Object.assign({}, m);
    for (const f of FILES) o[f] = o[f].replace(/ aria-hidden="true"/g, '').replace(/ \/ ""/g, '');
    return o;
  }],
  ['C', 'give every Cram button one name again', (m) => {
    const o = Object.assign({}, m);
    o['src/scripts/app/panels.js'] = o['src/scripts/app/panels.js']
      .replace(/aria-label="Cram: ' \+ b\.group\.label \+ '"/, '');
    return o;
  }],
  ['C', 'put the header shortcuts back inside the name', (m) => {
    const o = Object.assign({}, m);
    o['src/scripts/app/home-view.js'] = o['src/scripts/app/home-view.js'].replace(/ aria-keyshortcuts="[^"]*"/g, '');
    return o;
  }],
];
const ARM = { A: armA, B: armB, C: armC };

const live = load();
const results = [];
for (const fn of [armA, armB, armC]) results.push(...fn(live));
results.push(...armD(null));

let aborted = null;
for (const [arm, why, mutate] of MUTANTS) {
  const got = ARM[arm](mutate(live));
  if (!got.some((r) => !r[1])) aborted = 'arm ' + arm + ' survived its own mutation (' + why + ')';
}
/* Arm D's mutation is a corpus rewrite, so it is fed in rather than read from disk. */
{
  const rewritten = PINNED.map(([f]) => [f, 'This schema-flexible attribute store and This consistency model.']);
  if (!armD(rewritten).some((r) => !r[1])) aborted = 'arm D survived the content-rewrite mutation';
  const leak = [['src/topics/eav/identity.js',
    fs.readFileSync(P('src/topics/eav/identity.js'), 'utf8') + '\n// nsep\n']];
  if (!armD(leak).some((r) => !r[1])) aborted = 'arm D survived the corpus-leak mutation';
}

let bad = 0;
for (const [label, ok, detail] of results) {
  if (!ok) { bad++; console.log('FAIL  ' + label + '\n        ' + detail); } else console.log('ok    ' + label);
}
console.log('');
if (aborted) {
  console.log('ABORT: the check cannot fail -- ' + aborted);
  process.exit(1);
}
console.log('at_name_hygiene: ' + (results.length - bad) + '/' + results.length +
  ' assertions, ' + MUTANTS.length + ' + 2 mutants all detected');
if (bad) { console.log('FAILED ' + bad + ' assertion(s)'); process.exit(1); }
