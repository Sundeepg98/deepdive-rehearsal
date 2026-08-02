# THE JOURNEY-COVERAGE MATRIX -- what the 76-check gate actually walks of the lived product

Date: 2026-08-02. Author: synthesis pass (third agent of the e2e-journey-coverage workflow).
Status: DRAFT FOR TEAM-LEAD REVIEW -- not committed by this agent.

## What this is

Two independent passes were run blind to each other:

- **(A) the journeys** -- a black-box browser drive of the shipped
  `deepdive_content_pipeline_rehearsal.html` at 1280x800 and 390x844, plus source reading of
  `src/scripts/app/*` for persistence and decay semantics. Fifteen journeys, J1..J15, with
  fourteen measured defects. Persisted at `_audit/2026-08-02-journey-enumeration.md`.
- **(B) the checks** -- a check-by-check read of all 76 gate entries
  (`test/check_all.py`: `NATIVE_CHECKS` 30, `BROWSER_CHECKS` 46), classified WALKS-A-JOURNEY-SEGMENT
  vs STATE-PROBE vs STATIC, with record class, input fidelity and viewport for each.

This document crosses them. Every verdict below is anchored either to a line the enumeration
measured or to a grep over `test/` and `src/` run for this pass; the load-bearing greps are
reproduced in Appendix A so a reviewer can re-run them rather than trust this file.

## Verdict vocabulary

| Verdict | Means |
|---|---|
| **WALKED** | Some check drives the app THROUGH this segment -- the transition happens under test, by trusted input, an in-page `el.click()`, or the app's own API (`switchTab` / `Router.navigate` / `TopicRegistry.setTopic` / `openMock`). Input fidelity is recorded but does not change the verdict. |
| **STATE-ONLY** | The end state is verified -- constructed by seeding, or read after the fact -- but no check performs the path that produces it. A seeded home is state; a home you graded your way to is a walk. |
| **UNWALKED** | Nothing in the 76 touches it. Selector, API and behaviour are all absent from the test tree. |

Segments are the enumeration's own numbered steps, split where one step contains affordances with
genuinely different coverage (marked `a`/`b`/`c`). 139 segments across 15 journeys.

---

# PART 1 -- THE MATRIX

## J1 -- First cold open: orient, understand the promise, reach a first drill

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | File opens from disk, renders, 0 console errors, no horizontal overflow | WALKED | render, overlay_deadzone (S3 cold arrival + ink floor), cold_open, back_deadend (painted-home floor) | The gate loads over real `file://` (`_boot.cjs` `pathToFileURL`), so the origin is honest. |
| 2 | The promise line is present, names the domain, sits above the fold | WALKED | cold_open (`.hm-lead` + plant) | One of the few cold-copy assertions in the gate. |
| 3 | START HERE hero copy (the opening sentence and its paragraph) | STATE-ONLY | home_claims (hero census, judgeHero), visual_regression (home light/dark) | Measured for clipping, never for what it says on a cold record. |
| 4 | The single START card, autofocused, first tab stop after the skip link | WALKED | focus_ring (home halo: no ring pre-keystroke, then Shift/Tab), overlay_deadzone (first real click reaches `.hm-cta`), cold_open | |
| 5 | ALTITUDE empty rails and the empty-state explanation | STATE-ONLY | home_claims (`empty` seed, judgeVerdict/judgeHeader/judgeCensus + 6 aborting mutants), home_reflow, visual_regression | The strongest battery in the gate -- and it never earns the state. |
| 6 | COVERAGE BY ROOM cards and their arithmetic | STATE-ONLY | home_reflow (overspill), focus_ring / latent_arial (`.hm-room` present) | The numbers on these cards have **no claims judge**; only their pixels are guarded. |
| 7 | LIBRARY: 46 cards, six room headers, the filter box | STATE-ONLY | home_reflow, focus_ring, at_name_hygiene (source-level names) | The filter box (`ix`-scoped) is referenced by no check at all. |
| 8 | Status bar RECORD line and the offline promise | STATE-ONLY | home_claims (judgeCensus), home_reflow (`.hm-status` internal overflow, 9 widths x 2 themes) | home_reflow exists *because* this line once clipped itself. |
| 9a | Search / Shortcuts / Theme / Topic index openers | WALKED | search_deadend (`/`, `\`), overlay_keyboard (trusted Enter on 7 openers), e2e_interactions (theme x2) | |
| 9b | The 8-step guided tour (`G`) | **UNWALKED** | -- | `tour` / `TourGuide` / `#tourov`: zero references in the whole test tree. |
| 10a | Click START -> `#event-driven/walk` | WALKED | overlay_deadzone (first-click hash move), search_deadend (pick -> land) | |
| 10b | The four localStorage keys a first navigation writes | **UNWALKED** | -- | Including the stray `viewseen.content-pipeline` for a topic never opened. `viewseen` appears only in visual_pane_smoke, and never as an assertion about the write set. |
| 11 | Landing on the walkthrough: topic shell, nine panes, both rails, chrome flip | WALKED | render (9/9 panes), rail_integrity (414 view x topic combos), seg_state, sidebar_geometry, chrome_metrics, fold_budget | |
| 12 | `Start the drill ->` / the flow recommendation reaches the drill | WALKED | mobile_nextup (real click on `#ndm`, asserts the pane becomes `nextUp().rec.tab`), flow_data S7 (`n`), flow_a11y (dock CTA), flow_contract | |

**J1: 7 WALKED / 5 STATE-ONLY / 2 UNWALKED (14).**

## J2 -- The daily return: continue where I left, see standing

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1a | A fresh tab lands on `#home` | WALKED | back_deadend (direct entry, empty referrer), overlay_deadzone (3 arrivals), render | |
| 1b | `home.landing = "resume"` boots straight into `nav.last` | **UNWALKED** | -- | `home.landing` and `hm-skip-cb`: zero. touch_floor measures `.hm-skip label` size only -- the control is sized but never operated. |
| 2 | The hero, both recency forms, with the next probe quoted | WALKED | flow_cursor (Beat 2: grade 5 -> set nav.last -> render -> read `.hm-since`), home_claims (13 pinned + 24 PRNG records, judgePosition/judgeHero/judgeEntailment) | Breadth is state; one earned path exists. |
| 3 | ALTITUDE derived sentence ("Staff is the thin rail...") | STATE-ONLY | home_claims (judgeVerdict, 5 aborting mutants incl. a verdict quoting one rail's figures for another) | Never earned; entirely seeded. |
| 4a | STILL SHAKY panel rendered WITH content | STATE-ONLY (thin) | focus_ring (mature seed, one revisit entry) | **Every home_claims seed writes `revisit: []`** (home_claims.cjs:74,87,100,119,131,143,155,174,190,201) -- including the seed with `shk: 3`. No claims judge has ever seen this panel populated. |
| 4b | Clicking a topic chip -> that topic's drill | **UNWALKED** | -- | `hm-chip` appears only in at_name_hygiene, a source check on accessible names. |
| 4c | Signal chips; the silent truncation at 234 flagged | **UNWALKED** | -- | |
| 5 | RECENT SESSIONS: week goal, the `- N +` stepper, the bar, the sparkline | **UNWALKED** | -- | `ix-goal`, `data-goal`, `weeklyGoal`, `goal.weekly`: zero, all four. |
| 6 | `Refresh -- drilled clean a while ago` pills | **UNWALKED** | -- | `ix-due` only in at_name_hygiene; `dueReview` zero. |
| 7 | COVERAGE BY ROOM with progress | STATE-ONLY | home_reflow | |
| 8a | Library card badges (`9/21`), notes pencil | STATE-ONLY | home_reflow, at_name_hygiene | |
| 8b | The `STARRED n` block above the rooms | **UNWALKED** | -- | `ix-star` only in at_name_hygiene; `Bookmarks.` zero. |
| 8c | The per-card reset glyph on a library card | STATE-ONLY | focus_ring (focuses `.ix-c-reset`) | Focused, never activated. |
| 9a | Click RESUME -> the route moves | WALKED | overlay_deadzone S1 (seeded returning user, real mouse click at the painted centre of `.hm-cta`) | |
| 9b | ...and lands at the stored cursor | WALKED | scoreboard_resume (reload -> probe 4), flow_cursor (drill cursor leave/return, record byte-identical) | |
| 9c | ...into the FULL set, `THIS RUN 0 / 0 / 21` | WALKED **and ruled** | scoreboard_resume (`.score-cap` "This run" relabel; watched-RED against the pre-fix build) | The relabel was the chosen fix over seeding the tiles, and the reasoning is written into the check's header. Do not re-litigate. |

**J2: 5 WALKED / 5 STATE-ONLY / 6 UNWALKED (16).**

## J3 -- The drill loop: probe, think, reveal, grade, next

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1a | Entering the Probe Drill pane | WALKED | fold_budget (real tap at the painted centre, 360 + landscape), render, seg_state, mobile_nextup, chrome_metrics | |
| 1b | Mode tabs Study / Mock round / Quick 5 | WALKED | progress_merge (`[data-m="quick"]`), flow_handoff (`[data-m="mock"]` -> `#vrestart`) | |
| 1c | FOCUS BY LEVEL chips (All / SDE2 / SDE3 / Staff) | STATE-ONLY | progress_merge (`data-tier`) | The only reference to `data-tier` in the tree. |
| 2 | The probe card; the answer is hidden before you commit | WALKED | grade_reveal (reveal required before `#jg` exists) | |
| 3 | The think/check boundary -- one full-width Reveal | WALKED | grade_reveal (in-pane grade row present at reveal; the dock stays quiet) | |
| 4a | Reveal -> model answer, push-further, grade row | WALKED | grade_reveal, flow_data, flow_a11y | |
| 4b | The grade row is not COVERED by anything | WALKED | grade_reveal (two-sided hit test, light + shadow `elementFromPoint`, polled to rest; plant hides `.judge`) | The probe calls `scrollIntoView({block:'center'})` **first** -- it proves nothing occludes the button, not that the button is in frame. |
| 4c | The grade row is IN VIEW without scrolling | **UNWALKED** | -- | Measured by hand at y=834 on a 800px viewport and y=818 on an 844px viewport. See GAP-1. |
| 4d | Grade buttons clear the 44px tap floor at the judgment moment | WALKED | mobile_nextup (drives `#adv` to the judgment moment at 360 and 390; plant shrinks them) | |
| 5 | Grade -> record write, auto-advance, `THIS RUN` updates | WALKED | flow_cursor, progress_merge, card_identity, flow_data S3, scoreboard_resume | The best-covered mechanism in the product. |
| 6a | YOUR DRILL SET tiles; in-session flag markers | STATE-ONLY | flow_cursor, at_name_layout_probe (`dn-step`) | Referenced for the cursor class, not asserted as flags. |
| 6b | Flag markers after a reload | **UNWALKED** | -- | `drill/logic.js:552-556` `teardownTopic()` blanks `this.revisit`; `:563` `renderNav()` flags from `this.revisit`, never from `progress.<topic>.revisit[]`. See GAP-2. |
| 7a | `Drill my N flagged probes` in the same session | WALKED | progress_merge (`#dweak` clicked, subset size asserted `< bank`), flow_handoff, flow_contract (W3 debrief) | |
| 7b | The same button after a reload | **UNWALKED** | -- | `logic.js:1019` labels it from `this.shk` (a this-run counter). progress_merge's `reachDebrief` **re-runs the whole bank in the current page load** and says so in its own comment. |
| 8a | Switching mode mid-run does not damage the record | WALKED | progress_merge (Quick 5 fumble arm: `shk === 1`, `got` decremented by exactly 1) | |
| 8b | ...but `THIS RUN` resets and `FOCUS BY LEVEL` still reads `All 21` in a 5-probe set | **UNWALKED** | -- | |

**J3: 10 WALKED / 2 STATE-ONLY / 4 UNWALKED (16).**

## J4 -- Weak-spot triage

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | Read STILL SHAKY: which topics are weak, how stale | STATE-ONLY (thin) | focus_ring only | See J2.4a. |
| 2 | Chip -> drill, expecting the flagged pile | **UNWALKED** | -- | Two surfaces disagree and the actionable one is wrong. GAP-2 + GAP-3. |
| 3 | Same-session triage: grade -> re-drill -> the set collapses | WALKED | progress_merge, flow_handoff, flow_contract | |
| 4a | `P` Session progress: the three-way parity of its numbers | WALKED | flow_contract (`openSession()` / `renderSession()` 3-way parity), overlay_keyboard (trusted Enter on `#sessopen`), trend_integrity | |
| 4b | ...and that its Revisit list survives a reload | **UNWALKED** | -- | The enumeration's "other honest surface" is honest by reading the record; nothing asserts it. |
| 5 | Cross-topic drill from the home | WALKED **and ruled** | search_deadend (X3/F: a cross pick from `#home` leaves the home AND opens the drill; a plant proves a pick from a topic route moves nobody) | The enumeration flags this as feeling broken; it is a pinned contract with a negative control. Any arm here must argue with the ruling, not around it. |
| 6 | Room-scoped `Cram ->` (`data-cross="group:<room>"`) and the weak-scoped cross drill (`data-cross="weak"`) | **UNWALKED** | -- | search_deadend covers `data-cross="1"` only (panels.js:352 and :256 are the two uncovered values). |
| 7 | The decay pills as a triage entry point | **UNWALKED** | -- | |

**J4: 3 WALKED / 1 STATE-ONLY / 4 UNWALKED (8).**

## J5 -- The mock cycle

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | Open the mock; the clock starts | WALKED | e2e_interactions, overlay_keyboard (trusted Enter), overlay_deadzone (open/interact/close/act-immediately), entity_leak | |
| 2 | Beat 1 of 7: kind badge, instruction, buttons | WALKED | e2e_interactions (up to 40 beats), flow_handoff | |
| 3 | The `Interviewer cuts in mid-answer` pre-flight toggle, and its persistence | **UNWALKED** | -- | token_liveness reads `.inttog-dot::after` as a *token* receipt; at_name_hygiene names it. Nothing toggles it; nothing reloads after. |
| 4 | Seven beats: Space to check, Enter to advance | WALKED | overlay_keyboard (real `keyboard.press('Space')` -- "the interaction the mock run exists for"), e2e_interactions | The gate's ONLY trusted Space, and it is here rather than in the drill. |
| 5 | `Round complete`: time, curveball receipt, self-score 0..7 | WALKED | e2e_interactions (perfect score -> verdict), flow_handoff (score 6 and score 1) | |
| 6a | Scoring writes `mock.<topic>` and re-keys per topic | WALKED | flow_data S5 (openMock -> beats -> top score -> closeMock -> openMix -> setTopic away and back) | |
| 6b | Closing UNSCORED writes `score: null` and the panel says "unscored" | **UNWALKED** | -- | The honesty property the enumeration checked by hand. |
| 7 | `Esc` mid-run discards the run | **UNWALKED** | -- | No check presses Escape inside a live mock; e2e_interactions closes from the END screen (`mbclose2`). |
| 8 | The score feeds the CPR1 code and Compare | STATE-ONLY | trend_integrity (4 constructed `trend.hist` shapes; one live `trendCapture()` after a single earned grade) | The drill slice of the code is earned; the mock slice is not. |

**J5: 5 WALKED / 1 STATE-ONLY / 3 UNWALKED (9).**

## J6 -- Consult usage mid-drill

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1a | The companion rail says the right thing for this view AND this topic | STATE-ONLY | rail_integrity (414 combos, adversarially primed with a foreign note first, six rail slots read as TEXT) | Drives the app's APIs, performs no user action -- but this is the check that caught the 266/414 wrong-note defect. |
| 1b | Collapse / reopen and `cmp.collapsed` persistence | STATE-ONLY | focus_ring (toggles `body.cmp-collapsed` to reach `.cmp-fold` / `.cmp-reopen`) | The class is set directly; the control is never clicked; persistence is unasserted. |
| 2 | In-probe consult: `Interviewer pushes further` | WALKED | grade_reveal, flow_data | |
| 3 | In-walkthrough disclosures (`See the code`, model script) | STATE-ONLY | click_drift (control picking inside pane shadow roots), shadow_css_guard, render | |
| 4 | Pane-hop preserves the drill cursor | WALKED | flow_cursor (leave/return, `di` restored, record byte-identical; negative control removes `pos.<id>`), seg_state | |
| 5a | The search overlay as a consult surface | WALKED | search_deadend (real `/`, real typing, ArrowDown, Enter; and `\` + a hit-tested card click) | |
| 5b | Snippet text fidelity (no raw `<b>` / `<i>` printed as literal text) | **UNWALKED** | -- | entity_leak detects `&name;` / `&#nnn;` only. Reproduced on `idempot` and `exactly-once`. |
| 6 | `Scope it first` | WALKED | cram_scope_distinct (open once, switch all 46 topics underneath, awaiting the real `deeptopicchange`), cram_surface, overlay_keyboard | |
| 7 | The one-page cram sheet and its Print | WALKED | cram_scope_distinct, cram_surface (+ height debt), cram_fit (virgin first open, both orientations), print_truth | |
| 8 | `Esc` returns you to the exact probe; single keys pause while a panel is open | WALKED | overlay_deadzone (presses `w` under an OPEN modal and requires it to do nothing), overlay_keyboard (focus restored to the trigger), shadow_css_guard | |

**J6: 6 WALKED / 3 STATE-ONLY / 1 UNWALKED (10).**

## J7 -- Keyboard-only, end to end

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | Tab -> skip link -> `main#home` | STATE-ONLY | focus_ring (Tab on a seeded home; focused rect must intersect), heading_tree, at_name_hygiene (source) | The link is never activated. |
| 2 | Tab to the autofocused CTA, Enter -> topic | WALKED | focus_ring, overlay_keyboard (focus + trusted Enter), search_deadend | |
| 3 | `W` -> drill, `Space` reveal, `1`/`2`/`3` grade, auto-advance | **UNWALKED** | -- | The full trusted-key census of the gate is 12 presses: Enter x5, Tab x4, Backslash x3, `r` x2, ArrowDown x2, `w`, Space, Shift, `n`, Escape, End, `/`. **No digit is ever pressed.** The Space that exists is the mock's. The product's fastest path is exercised only through `el.click()` on `#adv` / `#jg`. |
| 4a | A pane key that really fires | WALKED | transition_deadzone (real `r` during a switch, and the app must respond), overlay_deadzone | |
| 4b | The other eight pane keys and `V` | **UNWALKED** | -- | seg_state uses `Router.navigate`; render clicks the tabs. |
| 4c | Left/Right stepping the walkthrough | **UNWALKED** | -- | flow_cursor uses `w.next()`; flow_handoff clicks `#wnext`. |
| 5 | `N` -- go to your next step | WALKED | flow_data S7 (real `n`, then hash + title + `history.length` moved, then `goBack` returns) | |
| 6a | `/` and `\` | WALKED | search_deadend | |
| 6b | `Esc` | WALKED | shadow_css_guard, overlay_keyboard, no_dead_ends | |
| 6c | `P` `F` `D` `Ctrl-P` `G` `[` `]` `H` | **UNWALKED** as bindings | -- | Their targets are reached by API or by click (FocusMode.toggle, `#printqa`, `#sessopen`); the binding layer is not asserted. |
| 7 | Mac parity (Ctrl answers to Cmd) | **UNWALKED** | -- | A printed claim with no arm. |

**J7: 5 WALKED / 1 STATE-ONLY / 5 UNWALKED (11).**

## J8 -- The interrupted journey

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | Interruption mid-drill | WALKED | scoreboard_resume (grade 3, `posFlush()`, dispatch visibilitychange, real `page.reload()`) | |
| 2 | Reopen: hash wins, cursor exact | WALKED | scoreboard_resume, flow_cursor, back_deadend (5-reload series, flat history, then a painted home) | |
| 3a | `THIS RUN` reads 0/0/21 after the reload | WALKED **and ruled** | scoreboard_resume (`.score-cap` caption asserted; watched-RED pre-fix) | |
| 3b | ...and the flags are gone and the re-drill says `0` | **UNWALKED** | -- | GAP-2. |
| 4 | The home confirms nothing was lost | STATE-ONLY | home_claims (seeded), scoreboard_resume (reads the record, not the home) | |
| 5a | New-tab recovery -> `#home` hero with the correct position sentence | STATE-ONLY | home_claims (`staleCursor` seed, judgePosition + an aborting mutant), back_deadend | |
| 5b | A hard crash firing neither `visibilitychange` nor `pagehide` loses the session point | **UNWALKED** | -- | `pagehide`: zero references. Two checks dispatch `visibilitychange`; nothing models its absence. |

**J8: 3 WALKED / 2 STATE-ONLY / 2 UNWALKED (7).**

## J9 -- The multi-day arc

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1a | One page-load produces one `trend.hist` point, updated in place, only with activity | WALKED | trend_integrity (one earned grade then a live `trendCapture()`, read back through `openSession()` / `#sscmpout`) | |
| 1b | Five reloads in one sitting produce five "sessions" in the sparkline | **UNWALKED** | -- | |
| 2 | Streak: consecutive calendar days, reset at 2+ days stale | **UNWALKED** | -- | `studyStreak`: zero. Computed by the app, rendered nowhere the enumeration could find, asserted by nothing. |
| 3 | Week goal: target, stepper (clamp 1..20), the two renderings agreeing | **UNWALKED** | -- | `weeklyGoal` / `goal.weekly` / `ix-goal` / `data-goal`: zero, all four. **The shipped copy defect lives here** (`panels.js:160` appends `' drilled this week'` to a `goalPhrase()` that already returned a complete sentence in the goal-met branch). |
| 4 | Decay: `dueReview()` -- 100% done, zero flagged, `ts` >= 7 days | **UNWALKED** | -- | Including the `ts`-restamp hazard the source itself calls out. |
| 5 | Age surfacing (`0d` / `4d` / `2w`) on every chip | **UNWALKED** | -- | |
| 6 | The hero's recency switch (today vs `9d ago`) | STATE-ONLY | home_claims (judgePosition, judgeEntailment) | |
| 7 | Cross-day continuity: the CPR1 code, the paste box, Compare | STATE-ONLY | trend_integrity (4 seeded shapes incl. legacy double-encoded and foreign-topic points) | Nothing types a code into the paste box. |

**J9: 1 WALKED / 2 STATE-ONLY / 5 UNWALKED (8).**

## J10 -- The file's own journey

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | Copy the file elsewhere; it opens COLD | STATE-ONLY | 24 cold-record checks boot into exactly this state | The state is ubiquitous; the move is never performed. |
| 2 | Export a backup | **UNWALKED** | -- | `Store.dump`: zero references in the entire test tree. |
| 3 | Import a backup; the confirm; the MERGE semantics | **UNWALKED** | -- | `Store.restore`: zero. |
| 4 | The lossless round trip | **UNWALKED** | -- | Verified once by hand; never by the gate. |
| 5a | Legacy / shifted records migrate correctly on boot | WALKED | card_identity (seeds a v1 index-keyed record and a SHIFTED v1 record, then BOOTS so the eager migration runs), flow_data S6 (legacy `mock.last` / `mix.log` discarded, idempotent on a second reload) | |
| 5b | A record whose card hashes match nothing shipped -> four panels disagreeing | **UNWALKED** | -- | `0 solid / "Nothing graded yet"` beside `1 of 7 started, 8% drilled`. |
| 6 | `Copy link` writes an absolute `file:///D:/...` path | **UNWALKED** | -- | `copyLink` / `copy-link`: zero. |
| 7 | `Save as PDF` / `Print Q&A` | WALKED | print_truth (A4 content box 681x1009, real `page.pdf`, `/Type /Page` leaf count, last-section-on-final-page, the accidental Ctrl-P path, and the Print Q&A popup captured and re-emulated) | The most rigorous single journey in the gate. |

**J10: 2 WALKED / 1 STATE-ONLY / 5 UNWALKED (8).**

## J11 -- Leaving: what state a session leaves behind

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | The first-navigation write set | **UNWALKED** | -- | |
| 2 | Per-grade writes | WALKED | flow_cursor (record byte-identical across leave/return), progress_merge, card_identity (grades survive a bank REORDER + INSERT, matched by author signal) | |
| 3 | `wbprog` / `mock` / `mix` writes | WALKED | flow_data S4/S5, flow_evidence (recomputes the whiteboard receipt independently from raw localStorage) | |
| 4 | `trend.hist` on hide/close | WALKED | trend_integrity, scoreboard_resume + e2e_interactions (dispatch `visibilitychange`) | The `visibilitychange` half only. |
| 5a | Theme and text zoom persistence | WALKED | e2e_interactions (toggle x2, `A+`), room_browser / visual_regression / cta_contrast / dock_contrast (seeded) | |
| 5b | Notes, bookmarks, `goal.weekly`, `home.landing`, `cmp.collapsed` | **UNWALKED** | -- | Notes overlay is opened only by shadow_css_guard, to census CSS classes. |
| 6 | Nothing leaves the machine | **UNWALKED** | -- | No `page.route`, no request listener, no offline assertion anywhere. The property holds incidentally (the harness runs on `file://`); it is never *checked*. |
| 7a | `Reset all saved progress` -- the confirm, and what it actually leaves | **UNWALKED** | -- | `clearAll`: zero. The measured truth is 4 keys one second later, including a working resume pointer into the topic you just wiped. |
| 7b | The per-card reset glyph: destructive, no confirm, undo toast | STATE-ONLY | focus_ring (focuses `.ix-c-reset`) | Focused; never fired; the toast is never seen by the gate. |
| 7c | `Clear this session & start fresh` | **UNWALKED** | -- | |
| 8 | Degraded storage: the banner, the in-memory fallback, the post-reload loss | **UNWALKED** | -- | `StorageNotice`: zero. `Store.degraded()` exists and no check calls it. |

**J11: 4 WALKED / 1 STATE-ONLY / 6 UNWALKED (11).**

## J12 -- The phone-in-transit arc (390x844)

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | Mobile header strip | STATE-ONLY | render (320/360/375/390/430), visual_regression (mobile light/dark) | |
| 2 | The bottom tab bar (TODAY / ALTITUDE / LIBRARY / INDEX) | **UNWALKED** | -- | `.hm-tabs` appears only in home_reflow, as an overflow probe. `#hometabs`: zero. Four controls, never operated. |
| 3 | One-column stacking, no horizontal overflow | STATE-ONLY | render, home_reflow (9 widths x 2 themes; two mutants incl. a 900px child inside the FIXED rail, invisible to `scrollWidth`) | |
| 4 | Entering a topic on a phone: pane strip, compact header, companion accordion, bottom bar | WALKED | fold_budget (real taps, both orientations), chrome_metrics (`--chrome-top/bot` vs the live bars, +3px passes / +20px fails), mobile_nextup, cram_fit | |
| 5a | Grade buttons clear 44px at the judgment moment | WALKED | mobile_nextup | |
| 5b | The grade row's POSITION against the live band | **UNWALKED** | -- | GAP-1. fold_budget guards `.qq` (the question) and `#adv` (Reveal); the judgment row is outside its scope. |
| 6a | `#toolsfab` is reachable and nothing covers it | WALKED | mobile_nextup (hit test at the painted centre), no_dead_ends (rect overlap + two `elementFromPoint` tests against `#mockopen`) | |
| 6b | The Tools sheet's fourteen items | **UNWALKED** | -- | render's own header calls `#toolsfab` "the ONLY entry point to 12 tools"; the gate opens it never. |

**J12: 3 WALKED / 2 STATE-ONLY / 3 UNWALKED (8).**

## J13 -- The reconstruct arc (Whiteboard)

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | Enter the whiteboard; header and counter | WALKED | flow_data S4, flow_handoff, flow_evidence, card_identity, click_drift | |
| 2 | Nine cues with Reveal / Drew it / Missed | WALKED | flow_data S4 (`.wb-rev` then `.wb-got`/`.wb-miss` for every `#wblist li`), progress_merge | |
| 3 | Reveal is required before marking | WALKED | the RUN_WB order in flow_data / flow_handoff / card_identity | |
| 4 | Counter, Session Progress card, the CPR1 whiteboard slice | WALKED | flow_evidence (the ok-verdict strip's claim recomputed independently from raw localStorage; a negative control poisons the record), flow_data | |

**J13: 4 WALKED / 0 STATE-ONLY / 0 UNWALKED (4).** The only journey with no hole.

## J14 -- The exam-eve cram arc

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | The per-topic cram sheet and Print | WALKED | cram_scope_distinct, cram_surface, cram_fit, print_truth | |
| 2 | `Cram ->` per room | **UNWALKED** | -- | `data-cross="group:<room>"` (panels.js:352). |
| 3 | The 30-Second pane | STATE-ONLY | render (pane sweep), rail_integrity (414 combos), visual_regression | Never entered by a hit-tested action. |
| 4 | `Print Q&A` (Ctrl-P) | WALKED | print_truth ARM D (stub `window.print`, click `#printqa`, capture the popup, emulate print, measure token-driven typography) | |
| 5 | Mixed fire | WALKED | e2e_interactions (`#mixopen` -> mxshow/mxg x<=12 -> `#mixx`), flow_handoff (to the end screen), flow_data S5 | |
| 6 | `Save this session as a PDF ->` from Session progress | **UNWALKED** | -- | print_truth covers the cram PDF and the accidental file-print path; this specific control is not clicked. |

**J14: 3 WALKED / 1 STATE-ONLY / 2 UNWALKED (6).**

## J15 -- The reset / hand-the-file-on arc

| # | Segment | Verdict | Covering checks | Note |
|---|---|---|---|---|
| 1 | Choose the blast radius (three controls, three different confirmation models) | STATE-ONLY | focus_ring (`.ix-c-reset` focused) | |
| 2 | "Everything" is not everything -- the live page re-seeds within a second | **UNWALKED** | -- | |
| 3 | Export first; import restores | **UNWALKED** | -- | |

**J15: 0 WALKED / 1 STATE-ONLY / 2 UNWALKED (3).**

---

# PART 2 -- SUMMARY COUNTS

| Journey | Segments | WALKED | STATE-ONLY | UNWALKED | Walked % |
|---|---:|---:|---:|---:|---:|
| J1 first cold open | 14 | 7 | 5 | 2 | 50% |
| J2 the daily return | 16 | 5 | 5 | 6 | 31% |
| J3 the drill loop | 16 | 10 | 2 | 4 | 63% |
| J4 weak-spot triage | 8 | 3 | 1 | 4 | 38% |
| J5 the mock cycle | 9 | 5 | 1 | 3 | 56% |
| J6 consult mid-drill | 10 | 6 | 3 | 1 | 60% |
| J7 keyboard-only | 11 | 5 | 1 | 5 | 45% |
| J8 the interrupted journey | 7 | 3 | 2 | 2 | 43% |
| J9 the multi-day arc | 8 | 1 | 2 | 5 | 13% |
| J10 the file's own journey | 8 | 2 | 1 | 5 | 25% |
| J11 what a session leaves | 11 | 4 | 1 | 6 | 36% |
| J12 the phone arc | 8 | 3 | 2 | 3 | 38% |
| J13 the whiteboard | 4 | 4 | 0 | 0 | 100% |
| J14 exam-eve cram | 6 | 3 | 1 | 2 | 50% |
| J15 reset / hand on | 3 | 0 | 1 | 2 | 0% |
| **TOTAL** | **139** | **61** | **28** | **50** | **44%** |

**44% WALKED, 20% STATE-ONLY, 36% UNWALKED.**

### The shape of the coverage, in one sentence each

- **The gate walks the CONSTRUCTION of a record and barely walks its CONSUMPTION.** Drill,
  whiteboard, mock and mixed-fire -- the four surfaces that WRITE -- carry 61% of all WALKED
  segments. The surfaces that turn a written record back into an action -- weak chips, the flagged
  pile after a return, the week goal, the decay pills, the STARRED block, the Tools sheet -- carry
  almost none.
- **Where the daily-return journey IS covered, it is covered as constructed state.** `home_claims`
  is the most rigorous battery in the repo (13 pinned + 24 PRNG records, six judges, six aborting
  mutants) and it never once grades a probe. The home is proven to say true things about a record
  it was handed; it is never proven to say true things about a record the user earned.
- **13 of the enumeration's 14 measured defects sit in cells this matrix marks UNWALKED or
  STATE-ONLY.** The single exception -- cross-topic drill opening over your last topic (J4.5) -- is
  a behaviour `search_deadend` deliberately pins with a negative control, i.e. a ruled design
  decision that the enumeration read as a defect. Defect #1 is split: the `THIS RUN` half is walked
  and ruled; the flag-marker half is unwalked.

---

# PART 3 -- THE GAPS, RANKED BY USER IMPACT

Impact model, stated so it can be argued with: **(how many times a real user meets this segment in a
week) x (how bad the failure is when it bites) x (how silently it fails)**. Per the brief, a gap in
the daily-return arc outranks one in file portability. A gap that fails *silently* -- the surface
reports a plausible number rather than an error -- ranks above one that fails loudly.

## GAP-1 -- The grade row's position after Reveal is never measured

**Journeys:** J3.4c, J12.5b. **Every probe of every session, both viewports.**

The gate has three probes in this neighbourhood and none of them is this one. `fold_budget`
measures the QUESTION (`.qq` first line, against a live band computed from the fixed `.seg` and
`.mockcta`) and the Reveal button (`#adv`, the W19/X7 arm) at 360x800 and 844x390. `mobile_nextup`
measures the grade buttons' HEIGHT (>=44px) at the judgment moment. `grade_reveal` proves the Solid
button is not OCCLUDED -- and its probe calls `jg.scrollIntoView({block:'center'})` before every
hit test, so by construction it cannot see a below-the-fold row. Measured by hand: desktop
1280x800 puts `How did you do?` at y=788 and the grade buttons at y=834; mobile 390x844 puts them at
y=818 after an auto-scroll of 78px. Mouse and touch users scroll on every single probe to reach the
three buttons the product exists for.

**ARM -- extend `fold_budget` with a JUDGE probe** (it already owns the band arithmetic, the tap
path, the orientation matrix and the abort-on-silent-plant discipline): after `tapAdv` drives the
card to the judgment stage, measure the `.judge` row's box against the same live band `.qq` is
measured against, and require the row's TOP to be inside it at `scrollY 0`. Add a desktop arm --
fold_budget is phone-only today, and the desktop measurement was the worse of the two -- either by
widening its viewport matrix to include 1280x800, or as a sibling arm in `grade_reveal` reusing
fold_budget's `FOLD` helper.

**Mutant:** plant a 320px spacer above `.judge` inside the drill shadow root and require the probe
to go red, reusing fold_budget's existing `chromeStill` guard so a plant that moves the chrome
instead of the card aborts the run.

**Wave: W2 room.** The drill pane's own geometry is the room's surface, and the room wave already
owns the pane furniture.

## GAP-2 -- After a reload, the flagged pile is unreachable from the drill

**Journeys:** J3.6b, J3.7b, J4.2, J8.3b. **Every return to a topic you have worked.**

This is a genuine hole rather than a re-litigation of `scoreboard_resume`'s ruling. That check chose
RELABEL over seed-from-record for the `THIS RUN` tiles, with a written argument (seeding would
corrupt the debrief denominator from the other side) -- correct, and settled. But the *actionable*
half was never covered. `drill/logic.js:552-556` (`teardownTopic`) blanks `this.revisit`;
`:563` (`renderNav`) draws the `flag` class from `this.revisit`, never from
`progress.<topic>.revisit[]`; `:1019` labels `#dweak` from `this.shk`. So a returning user sees 0 of
31 tiles flagged, a hidden button reading `Drill my 0 flagged probes`, and a home panel one click
earlier saying 6. `progress_merge` appears to cover this and does not: its `reachDebrief` helper
**re-runs the whole bank in the current page load**, and its own comment says the drill's state is
per-session and the STORED record is what it guards.

**ARM -- a third section in `scoreboard_resume`** (it already owns grade-leave-return and its
header already reasons about this exact split): grade N probes with M graded Missed/Shaky, reload,
then assert three things against the canonical record -- (a) `.dn-step.flag` tile count ==
`revisit.length`, (b) `#dweak` is rendered and the integer in its label == the same number, (c)
clicking it produces a set of exactly that size. Whichever of the three the team chooses to FIX
(re-hydrate `revisit` from the record on `setTopic`, or relabel again), the arm is the same and it
is a watched-RED against today's build.

**Mutant:** empty `progress.<topic>.revisit` in localStorage before the reload and require all three
assertions to fail -- proving they read the record rather than a constant.

**Wave: W2 room.**

## GAP-3 -- The home's STILL SHAKY panel is never judged with content, and never clicked

**Journeys:** J2.4a/b/c, J4.1, J4.2. **The returning user's second read, every session.**

`home_claims` is the gate's best battery and this panel is its blind spot: **all 13 pinned seeds and
all 24 generated ones write `revisit: []`** (home_claims.cjs:74, 87, 100, 119, 131, 143, 155, 174,
190, 201 -- including the `mixedPosition` seed that sets `shk: 3` and still ships an empty revisit
list). `ALL_JUDGES` has six arms and none of them is a weak-panel arm. The only populated revisit in
the whole tree is `focus_ring`'s mature seed, which measures a focus rectangle. Consequences: the
panel's integers are unjudged, its truncation at 234 flagged (6 chips, no residue count, no scroll
affordance) is unmeasured, and no check clicks a `.hm-chip`.

**ARM, part 1 -- `judgeWeak` in `home_claims`' `ALL_JUDGES`**, plus three seeds with non-empty
`revisit`: one weak topic, six weak topics, and a saturation seed at 234 flagged. Judge that every
chip's integer equals its record's `shk`, every age string is entailed by `ts`, and that when the
weak set exceeds the rendered chip count the panel prints the residue rather than silently
truncating. **ARM, part 2 -- one navigation arm in `search_deadend`** (which already owns
"pick -> land" with hit-tested clicks): real click on a `.hm-chip` at its painted centre, assert the
route, and assert the landing drill's flagged set matches the chip's count. Part 2 composes with
GAP-2's arm and is the thing that makes the triage journey testable end to end.

**Mutant:** home_claims already ABORTs on any undetected mutant; add a seventh -- rewrite one chip's
count to `shk + 1` and require `judgeWeak` to catch it. For part 2, plant an empty `revisit` and
require the navigation arm to go red.

**Wave: W4 batteries** for part 1 (it is a claims-battery extension). **W-ADDRESSES** for part 2
(it is a "where does this control land you" question, which is that wave's whole subject).

## GAP-4 -- The multi-day arc is entirely unmeasured

**Journeys:** J9.2, J9.3, J9.4, J9.5, J2.5, J2.6. **Weekly, and it is the retention machinery.**

Zero references across the whole test tree to `studyStreak`, `weeklyGoal`, `goal.weekly`,
`dueReview`, `ix-goal`, `ix-due`, `data-goal`. This is where the shipped copy defect lives:
`panels.js:160` renders `goalPhrase(g, true) + ' drilled this week'`, and in the goal-met branch
`goalPhrase` already returned a complete sentence -- so a met goal prints
`18 topics drilled, 12-topic goal met with 6 to spare drilled this week - Goal met - nice work.`
The comment directly above that function says two surfaces render this fact and that round 4 fixed
only one of them. The gate cannot see either. It is also the surface carrying the product's own
stated arc (the Game plan's six days) and the decay nudge that a HEAVY user loses entirely.

**ARM -- a new generative battery `cadence_claims.cjs`, built as `home_claims`' sibling** and
reusing its shape (seeded records, printed sentences judged against exact integers, mutants that
abort): seeds for under-goal, exactly-met, over-goal, a goal lowered below the done count, a topic
touched twice in one week, a 7d / 20d / never-decayed set, and streaks of 0 / 1 / 2 days with a
2-day gap. Two hard requirements: judge BOTH renderings of the goal fact (the left-rail `THIS WEEK`
copy and the `ix-goal` strip) and require them to AGREE, and judge the decay list against the
`ts >= 7 days AND zero flagged AND 100% done` predicate rather than against a count.

**Mutant:** the pre-fix `goalStrip` string must turn the goal-met arm red (that is the watched-RED,
available today); plus a `ts`-restamp seed that must empty the decay list, encoding the
content-release hazard the source itself calls out.

**Wave: W4 batteries.**

## GAP-5 -- The destructive and degraded-storage paths are unwalked

**Journeys:** J11.7a/7b/7c, J11.8, J15.1/2. **Rare, but the only irreversible actions in the
product, and they fail silently.**

`clearAll`, `Store.dump`, `Store.restore`, `StorageNotice`, `Store.degraded()`: zero references. The
measured behaviour: the per-card reset glyph is a 22x22px control at `opacity 0.3` on the corner of a big
clickable card that deletes a topic's progress with **no confirmation** (undo toast only, and absent
entirely on mobile); `Reset all saved progress` says "cannot be undone" and the live page re-seeds
`nav.last`, `pos.*` and `viewseen.*` within a second, so handing the file on after a reset still
boots the recipient into your last topic; and a private-window user gets a banner, an in-memory
fallback that works, and total loss on reload. The gate has no opinion on any of it. This ranks
below GAP-1..4 because it is not a daily surface -- but above the portability half of J10 because
the controls sit ON the daily surfaces and lose real work.

**ARM -- a new check `record_lifecycle.cjs`** with four sections: (a) earn a small record ->
`Store.dump()` -> `clearAll()` -> `Store.restore(dump)` -> reload -> the canonical record is
identical (this closes the J10.2-4 portability hole in the same file, cheaply); (b) after
`clearAll()` on a live topic page, the key set is EMPTY at +1s -- the arm that encodes what the
confirm promises, and it is RED today; (c) a real click on `.ix-c-reset` followed by the undo toast
restores the exact prior record; (d) deny `window.localStorage` via `addInitScript` and assert the
banner renders on the home AND inside a topic, the drill still grades against the in-memory `Store`,
and the export control in the banner is reachable.

**Mutant:** a restore that drops one key must fail (a); a page that re-seeds must fail (b) -- so (b)
lands as a watched-RED alongside its fix, not before it.

**Wave: coda.** The file's own lifecycle is the closing surface, and (a) folds the export/import
round trip in with it at no extra cost.

## Gaps 6-12 (ranked, one line each)

6. **The keyboard grading loop is never pressed** (J7.3) -- 12 trusted presses exist in the whole
   gate and no digit is among them; the one `Space` belongs to the mock. Arm: extend
   `overlay_keyboard`'s trusted-input discipline into the drill -- `Space` then `1`/`2`/`3`,
   asserting the record moved; mutant: neuter one binding in the keymap. **Wave: W2 room.**
7. **Export / import round trip** (J10.2-4) -- folded into GAP-5's arm (a). **Wave: coda.**
8. **Search snippets print raw `<b>` / `<i>` as literal text** (J6.5b) -- `entity_leak` catches
   `&name;` and `&#nnn;` only. Arm: widen `entity_leak`'s text-node scan to a bare-tag pattern and
   run it over the search overlay with the two reproducing queries; mutant: inject a literal `<b>`
   into one snippet. **Wave: W2 room** (it is a rendering-fidelity defect on a consult surface).
9. **The mobile bottom tab bar (4 controls) and the Tools sheet (14 items) are never operated**
   (J12.2, J12.6b) -- render's own header calls `#toolsfab` "the ONLY entry point to 12 tools".
   Arm: open the sheet, tap each item, assert each target opens; mutant: hide one item.
   **Wave: W2 room.**
10. **Mock-session honesty** (J5.3, J5.6b, J5.7) -- the interrupt toggle does not persist and no
    check reloads after setting it; an unscored close must say "unscored"; `Esc` mid-run discards
    with no recovery. Arm: three sections in a mock-session check. **Wave: mock-session wave.**
11. **A crash that fires neither `visibilitychange` nor `pagehide` loses the session point**
    (J8.5b) -- `pagehide` has zero references. Arm: drive a session, kill the context without
    dispatching either event, reopen and assert the trend point's fate matches the documented
    contract; mutant: remove the `pagehide` listener and require the arm to notice.
    **Wave: mock-session wave** (it owns `trend.hist`).
12. **The guided tour** (J1.9b), **`Copy link`'s absolute path** (J10.6), **the zero-network claim**
    (J11.6), **Mac Ctrl/Cmd parity** (J7.7) -- four printed promises with no arm at all. Arm: one
    small section each; the network one is a `page.on('request')` assertion that costs nothing and
    guards the product's headline claim. **Wave: coda.**

### Two things that must NOT become arms

- **`THIS RUN` reading 0/0/N after a reload** is a ruled design decision with a written argument and
  a watched-RED (`scoreboard_resume`). Only the flag/`#dweak` half (GAP-2) is open.
- **Cross-topic drill from the home navigating into your last topic first** is pinned by
  `search_deadend` X3/F *with* a negative control proving a pick from a topic route moves nobody.
  Changing it means arguing with that ruling, not adding a check beside it.

---

# PART 4 -- THE VERDICT

The gate walks a little under half of the product's lived experience, and the half it walks is the
half where a user *writes* rather than the half where a user *reads*. 61 of 139 journey segments are
performed under test, 28 are verified only as constructed state, and 50 are touched by nothing at
all; but those numbers flatter the result, because the walked mass is concentrated almost entirely
inside a single session on a single topic -- enter the drill, reveal, grade, reconstruct on the
whiteboard, run the mock, reach the debrief -- plus the app's chrome, which is guarded to a standard
most products never reach (414 companion-rail combos, five-delay click-drift sweeps, real PDF page
leaves, per-pixel contrast decoded through transparent text, mutants that abort the run when they
fail to fire). The whiteboard journey is 100% walked. The drill loop is 63%. What is missing is the
*second* session: the gate has no arm that grades, leaves, returns and then tries to ACT on what it
graded. That single missing shape explains almost every top gap -- the flagged pile that is
unreachable after a reload, the weak chips that no seed populates and no click follows, the week
goal and the streak and the decay nudge that no check has ever rendered, the reset controls that are
focused but never fired. It also explains the gate's most uncomfortable property: `home_claims`, the
most rigorous battery in the repo, proves the home says true things about a record it was *handed*,
and never that the home says true things about a record the user *earned* -- and 13 of the 14
defects the black-box drive measured by hand sit in cells this matrix marks UNWALKED or STATE-ONLY,
with the single exception being a behaviour the gate deliberately pins. The gate is not lax; it is
aimed. It is aimed at the moment work is produced, and the product's actual promise -- come back
tomorrow, and the file will tell you what you are least ready for -- lives in the moment work is
consumed, which is the part it does not yet walk.

---

# APPENDIX A -- the load-bearing evidence

Every claim of the form "zero references" was produced by a `grep -rl` over `test/` across
`*.cjs`, `*.mjs` and `*.py`, run on 2026-08-02 against the tree at commit `2e94d41`.

**Zero hits (nothing in the 76 checks references these):**
`Store.dump`, `Store.restore`, `clearAll`, `exportBackup`, `importBackup`, `backup`,
`StorageNotice`, `pagehide`, `tour` / `TourGuide` / `#tourov`, `goal.weekly`, `weeklyGoal`,
`studyStreak`, `dueReview`, `home.landing`, `hm-skip-cb`, `hm-shaky`, `hm-week`, `ix-goal`,
`data-goal`, `copyLink` / `copy-link`, `hometabs`, `Bookmarks.`, `ix-filter`, `page.route` /
request interception.

**One hit, and it is a SOURCE check (`at_name_hygiene.cjs`), not a browser walk:**
`hm-chip`, `ix-due`, `ix-star`, `ix-weak`.

**Trusted-key census of the entire gate** (`grep -rhoE "keyboard\.press\('[^']+'\)"`):
`Enter` x5, `Tab` x4, `Backslash` x3, `r` x2, `ArrowDown` x2, `w` x1, `Space` x1, `Shift` x1,
`n` x1, `Escape` x1, `End` x1, `/` x1. Plus one `keyboard.type(q)`. No digit is ever pressed; the
single `Space` is in `overlay_keyboard.cjs:431`, inside the mock run.

**Source anchors for the two top gaps:**
`src/scripts/app/drill/logic.js:552-556` (`teardownTopic` blanks `this.revisit`), `:563`
(`renderNav` flags from `this.revisit`), `:1019` (`#dweak` labelled from `this.shk`).
`src/scripts/app/panels.js:160` (`goalPhrase(g, true) + ' drilled this week'`, double-suffixing the
goal-met branch of `goalPhrase` defined at `:140-150`).
`test/progress_merge.cjs:110` (`reachDebrief` re-runs the bank in the current session, by design).
`test/home_claims.cjs:74,87,100,119,131,143,155,174,190,201` (`revisit: []` in every seed).
`test/grade_reveal.cjs:164` (`jg.scrollIntoView` precedes the reachability hit test).
`test/search_deadend.cjs:319-325` (the cross-drill-from-home ruling, with its plant at `:337-343`).
`test/scoreboard_resume.cjs:1-21` (the RELABEL ruling and its watched-RED).
