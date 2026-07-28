# Wave B (Bank regeneration) -- COLD VERIFY

**2026-07-28. wB-verifier, dual charter (content quality + mechanical). Shares no context with
either builder.** Branches verified at their frozen tips:

- `content/bank-alpha` @ `c25101c` -- `D:/claude-workspace/_worktrees/deepdive-rehearsal/w7-bank1`
- `content/bank-omega` @ `862d645` -- `D:/claude-workspace/_worktrees/deepdive-rehearsal/w7-bank2`

Both off master `42bf6eb`. Both worktrees were clean on arrival and are clean on exit.

## VERDICT: CLEAN -- NOT BLOCKING. Merge alpha, then omega.

Every mechanical claim either builder made is verified true, several of them by an instrument
that disagrees with theirs. The content is genuinely good: I read 28 regenerated cards as a
senior interviewer and did not find a single one where the new `Int:` is answerable by re-reading
its `Model:`. Eight findings follow, all non-blocking; two of them are real unfixed Class-A
defects that the instrument cannot see, which is exactly the outcome the tool's own header
predicts and the reason this charter existed.

---

# CHARTER A -- CONTENT QUALITY

## A1. Sampled cards -- 28 read in full, all charter-named samples covered

Judged on the four tests: (a) is the new `Int:` genuinely unanswerable by re-reading its `Model:`;
(b) is the Model first-person senior prose that is true engineering; (c) is it in the topic's
voice; (d) does it push on the seam the Model opens rather than on trivia.

Donor register read first for calibration: idempotency's Bank in full (all 6 mock beats + 8 extra
curveballs), plus saga's FRAME/STRUCTURE/FAILURE/CLOSE/curveball cards. The donor's Int answers
run 63-206 content words and consistently open by *conceding then reframing*.

### developer-platform -- 8 curveball Ints (alpha). ALL PASS.

The headline Class-B case: eight of the topic's hardest scenarios previously ended on the
candidate's own monologue. The new Ints are the strongest set in the a-l half.

| card | my judgment |
|---|---|
| attribution | **Best-in-class.** Model asserts `application_name` as the cheap fix; Int asks whether that stamp is *evidence*. Correct and non-obvious: Postgres does not verify it, so it answers "who do I go ask" and not "prove it." The escalation to an off-box append-only trail, and then to RDS IAM moving the trust anchor to the database's own authN, is the genuinely senior move. Closing line is donor quality: *"an audit trail people over-trust is worse than one they know the limits of."* |
| open side door | Model licenses closing the doors after earning 70%; Int asks what happens to the 30% on day one. Payload is a real reframe -- *"non-adoption is a product signal, not laziness"* -- and the named missing lanes (`\copy`, long migration, `pg_dump`, hour-long interactive session) are exactly what a brokered query platform fails to serve. *"Instrument the bastion before you close it -- those logs are the best specification I will ever get"* is correct platform engineering. |
| premature | Model prices only time saved; Int catches that safety does not scale with headcount. The answer **concedes the correction and then holds the conclusion** on different ground -- a `SELECT`-only role is an afternoon of `GRANT`s and delivers the load-bearing half with no build. Separating *"what needs a privilege from what needs a product"* is the insight. |
| supply chain | **The sharpest attack in the set.** Model says the client verifies the signature; Int observes the client is the compromised thing. Valid, and the answer is precise: signing prevents the *first* malicious update, the one step where the attacker lacks execution; the trust anchor must live where the update cannot rewrite it (OS package chain, MDM bootstrap). *"Verifying yourself with a key you also ship is circular."* |
| override decay | Model says retune the threshold; Int asks how that differs from deleting the guard. Answer refuses the Goodhart move (tuning to a target override rate) and tunes against what the overridden queries *did*. Falsifiable self-test at the end: *"I changed the number and cannot say which queries changed sides, or why."* |
| knowledge rot | **Closest call of the eight, still passes.** The Model does name the *why* as what is left for prose, so the Int's premise is partly stated above it. But the Int is quoting the Model back at itself to expose a self-contradiction (the Model's own thesis is that prose rots), and the payload -- the why rots by **loss**, not drift, so attach it to the constrained thing: a comment at the tempting line, an ADR, a test named for the reason -- is nowhere in the Model. Legitimate senior move, not a defect. |
| ticket queue | Model prescribes the destination and is silent on how a saturated team gets there. Ranking by volume x handling time (not by annoyance) is the correct prioritization, and *"the rare tedious thing feels most worth automating and pays back least"* is a real trap. The escalation is the best part: if nobody funds three weeks against a two-hundred-hour recurring cost, *"the team is funded as a service desk, and no amount of internal cleverness fixes a mandate problem."* |
| platform as SPOF | Model asserts a documented break-glass path; Int asks what makes you think it works. *"An unexercised recovery path is a plan, not a capability."* The circular-dependency catch -- if break-glass authenticates through the same IdP whose outage took the platform down, you have rehearsed a fiction -- is the thing most designs miss. |

### saga SCALE + DESIGN (omega) -- the defective donors, judged extra hard. ALL PASS; best in the wave.

The poetry lands. These two cards were themselves Class A (`saga:SCALE:int` had 7 novel words,
the second-worst overlap in the corpus) and they are now the two best cards I read.

- **SCALE Model** leads on the **pivot** -- sort the three steps by reversibility, put the pivot
  immediately before the shipment, everything ahead compensatable and everything past retriable.
  That is the correct saga concept and it is the right lead, because it determines which
  compensations you have to write at all. The dual-write framing of the outbox and the
  "persist *about to dispatch* before dispatching" detail are both correct.
- **SCALE Int**: *"Every step is idempotent on `(saga_id, step_id)`. So where does `saga_id` itself
  come from -- and what stops one customer from starting two sagas for the same order?"* This is
  the ideal shape: quote the Model's own asserted mechanism, find the unstated precondition.
  Unanswerable from the Model, which never says where `saga_id` originates. The answer is exact --
  *"Two sagas for one order are each internally perfect... and they cheerfully reserve twice and
  charge twice, leaving a saga log that looks completely healthy from both sides"* -- and lands on
  *"a saga is itself an operation, so it needs exactly the treatment its own steps get, one level
  up. Miss it and you have built exactly-once steps inside an at-least-once workflow, which buys
  you a double charge with an immaculate audit trail."*
- **SCALE Int2** (added): orchestrator down for an hour. The Model covers crash-and-resume, never a
  sustained outage. The insight people miss is correctly identified: in-flight sagas are frozen
  mid-transaction holding reserved inventory *and the customer's money*, so *"an orchestrator
  outage is not a read-only outage -- it silently accumulates half-finished financial state that
  grows every minute it lasts."*
- **DESIGN Model** replaces step-counting with *"choreography for reactions, orchestration for
  transactions"* and says why step-counting fails (the two shapes look identical on day one).
- **DESIGN Int** asks where the line falls *inside one mixed flow*. Correct discriminator: *"does
  this step's failure have to change the outcome?"* The concrete failure mode is excellent --
  put loyalty points in the saga and a points-service outage compensates a parcel that already left.
- **DESIGN Int2** (added): versioning in-flight sagas. The sharpest clause -- *"Never renumber or
  reuse `step_id`s across versions -- they are idempotency keys, so a recycled id collides with a
  participant's stored claim from the old definition and a genuinely new step gets silently skipped
  as a duplicate"* -- ties straight back to the SCALE Model's own keying. The four exchanges are
  internally coherent as one argument, which is what these cards are supposed to be.

`saga:CURVEBALL/isolation` is a register-only change ("Sagas are ACD without the I"); its excellent
pre-existing Int is untouched. Per-file dash convention (` -- `) respected in all new saga content.

### rules-engine -- 7 curveballs + SCALE + DESIGN (omega). ALL PASS; best-executed topic in the wave.

- **DESIGN Int** is the meta-layer attack: *"Which changes require two approvers is itself
  configuration. What stops me from reclassifying a rule as low-stakes on my own?"* Unanswerable
  from a Model that governs the change but never the classification. The right answer is given:
  **derive** sensitivity from blast radius the actor does not control, so lying about the
  classification means lying about the scope being reviewed; terminate the recursion by protecting
  the root through CI/CD rather than the admin path; alarm on sensitivity being *lowered* only.
  *"Every control has a configuration, and if that configuration is not held to the same standard,
  the control is theatre."* This is also the Int wB2 rewrote after catching a collision with its own
  `emergency` curveball -- I confirm the collision was real and the replacement is different, better
  ground.
- **`the race`**: the Model raises the double-click variant parenthetically and drops it; the Int
  picks it up. *"A conditional write buys concurrency safety on a row, an identity constraint buys
  uniqueness of intent, and a four-eyes workflow needs both because it has both races."* The
  escalation -- two different people proposing conflicting changes, both properly approved, winner
  decided by whichever committed last, *"a fully audited trail in which every action was correct
  and the outcome was still arbitrary"* -- is excellent.
- **`emergency`**: *"You said it auto-reverts... N hours later your time-box turns it back on --
  while everyone is asleep. That's the same outage on a timer."* Genuinely excellent catch, and the
  resolution is correct: expiry may only move toward the safer state; a break-glass *disable* must
  escalate rather than re-enable. *"A safety mechanism whose own timeout can cause an incident is
  not a safety mechanism, it is a delayed one."*
- **`stale policy`**: catches the Model **overstating its own invariant** -- snapshotting at each
  worker's wakeup does not deliver "one cycle, one policy" when starts are staggered. Answer opens
  *"Caught, and it exposes that I stated the invariant more strongly than the mechanism delivers"*
  and fixes it properly by giving the cycle an identity. Backstop is right: refuse to aggregate
  across rule-set versions, so a mixed window degrades to "cannot be reported yet" rather than a
  confident wrong number.
- **`precedence`**: attacks the Model's own preferred option and lands against the topic's thesis
  (policy is data, engine is code) -- a hardcoded combiner relocates the most consequential decision
  into code that appears in no approval diff. *"Whenever a design resolves a conflict
  'automatically,' ask where the policy went. It never disappears; it moves."*
- **`dashboards`**, **`two accounts`**, **`expressiveness`**: all pass. `dashboards` is technically
  precise about Postgres (`REFRESH ... CONCURRENTLY` really is more expensive, builds-then-diffs,
  and requires a unique index) and correctly escalates to incremental maintenance from the
  state-transition stream the SCALE Int2 already established. `two accounts` goes a level deeper
  than the Model's "anomaly detection on the audit trail" by asking who can *write* to the trail --
  *"the tell that this has been thought about is whether anyone can name who is able to delete from
  it"* -- and closes honestly: *"this entire layer is detective, not preventive."*
- **SCALE Int** (cycle overrun) is correct on both failure directions (overlap -> duplicate
  non-idempotent actions; queue -> monotonic unbounded lag) and produces the honest latency figure.

### multi-tenant (omega) -- DESIGN + SCALE + `leak`. ALL PASS.

- **DESIGN Int** is the individual-vs-population gap: *"Your limits are per tenant, but the free
  tier has thousands of tenants... while every single free tenant stays inside its limit?"*
  Unanswerable from a Model that asserts per-tenant limits and stops there. Workload isolation over
  arithmetic, admission control with priority, and the correct naming of the trap: *"Uniform
  degradation is the failure people accidentally design: it is 'fair,' and it means your paying
  customer's SLA breaks at the same moment as your free users' experience."* The architectural
  honesty -- on a shared resource you can make the tail *unlikely*, not *bounded* -- is the real
  argument for a separate compute tier. Closing catch (limit tenant *creation*, since the free tier
  is the abuse surface) is a practitioner's detail.
- **SCALE Int** attacks the uniformity assumption density rests on. Technically the strongest
  content in the topic: planner selectivity spanning four orders of magnitude under a generic plan
  is the classic multi-tenant plan-instability incident, and *"an aggregate p99 across five thousand
  tenants is dominated by the biggest ones and tells you nothing about what the median tenant
  experiences"* is correct and load-bearing.
- **`leak` Int** -- *"You've moved enforcement into row-level security. Which connections in your
  system are *not* subject to it?"* -- is the **most technically precise card in the wave** and I
  checked every claim: Postgres RLS does not apply to a superuser, does not apply to the table owner
  without `ALTER TABLE ... FORCE ROW LEVEL SECURITY`, and `BYPASSRLS` roles skip it. The
  enumeration of which real connections run as those principals (migration user = owner, analytics,
  a job that inherited the migration role, admin console) is exactly right, as is the ORM raw-SQL
  escape hatch. Does not collide with the adjacent `RLS + pooling` curveball -- that one is the
  session-variable leak across pooled connections, and this Int explicitly stipulates the
  non-owner/FORCE case that one assumes. They compose.

### api-design (alpha) -- the two read-found fixes. BOTH PASS.

Both old Ints confirmed Class A against master: SCALE's *"what is the single most consequential
decision here?"* was answered by a bullet of its own Model, and DESIGN's *"why not just dedupe on a
natural business key?"* by the Model's own last clause.

- **SCALE Int** (how long do you run v1, and who decides): unanswerable, and the answer is real
  lifecycle engineering -- per-version-per-client usage metrics (*"I cannot deprecate what I cannot
  measure"*), a published policy so the timeline is contractual rather than a favour, `Deprecation`
  and `Sunset` headers in-band, staged brownouts, and the escalation that the retirement date is a
  business decision whose cost the engineer must make legible. See **N8** for a minor premise nit.
- **DESIGN Int** (a client that re-serializes its JSON): unanswerable from a Model that asserts
  fingerprinting and never says over what. *"A naive hash over raw bytes turns the safety check into
  an availability bug, and it fails exactly the well-behaved client that retries most."* Correct.
  See **N3** -- this answer's stated erring direction contradicts the donor.

### circuit-breaker (alpha) -- 4 expanded answers. ALL PASS. Genuine deepening, not padding.

These are the cards where the *question* was already good and only the answer was ~30-55 words.
Expanding rather than replacing was the right call (replacing a good question to satisfy a counter
would have been the Goodhart move), and each expansion goes into new territory:

- **FRAME Int2** adds that a breaker on a system with no timeouts is *"present, configured, green on
  the dashboard, and structurally incapable of firing"*; that the timeout is the only thing bounding
  the first wave before the breaker has samples; and that the timeout must be shorter than the
  caller's own deadline *"or I've built a system where my caller gives up before I do and I'm
  holding a thread for a response nobody will read."* Ends with a real position: if forced to one,
  keep the timeout.
- **STRUCTURE Int** generalizes correctly: *"lazy evaluation is an implementation detail that leaks
  into behaviour, and it leaks in inverse proportion to traffic -- so a breaker's semantics are not
  actually the same on your busiest and quietest dependencies, even with identical configuration."*
  The low-traffic examples (nightly batch, monthly billing, twice-weekly admin action) are the right
  ones, and *"that call is often the one a human is watching"* is the operational sting.
- **SCALE Int** (replaced, not expanded) inverts perspective: *"From the failing dependency's point
  of view, is a breaker actually good news?"* Unanswerable from a caller-side Model. Two genuinely
  non-obvious harms: recovery is invisible to the dependency (*"its owners can be staring at green
  graphs during an outage that is entirely about them"*), and the return is synchronised. *"'All my
  callers have given up on me' is the single most useful signal that service could have, and it is
  the one thing its own metrics structurally cannot tell it."*
- **FAILURE Int2** argues bulkhead-over-breaker on **timing**: a breaker is statistical and needs a
  quorum of samples, so it is late by construction, and the pool was gone in seconds; a bulkhead
  needs no samples. Correct, with the right root-cause reframe (a non-critical feature could consume
  a resource the critical path depends on) and an honest coda that you still want both.
- **CURVEBALL/flapping Int** adds alerting on the transition *rate* rather than the state, and
  shadow-running a new breaker for a week against real traffic. *"A breaker is a control system
  tuned against a signal, so the tuning has to be validated against the signal's actual
  distribution."*

### consistency-models (alpha) -- the third read-found fix. PASSES.

- **SCALE Int** (a US user pays an EU user -- which region owns a two-authority transaction) is
  unanswerable from a Model that only localizes single-account authority, and the 2PC-vs-saga
  reasoning is correct, including *"2PC on a payment path builds a system whose throughput is capped
  by the speed of light and whose availability is the product of two regions'."*
- **DESIGN Int** (where the LSN physically lives between the write response and the next read) is
  the question that decides buildability. The clamping catch is real: an unbounded client-supplied
  LSN *"is a cheap way for a client to accidentally take down my read scaling."*

## A2. THE PARAPHRASE HUNT -- 2 real defects found, both unflagged, both quantified

**Confirmed: a green `bank_pushback` is not evidence the class is gone.** I first ran the obvious
heuristic -- grep the merged-equivalent corpus for "summarize your own Model" question shapes
(`what's the single most`, `the biggest hidden cost`, `what saves you`, `what's the real cost`).
It returned **one** hit, and that one was a legitimate diagnostic. The builders removed that tell
comprehensively. So the shapes are gone; the *class* is not.

Method that worked: the tool's own `novelty` rule (functions copied verbatim from
`test/bank_pushback.cjs` lines 151-182) driven over the merged-equivalent corpus -- alpha's a-l
markdown plus omega's m-z markdown, 692 Int exchanges across 38 topics -- ranked by total content
words, on the reasoning that the donor register runs 63-206 and anything far below that is worth
reading. Then read the candidates.

### N1 (finding) -- `distributed-locks` SCALE Int is Class A. Unflagged, unfixed, on the merged tree.

```
Model: ... For a correctness-critical run (billing) use a consensus store (etcd/ZooKeeper) so the
       lock survives failover, and -- because the run writes an external resource -- a FENCING
       TOKEN so a paused instance can't double-run its side effects.
       [and earlier] make the run IDEMPOTENT (dedup by a run-id under a unique constraint...)
Int:   Two instances both acquire (the first was paused past the TTL). What saves you?
       The fencing token or the idempotency key -- not the lock. ...
```

The Model names both remedies; the Int asks which one saves you; the answer is both, by name. A
candidate who re-reads the Model above has already been told this. **Measured novelty = 29** (44
content words, 34% overlap) -- comfortably above `NOVEL_MAX = 20`, so `thin_int` is silent, exactly
as the tool's header says it will be for fresh-vocabulary restatement.

What makes this a strong finding rather than a quibble: it is the **exact twin** of a card alpha
*did* fix. Alpha's freeze 4.2 records `leader-election STRUCTURE` -- *"two instances both think
they're the leader -- what saves you?"* answered by *"fencing token", one line above*. Same
phrasing, same remedy, same seam. One twin was flagged and fixed; the other was not flagged and
survives. The sweep named distributed-locks for Class A; the prepass records that it *"does not
fire at all"* and treats that as the measurement correcting the reader. On this card the reader
was right.

### N2 (finding) -- `circuit-breaker` CURVEBALL/recovery Int is Class A. Unflagged; sits inside the kept-Int population alpha measured.

```
Model: ... The fix mirrors retry jitter: (1) keep the half-open probe small, (2) jitter the
       cooldown so instances don't all probe at the same instant, and (3) RAMP TRAFFIC UP
       GRADUALLY AFTER CLOSING rather than resuming 100% at once ...
Int:   You jittered the cooldown and it still flaps. What did you miss?
       The close. ... The missing piece is a ramped admission rate on the way back, not just a
       staggered probe.
```

The Model ships a three-item fix list. The Int posits you did item 2 and asks what you missed. The
answer is item 3, stated verbatim one line above. **Measured novelty = 30** (42 content words, 29%
overlap) -- silent.

This one is pointed for a second reason: alpha **rewrote this Model** (register fix, freeze 4.4)
and kept the Int, so the card sits squarely in the 22-pair kept-Int population alpha measured in
5b. That measurement asked the right question of the wrong axis -- novelty did not cross the floor,
so the pair passed, while the defect it actually carries is one novelty cannot see. It is
pre-existing, not introduced.

Neither N1 nor N2 was introduced by this wave and neither is a regression. Both are the documented
blind spot, observed in the wild, and both are one-card fixes.

### Regenerated cards: zero paraphrase defects found

I specifically looked for a builder's new Int restating its own new Model in fresh words across all
28 sampled cards. There are none. The new Ints consistently *go past* their Models rather than
around them, and several explicitly concede a point the Model made before extending it -- the donor
register's move. The three read-found fixes (api-design SCALE, api-design DESIGN,
consistency-models SCALE) are verified good in their new form.

## A3. INT2 COLLATERAL -- 6 pairs checked by reading. Zero damage.

The hazard both builders raised: rewriting a Model can silently degrade a good pre-existing Int/Int2
beneath it. Alpha measured 22 pairs and found no floor crossings; omega caught and fixed one live
instance mid-wave. Novelty cannot see semantic degradation, so I read them.

| pair | verdict |
|---|---|
| **api-design DESIGN Int2** (alpha's named closest call) | **Intact.** The new Model does now pre-state that the claim is atomic and one of two duplicates wins. But the Int2's value is downstream: what the **loser** receives (409 vs wait-and-replay), the `in_progress` state people forget, and the wedged-key lease when the winner dies mid-flight. None of that is in the Model. Alpha's own judgment on this card is correct, and its reasoning -- a Model that declined to say the claim is atomic would be a worse Model -- is the right standard. |
| **event-driven SCALE Int2** (alpha's largest drop, 106 -> 80) | **Intact.** The Int2's payload is the 3-billion-key arithmetic and the 7-day TTL question. The new Model does Little's Law sizing and names the dedup lookup as a standing cost; it contains neither the arithmetic nor the TTL. The overlap is shared vocabulary, as alpha argued. |
| **leader-election FAILURE Int2** (68 -> 53) | **Intact, closest of the six.** The new Model does now name the availability-versus-durability axis ("promoting a lagging async replica means accepting bounded data loss"). The Int2 adds the cross-region dimension and forces a decision under a constraint the Model does not consider. Naming an axis is not answering the question; and by the same standard alpha applied to api-design, a Model that declined to name it would be worse. |
| **sharding-strategies DESIGN Int2** (omega's self-caught case, 58 -> 44) | **Intact.** The shipped Model establishes dual-write-then-backfill and idempotent batches but does *not* state the live-write/copy ordering guarantee the Int2 exists to elicit. omega's mid-wave rewrite of its first draft evidently worked. |
| **multi-tenant SCALE Int2** | **Intact.** The Int2 argues cells over database-per-tenant for containment; the new Model never mentions cells at all. |
| **consistency-models DESIGN Int2** | **Intact.** The Int2's payload -- lag is a distribution that moves, plus structural returns (a new read path bypassing the helper, a second device), plus carrying the LSN with the *user* not the device -- is absent from the Model, which only says keep the window comfortably longer than typical lag. |

## A4. real-time-delivery -- CLEARED, confirmed independently. omega's call is right.

The sweep places it in Class B; omega judged it clean; the tool agreed by omission. Three lists now.

**Mechanically:** all 8 Extra Curveballs (`Persist vs push`, `thundering-herd`, `the-port-myth`,
`cswsh`, `slow-consumer`, `lossy-bus`, `ordering`, `presence-storm`) carry an `Int:`, as do all
mock beats -- 13 `Int:` lines in the Bank. There is no missing-Int anywhere. Class B does not apply.

**By reading:** I read `lossy-bus` and `presence-storm` in full and both are top-tier.
`lossy-bus`'s Int -- *"why not just replace Redis Pub/Sub with Kafka as the backplane and get
durability for free?"* -- is unanswerable from a Model that says use a durable log but never says
why Kafka cannot be the *router*; the answer is correct on partition cardinality (you cannot create
a Kafka topic per chat room; a gateway would have to consume whole partitions and filter locally,
so its inbound bandwidth grows with total system traffic rather than its own subscribers').
`presence-storm`'s Int does the arithmetic the Model skipped -- 5M connections at a 30s heartbeat is
~167k writes/s -- and the batching/decoupling/sharding fixes are correctly ordered by leverage.

The sweep's own complaint about this topic was the different, weaker "Models re-run drills" defect,
which is not this wave. **No work was needed and none was done. Confirmed.**

## A5. THE SURVIVOR -- consistent-hashing. Deferral justified; premise confirmed by two instruments.

**The 33 entries are all genuinely that topic.** Parsed `test/bank_pushback_debt.json` at alpha's
tip: 107 non-meta keys, of which `consistent-hashing` = 33. Full composition in B2 below.

**The premise -- a whole never-refreshed bank, not two templated cards -- is confirmed twice.**

1. *Measured:* of the 692 Int exchanges in the merged-equivalent corpus, the **18 shortest answers
   are all consistent-hashing**, spanning FRAME, STRUCTURE, SCALE, DESIGN, CLOSE and eight
   curveballs. The next shortest non-survivor answer appears only at rank 19. Nothing else in the
   corpus sits near this floor.
2. *Read:* I spot-read SCALE and DESIGN. All four exchanges restate their Models near-verbatim:

   - SCALE `Int` *"what's the single biggest reason not to use modulo here?"* -> *"A node change
     remaps nearly all keys"*. Model's first clause: *"modulo would remap nearly all keys on any
     node change (a miss storm)"*.
   - SCALE `Int2` *"you scale in by one node and the database falls over. Why?"* -> Model already
     says *"a scale-in is a planned miss storm. The departing node's ~K/N keys all miss at once and
     fall through to the origin simultaneously."*
   - DESIGN `Int` *"how does the ring give you replication for free?"* -> Model already says
     *"replicas are the next R distinct physical nodes clockwise."*
   - DESIGN `Int2` *"what's the bug in 'the next R nodes clockwise'?"* -> Model's own parenthesis:
     *"(skipping vnodes on the same machine, ideally distinct racks/AZs)."*

   Note the Models themselves carry real content (the planned-miss-storm point, sloppy quorum,
   hinted handoff, partition-key-vs-clustering-column). It is the *Ints* that never got written.
   Alpha's judgment that fixing this needs the whole topic's argument held in mind at once --
   ring, vnodes, replication, hot keys, rebalancing are one connected argument -- is correct, and
   doing it fast at the end of a wave would have shipped this wave's own defect wearing a green
   ratchet.

**Deferral loudness:** loud in `_audit/2026-07-28-bank-prepass.md` section 4 item 4 (an explicit
SCOPE DECISION) and in alpha's freeze section 7 (a dedicated section) plus its section 3 ratchet
table and section 8 handoff. **Absent from omega's freeze report entirely** -- see N6. Adequate
overall, since the prepass is the wave's definitive cross-half scope document.

---

# CHARTER B -- MECHANICAL

## B1. Tool teeth, re-witnessed independently (charter item 6)

All arms run by me, on alpha's tip or on an isolated scratch mirror at
`%TEMP%/.../scratchpad/mirror` (tool + debt JSON + `src/topics-md` + the 8 hand-coded topic dirs;
`ROOT = __dirname/..`, so the mirror is self-contained). **No source edits, no plants in either
worktree.**

| arm | expected | observed | verdict |
|---|---|---|---|
| clean run, alpha tip | PASS, 107 allowlisted | `PASS (46 topics, 613 cards, 107 known pushback defect(s) allowlisted across 14 topics)`; 797 Int exchanges | **CONFIRMED** |
| `--plant` | exactly 4 new, one per class | exactly 4: `authz [register_lc]`, `iac [no_int2]`, `notifications [thin_int]`, `signing [no_int]` -- each in a topic carrying none, each with a distinct diagnostic; 111 live = 107 + 4 | **CONFIRMED** |
| `NOVEL_MAX` 20 -> 60 | donor anchor fires, run aborts | exit 1; `thin+ANCHOR-ceiling-idempotency: expected SILENCE, got FIRE (51 novel words)` plus the paired control; *"no corpus measurement was attempted"* | **CONFIRMED** |
| `NOVEL_MAX` 20 -> 4 | named-defect anchor goes silent, run aborts | exit 1, run aborts -- but via `thin+PAIR-restatement-fires`, **not** the floor anchor. See **N4** | **GUARANTEE HOLDS, report imprecise** |
| coverage arm (`_generated/` absent) | coverage failures naming the shortfall, never a confident small green | exit 1; `39 COVERAGE failure(s) -- this check did not measure the whole corpus, so its verdict means nothing`; `FAIL (39 coverage, 0 new, 107 stale; 0 live findings across 0/8 topics)` | **CONFIRMED** |

The coverage arm is the one I most wanted to see fail correctly, because a false-clean 8-topic run
is precisely the "check that cannot fail" this repo has shipped before. It refuses to give a
verdict at all rather than giving a small true one. Correct design.

One arithmetic cross-check while I was in there: the prepass measured 777 Int exchanges at master;
alpha's tip measures 797. That is +20, exactly alpha's 18 new Ints (the `no_int` class) plus its 2
new `Int2`s. The arithmetic closes.

## B2. Ratchet arithmetic across branches (charter item 7)

`test/bank_pushback_debt.json` at alpha's tip -- **107 non-meta keys**, parsed, grouped by topic:

```
consistent-hashing 33   <- the survivor, all a-l
rules-engine       12       replication         8       saga                7
storage-engines     7       multi-tenant        6       rate-limiting       6
stream-batch-proc   6       sharding-strategies 5       slos                5
soft-delete         5       state-machine       5       observability       1
probabilistic-str   1
```

- `33 + 74 = 107`. The 74 sum exactly over **13 topics, every one of them m-z** -- and that set is
  identical to omega's 13 touched files. **Zero a-l entries survive except consistent-hashing**,
  confirming alpha's claim that its half carries exactly one survivor topic and nothing else.
- Alpha's 170 -> 107 ratchet is therefore internally consistent: 170 - 63 fixed = 107, where the
  107 decomposes as omega's 74 (untouched by alpha, cleared on omega's own branch) + 33 deferred.
- omega's receipts were measured against alpha's snapshot (74 stale, 96 remaining, all a-l). I did
  not re-run omega's tool-from-blob procedure; the composition above independently corroborates it,
  since the 74 that omega cleared are exactly the 74 non-consistent-hashing entries in alpha's
  baseline and every one is in omega's file set.

### POST-MERGE INVARIANT for team-lead

After merging both and regenerating with `node test/bank_pushback.cjs --write-debt` on the merged
tree, the baseline must contain **exactly 33 entries, every key prefixed `consistent-hashing:`**.
Any other count, or any non-`consistent-hashing` key, means something regressed in the merge.
A clean run should then print `PASS (46 topics, 613 cards, 33 known pushback defect(s) allowlisted
across 1 topic)`.

## B3. Gates -- full gate run by me on each frozen tip, serial, AST-reconciled (charter item 8)

Not grep. `test/check_all.py` parsed with Python's `ast`, walking every `For` whose iterable is a
list of tuples and taking each tuple's first string constant, then set-diffed against the result
rows in my own capture file.

| | alpha `c25101c` | omega `862d645` |
|---|---|---|
| registered (AST) | **57** (0 duplicates) | **56** (0 duplicates) |
| reported rows | **57** | **56** |
| `registered - reported` | EMPTY SET | EMPTY SET |
| `reported - registered` | EMPTY SET | EMPTY SET |
| non-PASS rows | **NONE** | **NONE** |
| capture verdict | `GATE: PASS`, `EXIT=0` | `GATE: PASS`, `EXIT=0` |

Master's `check_all.py` registers **56** by the same AST parse, so alpha adds exactly one row
(`bank_pushback`) and omega adds none. Both builders' counts are correct, and **0 SKIP on both** --
no browser-gated check bought a green it did not earn. Both gates were run in the foreground,
serially, one branch at a time; no re-run was needed on either.

Captures preserved at `%TEMP%/.../scratchpad/gate_alpha.txt` and `gate_omega.txt` (moved out of the
worktrees so both trees are left exactly as found).

## B4. VR and build integrity per branch (charter item 9)

**VR baselines -- byte-identical, proven at the git level rather than by the check's own verdict.**
`test/baselines/` holds 18 tracked files: **16 PNG baselines** plus `manifest.json` and `README.md`.

- `git diff --stat 42bf6eb..c25101c -- test/baselines/` -> empty. Same for omega. Zero churn.
- The git tree-hash of the whole `test/baselines/` index entry set is **identical across master,
  alpha and omega** (`a4ca513d898dbacd`). Not "VR passed" -- the committed pixels are literally the
  same bytes on all three.
- Both gates independently report `visual_regression PASS (16 baselines, win32-chromium149; ...
  matched its committed pixels)`. Correct and expected: Bank content renders inside the mock
  overlay, which is not captured at rest, so 73 regenerated cards moved no pixel. This is also a
  useful negative control -- a moved baseline would have meant a Bank edit leaked into a surface it
  has no business touching.

**Deliverable == fresh rebuild of HEAD -- and this arm did NOT run during either gate.**
`build_integrity` assertion (3) is exactly this check, and on both my gate runs it reported
`HEAD-match DEFERRED -- 1 uncommitted path(s)` because of my own capture file sitting untracked in
the tree. Alpha's committed freeze shows the same deferral for its capture file. **A deferred
assertion is not a passed one**, so I moved my capture files out, confirmed `git status --short`
was empty on each tree, and re-ran `build_integrity` alone:

```
alpha:  BUILD INTEGRITY: PASS  (11873438 bytes, 0 unresolved, 9 panes + 7 overlays,
                                build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
omega:  BUILD INTEGRITY: PASS  (11908508 bytes, 0 unresolved, 9 panes + 7 overlays,
                                build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
```

Both **CONFIRMED**, and `git status` was empty again after each full rebuild -- so the build is
reproducible on this box and the committed bytes are a faithful build of the committed source on
both branches.

## B5. Scope (charter item 10) -- both branches in scope, diff-stat verified

**alpha** (20 files): 12 a-l topic markdown sources + `src/topics/eav/bank.js` (the hand-coded
slice) + `test/bank_pushback.cjs` (new, 635 lines) + `test/bank_pushback_debt.json` (new) +
`test/check_all.py` (+27/-0, the single registration) + the deliverable + 3 docs
(`_audit/2026-07-28-bank-alpha.md`, `-prepass.md`, `_audit/INDEX.md`). In scope.

**omega** (16 files): exactly **13** m-z topic markdown sources + the deliverable + 2 docs
(freeze report + its gate capture). **Zero `test/` paths** -- confirming omega's claim that wB1's
tool was run from its blob and never committed here. In scope.

The two topic-source sets are disjoint. `entity_leak` passed on both gates, which is the check that
matters for the eav edit's HTML-entity convention.

## B6. Merge mechanics -- simulated non-destructively

`git merge-tree --write-tree content/bank-alpha content/bank-omega` -> **exit 0, zero conflicts**,
merged tree `9a3170f`.

Deliverable blob sizes:

```
master   11,798,102
alpha    11,873,438   (delta +75,336)
omega    11,908,508   (delta +110,406)
merged   11,983,844   = 11,798,102 + 75,336 + 110,406  EXACTLY
```

The deltas compose additively with zero overlap, which is independent evidence that the two
branches' deliverable edits touch genuinely disjoint byte regions -- as the disjoint a-l / m-z topic
split predicts. See **N5**: alpha's prediction that the debt JSON would be "the sole deliverable
conflict" is wrong in the harmless direction. There are no conflicts at all, and the debt JSON
*cannot* conflict, because omega branched before it existed and never touched it.

Still rebuild rather than trust the text merge: a 3-way text merge of a generated 11.9MB bundle can
be syntactically valid and semantically wrong, and nobody reviews it. The rebuild is cheap and
`build_integrity` proves it.

---

# FINDINGS -- 8, all NON-BLOCKING

Ordered by what I would act on first.

**N1. `distributed-locks` SCALE Int is an unfixed Class-A defect.** Novelty 29, so `thin_int` is
silent. Its answer names the two remedies its own Model already named. It is the exact twin of the
`leader-election STRUCTURE` card alpha fixed. *Recommend:* fold into the consistent-hashing wave --
it is a one-card fix and that wave will already be in this file's neighbourhood. Details in A2.

**N2. `circuit-breaker` CURVEBALL/recovery Int is an unfixed Class-A defect.** Novelty 30, silent.
The Model's three-item fix list contains the answer; the Int asks "you did item 2, what did you
miss?" and the answer is item 3. Sits inside the kept-Int population alpha measured, which is the
useful lesson: that measurement used novelty, and novelty is the one axis that cannot see this.
*Recommend:* same wave as N1.

**N3. The wave introduced a cross-topic contradiction with its own donor.** api-design DESIGN's new
Int concludes *"if I have to err, I err toward comparing fewer fields... Comparing the whole body
feels safer and is mostly a way to reject your own retries."* The idempotency donor's `Same key,
new body` Int2 concludes the opposite on the same tiebreak: *"you err toward including a field when
in doubt, because a false 4xx is a visible, debuggable failure the client can act on, whereas a
false replay is a silent one... Fail loud on ambiguity, never silent."* Both agree on excluding
transport noise, so the engineering is reconcilable, but the stated erring direction is opposite and
each frames it explicitly as the tiebreak. Notable because the contradicted card is the wave's own
exemplar. *Recommend:* one-clause edit, Class D/E wave -- the same lane wB2 correctly used to defer
`replication` DESIGN's semi-sync recommendation. Not merge-blocking: the two cards are in different
topics and a candidate rarely reads both in one session.

**N4. The self-test's anchor numbers in the docs are off, and the downward-drift guard is a
different fixture than claimed.** Measured with the tool's own rule: the FLOOR anchor
(`ANCHOR_BAD_*`, soft-delete DESIGN) has **novelty 4**, not 5 as alpha's freeze 1.1 and the tool's
own header state; the CEILING anchor (`ANCHOR_GOOD_*`, idempotency SCALE Int2) has **novelty 51**,
not 48. Consequence: at `NOVEL_MAX = 4` the condition is `4 > 4` -> false, so the floor anchor
**still fires** and the abort is actually delivered by `thin+PAIR-restatement-fires`. The guarantee
is intact -- drift in both directions aborts the run, which is what matters -- but the report names
the wrong guard, and the bracket is `[4, 51]` for the shipped fixtures rather than the documented
`11 -> 48`. *Recommend:* correct the two numbers in the header and freeze report. Worth doing
because "the number in the doc is not the number in the code" is a failure mode this repo has paid
for before.

**N5. Alpha's merge-conflict prediction is wrong (harmlessly).** Freeze section 8 says the debt JSON
is "the sole deliverable conflict." `git merge-tree` shows zero conflicts anywhere, and the debt
JSON cannot conflict since omega never had the file. No action; noted so team-lead does not go
looking for a conflict resolution that has no work in it.

**N6. omega's freeze report never mentions consistent-hashing.** The 33-finding survivor is loud in
the prepass and in alpha's report but absent from omega's, so a reader of omega alone would not
learn that 33 findings survive the wave. Defensible -- consistent-hashing is a-l, not omega's half
-- and the prepass is the cross-half scope document. *Recommend:* carry the survivor into the merge
commit message or `_audit/INDEX.md` so it cannot be lost between reports.

**N7. Minor intra-topic redundancy in circuit-breaker.** "A breaker needs a minimum volume over a
window, so by construction it is late" now appears in both FRAME Int2 and FAILURE Int2. They drive
different conclusions (build the timeout first; the bulkhead beats the breaker here), so this reads
as a recurring principle rather than a burned slot. No action recommended; recorded only so a future
reader does not think it was missed.

**N8. api-design SCALE's Int premise no longer has an anchor in its own Model.** The Int opens *"You
version in the URL only when you break"*, but the rewritten Model dropped the old
`design for evolution (additive change, tolerant reader, URL versioning only to break, deprecation
policy)` clause entirely. An interviewer supplying a standard premise is legitimate and the content
moved into the exchange rather than being lost -- arguably an improvement over a bullet in a list --
but the premise now references a position the card does not state. *Recommend:* optional one-clause
restoration to the Model. Lowest priority here.

---

# WHAT I CHANGED: NOTHING

No source edits, no commits, no pushes, no merges, no stashes, no `npm install`/`ci`. Plants and
threshold drift ran only on a scratch mirror outside both repos. Two capture files I created in the
worktrees have been moved to the scratchpad; `git status --short` is **empty on both worktrees and
on master**, and no `_TEAM_LEAD_*.md` was present at any hold boundary. `npm run build` was run once
per branch as part of `build_integrity` and left both trees clean, which is itself the receipt.

# MERGE GUIDANCE

Cleared to merge alpha, then omega. On the merged tree, in order:

1. Rebuild the deliverable (`npm run build`) rather than trusting the text merge -- expect
   **11,983,844 bytes**; commit `src/` and the rebuilt deliverable together.
2. `node test/bank_pushback.cjs --write-debt` -> the baseline must be **exactly 33 entries, all
   `consistent-hashing:`**. A clean run then prints `33 known pushback defect(s) ... across 1 topic`.
3. Full `python3 test/check_all.py` on the merged tree -- expect **57 rows, 57 PASS, 0 SKIP**, and
   confirm `build_integrity` reports `COMMITTED deliverable == fresh build of HEAD` rather than
   `DEFERRED` (commit first, then gate, or the strongest arm silently does not run).
4. Carry N1, N2, N3 and N6 into the consistent-hashing wave's brief.
