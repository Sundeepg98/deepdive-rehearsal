# Post-ship cold audit — Direction A "flow grammar" (W2)

**Date:** 2026-07-19
**Scope:** Independent blind-lens sweep of the live site (https://sundeepg98.github.io/deepdive-rehearsal/) the day after Direction A shipped, plus disk verification of every load-bearing receipt against `D:/claude-workspace/deepdive-rehearsal/src`.
**Role of this file:** SYNTHESIS — dedupe, evidence-screen, rank, reconcile against the known books, and name next-wave directions. This is the system-of-record for the run.
**Status:** COMPLETE 8/8. The original workflow pass produced 4 substantive lenses; the other four (flow-loop, content-depth, design-critic stubbed; perf-midrange died) were re-run as hardened standalone agents and folded in here — so this file is now the true 8-lens record, not a 4/8 snapshot.

---

## Verdict

**No P0. Three P1, ten P2, thirteen P3 — 26 distinct items after dedupe, now across all 8 lenses.** The core rehearsal loop is sound: gradeable by touch and by keyboard, screen-reader-operable, zero horizontal overflow, no console errors on any pane at any width — and the four re-run lenses did not overturn that, they sharpened it. The exceptions cluster in seven honest themes: one dead-end (focus mode), the core self-grade being skippable at the moment of truth, a handful of mobile/desktop parity gaps (the recorded Beat-4 deferral, now measured), a real data-honesty bug where the trend panel paints a *different topic* as a "regression," a first-visit performance tax (the heaviest pane and one-in-two panes cross their comfort bars on first activation), a dark-mode hierarchy collapse (the Continue dock and the primary Mock CTA read as one tier), and a flow-grammar boundary bug (the drill debrief is misclassified as a judgment point, so at the terminal the keyboard spine's two affordances both fail).

Set against that, four things came back **clean and load-bearing**:

- **Content parity is now certified in lived quality.** A deep read of the markdown-compiled Saga topic against the hand-coded flagship (Content Pipeline) found it *genuinely* at the flagship's depth — a teaching-grade 9-step walkthrough with runnable code, 21 tiered drills with real multi-hop follow-up chains, 8 trade-offs each naming the axis that flips them, a sound interactive Numbers model, and a 14-item mock Bank whose distributed-systems reasoning is correct and in places *exceeds* the flagship. Every distinctive deep passage verified intact in the live single-file bundle — so the compiler is not dropping authored content. (The prose teaches, not just structures: *"the key mental shift is that 'undo' here means doing more work (a refund), not reverting a database."*) The one texture note — Saga's walk code is canonical/textbook where the flagship's is lived-system — is an optional grounding nicety, not a parity gap (item #26).
- **The flow loop's receipts are truthful end-to-end.** On the event-driven build: all 21 keyboard grades registered; the flowRec receipt "2 to revisit" matched the 2 revisit grades exactly; dock == pip == flowRec at every checkpoint. Resume-after-notification is honest — position persisted `{drill:3}`, the home sub-line read "Probe Drill · probe 4 of 21," resume landed on Probe 4/21, the record survived intact `{got:1,shk:2,done:3}` with no regrade, and `#ssgo == pip == flowRec` all agreed.
- **The judge→advance hot path is healthy** — a steady ~44ms (only the first grade paid a 101ms warmup).
- **The armed judgment legend is the run's single best decision** (design lens' verdict): legend-not-CTA discipline held — accent ink only on the functional digits 1/2/3, labels in `--mut`, kicker in `--mut2`, zero button affordance — and AA everywhere measured (5.11–6.81:1).

Every substantive finding below was re-verified on disk — the receipts hold.

---

## Coverage (8/8 — how it got there)

Planned **8 blind lenses; all 8 now delivered substantive output.** The first workflow pass yielded only 4 (cold-first-session, mobile-reality, W2 a11y, data-honesty); of the other four, three returned schema-only stubs (`{title:"t", where:"w", evidence:"e"…}` — flow-loop, content-depth, design-critic) and one died mid-run (perf-midrange). All four were re-run as hardened standalone agents and **all four returned real results**, folded into the ranking below. That is why this file is the true 8/8 record.

The eight lenses and their yield:

- **Cold first-session** (desktop 1440×900 + mobile 390×844, ~25 min honest first use) — 6 findings
- **Mobile reality** (Playwright, 360×800 + 390×844, touch + mobile UA) — 4 findings
- **W2 flow-grammar a11y** (keyboard + screen-reader over the new chrome) — 4 findings
- **Data honesty** (trend/compare/localStorage integrity) — 2 findings
- **Flow-loop** (full event-driven loop + resume-after-notification) — 2 findings + a clean end-to-end receipt-integrity pass *(re-run)*
- **Content-depth** (hand-coded flagship vs a markdown-compiled topic, read for lived quality) — a parity **certification** + 1 optional texture note *(re-run)*
- **Perf-midrange** (4× CPU throttle, live site) — 5 findings incl. one healthy hot-path *(re-run)*
- **Design-critic** (both themes × two rooms: data-storage/blue + reliability-observability/amber) — 4 findings + best/worst-decision verdicts *(re-run)*

**What that closes:** the earlier "UN-audited" list — content/pedagogy fidelity, performance/boot, and visual/design critique — is now covered, and the parity-debt ledger's fear (compiler dropping authored content) now has direct positive counter-evidence (thread *a*, reconciliation). **What honestly remains thin:** content-depth read **2 of 38** topics deeply — a lived-quality *sample*, not a 38-topic ledger reconciliation; perf was one device profile (4× throttle midrange); design-critic is a critique, not a pixel-diff regression baseline; and a dedicated desktop power-user *long-session* endurance lens still doesn't exist (the flow-loop lens drove a full 21-probe loop + resume, which covers much of it). Treat "clean" here as "clean through all eight lenses on the surfaces each drove," not "every topic line-checked."

---

## Ranked punch list (26 items, most-severe first)

Severity key: **P0** broken/lying for a real user · **P1** materially degrades the rehearsal loop · **P2** friction/polish · **P3** nit.
Every row is **FRESH** (new) or **CONFIRMS-KNOWN** (which book).

### P1

**1. Focus mode is a hard escape-trap — hides its own only exit, and Esc does nothing** · FRESH
*Lens: cold-first-session · Verified on disk + live.*
The one "Exit focus" control (`#_focus-toggle`) is appended to `.hdr` (focus-mode.js:43), and `.hdr` lives **inside** `<aside class="sidebar">` (index.html:23→28) — the exact element focus mode collapses with `opacity:0;visibility:hidden;width:0` (focus-mode.js:21). So entering focus mode hides the only control that reverses it. The keydown handler binds **only** F (focus-mode.js:65–75); there is no Esc path. Full-codebase grep confirms completeness: `_focus-mode`/`FocusMode`/`_focus-toggle` have **exactly one** exit path anywhere (the F key / that hidden button) — nothing else calls `FocusMode.toggle`. On mobile there is no F key, so tapping FOCUS (a chip right under the topic title) dead-ends: live, the toggle's own coordinates + 6 other locations + scroll-to-top never restored the chrome (aria-pressed stayed `true`; shots/45,47). Only exit is a full browser reload.
*Why it's the top item:* it's the only finding where a real user gets genuinely stuck. Recoverable (reload) and behind an optional feature, so P1 not P0 — but on mobile it reads as "the app broke."
*Evidence refinement (does not change severity):* the "reload dumps you to #home, losing your place" tail is likely **softer than reported** — `__bootHash` honors a non-empty deep-link (store.js:8–10) and the `pos.<id>` cursor restores the exact probe (session-progress.js:288+). Recovery probably lands you back in the topic. The **in-app trap** is the defect; the reload-loss is a secondary detail (independently confirmed benign by the perf lens — a mid-drill reload restored the cursor exactly to Probe 6/22; see #25).
*Direction:* render an Exit-focus affordance **outside** the collapsed sidebar (a persistent floating chip that survives `_focus-mode`) and bind Esc to exit. Minimum bar: never hide the only control that reverses the state that hid it.

**2. First-visit drill pane switch breaches the 250ms bar — the heaviest pane, and it's the core one** · FRESH
*Lens: perf-midrange · Measured live (4× CPU throttle).*
First activation of the Probe Drill pane costs **218 / 276 / 326 ms across three clean runs** — the heaviest of the ten panes, with 2 of 3 samples over the 250ms bar. Notable because drill is *already* an `eagerTopic` (its data is preloaded), yet the first *activation* still pays a synchronous build: `drawCard()` + `_mustHit()` render the first probe card on demand (drill/logic.js). Every subsequent drill switch is fast; the tax is one-time-per-topic — landing at the exact moment a user first enters the pane the whole trainer exists to serve.
*Why it matters:* the breach is on first contact with the core surface, when a new user is forming their impression of responsiveness. First-visit-only and recoverable, so P1 not P0 — but it's a measured breach of a stated bar on the central pane.
*Direction:* profile the `drawCard()` + `_mustHit()` first-card render; prewarm probe 1 at topic-load so the first activation is a display toggle, not a build.

**3. Dark-mode Continue dock and primary "Mock run" CTA collapse to one visual tier** · FRESH · **design lens' worst-decision**
*Lens: design-critic · Both rooms confirmed (blue + amber); screenshot receipts in agent scratchpad.*
In dark mode the Continue dock and the primary Mock CTA below it render as the *same* visual object — both a dark card with an accent hairline border and accent text — separated only by size and a small play glyph. The intended hierarchy (dock = resume affordance, Mock = the primary action) survives only in **light** mode, where the Mock CTA is a filled gradient and the dock is not.
*Why it matters:* dark-mode users lose the visual distinction between "continue where you were" and "start a mock" — two different commitments — on the home surface. Persistent (every dark session), not first-visit; borderline P1/P2, kept P1 because it degrades primary-CTA discrimination for an entire theme.
*Direction:* either flatten the dark dock (`--panel`/`--surf` background, drop or mute the border, accent only on the kicker) so it sits a tier below, or re-assert the dark Mock CTA with a filled treatment. One of the two must own the primary tier. (Pairs with #24 — the dock's `--accbg` wash is part of what makes it read as a peer of the active-tab surface.)

### P2

**4. The self-grade (Missed/Shaky/Solid) is never surfaced at the decision moment — first-timers read every answer and grade none** · FRESH
*Lens: cold-first-session. **Highest product value; borderline P1.***
After "Reveal answer," the only above-the-fold CTA is "↳ Interviewer pushes further." The grade buttons (`#jm/#js/#jg`) render below the fold (desktop doc-y ≈1814 vs 900 fold; mobile ≈1136 vs 844) **and** only arm after the follow-up chain is exhausted (pressing 1/2/3 right after reveal is a no-op — counters stayed 0/0/21). Mobile has no persistent grade prompt at all; the fixed bar promotes "Mock run" + Tools. Grading is well-built once found (a MUST-HIT self-check + 3 clear buttons; verified working by tap and by key).
*Why it matters:* self-grading is the mechanic behind **all** progress — the Resume hero, "still shaky" chips, room %, the weakness view, the whole spaced-repetition spine. A first-timer can silently forfeit it. Kept P2 (it works once found; desktop arms 1/2/3 in the sidebar dock), but this is the single most consequential product gap in the run.
*Direction:* compact grade affordance at the reveal point (sticky under the answer; swap the mobile bottom bar to Missed/Shaky/Solid at judgment; an above-the-fold "got it → next" quick-grade for the confident user).

**5. Scroll-to-top FAB overlaps and tap-intercepts the primary "Mock run" CTA on mobile** · FRESH (adjacent to, but distinct from, the known "scroll-top cache edge")
*Lens: mobile-reality · Verified on disk + live.*
`.scrolltop` is `position:fixed; left:50%; translateX(-50%)`, z-index 150, bottom ~24px (styles.css:1232–1233) with **no** mobile media query repositioning it (grep confirms it appears only at 1232–1234). It sits centered on the fixed mock bar (`#mockopen` z-40, index.html:45–46). Live at 360 and 390: whenever scrolled >400px (the constant state on tall panes) `document.elementFromPoint(180,754)` returns `id="scrolltop"` — the FAB (z-150) wins the tap over the label center and silently scrolls-to-top instead of starting the mock (shots G_fab_360/390 show "▶ Mock ↑" with "run" hidden).
*Why it matters:* mis-routes a core-loop entry on the primary mobile surface, in the normal scrolled state. Borderline P1; kept P2 because the "▶ Mock" left half stays tappable and the FAB clears on scroll-up.
*Direction:* `@media(max-width:919px)` lift `.scrolltop` above the fixed `.mockcta` (`bottom: calc(bar + gap)`) or right-align it clear; re-measure `elementFromPoint` over the label.

**6. Drill debrief is misclassified as a judgment point — the dock arms phantom grade keys and the global `n` hand-off goes inert at the terminal** · FRESH
*Lens: flow-loop · Verified live + on disk (root cause traced).*
At the drill **debrief** — a terminal state, no probe on screen — the dock still renders the **armed grade legend**, and both keyboard-spine affordances fail: pressing **`n`** produces a byte-identical snapshot (no navigation), and **1/2/3 are inert**. Root cause is a stale flag: `_judgeOn` is left `true` from the last probe because `judge()` → `renderD()` renders `renderDebrief()` **without** `drawCard()` ever clearing it, so `atJudgment()` still reports true at the boundary (drill/logic.js). Meanwhile `flowRec` correctly computes `{tab:'drill', btn:'Re-drill weak spots →'}` with `nextUp().tier === 'micro'`, but `shell.js` only `flowGo`s on `meso`/`macro` — so `n` silently no-ops at exactly the first terminal, while the dock instructs the user to grade a probe that isn't there. This contradicts the design's own "full targets at the boundary" intent: at the first terminal, *both* spine affordances are dead.
*Why it matters:* the terminal is where a user is most likely to reach for the keyboard to move on, and both the advance key and the on-screen legend mislead there. A correctness bug in the flow grammar, not a polish nit — but recoverable (the "Re-drill weak spots →" CTA is mouse-reachable), so P2. (This is the *one* place `n` genuinely is inert — distinct from the cold-lens "n inert everywhere" repro artifact the a11y lens already dispelled; see #10 and the method note.)
*Direction:* clear `_judgeOn` when `renderDebrief()` runs (or gate `atJudgment()` on a live judge row / `di < cards.length`) so the debrief classifies as `meso` — which both silences the phantom legend and lets the dock arm `n` on the real "Re-drill weak spots →" CTA.

**7. Trend/Compare silently compares DIFFERENT topics as same-basis — painting a normal topic switch as a colored "regression"** · FRESH
*Lens: data-honesty · Verified on disk + live.*
The `CPR1.` code carries date + drill/wb/mock/mixed tallies but **no topic id** (encodeSession, session-progress.js:457–461), and `sessStats` measures the **currently active topic** (sessLiveActivity reads the live drill/whiteboard panes, :420–425). `trendCapture` snapshots that on visibility-hidden/pagehide (:472–481). Live receipt: studied content-pipeline (drill 3-of-22) → hist point `…1-2-3-22…`; switched to sharding-strategies, graded one probe → point overwritten to `…1-0-1-21…` (note `dTot` 22→21 — decisively single-topic, not aggregate). `renderCompare` (:550–569) and `trendSparkHome` (panels.js:61–71) render these as one sparkline + good/bad delta arrows ("Compared to <date>", red "▼ N") with **no topic label**. So Mon-drill-caching(solid 18) / Tue-drill-sharding(solid 3) renders as a red "▼15 regression."
*Why it matters:* the app asserts a value-judgment (good/bad, "regression", red) on a comparison the stored data does not support — default-on, silent, and misfiring for exactly the multi-topic studier its own "Next: <topic>" hand-off *encourages*. Per-point data is honest; the cross-point aggregation is the dishonest surface.
*Direction:* store topic id per CPR point; group deltas/sparkline by topic, or at minimum suppress good/bad coloring when consecutive points are different topics.

**8. Five of ten first-visit pane switches cross the 100ms comfort bar** · FRESH
*Lens: perf-midrange · Measured live (4× CPU throttle).*
On first activation, half the panes exceed the 100ms "feels instant" bar: trade-offs 217, model 186, whiteboard 153, numbers 150, system 144 ms (the fast half at first visit: viz 32, red-flags 80, walkthrough 83, open 98; drill measured separately — see #2). All are one-time-per-pane build costs; subsequent switches are fast.
*Why it matters:* the first tour of a topic — exactly when a new user is judging responsiveness — is the slowest it ever is. No single pane is egregious (drill aside), but the *pattern* is a first-visit tax across the whole tab strip.
*Direction:* pre-build the next-likely pane during idle time after topic-open, so first activation is a display toggle rather than a synchronous render.

**9. Topic open is a variable 180–332ms, tail exceeds 250ms** · FRESH
*Lens: perf-midrange · Measured live (4× CPU throttle).*
`setTopic` runs a bank reseed plus the first walkthrough render; measured topic-switch time was ~180ms typical but ranged to 332ms across runs, with the tail past the 250ms bar. The *variance* (not just the magnitude) points at GC / layout contention rather than a fixed cost.
*Why it matters:* topic-switching is a frequent action, and an unpredictable 180–332ms makes the app feel occasionally sticky in a way a steady cost wouldn't.
*Direction:* profile the `setTopic` bank-reseed + first-walk render; defer or chunk the reseed off the critical path so the tail tightens.

**10. The global `n` (NextUp/Continue) key is missing from the Shortcuts overlay** · FRESH · **DEDUPED cross-lens (cold-first-session #6 + w2-a11y #13) — confirmation RAISES confidence**
*Verified on disk + live.*
`keyboard-overlay.js` KBD_HTML "Anywhere" section (lines 64–79) lists /, \, H, [, ], P, F, Ctrl+P, G, D, Esc, ? — and has **no** row for `n`. Yet `n` is a real, shipped W2 key: the a11y lens verified it navigates live (body focus + `n` on a fresh topic moved walk→drill), the dock CTA ships `aria-keyshortcuts="N"` (session-progress.js:258), and shell.js handles it globally.
*Cross-lens reconciliation of the discrepancy:* the cold lens reported `n` as "inert in every context tested" (and rated it a low-confidence P3, "maybe gated"); the a11y lens **resolved it** — `n` works but is *contextual* (acts only when a next-step is offered, and no-ops on home / in dialogs / while typing). So the "inert everywhere" reading was a repro artifact. (The flow-loop lens then found the *one* context where `n` genuinely IS broken — the drill debrief, #6 — a real bug, not this doc gap.) The defect here is the **documentation gap**: a headline W2 navigation key absent from the canonical key map in a keyboard-driven trainer.
*Direction:* one additive KBD_HTML row — `N — Go to your next step` (note it acts only when a next step is offered).

**11. Continue dock and terminal hand-off strip emit byte-identical copy and can co-occur** · FRESH
*Lens: design-critic · Verified on disk; co-occurrence induced live (see caveat).*
The Continue dock and the terminal hand-off strip can render the **same kicker + CTA + receipt** twice, ~200px apart — the same instruction stated verbatim in two places.
*Why it matters:* duplicated identical guidance ~200px apart reads as a rendering bug and dilutes the single clear next-step the flow grammar is trying to present.
*Caveat (the lens flagged this itself):* the co-occurrence was **induced** by mounting the strip on a *non-terminal* pane; it needs confirming on a *true* terminal before acting, since the strip and dock may already be mutually exclusive in real terminal states. Verify first — this is the one new item resting on an induced repro rather than a natural one.
*Direction:* if confirmed, make them mutually exclusive (strip mounted → dock demotes or hides).

**12. Mobile NextUp dock is `display:none` — mid-flow guidance thins to an unlabeled dot** · **CONFIRMS-KNOWN (thread c — the deliberately-severed Beat 4)**
*Lens: mobile-reality · Verified on disk + live.*
`#ndock` computes a real recommendation on mobile ("Keep going / Back to the drill → / 0 of 22 graded") but `styles.css:386` `@media(max-width:919px){.dock{display:none}}` hides it (full mobile styling exists at :369, switched off). What survives on mobile: the seg **pip** (unlabeled dot), the terminal hand-off **strips** (labeled, at terminals only), and the session overlay `#ssgo` (two taps deep via Tools → Session progress). The `n` key has no touch equivalent — its activation surface is the hidden dock.
*Reconciliation:* this is the measured **cost** of a recorded deferral (Beat 4: mobile dock absorbing the Tools FAB). Guidance is **thinner, not absent** — the loop still works via pip + strips + overlay. Reporting the receipt so the tradeoff stays conscious.
*Direction:* give mobile a lightweight NextUp affordance — promote the pip to a labeled chip on the recommended tab, or surface the flowRec CTA in/above the fixed bar, with a tap target for the `n` destination.

**13. First-minute identity/scope under-stated — no "system design" value prop, jargon-forward, canonical prompts dead-end in search** · FRESH
*Lens: cold-first-session.*
"System design" appears nowhere above the fold. Copy leads with undefined jargon ("Drill the probes", "Choose a room", "Cram"). Search handles components ("rate limiter"→1, "load balanc"→4, "cache"→10) but returns a bare "No results found" for the whole-system prompts a candidate actually types — "url shortener", "design twitter", "search autocomplete" all →0.
*Why it matters:* the "got the link before an interview" user spends 60 seconds deciding what this is and whether it covers their prep; a blank dead-end on their exact question reads as "doesn't have my material" when the components underneath it are all here.
*Direction:* one-line value prop on home; first-run definition of probe/room; a search empty-state that redirects to the app's vocabulary ("No whole-system prompts — try a component: caching, rate limiting, sharding…").

### P3

**14. Continue dock says "Back to the drill" on the very first topic open, before any drill has happened** · FRESH
*Lens: cold-first-session.* Dock reads "KEEP GOING / Back to the drill → / 0 of 21 graded" on a brand-new session (shots/02). "Back to" implies a return that hasn't occurred; "0 of 21 graded" is mildly self-contradictory with "KEEP GOING."
*Direction:* first-visit copy "Start the drill →"; switch to "Back to the drill" only after the drill pane has been entered.

**15. Mobile renders physical-keyboard hint badges (`/` `\` `?`) next to Search/Topic-index/Shortcuts** · FRESH
*Lens: cold-first-session.* Touch devices can't press them (shots/20).
*Disk nuance (important for the fix):* the team **already deliberately deleted** the `@media(max-width:919px){.kbd-only{display:none}}` rule (styles.css:990–995; index.html:64,94) so hardware-keyboard tablets (sub-920 widths) keep keyboard affordances. So a **width** gate is the wrong tool and would re-break that decision — the correct gate is `(pointer:coarse)`/`(hover:none)`, which the finding itself suggests. Low priority, but fix it the touch-specific way.

**16. "Interviewer cuts in mid-answer" toggle is unavailable on mobile** · FRESH
*Lens: mobile-reality · Verified on disk.* `#inttog` is `display:none` on mobile (styles.css:19 `!important` + :679); its siblings Mock run / Tools are present. A phone user can start a mock but can't enable its harder "interrupts mid-answer" mode — a mock-realism parity gap.
*Direction:* expose the toggle inside the mock-run overlay (where the mock runs on mobile), or document as desktop-only.

**17. 6 of 9 pane tabs sit off-screen in the seg strip at load** · FRESH
*Lens: mobile-reality · Verified on disk.* At 360px the `.seg` strip is scrollWidth 976 vs clientWidth 360; only Walkthrough/Probe Drill/Whiteboard show at load (System/Trade-offs/Model/Numbers/Red Flags/30-Second at x336–964). All reachable — tapping auto-scrolls — and a right-edge fade hints overflow. Standard mobile pattern; low severity.
*Direction:* optional overflow/count cue (a "+6" or a one-time first-entry nudge-scroll).

**18. Continue dock / armed Grade legend never announced — `#ndock` is not a live region** · FRESH
*Lens: w2-a11y · Verified on disk.* `<div class="dock" id="ndock" hidden>` (index.html:44) has no role/aria-live/aria-label, so the armed-legend swap and meso "Continue" CTA aren't pushed to AT. **Low/mitigated:** the armed legend is a redundant echo of the drill's own accessible judge buttons; the terminal strips *are* announced via debrief focus; the CTA is Tab- and `n`-reachable. Arguably WONTFIX for the armed legend (announcing a duplicate = noise).
*Direction:* optional `role="status"` on `#ndock` for the CTA swap.

**19. Seg recommendation pip conveys "recommended next" only visually** · FRESH
*Lens: w2-a11y · Verified on disk.* `.seg button.flow-pip:not(.on)::before` (styles.css:326) is a pure ::before dot; the tab's accessible name is unchanged (stays "Probe Drill GRADED"), aria-label null. AT users get no cue. Low impact — redundant with the announced strip and the `n`/CTA text.
*Direction:* a visually-hidden suffix / `aria-describedby` "recommended next" on the pipped tab.

**20. `.flow-go` terminal-strip button falls back to the UA-default focus ring inside the drill/whiteboard shadow** · FRESH
*Lens: w2-a11y · Verified on disk.* `.flow-go` (base-styles.js:167) has no `:focus-visible` rule, and the document's `button:focus-visible{outline:2px solid var(--acc)}` (styles.css:53) can't cross the shadow boundary — so Tab lands a thin ~1px UA outline on a saturated accent-gradient button, while the identical `.nd-go` in light-DOM gets the proper 2px `--acc` ring. Consistent with the drill's other shadow buttons (a pre-existing shadow pattern), but the flow-go strips are new.
*Direction:* add `.flow-go:focus-visible{outline:2px solid var(--acc);outline-offset:2px}` to the shadow-adopted base styles.

**21. `trend.hist` is stored DOUBLE JSON-encoded — benign today, latent footgun** · FRESH
*Lens: data-honesty · Verified on disk.* `trendSave` does `Store.set(TREND_KEY, JSON.stringify(a))` (session-progress.js:471) and `Store.set` stringifies again (store.js:37) — a JSON string wrapping a JSON array string, unique among all keys. It round-trips only because all three readers double-parse to compensate (trendLoad :470; trendSparkHome panels.js:64–65; studyStreak :78–79). No user-visible effect (CPR codes contain no quotes/backslashes), but the "this one key needs a second parse" invariant is undocumented — the next dev who reads it with a bare `Store.get(key, [])` (the pattern every other key uses) gets a string and silently mishandles the trend.
*Direction:* `Store.set(TREND_KEY, a)` + single `Store.get(TREND_KEY, [])`, with a one-time read-migration to unwrap existing double-encoded values.

**22. Resumed drill scoreboard reads 0 Solid / 0 Revisit while every flow surface says "3 of 21 graded"** · FRESH
*Lens: flow-loop · Verified live.* At the resume moment, the drill scoreboard tiles show 0 Solid / 0 Revisit while the dock, pip, and flowRec all correctly say "3 of 21 graded" — the live-working-set (this run) vs canonical-record (all-time) split surfacing as a visible on-screen contradiction, at exactly the moment a returning user is orienting.
*Direction:* seed the resumed scoreboard tiles from `Progress.get` (canonical), or relabel them "this run" so the two numbers read as honestly different counts rather than a contradiction. (Same live-vs-record split family as the trend items #7/#21.)

**23. Seg recommendation pip is anchored for the horizontal strip but orphaned on the vertical sidebar nav** · FRESH
*Lens: design-critic · Verified on disk + screenshots.* The pip is positioned correctly against the label row in the horizontal seg strip, but on the vertical sidebar-nav variant it floats in the padding gutter, detached from its label.
*Direction:* center the pip against the label row for the sidebar variant (variant-specific positioning).

**24. `--accbg` wash does double duty — the dock and the ACTIVE seg tab share the same accent-tint background** · FRESH
*Lens: design-critic · Verified on disk.* The same `--accbg` token paints two different meanings a few px apart: the Continue dock background (styles.css:590) and the active seg-tab background (styles.css:369). One token, two semantics, adjacent on screen — and part of why the dock reads as a peer surface rather than its own tier (see #3).
*Direction:* differentiate — give the dock its own surface token so "active tab" and "resume affordance" don't share a wash.

**25. Absolute load feel — 3.3–5.1s cold start, ~1.9s mid-drill reload-restore** · FRESH
*Lens: perf-midrange · Measured live (4× CPU throttle).* Cold load ran 3.3–5.1s across four runs; a mid-drill reload restored the cursor **correctly** (to Probe 6/22) in ~1.9s. The cost is parse+eval of the inlined ~11.7 MB single-file bundle.
*Why it's a nit, not a defect:* the restore is *correct* (cursor landed exactly — this is also the live confirmation that #1's "reload loses your place" tail is benign), and 3–5s under a 4× throttle is the offline single-file tradeoff working as designed.
*Direction:* no action unless cold-start becomes an explicit product target; if so, the lever is the inlined-bundle parse cost, not the app logic.

**26. Saga's walkthrough code is canonical/textbook where the flagship's is lived-system** · FRESH
*Lens: content-depth · Verified in the live bundle.* An optional texture note, **not** a parity gap (parity is certified — see the verdict): the Saga topic's walkthrough code is clean/textbook (`def run_saga(steps, ctx)`) where the hand-coded flagship's is lived-system (`const pass = new PassThrough(); … // ONE disk read`, `GRACE = 3600e3`). The reasoning and coverage match; only the code's *grounding texture* differs.
*Direction:* optionally ground Saga's walk code in a lived-system snippet to match the flagship's texture. Purely discretionary — this item does not belong to any wave below.

---

## Reconciliation against the known books

| # | Item | Status | Book |
|---|------|--------|------|
| 12 | Mobile NextUp dock hidden | **CONFIRMS-KNOWN** | (c) Beat 4 severed — mobile has no NextUp surface |
| all others (25) | — | **FRESH** | — |

**fresh: 25 · confirms-known: 1 · known-thread movement: (a) now sampled + certified · (c) rediscovered (with measured cost) · (b) and (d) still not re-found**

**Known threads and what the completed sweep signals:**

- **(a) 11 residual parity-ratchet items (`test/parity_debt.json`)** — previously "invisible to UX/mobile/a11y/data eyes; lives in the un-audited content space (possibly the dropped 8th lens)." **The content-depth lens has now entered that space** and **certified lived-quality parity on a 2-topic sample** — Saga reads at the hand-coded flagship's depth, and every distinctive deep passage survives intact in the shipped bundle, so *the compiler is not dropping authored content*. This is a strong **positive counter-signal** to the fear thread (a) encodes. It is **not** a resolution: it's a lived-quality certification of a sample (2 of 38), not a line-by-line reconciliation of the 11-item ledger — those specific ratchet items still weren't individually re-checked. Thread (a) moves from "un-audited / invisible" to "sampled-and-certified positive, ledger still formally open."
- **(b) Deferred visual-wave nits (overlay P3s ED1–ED4, 5px stage-head flourish, scroll-top *cache* edge, instrument-promotion decisions)** — still **not re-found**, including by the now-run design-critic lens, which surfaced *different* fresh design items (dark-mode hierarchy #3, token double-duty #24, sidebar pip #23, copy duplication #11) rather than ED1–ED4 / the 5px flourish / the cache edge. *Signal: genuinely low-salience* — even a dedicated design critique was drawn to structural/theme issues, not those parked nits. **Note the near-miss (unchanged):** the FRESH FAB collision (#5) is a *different* defect on the same `#scrolltop` element than the known "scroll-top cache edge" (positioning/z-index vs stale-scroll-position). The cache edge itself stayed un-rediscovered.
- **(d) D5 parked — home CTA Enter = "do the next thing" adapter** — still **not re-found.** *Signal: untested surface.* The `n`-key items (#6, #10) are adjacent (same "do the next thing" flow-nav family) and the flow-loop lens exercised the full `n` spine, but no lens drove the home-CTA **Enter** path specifically.

Only **(c)** was rediscovered — and with a *fresh measurement* (guidance is thinner, not absent), which upgrades it from "recorded deferral" to "felt, quantified gap." The completed sweep's biggest net move is on **(a)**: the content-fidelity space is no longer a blind spot, and what it saw was good.

---

## Candidate next-wave directions

Six coherent shapes. Of the 26 items, 25 land in exactly one wave; the sole exception is **#26** (Saga code-texture), a discretionary content nicety parked on its own. Effort is rough (S ≈ hours, M ≈ half-day-plus).

**D1 — "No dead ends" (trap & routing integrity) · S–M · highest urgency**
Items **#1** (focus-mode exit outside the sidebar + Esc) + **#5** (scroll-top FAB clear of the fixed mock bar on mobile). Both are "user gets stuck or silently mis-routed," and both bite hardest on mobile. Removes the run's only true trap and its one silent wrong-action. Mostly CSS + a persistent chip + one keydown.

**D2 — "Grade at the moment of truth + cold-open clarity" (core-loop surfacing + first 60s) · M · highest product value**
Items **#4** (compact grade affordance at the reveal point; mobile bottom bar → Missed/Shaky/Solid at judgment; above-fold quick-grade) + **#13** (home value-prop + search empty-state) + **#14** ("Start the drill" first-open copy). Protects the spaced-repetition mechanic the entire app is built on *and* sharpens the first minute so a linked-in candidate knows what this is. Touches the drill reveal flow, the mobile bar state, and home copy.

**D3 — "First-visit performance" (activation & build latency) · M · NEW from the perf lens**
Items **#2** (prewarm probe 1 so drill activation is a display toggle — the P1) + **#8** (idle-prebuild the next-likely pane) + **#9** (profile the `setTopic` bank-reseed + first-walk render to tighten the tail) + **#25** (absolute cold-start feel — parked unless cold-start becomes a target). One profiling-led sweep over the first tour of a topic, which is the slowest the app ever is. The judge→advance hot path is already healthy (~44ms) — only an optional first-grade prewarm remains.

**D4 — "W2 flow-grammar correctness & dock/legend polish" · S–M**
Two priority **correctness** anchors first: **#6** (clear `_judgeOn` on `renderDebrief` / gate `atJudgment` so the debrief classifies `meso` — one fix silences the phantom legend *and* revives `n` at the terminal) + **#22** (seed the resumed scoreboard from `Progress.get` or relabel "this run"). Then dock/legend **polish**: **#3** (flatten the dark dock below the Mock CTA — the P1) + **#11** (dock/strip mutual exclusion — *confirm co-occurrence on a true terminal first*) + **#24** (`--accbg` double-duty differentiation) + **#23** (center the seg pip on the sidebar variant). Plus the a11y-docs tidy carried from the pre-supplement sweep: **#10** (N row in Shortcuts) + **#18** (`#ndock` `role="status"`) + **#19** (pip text-equivalent) + **#20** (`.flow-go` shadow focus ring). One coherent pass over today's W2 chrome — correctness leads, polish follows. Largest wave, but almost entirely additive markup/CSS once #6 lands.

**D5 — "Mobile parity" (the Beat-4 revisit) · M**
Items **#12** (mobile NextUp chip + `n` tap target — the recorded thread-c decision, now with a measured cost) + **#15** (kbd-badge `pointer:coarse` gate) + **#16** (inttog in the mock overlay on mobile) + **#17** (seg-tab overflow cue). Closes the desktop↔mobile gap and reopens the deliberately-deferred mobile-dock question as a real design decision, not a default.

**D6 — "Trend/Compare integrity" (data honesty) · S–M · highest trust value**
Items **#7** (topic-tag each CPR point; group or suppress cross-topic delta coloring) + **#21** (fix the double-encode + migration). Same subsystem (session-progress.js trend + store). Stops the app asserting false "regressions." (#22's live-vs-record split is the same family but rides D4 with the other flow-loop fix.)

**Suggested sequencing:** D1 first (the only user-visible dead-end + silent wrong-action), then D2 (core mechanic + first minute). Pull the two **correctness** items out of D4 — **#6** (terminal keyboard spine) and **#22** (resumed scoreboard) — to ride early alongside D6 (trust), since both are "the app is behaving wrong," not polish. Then D3 (first-visit perf) and the D4 **polish** remainder as a cheap parallel sweep, with D5 as the larger design-bearing wave that also settles the Beat-4 book. #26 is discretionary and can ride any content pass.

---

*Method note: this file merges two passes. The first workflow run delivered 4 lenses (cold-first-session, mobile-reality, w2-a11y, data-honesty); its other four slots stubbed (3 schema-only `{title,where,evidence}` stubs, discarded as harness noise) or died (perf-midrange). Those four were re-run as hardened standalone agents and returned real results, folded in above. The 15 original items were re-verified against `src/` on disk; the 11 new items rest on the appropriate instrument for each lens — flow-loop and design-critic carry disk root-cause traces (drill/logic.js `_judgeOn`/`atJudgment`, shell.js flowGo gating, styles.css `--accbg` line refs) plus live/screenshot receipts, and perf-midrange rests on live measurement under a 4× CPU throttle (not a disk artifact). The cold-lens `n`-key "inert everywhere" reading was reconciled against the a11y-lens live proof — `n` works, it's contextual and undocumented (#10) — and the flow-loop lens then found the one place `n` genuinely IS inert (the drill debrief, #6), a real bug distinct from that repro artifact. The P1 focus-trap's "reload loses your place" tail was down-weighted against the deep-link + cursor-restore system, which the perf lens independently confirmed live (reload restored the cursor exactly to Probe 6/22, #25). No other receipt required correction.*
