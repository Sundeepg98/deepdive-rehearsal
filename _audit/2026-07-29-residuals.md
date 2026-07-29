# Residuals wave -- closing every recorded thread to zero

**Branch** `content/residuals` @ master `76ec701` | **worktree** `w10-resid` | **builder** wR-fixer
**Six brief items, all closed. The optional 7th is DEFERRED on measurement, not on time.**

The wave's job was bookkeeping: close the campaign's recorded leftovers. Two of them turned out
not to be bookkeeping at all -- the cold read found four blocking defects, and the cdc
adjudication found the sweep wrong rather than the topic.

---

## 0. The headline

**The one caveat the whole campaign carried was true.** Wave E's ten new exchanges had been read
warm twice and never cold. Read cold, **four of them carry blocking defects** -- not stylistic
ones: an nginx citation that refutes the card quoting it, a cross-topic contradiction on the same
physical quantity, a status-class classification inside the card that exists to teach semantic
classification, and a "fully-preserved" claim about a Kafka topic at six months against a
seven-day default retention.

That is the argument for cold reads, made concrete. Both warm passes were competent; the verifier
that read these caught the builder's own arithmetic error. What a warm reader cannot do is arrive
without the author's frame, and every one of these four defects lives in the frame rather than in
the arithmetic. **The arithmetic itself survived independent re-derivation entirely.**

Second-order result: **two of the recorded findings I was sent to fix were themselves wrong.**
cdc's Class-J entry is a false positive (an interviewer's design brief read as an asserted
guarantee), and F6's 13-row list needs triage before it needs fixing (at least one entry is not a
defect at all). A campaign that records its findings honestly accumulates findings that are
wrong, and closing threads means adjudicating them, not executing them.

---

## 1. Item 1 -- the COLD read of Wave E's ten exchanges

**Method.** Three cold readers, dispatched in parallel, each given the sites and the house style
and **explicitly barred from `_audit/`** so that none of them could see the author's rationale.
Split by kind so no reader could average across classes: one on the two arithmetic beats (told to
re-derive every figure from scratch *before* comparing against the text), one on the four Class-I
timeout beats, one on the three pass-3 `Int2`s plus the reworded replication prose.

**Every finding was then re-verified by me against the primary text and against every corpus line
it cited, before any edit.** Nothing here rests on a subagent's unreviewed claim -- that is the
standing rule, and it is the specific rule Wave E's own section 9 was written to enforce after a
diagnosis was published from a summary rather than from the evidence. Reports (out of repo):
`D:/claude-workspace/_worktrees/_resid-coldread/{cold-arith,cold-classI,cold-pass3}.md`.

### 1.1 Per-exchange verdicts, one line each

| # | exchange | verdict |
|---|---|---|
| 1 | **circuit-breaker** drill Follow (Class I) | CLEAN -- one armor nit folded |
| 2 | **rate-limiting** `Store outage` Int2 (Class I) | **CLEAN, no findings** |
| 3 | **debugging** FAILURE Int2 (Class I) | **DEFECT** -- 1 blocking, 1 nit |
| 4 | **backpressure** `zero goodput` Int2 (Class I) | **CLEAN, no findings** |
| 5 | **load-balancing** P2C Follow + scaling rule | CLEAN on engineering -- 2 nits, one of them a self-contradiction the new text created |
| 6 | **devices-dispatch** C10K Follow | **DEFECT** -- 2 blocking, 1 nit |
| 7 | **retries-timeouts** `thundering herd` Int2 (pass 3) | CLEAN -- 2 cosmetic nits |
| 8 | **saga** `Choreography black hole` Int2 (pass 3) | CLEAN -- 1 nit (an example the topic's own invariant defuses) |
| 9 | **event-driven** `Poison message` Int2 (pass 3) | **DEFECT** -- 1 blocking, 1 high-value nit |
| 10 | **replication** Walk + Whiteboard rewordings | 2 CLEAN, 1 **DEFECT** (the `R + W > N` step) |

**What survived, and it is most of the substance.** All three pass-3 `Int2`s are true, seam-aimed
and unanswerable from their own Models. All four Class-I beats earn their place with
topic-specific mechanism -- none is a generic restatement that could be pasted into another of the
four. Every referent resolves. And every figure re-derived independently: 32 KB/connection, the
1.6 GB total, the ~8x undercount, 2.20, ~10,002, the ~5,000x, 303.5, and the 3% / 0.3% scaling.

### 1.2 The four blocking defects

**B1 -- devices-dispatch: the citation refutes the card.** *"That is precisely why nginx exposes
`ssl_buffer_size` as a knob at all"* was offered as corroboration for 32 KB per connection. It
fails three ways: the directive is the **send** buffer only ("the buffer used for sending data"),
it exists for **time-to-first-byte** rather than memory, and nginx sets `SSL_MODE_RELEASE_BUFFERS`
for you -- which **releases those buffers while a connection is idle**, and "50,000 concurrent
held connections, mostly idle" is this card's own scenario, set four lines earlier. The card
propped its number up with the one implementation that most clearly does not pay it, and an
interviewer who knows nginx takes the card's own witness and turns it around.

**B2 -- devices-dispatch contradicted the topic that owns this question.**
`real-time-delivery.md:297` derives the per-idle-connection budget explicitly, lands on **~10 KB
per idle connection (1 million at roughly 10 GB)**, commits to it again in its `Speak:` line, and
calls tens-of-KB TLS state the case where you have been **careless**. The new card called
tens-of-KB *"the right back-of-envelope"* and ruled out single-digit kilobytes. Two topics, one
physical quantity, incompatible numbers, and a candidate may well drill both. Reconciled the way
the mechanism actually reconciles them -- **untuned versus tuned** -- which is also the strongest
available upgrade to the card, because naming release-buffers is a more senior observation than
the raw 32 KB. Fixed alongside: *"left the **memory** problem untouched"* overstates it (moving
off thread-per-connection removed a large per-connection memory cost); it is the **buffers** that
were left untouched, which is what the card's own `Senior:` line already said.

**B3 -- debugging classified by status class, in the card that exists to teach semantic
classification.** The split shipped as *"errors whose outcome is known (a 4xx, a validation
rejection: these genuinely did not happen and replay safely)"*. `retries-timeouts.md:178` builds
an entire pushback on exactly this reasoning -- *"The rule was never 'the status code starts with
a 4'"* -- and repeats it in its `Speak:` line. Worse than the cross-topic clash: this card's own
storm is *"the client is still retrying in a tight loop"* against tight client timeouts, which
manufactures **nginx 499s** by the thousand -- a 4xx where the upstream handler frequently runs to
completion and commits after the caller has hung up. So the single largest population of
outcome-**unknown** entries in this exact scenario was sitting in the bucket the sentence declared
safe to replay, in the beat written to prevent that double-apply. Now split semantically, with
408 and 499 named as the 4xxs that only look safe.

**B4 -- event-driven called an unattended dead-letter topic "fully-preserved" at six months.** The
card is explicitly Kafka; Kafka's default retention is **seven days**. The question sets the
six-month horizon itself, in a shop the answer characterises as never having looked -- so a shop
that did not configure retention either. The paragraph half-knew it, conceding *"better
retention"* and *"a longer retention period"* two clauses away, and the same file makes the
retention-as-deletion-clock argument for SQS at `:1025` and advises a 14-day DLQ retention at
`:173`. The fix makes the beat **stronger**: nobody set the retention either, so the quarantine
has been quietly deleting the evidence, and the word "lost" becomes literal rather than rhetorical.

### 1.3 The nits folded (6), two of them load-bearing

- **debugging** -- the idempotency key offered as the escape hatch is the Model's *forward* fix,
  added **after** these 30,000 requests, so no dedup records exist for the pile. As written it
  implied retroactive cover, and it was the one route by which a candidate could reach a wrong
  answer *from the Model*. Now names the timing gap, which turns a soft edge into a point scored.
- **event-driven** -- a true requirement justified by the wrong mechanism: *"idempotent, because
  every healthy record that overtook it has already been processed"* is an **ordering** argument,
  and ordering is defended by a version check that discards, not by delivery dedup. This corpus
  teaches that split by name twice (`saga.md:1037` *"CAS gives you concurrency safety; an
  idempotency key gives you delivery safety"*; `event-driven.md:1070` *"discarded, not retried"*).
  Now names both, with the real reason idempotency is needed: the poison record half-executed.
- **load-balancing** -- *"about 0.3% at a million"* elides "per backend" one clause after
  establishing that unit, and the card's own headline scenario is a hundred backends and a million
  requests, i.e. 10,000 per backend, i.e. **3%**. A 10x misread, in the paragraph about people
  misquoting this result by a factor.
- **load-balancing** -- the same card's `Speak:` line, the sentence a candidate says **aloud**,
  still ended *"the max load drops exponentially"* -- the exact phrase the new Follow calls the
  misstatement. The new text is what made the card self-contradictory, so it is repaired here.
- **saga** -- one of two harm examples is defused by this topic's own central invariant:
  re-issuing a command that already ran is a no-op by construction (`:613`, keyed on
  `(saga_id, step_id)`), so a senior interviewer answers the card with the card. Swapped for
  hand-crafting an event to unstick a saga that was never stuck -- the Model's own vocabulary.
- **retries-timeouts** -- "latency floor" is a lower bound on the whole distribution and the claim
  holds only on the failure path; replaced with the mechanism. Plus `200 ms` -> `200ms`, the
  file's own convention at 43:1.

**Format.** All three new `Senior:` lines lacked the blank line before them, each breaking its own
file's local convention at 20:1. Fixed.

### 1.4 Examined and DECLINED, recorded so a re-check can push back cleanly

- `load-balancing:700` (compare pane) also says *"an exponential improvement"*, but it prints the
  formulas on either side, so the `m = n` regime is visible in the line itself, and it is a
  different pane the new text does not touch.
- `saga`'s card mixes ` -- ` and ` --- ` dash widths. **The new line is the one following house
  style**, so the correct resolution is normalising the legacy neighbours in a separate pass --
  never downgrading the new text to match. Flagged so nobody fixes it the wrong way.

---

## 2. Item 2 -- error-propagation's surviving Red Flag, localized

The flag read *"If a send fails, we just log it and move on"*, and **this topic has no send**: it
is a frontend / API / packager / external signing service pipeline. The template came from a
notifications topic; `saga.md` localized the same template and this one did not. Now *"If the
signing call fails..."*, with the tell in the topic's own actors -- the packager swallows the
signing service's code, so nothing crosses the boundary.

**A second defect surfaced while localizing, and it is the more serious one.** The fix paragraph
routed *"permanent surfaces to the user or a dead-letter queue"*, which **inverts this topic's own
rule**: it teaches *"fail fast to the user on permanent ones"* (`:538`) and reserves the
dead-letter for a **transient** that has exhausted its cap (`:191`). The flag was recommending the
opposite of the topic for permanent failures -- on a surface the cram sheet derives from. Now
`SIGNING_SERVICE_ERROR` into a capped retry with backoff, dead-letter or alert only once the cap
is spent; `SIGNING_KEY_NOT_FOUND` straight to the edge as an escalate action. Named codes follow
the sibling flag that already cites `PACKAGER_TIMEOUT`.

**Read-receipt:** flag at `error-propagation.md:891`; siblings at `:865-889` read for the local
convention (` -- ` separators, `*italics*`, no bold, tell-then-fix); `:191` and `:538` read for
the routing rule; `saga.md:835+` read as the donor.

---

## 3. Item 3 -- feature-flags' two semantic Class-H instances

**(a) The "instant" contradiction.** The topic says refusing to say "instantly" is *what separates
the levels*, and says it at four sites -- yet shipped **"an instant kill switch"** into the opener
item that `cram-derive.js` takes the **30-second answer** from, and into the **payoff one-liner**.
The opener even contradicted itself: its own `CLOSE` item already said *"contained in seconds"*.
Both now carry the bound (refresh window: seconds on a stream, up to the poll interval on a poll).
The **Spine** bullet's *"reverse instantly"* went with them -- same unqualified claim, no
correction in reach, and it is one of four headline bullets.

*Examined and deliberately left, with reasons:* the drill card at `:185` says "instantly" and is
corrected by its own **very next Follow** -- that adjacency is the lesson; the trade-off row's
hedged *"near-instant"* for streaming is accurate; the Red Flag's *"unilateral and instant"* is
the **governance** sense (no approval gate) and the same sentence explains it; the Model's *"teams
need to ... kill a bad change instantly"* frames a **requirement**, not a capability.

**(b) The pre-correction whiteboard steps.** Steps 1 and 2 stated the framings that steps 4 and 5
exist to fix, and the sheet prints all nine as equals with no marker for which is current. Step 1
asserted a hierarchy *"resolved most-specific-first"* where step 4 says specificity is *"authored
as an order, not inferred"*; step 2 asserted *"a consistent hash of the user id"*, which is
exactly the unsalted form step 5 calls the bug. Both rewritten to answer their own cue without
claiming what the later step corrects -- step 1 now establishes per-request evaluation against the
request's context, step 2 establishes hash-not-random stability -- leaving the exact order to step
4 and the salt to step 5. They now read **coarse-then-exact** instead of **myth-then-debunk**.

**DECLARED DEVIATION from the dispatch's literal wording**, which said to reword the *cues* to ask
rather than assert. Cues 1 and 2 are already questions -- *"How does a flag get its value?"* and
*"What keeps a percentage rollout stable?"* -- and assert nothing. The assertions are in the
**answers**, which is what the sweep entry itself describes, so that is what was changed.

---

## 4. Item 4 -- cdc's Class-J entry: FALSE POSITIVE, cdc unedited

The dispatch asked for an adjudication with evidence and said either outcome was valid. **The
finding does not reach its site, so `cdc.md` was not touched.**

The string *"without ever losing a change"* is at `cdc.md:1094` inside `### Frames`, where all
four bullets are quoted imperatives handed to the candidate -- *"Design a pipeline... without ever
losing a change."*, *"...Fix it."*, *"...Diagnose and redesign."*, *"...Walk me through it."* It is
an **interviewer's design brief**: the requirement the candidate must meet, which is the opposite
of a claim they volunteered.

That distinction is load-bearing for this class specifically. Class J is justified as *"the
highest-value class for interview outcome, because these are precisely the claims an interviewer
pushes on -- and the candidate has volunteered them."* An interviewer does not push back on their
own brief, so the finding's own rationale does not apply here. Nor does the file behave like one
that over-claims durability -- it carries at-least-once with idempotent consumers, the
transactional outbox, the mark-then-publish inversion, the partition-count break in per-key
ordering, and a whole curveball whose stated Task is *"Grant what's true, then locate precisely
where the guarantee stops."*

Supporting evidence corrected too: *"`acks` never mentioned"* holds for the Kafka producer setting
only -- the token appears at `:116` as an ordinary verb -- and `acks` is not the missing
precondition for a sentence that sets a requirement rather than making a claim.

**Erratum appended in place** at the end of `_audit/2026-07-20-content-catalog-sweep.md`, dated
and marked, rather than editing the finding: a sweep that quietly edits its own findings cannot be
audited. **Scope stated in the erratum so it is not over-read:** it corrects the second clause
ONLY; the first clause (per-key ordering vs a changing partition count) is **not adjudicated** and
stands, with a note that `:260` already carries the precondition while the Spine bullet at `:23`
does not, so it needs a per-site reading. Both clauses traced with `git log -S` to the original
authoring commit `d4e8527`, confirming neither was silently fixed by a later wave.

---

## 5. Item 5 -- ascii_guard widened to the corpus, the checks, tools, and the NUL class

**Measured before committing the widening, and the measurement is the finding.**

| scope | files | violations |
|---|---|---|
| `src/topics-md` (.md) | 38 | **0** -- the corpus was clean, exactly as three waves claimed |
| `src` (.js/.css/.html) | 686 | **0** -- includes `_generated/` compiler output |
| `test` (.py/.cjs/.mjs/.json) | 58 | **52** |
| `tools` (.py/.cjs/.mjs/.js/.json) | 25 | **7** |

So the prediction held precisely where the waves said it would, and **every violation was in the
tooling that had never been scanned** -- including the guard's own docstring and `syntax_check`'s.

**The NUL class was live, in build tooling.** `tools/compiler/mermaid.mjs:75` carried a raw NUL as
the separator in the mermaid SVG cache key (`id + '\0' + src`) -- a second, independent instance of
the class that hid in `test/` earlier this week. The old test was `ord(ch) > 0x7F` over a
**text-mode** read, which cannot see a NUL (ord 0) and translates newlines so CR could never be
reasoned about. It now reads **bytes** and bans `> 0x7E` (high bytes and DEL) plus `< 0x20` except
tab/LF/CR.

**Nothing scope-excluded; all 59 fixed by escaping.** Every fix is a source-encoding change with an
identical runtime value -- `'\u2014'` for a typed em-dash in the entity-decode table, `\u2192` in
two regexes, `'\u0000'` for the NUL, `--` for two docstring em-dashes. The NUL mattered most:
substituting any *different* separator would have changed every cache key and cache-missed all 46
diagrams.

**Proof the `tools/` edits are behaviour-preserving:** rebuilt after the change and the deliverable
came back **byte-identical** -- sha1 `0c4ba5c28daf9b73023e011796d74de120a31df3`, 12,040,254 bytes.
`parse_md.mjs:412` **emits** its arrow into the deliverable and mermaid's key feeds the SVG cache,
so a byte-identical rebuild is what proves both escapes exact rather than merely plausible.

**One guard added beyond the brief:** a scope entry matching **zero files is now a FAIL**. A guard
that silently scans nothing reports a green it did not earn, which is this repo's signature failure
mode.

**Watched red:** an em-dash planted in `test/`, a NUL in `test/`, a DEL in `src/topics-md/` -- the
guard reported exactly those three files at exact `line:col`, classified NUL / DEL / HIGH, exit 1;
PASS at 807 files on either side of the plant.

---

## 6. Item 6 -- gate crash forensics

`overlay_deadzone` once failed with a summary line consisting entirely of `Node.js v25.2.1`: the
tail of a crash dump whose exception, and the assertion that provoked it, had already scrolled
into a pipe nobody kept. The evidence needed to separate a flake from a defect is destroyed at the
moment it is needed, which leaves "re-run until green" as the only available move.

`report()` still prints one line, because a 58-row summary is only readable if each row is one
line. A **FAIL** now also spills stdout+stderr (plus command and exit code) to
`test/_last_fail_<name>.txt`, and the row says where to look. PASS behaviour is untouched with one
deliberate exception that is part of the point: **a check that stops failing DELETES its old
dump**, so a stale file can never be read as today's evidence. Wired at all three
`results.append` sites, including the browser-missing SKIP branch. Gitignored -- a stray untracked
file is what deferred `build_integrity`'s HEAD-match arm for three wave-B agents.

**Watched red**, against the real helper source with a synthetic node check that crashes the same
way:

```
synthetic_crash  FAIL  Node.js v25.2.1  (full output: test/_last_fail_synthetic_crash.txt)
synthetic_pass   PASS  synthetic_pass: 35/35 assertions PASS      <- no file written
```

and the dump recovered exactly what the old summary destroyed -- `Error: page.evaluate: Target
closed`, with its stack and the two stdout lines preceding it. Re-running the same name green then
deleted the dump.

**It paid for itself inside this wave.** A check invoked with a wrong filename died with `Node.js
v25.2.1` and nothing else; the full output named `MODULE_NOT_FOUND` instantly. That is the whole
argument in one incident.

---

## 7. Item 7 (optional) -- DEFERRED on measurement: the 13 do NOT collapse into one pattern

The escape condition in the brief was *"if the 13 collapse into the same per-item pattern"*. **They
do not**, and the evidence is a probe rather than an opinion.

**The inventory reproduces F6 exactly** -- 13 raw hits, 12 distinct rows, the same 10 topics --
which independently confirms F6's list. Probe preserved at
`_audit/2026-07-29-negative-figure-probe.mjs`, runnable as `node
_audit/2026-07-29-negative-figure-probe.mjs .` from the repo root. **Handing over a working
detector is worth more than the 13 edits**, because this class is structurally invisible to
`numbers_lattice` (the arithmetic subtracts, so the result is finite and `fmt` never sees a
non-finite value), and every fresh instrument built in this campaign had a bug on its first
attempt.

```
api-design          clear pagenum   "Rows wasted / sec (fleet)"  = ~-4,000
api-design          clear pagenum   "Wasted read bandwidth"      = ~-1 MB/s
autoscaling         clear percap    "Headroom buffer"            = ~-5,000 req/s   (x2 inputs)
backpressure        clear prod      "Overload (excess)"          = -1,000 /s
caching             clear hitRatio  "Latency vs no cache"        = -2% faster
consistency-models  clear n         "Write fault tolerance"      = -2 of 0 replicas
consistency-models  clear n         "Read fault tolerance"       = -2 of 0 replicas
distributed-locks   clear holders   "Last-in-queue wait"         = ~-5 s
distributed-locks   clear ttl       "Expiry headroom"            = -5 s before TTL
leader-election     clear nodes     "Tolerates"                  = -1 voter(s) down
load-balancing      clear capacity  "Instances you can lose"     = -5,994 of 6
microfrontend       clear apps      "The duplication tax"        = -260 KB wasted
```

**The triage -- three treatments, not one, and one probable non-defect:**

1. **`distributed-locks` "Expiry headroom" is very likely NOT a defect.** The row already carries
   `over: headroom <= 0`, so a negative headroom is a **deliberately surfaced danger state**, and
   the note explains it ("the lock must outlast the operation ... it can expire mid-operation").
   Clearing the TTL and being told your critical section runs 5s past a zero TTL is true and
   correctly flagged red. Guarding this row would **suppress a working warning**.
2. **`caching` "Latency vs no cache" needs a LABEL fix, not a guard.** `cut` already guards
   `src > 0`; at a 0% hit ratio the cache genuinely *is* slower, so the number is right and the
   **unit is wrong** -- it renders `-2%` under the unit `faster`. The sign belongs in the word.
3. **The remaining ~10 want a per-row input guard** to the corpus's own `n/a`.

**And the reason to be careful, which is the strongest argument for not rushing it:**
`load-balancing:850` **already has a guard** (`nOk ? ... : 'n/a'`). That guard fixed the
non-finite case and **created** this negative one -- `need` is computed against a flattened
divisor, so a cleared capacity yields `need = 6000` and `spare = -5994`. A second careless guard
can do the same thing again, and `numbers_lattice` cannot see it by construction. This family
should be fixed by someone who reads each `compute()` and decides the semantics per row, with the
probe above as the regression check -- not by pattern-matching ten guards in one sitting at the
end of a wave.

---

## 8. Receipts

**Commits** (6, on `content/residuals`, nothing pushed or merged):

```
6023a4a  test(ascii): widen ascii_guard to the corpus, the checks and tools -- and to the NUL class
4323c4c  test(gate): keep a failing check's FULL output instead of its last line
7d31d9c  content(residuals): localize error-propagation's last Red Flag; reconcile feature-flags' "instant"
9394cd0  docs(audit): erratum -- cdc's Class-J second clause is a FALSE POSITIVE; cdc unedited
c92e809  content(residuals): the COLD read of Wave E's ten exchanges -- 4 blocking defects, 6 nits
<freeze>  docs(audit): FREEZE -- the residuals wave
```

**Ratchets** -- all green:

| ratchet | freeze |
|---|---|
| `bank_pushback` | `{}`, **613 cards** -- unchanged, no card counts moved |
| `bank_novelty` | **826 exchanges**, longest shared run **8 < 9**, 826/826 kept |
| `cram_surface` | `{}`, mirror verified against `deriveCram` on all 46 |
| `cram_scope_distinct` | 46/46 distinct cram bodies, 46/46 distinct scope bodies |
| `topic_contract` | 46 topics conform |
| `numbers_lattice` | 46/46, its **one pre-existing allowlisted entry unmoved**; snapshot untouched |
| `ascii_guard` | **807 files** strict 7-bit (src 686, topics-md 38, test 58, tools 25) |

**Snapshot discipline.** `bank_novelty_snapshot.json` was refreshed with `--write-snapshot` and
committed **in the same commit as the content that moved it** -- exactly four Bank exchanges moved
(debugging, event-driven, saga, retries-timeouts), and the re-run after the refresh is clean at
826/826 kept. The other seven edits land outside the Bank (three drill Follows, a `Speak:` line, a
Whiteboard step, an Opener item, a Spine bullet) and correctly moved no snapshot entry.

**Gate:** see `_audit/2026-07-29-residuals-gate.txt` -- **58 rows**, and the row count is unchanged
because **no check was added**; the two modified checks keep their existing rows. The capture was
written **outside the repo** and copied in afterwards, so the gate ran against a clean tree and
`build_integrity`'s strongest arm -- "COMMITTED deliverable == fresh build of HEAD" -- could fire
rather than defer.

**A note on what a capture can and cannot record.** A capture can never contain the run of the
commit that contains it, so the gate was run at the **freeze commit itself**, on a clean tree,
and the capture is committed immediately after it in a docs-only commit. The last commit that
touches a build input is the cold-read commit `c92e809`; every commit after it touches `_audit/`
prose only, so the shipping artifact is frozen from `c92e809` onward and the capture is a valid
record of the artifact at the tip. The merge-train gate on merged master remains the run of
record.

---

## 9. What this wave does NOT claim

- **The cold read covers Wave E's ten exchanges, and nothing else.** It is not a corpus pass. The
  four blocking defects it found are an argument that other un-cold-read content may carry the
  same class of frame-level defect -- not evidence that it does.
- **The three cold readers agreed with me on every finding I acted on, which is not independence
  twice over.** I verified each against primary text, but I am the one who chose which findings to
  act on, and a reader who disagrees should re-read the three reports rather than this summary.
  That is the specific failure Wave E's section 9 records: a diagnosis published from a summary.
- **Item 7 is deferred, not assessed as low-value.** Two of the twelve rows will need a semantic
  judgment about whether a negative is meaningful, and one of them is probably not a defect at
  all. The probe makes the class detectable; it does not make the calls.
- **The erratum corrects one clause of one finding.** cdc's first Class-J clause stands
  un-adjudicated, and a reader should not take the erratum as clearing the entry.
- **`ascii_guard` now scans `src/topics/_generated/`**, which exists only after a build. Its file
  count therefore varies with build state -- the PASS line prints the per-scope counts so this is
  visible rather than implied. A fresh worktree scans 188 src files and still passes honestly.

---

**INDEX line:**

- [2026-07-29 -- Residuals: closing every recorded thread](2026-07-29-residuals.md) -- the wave that was meant to be bookkeeping and was not. **The campaign's one standing caveat was true:** Wave E's ten exchanges, read WARM twice and never cold, carry **four blocking defects** -- and the arithmetic was never the problem, it survived independent re-derivation entirely (32 KB, 1.6 GB, ~8x, 2.20, ~10,002, ~5,000x, 303.5, 3%/0.3%). The defects live in the *frame*, which is exactly what a warm reader cannot see: **devices-dispatch cited nginx's `ssl_buffer_size` as proof of a 32 KB/connection cost when it is the SEND buffer only, exists for time-to-first-byte, and nginx sets `SSL_MODE_RELEASE_BUFFERS` which releases those buffers on IDLE connections -- the card's own scenario**; the same card contradicted `real-time-delivery` (~10 KB/idle connection, tens-of-KB called the *careless* case) on one physical quantity, reconciled as untuned-vs-tuned; **debugging classified by status class in the card that exists to teach semantic classification** ("a 4xx genuinely did not happen") while its own tight-retry-loop storm manufactures nginx **499s** by the thousand, where the handler ran to completion after the caller hung up; and **event-driven called an unattended Kafka DLQ "fully-preserved" at six months against a seven-day default retention** -- fixed into the stronger claim, since nobody set the retention either and "lost" becomes literal. Six nits folded incl. two load-bearing ones (debugging's idempotency escape-hatch post-dates the 30,000 it claims to cover; event-driven justified idempotency with an ORDERING argument, a split this corpus names twice) and `replication`'s `R + W > N` cram-spine step, which asserted a partial write is *outside the overlap* while the file says four times it is **not rolled back and can surface later**. **Two of the findings the wave was sent to fix were themselves wrong:** cdc's Class-J entry is a FALSE POSITIVE -- *"without ever losing a change"* sits in `### Frames`, an **interviewer's design brief**, and Class J's own rationale is that the candidate *volunteered* the claim -- so cdc is unedited and a dated, scope-limited erratum was appended to the sweep instead; and F6's 13-row list needs triage before fixing, because `distributed-locks`' negative headroom is a **deliberately flagged danger state** (`over: headroom <= 0`) and `caching`'s `-2% faster` is a correct number with a wrong unit label. Item 2 found a second defect while localizing error-propagation's last Red Flag: its fix paragraph routed *permanent* failures to a dead-letter queue, **inverting the topic's own rule** (permanent fails fast; dead-letter is for an exhausted transient). `ascii_guard` widened to 807 files across four scopes with the NUL class added, **measured first**: the 38-file corpus came back clean exactly as three waves claimed, and all 59 violations were in never-scanned tooling -- including **a live raw NUL in `tools/compiler/mermaid.mjs`'s SVG cache key**, escaped rather than substituted because any other separator cache-misses all 46 diagrams, and proved behaviour-preserving by a **byte-identical rebuild**. A zero-file scope entry is now a FAIL. `check_all.py` keeps a failing check's full output (`test/_last_fail_<name>.txt`) instead of its last line -- and it paid for itself inside the wave, turning a bare `Node.js v25.2.1` into `MODULE_NOT_FOUND` instantly. Item 7 DEFERRED on measurement with a working detector handed over. Gate **58 rows, no check added**; ratchets all green, `bank_novelty` snapshot refreshed in the same commit as the 4 Bank exchanges that moved.


*(N1 closure, team-lead: the capture this section cites is committed as the MERGED-TREE run of record — master post-merge, build inputs identical to the branch tip since master had advanced by docs only. The builder's loop ended before its own capture commit; the bounce fixes were grep-verified by team-lead before the train.)*
