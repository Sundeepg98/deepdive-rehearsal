#!/usr/bin/env node
/*
 * BANK NOVELTY GATE -- did rewriting a Model silently DEGRADE a good Int beneath it?
 *
 * WHAT THIS PROTECTS, AND WHY bank_pushback CANNOT. Its sibling `test/bank_pushback.cjs` asks
 * "does this Int push on anything?" and answers with NOVELTY -- how many content words the Int's
 * answer uses that its own Model does not. That is a FLOOR check and it is stateless: it fails an
 * exchange whose novelty is <= 20 and is content with anything above.
 *
 * The regression it structurally cannot see was found by wave B's own builders, mid-wave, on their
 * own work: the Bank's Class-A cards are HALF-refreshed -- a legacy Model sitting under an already
 * excellent Int2 -- so a wave that rewrites Models is, card by card, moving content INTO the Model
 * that the Int2 beneath it existed to elicit. The Int2 still passes the floor. It is simply worth
 * less than it was, and no defect entry ever appears, because "this got worse but is still legal"
 * is not a defect a stateless floor can express. wB2-fixer hit it on `sharding-strategies` DESIGN;
 * wB1-fixer then measured all 22 of its own kept pairs by hand and reported it could not be a check
 * without a BEFORE reference. This file is that reference, plus the two detectors that use it.
 *
 * ------------------------------------------------------------------------------------------
 * TWO ARMS, AND THEY MEASURE GENUINELY DIFFERENT THINGS.
 *
 *   echo  -- STATELESS. The Model reuses a CONTIGUOUS RUN of ECHO_RUN_MIN+ content words from its
 *            own Int/Int2 answer. This is the mechanism wB2 actually described ("stated that
 *            card's pre-existing Int2 punchline almost verbatim"): a restatement copies a PHRASE.
 *            Needs no history, so it also judges cards nobody has touched.
 *   drift -- SNAPSHOT-BASED. A KEPT exchange (question and answer both byte-identical to the
 *            snapshot) whose novelty has fallen below RETAIN_MIN of its recorded value. This is
 *            the coarse net for a Model that subsumes its answer in FRESH words, which `echo`
 *            cannot see because nothing was copied.
 *
 * Neither catches a SHORT paraphrased theft -- one sentence, reworded. That gap is real, it is
 * stated here rather than hidden, and it is why the freeze report for any content wave still says
 * a human read the cards. Same honesty split bank_pushback states for `thin_int`.
 *
 * ------------------------------------------------------------------------------------------
 * WHY `drift` IS NOT THE PRIMARY ARM -- A MEASUREMENT THAT KILLED THE OBVIOUS DESIGN.
 *
 * The design handed to this wave (bank-alpha freeze 5b) was drift ALONE, with the fraction to be
 * anchored so that wB2's caught case (sharding DESIGN Int2, "novelty 58 -> 44") FIRES while
 * wB1's measured-acceptable pairs stay silent. That anchoring is NOT ACHIEVABLE, and the receipts
 * matter more than the conclusion:
 *
 *   1. 58 -> 44 is the SHIPPED state of that card, not a discarded draft. Measured here from the
 *      authored markdown at 42bf6eb versus 45ec7fd, and confirmed by omega's own freeze table
 *      (`sharding-strategies | DESIGN | int2=58 | int2=44`). The cold verifier read the shipped
 *      card and passed it ("Intact"), believing a rewrite had moved the number. It had not.
 *   2. So the designated must-fire case is a card TWO readers judged good -- and THREE other kept
 *      pairs lose novelty FASTER than it does: rules-engine SCALE Int2 0.740, soft-delete SCALE
 *      Int2 0.750, event-driven SCALE Int2 0.755, versus sharding's 0.759. event-driven SCALE
 *      Int2 was specifically read and passed by the cold verifier.
 *   3. A threshold that fires at 0.759 therefore fires on four cards and catches nothing. An
 *      instrument whose only demonstrated behaviour is a false positive is worse than no
 *      instrument, because it teaches people to override the gate.
 *
 * The confound is Model GROWTH, exactly as wB1 argued: those Models grew 5-6x (18-22 content words
 * to 111-123) while sharding's grew 1.9x (66 -> 128). A longer Model captures more of ANY answer's
 * vocabulary whether or not one idea moved. Novelty ratio cannot separate growth from theft, and a
 * single-sentence punchline plant lands at ratio 0.63-0.94 -- straddling the legitimate population
 * entirely. Contiguity can: the same plants move the longest shared run to 9-42 words against a
 * corpus whose legitimate maximum is 8. That is why `echo` carries the teeth and `drift` is kept,
 * with a threshold well clear of every real movement, as a net for the catastrophic case only.
 *
 * ------------------------------------------------------------------------------------------
 * BOTH THRESHOLDS ARE BRACKETED BY THE CORPUS FROM BOTH SIDES, NOT CHOSEN.
 *
 *   ECHO_RUN_MIN = 9
 *     CEILING (must stay silent) -- the longest run this corpus reaches LEGITIMATELY is 8, on
 *       saga's FRAME Int. 691 of its 692 Int exchanges sit at 8 or below.
 *     FLOOR (must fire) -- state-machine's SCALE Int2 opens by restating its own Model's ceiling
 *       derivation: 19 consecutive content words. That card is the 692nd, it is a real defect
 *       that wave B and its cold verifier both missed, and THIS CHECK FOUND IT. Fixed on the
 *       branch that ships this file; the fixture below carries the pre-fix text, so the catch
 *       survives the fix.
 *     9 sits in an 8 -> 19 gap with no corpus mass anywhere inside it.
 *
 *   RETAIN_MIN = 0.60
 *     CEILING (must stay silent) -- the STEEPEST legitimate novelty loss in wave B's whole kept
 *       population (38 pairs across both halves): rules-engine SCALE Int2, 50 -> 37 = 0.740.
 *     FLOOR (must fire) -- a punchline restatement planted on sharding DESIGN's shipped Model:
 *       44 -> 26 = 0.591. CONSTRUCTED, and labelled so: per the measurement above this corpus
 *       contains no real instance, which is the finding, not a gap in the fixture set.
 *     0.60 sits in a 0.591 -> 0.740 gap. Raise it past 0.74 and the legitimate fixture fires;
 *     lower it under 0.591 and the plant goes quiet. Either way the run ABORTS.
 *
 * ------------------------------------------------------------------------------------------
 * THE SNAPSHOT (test/bank_novelty_snapshot.json) is a RECORD, not a debt list, and the difference
 * decides its rules. bank_pushback's ratchet may only SHRINK, because every line in it is a known
 * defect. A novelty record is a measurement of healthy content, so entries legitimately appear
 * (a new card) and vanish (a renamed or deleted one) without anything being wrong. Therefore:
 *   - a snapshot entry with no live exchange is NOT a failure; it is reported and ignored
 *   - BUT if the matched fraction collapses below COVERAGE_MIN the snapshot has decoupled from the
 *     corpus and this check is measuring nothing -- that IS a hard failure, never a quiet green
 *   - only KEPT exchanges are judged for drift: question AND answer byte-identical to the
 *     snapshot. A rewritten answer is new content with no before-state, and bank_pushback's floor
 *     is what judges it
 *   - an exchange currently under bank_pushback's floor (novelty <= NOVEL_MAX) is skipped by
 *     `drift`: that IS a defect and its sibling already owns it. Reporting it twice would make
 *     one defect look like two.
 * Refresh deliberately, WITH the content change that moved it:  node test/bank_novelty.cjs --write-snapshot
 *
 * COVERAGE. Like its sibling this reads the COMPILED bank slices -- what actually ships -- so it
 * cannot disagree with the compiler about what a card contains. `src/topics/_generated/` is
 * gitignored, so with no build present it would drive 8 hand-coded topics and report a confident
 * green over 12% of the corpus. The same independent line scanner over src/topics-md/*.md that
 * bank_pushback uses asserts otherwise: every authored topic must have a compiled bank carrying at
 * least as many cards and Int lines as the author wrote. A shortfall is a hard FAIL.
 *
 * The pure text helpers (plain/contentWords/novelty) are COPIED from bank_pushback.cjs rather than
 * imported: that file is a script with a process.exit() main, so importing it would run it. They
 * must agree about what a content word is -- if one is edited, edit both.
 *
 * Pure node, no browser, no network, no clock, no locale, no float threshold on the echo arm.
 *
 * Usage:
 *   node test/bank_novelty.cjs
 *   node test/bank_novelty.cjs --write-snapshot
 *   node test/bank_novelty.cjs --plant      (watched-red: inject one defect of each arm)
 *   node test/bank_novelty.cjs --list       (every exchange, worst first)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const TOPICS = path.join(ROOT, 'src', 'topics');
const GENERATED = path.join(TOPICS, '_generated');
const MD_DIR = path.join(ROOT, 'src', 'topics-md');
const SNAP_FILE = path.join(__dirname, 'bank_novelty_snapshot.json');

const WRITE_SNAPSHOT = process.argv.includes('--write-snapshot');
const PLANT = process.argv.includes('--plant');
const LIST = process.argv.includes('--list');

/* See the header for how each of these is bracketed. */
const ECHO_RUN_MIN = 9;      /* corpus legitimate max 8; the live catch is 19 */
const RETAIN_MIN = 0.60;     /* legitimate floor 0.740; planted restatement 0.591 */
const COVERAGE_MIN = 0.80;   /* below this the snapshot has decoupled from the corpus */
const NOVEL_MAX = 20;        /* bank_pushback's floor -- those exchanges are ITS defects, not ours */

/* ============================ TEXT (copied from bank_pushback.cjs -- keep in sync) ============ */
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

function contentWords(s) {
  return plain(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

function novelty(answer, model) {
  const A = new Set(contentWords(answer));
  const M = new Set(contentWords(model));
  let shared = 0;
  A.forEach((w) => { if (M.has(w)) shared++; });
  return A.size - shared;
}

/* A stable identity for the TEXT of an exchange, so `drift` can tell "kept" from "rewritten".
 * FNV-1a over the folded question + answer: 32 bits is ample for detecting an edit (this is a
 * change detector, not a security primitive) and it keeps the snapshot small and diffable. */
function fingerprint(q, a) {
  const s = plain(q) + ' ' + plain(a);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

/* ============================ DETECTORS (pure: text in, verdict out) ============================ */

/* THE ECHO MEASURE. Longest run of CONSECUTIVE content words appearing in both the answer and its
 * Model. Vocabulary growth scatters words; a restatement copies a phrase, and only the second
 * produces a long run. Classic rolling-row DP, O(|answer| x |model|) with two Uint16 rows -- a
 * few thousand cells per exchange, integer compares only, so it is identical on every platform. */
function longestSharedRun(answerWords, modelWords) {
  const A = answerWords, B = modelWords;
  if (!A.length || !B.length) return 0;
  let best = 0;
  let prev = new Uint16Array(B.length + 1);
  let cur = new Uint16Array(B.length + 1);
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      cur[j] = (A[i - 1] === B[j - 1]) ? prev[j - 1] + 1 : 0;
      if (cur[j] > best) best = cur[j];
    }
    const t = prev; prev = cur; cur = t; cur.fill(0);
  }
  return best;
}

function detectEcho(answer, model) {
  const run = longestSharedRun(contentWords(answer), contentWords(model));
  if (run < ECHO_RUN_MIN) return '';
  return 'the Model restates ' + run + ' consecutive content words of this answer -- at or past the '
    + ECHO_RUN_MIN + '-word run floor (the longest run legitimate content in this corpus reaches '
    + 'is 8), so the candidate re-reading the Model above is reading this answer\'s own phrasing '
    + 'back before it is asked for';
}

/* THE DRIFT MEASURE. Only meaningful for a KEPT exchange against a recorded before-value. */
function detectDrift(nowNovelty, wasNovelty) {
  if (!(wasNovelty > 0)) return '';           /* nothing recorded to fall from */
  if (nowNovelty <= NOVEL_MAX) return '';     /* under the floor: bank_pushback's defect, not ours */
  const ratio = nowNovelty / wasNovelty;
  if (ratio >= RETAIN_MIN) return '';
  return 'this answer was NOT edited, but its novelty against its own Model fell ' + wasNovelty
    + ' -> ' + nowNovelty + ' (' + Math.round(ratio * 100) + '% retained, under the '
    + Math.round(RETAIN_MIN * 100) + '% floor) -- the Model above it was rewritten to say what '
    + 'this answer existed to say';
}

/* ============================ THE PER-RUN SELF-TEST ============================
 * Every fixture below is CORPUS TEXT, extracted programmatically rather than retyped, because the
 * sibling check's floor fixture claims to be verbatim and is not -- it is a paraphrase measuring 4
 * where the card it names measures 5. Retyping a fixture is how a bracket silently stops being the
 * bracket the header describes. Runs BEFORE the corpus is read: a broken instrument makes every
 * number downstream meaningless. */

/* ECHO FLOOR -- state-machine SCALE, corpus verbatim. Its Int2 answer OPENS by restating
 * the Model's ceiling derivation; 19 consecutive content words. Found by this check. */
const ECHO_SM_MODEL = "The table keys on `(state, event)`, so the mechanical space is states by events --- 8 st"
  + "ates and 6 events is 48 cells, of which the table defines a small whitelist (say 14) and"
  + " every other cell is rejected with the state unchanged; concurrent actors on one entity "
  + "race, so each transition is a compare-and-swap that lets exactly one win and is idempote"
  + "nt under retries. The ceiling isn't the table --- it's the **hot entity**: the row lock "
  + "is held across the commit and same-row writers can't group-commit with each other, so on"
  + "e row serializes at roughly 1/(commit latency) --- order-1,000 moves/sec at a ~1ms commi"
  + "t --- above which the losers retry.";

const ECHO_SM_ANSWER = "First I'd *derive* the ceiling instead of asserting one: the row lock is held across the"
  + " commit, and same-row writers can't group-commit with each other, so one row tops out ne"
  + "ar 1/(commit latency) --- about 1,000/s at a 1ms commit. So 500/s isn't over the cliff; "
  + "it's a **strictly serial lane running at half capacity**, which is the more dangerous pl"
  + "ace to be, because there's no headroom for a commit-latency spike and optimistic CAS doe"
  + "sn't plateau gracefully --- past the knee the losers re-read and retry, which *adds* loa"
  + "d and collapses throughput. So: measure the real commit latency, then **shard the entity"
  + "** if the semantics allow (split the lifecycle into independent sub-entities that transi"
  + "tion separately), or **batch** its moves through a single-writer lane per entity key, wh"
  + "ich converts contention into deliberate serialization and removes the retry amplificatio"
  + "n. If they genuinely must all hit one row, I name the measured ceiling and design around"
  + " it --- I don't pretend one row scales.";

/* ECHO CEILING -- saga FRAME, corpus verbatim: the LONGEST run this corpus reaches
 * legitimately (8). It must stay silent, or the threshold has walked into real content. */
const ECHO_SAGA_MODEL = "**Frame:** these are three independently-owned services with three databases, so there i"
  + "s **no ACID transaction that spans them** -- and 2PC, which would create one, holds lock"
  + "s across the network from prepare to commit and doesn't scale. So the entire design is t"
  + "he answer to \"what do you do when you can't have one transaction?\" **One-liner:** a sa"
  + "ga -- a sequence of local transactions, ordered cheap-and-reversible first, each with a "
  + "compensating transaction, run forward on success and unwound in reverse on a definite fa"
  + "ilure, driven by a durable orchestrator, with idempotency on every step and an outbox so"
  + " no step can commit without its event escaping.";

const ECHO_SAGA_ANSWER = "Because 2PC **holds locks across the network from prepare to commit** -- a slow particip"
  + "ant blocks everyone, contention collapses throughput, and a coordinator crash strands pa"
  + "rticipants **in-doubt, still holding their locks**. And Kafka and most NoSQL stores can'"
  + "t even speak the protocol, so for a typical microservices stack the option often isn't o"
  + "n the table at all. It doesn't fail loudly; it becomes a throughput ceiling you cannot e"
  + "ngineer past. The saga is the deliberate trade: **no cross-service locks at all**, paid "
  + "for in lost isolation -- which you then buy back *selectively*, with atomic conditional "
  + "updates and semantic locks, only where it actually matters.";

/* DRIFT CEILING -- rules-engine SCALE, the STEEPEST legitimate novelty loss measured
 * across all 38 kept pairs of wave B (50 -> 37, ratio 0.74). Both Models verbatim. */
const DRIFT_RE_MODEL_BEFORE = "catalog times tenants is the ceiling, but the catalog-to-subscriptions join keeps each t"
  + "enant to its subscribed rules, so the real work is sparse; rules run in sequential passe"
  + "s by class.";

const DRIFT_RE_MODEL_AFTER = "**The naive ceiling is catalog times tenants, and the point is that you never pay it.** "
  + "Fifty rules across five hundred tenants sounds like twenty-five thousand rule-tenant pai"
  + "rs, but that product is only the *bound*, not the work: the engine evaluates the **join "
  + "of the catalog against each tenant's subscriptions**, and a tenant subscribes to the han"
  + "dful of rules it actually cares about, so the real active set is sparse --- ten-ish rule"
  + "s per tenant, not fifty. That join is also the answer to how one engine serves five hund"
  + "red different policies without five hundred deployments: a tenant's effective policy is "
  + "**its subscription rows plus its parameter values**, so two tenants can run the same cat"
  + "alog rule at different thresholds and the engine never branches on tenant identity. Noth"
  + "ing about a tenant lives in code. Within a cycle the engine works in **sequential passes"
  + " by class**, so rules that share a data requirement are fetched and evaluated together r"
  + "ather than each rule independently re-querying the same source. And the reason this stay"
  + "s cheap as you add tenants is that adding one adds **subscription rows**, not rule logic"
  + ", not a deployment, and not a branch in the engine --- which is the whole argument for r"
  + "ules-as-data rather than fifty if-statements with tenant checks in them.";

const DRIFT_RE_ANSWER = "The **devices**, not the rules. The cost is tenants x subscribed rules x devices --- fiv"
  + "e hundred tenants running ten rules each over two hundred devices is a **million evaluat"
  + "ions per cycle**, and at a five-minute cycle that's 288 cycles a day. If you append ever"
  + "y evaluation result to history that's **288 million rows a day**, which is the number th"
  + "at actually kills you. The fix is to record **state transitions only** --- a device that"
  + " passed again isn't news --- and keep the current state in a TTL store. The rules dimens"
  + "ion is a rounding error; always size on the fleet.";

/* DRIFT FLOOR -- CONSTRUCTED, not found: sharding DESIGN's shipped Model with that
 * card's own Int2 punchline (its last three sentences) appended. 44 -> 26 = 0.591. The corpus
 * contains no REAL instance of a drift-visible theft; that absence is the finding recorded in
 * the header, not a fixture we failed to look for. */
const DRIFT_PLANT_MODEL_BEFORE = "**Dual-write, backfill, verify, cut over --- and the ordering of those four is the whole"
  + " trick.** The reason it goes in that order is that it lets me move a live dataset withou"
  + "t ever having a moment where one copy is authoritative and wrong. I'd provision the new "
  + "shard and express the new mapping in the **placement service**, so routing is data I can"
  + " change and revert rather than config I have to deploy. Then **dual-write first**: every"
  + " new write lands on both old and new locations, so from that instant forward the new sha"
  + "rd is current and the copy job only has to deal with **history** --- a finite, shrinking"
  + " problem instead of a moving one. Then **backfill** the history in throttled, idempotent"
  + " batches, throttled because this is a live primary and the migration must never be the t"
  + "hing that takes it down. Then **verify**, and only then **cut over reads gradually** ---"
  + " a percentage, or key ranges, through the placement service --- watching correctness and"
  + " latency at each notch, because a gradual cutover means a bad result affects 1% of traff"
  + "ic and is one config change from zero. Dual-writes stop only *after* reads have fully mo"
  + "ved and a **rollback window** has elapsed, and the old shard is decommissioned after tha"
  + "t, not before: the ability to route back is the entire safety story and it costs almost "
  + "nothing to keep. Every write the migration itself issues is **idempotent**, since each b"
  + "atch can be retried and the whole job restarted after an interruption.";

const DRIFT_PLANT_MODEL_AFTER = "**Dual-write, backfill, verify, cut over --- and the ordering of those four is the whole"
  + " trick.** The reason it goes in that order is that it lets me move a live dataset withou"
  + "t ever having a moment where one copy is authoritative and wrong. I'd provision the new "
  + "shard and express the new mapping in the **placement service**, so routing is data I can"
  + " change and revert rather than config I have to deploy. Then **dual-write first**: every"
  + " new write lands on both old and new locations, so from that instant forward the new sha"
  + "rd is current and the copy job only has to deal with **history** --- a finite, shrinking"
  + " problem instead of a moving one. Then **backfill** the history in throttled, idempotent"
  + " batches, throttled because this is a live primary and the migration must never be the t"
  + "hing that takes it down. Then **verify**, and only then **cut over reads gradually** ---"
  + " a percentage, or key ranges, through the placement service --- watching correctness and"
  + " latency at each notch, because a gradual cutover means a bad result affects 1% of traff"
  + "ic and is one config change from zero. Dual-writes stop only *after* reads have fully mo"
  + "ved and a **rollback window** has elapsed, and the old shard is decommissioned after tha"
  + "t, not before: the ability to route back is the entire safety story and it costs almost "
  + "nothing to keep. Every write the migration itself issues is **idempotent**, since each b"
  + "atch can be retried and the whole job restarted after an interruption. Refusing to overw"
  + "rite an existing row makes that sequence a no-op. Then reconcile at the end. The invaria"
  + "nt to state: **the migration's writes must be idempotent and must never clobber a newer "
  + "value** -- do not try to lock or coordinate the two paths.";

const DRIFT_PLANT_ANSWER = "You make the race *harmless* rather than trying to prevent it. Dual-writes go on **befor"
  + "e** the backfill starts, so every *new* write already lands on both sides and the copy o"
  + "nly has to deal with history. Then the backfill is **idempotent and never-clobbering** -"
  + "- `INSERT ... ON CONFLICT DO NOTHING`, or a version/timestamp compare -- so it can never"
  + " overwrite a newer dual-written value with a stale row it read earlier. That is precisel"
  + "y the corruption you are worried about: the backfill reads a row at T1, a live update wr"
  + "ites it at T2, and the backfill writes its stale copy at T3. Refusing to overwrite an ex"
  + "isting row makes that sequence a no-op. Then reconcile at the end. The invariant to stat"
  + "e: **the migration's writes must be idempotent and must never clobber a newer value** --"
  + " do not try to lock or coordinate the two paths.";

/* NEGATIVE CONTROL FOR ECHO, and the reason this arm is not just novelty in disguise: the SAME
 * answer against a Model holding the SAME WORDS in a different order. Novelty is identical by
 * construction -- set arithmetic cannot tell these two Models apart -- yet one restates the answer
 * and one does not. If echo ever starts measuring vocabulary instead of contiguity, this fires. */
function shuffledWords(s) {
  /* deterministic reversal of the folded word order: same multiset, no run longer than 1 */
  return plain(s).split(/\s+/).reverse().join(' ');
}

const SELF_TEST = [
  /* ---- echo, bracketed by the corpus from both sides ---- */
  ['echo+FLOOR-state-machine-restates-int2',
    () => detectEcho(ECHO_SM_ANSWER, ECHO_SM_MODEL), true],
  ['echo-CEILING-saga-longest-legitimate-run',
    () => detectEcho(ECHO_SAGA_ANSWER, ECHO_SAGA_MODEL), false],
  ['echo-PAIR-same-vocabulary-shuffled-is-silent',
    () => detectEcho(ECHO_SM_ANSWER, shuffledWords(ECHO_SM_MODEL)), false],
  ['echo+PAIR-same-vocabulary-in-order-fires',
    () => detectEcho(ECHO_SM_ANSWER, ECHO_SM_MODEL), true],
  ['echo-NEG-empty-answer', () => detectEcho('', ECHO_SM_MODEL), false],
  ['echo-NEG-empty-model', () => detectEcho(ECHO_SM_ANSWER, ''), false],
  /* Markup and entities must fold away before counting, or a tag can break a real run. */
  ['echo+markup-folds', () => detectEcho(
    '<b>' + ECHO_SM_ANSWER + '</b>', ECHO_SM_MODEL), true],

  /* ---- drift, bracketed by the corpus on the silent side and a plant on the firing side ---- */
  ['drift+FLOOR-planted-punchline-restatement',
    () => detectDrift(novelty(DRIFT_PLANT_ANSWER, DRIFT_PLANT_MODEL_AFTER),
      novelty(DRIFT_PLANT_ANSWER, DRIFT_PLANT_MODEL_BEFORE)), true],
  ['drift-CEILING-steepest-legitimate-loss',
    () => detectDrift(novelty(DRIFT_RE_ANSWER, DRIFT_RE_MODEL_AFTER),
      novelty(DRIFT_RE_ANSWER, DRIFT_RE_MODEL_BEFORE)), false],
  ['drift-NEG-novelty-rose', () => detectDrift(90, 60), false],
  ['drift-NEG-flat', () => detectDrift(60, 60), false],
  ['drift-NEG-no-before-value', () => detectDrift(3, 0), false],
  /* An exchange under bank_pushback's floor is ITS defect. Judging it here double-reports one
   * defect as two, and the two checks would then disagree about how many things are wrong. */
  ['drift-NEG-below-pushback-floor-is-not-ours', () => detectDrift(4, 100), false],
  ['drift+just-above-pushback-floor-is-ours', () => detectDrift(21, 100), true],

  /* ---- the shared helpers ---- */
  ['fingerprint-stable', () => fingerprint('q', 'a') === fingerprint('q', 'a'), true],
  ['fingerprint-separates-answer-edit', () => fingerprint('q', 'a') !== fingerprint('q', 'a2'), true],
  ['fingerprint-separates-question-edit', () => fingerprint('q', 'a') !== fingerprint('q2', 'a'), true],
  ['fingerprint-ignores-markup', () => fingerprint('q', '<b>a</b>') === fingerprint('q', 'a'), true],
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

/* ============================ LOADING (same contract as bank_pushback) ============================ */
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

/* Identical to bank_pushback's key, so an entry here and an entry there name the same card. It
 * keys on what the AUTHOR typed (tag/theme/cue), never on index or on the answer text -- so an
 * exchange keeps its identity across exactly the Model and Int rewrites this check exists to
 * watch, and inserting a curveball does not renumber every entry below it. */
function cardPath(c) {
  const slug = plain(c.cue || c.task || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-');
  return String(c.tag || 'CARD') + (c.theme ? '/' + plain(c.theme) : '') + ':' + (slug || 'untitled');
}

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
      if (/^###\s+/.test(line)) {
        const h = line.replace(/^###\s+/, '');
        if (!/^Frames\b/i.test(h) && !/Curveballs\s*$/i.test(h)) cards++;
      }
      if (/^Int:/.test(line)) ints++;
      if (/^Int2:/.test(line)) int2s++;
    }
    out[id] = { cards: cards, ints: ints, int2s: int2s };
  }
  return out;
}

/* ============================ MAIN ============================ */
(function main() {
  const selfBad = runSelfTest();
  if (selfBad.length) {
    console.log('BANK NOVELTY: detector SELF-TEST failed -- the instrument is broken, so no '
      + 'measurement is trustworthy:');
    selfBad.forEach((b) => console.log('    - ' + b));
    console.log('\nBANK NOVELTY: FAIL  (' + selfBad.length
      + ' detector self-test failure(s); no corpus measurement was attempted)');
    process.exit(1);
  }

  const targets = discover();
  if (!targets.length) {
    console.log('BANK NOVELTY: FAIL (no bank slices found under src/topics/ -- run `npm run build`)');
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

  Object.keys(authored).forEach((id) => {
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
      + 'compiled slice carries ' + cards + ' -- ' + (a.cards - cards) + ' dropped');
    if (ints < a.ints) harness.push(id + ': the author wrote ' + a.ints + ' Int: line(s), the '
      + 'compiled slice carries ' + ints + ' -- ' + (a.ints - ints) + ' dropped');
    if (int2s < a.int2s) harness.push(id + ': the author wrote ' + a.int2s + ' Int2: line(s), the '
      + 'compiled slice carries ' + int2s + ' -- ' + (a.int2s - int2s) + ' dropped');
  });

  const ids = Object.keys(loaded).sort();

  /* WATCHED-RED PLANT: one defect per arm, in memory only (no file is touched), in topics that
   * carry neither -- so the delta against a clean run is exactly the planted set.
   *
   * The two plants are deliberately built to fire ONE ARM EACH, which is the proof that the arms
   * measure different things rather than the same thing twice:
   *   echo  -- splice a SHORT VERBATIM RUN of the answer into its Model. Long shared run, barely
   *            any vocabulary moved, so novelty hardly shifts and `drift` stays silent.
   *   drift -- append 40% of the answer's tail with its WORD ORDER REVERSED. Identical vocabulary
   *            absorbed, so novelty collapses, but the longest run is 1 and `echo` stays silent.
   * If a future edit makes one arm a proxy for the other, this stops being one finding each. */
  if (PLANT) {
    const pick = (id, tag, fn) => {
      if (!loaded[id]) return;
      const c = loaded[id].cards.find((x) => x.tag === tag && x.int2 && plain(x.int2.a));
      if (c) fn(c);
    };
    pick('cdc', 'SCALE', (c) => {
      const w = plain(c.int2.a).split(/\s+/);
      c.model = plain(c.model) + ' ' + w.slice(0, 22).join(' ');
    });
    pick('idempotency', 'SCALE', (c) => {
      const w = plain(c.int2.a).split(/\s+/);
      c.model = plain(c.model) + ' ' + w.slice(Math.floor(w.length * 0.6)).reverse().join(' ');
    });
  }

  /* ---------------- measure every exchange ---------------- */
  const live = {};                 /* key -> {n, h, id, path, field} */
  const exchanges = [];
  ids.forEach((id) => {
    loaded[id].cards.forEach((c) => {
      const p = cardPath(c);
      ['int', 'int2'].forEach((f) => {
        const q = c[f];
        if (!q || !plain(q.q)) return;
        const key = id + '::' + p + '.' + f;
        const rec = { key: key, id: id, path: p, field: f,
          n: novelty(q.a, c.model), h: fingerprint(q.q, q.a),
          run: longestSharedRun(contentWords(q.a), contentWords(c.model)),
          answer: q.a, model: c.model };
        live[key] = rec;
        exchanges.push(rec);
      });
    });
  });

  if (!exchanges.length) harness.push('no Int exchanges found at all -- the corpus did not load');

  /* ---------------- --write-snapshot ---------------- */
  if (WRITE_SNAPSHOT) {
    if (harness.length) {
      console.log('BANK NOVELTY: refusing to write a snapshot while COVERAGE IS SHORT -- a snapshot '
        + 'taken from a partial corpus records nothing and blesses everything:');
      harness.slice(0, 10).forEach((h) => console.log('    - ' + h));
      console.log('\nBANK NOVELTY: FAIL  (coverage shortfall; snapshot NOT written)');
      process.exit(1);
    }
    const obj = {};
    Object.keys(live).sort().forEach((k) => { obj[k] = { n: live[k].n, h: live[k].h }; });
    fs.writeFileSync(SNAP_FILE, JSON.stringify(obj, null, 2) + '\n', 'ascii');
    console.log('wrote ' + Object.keys(obj).length + ' novelty snapshot entries to ' + SNAP_FILE);
    process.exit(0);
  }

  const SNAP = fs.existsSync(SNAP_FILE) ? JSON.parse(fs.readFileSync(SNAP_FILE, 'utf8')) : {};
  const snapKeys = Object.keys(SNAP);

  /* ---------------- the two arms ---------------- */
  const findings = [];
  const add = (rec, arm, why) => findings.push({ key: rec.key, id: rec.id, arm: arm, why: why,
    ev: plain(rec.answer).slice(0, 120) });

  let kept = 0, rewritten = 0, fresh = 0;
  exchanges.forEach((rec) => {
    const echo = detectEcho(rec.answer, rec.model);
    if (echo) add(rec, 'echo', echo);

    const was = SNAP[rec.key];
    if (!was) { fresh++; return; }
    if (was.h !== rec.h) { rewritten++; return; }     /* new content: no before-state to compare */
    kept++;
    const drift = detectDrift(rec.n, was.n);
    if (drift) add(rec, 'drift', drift);
  });

  const matched = kept + rewritten;
  const coverage = snapKeys.length ? matched / snapKeys.length : 1;
  const vanished = snapKeys.filter((k) => !(k in live));
  if (snapKeys.length && coverage < COVERAGE_MIN) {
    harness.push('the snapshot has DECOUPLED from the corpus: only ' + matched + ' of '
      + snapKeys.length + ' recorded exchanges (' + Math.round(coverage * 100) + '%) still exist, '
      + 'under the ' + Math.round(COVERAGE_MIN * 100) + '% floor -- this check is measuring almost '
      + 'nothing. Regenerate it deliberately with --write-snapshot and say why in the commit.');
  }

  /* ---------------- --list ---------------- */
  if (LIST) {
    const rows = exchanges.slice().sort((a, b) => (b.run - a.run) || (a.n - b.n));
    console.log('  run  novelty  kept  exchange');
    rows.slice(0, 60).forEach((r) => {
      const was = SNAP[r.key];
      console.log('  ' + String(r.run).padStart(3) + '  ' + String(r.n).padStart(7) + '  '
        + (was ? (was.h === r.h ? ' yes' : ' NEW') : '   -') + '  ' + r.key);
    });
    console.log('\n' + exchanges.length + ' exchange(s); showing the 60 with the longest shared run');
    process.exit(0);
  }

  /* ---------------- report ---------------- */
  const byArm = { echo: 0, drift: 0 };
  findings.forEach((f) => { byArm[f.arm]++; });
  const runs = exchanges.map((e) => e.run);
  const maxRun = runs.length ? Math.max.apply(null, runs) : 0;

  console.log('');
  console.log('  arm     findings   what it measures');
  console.log('  ' + '-'.repeat(72));
  console.log('  echo    ' + String(byArm.echo).padStart(8) + '   a Model reusing a run of '
    + ECHO_RUN_MIN + '+ consecutive content words from its own answer');
  console.log('  drift   ' + String(byArm.drift).padStart(8) + '   a KEPT answer whose novelty fell '
    + 'under ' + Math.round(RETAIN_MIN * 100) + '% of its snapshot');
  console.log('  ' + '-'.repeat(72));
  console.log('  measured ' + exchanges.length + ' Int exchange(s) across ' + ids.length
    + ' topics; longest shared run in the corpus: ' + maxRun);
  console.log('  snapshot ' + snapKeys.length + ' entr(ies): ' + kept + ' kept (drift-judged), '
    + rewritten + ' rewritten (new content), ' + fresh + ' unrecorded, ' + vanished.length + ' vanished');
  console.log('  SCOPE: `echo` measures CONTIGUITY and `drift` measures a KEPT answer\'s novelty '
    + 'against a recorded');
  console.log('         before-value. A SHORT, REWORDED theft is caught by neither -- that stays '
    + 'human judgment,');
  console.log('         as does whether a question is any good. See the header for why the '
    + 'novelty-ratio arm alone');
  console.log('         could not be anchored.');
  console.log('');

  if (!harness.length && !findings.length) {
    console.log('BANK NOVELTY: PASS  (' + ids.length + ' topics, ' + exchanges.length
      + ' Int exchanges, longest shared run ' + maxRun + ' < ' + ECHO_RUN_MIN + '; ' + kept
      + ' kept exchange(s) held their novelty against the snapshot)');
    process.exit(0);
  }

  console.log('BANK NOVELTY: FAIL');
  if (harness.length) {
    console.log('\n  ' + harness.length + ' COVERAGE failure(s) -- this check did not measure the '
      + 'whole corpus, so its verdict means nothing:');
    harness.slice(0, 12).forEach((h) => console.log('    - ' + h));
    if (harness.length > 12) console.log('    ... and ' + (harness.length - 12) + ' more');
  }
  if (findings.length) {
    console.log('\n  ' + findings.length + ' degraded exchange(s):');
    findings.slice(0, 20).forEach((f) => console.log('    - [' + f.arm + '] ' + f.key
      + '\n        ' + f.why + '\n        text: "' + f.ev + '"'));
    if (findings.length > 20) console.log('    ... and ' + (findings.length - 20) + ' more');
  }

  /* The LAST line is what THE GATE prints in its summary row (check_all.py:last_line). */
  console.log('\nBANK NOVELTY: FAIL  (' + harness.length + ' coverage, ' + byArm.echo
    + ' echo, ' + byArm.drift + ' drift; ' + exchanges.length + ' exchanges across ' + ids.length
    + ' topics)');
  process.exit(1);
}());
