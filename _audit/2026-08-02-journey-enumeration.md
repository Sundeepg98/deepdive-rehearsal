# Journey enumeration — Deep Rehearsal (offline single-file trainer)

Method: black-box browser drive of `deepdive_content_pipeline_rehearsal.html` at 1280x800 and
390x844 (Playwright/Chromium), plus source reading of `src/scripts/app/*` for persistence and
decay semantics. Test suite deliberately not opened.

Note for anyone re-driving this: **all nine pane bodies and every overlay body live in open shadow
roots** (`DEEP-DRILL`, `DEEP-MOCK-RUN`, `DEEP-SESSION`, `DEEP-CRAM`, `DEEP-KEYBOARD`, …).
`document.querySelectorAll` from `page.evaluate` cannot see them; Playwright locators pierce.
Several of my first passes returned empty because of this.

---

## 0. Shared vocabulary

### 0.1 Record classes (used in every journey below)

| Class | Definition (measured) | Status bar reads |
|---|---|---|
| **COLD** | `localStorage` is literally empty — 0 keys. Nothing is written until the first navigation. | `RECORD 0 of 972 probes graded · 0 solid · 0 shaky · 0 missed · 0 of 46 topics started` |
| **ENGAGED** | 1–5 topics touched, ~5–40 probes graded, some flagged, ≤1 week of `trend.hist`. | e.g. `39 of 972 probes graded · 30 solid · 4 shaky · 5 missed · 3 of 46 topics started` |
| **HEAVY** | Most/all 46 topics started, hundreds graded, 200+ flagged, 2+ weeks of trend, week goal met, bookmarks set. | e.g. `637 of 972 probes graded · 403 solid · 129 shaky · 105 missed · 46 of 46 topics started` |

### 0.2 The whole persistence surface (`ddr.v1.` prefix, localStorage only)

`progress.<topic>` `{got,shk,done,tot,revisit[],cards{cardHash:1|2|3},cv,ts}` ·
`wbprog.<topic>` `{got,missed,total,steps{},cv,ts}` · `pos.<topic>` `{walk:n,drill:n}` ·
`viewseen.<topic>` `["walk","drill",…]` · `notes.<topic>` · `mock.<topic>` `{score,outOf,time,runs,int}` ·
`mix.<topic>` · `mock.last` · `mix.log` · `nav.last` `{id,view}` · `bookmarks[]` ·
`trend.hist` `[{t:topicId,c:"CPR1.YYYYMMDD.…"}]` (cap 30) · `goal.weekly` · `home.landing` ·
`theme` · `ui.textzoom` · `cmp.collapsed`.
Grade level encoding: `1 = Missed`, `2 = Shaky`, `3 = Solid`. `shk` counts *both* 1 and 2.

### 0.3 The full keyboard map (from the `?` overlay)

`Q W E R T Y U I O` = the nine panes left-to-right (Walkthrough, Probe Drill, Whiteboard, System Map,
Trade-offs, Model Answers, Numbers, Red Flags, 30-Second); `V` = Visualize where a topic has one.
`← →` step the walkthrough · `Space`/`Enter` reveal / advance · `1 2 3` grade Missed·Shaky·Solid ·
`/` or `Ctrl-K` search · `\` topic index · `H` home · `[ ]` prev/next topic · `N` next step ·
`P` session progress · `F` focus mode · `Ctrl-P` printable Q&A · `G` guided tour ·
`D` cycle spacing density · `Esc` close any panel · `?` this list.
Footnote in the overlay: "The single keys pause while a panel like this one is open."

---

# J1 — First cold open: orient, understand the promise, reach a first drill

**Record class: COLD only.** (In ENGAGED/HEAVY this journey is replaced by J2.)

1. Open the `.html` from disk. Title `Home — Deep Rehearsal`; `data-view=home`. **`localStorage` is
   still empty** — the app writes nothing on a pure landing.
   *Broken if:* a blank frame, a "loading" state that never resolves, or a 12 MB file that visibly
   janks. (Measured: full render, 0 console errors, no horizontal overflow at either viewport.)
2. Read the one-line promise at the top of the centre column: *"A **system-design interview**
   trainer — 46 topics, each taken apart the way an interviewer actually scores it."*
   *Broken if:* the reader cannot answer "what is this for" in one sentence.
3. Read the **START HERE** hero: `"Walk me through how you would design this."` + *"That is the
   sentence the round opens on. You answer out loud, they push back, and you grade yourself on what
   you actually said."*
   *Broken if:* the hero states a promise the product does not keep (it does keep it — the drill is
   literally reveal-then-self-grade).
4. See the single **START** card — `Event-Driven Backbone` / *"Drill the interviewer's follow-ups,
   rebuild the design from memory, then run a timed mock."* It carries `data-autofocus="1"`, so it
   is the first tab stop after the skip link.
   *Broken if:* a first-timer has to choose among 46 topics with no default. (Not broken — exactly
   one default is offered.)
5. Scan **ALTITUDE — SOLID PROBES BY INTERVIEW TIER**: three empty rails STAFF `0/310`, SDE3
   `0/359`, SDE2 `0/302`, header `0 SOLID OF 971 ON THE RAILS`, empty-state sentence *"Nothing
   graded yet. Each rail is one interview tier and each mark is one probe — they fill as you grade
   yourself, and the shortest rail is the level you are least ready for."* Legend: ALL SOLID · PART
   SOLID · FLAGGED · UNTOUCHED, plus the honest footnote `+ 1 PROBE OUTSIDE THE THREE TIERS, ON NO RAIL`.
   *Broken if:* three empty bars with no explanation of what a "rail" is. (Not broken — the empty
   state is the explanation.)
6. Scan **COVERAGE BY ROOM** — six numbered cards, `7 topics · 0 of 7 started · 0% drilled` each.
7. Scan the right **LIBRARY — 46 TOPICS, SIX ROOMS**: a filter box, six room headers each with a
   `Cram →` button, 46 topic cards (title / kicker / thesis).
8. Read the bottom status bar: `RECORD 0 of 972 probes graded … Offline · nothing leaves this file`.
   *This is the only place the offline/privacy promise is stated, and it is home-only* (see step 11).
9. Optional: `Search /`, `Shortcuts ?`, `Theme`, or `Topic index \` from the left rail; or the
   guided tour on `G` (8 steps, opens *"Welcome to Deep Rehearsal — a self-contained, offline
   trainer — a growing set of deep-dive topics, each with 9 rehearsal surfaces"*).
   *Broken if:* the tour is the only way to learn the product but is never offered. **[FEELS BROKEN]
   The 8-step tour is reachable only by pressing `G` — nothing on the cold home mentions it**, and a
   cold user has no reason to press it.
10. Click **START**. → `#event-driven/walk`, title `Walkthrough — Deep Rehearsal`. Four keys appear
    at once: `viewseen.content-pipeline`, `viewseen.event-driven`, `nav.last`, `pos.event-driven`.
    *Broken if:* the click lands on a different topic than the card named. (It does not.)
    **[OBSERVED oddity] `viewseen.content-pipeline` is written on the very first navigation for a
    topic the user never opened** (content-pipeline is the boot/registry-default topic).
11. Land on the Walkthrough: `STEP 1 / 10`, a 10-dot stepper, a stage chain (`producer → EventBridge
    rule → match + route`), prose, `▸ See the code`, `← Prev / 1 of 10 / Next →`, `▸ What a complete
    answer sounds like`, and `THE WHOLE FLOW — tap any step to jump` (10 tiles). Left rail switches
    to the topic shell: `FOCUS`, home/prev/next, `START HERE · Start the drill → · 0 of 21 graded`,
    `▶ Mock run — the full round, on the clock`, an `Interviewer cuts in mid-answer — off` toggle,
    and the nine panes with their key hints. Right rail: `YOU'RE REHEARSING` + thesis + `THIS VIEW`
    + `THE MOVE HERE` + `THE SPINE OF A STRONG ANSWER`.
    **[OBSERVED] The `RECORD …` status bar disappears entirely inside a topic** (`--chrome-bot`
    flips `30px → 0px`; the node is in the DOM but zero-sized). So the offline promise and the
    running total are visible on the home only.
12. Click `Start the drill →` → `#event-driven/drill`. First probe on screen.
    **Time-to-first-drill from cold: 2 clicks.**

---

# J2 — The daily return: continue where I left, see standing

**Record class:** does not exist in COLD; this *is* the home in ENGAGED and HEAVY.

1. Open the file. A fresh tab always lands on `#home` (verified: a second tab opened while another
   tab sat in a drill still landed on `#home`) — **unless** `home.landing === "resume"`, in which
   case boot goes straight to `nav.last` (`#event-driven/drill`, title `Probe Drill — …`).
2. Read the hero. It has two forms, chosen by recency:
   - touched today → **`WHERE YOU STOPPED · <TOPIC>`**, the *next probe's question in quotes*, then
     *"You marked **4** probes shaky in this topic earlier today, and stopped at probe **7** of 21.
     **15** still ungraded."*
   - touched ≥1 day ago → **`UP NEXT · <TOPIC>`**, *"You marked **2** probes shaky in this topic
     **9d** ago, and stopped. 10 of its 21 probes still ungraded."*
   Then a `RESUME / <Topic> / Probe Drill →` card (`data-hash=#<id>/<view>`, autofocused).
   *Broken if:* the hero quotes a probe you already answered, or resumes a topic you did not choose.
   (`last-visit.js` explicitly guards the boot-clobber; verified correct across reloads.)
3. Read **ALTITUDE**. Now populated, with a *derived sentence*: ENGAGED → *"Staff and SDE3 are the
   thin rails. Both sit at 2% solid — Staff 7 of 310, SDE3 7 of 359 — under a rail that is further
   along. Those are the levels you have rehearsed least."* HEAVY → *"Staff is the thin rail. 15
   solid of 310 probes, across 20 of 46 topics — the level you are interviewing for is the one you
   have rehearsed least."*
   *Broken if:* the rails contradict the status bar. (They do not; the `+1 probe on no rail`
   footnote is what keeps 971 vs 972 honest.)
4. Read **STILL SHAKY / N FLAGGED**: topic chips `<Topic>  <count>  <age>` (`0d`, `4d`, `2w`), then
   signal chips naming the individual probes, then *"The age is how long since you last worked that
   topic. These are the probes you graded Missed or Shaky — re-drill them until the signal comes
   automatically."*
   **[OBSERVED] The signal chips are not buttons.** Only the topic chip (`.hm-chip`,
   `data-topic=…`) is clickable. The panel names your six weak signals and offers no way to act on
   any one of them.
   **[OBSERVED, HEAVY] With `234 FLAGGED` the panel shows 6 topic chips and 6 signal chips and no
   "and N more" / no scroll affordance** — the list silently truncates.
5. Read **RECENT SESSIONS**: `THIS WEEK'S GOAL` with a `− N +` stepper (writes `goal.weekly`, clamp
   1–20, default 5), a bar, and a phrase; plus a unicode sparkline `▁█ … solid drilled, last N sessions`.
   **[OBSERVED DEFECT, HEAVY/goal-met only]** the phrase renders as
   `18 topics drilled, 12-topic goal met with 6 to spare **drilled this week** · Goal met — nice work.`
   — `panels.js:160` appends `' drilled this week'` to a `goalPhrase()` that already returned a
   complete sentence in the goal-met branch. Under goal it reads correctly (`2 of 5 topics drilled
   this week · 3 more to go`). The left-rail `THIS WEEK` copy of the same fact is correct; only the
   telemetry strip is mangled.
6. Read **`Refresh · drilled clean a while ago`** pills (`Caching Strategies, 20d`) — present only
   when a topic is 100% done, zero flagged, and `ts` ≥ 7 days old. Absent in HEAVY here because no
   topic was both clean and stale.
7. Read **COVERAGE BY ROOM**, now with `1 of 7 started · 6% drilled` per room.
8. Scan the LIBRARY: cards gain a `● 9/21` progress badge, a faint `↻` reset, a pencil where notes
   exist; a `★ STARRED n` block appears above the rooms when bookmarks exist.
9. Click RESUME (or `Enter` on it, or the `hm-chip`) → back into the drill at the stored cursor.
   **[OBSERVED] Whichever entry point you use, you land in the FULL 21-probe set with `THIS RUN`
   reading `0 SOLID · 0 REVISIT · 21 LEFT`** — see J4/J8 for why that is the sharpest break.

---

# J3 — The drill loop: probe → think → reveal → grade → next

**Record class:** identical mechanics in all three; only the entry state differs.

1. Enter Probe Drill (`W`, the pane list, `Start the drill →`, or RESUME). Header `GRADED / Probe
   Drill`; mode tabs `Study | Mock round | Quick 5`; `FOCUS BY LEVEL: All 21 | SDE2 | SDE3 | Staff`;
   a mode caption (*"All four levels, mixed — the way a real loop actually comes at you."*);
   `THIS RUN` triple `SOLID / REVISIT / LEFT`; then the probe card.
2. The probe card: `PROBE 1 / 21`, `signal · what event-driven is`, a tier badge (`SDE2`/`SDE3`/
   `STAFF`), the question, and one primary button `Reveal answer`.
   *Broken if:* the answer is visible before you commit. (It is not.)
3. **Think / say it out loud.** The product's whole thesis lives in this un-instrumented step.
   *Broken if:* nothing marks the boundary between "thinking" and "checking" — the single full-width
   Reveal button is that boundary and it does the job.
4. `Reveal answer` (or `Space`). The card expands: the model answer, an amber
   `↳ Interviewer pushes further` follow-up, then `How did you do?` / *"Grade yourself — this is what
   surfaces your weak spots later."* and three buttons `✗ Missed [1]` · `~ Shaky [2]` · `✓ Solid [3]`.
   **[OBSERVED FRICTION] For a long answer the grade row is below the fold at both viewports.**
   Measured on probe 1: desktop 1280×800 — `How did you do?` at y=788, Solid/Shaky at y=834 (vh 800);
   mobile 390×844 — Solid/Shaky at y=818 after an auto-scroll of only 78 px. So a mouse/touch user
   must scroll on every probe to reach the three buttons that are the point of the product. Keyboard
   users (`1/2/3`) are unaffected.
5. Grade. The record is written **synchronously, per grade**: `progress.<topic>.cards[hash]=1|2|3`,
   `got`/`shk`/`done` recomputed, `revisit[]` gains the signal name, `ts=Date.now()`, and
   `pos.<topic>.drill` advances. The card auto-advances to the next probe; `THIS RUN` updates.
   *Broken if:* a grade is lost. (Not observed — every one of ~60 graded probes landed.)
6. Repeat. `YOUR DRILL SET — tap a probe to jump · flagged ones are marked` shows all 21 tiles;
   graded-not-solid tiles pick up `dn-step flag` (amber) **within the session**.
7. Once anything is flagged, a secondary button appears: `↻ Drill my 6 flagged probes` /
   *"your Revisit pile across this session · clears as you nail them."*
8. Switch mode or level mid-run: `Quick 5` → a 5-probe mixed set; `Staff` → the 7 Staff probes with
   their own caption (*"Guarantees and org trade-offs — the exactly-once myth, replay, schema
   evolution, fat vs thin…"*).
   **[FEELS BROKEN] Both switches reset `THIS RUN` to `0 SOLID · 0 REVISIT · N LEFT`** even though
   you just graded 8 in the same sitting, and **the `FOCUS BY LEVEL` chip still reads `All 21`
   while the set is 5** in Quick 5 mode.

---

# J4 — Weak-spot triage

**Record class:** vacuous in COLD (nothing flagged); the core loop in ENGAGED; the dominant loop in
HEAVY (234 flagged).

1. Home → **STILL SHAKY** panel. Read which topics are weak and how stale (`Error Propagation
   Across Services 13 2w`).
2. Click a topic chip → `#<topic>/drill`.
   **[OBSERVED DEFECT] You land in the full 21-probe set, not in your flagged pile.** Measured after
   a reload with `revisit:["what event-driven is","delivery guarantees","the dead-letter queue"]`
   still in the record:
   - `THIS RUN` reads `0 SOLID · 0 REVISIT · 21 LEFT`;
   - **0 of 31 drill tiles carry the `flag` class** (same session: 3 did) — so the caption
     *"flagged ones are marked"* is false;
   - the re-drill button is present in the DOM but **hidden and reading `↻ Drill my 0 flagged
     probes`**, while the home panel one click earlier said 3.
   Two surfaces disagree about the same fact and the actionable one is the wrong one.
3. Same-session path (the one that works): grade some probes → `↻ Drill my N flagged probes` →
   the set collapses to exactly those N, all amber, `THIS RUN` `0/0/N`, and nailing one removes it.
4. `P` / `Session progress` overlay is the other honest weak-spot surface: `Probe Drill · 3 solid ·
   6 to revisit · 12 untouched of 21` and a `Revisit:` line naming every flagged signal. This one
   *does* survive a reload (it reads the record).
5. Cross-topic weak sweep: `Cross-topic drill` (left rail or `data-cross=1`) → modal
   *"Cross-topic drill — Random probes from every topic — the interview shuffle"*, `Probe 1 / 12`,
   each probe labelled with its home topic.
   **[FEELS BROKEN] Opening it from the home first navigates you into your last topic's drill and
   then puts the shuffle on top** — closing the modal drops you somewhere you did not ask to be.
6. Room-scoped sweep: `Cram →` per room header (`data-cross=group:messaging-events`).
7. `Refresh · drilled clean a while ago` pills → topics that decayed past 7 days.
   **[FEELS BROKEN] A topic with even one flagged probe never appears here**, so in HEAVY (where
   almost everything has a flag) the spaced-repetition nudge silently disappears entirely.

---

# J5 — The mock cycle

**Record class:** available from COLD; `mock.<topic>` accumulates `runs`, so the copy changes with
class.

1. Left rail → `▶ Mock run — the full round, on the clock` (mobile: the persistent bottom bar
   `▶ Mock run`). Modal `#mockov` opens over the topic; a clock starts at `0:00` and ticks.
2. `Beat 1 / 7` + a beat-kind badge (`FRAME`), the beat title, and the instruction *"Frame the scope
   in one line, then give your one-sentence version."* Two buttons: `Reveal model`, `Next beat →`.
   Hint line: *"Space reveal · → or Enter next · Esc close."*
   *Broken if:* the clock does not run, or the beats are the drill probes again. (Neither.)
3. Optional pre-flight: the `Interviewer cuts in mid-answer — off` toggle in the left rail —
   the Game Plan's Day 4 is built on turning it **on**.
   **[OBSERVED DEFECT] That toggle does not persist.** Set it on, reload, it is off again; no
   localStorage key is written for it (`theme`, `ui.textzoom`, `cmp.collapsed` all do persist).
4. Speak each beat out loud, `Space` to check yourself against the model, `Enter` to advance.
   Seven beats.
5. Beat 7 → **`Round complete`**: *"You ran the full arc in **0:06**. A real design round is 35–45
   min — this is the spine you expand into it."* A curveball receipt: *"Curveball this run:
   **ordering**. 8 rotate in — run again for a different one."* Then the self-score:
   *"How many of the seven did you deliver cleanly, out loud?"* with buttons `0 1 2 3 4 5 6 7`, plus
   `Run again` / `Close`.
6. Scoring writes `mock.<topic> = {score, outOf:7, time, runs, int}`. Closing without scoring writes
   `score: null` and Session Progress then reads **`Last run: completed, unscored in 0:03 · 1 run`**.
   *Broken if:* an unscored run silently counted as a good one. (It does not — "unscored" is stated.)
7. `Esc` mid-run closes the modal and **discards the run** (no partial record, no resume).
   **[FEELS BROKEN] There is no "you were 4 beats in" recovery**; a mock is all-or-nothing.
8. The score feeds the `CPR1` session code (`…​.5-1-0.…` = score-runs-interrupts) and therefore the
   Compare/trend view.

---

# J6 — Consult usage mid-drill

**Record class:** identical in all three.

1. **The always-on right rail (`aside.companion`)** — `YOU'RE REHEARSING` + topic thesis, then
   `THIS VIEW` (what this pane is for), `THE MOVE HERE` (a pull-quote coaching line that *changes
   per pane* — e.g. in the drill: *"Never claim exactly-once delivery — say at-least-once plus an
   idempotent consumer, which is effectively-once"*; in the whiteboard: *"Draw the ack gap first…"*),
   and `THE SPINE OF A STRONG ANSWER` (bulleted).
   Collapsible via `›` (`aria-label="Hide companion panel"`), persisted as `cmp.collapsed`.
   On mobile it becomes a `COMPANION — coaching for this view` accordion at the top of the pane.
2. **In-probe consult:** after Reveal, `↳ Interviewer pushes further` gives the follow-up chain
   without leaving the card.
3. **In-walkthrough consult:** `▸ See the code` and `▸ What a complete answer sounds like`
   (*"model script · the full arc, not just the opener"*).
4. **Pane-hop consult:** `Y` Model Answers, `T` Trade-offs, `R` System Map, `U` Numbers, `I` Red
   Flags, `O` 30-Second. The drill cursor (`pos.<topic>.drill`) is preserved across the hop, so `W`
   returns you to the same probe.
   *Broken if:* hopping panes reset the drill. (It does not.)
5. **Search consult (`/` or `Ctrl-K`)** — a command palette over the current view, `TOPICS · 15`,
   each hit showing topic / room · kicker / a matched snippet.
   **[OBSERVED DEFECT] Search snippets leak raw HTML as literal text.** Reproduced on two queries:
   `idempot` → *"…at-least-once plus idempotency is how you get an exactly-once `<i>effect</i>`"* and
   *"…the consumer must be `<b>idempotent</b>` and the inevitable duplicates…"*; `exactly-once` →
   *"…must define what `<b>exactly-once</b>` means…"*. Queries `queue` and `retry` were clean, so it
   is source-text dependent, not universal.
6. **`Scope it first`** overlay — the clarifying-question forks (`Synchronous or Event-driven?`,
   `Standard or FIFO?`, `Work queue (SQS) or Replayable log (Kafka)?` …) with what each answer flips.
7. **`One-page cram sheet`** overlay with a `Print` button and seven sections (The spine — what you
   draw · Decisions & switch conditions · Ceilings — the numbers · Traps → the fix · Senior tells ·
   Harder angles · If they say "quickly").
8. `Esc` returns you to the exact probe.
   **[FEELS BROKEN] Every overlay disables the single-key shortcuts while open** (stated in the
   `?` panel) — so `1/2/3` silently do nothing until you `Esc`. Correct, but it is the one place the
   keyboard model has a mode.

---

# J7 — Keyboard-only, end to end

**Record class:** identical in all three. This is the app's strongest path.

1. `Tab` from load → `Skip to your rehearsal record` skip link → `main#home`
   (`aria-label="Your rehearsal record"`).
2. `Tab` to the autofocused START/RESUME card, `Enter` → topic.
3. `W` → Probe Drill. `Space` reveal → `1`/`2`/`3` grade → auto-advance. Verified: 6 consecutive
   Space+digit cycles wrote 6 correct grades with no mouse and no scrolling.
4. `E` whiteboard, `R` system map, `T` trade-offs, `Y` model answers, `U` numbers, `I` red flags,
   `O` 30-second, `Q` back to walkthrough; `← →` step the walkthrough.
5. `N` = "go to your next step — the drill, whiteboard or mock the app points you at" (a
   `Recommended next` block appears in the left rail once there is progress).
6. `P` session progress · `F` focus mode (hides both side rails; `--chrome-top/bot` → 0) ·
   `D` spacing density · `Ctrl-P` printable Q&A · `G` tour · `[ ]` topic hop · `\` index ·
   `/` search · `H` home · `Esc` close · `?` the map.
7. Mac parity is stated: *"On a Mac, `Ctrl` shortcuts answer to ⌘ too."*
   *Broken if:* focus is lost after an overlay closes, or a shortcut fires while typing in the
   search box. Neither observed.
   **[FEELS BROKEN] There is no keyboard route to the per-topic `↻` reset or to the library's
   `Cram →` without tabbing through 46 topic cards**, and the home has no landmark-jump beyond the
   single skip link.

---

# J8 — The interrupted journey (tab closed mid-drill, browser crash)

**Record class:** the loss is the same in all three; the *felt* loss scales with class.

What is written the instant it happens (survives anything):
- every grade → `progress.<topic>` (verified after each of ~60 grades)
- the cursor → `pos.<topic>.drill`
- whiteboard marks → `wbprog.<topic>` (verified after a single `Drew it`)
- the resume pointer → `nav.last`; panes visited → `viewseen.<topic>`
- notes (auto-saved, *"Saved automatically to this browser."*), bookmarks, theme, zoom, goal.

What is written **only on `visibilitychange:hidden` / `pagehide`** (`session-progress.js`):
- `trend.hist` — the whole session record that feeds the streak, the sparkline and Compare.
  **[OBSERVED] A hard crash / force-quit that fires neither event loses that session's trend point
  entirely.** Per-probe progress survives; the *session* does not, and the streak breaks even
  though the user studied.

What is never written at all:
- the revealed/graded state of the current card;
- the `Interviewer cuts in mid-answer` toggle;
- an in-flight mock run (see J5.7);
- the *identity* of this run's flagged set (see below).

Steps:
1. Mid-drill at probe 5, tab closed / crash / reload.
2. Reopen. **URL hash wins:** the tab restores to `#event-driven/drill`, title `Probe Drill —
   Deep Rehearsal`, **PROBE 5 / 21** — the cursor is exactly right.
3. **[OBSERVED, the headline break] `THIS RUN` reads `0 SOLID · 0 REVISIT · 21 LEFT`.** The thin
   lifetime bar above it is filled to 4/21, but the three big numbers a user reads say the work is
   gone. Combined with J4.2 (flag markers gone, `Drill my 0 flagged probes`), the drill pane after
   an interruption presents as a fresh, untouched topic.
4. Home confirms nothing was actually lost — RECORD, ALTITUDE, STILL SHAKY and the hero all read
   correctly. So the fix is presentational, but the pane where the user actually is is the one that
   lies.
5. In a **new tab** (rather than a reload) the app lands on `#home` and the hero says *"…and stopped
   at probe 7 of 21. 15 still ungraded."* — the good recovery. The bad recovery is only on
   reload-in-place and on `home.landing="resume"`.

---

# J9 — The multi-day arc (streaks, week goals, decay)

**Record class:** invisible in COLD; the point of ENGAGED; saturated in HEAVY.

The product states its own intended arc in the **Game plan** overlay (`Day 1 — learn the shape` ·
`Day 2 — grade yourself` · `Day 3 — reconstruct & defend` · `Day 4 — pressure` · … *"Six short days,
~30 minutes each."*). The machinery under it:

1. **Session capture.** One page-load = one `trend.hist` point, updated in place as you work, only
   if `sessLiveActivity() > 0`. Code shape:
   `CPR1.20260802.3-6-9-21.0-0-9.x-0-0.0-0-0` = date · drill got-shk-done-tot · wb got-miss-tot ·
   mock score-runs-interrupts · mixed got-shk-tot. Cap 30 points.
   **[FEELS BROKEN] Reloading five times in one sitting produces five "sessions"**, inflating the
   `last N sessions` sparkline (the streak dedupes by calendar date, the sparkline does not).
2. **Streak** (`studyStreak()`): consecutive calendar days that have any logged session; **resets to
   0 the moment the last session is 2+ days old.** It is computed but I found no home surface
   rendering it — the multi-day feedback the user actually sees is the goal bar and the sparkline.
3. **Week goal** (`weeklyGoal()`): target `goal.weekly` (default 5, stepper 1–20); done = topics
   whose `progress.ts` ≥ this Monday. Rendered twice — left rail `THIS WEEK` and the telemetry strip
   (which is the one with the J2.5 copy defect).
   **[FEELS BROKEN] One graded probe in a topic counts as a "topic drilled this week"** — the goal
   is satisfiable in 5 keystrokes.
   **[FEELS BROKEN] `ts` is last-touched, so re-opening an old topic silently moves it into this
   week** and a topic drilled Monday stops counting the moment you touch it next Monday.
4. **Decay / spaced repetition** (`dueReview()`): `Refresh · drilled clean a while ago` pills for
   topics that are 100% done, zero flagged, `ts` ≥ 7 days — labelled `Caching Strategies, 20d`.
   Gated on the migration fix that stops a content release restamping `ts` (the source calls out
   that this used to empty the nudge for every user on every release).
5. **Age surfacing:** `0d` / `4d` / `2w` on every Still-shaky chip, with the honest caveat that the
   age is *topic-level*, not probe-level (*"you last worked this topic three days ago"*, never
   "you marked THIS PROBE shaky three days ago").
6. **Hero recency switch:** `WHERE YOU STOPPED … earlier today` vs `UP NEXT … 9d ago`.
7. **Cross-day continuity:** Session Progress → `CARRY THIS SESSION ACROSS DAYS` — a copyable
   `CPR1…` code, a paste box (*"Optional: paste codes from another device"*) and `Compare`, with
   *"Your trend builds itself as you study — come back after another session to see progress over
   time."*

---

# J10 — The file's own journey (moved to another machine / browser)

**Record class:** the amount lost scales exactly with class — COLD loses nothing, HEAVY loses 637
graded probes.

1. Copy the `.html` to another machine / another browser / another profile. **The file carries the
   content and zero user state.** localStorage is origin-scoped and, on `file://`, effectively
   path-scoped — so the new copy opens COLD.
   *Broken if:* the user assumed "it's one file, my progress is in it." Nothing in the UI says
   otherwise; the status bar's *"Offline · nothing leaves this file"* arguably implies the opposite.
2. **The sanctioned path — Export a backup** (home footer / topic index footer / the storage-denied
   banner). Produces `deepdive-rehearsal-backup.json`:
   `{app:"deepdive-rehearsal", v:1, exported:"…Z", data:{ …every ddr.v1.* key, prefix stripped… }}`.
   784 bytes for a 6-probe record; notes, bookmarks, `nav.last`, `pos.*`, `trend.hist` all included.
3. **Import a backup** on the new machine → native confirm *"Import this backup? It merges into your
   current data and reloads."* → `Store.restore` (a **merge**, key-by-key, not a replace) → reload.
4. Verified lossless round-trip: export at `RECORD 7 of 972 · 7 solid · 1 of 46 topics started` →
   `Reset all saved progress` → import → **identical RECORD restored**, altitude rails included.
   *Broken if:* it silently half-restored. It does not.
   **[FEELS BROKEN] "Merges" is the only warning.** There is no preview, no conflict report, no
   "this backup is older than your current record" check — importing a stale backup over a richer
   one quietly resurrects old `progress.<topic>` objects wholesale.
5. **Version-skew hazard.** Progress is keyed by a content hash per probe (`cards:{urzm2n:3}`) with
   a schema tag `cv:2`. `migrate()` re-keys records on a `cv` bump and preserves `ts`. But a record
   whose card hashes no longer exist in the shipped content cannot be attributed: I imported a
   hand-built backup with 23 "solid" probes under invented hashes and got
   **`Altitude: 0 solid of 971 · "Nothing graded yet"` while COVERAGE BY ROOM simultaneously showed
   `1 of 7 started, 8% drilled` and STILL SHAKY listed the topic.** So a backup that predates a
   content change can land in a state where the home's headline metric says zero and three other
   panels say otherwise, with no message explaining why.
6. **`Copy link` does not travel.** It writes the absolute
   `file:///D:/claude-workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html#event-driven/wb`.
   Sent to anyone else, or to yourself on another machine, it is a dead path. Only the `#…` fragment
   is portable and nothing tells the user that.
7. **`Save this session as a PDF →`** and `Print Q&A` (`Ctrl-P`) are the other things that leave the
   file — both one-way.

---

# J11 — Leaving: what state a session leaves behind

**Record class:** COLD leaves 4 keys after a single click; HEAVY leaves ~85.

1. **On the first navigation of any session**, before any deliberate act:
   `viewseen.<topic>` (+ `viewseen.content-pipeline`, a topic the user never opened), `nav.last`,
   `pos.<topic>`.
2. **On every grade:** `progress.<topic>` (with `ts`), `pos.<topic>.drill`.
3. **On whiteboard marks:** `wbprog.<topic>`. **On a mock:** `mock.<topic>` (+ `mock.last`).
   **On mixed fire:** `mix.<topic>`, `mix.log`.
4. **On tab hide / close:** `trend.hist` gains or updates this load's `CPR1` point — this is the
   only thing that happens *because* you left.
5. **Deliberate residue:** `notes.<topic>`, `bookmarks`, `goal.weekly`, `home.landing`, `theme`,
   `ui.textzoom`, `cmp.collapsed`.
6. **Nothing leaves the machine.** No network calls; the status bar states it
   (*"Offline · nothing leaves this file"*), but only on the home.
7. **Erasure paths:**
   - `Reset all saved progress` (topic left rail) → native confirm *"Clear all saved progress and
     data? This cannot be undone."* → `Store.clearAll()`.
     **[OBSERVED] It does not leave you clean.** Because the page stays live in the topic you were
     in, the app immediately re-writes `viewseen.<topic>`, `nav.last`, `pos.<topic>` and (on the next
     hide) `trend.hist`. Measured LS one second after a "clear everything": 4 keys, including a
     working resume pointer into the topic you just wiped.
   - `↻` per topic card (`aria-label="Reset progress for <Topic>"`) — 22×22 px, `opacity 0.3` at
     rest, `1` on hover, top-right of a big clickable card. **[OBSERVED] It fires with NO
     confirmation** and deletes `progress.<topic>` outright. It does show an undo toast —
     `Cleared progress for Event-Driven Backbone [Undo]` — which is the mitigation. **It is absent
     entirely on mobile**, where hover does not exist.
   - `Clear this session & start fresh` inside Session Progress.
8. **Leaving with degraded storage** (private window / quota full): a `role="status"` banner —
   *"This browser isn't saving your progress — private mode or storage is full, so your work will be
   lost on reload."* with an inline `Export a backup` and a dismiss `×`. Verified by denying
   `window.localStorage`: the banner appears on the home **and stays visible inside a topic**, the
   drill still works (in-memory `Store` fallback), and after a reload the record is gone while the
   URL still restores the view — you land in a drill that reports 0 of everything.

---

# J12 — The phone-in-transit arc (390×844)

**Record class:** all three; the mobile home is the same data in a stacked shell.

1. Header strip: `DEEP REHEARSAL` + `Search` / `Shortcuts` / `Theme`. No left rail.
2. Bottom tab bar: `TODAY` (`data-tab=top`) · `ALTITUDE` (`alt`) · `LIBRARY` (`lib`) · `INDEX` (`idx`)
   — in-page section jumps, not routes.
3. Everything from J1/J2 stacks in one column; no horizontal overflow (`scrollWidth == clientWidth ==
   390` on home and in-topic).
4. Enter a topic: a horizontally scrolling pane strip pinned at the top (`Walkthrough | Probe Drill |
   Whiteboard | Sys…›`), a compact topic header, a `COMPANION — coaching for this view` accordion,
   a `DRILL SETUP  Study · All 21 ▾` collapsed summary, then the pane body; a persistent bottom bar
   `▶ Mock run` + `Tools`.
   **[OBSERVED] There is no `Start the drill →` CTA on mobile** — the left-rail START HERE block
   does not render, so the drill is reachable only via the pane strip or the `Tools` sheet. (My
   desktop-derived script broke here, which is how I found it.)
5. Reveal → grade: the grade row is off-screen (J3.4); the persistent bottom bar eats another ~90 px.
6. `Tools` opens the whole left-rail menu as a sheet: Topic index, Search, Copy link, Star, Your
   notes, Print Q&A, Cram sheet, Session progress, Mixed fire, Game plan, Scope it first, Keyboard
   shortcuts, Dark mode, Reset all saved progress.
   **[FEELS BROKEN] `Keyboard shortcuts` is in the mobile Tools sheet**, and the per-topic `↻`
   reset is not available anywhere on mobile.

---

# J13 — The reconstruct arc (Whiteboard)

**Record class:** all three; the Session Progress card reads `Not started — 0 of 9 graded` until used.

1. `E` / `Whiteboard  RECONSTRUCT`. Header `RECONSTRUCT FROM BLANK / What you draw, in order /
   Sketch the backbone and mark where duplicates are handled.` Counter `0 recalled · 0 missed · 9 left`.
2. Nine numbered cues (`Entry — what the producer hands over, and what it does not know`), each with
   `Reveal` / `Drew it` / `Missed`.
3. Draw on paper, then `Reveal`, then self-mark. Writes `wbprog.<topic>` per mark.
   *Broken if:* the cue gives away the answer before you draw. (`Reveal` is required.)
4. The counter and the Session Progress card update; the whiteboard slice enters the `CPR1` code.

---

# J14 — The exam-eve cram arc

**Record class:** most valuable in HEAVY.

1. `One-page cram sheet` per topic → seven sections + a `Print` button.
2. `Cram →` per room from the home library or the topic index (`data-cross=group:<room>`).
3. `30-Second` pane (`O`) — the open-and-close script.
4. `Print Q&A` (`Ctrl-P`) — printable sheet of the topic's probes.
5. `Mixed fire` — `Question 1 / 8`, each tagged by register (`TRADE-OFF`, …),
   *"Defend the call — Scale on queue depth vs cap consumer concurrency. When would you reach for
   each side?"* → `Reveal a strong answer`. Writes `mix.<topic>` / `mix.log`.
6. `Session progress` → `Save this session as a PDF →`.

---

# J15 — The reset / hand-the-file-on arc

1. Decide what to clear: one topic (`↻` on its card, undo toast, no confirm), this session
   (`Clear this session & start fresh`), or everything (`Reset all saved progress`, confirm).
2. **[OBSERVED] "Everything" is not everything** — see J11.7: a live page re-seeds `nav.last`,
   `pos.*`, `viewseen.*` within a second, and `trend.hist` on the next hide. Handing the file to a
   colleague after a "reset" still boots them into your last topic.
3. Export first if you want it back; import restores byte-for-byte (J10.4).

---

## Cross-journey defect summary (measured, most severe first)

| # | Where | What | Classes |
|---|---|---|---|
| 1 | Probe Drill, after any reload | `THIS RUN` resets to `0/0/21`, **all flag markers vanish**, and the re-drill button reads `↻ Drill my 0 flagged probes` while the home says `N flagged`. Caption *"flagged ones are marked"* is false. | ENGAGED, HEAVY |
| 2 | Home → RECENT SESSIONS | Goal-met copy renders `…goal met with 6 to spare **drilled this week** · Goal met — nice work.` (`panels.js:160` double-suffixes a complete sentence). | HEAVY / any goal-met |
| 3 | Search overlay | Snippets print raw `<b>`/`<i>` tags as literal text on `idempot`, `exactly-once`. | all |
| 4 | Topic left rail | `Interviewer cuts in mid-answer` does not persist across reload; no key written. | all |
| 5 | Library card `↻` | Per-topic destructive reset with no confirm (undo toast only); absent on mobile. | ENGAGED, HEAVY |
| 6 | `Reset all saved progress` | Says "cannot be undone", then the live page immediately re-seeds `nav.last` / `pos.*` / `viewseen.*` / `trend.hist`. | all |
| 7 | Drill card, after Reveal | Grade row below the fold at 1280×800 and 390×844 for long answers; auto-scroll of 78 px is insufficient. | all |
| 8 | Home STILL SHAKY | Signal chips are not clickable; at 234 flagged the panel truncates with no "and N more". | ENGAGED, HEAVY |
| 9 | Import | A backup whose card hashes no longer match ships a home reading `0 solid · "Nothing graded yet"` while three other panels show progress. | any importer |
| 10 | `Copy link` | Copies an absolute `file:///D:/…` path that is dead on any other machine. | all |
| 11 | Cross-topic drill from home | Navigates into the last topic's drill *and* opens the shuffle over it; closing leaves you somewhere you did not choose. | ENGAGED, HEAVY |
| 12 | Guided tour | 8 steps, reachable only via `G`, advertised nowhere on the cold home. | COLD |
| 13 | Drill mode/level switch | `THIS RUN` resets; the `FOCUS BY LEVEL` chip still reads `All 21` in a 5-probe Quick 5 set. | all |
| 14 | Crash without `pagehide` | The whole session's `trend.hist` point is lost; streak breaks though the user studied. | ENGAGED, HEAVY |
