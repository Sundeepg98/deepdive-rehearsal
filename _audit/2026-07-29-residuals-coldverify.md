# Residuals wave — light COLD verify

**Verifier** wRes-verifier (independent of wR-fixer) | **subject** `content/residuals` @ `aecf058`, 6 commits off master `76ec701`
**Worktree** `D:/claude-workspace/_worktrees/deepdive-rehearsal/w10-resid` | **date** 2026-07-29

## VERDICT: CLEAN — no blocking defects. Three non-blocking findings; two of them are two-word edits.

Every claim in `_audit/2026-07-29-residuals.md` that I tested held, including the two most
load-bearing ones: the full gate is **58 rows, 58 PASS, 0 SKIP, 0 FAIL** at the tip with
`build_integrity`'s strongest arm firing, and both watched-reds re-fire on scratch copies with
the exact output the record quotes. The tree is exactly as I found it — clean, `aecf058`,
no stray files, nothing edited.

---

## 1. The five fixes, read as an interviewer — all engineering-TRUE and in-voice

**devices-dispatch (B1 + B2) — CLEAN, and the strongest fix in the wave.** The
`ssl_buffer_size` sentence is gone, not hedged. Its replacement is checkable and correct:
OpenSSL's own documentation for `SSL_MODE_RELEASE_BUFFERS` says it "can save around 34k per
idle SSL connection" — which is the read+write pair the card prices at 32 KB — and nginx does
set it unconditionally (`SSL_CTX_set_mode(ssl->ctx, SSL_MODE_RELEASE_BUFFERS)`), so "nginx
turns it on for you" is true. The untuned-vs-tuned reconciliation is the right one and I
verified both sides: `real-time-delivery.md:297` says "Tuned aggressively that lands around
**~10 KB per idle connection**" and calls tens-of-KB TLS state the case where you have been
"careless". Devices-dispatch now says tens-of-KB is the untuned number and names the mechanism
that "gets back toward ten kilobytes a socket". The two topics agree on the physical quantity
for the first time. The `memory` → `buffers` correction is also right — moving off
thread-per-connection genuinely did remove a large per-connection memory cost.

**debugging (B3) — CLEAN.** The split is now semantic and the vocabulary is the corpus's own:
`retries-timeouts.md:178` ends "The classification is **semantic**, not numeric," and the new
text opens on exactly that. 400/422 as "refused before it ran" matches :178's own reasoning
("A 400 or a 422 will not — the request is malformed"). The 499 case is unimpeachable: it is
nginx's client-closed-request code, and an app server that does not check for a cancelled
context routinely runs the handler to completion after the caller hangs up, so a tight retry
loop against tight client timeouts does manufacture outcome-unknown 4xxs in bulk. The
referent in the nit fix resolves: the Model at `debugging.md:1011` does ask for "idempotency
so retries are safe" as a **forward** fix, so "the key I asked for above went in after these
30,000" is accurate.

**event-driven (B4) — CLEAN on the correction itself.** Kafka's default retention really is
seven days (`log.retention.hours=168`), and the fix converts a false claim into a stronger
one. "Most of what was quarantined" understates the true ~96%, which is the safe direction.
The folded nit is also right and corpus-consistent: idempotency for the half-executed poison
record, a version check for the records that overtook it — the split `saga.md:1037` and
`event-driven.md:1070` both teach by name. (One residual, N2 below.)

**replication — CLEAN, and it fixes more than the record claims.** The old "outside the
overlap" was not merely imprecise, it was geometrically false: a partial write's replicas may
well be *inside* the read set. The new "outside the argument entirely — it was never rolled
back, so it can still surface on a later read as though it had succeeded" is near-verbatim
with the topic's own `:918`, and consistent with `:271`, `:634` and `:785`.

**error-propagation (item 2's bonus fix) — CLEAN, and I specifically checked it does not
invert something else. It does not.** The new routing matches both cited rules exactly:
`:191` sends an **exhausted transient** to "a dead-letter or alert", and the fix says
"reaching a dead-letter or an alert only once that cap is spent"; `:538` says "fail fast to
the user on permanent ones", and the fix sends `SIGNING_KEY_NOT_FOUND` "straight to the edge
as an escalate action". The code classifications are the topic's own — `SIGNING_SERVICE_ERROR`
is marked transient at `:140`, `:146`, `:444` (`# transient -> retry`), `:461` and `:813`;
`SIGNING_KEY_NOT_FOUND` permanent at the same sites. "escalate" is the topic's declared action
vocabulary (`:22`, `:33`, `:41` — "retry / fix / escalate"). The heading rename orphans
nothing: the only other "If a send fails" in the repo is
`src/topics/notifications/rf.js:44`, which is the donor topic that legitimately owns a send.

**Convention.** All 21 `Senior:` lines in each of the three touched files are now preceded by
a blank line (was 20 of 21), so the fix brought the new lines into the file's convention
rather than creating an exception.

## 2. The cdc erratum — CLEAN on all four criteria, and the adjudication is independently sound

Scope-limited (says "corrects one clause of one entry" in the header **and** carries an
explicit "Scope of this erratum, stated so it is not over-read" paragraph leaving the first
clause un-adjudicated); dated and attributed; a pure append — the diff is `@@ -422,3 +422,53
@@` with **zero deletions**, so the original finding at `:230` is untouched; and `cdc.md` has
an empty diffstat against master.

I re-derived the verdict rather than taking it. `cdc.md:1094` is the **first bullet** of
`### Frames`, and the block is four quoted imperatives handed to the candidate ("Design a
pipeline … without ever losing a change.", "… Fix it.", "… Diagnose and redesign."). The
Class-J rationale the erratum leans on is verbatim at sweep `:226` — "these are precisely the
claims an interviewer pushes on — and the candidate has volunteered them" — and it genuinely
does not reach an interviewer's own brief. The supporting correction is right too: `acks`
appears twice in the whole file, at `:116` as an ordinary verb. And the file does not behave
like one that over-claims durability — its "Exactly-once at the sink" curveball at `:1085`
teaches that Kafka EOS reintroduces the dual write at a non-transactional sink and that "the
consumer doesn't need to be idempotent" is never the right conclusion. **False positive
confirmed.**

## 3. Both watched-reds re-witnessed on scratch copies

Copied `src/`, `test/`, `tools/` out of the repo; the copy reproduced the baseline exactly
(**807 files: src 686, src/topics-md 38, test 58, tools 25**). Nothing was planted in the repo.

**ascii_guard** — planted an em-dash in `test/syntax_check.py`, a NUL in
`test/flow_contract.cjs`, a DEL in `src/topics-md/cdc.md`, at positions I computed in advance:

```
ASCII GUARD: FAIL  (5 non-ASCII byte(s) in 3 file(s))
  src/topics-md/cdc.md:1098:9      0x7F  DEL
  test/flow_contract.cjs:221:10    0x00  NUL
  test/syntax_check.py:29:9/10/11  0xE2 0x80 0x94  HIGH
```

Exact line:col match on all three, correct class on all three, exit 1; the em-dash correctly
reports as three HIGH bytes. **PASS at 807 on both sides of the plant.** The zero-file arm
also fires — hiding the 38 `.md` files yields `ASCII GUARD: FAIL (scope covers no files:
src/topics-md — a guard that scans nothing reports a green it did not earn)`, exit 1.

*(Methodology note: my first attempt planted the NUL into `ascii_guard.py` itself, which made
Python refuse to compile the guard. That is my error, not the guard's — and it still failed
loudly at exit 1 rather than reporting green.)*

**check_all crash forensics** — extracted the **real** `run`/`report`/`fail_dump` source from
`test/check_all.py` and drove it with a synthetic node check that crashes the same way:

```
synthetic_crash  FAIL  Node.js v25.2.1  (full output: test/_last_fail_synthetic_crash.txt)
synthetic_pass   PASS  synthetic_pass: 35/35 assertions PASS      <- no file written
```

Byte-for-byte the block the record quotes. The dump recovered everything the one-line summary
destroyed: `Error: page.evaluate: Target closed`, its full stack, **both** preceding stdout
lines, the command, and the exit code. Re-running the same name green **deleted** the stale
dump. The browser-missing SKIP branch (`fail_dump(name, None, 'SKIP')`) also deletes, and does
not crash on `r=None`. All three `results.append` sites are wired — I confirmed there are
exactly three in the file.

## 4. Mechanicals — all green

Full gate run **in the foreground at the tip, on a clean tree, capture written outside the
repo**: `GATE: PASS`, **58 rows, 58 PASS, 0 SKIP, 0 FAIL**. Capture at
`…/scratchpad/gate-tip.txt` (see N1 — the record's own capture is missing).

- `build_integrity`: **"COMMITTED deliverable == fresh build of HEAD"** — the strong arm
  FIRED, which is the deliverable-rebuild strong form. 12,042,598 bytes.
- Ratchets: `bank_pushback` `{}` / **613 cards**; `bank_novelty` **826** exchanges, longest
  shared run **8 < 9**, 826/826 kept; `cram_surface` `{}` mirror-verified against `deriveCram`
  on all 46; `cram_scope_distinct` 46/46 + 46/46; `topic_contract` 46; `numbers_lattice`
  46/46 with its **one** pre-existing entry allowlisted and unmoved; `ascii_guard` 807.
- **Snapshot discipline confirmed by commit, not by claim:** `test/bank_novelty_snapshot.json`
  moved in `c92e809` — the same commit as all four Bank files (debugging, event-driven, saga,
  retries-timeouts). Verified with per-file `git log`.
- **VR 16/16 by hash vs master:** `test/baselines` tree hash is
  `0762dad9d2a28359ee1ba632651adb835df344c9` at **both** `76ec701` and `aecf058` — byte-identical,
  zero churn — and the gate's VR run matched its committed pixels across all 18 roots.
- **Scope = the declared files.** Exactly 25 changed paths, every one mapping to a declared
  item. No strays.
- **Tools escapes proven exact, not plausible:** `'\u0000'.charCodeAt(0) === 0` and
  `'\u2192' === '→'`; `mermaid.mjs` at the tip has **0 NUL bytes and 0 high bytes**. Combined
  with the HEAD-match arm, behaviour preservation is proven at the tip.

## 5. Item 7 — the deferral is legitimate, on evidence

The detector exists, is **read-only** (no write calls), runs from the documented command, and
reproduces F6 exactly: **12 distinct rows, 13 raw hits, 10 topics**, matching the record's
table row for row. All three treatment claims verify in source:

- `distributed-locks` "Expiry headroom" carries `over: headroom <= 0` and a note explaining
  the danger — a **deliberately surfaced warning**. Guarding it would suppress a working
  alarm. Correctly identified as a probable non-defect.
- `caching` "Latency vs no cache" is `v: cut + '%', u: 'faster'` with `over: cut < 0`, and its
  own note says "**goes NEGATIVE if the lookup costs more than the miss saves**". The number is
  right and the unit is wrong. A label fix.
- `load-balancing` "Instances you can lose" already has `nOk ? … : 'n/a'` — a guard on the
  instance count that does **not** cover a cleared `capacity`, which is what produces
  `-5,994 of 6`. The record's warning that a careless second guard can repeat the mistake is
  well founded.

**The 13 do not collapse into one pattern.** Three treatments, one probable non-defect.
Deferral with a working detector was the right call.

---

## NON-BLOCKING findings

**N1 — the gate capture the record points at does not exist.** §8 says "see
`_audit/2026-07-29-residuals-gate.txt`" and describes it as "committed immediately after
[the freeze] in a docs-only commit" — but `aecf058` is the tip, and no such file exists at
HEAD or in the working tree. Every prior wave committed its capture
(`2026-07-29-wave-e-gate.txt`, `2026-07-28-chash-freeze-gate.txt`,
`2026-07-28-bank-omega-gate.txt`). The substance is fine — I re-ran the full gate at the tip
myself and it is 58/58, 0 SKIP — but a bookkeeping wave's own receipt is dangling. **Fix:**
commit a capture (mine is available) or correct the reference. One commit.

**N2 — event-driven's B4 fix leaves two clauses it now contradicts.** The paragraph
establishes that nobody set the retention and the seven-day default deleted the evidence, then
two sentences later still says "relocating the silence somewhere with **better retention**",
and closes on "quietly re-accepted with **a longer retention period**." A Kafka dead-letter
topic inherits the same seven-day default, and this topic's own `Senior:` line at `:178`
teaches "retention **sized to outlive the incident**" — so an unattended DLQ has neither
better nor longer retention. The record quotes both phrases as evidence the paragraph
"half-knew it", then does not touch them. This is the same standard the wave applied to
load-balancing's `Speak:` line, where it wrote "The new text is what made the card
self-contradictory, so it is repaired here." Non-blocking because the load-bearing correction
landed and both residuals read as rhetorical closers — but this is where a re-check pushes back.

**N3 — devices-dispatch's `Senior:` line still carries the unqualified number.** The body now
reads "tens of kilobytes per held connection **until someone has deliberately tuned it down**";
the `Senior:` line still says "the per-connection number is tens of kilobytes with TLS", flat.
That is the exact claim B2 found to contradict `real-time-delivery`. Same class as N2 and as
the load-balancing `Speak:` line the wave did fix. Mildest of the three — it is true of an
untuned bespoke tier, which is this card's scenario, and it is a compressed tell rather than a
claim made to an interviewer.

## Examined and NOT findings — recorded so a re-check can push back cleanly

- **debugging's 408.** Listing 408 among "the 4xxs that only look safe" sits in mild tension
  with `retries-timeouts.md:178`, which groups it with 429 as a clean retryable ("408 Request
  Timeout is a similar case"). I judged this defensible: the two answer different questions
  (will a re-send succeed, vs. did it already run), the operator bulk-replaying 30,000 logged
  errors cannot know which hop emitted the 408, and middlewares do surface processing
  deadlines as 408. The 499 half is unimpeachable and carries the sentence.
- **feature-flags Spine `:18` and cram `:908`** still describe a "most-specific-wins" override
  hierarchy — the framing whiteboard step 4 refines to "authored as an order, not inferred".
  Out of the declared scope, and coarse-but-not-wrong, unlike the old step 1 which named a
  full precedence chain ("user targeting beats tenant beats environment"). The step-1/step-2
  rewrites are correct and create no new contradiction with steps 4 and 5.
- **All four item-3 "instant" declines hold.** `:185`'s drill card is corrected by its own very
  next Follow at `:188` ("I'd refuse to say 'instantly'") and already carries "propagates in
  seconds"; `:667` is hedged "near-instant" for streaming; `:890` is explicitly the governance
  sense in the same sentence; `:950` frames a requirement. The three fixed sites (Spine `:17`,
  opener `:706`, payoff `:910`) are the cram-derived ones.

## Merge-train hazards for the team lead (mechanical, not defects)

1. `build_integrity` **DEFERS** its HEAD-match arm on *any* uncommitted path
   (`elif not tree_clean:`). **This verdict file is untracked in the main repo's `_audit/`** —
   commit it before the merge-train gate, as the twelve prior `*-coldverify.md` files are.
2. The main repo is **already dirty**: `_audit/2026-07-29-wave-e-coldverify-addendum.md` is
   modified and uncommitted on `master`. That alone will defer the strong arm on the merge-train
   run. Commit or restore it first.

**CLEAN → the final train can run.** N1 is worth one commit before it; N2 and N3 are content
polish that can ride this train or the next.
