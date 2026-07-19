# 2026-07-18 — Flow design judge-panel: synthesis & operator decision

**Provenance.** Five independent design agents each produced a complete flow-grammar design for the "manually constrained, no smoothness" verdict (root causes RC-A/B/C/D, `2026-07-18-manual-smoothness-analysis.md`), each from a forced distinct frame: **D1 Continuity-first** (the Continue Spine), **D2 Session-arc-first** (the Practice Session), **D3 Minimal-touch** (Close the Loop), **D4 Homepage-led** (the Front Door Owns the Path), **D5 Data-led** (the Evidence Ladder). Three independent judges — J1 product-pragmatist, J2 verification-purist, J3 user-advocate/learner — scored them on a shared rubric (A kills the root cause / B honors hard constraints / C reuse over invention / D effort honesty / E taste-fit, 10 each, 50 max). **All three judges verified the designs' load-bearing citations against the repo on disk before scoring** — no design was scored on trust. Raw designs + full judge texts live in the workflow journal for this run (see `reference-where-agent-output-lives`); this file is the system of record for the decision.

---

## 1. Scoreboard

| Design | J1 | J2 | J3 | Σ /150 | Rank |
|---|---|---|---|---|---|
| **D3 — Minimal-touch "Close the Loop"** | 43 | **43** | **45** | **131** | **1** |
| **D1 — Continuity "Continue Spine"** | **44** | 41 | 44 | 129 | 2 |
| D4 — Homepage-led "Front Door" | 41 | 41 | 42 | 124 | 3 |
| D5 — Data-led "Evidence Ladder" | 41 | 40.5 | 41 | 122.5 | 4 |
| D2 — Session-arc "Practice Session" | 35 | 37.5 | 35 | 107.5 | 5 |

**Judge headlines:**

- **J1 (product-pragmatist, D1 first by 1pt):** D1 = "the fullest kill without auto-advance — one compute, N renderings is the structural answer to this repo's documented split-brain bug class." D3 = "purest reuse, most honest pricing, and it found + solved the stale-stats landmine nobody else stated." Explicit ship order despite ranking D1 first: *"Design 3's E1–E7 is the fastest verified value and a strict subset of Design 1's slice 1 — ship it as wave 1, then Design 1's dock + macro tier as wave 2, grafting D4's pos.<id> cursor store and D5's receipts + mock.<id> re-key into that wave."*
- **J2 (purist, D3 first):** D3 = "the best-grounded document in the cohort — every citation exact, including three things nobody else caught" (the `_updCount`-before-`_emitGraded` stale-stats hazard; pickRec's structural never-hands-anyone-to-first-mixed-fire gap; the SELF-dedupe rule). Dinged D1/D3 for silently amplifying the global `mock.last` lie; dinged D2/D4 for wiring the wrong mock end-surface. D2 = "a second sequencing brain persisted beside the stateless one… the clearest underpricing in the cohort."
- **J3 (user-advocate, D3 first at 45):** D3 = "the highest-precision grounding I have ever verified in a design document… A=7 is the honest ceiling: it wins as the correct FIRST wave, not as the end state." D1 = "the most complete answer to the brief; the walk last-step morph is the best single interaction in any design." Composite verdict: *"D3's wave first, then D1's spine/home unification as wave 2 — with D4's mock re-key landing BEFORE any surface promotes pickRec's mock branches, and D5's receipts on whatever surface ships."*

**Read of the scoreboard:** the 2-point D3-over-D1 margin is noise; the signal is that **all three judges independently prescribed the same composite** — D3's boundary hand-offs as the first verified wave, D1's spine as the destination, with D4's data-honesty fixes as a prerequisite and D5's receipts as the trust mechanism. D2 was unanimously last (invention over reuse, worst pricing) but owns the one organ everyone wants transplanted: the session END.

### 1b. What the judges' adversarial verification established (binding facts for any implementation)

1. **There are FIVE-plus terminal surfaces, not four — two of them are mock ends.** The drill pane has an internal mock mode ending at `drill/logic.js:802-806` (`#vrestart`), and the Mock OVERLAY ends at `renderMockEnd` in `mixed-fire.js:218-257` (`#mbagain` — only this one feeds `mock.last`/pickRec). D1/D3/D5 wired the overlay (correct surface, missed the pane one); D2/D4 cited the pane surface while using overlay semantics (would not fire as specced). **No design covered both. Every direction below inherits +S scope to cover both.**
2. **`mock.last` is a GLOBAL topic-less record** (`mock-run/data.js:12`) that `sessStats`/pickRec already read as per-topic truth — a pre-existing lie. Any design that promotes pickRec's mock branches to prominent surfaces (all of them) amplifies it. D4's per-topic re-key (+ legacy attribution, off-topic hard-gate until landed) is the fix; D5 independently argued the same field. **Prerequisite, not optional.**
3. **Stale-stats-at-completion is real and verified:** `whiteboard.js` runs `_updCount()` BEFORE `_emitGraded()` (:124-126), so an inline rec computation at the completion render reads the record one grade short and recommends the state just left. **Law: every completion-moment recommendation computes on a `queueMicrotask` after the completion render, with last-grade-then-read golden cases for drill AND wb in the gate.** (D3's discovery; every design's strips silently depend on it.)
4. **pickRec structurally never hands anyone to a FIRST mixed-fire run** (branch 7 requires `mixWeak` non-empty). D3's branch 6.5 (`mixTot===0` after a strong mock → "Run mixed fire") is a discovered engine defect fix, upgrading the session panel and report for free. Blast-radius rule: 6.5 is the ONLY ladder edit; golden-case-pin the whole decision table; cross-topic logic stays OUTSIDE pickRec.
5. **The homepage question is already answered in shipped code** (all 5 designs + all 3 judges + source: `router.js:158-166` boots `#home`; `index-overlay.js:6` "IT IS NO LONGER THE HOME"). The standalone home EXISTS; the overlay is the `\` switcher. The open question is only *how much job the home gets* — no direction builds a third surface or re-gates boot.
6. **Consensus-proven core** (independently converged on by 3-5 designs, verified feasible): (a) render pickRec at the terminal states via the extracted `ssgo` executor (`session-progress.js:374-388`); (b) the walk last-step Next-slot morph — the button re-aims instead of dying, geometry locked; (c) `n` as the forward key (verified unbound in the full `shell.js` keymap); (d) **no auto-crossing of boundaries — forward is always one deliberate press**; the drill's judge→advance chain stays the only self-mover.

### 1c. The graft set — transplants every direction carries (one per design, judge-unanimous)

| From | Graft | Why it travels |
|---|---|---|
| D1 | **The one-compute contract**: exactly one compute function whose returned object every forward surface renders verbatim, enforced by a gate test that fails on any string mismatch between visible targets after simulated grades | Architectural (not procedural) kill for the repo's panel-vs-live drift bug class |
| D2 | **The session END as a real moment**: when the ladder goes quiet, render a close moment — per-block/topic deltas from a start-snapshot vs the record now, `trendCapture()` fired at a meaningful instant (not only tab-hide), a carry line for tomorrow, "Done for today" with no nag | The only exit from an otherwise infinite ladder; graft WITHOUT the planner |
| D3 | **SELF-dedupe + microtask freshness (travel together)**: never render a forward strip where the existing button already IS the recommendation (`#dweak`, `#wbrerun`, `#mbagain`, `#mxretry`); compute recs post-render on a microtask | The taste rule + the verified landmine map; prevents button soup and one-grade-short lies |
| D4 | **`pos.<id>` cursor store + restore-never-regrades**: `{view, walk step, drill probe}` throttled from the panes' own renders, read once on topic entry, cleared with sibling keys; Resume sub-line "probe 9 of 22" | Kills the measured 5-action re-establish (QW-4); makes every Resume honest. Companion: the mock re-key (fact 2) |
| D5 | **Receipts + `flow_evidence` gate**: every forward affordance renders the raw stored numbers justifying it ("2 steps missed", "drilled clean 9d ago"); a gate recomputes each rendered claim from localStorage and fails on mismatch | Converts recommendation bugs from silent product lies into red gate diffs; the trust mechanism this operator's culture runs on |

---

## 2. The directions

Three honest syntheses. A and B share a destination (the spine) and differ in staging/commitment; C is the genuinely different architecture (distributed guidance, no persistent spine chrome). All three carry the §1c graft set, the §1b prerequisites, and the consensus core.

---

### DIRECTION A — "Close the loop, then run the spine" (staged: D3 core → D1 destination) — RECOMMENDED

**Thesis.** Bank the highest-confidence, lowest-bounce value first (D3's five hand-offs, ~4-5 agent-days, gates included), with the engine written from day one as the future spine's meso tier (wrap pickRec, don't fork), then land D1's persistent spine + D4's cursor resume as wave 2. J1 verified D3's change-set is a strict subset of D1's slice 1 — the staging is free.

**Surfaces & waves.**

- **Wave 0 — un-lie the data (prereq, no UI, ~2-3 S):** per-topic `mock.<id>` re-key with one-time legacy attribution; mock/mix branches hard-gated off non-current topics until it lands. pickRec branch 6.5 with golden-case pins of the full ladder. The microtask freshness law + drill/wb golden cases wired into the gate.
- **Wave 1 — the hand-offs (D3 + grafts, ~5 agent-days):** `flowRec()`/`flowGo()`/`flowStripHtml()` beside pickRec (flowRec written as the future NextUp meso tier); walk last-step morph in the `#wnext` slot (fixed 2-col geometry — the hit surface cannot move); drill-debrief strip (SELF: `#dweak` stays the rec when shk>0); whiteboard ok-verdict strip (the button-less dead end gets its first-ever action); mock OVERLAY end strip post-score (SELF: `#mbagain` when weak) **and** the drill-pane internal mock debrief (`#vrestart` — the discovered fifth terminal, +S); mixed-fire end strip + topic-end hand-off ("This topic is banked. Next: <weakest ∥ next untouched in room> →"); seg-strip recommendation pip + `.flow-cta` on `#mockopen`/`#mixopen` (absolute-positioned, zero box delta); drill-debrief Space/Enter keymap extension; **receipts on every strip** (D5). Gates in-wave: `flow_handoff` (drive all terminals headless; assert exactly one forward affordance each; navigates per the decision table), `flow_evidence`, golden-pinned ladder, `click_drift` + mobile pin re-runs.
- **Wave 2 — the spine (D1 + D4 grafts, ~5-6 agent-days):** `NextUp.compute()` formalized (micro/meso/macro; macro `Progress.summary()` computed lazily only on meso-terminal, post-paint — RC-D discipline on the 33ms judge→advance hot path); desktop **Continue dock** between `.side-id` and `.mockcta` (≤64px cap; fold-measured at 1280×800 and 1536×864 before merge); home CTA becomes a NextUp consumer (autofocus + Enter contract byte-identical); `#ssgo` renders NextUp (the session overlay never again ends button-less); `n` = go-to-target globally (KeyGuard + dialog bail; `aria-keyshortcuts` — the app's first); **the one-compute contract test** (all visible targets string-match after each simulated mutation) lands with the engine, not after; **`pos.<id>` cursor store** (walk step + drill probe; restore-never-regrades; Resume sub-line); `walk.<topic>` step persistence; wb grade→next-cue auto-scroll. Severable tail: mobile bottom dock + toolsfab merge (ship desktop dock first; the mobile bar merges only if the 360/390 zero-overflow baseline and FAB semantics verify clean).
- **Wave 3 (optional, S):** D2's END graft — when macro goes quiet (t4/all-banked), the spine's terminal rendering becomes a close moment (deltas + `trendCapture()` + carry line + "Done for today"). A rendering state, NOT a route, NOT a planner; promote to a `#debrief` route later only if a URL-addressable end proves wanted.

**Decision table (wave-1 grammar; wave-2 extends downward — first match wins, SELF = existing button is the rec, no strip):**

| # | State | Forward (with receipt) | Mechanism |
|---|---|---|---|
| 1 | Walk last step | `#wnext` morphs: "Start the drill → · 22 probes, 0 graded" (label from ladder) | `walkthrough/logic.js:207-208`; flowGo |
| 2 | Drill debrief, shk>0 | SELF — `#dweak` "Drill my N Revisit probes" IS the rec | existing `dr.weak(weakIdx)` |
| 3 | Drill debrief, clean | strip: next per ladder (wb → mock → 6.5 mix → topic-end) | queueMicrotask flowRec |
| 4 | WB warn-verdict | SELF — `#wbrerun` | existing rerunMissed |
| 5 | WB ok-verdict | strip (surface's only action): "Run the mock — never run" | openMock |
| 6 | Mock overlay end, score < bar | SELF — `#mbagain` "Run again" | pickRec b3 |
| 7 | Mock overlay end, strong | strip: "Run mixed fire →" (6.5) or per ladder | closeMock → flowGo |
| 8 | Drill-pane mock debrief (`#vrestart` surface) | same strip logic as 6/7 | `drill/logic.js:802-806` |
| 9 | Mixed end, fumbles | SELF — `#mxretry` | pickRec b7 |
| 10 | Mixed end, clean | topic-end: "Banked. Next: <topic> →" (weakest w/ receipt, else next untouched in room) | setTopic + navigate |
| 11 | *(W2)* mid-unit in any pane | dock micro: shows the native key (Space / → / 1-3 armed) — never grades, never narrates louder than the pane | NextUp micro |
| 12 | *(W2)* any pane, unit complete / reading panes | dock meso = pickRec verbatim + s0 "read the walkthrough first" branch | NextUp meso |
| 13 | *(W2)* meso terminal | dock macro: t1 weakest-other → t2 next-in-room → t3 next room → t4 refresh oldest-ts | NextUp macro (lazy) |
| 14 | *(W2)* `#home` | CTA = NextUp rendered large (dock hidden on home — one affordance per screen) | home CTA consumer |
| — | Any boundary | never auto-crossed; exactly one press (N / Enter / click) | invariant |

**Effort:** W0 ≈ 1 day · W1 ≈ 5 days · W2 ≈ 5-6 days · W3 ≈ 0.5 day. **Total ≈ 11-12 agent-days across 3-4 independently verified, individually revertible merges.** Value is banked from W1; a W2 bounce cannot take W1 down.

**Risks:** (1) *Stopping after W1* — the judges' A=7 ceiling: dead ends die but the product still returns to neutral between completions and day-2 entry/re-establish stays broken. Mitigation: this decision COMMITS W1+W2 together; W2 is scheduled, not aspirational. (2) *Dock fold budget* at 800px-tall viewports (ED4: tools already below fold) — hard height cap, pre-merge fold measurement, reclaim the `.hdr` kbd-hint line if needed. (3) *pickRec blast radius* 3→6+ consumers — 6.5 the only ladder edit, table golden-pinned, cross-topic logic outside pickRec. (4) *Mobile dock/FAB merge* is the riskiest W2 piece — explicitly severable.

**Commitment tag:** commits the product to **guidance-at-boundaries as the permanent grammar and ONE compute as law**; defers (not drops) persistent chrome; accepts two scheduling gates instead of one big bet. Honest cost: the full felt transformation arrives ~a week later than Direction B, and if W2 were ever cancelled the verdict ("control panel, not a path") would be only half-killed.

**Homepage answer:** **standalone `#home` stays, unchanged through W1; in W2 its CTA becomes the spine rendered large** ("the home route already is the homepage — wire its CTA into the spine and stop"). Overlay stays the `\` switcher. Hybrid only in *time*, not in architecture. No new surface, no boot-gate change.

---

### DIRECTION B — "The spine outright" (D1 in one committed push, grafts folded in)

**Thesis.** Same destination as A, arrived at in one decision: the Continue Spine IS the product's backbone from the first merge. For an operator who wants the felt transformation now and accepts a bigger single bet.

**Surfaces.** Everything in A's W0+W1+W2 landed as two back-to-back slices of one wave: slice 1 = prereqs + NextUp engine + walk morph + all terminal hand-offs (both mock ends) + desktop dock + home CTA + `#ssgo` + `n` + contract test + receipts; slice 2 = mobile bottom dock absorbing `#toolsfab` (one bar replaces the FAB — position-stable Tools, the off-screen-Tools bug class becomes structurally impossible) + `pos.<id>` + wb auto-scroll + drill resume-at-next-ungraded. **Taste amendment from the judges (J2 E=7):** adopt D5's boundary-suppression for micro states — the dock stays quiet mid-unit (no "Reveal the answer" narration; it renders armed judgment keys only at judgment points and full targets only at boundaries).

**Decision table:** identical to A's full table (rows 1-14) from day one — that is the point.

**Effort:** ≈ L as one wave: slice 1 ≈ 6 days, slice 2 ≈ 3-4 days, **total ≈ 9-10 agent-days, one decision, two merges close together.** Marginally cheaper than A (no re-verification seam between waves) at materially higher concentration of risk.

**Risks:** all of A's W2 risks WITHOUT a banked-value fallback — a bounce anywhere (dock fold budget, the jank gate on the drill battery, the mobile bar on a historically fragile surface) stalls the whole wave; the mobile FAB merge is load-bearing rather than severable; the dock ships before the hand-off grammar has proven itself with users of one wave.

**Commitment tag:** commits NOW to **standing chrome on both form factors and to the spine as the product's identity**. Fastest route to "the session never returns to neutral"; no cheap exit; the whole bet is underwritten by the same gates but rides on one merge train.

**Homepage answer:** identical end-state to A — standalone `#home` kept, CTA = the spine's rendering where no topic is active, dock hidden on home, overlay = switcher. The answer just arrives in week one.

---

### DIRECTION C — "The front door owns the path" (D4 frame + grafts, no new persistent chrome)

**Thesis.** The genuinely different architecture: no dock, no bar — guidance lives at the **home** (a 3-row TODAY plan + an honest Resume), a **small stagehead chip** in-topic, and the **completion primaries**. The home's engine is THE definition of forward everywhere; everything recomputes statelessly from the record so home and in-topic cannot disagree.

**Surfaces.** `flow.js` (pickRec MOVED verbatim, not forked; record-only adapter for non-current topics; `Flow.rec/plan/next`); **Home v2 in place** — Resume card with `pos.<id>` sub-line ("Probe Drill · probe 9 of 22"), TODAY strip of exactly 3 list-weight rows (finish / repair / advance; renders only when `engaged()`; the file's ONE-`.hm-cta` contract kept test-assertable), room cards gain a "next:" line; **Continue chip** in the empty right half of `#stagehead` (event-driven re-render only; suppressed mid-drill and under any open dialog; `aria-keyshortcuts="n"`); the four completion primaries + **both** mock terminals (correcting D4's citation blur: the overlay end is `mixed-fire.js:218-257`, the pane end `drill/logic.js:802-806`); `pos.<id>` store; per-topic mock re-key native to the wave; QW-8 search-from-home routing. Grafts: 6.5, microtask law, SELF-dedupe, receipts on plan rows + chip, one-compute parity gate (chip label == `Flow.rec` for every table row on a seeded store, landing with piece 1).

**Decision table (condensed from D4's 14 rows):** 0 home-cold → Start ids[0] walk · 1 home-engaged → Resume nav.last + restore `pos` · 2-3 walk mid/last → next step / "Drill the probes →" · 4 mid-drill → suppressed (drill owns momentum) · 5-11 = pickRec b1-b7 verbatim (re-drill flagged / re-draw missed / weak-mock re-run / finish drill / first wb / first mock / mixed fumbles) · 12 reading panes → whatever 5-11 resolves · 13 topic ready → **the new 9th rung**: "Next topic: {plan.repair ∥ plan.advance} →" · 14 plan empty → home. Boundaries never auto-crossed.

**Effort:** ≈ 4M + 4S ≈ **6-7 agent-days, one sequenced wave** (engine → home/pos/completions in parallel worktrees → chip → re-key/search), parity gate from piece 1. Judges rate D4's pricing slightly optimistic; the dual-mock correction is +S already counted here.

**Risks:** (1) *Home hierarchy regression* — the TODAY strip flirts with re-creating the "46 decisions" problem the home was built to kill; capped at 3 list-weight rows, single-`.hm-cta` invariant asserted. (2) *Distributed guidance* = the most divided attention of the three directions (strip + chip + room lines + primaries); no single always-in-the-same-place answer — mid-session continuity is the weakest of the three (a chip is subtler than a dock). (3) The `pos` piece is the one to test hardest (live-vs-record discipline; restore must never re-grade). (4) One wave bundling six features — broad, though parity-gated from the start.

**Commitment tag:** commits to **lobby-first entry as a permanent product stance** (deliberately declines QW-5's auto-resume-ON: every day starts at the front door, cost bounded at one autofocused Enter) and to **guidance distributed across surfaces rather than a spine**. Best day-2 entry story of the three; no new standing chrome to defend; weakest between-completion continuity.

**Homepage answer:** **standalone home PROMOTED to flow owner** — the plan strip is the reason the lobby exists; boot stays lobby-first; the overlay's demotion (already shipped) is finished and it stays the `\` switcher. Explicitly *not* hybrid: the home is the brain, in-topic surfaces execute it.

---

## 3. The standing homepage question — answered

The panel closes it. **All five designs and all three judges converged, verified in source: the standalone homepage ALREADY SHIPPED** (`#home` route, boot landing, Back-guard; `index-overlay.js` self-describes as "no longer the home"). Nobody builds a new surface; nobody re-gates boot; the overlay remains the manual switcher on `\` in every direction. The only live variable is the home's JOB:

- **A:** keep-as-shipped now → home CTA becomes the spine's large rendering in W2 (home = where the Continue target renders big; ledger around it unchanged).
- **B:** same end-state, week one.
- **C:** home promoted to flow OWNER (plan strip + honest Resume); entry deliberately stays lobby-first.

**"Keep-overlay vs standalone vs hybrid" is a solved question — standalone, already live.** Stop relitigating it; the remaining decision is A/B/C's job-of-the-home, which falls out of the direction choice.

---

## 4. Recommendation

**Take Direction A — and take it as ONE commitment with two merge gates, not a wave-1-then-we'll-see.** Land Wave 0 (un-lie the data) immediately, Wave 1 (the hand-offs) as the next verified merge train, and schedule Wave 2 (the spine + cursor resume) in the same breath.

Reasoning, plainly:

1. **It is the judges' own composite.** Two of three ranked D3 first; the third (J1) ranked D1 first and *still* prescribed D3-as-wave-1. The aggregate margin between D3 and D1 is 2 points of noise over a subset/superset relationship — which means the staging costs nothing architecturally.
2. **It matches this repo's proven delivery culture:** small independently verified merges, instruments with negative controls, value banked before the next bet (the visual wave shipped exactly this way, 7/7 green). Direction B's single train re-concentrates precisely the risk this project has learned to slice.
3. **The correctness prerequisites are non-negotiable in every direction** (mock re-key, microtask law, 6.5) — front-loading them as W0 is pure win and makes every later surface born-honest.
4. **A reaches B's destination anyway.** B buys ~a week of earlier arrival at the price of an unseverable mobile-chrome bet and no fallback position. Nothing in B's end-state is lost by staging.
5. **C's distinctive organs are already grafted into A** (`pos.<id>`, the re-key, receipts); its remaining distinctive commitment — lobby-first-forever, guidance without a spine — is the weaker answer to the measured complaint (62/63 hand-driven, product returns to neutral between completions). If, after A's W2, the TODAY plan strip still looks valuable, it layers onto A's home without conflict as a later S/M addition.

The one failure mode to guard: **A chosen but W2 quietly dropped re-creates the judges' A=7 ceiling** — dead ends die, but "control panel, not a path" survives. The commit is to the pair.

---

## 5. Anti-goals — what NO direction should do (judge-converged, binding)

1. **No auto-navigation across any boundary, ever.** Forward is offered, never taken; the drill's judge→advance chain remains the only self-mover (the user's action IS the consent). No timers, no grade-triggered navigation.
2. **No second decision engine and no persisted plan/queue state.** pickRec (+ the thin cross-topic extension kept OUTSIDE it) is the only law; every surface recomputes from the canonical record on every ask; nothing stored that can rot (D2's persisted planner is the cautionary tale — unanimous last place).
3. **No unreceipted or fabricated guidance.** No invented est-minutes, no vibes; where the store is silent the UI is silent (no fake completion state on the six untracked prose panes; no scroll-heuristic "done reading").
4. **No promoting mock/mix recommendations anywhere prominent while `mock.last` is a global topic-less record.** Re-key first, or hard-gate those branches off non-current topics — a spine that broadcasts the lie is worse than the below-fold modal that hid it.
5. **No duplicate recommendation on a surface whose existing button already IS the rec** (SELF-dedupe: `#dweak`, `#wbrerun`, `#mbagain`, `#mxretry`). One offered next per screen; no button soup.
6. **No gamification.** No XP, badges, confetti, streak-shaming or streak escalation; the quiet streak chip renders only when alive, unchanged.
7. **No transforms on hit surfaces; no meaning carried by motion.** Reduced-motion degrades to instant-VISIBLE (base opacity 1, animate FROM 0 — the anti-`body{opacity:0}` idiom); label morphs on fixed geometry / reserved space so hit surfaces never move (the binding click-surface verdict stays closed).
8. **No new fixed mobile chrome that competes with the seg strip's one-declaration drift immunity or the tools FAB.** A mobile dock may ABSORB the FAB (and must be severable); it may never stack beside it.
9. **No removal or gating of manual overrides.** The 9-tab bank, `\` index overlay, `[`/`]` stepping, search, and the session overlay all remain full overrides at every state — guidance is a default path, not a cage.
10. **No third start surface and no boot-gate reopening.** `#home` is the homepage (shipped); the overlay is the switcher. Closed.
11. **No synchronous rec computation at completion moments** — the microtask law (fact §1b.3), with golden cases in the gate.
12. **No shipping without the gates:** `flow_handoff` (every terminal has exactly one forward affordance that navigates per the pinned table), the one-compute string-match contract, `flow_evidence` receipt recompute, the golden-pinned ladder (incl. 6.5), and `click_drift` + mobile-pin re-runs on any touched chrome. "It renders" is not done.

---

*Full designs + judge texts: workflow journal for the 2026-07-18 flow-design panel run. Ground truth: `2026-07-18-manual-smoothness-analysis.md` (RC-A/B/C/D), `2026-07-13-visual-sweep.md`, `2026-07-13-visual-wave-shipped.md`.*
