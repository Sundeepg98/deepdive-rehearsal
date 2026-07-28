# Wave B, builder 2 (m-z) -- FREEZE REPORT

**Branch** `content/bank-omega` @ master 42bf6eb. **Author** wB2-fixer, 2026-07-28.
**Scope** the mock-interview Bank's un-refreshed card generation, for every affected topic whose
id starts m-z. Sibling wB1-fixer owns a-l on `content/bank-alpha`; the two file sets are disjoint.

---

## 1. Headline

**All 74 m-z findings on the derived work-list are cleared, across 43 cards in 13 topics, with
zero new defects introduced.** The receipt is wB1's own instrument (`test/bank_pushback.cjs`) run
against wB1's committed debt baseline: **74 stale baseline entries, 0 new defects**, and the 96
findings the tool still reports are **entirely a-l**, i.e. wB1's half. `--list` shows no m-z topic
remaining.

Corpus-wide the tool went **170 -> 96 live findings**. The 74-finding delta is exactly this branch.

---

## 2. Reconciliation -- the sweep list vs the derived list

The brief told me to start from the 2026-07-20 catalog sweep's Sec.4 Classes A+B and reconcile once
wB1's derived prepass appeared. Both halves of that instruction mattered, because **the two lists
disagree substantially and the derived one is right**.

| | sweep estimate (m-z) | derived (wB1 prepass) |
|---|---|---|
| topics | 10 | **13** |
| card-level units | ~30 (my own count from the sweep) | **43 cards / 74 findings** |
| defect classes | 2 (A, B) | **4** (`no_int`, `no_int2`, `thin_int`, `register_lc`) |

**Topics the derived list ADDED to my half (4):** `observability`, `probabilistic-structures`,
`slos`, `state-machine`. None appears in the sweep's Class A or B. They account for 12 findings I
would otherwise have shipped untouched.

**Topics the derived list CLEARED:** `real-time-delivery`. The sweep places it in Class B, but it
has no missing `Int:` anywhere -- every one of its Extra Curveballs already carries one. Its sweep
complaint was the different, weaker "Models re-run drills" defect, which is not this wave. I
verified this independently before the tool landed and the tool then agreed; **no work was done on
it and none is needed**.

**Topics the sweep UNDERCOUNTED:** the sweep records one affected card each for `rate-limiting`,
`sharding-strategies` and `stream-batch-processing`. All three carry the template on **both** SCALE
and DESIGN. In fact every one of my nine Class-A topics does.

### 2.1 A methodological finding worth keeping

I built an interim scanner to start before wB1's tool existed, and negative-controlled it first
(it fired on saga's known-bad SCALE/DESIGN and stayed silent on saga's FRAME and idempotency's
SCALE). It ranked cards by **word-overlap ratio** between an Int's answer and its own Model.

**That axis is wrong, and wB1's tool documents exactly why.** The tool measures **novel content
words**, not overlap, and its header carries the receipt: `multi-tenant`'s DESIGN card is one of
the sweep's four named defects and shows only ~10% overlap, because the Model says "signed claim"
where the Int says "verified JWT claim". Word overlap is blind to paraphrase. **My scanner scored
that card 0.0 overlap -- it looked perfectly clean, and I would have skipped it.** Novelty catches
it at 9 words.

I re-derived the entire work-list from wB1's tool and stopped using mine for scope. The interim
scanner is not committed.

---

## 3. Per-card receipts

Measured with the tool's own novelty rule (content words in an Int's answer that do **not** appear
in its own Model; `NOVEL_MAX = 20`, bracketed by the corpus at 11 and 48). `[lc]` marks the
`register_lc` tell -- a Model opening lowercase, reading as a checklist fragment rather than a
sentence someone says out loud.

Legend: `int=N` novelty of the primary Int's answer. `NO-INT` = the card had no `Int:` at all.

| topic | card | before | after | what changed |
|---|---|---|---|---|
| saga | SCALE | `int=7` `[lc]` | `int=81 int2=89` | Model, Int, +Int2 |
| saga | DESIGN | `int=12` `[lc]` | `int=74 int2=108` | Model, Int, +Int2 |
| saga | CB/isolation | `int=64` `[lc]` | `int=64` | Model register only |
| sharding-strategies | SCALE | `int=14 int2=62` `[lc]` | `int=112 int2=51` | Model, Int (Int2 kept) |
| sharding-strategies | DESIGN | `int=27 int2=58` `[lc]` | `int=110 int2=44` | Model, Int (Int2 kept) |
| sharding-strategies | CB/wrong-key | `NO-INT` `[lc]` | `int=103` | Model register, +Int |
| rules-engine | SCALE | `int=7 int2=50` `[lc]` | `int=122 int2=37` | Model, Int (Int2 kept) |
| rules-engine | DESIGN | `int=9 int2=53` `[lc]` | `int=120 int2=47` | Model, Int (Int2 kept) |
| rules-engine | CB/dashboards | `NO-INT` `[lc]` | `int=126` | Model register, +Int |
| rules-engine | CB/the race | `NO-INT` | `int=110` | +Int |
| rules-engine | CB/two accounts | `NO-INT` | `int=122` | +Int |
| rules-engine | CB/stale policy | `NO-INT` | `int=96` | +Int |
| rules-engine | CB/emergency | `NO-INT` | `int=106` | +Int |
| rules-engine | CB/expressiveness | `NO-INT` | `int=142` | +Int |
| rules-engine | CB/precedence | `NO-INT` | `int=112` | +Int |
| storage-engines | SCALE | `int=23` `[lc]` | `int=116 int2=137` | Model, Int, +Int2 |
| storage-engines | DESIGN | `int=19` `[lc]` | `int=136 int2=141` | Model, Int, +Int2 |
| storage-engines | CB/rum | `NO-INT` `[lc]` | `int=119` | Model register, +Int |
| replication | SCALE | `int=11` | `int=122 int2=113` | Model, Int, +Int2 |
| replication | DESIGN | `int=16` `[lc]` | `int=115 int2=154` | Model, Int, +Int2 |
| replication | CB/split-brain | `NO-INT` `[lc]` | `int=128` | Model register, +Int |
| replication | CB/the lying metric | `int=35 int2=19` | `int=35 int2=150` | Int2 rewritten |
| multi-tenant | SCALE | `int=8 int2=75` `[lc]` | `int=131 int2=57` | Model, Int (Int2 kept) |
| multi-tenant | DESIGN | `int=9 int2=84` `[lc]` | `int=121 int2=64` | Model, Int (Int2 kept) |
| multi-tenant | CB/leak | `NO-INT` `[lc]` | `int=155` | Model register, +Int |
| soft-delete | DESIGN | `int=5 int2=56` `[lc]` | `int=123 int2=48` | Model, Int (Int2 kept) |
| soft-delete | SCALE | `int=8 int2=52` `[lc]` | `int=135 int2=39` | Model, Int (Int2 kept) |
| soft-delete | CB/constraint | `int=46` `[lc]` | `int=46` | Model register only |
| stream-batch-processing | SCALE | `int=37` `[lc]` | `int=35 int2=145` | Model register, +Int2 |
| stream-batch-processing | DESIGN | `int=34` `[lc]` | `int=33 int2=140` | Model register, +Int2 |
| stream-batch-processing | CB/reprocessing | `NO-INT` `[lc]` | `int=159` | Model register, +Int |
| rate-limiting | SCALE | `int=6` `[lc]` | `int=104 int2=134` | Model, Int, +Int2 |
| rate-limiting | DESIGN | `int=8` `[lc]` | `int=127 int2=129` | Model, Int, +Int2 |
| slos | SCALE | `int=16 int2=72` `[lc]` | `int=168 int2=72` | Model register, Int |
| slos | DESIGN | `int=14 int2=65` `[lc]` | `int=166 int2=65` | Model register, Int |
| slos | CB/dependency-ceiling | `int=81` `[lc]` | `int=81` | Model register only |
| state-machine | SCALE | `int=17 int2=75` | `int=137 int2=75` | Int |
| state-machine | DESIGN | `int=20 int2=29` | `int=122 int2=29` | Int |
| state-machine | CB/retry | `int=18` | `int=139` | Int deepened |
| state-machine | CB/hot-entity | `int=20` | `int=122` | Int deepened |
| state-machine | CB/overkill | `int=13` | `int=155` | Int |
| observability | CB/cardinality | `[lc]`\* | cleared | Model register only |
| probabilistic-structures | CB/error-safety | `NO-INT` | `int=133` | +Int |

**43 cards.** Every `[lc]` cleared; every Int below the 20-word floor now sits at 74-168; every
`NO-INT` now carries a pushback.

\* The before/after table above is computed on **raw markdown**, which under-reports `register_lc`
for a Model opening with markdown markup -- `observability`'s Model opens with a backticked
`` `customer_id` ``, so a raw-text first-character test sees a backtick, while the tool reads the
**compiled** output where that is `<code>customer_id</code>`, strips the tag, and correctly sees a
lowercase `c`. **The authoritative receipt for every row is the tool's own run**, which cleared
that entry along with the other 73. I am flagging the discrepancy rather than quietly reconciling
it, because it is the same paraphrase-vs-surface trap described in Sec.2.1.

---

## 4. Acceptance rationale -- one line per regenerated card

The acceptance test the brief set: **the new `Int:` must be unanswerable by re-reading the `Model:`
above it.** Each line below states the seam the Model opens and does not close.

- **saga SCALE** -- Model keys every step on `(saga_id, step_id)` but never says where `saga_id`
  comes from; Int pushes on duplicate *sagas*, which step-level idempotency cannot see.
- **saga DESIGN** -- Model gives a rule for choosing a coordination style; Int asks where the line
  falls *inside one mixed flow*, which the rule alone does not answer.
- **sharding SCALE** -- Model reaches for a global secondary index in one clause; Int pushes on
  what that index costs, since it is itself sharded on a different key.
- **sharding DESIGN** -- Model says "verify until they match"; Int asks what "match" means between
  two live datasets under write traffic.
- **rules-engine SCALE** -- Model assumes a cycle completes; Int asks what happens when one runs
  longer than the cycle interval.
- **rules-engine DESIGN** -- Model governs high-stakes changes; Int attacks the *classification* of
  what counts as high-stakes, which the Model leaves ungoverned.
- **storage-engines SCALE** -- Model picks TWCS; Int attacks TWCS's unstated premise that arrival
  order approximates event order.
- **storage-engines DESIGN** -- Model introduces a second copy via CDC; Int asks why the two
  systems disagree, which the Model's own design guarantees.
- **replication SCALE** -- Model mentions sloppy quorums in passing; Int shows the `R + W > N`
  guarantee evaporates under exactly that relaxation.
- **replication DESIGN** -- Model picks semi-sync; Int pushes on its dependence on one named node.
- **multi-tenant SCALE** -- Model argues density; Int attacks the uniformity assumption density
  rests on.
- **multi-tenant DESIGN** -- Model sets per-tenant limits; Int shows they cannot bound a
  *population*.
- **soft-delete DESIGN** -- Model offers "hard-delete or anonymize"; Int asks whether the
  anonymized version is genuinely erased.
- **soft-delete SCALE** -- Model treats rows in isolation; Int asks what happens to *children*,
  since a database cannot cascade a predicate.
- **rate-limiting SCALE** -- Model argues from fleet totals; Int attacks the non-uniformity of the
  per-client key.
- **rate-limiting DESIGN** -- Model returns `429` with `Retry-After`; Int asks what the client
  actually does with it.
- **slos SCALE** -- Model says "successful requests"; Int demands the definition of *successful*.
- **slos DESIGN** -- Model derives thresholds from a formula; Int shows the formula's statistics
  collapse at low traffic.
- **state-machine SCALE** -- Model rejects undefined `(state, event)` cells; Int shows a duplicate
  delivery and an illegal move are the *same* observation.
- **state-machine DESIGN** -- Model guards two distinct MFA'd approvers; Int shows they can approve
  *different documents*.
- **state-machine overkill** -- Model recommends upgrading enum-to-machine reactively; Int attacks
  that strategy's own migration.
- **Class-B curveballs** (12) -- each Int aims at the specific seam its own Model opens; the
  rationale is recorded in the commit for each cluster.

### 4.1 Two things I deliberately did NOT do

1. **A near-collision I caught and rewrote.** My first draft of `rules-engine` DESIGN's Int was the
   3am break-glass question. The topic's `emergency` curveball **already owns that ground**. I
   replaced it with the classification/meta-layer seam. Flagging because it is the failure mode of
   this wave: a card-local Int can silently duplicate a curveball three screens away.
2. **`replication` DESIGN's recommendation is unchanged.** The sweep's Class E flags that this
   card prefers semi-sync while three other panes hold that quorum commit dominates it. Changing
   the recommendation is Class D/E work, not this wave, and the Walk and Whiteboard carry it too.
   Instead the new Int aims straight at the weakness and lands on the file's **own** principle from
   line 141 ("never depend on one named node; depend on k of n"). The contradiction is now explicit
   teaching rather than a latent inconsistency -- **but the Class E wave should know this card now
   argues its side.**

---

## 5. A hazard this wave should carry forward

**Rewriting a Model can silently kill a GOOD `Int2:` sitting under it.** The Class-A cards are
*half*-refreshed: their Int2 is frequently excellent while the Model and Int are legacy. My first
`sharding-strategies` DESIGN Model stated that card's pre-existing Int2 punchline almost verbatim,
pushing its novelty **58 -> 44** -- still passing, but measurably degraded, and heading toward
answering its own follow-up.

I caught it by re-measuring after every edit rather than only at the end. **Nine of my cards carry
a pre-existing Int2 that I preserved untouched** (sharding x2, rules-engine x2, multi-tenant x2,
soft-delete x2, slos x2, state-machine x2 -- the excellent ones on cells, principals-vs-humans,
crypto-shredding, VACUUM-vs-live-tuples, the half-nine justification, and the 200-threshold-alert
migration). Every one is a card where a careless Model rewrite would have damaged good content
that no `no_int2` flag would ever have reported, because the field is present either way.

**Recommendation for the cold verifier:** check Int2 novelty on every card whose Model changed, not
just the fields that were the stated target.

---

## 6. Gate, VR, and build

- **Build**: green, run after every cluster (6 builds total). Deliverable synced and committed.
- **Conservation**: `PASS` on all four laws after every cluster -- 0 dropped, 0 annihilated,
  0 fused, 0 misfiled. This is the check that matters most here, since the compiler silently
  dropping authored Bank content is this repo's documented historical failure.
- **Strict ASCII**: 0 non-ASCII bytes across all 13 touched files, verified per cluster.
- **Per-file dash convention respected**: `saga` uses ` -- ` (102 occurrences in its Bank, 0 of
  ` --- `); the other twelve use ` --- `. New content matches its own file.
- **Gate row count**: **56, AST-exact** -- 23 rows in the list at `test/check_all.py:91` plus 33 at
  `:199`. Unchanged on this branch: I did not touch `check_all.py`, and `bank_pushback` is **not**
  registered here (wB1 registers it). Verified by AST parse, not by grep.
- **VR**: zero baseline churn expected and observed -- Bank content renders inside the mock
  overlay, which is not captured at rest. See Sec.7 for the gate's verdict line.
- **wB1's tool was run from its blob, never committed here.** `test/bank_pushback.cjs` and
  `test/bank_pushback_debt.json` were `git show`-n from `content/bank-alpha` into a scratch path,
  copied in to run, and **removed before the gate** so the gate measured this branch's real tree.
  `git status` was clean at freeze.

---

## 7. Gate verdict

Captured to `_audit/2026-07-28-bank-omega-gate.txt` (full run, this branch, foreground-equivalent).

```
GATE: PASS
EXIT=0
```

**56 of 56 registered checks reported. 0 FAIL. 0 missing.** Reconciled programmatically rather than
by eye: the 56 names parsed out of `check_all.py` by AST were diffed against the 56 result rows in
the capture file -- `registered - reported` is the empty set.

Load-bearing rows for this wave:

| check | verdict |
|---|---|
| `compiler_conservation` | **PASS** -- every authored item survives compilation intact |
| `compiler_md` | **PASS** -- markdown-parser data-equivalence, 54 pass / 0 fail |
| `topic_contract` | **PASS** -- 46 topics: population, parity, tiers, cards conform |
| `card_identity` | **PASS** |
| `cram_surface` | **PASS** -- 46 topics, 0 defects, mirror verified against `deriveCram` |
| `unit_tests` | **PASS** -- 72 passed, 0 failed |
| `visual_regression` | **PASS** -- **16 baselines**, matched committed pixels |

**VR claim: zero baseline churn, 16/16 matched.** As predicted, Bank content renders inside the
mock overlay and is not captured at rest, so regenerating 43 cards moved no pixel in any of the 16
committed baselines. Verbatim: *"16 baselines, win32-chromium149; every capture reached a proven
rest state across all 18 roots, cleared the blank-page floor, and matched its committed pixels."*

**A note on the run conditions.** The gate ran while ~60-68 node/chrome processes were live on the
box, i.e. concurrently with a sibling's browser-gated run -- the exact load profile that produces
spurious BOOT-timeout reds. **It passed anyway on the first attempt**, so no quiet re-run was
needed. Had it gone red I would have re-run once on a quiet box before reporting it, per the brief;
recording this because a *green* result under load needs no discount, whereas a red one would have.

---

## 8. Commits on `content/bank-omega`

```
ed83f34 build(bank): sync deliverable for the m-z bank regeneration
74984f9 content(bank): rate-limiting, slos, state-machine, observability, probabilistic-structures
bbd991c content(bank): multi-tenant, soft-delete, stream-batch-processing regeneration
3e30c42 content(bank): storage-engines + replication regeneration; clear 4 leftover lowercase Models
d18fa27 content(bank): rules-engine -- regenerate SCALE/DESIGN, add pushback to all 7 curveballs
b3b10ce content(bank): regenerate saga + sharding-strategies SCALE/DESIGN, add sharding wrong-key push
```

Files touched (13, all under `src/topics-md/`): `multi-tenant`, `observability`,
`probabilistic-structures`, `rate-limiting`, `replication`, `rules-engine`, `saga`,
`sharding-strategies`, `slos`, `soft-delete`, `state-machine`, `storage-engines`,
`stream-batch-processing` -- plus the synced deliverable. **Disjoint from wB1's a-l set**; the
expected merge conflict is `test/bank_pushback_debt.json`, which this branch does not contain and
which the team lead rebuilds.

---

## 9. Open items for the verifier and the merge

1. **The debt baseline must be regenerated after both merges.** My receipts are measured against
   wB1's snapshot; the final ratchet arithmetic reconciles at merge, not here.
2. **`real-time-delivery` was cleared, not skipped** -- see Sec.2. Worth an independent confirmation,
   since the sweep and the derived list disagree about it.
3. **Content quality is human judgment, not a green run.** The tool measures vocabulary novelty and
   says so in its own header: it cannot tell whether a question is one an interviewer would really
   ask, nor whether the answer is correct. Every one of my 43 cards passes mechanically; the
   dual-charter verifier's content pass is what actually validates them.
4. **Sec.5's Int2 hazard** applies equally to wB1's half.
