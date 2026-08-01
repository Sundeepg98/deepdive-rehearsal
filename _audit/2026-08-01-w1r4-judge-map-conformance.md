<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (map-conformance lens, round 4), 2026-08-01, against appeal/home-instrument @ 8ef3cb9.
     Preserved unedited as the record ROUND 5 -- the closing round -- was executed from;
     the builder's response is _audit/2026-08-01-appeal-home-r5-addendum.md. -->

# W1 JUDGE — MAP CONFORMANCE — ROUND 4

**Subject:** the built home of Deep Rehearsal, `appeal/home-instrument` @ **`8ef3cb9`**
("the battery becomes generative, and the gauge decides on exact integers"), worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`, driven from
`deepdive_content_pipeline_rehearsal.html` — verified **byte-identical** to `dist/index.html`
(md5 `9235efbf1c21799bbf34b50040ae2db9`), tree clean at judgment time.

**Lens:** one only — does the built home honour the adopted flow map (`_ia/ADOPTED.md`,
`_ia/zonemap-flow.md` §Z1/§Z2, `_ia/zonemap-library.md` §0.1 RULE L2 / RULE L3), and do the
instruments the round built actually establish what the round claims they establish.

**Method.** The priority experiment first, exactly as briefed: **no seeds added**. Round 3's own
`full = (min === 100)` was restored into a scratch mirror of the deliverable and the **shipped,
unmodified** `test/home_claims.cjs` was run against it; then the same mirror was run against a copy
of the test with **only the two band pins deleted** (6 diff lines, 3 of them the `require` path).
Then: the generative sampler's reachable state space measured directly off `Altitude.compute()`
for all 24 seeds; the bank's per-tier shape read to establish the ceiling analytically; a **1px
sweep 400→1000** of the status census on the widest record the bar can hold; the per-topic reset
driven from the **keyboard** at both form factors; a 100px tab-bar ownership sweep at 390×844; the
hero census's clone geometry compared against the live hero and put through a negative control;
and the verdict-class coverage of the whole battery (13 pins + 24 generated) enumerated.
Harnesses: `_ia/w1-r4-shots/` (mirrored from the scratch run; every number below is from a run I
executed, not from the addendum).

---

## VERDICT: **BLOCKING**

Nine of the round's items are genuinely closed and four of them are closed better than the addendum
claims — the exact-integer gauge, the header seam, the census clipping, the hero census in the
gate. Round 3's **G1** and **G2** are both dead **in the product**, re-measured, and I say so
without reservation. §F's gate and VR bookkeeping verifies line by line.

But the round's thesis is that the retrospective-seed-list gap is closed by a generative battery,
and **the generative battery contributes nothing to closing it.**

I planted round 3's own defect and ran the shipped check. It failed — **and all eight failures are
on the two pinned records.** Zero of the forty-eight generated records failed. Delete those two
`SEEDS` entries, change not one character of the analyser, and the round's own headline defect
ships **PASS, exit 0**. The pins are still doing one hundred percent of the work on the one class
this round exists to kill, and the file's own header says the opposite in so many words.

That is not bad luck at one seed. `take = Math.max(1, Math.floor(rnd() * 46))` is **≤ 45 by
construction**, so one whole topic is always ungraded, so **no rail can exceed 98.05% and the
ladder cannot exceed 97.84%**. The band the round is about begins at 99.5%. `full` requires 100%.
The property arm cannot enter that region at any seed and at any `GEN_N` — and the file's own
comment invites raising `GEN_N` as the way to explore harder.

And a second instrument cannot fail where it claims to. The round's new "one rule that covers a
whole family of quoted-figure defects at once" **cannot see the sentence that fires on 22 of the 24
generated records**, because its regex may not cross a full stop. I planted a verdict that reads
*"SDE3 is the thin rail. 310 solid of 310 probes, across 46 of 46 topics"* six pixels above an SDE3
rail rendering **6 / 359 · 2%**, and `home_claims` returned **PASS, exit 0** — while printing its
own summary line claiming it detects *"a verdict quoting one rail's figures for another."*

Two headline instruments, two demonstrations that they cannot fail on the thing they are for. The
gate's 76/76 does not yet mean what §E claims it means, for the second consecutive round — and this
time the reason is inside the analyser rather than in its inputs, which is the harder failure.

---

# PART 1 — THE PRIORITY: THE GENERATIVE BATTERY

## 1.1 The experiment as briefed — no seeds added

`full = ladder.n > 0 && ladder.solid === ladder.n` in the mirror replaced by round 3's own
`full = shares.length > 0 && min === 100`. Nothing else touched. Shipped `test/home_claims.cjs`,
byte-unmodified, run against it:

```
FAIL [1280/oneShort]   the verdict agrees with the numbers beside it
     -- claims every rail is full while the rails render 970 solid of 971
FAIL [1280/oneShort]   the entailment agrees with the numbers beside it
FAIL [1280/nearlyFull] ... 968 solid of 971
FAIL [390/oneShort]  ... FAIL [390/nearlyFull] ...
HOME CLAIMS: FAIL (8)
```

Eight failures. **Every one of them on `oneShort` or `nearlyFull`.** The forty-eight generated
records (24 × 2 viewports) all passed. The addendum's §E says the negative control was demonstrated
"by restoring round 3's own defect into the product and watching **two arms fail on two records**"
— that sentence is literally accurate and describes **the two pins**. The builder ran this exact
experiment and did not notice that the property arm was silent.

## 1.2 The counterfactual — the pins are the whole check

I deleted the `oneShort` and `nearlyFull` entries from `SEEDS`. Nothing else. Full diff against the
shipped file, three of the six lines being the `require` path:

```
-  oneShort: () => {          -  nearlyFull: () => {
```

Same mutant product, same analyser, same 24 generated records per viewport:

```
EXIT=0        HOME CLAIMS: PASS
```

**Round 3's defect — the round's entire thesis — ships green.** The header of the shipped file says:

> "The named records stay -- they are cheap regression pins for defects that really happened -- but
> they are **no longer what makes this check the class-killer**."

Measured, that is exactly inverted. They are the only thing killing it.

## 1.3 Why — and it is structural, not statistical

The sampler's reachable space, read off `Altitude.compute()` for all 24 seeds:

| | measured over the 24 generated records |
|---|---|
| records where `full === true` | **0** |
| records with any rail in the [99.5, 100) band | **0** |
| rails rendering exactly 100% | **0** |
| records where `level === true` | **0** |
| records where `tiedDisplay === true` | **0** |
| **highest rail share reached, any record** | **76.60%** |
| highest ladder share reached | 52.32% |
| max `take` drawn | **45** of 46 |
| highest `depth` drawn (72 draws) | 0.9698 |

Two mechanisms, both hard:

**(a) One topic is always ungraded.** `take = Math.max(1, Math.floor(rnd() * ids.length))` with
`ids.length = 46` and `rnd() ∈ [0,1)` yields `take ≤ 45` **always**; measured max is exactly 45.
`ids.slice(0, take)` is a prefix, so `ids[45]` — `multi-tenant`, Staff 7 / SDE3 7 / SDE2 7 — never
receives a record. `altitude.js` deliberately counts the untouched in `n` ("IT COUNTS THE
UNTOUCHED... the honest denominator is the point"), so that alone caps every rail:

| take | Staff ceiling | SDE3 ceiling | SDE2 ceiling | ladder ceiling |
|---|---|---|---|---|
| **45 (the maximum)** | **97.74%** | **98.05%** | **97.68%** | **97.84%** |
| 44 | 95.81% | 94.43% | 96.03% | 95.37% |
| 40 | 87.10% | 84.68% | 88.74% | 86.71% |

A rail renders "100%" from 99.5%. `full` needs exactly 100%. **The band is out of range by
construction** — not rarely reached, *unreachable*.

**(b) The bias is on the wrong variable.** §A says the sampler is "deliberately biased toward the
boundaries — all-empty, all-full, and the 99.5-100% band." The bias lives in `pick()`, and `pick()`
is applied **only to `rate`** — the solid share *among graded probes*. The rail percentage is
`solid / n_total`, and the graded fraction is `depth`, drawn as a **bare unbiased `rnd()`**. So the
rail share is approximately `rate × depth × (take/46)`: a product of three terms, one biased and
two uniform. Even on the 10 records where `rate` hit exactly 1, the rail landed at `depth × take/46`.
And each card is an independent Bernoulli(`depth`), so P(a whole tier graded) = `depth^n_tier`:
at `depth = 0.99`, P(all 310 Staff graded) = 4.4e-2 and P(all 971 ladder graded) = **5.8e-5** —
and P(`depth ≥ 0.99`) is 0.01 per tier to begin with.

Raising `GEN_N`, which the file's own comment offers as the way to explore harder, cannot help.

## 1.4 The property arm is live — it is simply pointed below the band

To be fair to it, I gave it a defect inside the region it *does* explore: `thinSet` selected from
`max` instead of `min`. Shipped check, unmodified:

```
48 of 48 generated assertions FAIL
  [1280/gen#0] verdict: names SDE3 (3%) the thin rail while 0% is on the board
```

So this is a real instrument with a demonstrated negative control, not a dead one — and I credit
that. Its reachable space is roughly 0-77% of rail share, which is genuinely useful territory. It
is simply not the territory where the absolutes live, and the absolutes are what the round's own
rule ("no sentence may use an absolute unless the exact integer condition for it holds") governs.

## 1.5 Class coverage — and `level` is never produced at all

Verdict class rendered by each record, over the whole battery (13 pinned + 24 generated = 37):

| class | records producing it |
|---|---|
| cold | 1 (`empty`) |
| **full** | **1** (`perfect`) |
| **level** | **0 — never produced by any record** |
| tiedDisplay | 5 |
| thin-one | 23 |
| thin-several | 7 |

**`The rails are level.` is rendered by no record in the battery.** Not by the generated 24, and not
by the pin *literally named `level`* — which produces `SDE3 is the thin rail. 201 solid of 359…`,
because taking `Math.round(idx.length/2)` per tier per topic does not give three exactly equal
shares. The seed's own comment ("genuinely level: the same share at every tier") is wrong about
what it makes. The class is reached only by MUTANT 2, which writes the sentence in with `innerHTML`.

This matters because of an asymmetry in `judgeEntailment`. For `full` it **re-derives** the exact
condition from the model's own integers and does not trust the flag:

```js
const exactFull = M.ladder.n > 0 && M.ladder.solid === M.ladder.n;
```

That is why it caught the planted defect on `oneShort`. But for `level` it trusts the model:

```js
if (/The rails are level/.test(v) && !M.level) { ... }
```

So a `level` regressed to rounded precision — round 3's defect, one class over — would be
self-consistent (`judgeEntailment` agrees with the flag; `judgeVerdict` sees equal *rendered*
percentages and passes), and no record in the battery reaches the class anyway. `tiedDisplay` has
no entailment arm at all. **Of the three absolute-bearing classes, only `full` has an independent
exact check, and `full` is the one the property arm cannot reach.**

---

# PART 2 — A CHECK THAT CANNOT FAIL ON THE SENTENCE IT MOST OFTEN SEES

§A: *"every `N of M` inside a verdict must equal the `N / M` on the rail whose tier name precedes
it (one rule that covers a whole family of quoted-figure defects at once)"*.

```js
const re = /\b(Staff|SDE3|SDE2)\b[^.;]{0,40}?(\d+)\s+(?:solid\s+)?of\s+(\d+)/g;
```

`[^.;]` **excludes the full stop**. The two verdict shapes:

| sentence | matches |
|---|---|
| `SDE3 and SDE2 are the thin rails. Both sit at 0% solid — SDE3 0 of 359, SDE2 0 of 302 —` | **2** ✓ |
| `Staff is the thin rail. 104 solid of 310 probes, across 20 of 46 topics —` | **0** ✗ |

The one-thin sentence puts a period between the tier name and its figures, so the rule can never
bridge it. And `thin-one` is **23 of the 37** battery records and **22 of the 24** generated ones.

**Proved on the product, not argued.** One token in `verdictFor`:
`var a1 = model.tiers[set[0]]` → `var a1 = model.tiers[model.order[0]]` — the sentence names the
thin rail correctly and quotes the top rail's figures. Same record, clean build vs mutant:

```
  CLEAN                                    MUTANT
  header : 490 solid of 971 on the rails   header : 490 solid of 971 on the rails
  Staff  310 / 310 · 100%                  Staff  310 / 310 · 100%
  SDE3     6 / 359 ·   2%                  SDE3     6 / 359 ·   2%
  SDE2   174 / 302 ·  58%                  SDE2   174 / 302 ·  58%
  VERDICT: SDE3 is the thin rail.          VERDICT: SDE3 is the thin rail.
           6 solid of 359 probes,                   310 solid of 310 probes,
           across 4 of 46 topics                    across 46 of 46 topics
```

`node test/home_claims.cjs <mutant>` → **EXIT=0, 0 failures**, and its own final line prints:

> *6 planted mutants detected (… **a verdict quoting one rail's figures for another** …) — every
> one of them a defect a judge found on a shipped build*

MUTANT 5 plants that class **only in the two-thin shape** — the one shape where the rule works. The
self-test therefore proves the rule on its passing case and certifies a family it does not cover.
This is the "check that cannot fail" class, in the round's headline instrument, and unlike PART 1
it means **a false number can ship green today**.

`a1.topics of model.nTopics topics` is unchecked by any arm for the same reason.

---

# PART 3 — THE REST OF THE ROUND, RE-MEASURED

## §B the gauge → **CLOSED**, and correctly

`full = ladder.n > 0 && ladder.solid === ladder.n` is exact; `level` is decided by integer
cross-multiplication (`shares[i].solid * shares[0].n !== shares[0].solid * shares[i].n`) with no
float anywhere; `tiedDisplay` is a genuinely new class and the right one — "within a point of each
other… nothing separates the levels at this precision" is what the reader can actually see, where
"level" would be an absolute the record does not support. Round 3's **G1 is dead in the product**.
The rounded/exact split in the table is right, and `thin`/`tied` on rendered precision is correct
for the reason stated.

## §B the header seam → **CLOSED**

Driven on an 8-per-topic record at 1280:

```
header    : 367 solid of 971 on the rails
legend    : + 1 probe outside the three tiers, on no rail
census    : 368 of 972 probes graded · 368 solid · 0 shaky · 0 missed · 46 of 46 topics started
```

367 (ladder) + 1 (off-ladder) = 368 (bank). One panel, one denominator, and the difference is
**named** rather than folded into a total its own rails contradict. This is the cleanest fix in the
round.

## §A the hero census in the gate → **CLOSED**, and it is a real instrument

The clone `.hm-q` box against the live one:

| | 1280×800 | 390×844 |
|---|---|---|
| width live / clone | 556 / **556** | 312 / **312** |
| font / line-height | 21px/27.3px, identical | 18px/23.4px, identical |
| `-webkit-line-clamp` | "6" / "6" | "9" / "9" |
| overflow, display | hidden, flow-root — identical | hidden, flow-root — identical |
| census over the bank | **0 of 972** clipped | **0 of 972** clipped |

Negative control — it reports a clip at 429 chars (delta 82px at 1280, 116px at 390) and scales to
1938px at 4067 chars. The one-off builder measurement really is superseded by an arm that can fail.

## §C the census → **clipping CLOSED**; a fresh defect in the same ladder

The ids are emitted (`id="st-2"`, `id="st-3"`, one each in the deliverable). **1px sweep 400→1000**
on the widest record the bar can hold (972 of 972 graded, 326 solid / 323 shaky / 323 missed, 46 of
46 started):

> **widths clipped: 0**

Round 3's **G2 is dead**. The 420-492 and 520-544 bands are gone; `home_reflow` now seeds a mature
record and samples 430 and 530, which are inside both. Verified, and credited without reservation.

**But the separator bookkeeping is wrong at every rung.** The markup emits each separator
**before** its item; the CSS hides the separator **after** it:

```
[0] .hm-st-i "Record"   [1] .hm-st-i "N of 972 probes graded"   [2] .hm-st-sep
[3] #st-2 "…solid · shaky · missed"   [4] .hm-st-sep   [5] #st-3 "N of 46 topics started"
[6] .hm-st-sp   [7] .hm-st-i.hm-st-dim "Offline…"
```

- `#st-3 + .hm-st-sep` — **matches 0 elements.** `#st-3`'s next sibling is `.hm-st-sp`, the flex
  spacer, not a separator. This is round 3's dead-selector finding surviving the fix that was
  supposed to close it.
- `#st-2 + .hm-st-sep` matches the separator *after* st-2, while the one that needs hiding with st-2
  is the one *before* it.

So `.hm-st-sep` — `width:1px;height:11px;background:var(--bd)` — is left dividing nothing:

| width | bar reads |
|---|---|
| 430 | `972 of 972 probes graded │` |
| 530 | `Record  972 of 972 probes graded │` |
| 560 | `Record  972 of 972 probes graded │ 326 solid · 323 shaky · 323 missed │` |
| 760+ | clean |

**340 consecutive widths, 420-759.** It includes 430 and 530 — the two widths added to `home_reflow`
specifically to watch this bar. The arm measures `scrollWidth - clientWidth` only, so it looks
directly at the defect and cannot see it. Cosmetic, and I charge it as cosmetic; but it is in the
exact mechanism this round claims to have verified by 1px sweep, and the sweep measured the wrong
property.

## §D.7 the focus trap → **the indicator half is closed; the steal half is not**

`var quiet = !keyboardSeen` is the right rule and it works. Driven from the keyboard at 1280 — Tab
to arm, focus `[data-reset]` ("Reset progress for Event-Driven Backbone", visible, `outline: solid
2px`), press Enter:

| | measured |
|---|---|
| focus after | `.hm-cta` **(Resume)**, `data-autofocus=true` |
| ring on arrival | `outline: solid 3px rgb(42,40,35)` — **visible** ✓ |
| `hm-quiet-focus` | **false** ✓ |
| focus moved off the activated control | **yes** |

The ring survives, which is what round 4 fixed and what the new `focus_ring` arm asserts. But
`render()` still calls `cta.focus({ preventScroll: true })` **unconditionally on every render**, and
`render()` is still the `rerender` callback `Panels.bind` holds. At 390×844 the activeElement after
the same keystroke is **`document.body`** — focus is not merely moved, it is lost, and the next Tab
restarts at the top of the document.

Round 3's G3 charged two halves: *"lands, with no visible indicator, on a control in a different
region."* Round 4 fixed "no visible indicator" and left "a control in a different region". Round
3's own recommended fix had two clauses — a first-render flag **or** "skip both when
`document.activeElement` is already inside the home" — and the second clause is the one that closes
the steal. The new arm cannot see it: it asserts only `afterRerender.quietClass === false`, reads
`focused` without asserting it, and forces the re-render with focus already on the CTA, so
displacement is unobservable in that setup. WCAG 2.4.3.

## §D.8 tab-bar truth → **NOT CLOSED, and the failure is now the wrong answer rather than a stale one**

`rootMargin: '0px 0px -80% 0px'` shrinks the root's **bottom** by 80%, which observes **the top 169px
of an 844px viewport** — a band, 20% of the screen. The comment claims "the band is now the top of
the viewport downward, which **partitions** the page… every scroll position has exactly one owner."
Both halves are false. 100px sweep at 390×844, ordinary record (24 topics started, targets at
document y: continue [73,344], alt [370,758], libm [2167,2215], maxScroll 1731):

| scrollY | marked | in band | what the reader is looking at |
|---|---|---|---|
| 0–200 | top | top | the hero |
| 300–700 | alt | alt | Altitude / Still shaky |
| **800** | **top** | **—** | Still shaky / Recent sessions |
| **900–1300** | **top** | **—** | Recent sessions / Coverage by room |
| **1400–1731** | **top** | **—** | Coverage by room / the Library |

- **10 of 18 sampled positions have no target in the band**, and `if (!live) live = nodes[0].key`
  marks them **Today**.
- The bar reads **Today across scrollY 800→1731 — the bottom 55% of the page.**
- **`lib` is marked at 0 of 18 positions.** `.hm-libm` sits at document y 2167 while maxScroll is
  1731, so on an ordinary record the Library mount can never reach the band; the Library tab cannot
  become current at all.

Round 3's G4 was "Today is never current". The fix made Today the **fallback for every unowned
position**, which converts a stale mark into an affirmatively wrong one, still announced. The rule
the comment states — *"whichever target most recently crossed the top edge"* — is the correct
nearest-preceding-destination rule and is **not what the code implements**; that is the same shape
as round 3's G1 (an implementation following the weaker of two documented rules).

## §D.4/5/6/9 — the rest of the mechanical seven → **CLOSED**

| item | measured |
|---|---|
| **4 cursor validity** | `{drill:24}` on a 21-bank → *"You worked this topic earlier today, and stopped. 16 of its 21 probes still ungraded."* **No position asserted**, and the hero falls through to the first ungraded probe ✓ |
| **5 `firstUngraded` sentinel** | fully graded topic → eyebrow *"Worth another pass · Event-Driven Backbone"*, sentence *"Every probe here is graded."* The "Up next" collision is gone ✓ |
| **6 the cold h1** | exactly one visible `h1`, and `.hm-q` **is** it. Outline: `H1 "Walk me through how you would design this." / H2 Altitude / H2 Coverage by room / H2 Library` ✓ |
| **9 the goal fraction** | past goal → *"46 topics drilled, 5-topic goal met with 41 to spare"* in visible text **and** `aria-label`; under goal → *"3 of 5 topics"*; and the exact boundary reads *"goal met"*, not "0 to spare" ✓ |

## §F gate and VR → verified

- `_audit/2026-07-31-appeal-home-gate.txt`: **76 check lines, 0 FAIL, 0 SKIP, `GATE: PASS`** ✓
- registration delta `1c533d7 → HEAD` on `test/check_all.py`: exactly `+('home_reflow', …)` and
  `+('home_claims', …)`. Nothing removed, skipped or weakened ✓
- `git diff --stat 1c533d7 HEAD -- test/baselines/`: exactly **3 files** — `home-light`, `home-dark`,
  `manifest.json`. The other 14 byte-identical ✓
- re-run by me on the clean deliverable: `home_claims` **PASS, 206 assertions**; `home_reflow`
  **PASS, 50 assertions** ✓

## Map conformance — RULE L2 holds

*"coverage is SHAPE, never VERDICT"* (ADOPTED, ratified verbatim from `zonemap-library.md` §0.1).
`roomsHtml()` renders `N topics · M of N started`, a `pc% drilled` bar and `K weak` — shape and
orientation only. Readiness-against-tier stays in the Altitude panel, which is the ledger's job.
No readiness judgement anywhere on the shelf ✓.

---

# PART 4 — FRESH DEFECTS

## **H1 — BLOCKING. The quoted-figures rule cannot fail on the verdict that fires 22 times in 24**

PART 2 in full. `judgeQuotedFigures`'s `[^.;]{0,40}?` cannot cross the full stop in *"Staff is the
thin rail. 104 solid of 310"*, so the one-thin sentence's figures are checked by **no arm at all**
— not `judgeVerdict` (name and pct only), not `judgeEntailment` (`thinSet.length` only). Planted on
the product: *"SDE3 is the thin rail. 310 solid of 310 probes, across 46 of 46 topics"* over a rail
reading `6 / 359 · 2%` → **`home_claims` PASS, exit 0**. The self-test mutant for this exact class
is planted only in the two-thin shape.

**Fix:** anchor the rule per clause rather than per character window — split the verdict on
`[.;—]`, bind each clause to the tier named in it (or to the sentence's subject when the clause has
no tier of its own), and require every `N of M` in that clause to match that rail. Then re-plant
MUTANT 5 **in the one-thin shape** so the self-test proves the covering case, not the passing one.

## **H2 — BLOCKING (structural). The property arm cannot reach the region the round is about**

PART 1 in full. Ceiling 98.05% per rail / 97.84% on the ladder, against a band that starts at
99.5%; `full` unreachable, `level` produced by no record at all, `tiedDisplay` by no *generated*
record. The two pins are the entire negative control, and deleting them ships round 3's defect
green.

**Fix, three lines and none of them subtle:**
1. `take` must be able to reach `ids.length` — `Math.floor(rnd() * (ids.length + 1))`, or bias it
   to the ends the way `pick()` biases `rate`.
2. Bias `depth` the way `rate` is biased, and give the "full" branch a **deterministic** path
   (`depth === 1` ⇒ grade every card, not `rnd() <= d` per card) — otherwise `depth^971` eats it.
3. Add the boundary as a *derived* target rather than hoping the sampler lands on it: after
   building a record, with some probability un-grade exactly 1–3 ladder probes chosen at random.
   That is the band, generated rather than pinned, and it makes `oneShort`/`nearlyFull` genuinely
   redundant instead of load-bearing.

Then re-run the PART 1.2 counterfactual as the acceptance test: **delete the two pins, plant the
round-3 defect, and the check must still go red.** Until that holds, the claim in the file header is
not earned.

## **H3 — FIXABLE (strong). The tab bar marks Today across the bottom 55% of the phone page**

§D.8 above. 10 of 18 positions unowned and falling back to `nodes[0]`; Today marked at scrollY
800→1731; `lib` never marked on an ordinary record. Announced via `aria-current`.

**Fix:** implement the rule the comment already states. Track each target's `boundingClientRect().top
<= 0` (crossed the top edge), take the **last** that has crossed, default to the first only before
any crossing. That is a true partition and it makes all five rows read correctly. Add an arm: at N
scroll positions, exactly one tab is current and it is the nearest preceding destination.

## **H4 — FIXABLE. The per-topic reset still takes focus off the control the user activated**

§D.7 above. The ring is fixed; the steal is not. `render()` calls `cta.focus()` unconditionally, so
every reset and every Undo throws focus to Resume — and at 390 to `document.body`.

**Fix:** guard the autofocus, not just the quiet class —
`if (!el.contains(document.activeElement)) cta.focus({ preventScroll: true });`. Extend the
`focus_ring` arm to focus a `[data-reset]` control, activate it, and assert `document.activeElement`
is still inside the shelf.

## **H5 — FIXABLE (minor). The census shed ladder leaves a separator dividing nothing, 420-759**

§C above. `#st-3 + .hm-st-sep` matches **0 elements**; `#st-2 + .hm-st-sep` hides the wrong side.
340 consecutive widths, including the two the new arm was widened to cover.

**Fix:** target the separator *preceding* each shed item (`#st-2` and `#st-3` each want the
`.hm-st-sep` before them — simplest is to emit the separator *after* each item and keep the existing
`+` rules, or move to `:has()`/`nth-child`). Add a census arm asserting no `.hm-st-sep` is the last
visible child with content.

---

## Also observed, not charged

- **The pin named `level` does not produce a level record** (it renders `SDE3 is the thin rail`).
  Folded into H2 rather than charged separately, but the seed's comment should be corrected either
  way.
- **`judgeHeader` and `judgeHero` return `null` on an absent element** (`if (!r.header) return null`,
  `if (!r.hero) return null`). A panel that stopped rendering its header would pass. Cheap to close;
  not a live defect.
- **Compact density leaves the badge 0px of slack.** Unchanged from round 3, still clears, still a
  space token reserving for type.
- **92 topic-card buttons in the document at all times.** Unchanged; not a conformance defect.
- **The 420-919px band still has no room nav in the rail and no Topic-index affordance beyond `\`.**
  Correctly disclosed as uncharged since round 2.
- **The `[THIN]` rail mark is withheld whenever rails tie** — confirmed again; defensible.

## Where §E's disclosure is short

§E says the generative arm "explores the LADDER's shape and the resume pointer, not the whole record
space", and names the *fields* it does not touch (whiteboard, bookmarks, trend history). That is
honest as far as it goes and it is not what is missing. What is missing is that within the ladder's
own shape the arm reaches **0-77%** and cannot reach the top 2.2% — which is where every absolute on
the panel lives. The gap is not in the fields; it is in the range.

## Confidence and limits

**High confidence on H1** — proved on the product, both viewports, the shipped check returning exit
0, with the regex demonstrated in isolation and the rendered false sentence captured against the
rail that contradicts it. **High confidence on H2** — the ceiling is arithmetic off the bank's own
per-tier counts, not a sample, and the counterfactual is a two-entry deletion with a six-line diff.
**High confidence on H3** (100px sweep, block extents measured, the fallback branch read directly)
and **H5** (selector match counts read in the page, 340-width band from a 1px sweep). **H4** is
high-confidence at 1280 and I state the 390 body-loss as measured; my harness's focus was displaced
by a re-render before the keystroke there, so the 390 detail is weaker evidence than the 1280 row
and I have not leaned on it.

**Not covered.** No real device (any safe-area inset would be injected). No screen-reader pass —
"it is announced" is read from `aria-current` in the tree. I did not re-run the full 76-check gate;
I re-ran `home_claims` and `home_reflow` on the clean deliverable and verified the committed capture,
the registration delta and the baseline delta by diff. I did not verify any topic route. Dark theme
was driven only through `home_reflow`. The hero census sets text into a clone of the live element —
I verified the clone is geometrically identical to the original at both viewports, which makes it a
sound proxy for the clamp, but it is not a proof about `text-wrap:balance` under every sibling.
This judgment is the `#home` route.

*Judge: map-conformance lens, W1 round 4 of the appeal campaign, 2026-08-01. Harnesses, mirrors and
runs: `_ia/w1-r4-shots/`.*
