# Wave E — warm re-check addendum (the bounce, adjudicated)

**Verifier** wE-verifier (warm re-check of my own published findings — the correct reuse; discovery
would want a cold reader)
**Companion to** `2026-07-29-wave-e-coldverify.md` (the cold verdict this bounce answers)
**Date** 2026-07-29 | **Tree left as found** — no edits, no commits, no stash, no merge

**VERDICT: CLEAN on content. One PROCESS finding the train should absorb first (§F).**
All three fixes are correct. The formula "disagreement" did not exist and the builder had already
retracted it independently. The scope-widening is **BLESSED — keep**.

**Subject moved during this re-check.** I was briefed to verify `8b76039`. The tip is now
**`4b44752`** — a fourth commit landed at 04:15 while my gate was running. That commit is *good*
(a self-retraction), but it means every receipt quoted in the re-freeze belongs to a commit that is
no longer the one shipping. Details and the fix in §F.

---

## A. The fixed clause — CORRECT, and the shipped wording is the second version

The false "3% at *any* volume" is gone from source and from the compiled deliverable (verified in
the HTML: `at <i>any</i> volume rather than 3% today` removed, `percentage win <i>shrinks</i> as
traffic rises` added). Only the trailing clause changed — the paragraph's first **1,182 characters
are byte-identical** to the pre-bounce version, so nothing else was disturbed.

**Careful: the sentence I was briefed on is not the sentence that ships.**

| | scaling rule as written |
|---|---|
| briefed (`8b76039`) | "divides the percentage by ten and multiplies the absolute excess by ten" |
| **shipping (`4b44752`)** | "**multiplies the absolute excess by ten and cuts the percentage by roughly the same factor**" |

**Both cited points verified** at n = 100 (`ln n` = 4.605170):

| m/n | excess `sqrt(2·(m/n)·ln n)` | excess/mean | win/one-choice-peak | card says |
|---|---|---|---|---|
| 10,000 | **303.4854** | 3.0349% | 2.9241% | "about 3%" ✓ |
| 1,000,000 | **3034.8543** | 0.3035% | 0.3023% | "about 0.3%" ✓ |

Absolute excess ×**10.0000** exactly; cited 303.5 → 3034.9 ✓.

**The "roughly" is a real refinement, not a hedge — I verified it and it is right.** The percentage
factor is exactly ten only under one of the two denominators:

| m/n | pct (excess/mean) | step factor | pct (win/peak) | step factor |
|---|---|---|---|---|
| 100 | 30.3485% | — | 21.5923% | — |
| 10,000 | 3.0349% | **10.000** | 2.9241% | **7.384** |
| 1,000,000 | 0.3035% | **10.000** | 0.3023% | **9.671** |
| 100,000,000 | 0.0303% | **10.000** | 0.0303% | **9.966** |

Under `excess/mean` it is exactly tenfold at every step; under `win/peak` it is 7.38 → 9.67 → 9.97,
tenfold only asymptotically, because the denominator grows too. **"Roughly the same factor" is the
only phrasing true under both.** The briefed unqualified "divides the percentage by ten" was exact
under one denominator and wrong-ish under the other. The retraction commit improved the card.

**Adversarial re-read of the whole replacement — clean.** "Excess grows like the square root of the
load while the mean grows linearly" ✓. "Percentage win shrinks as traffic rises" ✓. "With two
choices you provision the mean plus a *constant*, at any scale" ✓ (the heavily-loaded d≥2 result).
"One choice buys headroom that never stops growing" ✓. Consistent with the paragraph's earlier
"one choice… keeps climbing, two choices pins it near a constant forever."

**One judgment call I probed and cleared (non-finding, recorded so the record shows I looked):**
*"quoting the percentage talks you out of the algorithm exactly as it starts earning its keep."* A
sharp interviewer could answer "0.3% imbalance is fine, why do I care?" That is a framing claim, not
an arithmetic one; it is hedged ("the claim worth making is the absolute one"), and the card's
primary P2C argument — herd destruction across many LBs — is stated two Follows earlier on the same
card. **Let it stand.**

## B. THE FORMULA DISAGREEMENT — ADJUDICATED: it never existed, and the builder got there first

**Ruling: the factor of 2 is CORRECT, and neither of us ever dropped it.**

*Derivation.* Bin load ~ Binomial(m, 1/n), mean μ = m/n, variance ≈ m/n. For m/n large this is
≈ Normal(μ, m/n), and the maximum of n approximately-independent draws concentrates at
μ + σ·**sqrt(2 ln n)**. Hence

    one-choice max ≈ m/n + sqrt(m/n)·sqrt(2·ln n) = m/n + sqrt(2·(m/n)·ln n)

The 2 comes from the extreme-value constant `sqrt(2 ln n)`; dropping it understates the excess by
√2. This is the standard heavily-loaded form (Raab & Steger). **The card's own
`sqrt(2 x 10,000 x ln 100)` is right.**

**The reported disagreement was a denominator difference, not a formula difference.** My 21.7% at
m/n = 100 is the win taken over the **one-choice peak** — (130.3485 − 102.2033)/130.3485 = **21.59%**
— computed *with* the 2. The builder's ~30.3% is the excess over the **mean** — 30.3485/100 —
also with the 2.

**Why the wrong diagnosis was so plausible.** Dropping the 2 and dividing by the mean gives
`sqrt(100·ln 100)/100` = **21.46%**. Against my published 21.7%, that is a **0.13-point collision**.
Anyone pattern-matching on the number alone would reach the same wrong conclusion. Worth recording
so a future reader does not "re-fix" it in the wrong direction.

**The card does not merely survive either way — its own figures discriminate FOR the 2.** At
m/n = 10,000, dropping the 2 gives 2.146% → "about **2**%", which is not what the card prints. The
cited ~3% is consistent only with the correct constant. The defensive wording holds, and holds
harder than intended.

**The builder retracted this independently, before I ruled, by reading my primary evidence rather
than the summary** (commit `4b44752`, §9). Its recomputation reproduces my table row for row —
peaks 130.3 / 10,303.5 / 1,003,034.9 vs my 130.3 / 10,303 / 1,003,035; wins 21.6 / 2.92 / 0.30 vs my
21.7 / 2.9 / 0.30. I confirm every figure. Nothing is outstanding on this item.

## C. Nit 1 — devices-dispatch: CORRECT

"…that **undercounts by roughly eightfold**, before the kernel's own socket memory pushes it
further." 32/4 = 8 ✓. Also fixes a direction error I did not flag: the old text said the estimate
was "wrong", the new says it **undercounts**, which is the informative direction. The kernel-memory
clause is an honest hedge rather than a restored overclaim.

## D. Nit 2 — replication: CORRECT, and it closes the cram exposure completely

"…a node holding the latest **completed** write. Write the qualifier on the board, because it is the
whole guarantee: anything that stopped short of W is outside the overlap and this diagram promises
nothing about it." The added clause is *true*: a write that reached k < W nodes never completed, and
R + k need not exceed N, so a read of R can miss it entirely.

**I went one step past the brief and checked whether any OTHER cram-lifted surface still ships the
unqualified phrasing. None does.** Eleven lines in `replication.md` still say "latest write" bare —
but `deriveCram` lifts only `open.cards[0].items[0..1]`, `wb.steps[]`, `trade`, `num.compute`,
`rf.flags[]` and bank curveball themes, and the survivors sit in:

| pane | cram-lifted? |
|---|---|
| Spine (L23), Drill (L253/260/264/266), Walk (L465/469/544), System (L628), Model Answers (L781) | **no** |
| **Numbers (L848)** | yes — and it **already says "latest completed write"** ✓ |
| **Whiteboard (L575)** | yes — **this fix** ✓ |

So after this hunk, **zero cram-lifted surfaces in replication.md carry the unqualified form.** The
Class-H site is fully closed, not partially.

## E. THE SCOPE-WIDENING — RULING: **KEEP**

The replication Whiteboard step is pre-existing; wave E never touched it. Keeping it anyway:

- It is a **real defect found independently twice** — the original sweep's own Class-H example, and
  again in my cold verify as the one residual.
- It sits on the **cram spine**, the surface a reader meets five minutes before the loop — which is
  the sweep's stated reason Class H outranks its severity.
- The topic's **own Red Flags names this exact unqualified phrasing the most damaging flag in the
  file** (a vocabulary error where every other flag is a mechanism error). Shipping it into the
  cram spine was shipping the topic's own named no-hire.
- It is two lines, in a file wave E already edits, **declared rather than smuggled**, and
  independently revertible.
- Reverting would knowingly re-ship a defect both readers flagged, on a process technicality.

**`dup` risk measured, not assumed.** The new clause's longest shared word-run against *any* other
line in the file is **7** — and against a Walk paragraph, not the Red Flags sentence. Nowhere near a
lifted-sentence collision, and `cram_surface` PASSes with 0 allowlisted. The deliberate
wording-around checks out.

**Process note, not an objection:** a bounce that widens scope is fine *when declared*. The
declaration is what makes it reviewable, and it was declared in the freeze, the commit message and
the handoff. That behaviour should be reinforced, not discouraged.

## F. PROCESS FINDING — the "frozen" tip moved mid-verification (NON-BLOCKING, but fix before the train)

I was briefed to verify a frozen `8b76039`. At **04:15:37** commit `4b44752` landed (deliverable
rebuilt 04:16:56) while my gate run — started ~03:55 against `8b76039` — was still executing. Three
consequences:

1. **That gate run was void** and I discarded it rather than reporting it. A gate spanning a tree
   mutation is not attributable to any commit; reporting it would have been a fabricated receipt.
   I re-ran pinned at `4b44752` (tip re-checked at end of run).
2. **The committed gate capture is now stale by one commit.**
   `_audit/2026-07-29-wave-e-gate.txt` records `12040237 bytes`; the deliverable at HEAD is
   **`12040254`** (+17, the one-sentence rewording). The retraction commit did not refresh it. So
   the freeze's own headline receipt describes `8b76039`, not what ships.
3. This is the **PIN-FIRST hazard** the project already knows in its worktree-fleet notes, arriving
   in a benign form. No harm done — but "frozen" has to mean frozen, or a verifier's receipts
   silently detach from the artifact.

**Recommended before the train (cheap):** refresh `_audit/2026-07-29-wave-e-gate.txt` from a run at
the shipped tip, or add one line to the freeze noting the capture is from `8b76039` and pointing at
the tip's own run. My independent run at `4b44752` (§G) supplies the missing measurement either way.

**Cosmetic, optional:** the INDEX line narrates both scaling-rule versions in sequence — it still
contains the superseded "divides the percentage by ten" (describing the first re-freeze) before
recording the correction. Chronologically honest, but a skimmer could misattribute the superseded
phrasing as current.

## G. MECHANICALS — independent run pinned at the shipped tip

Ratchets and receipts I verified myself, at `4b44752`:

- **Novelty snapshot unchanged across ALL THREE bounce commits** (`221e6ab..4b44752`) ✓ — and I
  confirmed *why*: every edit lands in `## Drill` (load-balancing L344, devices-dispatch L203) or
  `## Whiteboard` (replication L575), all outside `## Bank`, which is what the snapshot tracks. The
  builder's reasoning is correct, not merely asserted.
- Compiled deliverable carries exactly the three fixes; `build_integrity`'s HEAD-match arm is the
  proof that the HTML is the build of the source.
- Re-freeze capture rows (at `8b76039`): pushback `{}` / 613 cards, novelty 826 / run 8 < 9 / 826
  kept, cram `{}` mirror-verified on 46, lattice 46/46 1 allowlisted, topic_contract 46/46,
  VR 16/16 matched committed pixels, GATE: PASS.

**My own full gate, pinned at `4b44752`: 58 PASS, 0 FAIL, 0 SKIP, exit 0 — GATE: PASS.**

- `build_integrity` PASS at **12040254 bytes** with "COMMITTED deliverable == fresh build of HEAD"
  — matching the shipped deliverable exactly.
- `overlay_deadzone` **PASS** (35 assertions) — no flake on my run.
- `bank_pushback` 613 cards / `{}` · `bank_novelty` 826, run 8 < 9, 826 kept · `cram_surface` `{}`
  mirror-verified on 46 · `numbers_lattice` 46/46, 1 allowlisted · `topic_contract` 46/46 ·
  `build_determinism` PASS · **VR 16/16 matched its committed pixels**.
- The tip advanced to `f5cad6d` *during* this run — docs-only, see §H.

---

## H. §F IS CLOSED — and the receipt is blob identity, not another gate run

The tip moved twice more after my pin (`f5cad6d`, then `2af2616`), the second time *during* my gate
run. Both are `_audit/` prose only. **I verified the builder's byte-identity claim rather than
taking it:**

| check | result |
|---|---|
| `git diff 4b44752..HEAD -- src/ test/` | **empty** |
| deliverable git blob at `4b44752` | `11da2f55f930b50a015fb000a1c52a20ef27c7b7` |
| deliverable git blob at `2af2616` | `11da2f55f930b50a015fb000a1c52a20ef27c7b7` — **identical object** |
| files touched since my pin | `_audit/2026-07-29-wave-e.md`, `_audit/2026-07-29-wave-e-gate.txt` |

**So my pinned gate at `4b44752` is a valid receipt for the artifact shipping at `2af2616`.** Blob
identity is a *better* answer than a re-run: a re-run proves a build, whereas an identical blob
proves there is nothing new to build.

**The stale-capture finding is fixed.** `_audit/2026-07-29-wave-e-gate.txt` now records
**12040254 bytes**, matching the shipped deliverable byte-for-byte (was 12040237, the `8b76039`
run). Both halves of §F are resolved, and the builder has declared `2af2616` its last commit.

**The `overlay_deadzone` flake fired on the builder's final run too — and was handled correctly.**
It returned the same `Node.js v25.2.1` crash-tail signature. Rather than re-running until green,
the builder ran the check **standalone first** (35/35 PASS, exit 0) and only then re-ran the full
gate. That is a diagnosis, not a retry, and it is the distinction that keeps a real defect from
being laundered into a green gate. Recorded in the freeze §9. Mine passed outright, so the check now
has **six** independent greens against one crash — and zero assertion failures, ever.

## I. Answers to the builder's two invited push-backs — I DECLINE BOTH; the fix stands as written

1. *"It is one word **plus one grounding clause**, not one word."* **Agreed, and that is better than
   what I asked for.** My Class-H finding was "no bound, no 'completed write', no failure edges";
   the bare qualifier answers only the middle third, and the clause answers the rest. I asked for
   the minimum; the fix delivered the whole finding. No objection.
2. *"That step is pre-existing — fixing it inside a bounce widens scope."* **Ruled KEEP in §E**, on
   the merits: real defect, found independently twice, sitting on the cram spine, and it was the
   topic's own named worst flag. Declared and revertible is the right way to widen a bounce.

**On the count difference:** the builder measured **39** sites for the `completed`/`acknowledged`
qualifier; my regex counted **44** occurrences of `(completed|acknowledged) writes?`. Different
method (sites vs occurrences), same conclusion — the file overwhelmingly qualifies and the
Whiteboard step was the outlier. Not material, and not worth reconciling.

---

## J. POST-MERGE — the train already ran, and it raced the builder's last two commits

Checked after the fact: master merged `content/wave-e` at **`d29579e`**, and my two verdict files
were committed at **`78ef6ab`**. The merge caught the branch at **`f5cad6d`**. Two later commits
**did not merge**:

| commit | contents | in master? |
|---|---|---|
| `8e5f82b` | overlay_deadzone flake diagnosis (9 lines) + **gate-capture refresh** | **NO** |
| `2af2616` | builder's blob-identity answer note (2 lines) | **NO** |

**THE SHIPPED ARTIFACT IS CORRECT — this is a record gap, not a content gap.** Verified:

    git diff 4b44752 master -- src/ test/ deepdive_content_pipeline_rehearsal.html   ->  EMPTY

Master's deliverable blob is `11da2f55`, byte-identical to the tip I gated 58/58. Nothing
user-facing is wrong, and no re-gate is needed.

**What master is missing is audit record — including, ironically, the fix for my own §F finding.**
Master's `_audit/2026-07-29-wave-e-gate.txt` still records **12040237 bytes** while master's own
deliverable is **12040254** — the stale capture I raised in §F. The builder fixed it in `8e5f82b`;
that fix is on the branch and not on master. Also lost: the flake-diagnosis paragraph, which is the
most reusable forensic note in the wave.

**Recommendation (non-blocking, zero artifact risk):** cherry-pick `8e5f82b` and `2af2616` onto
master. Both touch `_audit/` only. I did not do it — my brief is read-only and master is not mine to
mutate.

**The pattern, third occurrence in one wave:** `8b76039` moved under my re-check, `f5cad6d` moved
under my gate run, and now the merge closed under the builder's last two commits. Nothing was
damaged any of the three times, because the artifact stabilised early — but "frozen" kept meaning
"probably still moving," and the only reason that was safe is that someone measured blob identity
each time instead of assuming it. **Pin first, and let the freezer declare the freeze.**

---

## FINAL VERDICT — CLEAN on content and artifact. One record gap (§J), non-blocking.

Content correct, arithmetic adjudicated, scope-widening blessed, mechanicals green on an
independently pinned run, and both §F process findings closed *on the branch*. The train has already
run and shipped the right bytes; the only outstanding item is two unmerged `_audit/` commits.

---

## What this addendum does NOT claim

- **This was a warm re-check, and warm is the wrong instrument for discovery.** I re-verified my own
  findings and the fixes to them. I did not re-read the ~950 cards, and the ten new exchanges have
  still never been read by a *cold* human reader — only by me, twice.
- The Class-H closure in §D is proven for `replication.md` only. I did not re-sweep the other 45
  topics for unqualified cram-lifted surfaces.
- §A's "let it stand" on the earning-its-keep framing is a judgment, not a measurement.
