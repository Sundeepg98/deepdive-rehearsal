#!/usr/bin/env node
/*
 * BANK PUSHBACK GATE -- does the mock-interview Bank actually PUSH BACK?
 *
 * WHAT THIS PROTECTS. The Bank is the app's adversarial surface: every card carries a `Model:`
 * (what a strong candidate says) and an `Int:` (what the interviewer says NEXT, with its own
 * answer). The Int is the only place in the app where the candidate's own answer is attacked.
 * Every other check counts those fields; none of them reads whether the attack LANDS.
 *
 * THE DEFECT THE 2026-07-20 CATALOG SWEEP FOUND (its Classes A and B -- the largest structural
 * class in the catalog):
 *   A. The `Int:` is ANSWERED BY ITS OWN `Model:`. The candidate re-reads the paragraph above and
 *      has the answer; the pushback pushes on nothing. Verbatim, from soft-delete's DESIGN card:
 *          Int: why isn't soft-delete enough for erasure?
 *          It keeps the data; erasure requires it genuinely gone.
 *      Seven content words, a definition, and the Model directly above already contains it. The
 *      sweep found the same shape in ~18 topics, almost always on the SCALE and DESIGN cards, in
 *      topics whose other cards are excellent -- one template that missed an upgrade pass.
 *   B. A curveball with NO `Int:` at all. developer-platform's eight hardest scenarios all end on
 *      the candidate's own monologue; caching's seven Extra Curveballs carry zero.
 *
 * ------------------------------------------------------------------------------------------
 * HONEST SCOPE -- WHAT IS MECHANICAL HERE AND WHAT IS NOT. Read this before trusting a number.
 *
 * This check measures VOCABULARY, not meaning. `thin_int` counts how many content words an Int's
 * answer uses that do NOT already appear in its own Model. That is a proxy for "unanswerable by
 * re-reading the Model", and it is a GOOD proxy in one direction only:
 *
 *   - An answer that adds <= NOVEL_MAX new content words CANNOT be teaching much the Model did
 *     not already say. That inference is sound, and it is the whole basis of the flag.
 *   - The converse does NOT hold. A LONG answer that restates the Model in fresh words scores
 *     high and is NOT flagged. This is a real blind spot, not a hypothetical: multi-tenant's
 *     DESIGN card -- one of the sweep's four named instances -- shares only 10% of its answer's
 *     words with its Model, because the Model says "signed claim" where the Int says "verified
 *     JWT claim". Word overlap is blind to paraphrase. That case is caught here by NOVELTY (9
 *     new words) and would have been MISSED by any similarity threshold, which is exactly why
 *     the primary axis is novelty and not the overlap ratio the sweep proposed.
 *   - Symmetrically, a legitimately terse Int answer that happens to reuse the Model's vocabulary
 *     WILL be flagged. That is a cost accepted deliberately; see the bracket below.
 *   - AND THE ARITHMETIC MEANS ANY ANSWER SHORTER THAN NOVEL_MAX+1 CONTENT WORDS FIRES
 *     UNCONDITIONALLY, whatever its overlap -- it cannot possibly add 21 new words if it only has
 *     18. Stated rather than hidden, because it looks like a bug and is not: in THIS corpus a
 *     sub-21-word Int answer IS the defect. The refreshed generation's Int answers run 63-206
 *     content words (all 30 donor pairs); 20 of the corpus's 777 pairs fall under the floor, and
 *     every one of them is an un-refreshed card. If a future corpus writes deliberately terse
 *     pushbacks, this floor is the first thing to revisit.
 *
 * So: this check decides IS THERE ANYTHING NEW HERE. It does not and cannot decide IS THIS A GOOD
 * QUESTION -- whether the pushback aims at the seam the Model opens, whether a senior interviewer
 * would actually ask it, whether the answer is correct. That stays human/verifier judgment, and a
 * green run is not evidence of it. (Same split the cram-surface checker states for its Class H.)
 *
 * `no_int` and `no_int2` carry no threshold and no proxy at all -- a field is present or it is
 * not. Those two are exact. `register_lc` is likewise exact: a character is lowercase or it is
 * not.
 *
 * ------------------------------------------------------------------------------------------
 * THE THRESHOLD IS BRACKETED FROM BOTH SIDES BY THE CORPUS, NOT CHOSEN.
 * Measured over all 46 topics / 613 cards / 777 Int pairs before a line of it was fixed:
 *
 *   FLOOR  -- the four Int pairs the sweep NAMES as defective must fire. Their novelty:
 *             soft-delete DESIGN 5, multi-tenant DESIGN 9, load-balancing SCALE 10,
 *             replication SCALE 11.                                       => max 11
 *   CEILING-- the donor register the sweep names as exemplary must NOT fire: saga's and
 *             idempotency's 30 non-SCALE/DESIGN Int pairs.                => min 48
 *
 * NOVEL_MAX = 20 sits inside a 11 -> 48 gap, clear of the floor by 1.8x and of the ceiling by
 * 2.4x. Those four floor numbers and the donor minimum are corpus measurements at 42bf6eb and
 * were re-measured and confirmed by the consistent-hashing wave.
 *
 * WHAT THE SELF-TEST ACTUALLY ENFORCES IS A DIFFERENT BRACKET, and the gap was a live doc-vs-code
 * drift (cold-verify finding N4, re-measured here with this file's own rule before correcting):
 *   - the shipped FLOOR fixture (ANCHOR_BAD_*) measures novelty 4, not the 5 its card measures --
 *     because the fixture text is NOT the corpus text verbatim as this header used to claim; its
 *     Model is a paraphrase of soft-delete's DESIGN card, not a copy of it
 *   - the shipped CEILING fixture (ANCHOR_GOOD_*) measures 51, not 48. 48 is the DONOR
 *     POPULATION's minimum; 51 is what this one shipped pair happens to carry
 * So the bracket the run can actually abort on is [4, 51], not [11, 48]. Consequences, both real:
 * raising NOVEL_MAX to 49 or 50 would start firing a donor pair in the corpus while the shipped
 * ceiling fixture stayed silent; and lowering it to 4 does NOT silence the floor fixture (4 > 4
 * is false, so it still fires) -- the downward abort is delivered by `thin+PAIR-restatement-fires`
 * instead. The guarantee holds in both directions, which is what matters; the numbers above now
 * say which fixture delivers it. A fixture that is retyped rather than extracted is exactly how a
 * bracket stops being the bracket its header describes -- see test/bank_novelty.cjs, whose
 * fixtures are generated from the corpus for this reason.
 *
 * A CLASS THAT WAS MEASURED AND DROPPED, on purpose. The sweep names a third tell: the old
 * generation's Model is "lowercase and semicolon-chained rather than spoken". The lowercase half
 * is exact and is shipped as `register_lc`. The SEMICOLON-DENSITY half was measured and CANNOT
 * separate, so it is not shipped rather than shipped noisy (the ceiling-guard precedent: narrow
 * beats false-positive spam). The receipts: rate-limiting's SCALE card is an unambiguous
 * old-generation checklist ("one atomic increment per request, roughly 100-byte counters, ...")
 * and contains ZERO semicolons -- it chains on commas -- while 43 refreshed, capital-opening
 * cards carry three or more. Any semicolon rule tight enough to catch the first fires on dozens
 * of the second. It is not in this file, and this paragraph is why.
 *
 * ------------------------------------------------------------------------------------------
 * THE SURFACE IT READS, AND HOW IT PROVES IT READ ALL OF IT.
 * It consumes the COMPILED bank slices -- what actually ships: the 8 hand-coded
 * src/topics/<id>/bank.js (committed) plus src/topics/_generated/<id>/bank.js (build output,
 * gitignored). Reading the shipped object rather than re-parsing markdown means this check does
 * not reimplement the compiler's parser and cannot disagree with it about what a card contains.
 *
 * But `_generated/` is gitignored, so with no build present this check would happily drive 8
 * topics and report "8 topics, 0 new defects" -- a true sentence and a completely misleading one,
 * and on an empty baseline it would print PASS while covering 8 of 46. So COVERAGE IS ASSERTED
 * AGAINST AN INDEPENDENT REFERENCE: a dumb line scanner over src/topics-md/*.md -- files this
 * check does not parse, import or otherwise depend on -- counts every authored `### ` bank
 * heading, `Int:` and `Int2:`. Every authored topic must have a compiled bank, and that bank must
 * carry at least as many cards and Int lines as the author wrote. A shortfall is a HARNESS FAULT
 * (run `npm run build`) or a COMPILER DROP -- either way a hard FAIL, never a quiet green.
 * (numbers_lattice pays for the same lesson in its own header; this is that guard, extended from
 * "how many topics" to "how many cards and fields within each".)
 *
 * ------------------------------------------------------------------------------------------
 * THE RATCHET (test/bank_pushback_debt.json) -- parity_debt / cram_surface discipline. The corpus
 * fails this check today, and a gate that is born red cannot merge and teaches people to override
 * it. Known defects are allowlisted by key and the list may only SHRINK:
 *     a defect NOT in the baseline        -> FAIL (new regression)
 *     a baseline entry no longer observed -> FAIL (stale: delete the line)
 * Fixing waves delete lines. When the file is empty the mechanism can be removed.
 * Refresh with:  node test/bank_pushback.cjs --write-debt
 *
 * AND THE DETECTORS SELF-TEST ON EVERY RUN, because staleness protects a detector only while its
 * class still has baseline entries. At the empty-baseline end state a detector that silently
 * stopped matching would leave this gate green forever -- the failure mode this repo has already
 * paid for repeatedly. SELF_TEST runs every detector against fixed fixtures on every invocation
 * and ABORTS before the corpus is touched if any fails to fire or fires on its negative control.
 * Pure strings: no DOM, no clock, no locale, no filesystem.
 *
 * Pure node, no browser, no network, ~1s.
 *
 * Usage:
 *   node test/bank_pushback.cjs
 *   node test/bank_pushback.cjs --write-debt
 *   node test/bank_pushback.cjs --plant       (watched-red: inject one defect of every class)
 *   node test/bank_pushback.cjs --list        (the derived work-list, by topic)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const TOPICS = path.join(ROOT, 'src', 'topics');
const GENERATED = path.join(TOPICS, '_generated');
const MD_DIR = path.join(ROOT, 'src', 'topics-md');      // the INDEPENDENT coverage reference
const DEBT_FILE = path.join(__dirname, 'bank_pushback_debt.json');

const WRITE_DEBT = process.argv.includes('--write-debt');
const PLANT = process.argv.includes('--plant');
const LIST = process.argv.includes('--list');

/* The bracket. See the header: 11 (worst sweep-named defect) -> 48 (best donor pair). */
const NOVEL_MAX = 20;

/* The two card tags the sweep found the Class-A template on. `no_int2` is scoped to these because
 * a FRAME or CLOSE card legitimately lands on one exchange; a SCALE/DESIGN card that carries a
 * Model and one Int is the exact half-refreshed shape the sweep describes. */
const DEEP_TAGS = ['SCALE', 'DESIGN'];

/* ============================ TEXT (pure, shared) ============================
 * The corpus is strict ASCII at source but the SHIPPED strings carry HTML tags and named
 * entities (`<b>`, `&mdash;`, `&rsquo;`). Both surfaces are folded to plain words before any
 * measurement, so markup can never count as content and an entity can never split a word. */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '--', ndash: '-',
  rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', hellip: '...', rarr: '->', larr: '<-', times: 'x',
  le: '<=', ge: '>=', deg: 'deg', middot: '.', bull: '.', minus: '-', frac12: '1/2', plusmn: '+/-' };

function plain(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(\w+);/g, (m, n) => (Object.prototype.hasOwnProperty.call(ENT, n) ? ENT[n] : ' '))
    .replace(/&#x?[0-9a-fA-F]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Content words: >2 letters, case-folded, punctuation stripped. Same shape the cram checker uses,
 * so the two agree about what "a content word" is. */
function contentWords(s) {
  return plain(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

/* ============================ DETECTORS (pure: text in, verdict out) ============================ */

/* THE PRIMARY MEASURE. How many content words does this Int's answer use that its own Model does
 * not already contain? Set arithmetic only -- no float comparison, no locale collation, no
 * ordering dependence -- so it is identical on every platform. */
function novelty(answer, model) {
  const A = new Set(contentWords(answer));
  const M = new Set(contentWords(model));
  let shared = 0;
  A.forEach((w) => { if (M.has(w)) shared++; });
  return { novel: A.size - shared, words: A.size, shared,
    overlap: A.size ? shared / A.size : 0 };
}

function detectThinInt(answer, model) {
  const n = novelty(answer, model);
  if (n.words === 0) return 'the Int carries no answer at all';
  if (n.novel > NOVEL_MAX) return '';
  return 'the answer adds only ' + n.novel + ' content word(s) its own Model does not already '
    + 'contain (' + n.words + ' content words, ' + Math.round(n.overlap * 100) + '% of them already '
    + 'in the Model) -- at or under the ' + NOVEL_MAX + '-word floor, so a candidate who re-reads '
    + 'the Model above has already been told this';
}

/* A card that states a model answer and then lets it stand unchallenged. Exact: no threshold. */
function detectNoInt(card) {
  if (!card.model || !plain(card.model)) return '';        // no Model = nothing to push on
  if (card.int && plain(card.int.q)) return '';
  return 'the card ships a Model answer and NO Int -- the pane\'s designated adversarial rep gives '
    + 'zero reps, so the hardest scenario in the topic ends on the candidate\'s own monologue';
}

/* Half-refreshed: a deep card with one exchange where the refreshed generation carries two. */
function detectNoInt2(card) {
  if (DEEP_TAGS.indexOf(String(card.tag || '')) === -1) return '';
  if (!card.model || !plain(card.model)) return '';
  if (!card.int || !plain(card.int.q)) return '';          // no_int already owns that case
  if (card.int2 && plain(card.int2.q)) return '';
  return 'a ' + card.tag + ' card with a Model and exactly one Int -- the shape the sweep found on '
    + 'half-refreshed cards, where the second push ("the fix\'s own failure mode") was never written';
}

/* The generation tell, in its exact half. Every refreshed Model opens as something said out loud
 * and therefore opens on a capital (or on markup/quote/digit that begins a spoken sentence). A
 * lowercase opener is a fragment continuing a heading that the reader cannot see.
 *
 * It judges the FIRST character of the folded text and nothing else. Scanning forward to the
 * first LETTER instead looks equivalent and is not: idempotency's SCALE Model opens "1,000 x
 * 86,400 = ~86 million live keys", whose first letter is the multiplication sign's `x`, and the
 * check reported a refreshed card as a lowercase fragment. A Model opening on a digit, a quote or
 * a bracket is making no register claim either way, so it is not judged. */
function detectRegisterLc(model) {
  const p = plain(model);
  if (!p) return '';
  const first = p.charAt(0);
  if (!/[A-Za-z]/.test(first)) return '';
  if (first !== first.toLowerCase()) return '';
  return 'the Model opens lowercase ("' + p.split(/\s+/).slice(0, 6).join(' ')
    + '...") -- it reads as a checklist fragment continuing the card heading, not as a sentence a '
    + 'candidate says out loud, which is the sweep\'s reliable tell for the un-refreshed generation';
}

/* ============================ THE PER-RUN SELF-TEST ============================
 * Fires on positives, silent on negative controls -- and the two ANCHOR fixtures are corpus text
 * VERBATIM, one from each side of the bracket, so NOVEL_MAX cannot drift unnoticed in EITHER
 * direction. Runs before the corpus is read: a broken instrument makes every number meaningless. */

/* FLOOR ANCHOR -- modelled on soft-delete's DESIGN card, one of the sweep's four named instances.
 * The card itself measures novelty 5; this fixture's Model is a paraphrase of it and the pair
 * measures 4. Both are under the floor, so the fixture does its job -- but it is NOT verbatim. */
const ANCHOR_BAD_MODEL = 'soft-delete (deleted_at) for the reversible user-facing window with the '
  + 'partial unique index and a filtered default scope; a scheduled hard-delete job past the '
  + 'retention window for genuine erasure; and crypto-shredding where the data is large or copied '
  + 'downstream, since destroying the key erases every copy at once.';
const ANCHOR_BAD_ANSWER = 'It keeps the data; erasure requires it genuinely gone.';

/* CEILING ANCHOR -- idempotency's SCALE Int2, from the donor register the brief names. This pair
 * measures novelty 51 (an earlier comment here said 106, which was never this pair's value). It
 * must stay silent, or the threshold has climbed into the exemplar. */
const ANCHOR_GOOD_MODEL = 'Two numbers and a policy. Size: every request writes a key held for the '
  + 'TTL, so it is peak-rate x TTL -- 1,000 x 86,400 = ~86 million live keys, and because you '
  + 'store the response (not just a flag) at a few hundred bytes each, that is ~35 GB of hot, '
  + 'high-churn data. Hot path: the claim is a write on every request, before the effect -- so the '
  + 'dedup layer roughly doubles your write ops and sits on the critical path of 100% of them.';
/* The Model both halves of the PAIR fixture are measured against -- load-balancing's SCALE card,
 * verbatim, one of the sweep's four named Class-A instances. */
const ANCHOR_LB_MODEL = 'the LB spreads load roughly evenly, but when an instance fails its '
  + 'traffic redistributes to the survivors, so the pool must be sized with headroom (N+1 or more) '
  + 'to absorb a loss without overloading; health checks (active + passive, anti-flap thresholds) '
  + 'detect and eject the dead instance in interval x threshold seconds, and slow-start eases '
  + 'replacements in cold.';

const ANCHOR_GOOD_ANSWER = 'You must have decided in advance, because there is no good improvised '
  + 'answer at 3am. Fail closed -- reject writes while it is down -- preserves correctness and '
  + 'makes the dedup store a tier-0 hard dependency whose outage is now your outage. Fail open -- '
  + 'process without the check -- preserves availability and knowingly produces an unbounded '
  + 'number of duplicate effects for the duration of the incident. For money and irreversible '
  + 'provisioning you fail closed and you say so out loud, accepting what that means for your '
  + 'availability budget. What actually sinks the round is having no position.';

const SELF_TEST = [
  ['thin+ANCHOR-floor-softdelete', () => detectThinInt(ANCHOR_BAD_ANSWER, ANCHOR_BAD_MODEL), true],
  ['thin+ANCHOR-ceiling-idempotency', () => detectThinInt(ANCHOR_GOOD_ANSWER, ANCHOR_GOOD_MODEL), false],
  /* THE PAIR THAT PROVES THIS IS NOT A WORD-COUNT FLOOR. Two answers of comparable length against
   * the SAME Model -- load-balancing's SCALE card, verbatim. The first restates it and must FIRE;
   * the second is the same size and says something the Model does not, and must stay SILENT.
   * Swap the measure for a length rule and the second fixture starts firing; drop the novelty
   * comparison and the first goes quiet. Either way the run aborts. */
  ['thin+PAIR-restatement-fires', () => detectThinInt(
    'The pool must be sized with headroom, N plus one or more, to absorb a loss without '
    + 'overloading the rest, because when an instance fails its traffic redistributes to the '
    + 'survivors and the load spreads roughly evenly across them.',
    ANCHOR_LB_MODEL), true],
  ['thin-PAIR-novel-silent', () => detectThinInt(
    'Six instances at fifteen hundred requests each is nine thousand of ceiling against six '
    + 'thousand offered, so you are at sixty-seven percent and one death puts the survivors at '
    + 'twelve hundred apiece -- inside their limit. Two deaths is fifteen hundred exactly, which '
    + 'is the cliff: no margin for a garbage-collection pause or a slow disk, and your probe '
    + 'interval decides how long that cliff lasts before a replacement arrives.',
    ANCHOR_LB_MODEL), false],
  ['thin+empty-answer', () => detectThinInt('', 'a model answer'), true],
  /* Markup and entities must fold away before counting, or `<b>` and `&mdash;` become content. */
  ['thin+markup-folds', () => detectThinInt(
    '<b>It keeps the data</b> &mdash; erasure requires it <i>genuinely gone</i>.',
    ANCHOR_BAD_MODEL), true],
  ['noint+model-no-int', () => detectNoInt({ model: 'a model answer that nothing pushes on' }), true],
  ['noint-NEG-has-int', () => detectNoInt({ model: 'a model', int: { q: 'and then what?', a: 'this' } }), false],
  ['noint-NEG-no-model', () => detectNoInt({ model: '' }), false],
  ['noint2+scale-single', () => detectNoInt2({ tag: 'SCALE', model: 'm', int: { q: 'q', a: 'a' } }), true],
  ['noint2+design-single', () => detectNoInt2({ tag: 'DESIGN', model: 'm', int: { q: 'q', a: 'a' } }), true],
  ['noint2-NEG-has-int2', () => detectNoInt2({ tag: 'SCALE', model: 'm', int: { q: 'q', a: 'a' }, int2: { q: 'q2', a: 'a2' } }), false],
  ['noint2-NEG-frame-tag', () => detectNoInt2({ tag: 'FRAME', model: 'm', int: { q: 'q', a: 'a' } }), false],
  ['register+lowercase', () => detectRegisterLc('one stable VIP fronting the pool; least-connections for variable costs'), true],
  ['register+lowercase-after-markup', () => detectRegisterLc('<b>one stable VIP</b> fronting the pool'), true],
  ['register-NEG-capital', () => detectRegisterLc('One stable VIP fronts the pool, and here is why that matters.'), false],
  /* The refreshed generation routinely opens on bold markup, a quote or a digit. None of those is
   * a lowercase opener, and flagging them would put ~200 fabricated findings in the baseline. */
  ['register-NEG-bold-label', () => detectRegisterLc('<b>Frame:</b> these are three independently-owned services.'), false],
  ['register-NEG-quote-open', () => detectRegisterLc('&ldquo;Design checkout&rdquo; is the wrong frame here.'), false],
  ['register-NEG-digit-open', () => detectRegisterLc('1,000 x 86,400 = ~86 million live keys, so the store is the ceiling.'), false],
  ['register-NEG-empty', () => detectRegisterLc(''), false],
];

function runSelfTest() {
  const bad = [];
  SELF_TEST.forEach((row) => {
    const name = row[0], fn = row[1], shouldFire = row[2];
    let got;
    try { got = fn(); } catch (e) { bad.push(name + ' THREW: ' + e.message); return; }
    const fired = !!got;
    if (fired !== shouldFire) {
      bad.push(name + ': expected ' + (shouldFire ? 'FIRE' : 'SILENCE') + ', got '
        + (fired ? 'FIRE (' + String(got).slice(0, 70) + ')' : 'SILENCE'));
    }
  });
  return bad;
}

/* ============================ LOADING ============================
 * Each slice is a plain script -- `var TOPIC_X_BANK = {...}` -- evaluated in a BARE vm context
 * with no DOM globals, so a slice that reaches for document/window throws here rather than being
 * quietly tolerated. A compiled bank aliases its sibling drill slice (`TOPIC_LB_DRILL.cards`) and
 * a hand-coded one aliases locals from its bundle; neither is loaded here and neither is read by
 * this check, so an undefined reference is satisfied with an inert stub and the run continues.
 * The stub loop is bounded: a slice needing more than 40 distinct globals is a malformed slice. */
function loadBank(file) {
  const src = fs.readFileSync(file, 'utf8');
  const ctx = Object.create(null);
  let lastErr = null;
  for (let i = 0; i < 40; i++) {
    try { vm.runInNewContext(src, ctx, { timeout: 10000 }); lastErr = null; break; }
    catch (e) {
      lastErr = e;
      const m = /^(\w+) is not defined$/.exec(String((e && e.message) || ''));
      if (!m) throw e;
      ctx[m[1]] = {};
    }
  }
  if (lastErr) throw lastErr;
  const key = Object.keys(ctx).find((k) => /_BANK$/.test(k));
  return key ? ctx[key] : null;
}

function discover() {
  const out = [];
  if (fs.existsSync(TOPICS)) {
    for (const d of fs.readdirSync(TOPICS, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === '_generated') continue;
      const f = path.join(TOPICS, d.name, 'bank.js');
      if (fs.existsSync(f)) out.push({ id: d.name, file: f, origin: 'hand-coded' });
    }
  }
  if (fs.existsSync(GENERATED)) {
    for (const d of fs.readdirSync(GENERATED, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const f = path.join(GENERATED, d.name, 'bank.js');
      if (fs.existsSync(f)) out.push({ id: d.name, file: f, origin: 'compiled' });
    }
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

/* THE CARD LIST. `curveballs[0]` is the SAME beat as the mock run's CURVEBALL card (the compiler
 * and every hand-coded bundle republish it into both arrays), so a naive concat double-counts it
 * -- and would double-count it in the BASELINE too, where a fix would then leave a stale twin.
 * Deduped on the authored content, never on object identity: JSON round-trips through the
 * compiler as separate objects, so identity comparison silently stops deduping for the 38
 * compiled topics while continuing to work for the 8 hand-coded ones. */
function cardsOf(bank) {
  const beats = [].concat(bank.mockBeats || [], bank.curveballs || []);
  const seen = new Set();
  const out = [];
  beats.forEach((c) => {
    if (!c || typeof c !== 'object') return;
    const k = String(c.tag || '') + '|' + String(c.theme || '') + '|' + plain(c.cue || '').slice(0, 80);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  });
  return out;
}

/* A stable, human-readable path for a card. Index would be a LIE as a key: inserting a curveball
 * renumbers every card below it, so every baseline entry underneath would go stale at once and a
 * fixing wave could not tell an insertion from a regression. Tag + theme + a cue slug is what the
 * author actually typed. */
function cardPath(c) {
  const slug = plain(c.cue || c.task || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-');
  return String(c.tag || 'CARD') + (c.theme ? '/' + plain(c.theme) : '') + ':' + (slug || 'untitled');
}

/* ============================ THE INDEPENDENT COVERAGE REFERENCE ============================
 * A line scanner over the AUTHORED markdown. It shares no code with the compiler and no code with
 * the loader above: it counts `### ` headings, `Int:` and `Int2:` lines inside the `## Bank`
 * section and nothing else. Its ONLY job is to answer "did the thing I measured contain
 * everything the author wrote?" -- so it deliberately under-counts nothing and interprets
 * nothing. (The 8 hand-coded topics have no markdown; their slices are committed source and are
 * covered by the corpus-size assertion instead.) */
function authoredCounts() {
  const out = {};
  if (!fs.existsSync(MD_DIR)) return out;
  for (const f of fs.readdirSync(MD_DIR)) {
    if (!f.endsWith('.md')) continue;
    const id = f.slice(0, -3);
    const lines = fs.readFileSync(path.join(MD_DIR, f), 'utf8').split(/\r?\n/);
    let inBank = false;
    let cards = 0, ints = 0, int2s = 0;
    for (const raw of lines) {
      const line = raw.trim();
      if (/^##\s+/.test(line) && !/^###/.test(line)) inBank = /^##\s+Bank\s*$/.test(line);
      if (!inBank) continue;
      /* A `### ` heading inside the Bank is a card UNLESS it is one of the two structural
       * switches the format defines ("Extra Curveballs", "Frames"), which carry no fields. */
      if (/^###\s+/.test(line)) {
        const h = line.replace(/^###\s+/, '');
        if (!/^Frames\b/i.test(h) && !/Curveballs\s*$/i.test(h)) cards++;
      }
      if (/^Int:/.test(line)) ints++;
      if (/^Int2:/.test(line)) int2s++;
    }
    out[id] = { cards, ints, int2s };
  }
  return out;
}

/* ============================ MAIN ============================ */
(function main() {
  const selfBad = runSelfTest();
  if (selfBad.length) {
    console.log('BANK PUSHBACK: detector SELF-TEST failed -- the instrument is broken, so no '
      + 'measurement is trustworthy:');
    selfBad.forEach((b) => console.log('    - ' + b));
    console.log('\nBANK PUSHBACK: FAIL  (' + selfBad.length
      + ' detector self-test failure(s); no corpus measurement was attempted)');
    process.exit(1);
  }

  const targets = discover();
  if (!targets.length) {
    console.log('BANK PUSHBACK: FAIL (no bank slices found under src/topics/ -- run `npm run build`)');
    process.exit(1);
  }

  const authored = authoredCounts();
  const loaded = {};
  const harness = [];

  targets.forEach((t) => {
    let bank = null;
    try { bank = loadBank(t.file); }
    catch (e) { harness.push(t.id + ': bank slice did not evaluate: ' + String((e && e.message) || e)); return; }
    if (!bank) { harness.push(t.id + ': slice declares no *_BANK global'); return; }
    loaded[t.id] = { cards: cardsOf(bank), origin: t.origin };
  });

  /* COVERAGE, asserted per topic and per field -- see the header. */
  const authoredIds = Object.keys(authored);
  authoredIds.forEach((id) => {
    const got = loaded[id];
    if (!got) {
      harness.push(id + ': authored in src/topics-md/ but NO compiled bank slice -- run '
        + '`npm run build` to write src/topics/_generated/');
      return;
    }
    const a = authored[id];
    const cards = got.cards.length;
    const ints = got.cards.filter((c) => c.int && plain(c.int.q)).length;
    const int2s = got.cards.filter((c) => c.int2 && plain(c.int2.q)).length;
    if (cards < a.cards) harness.push(id + ': the author wrote ' + a.cards + ' bank card(s), the '
      + 'compiled slice carries ' + cards + ' -- ' + (a.cards - cards) + ' dropped between the '
      + 'markdown and what ships');
    if (ints < a.ints) harness.push(id + ': the author wrote ' + a.ints + ' Int: line(s), the '
      + 'compiled slice carries ' + ints + ' -- ' + (a.ints - ints) + ' dropped');
    if (int2s < a.int2s) harness.push(id + ': the author wrote ' + a.int2s + ' Int2: line(s), the '
      + 'compiled slice carries ' + int2s + ' -- ' + (a.int2s - int2s) + ' dropped');
  });

  const ids = Object.keys(loaded).sort();
  const handN = targets.filter((t) => t.origin === 'hand-coded').length;
  if (authoredIds.length && ids.length < authoredIds.length + handN) {
    harness.push('corpus short: ' + ids.length + ' bank(s) loaded for ' + authoredIds.length
      + ' authored + ' + handN + ' hand-coded topics');
  }

  /* WATCHED-RED PLANT. One synthetic defect of every class, injected into topics chosen because
   * they do NOT already carry that class, so the delta against the baseline is exactly the
   * planted set. In-memory only: no file is touched. */
  if (PLANT) {
    const pick = (id, fn) => { if (loaded[id]) fn(loaded[id].cards); };
    pick('notifications', (cs) => { const c = cs.find((x) => x.tag === 'FRAME'); if (c && c.int) c.int.a = 'It is the boundary.'; });
    pick('signing', (cs) => { const c = cs.find((x) => x.tag === 'CLOSE'); if (c) delete c.int; });
    pick('iac', (cs) => { const c = cs.find((x) => x.tag === 'SCALE'); if (c) delete c.int2; });
    pick('authz', (cs) => { const c = cs.find((x) => x.tag === 'STRUCTURE'); if (c) c.model = 'request arrives with a token; verify it; scope the query.'; });
  }

  /* ---------------- the flag classes ---------------- */
  const defects = [];
  const add = (id, cls, p, why, ev) => defects.push({ id: id, cls: cls, path: p,
    why: String(why || ''), ev: String(ev || '').slice(0, 150) });

  ids.forEach((id) => {
    loaded[id].cards.forEach((c) => {
      const p = cardPath(c);

      const noInt = detectNoInt(c);
      if (noInt) add(id, 'no_int', p, noInt, plain(c.cue || c.task || ''));

      const noInt2 = detectNoInt2(c);
      if (noInt2) add(id, 'no_int2', p, noInt2, plain(c.cue || ''));

      const regLc = detectRegisterLc(c.model);
      if (regLc) add(id, 'register_lc', p, regLc, plain(c.model).slice(0, 120));

      ['int', 'int2'].forEach((f) => {
        const q = c[f];
        if (!q || !plain(q.q)) return;
        const why = detectThinInt(q.a, c.model);
        if (why) add(id, 'thin_int', p + '.' + f, why, plain(q.a).slice(0, 120));
      });
    });
  });

  const key = (d) => d.id + '::' + d.cls + '::' + d.path;
  defects.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));

  /* ---------------- --list: the derived work-list ---------------- */
  if (LIST) {
    const byTopic = {};
    defects.forEach((d) => { (byTopic[d.id] = byTopic[d.id] || []).push(d); });
    Object.keys(byTopic).sort().forEach((id) => {
      const ds = byTopic[id];
      const counts = {};
      ds.forEach((d) => { counts[d.cls] = (counts[d.cls] || 0) + 1; });
      console.log(id + '  [' + Object.keys(counts).sort().map((k) => k + '=' + counts[k]).join(' ') + ']');
      ds.forEach((d) => console.log('    ' + d.cls.padEnd(12) + ' ' + d.path));
    });
    console.log('\n' + defects.length + ' finding(s) across ' + Object.keys(byTopic).length
      + ' of ' + ids.length + ' topics');
    process.exit(0);
  }

  /* ---------------- the ratchet ---------------- */
  if (WRITE_DEBT) {
    if (harness.length) {
      console.log('BANK PUSHBACK: refusing to write a baseline while COVERAGE IS SHORT -- a '
        + 'baseline written from a partial corpus allowlists nothing and hides everything:');
      harness.slice(0, 10).forEach((h) => console.log('    - ' + h));
      console.log('\nBANK PUSHBACK: FAIL  (coverage shortfall; baseline NOT written)');
      process.exit(1);
    }
    const outObj = {};
    defects.forEach((d) => { outObj[key(d)] = d.ev || d.why; });
    fs.writeFileSync(DEBT_FILE, JSON.stringify(outObj, null, 2) + '\n', 'ascii');
    console.log('wrote ' + Object.keys(outObj).length + ' baseline entries to ' + DEBT_FILE);
    process.exit(0);
  }

  const DEBT = fs.existsSync(DEBT_FILE) ? JSON.parse(fs.readFileSync(DEBT_FILE, 'utf8')) : {};
  const live = new Set(defects.map(key));
  const isNew = defects.filter((d) => !(key(d) in DEBT));
  const stale = Object.keys(DEBT).filter((k) => !live.has(k));

  /* ---------------- report ---------------- */
  const pad = (s, w) => String(s).padEnd(w);
  const padL = (s, w) => String(s).padStart(w);
  const CLASSES = ['thin_int', 'no_int', 'no_int2', 'register_lc'];
  const byClass = {}, topicsWith = {};
  CLASSES.forEach((c) => { byClass[c] = 0; topicsWith[c] = new Set(); });
  defects.forEach((d) => { byClass[d.cls]++; topicsWith[d.cls].add(d.id); });

  const totalCards = ids.reduce((s, id) => s + loaded[id].cards.length, 0);
  const totalInts = ids.reduce((s, id) => s + loaded[id].cards
    .reduce((n, c) => n + (c.int && plain(c.int.q) ? 1 : 0) + (c.int2 && plain(c.int2.q) ? 1 : 0), 0), 0);

  console.log('');
  console.log('  ' + pad('flag class', 13) + padL('findings', 10) + padL('topics', 8) + '   allowlisted');
  console.log('  ' + '-'.repeat(54));
  CLASSES.forEach((c) => {
    const allow = Object.keys(DEBT).filter((k) => k.split('::')[1] === c).length;
    console.log('  ' + pad(c, 13) + padL(byClass[c], 10) + padL(topicsWith[c].size, 8) + '   ' + padL(allow, 6));
  });
  console.log('  ' + '-'.repeat(54));
  const allTopics = new Set(defects.map((d) => d.id));
  console.log('  ' + pad('TOTAL', 13) + padL(defects.length, 10)
    + padL(allTopics.size + '/' + ids.length, 8) + '   ' + padL(Object.keys(DEBT).length, 6));
  console.log('  measured ' + totalCards + ' bank cards / ' + totalInts + ' Int exchanges across '
    + ids.length + ' topics');
  console.log('  SCOPE: thin_int measures NEW VOCABULARY (novelty <= ' + NOVEL_MAX + ' content '
    + 'words vs its own Model), not meaning --');
  console.log('         a long answer that restates the Model in fresh words is NOT caught, and '
    + 'whether a question is');
  console.log('         GOOD stays human judgment. no_int / no_int2 / register_lc are exact.');
  console.log('');

  const fatal = harness.length || isNew.length || stale.length;
  if (!fatal) {
    console.log('BANK PUSHBACK: PASS  (' + ids.length + ' topics, ' + totalCards + ' cards, '
      + defects.length + ' known pushback defect(s) allowlisted in bank_pushback_debt.json across '
      + allTopics.size + ' topics)');
    process.exit(0);
  }

  console.log('BANK PUSHBACK: FAIL');
  if (harness.length) {
    console.log('\n  ' + harness.length + ' COVERAGE failure(s) -- this check did not measure the '
      + 'whole corpus, so its verdict means nothing:');
    harness.slice(0, 12).forEach((h) => console.log('    - ' + h));
    if (harness.length > 12) console.log('    ... and ' + (harness.length - 12) + ' more');
  }
  if (isNew.length) {
    console.log('\n  ' + isNew.length + ' NEW pushback defect(s) (not allowlisted in bank_pushback_debt.json):');
    isNew.slice(0, 20).forEach((d) => console.log('    - ' + d.id + ' [' + d.cls + '] ' + d.path
      + '\n        ' + d.why + (d.ev ? '\n        text: "' + d.ev.slice(0, 110) + '"' : '')));
    if (isNew.length > 20) console.log('    ... and ' + (isNew.length - 20) + ' more');
  }
  if (stale.length) {
    console.log('\n  ' + stale.length + ' STALE baseline entr(ies) -- fixed, so delete from bank_pushback_debt.json:');
    stale.slice(0, 20).forEach((k) => console.log('    - ' + k));
    if (stale.length > 20) console.log('    ... and ' + (stale.length - 20) + ' more');
  }

  /* The LAST line is what THE GATE prints in its summary row (check_all.py:last_line). */
  console.log('\nBANK PUSHBACK: FAIL  (' + harness.length + ' coverage, ' + isNew.length
    + ' new defect(s), ' + stale.length + ' stale baseline entr(ies); ' + defects.length
    + ' live findings across ' + allTopics.size + '/' + ids.length + ' topics)');
  process.exit(1);
}());
