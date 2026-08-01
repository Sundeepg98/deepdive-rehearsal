<!-- VERBATIM COPY. Authored by an independent judge/verifier of the appeal campaign
     (independent cold verify, agent w1-verifier), 2026-08-01, against appeal/home-instrument @ 532a1a6.
     Preserved unedited as the record round 2 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-2 addendum). -->

# W1 COLD VERIFY — `appeal/home-instrument` — verdict

Verifier: `w1-verifier`, independent of the builder. Subject worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`, branch `appeal/home-instrument`,
tips `e07e2a5` + `532a1a6` on base `1c533d7`. Nothing was written to the worktree or the main repo;
every mutation was made against a copy in scratch. Captures under
`C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w1-verify\`.

> **Note on this directory.** It already held a `VERDICT.md` dated 2026-07-29 from an unrelated cold
> verify — branch `frontend/w1-spotfixes`, base `437564c`, gate 62/62. Same "W1" label, different
> wave; the scratch dir was reused. I did not create it, so I preserved it as
> `VERDICT-2026-07-29-w11-spotfix-PRIOR.md` rather than overwrite it away. Several `probe_*`,
> `crop-*` and `red-*` files here belong to that earlier run, not to mine; my files are all dated
> 2026-08-01.

## VERDICT: **PASS with findings** — 6 of 7 items PASS, 1 FAIL. **0 blocking, 5 non-blocking, 4 notes.**

The gate is real, the new instrument has teeth and demonstrably catches what the old predicate
cannot, the build is deterministic, the zone map is honoured, and the freeze's account is accurate in
every claim I could check. The one FAIL is item 4: two of the four born-accessible acceptance
criteria are not met on the built home and a third is met only partially. None of it is a regression
against `1c533d7` — it is unbuilt, not broken — so it does not block a merge, but it does mean the
wave cannot be described as having landed the AT items.

| # | Item | Verdict |
|---|---|---|
| 1 | Gate integrity — 75/75, delta is exactly +`home_reflow`, `home_rhythm.py`'s fate | **PASS** |
| 2 | New / re-anchored instruments have teeth; baseline provenance | **PASS** |
| 3 | The `grade_reveal` flake claim reproduces 3/3 | **PASS** |
| 4 | Born-accessible criteria (h1 / landmarks / skip link / card names) | **FAIL** (2 unmet, 1 partial, 1 met) |
| 5 | Zone-map reconciliation (DOOR/BOARD, L3, coverage-as-shape) | **PASS** |
| 6 | Determinism — rebuild and byte-compare | **PASS** |
| 7 | Commit hygiene | **PASS** |

---

## 1. Gate integrity — PASS

I ran the full gate myself on the committed tree, capture written outside the repo
(`gate-run1.txt`).

```
================================================================
GATE: PASS
EXIT=0
```

75 check lines, 75 PASS, 0 FAIL, 0 SKIP. Count receipt:

```
$ grep -cE "^  [a-z_0-9]+ +(PASS|FAIL|SKIP)" gate-run1.txt                          -> 75
$ grep -cE "^  [a-z_0-9]+ +(PASS|FAIL|SKIP)" _audit/2026-07-31-appeal-home-gate.txt -> 75
```

**My run is status-identical to the committed capture.** Diffing the name+status columns:

```
--- DIFF ---
IDENTICAL: same 75 checks, same statuses
```

**Registration delta vs `1c533d7` is exactly +1; nothing removed, renamed or weakened.** Extracting
every registered check name from both registration loops in both revisions:

```
=== 1c533d7 === 74
=== HEAD ===    75
=== DIFF ===
39a40
> home_reflow
```

`git diff 1c533d7..HEAD -- test/check_all.py` is `13 +` / `0 -`: a comment block plus the single line
`('home_reflow', 'test/home_reflow.cjs'),`. No other registration line was touched.

### `test/home_rhythm.py` — its fate, and whether the freeze is honest about it

**It is a PRE-EXISTING check (W22 / audit P3-11), registered at `test/check_all.py:218` in BOTH
`1c533d7` and `HEAD`.** Not new, not folded into `home_reflow`, not abandoned — **re-anchored**,
exactly as freeze §5 says.

```
$ grep -c "home_rhythm" <base check names> <head check names>   ->  1   1
```

REGISTRY membership: 8 slots before, 8 after; `.hm-top` / `.hm-state` / `.hm-cta` out,
`.hm-continue` / `.hm-alt` / `.hm-duo` in. The three departed `gap.home.*` tokens are deleted from
`design-tokens/tokens.json` in the same commit, so neither direction of the cross-check is left
holding an orphan. Standalone run:

```
    rhythm gaps  : 8 discovered
    measures     : 11 discovered
    registry     : 8 slot(s)
    self-test    : 7 planted defects found (raw gap; bare-primitive gap;
                   raw measure; bare-primitive measure; a gap inside
                   @media; an unregistered NEW home block; a RAW display
                   measure) + shorthand slot arithmetic asserted, and the
                   display measure pinned BOTH ways ...
    cross-check  : 0 NEW, 0 STALE
HOME RHYTHM: PASS
```

The freeze's account is **honest**, and precise in a way worth crediting: it writes "Re-anchored" for
`home_rhythm` and reserves "Re-anchored, and strengthened" for `search_deadend`. I read both diffs
and that distinction is correct — `search_deadend` genuinely gained an assertion per arm
(`stageVisible` *and* `appVisible === true`, where it previously had only `appVisible`), while
`home_rhythm` traded membership and added a scope carve-out. See note N3 on that carve-out.

---

## 2. Instruments have teeth — PASS

Method: the deliverable is a self-contained single file, so I copied it to scratch and injected one
CSS plant before `</head>` (`plant.mjs`), then pointed the check at the copy. The worktree was never
written to, and nothing needed restoring.

### 2a. `home_reflow` — negative control, then red

**Control** — pristine scratch copy, no plant:

```
  PASS  [320/light] nothing on the home is clipped out of reach
  PASS  [320/light] the document does not scroll horizontally
  ... (8 assertions)
  2 planted mutants detected (a wide child in the FIXED bar ... and a wide child in the flow)
CONTROL EXIT=0
```

**Plant** — `html[data-view="home"] .hm-rail .hm-act{min-width:180px !important}`, a wide child
forced into the fixed top bar:

```
  FAIL  [320/light] nothing on the home is clipped out of reach  -- span.hm-acts +254px past its
        viewport (right 574 vs 320) "Search /Shortcuts ?Theme" | button.hm-act +254px past its
        viewport (right 574 vs 320) "Theme" | ...
  PASS  [320/light] the document does not scroll horizontally
  FAIL  [320/dark]  ... +254px ...
  PASS  [320/dark]  the document does not scroll horizontally
  FAIL  [390/light] ... +184px past its viewport (right 574 vs 390) "Theme" ...
  PASS  [390/light] the document does not scroll horizontally
  FAIL  [390/dark]  ... +184px ...
  PASS  [390/dark]  the document does not scroll horizontally
HOME REFLOW: FAIL (4)
PLANT EXIT=1
```

Red on all four arms, naming the Theme button — the same control the freeze says was found off-screen
at 390px before this check existed.

**The load-bearing part: the weaker predicate stayed GREEN on all four.** "the document does not
scroll horizontally" PASSED in every planted arm while the Theme button sat 254px off-screen. That is
the freeze's central claim about `documentElement.scrollWidth` being blind in a fixed shell,
**reproduced independently rather than taken on the builder's word**. This check earns its
registration.

(The `span.hm-mk +18px past its hm-brand` lines in the same output are a consequence of my plant —
the squeezed flex row pushes the logo mark past `.hm-brand`, which is `overflow:hidden` at mobile.
Not an independent defect; the pristine control is clean.)

### 2b. `room_browser` — the re-anchored check, same treatment

Re-anchored from `#home .hm-brand` to `.hm-rail .hm-brand` (freeze §4 defect 2). Control on the
pristine scratch copy:

```
ROOM BROWSER: PASS  (data-group + --topic-ink + --acc rebind at boot; reduced-motion renders in
both themes; the home brand mark wears the brand indigo and claims no room)
CONTROL EXIT=0
```

Plant — `.hm-rail .hm-brand{color:var(--room-messaging-events) !important}`:

```
ROOM BROWSER: FAIL
  - [light/home] .hm-brand is rgb(0, 107, 99), not the brand indigo rgb(83, 74, 183) that the
    .ix-panel neutralisation carries
  - [light/home] .hm-brand (rgb(0, 107, 99)) is room ink for [messaging-events] -- the brand mark
    must claim NO room
  - [dark/home] .hm-brand is rgb(19, 186, 172), not the brand indigo rgb(157, 147, 240) ...
  - [dark/home] .hm-brand (rgb(19, 186, 172)) is room ink for [messaging-events] ...
PLANT EXIT=1
```

Both themes, the exact W15 defect. **And the re-anchor could not have silently passed**: measured on
the built home, `document.querySelectorAll('#home .hm-brand').length === 0` and
`document.querySelectorAll('.hm-rail .hm-brand').length === 1`. The old selector would have died
loudly at the check's `B.until(..., 'home brand mark mounted')` wait, not drifted quietly green.

### 2c. Baseline provenance

Exactly two baselines re-shot; the freeze's "exactly three changed files" claim is true:

```
$ git diff --stat 1c533d7..HEAD -- test/baselines/
 test/baselines/home-dark-win32-chromium149.png  | Bin 83504 -> 145269 bytes
 test/baselines/home-light-win32-chromium149.png | Bin 84639 -> 148503 bytes
 test/baselines/manifest.json                    |   6 +++---
 3 files changed, 3 insertions(+), 3 deletions(-)
```

The other 14 are byte-identical. **Manifest integrity independently verified** — I recomputed the
manifest's own hash function (`sha256(buf).slice(0,16)`, `visual_regression.cjs:424`) over all 16
committed PNGs:

```
--- 16 manifest entries, 0 mismatched ---
png on disk: 16; orphaned (no manifest entry): none
```

Receipts complete: `_audit/appeal-home-receipts/` holds 4 files — `1280x800-{before,after}.png` and
`390x844-{before,after}.png`, both viewports, both sides. I opened all four. They are genuine and show
what the freeze describes: the before is a centred column on cream with four floating pills and a
full-bleed blue slab reading a topic's NAME; the after is a three-column application frame with the
question as hero, the Resume control **unfilled** (the Chanel cut is visible — an outlined control,
not a saturated slab), the altitude gauge, and the status census at the foot. The 390px after shows
the fixed top bar and the bottom tab bar (TODAY / ALTITUDE / LIBRARY / INDEX).

---

## 3. The flake claim — PASS

`grade_reveal` standalone on the committed tree, three consecutive runs on a quiet box:

```
===== grade_reveal run 1 =====   run 1 EXIT=0    GRADE REVEAL: PASS
===== grade_reveal run 2 =====   run 2 EXIT=0    GRADE REVEAL: PASS
===== grade_reveal run 3 =====   run 3 EXIT=0    GRADE REVEAL: PASS
```

3/3 reproduces the freeze's claim, and my full gate run is a fourth independent PASS. The specific arm
the freeze names — clicking Missed and reading the record back — is present and green in every run:

```
  PASS reveal: a real click on Missed at the reveal moment records the grade (level 1) under the
       probe content id
  PASS merge: re-grading the same probe (via re-drill) overwrites -- record holds the SECOND grade
  PASS merge: the re-grade is ONE entry, not a duplicate (done stays 1 -- same content id)
```

The mechanism argument holds on inspection: `Panels.bind(root, opts)` (`panels.js:445`) attaches to
the root it is handed and never to `document`, and the wave's three roots are disjoint from the
drill. One imprecision in the freeze's wording — note N1.

---

## 4. Born-accessible criteria — **FAIL** (2 of 4 unmet, 1 partial, 1 met)

Measured statically on the built home at 1280x800 on a seeded returning-user record, via the DOM and
Chromium's own AX tree (CDP `Accessibility.getFullAXTree`). No NVDA. Probes: `at-zone-probe.cjs`,
`probe2.cjs`, `probe3.cjs`.

### 4a. Exactly one h1 — **NOT MET** (zero). Pre-existing, not a W1 regression.

```
=== HEADINGS (R = rendered) ===
 . h1   lvl1   Content Pipeline
 R h2   lvl2   Where you stopped · Probabilistic Data Structures
 R h2   lvl2   Altitude — solid probes by interview tier
 R h2   lvl2   Still shaky
 R h2   lvl2   Recent sessions
 R h2   lvl2   Choose a room
 R h2   lvl2   Library — 46 topics, six rooms
```

The document's only `h1` is `src/index.html:41`, inside `.side-id`, which is `display:none` on the
home route (`styles.css:2005`). **The home renders no h1 and never did**: `test/heading_tree.cjs`
lines 89-91 already carry a receipt correction dated 2026-07-29, on the pre-wave tree — *"The home
renders NO h1 ... the sidebar h1 has no layout boxes on #home because .app is display:none there."*
On `1c533d7` the whole `.app` was hidden, so the h1 was hidden too. The wave changed the *reason* (now
`.side-id` rather than `.app`) and left the outcome unchanged. `heading_tree` passes because its home
arm asserts `>= 2` rendered headings, not an h1.

### 4b. banner / main / navigation landmarks — **PARTIAL**

```
=== LANDMARKS (R = rendered) ===
 R complementary aside   .sidebar                     name="Topic controls"
 R navigation    nav     .hm-rsec                     name="Rooms"
 R navigation    nav     .hm-rsec                     name="Practice"
 . navigation    nav     .topic-nav      #topicnav    name="Switch topic"
 . navigation    nav     .hm-tabs        #hometabs    name="Home sections"
 . main          main    .stage                       name="Study content"
 R main          main    .homev          #home        name=""
 R complementary aside   .companion                   name="Rehearsal companion"
 R contentinfo   footer  .hm-status      #homestatus  name=""
```

- **main: MET.** `src/index.html` now contains two `<main>` elements, which would be invalid if both
  were exposed — but `.stage` is `display:none` on the home route, so **exactly one main reaches the
  AX tree**. Measured: `stageDisplay: "none"`, `appDisplay: "flex"`. This is the risk the wave's
  structural change created, and it is correctly handled.
- **navigation: MET.** Two named nav landmarks on the desktop home ("Rooms", "Practice");
  `#hometabs` "Home sections" is display:none on desktop and is the phone's bottom bar.
- **banner: NOT MET.** No `<header>` and no `role="banner"` anywhere in the rendered set. The brand
  mark and the primary actions live in an unlabelled `div.hm-rail` inside the `complementary`.
- Two further defects in the same family: `main#home` has **no accessible name**, and `aside.sidebar`
  is still named **"Topic controls"** on the home route while it holds the home rail (rooms, practice,
  weekly goal) and none of the topic chrome. That name is now wrong on this route.

### 4c. A real skip link, visible on focus — **NOT MET**

Exhaustive search of the built home for skip-link-shaped elements:

```
  skip-link candidates: [{"tag":"div","cls":"hm-skip","href":"",
    "text":"Skip the home — resume straight into my last topic","renderedNow":true}]
  total visible tabbables: 101
```

The single hit is a **preference checkbox** ("skip the home on future visits"), not a skip-to-content
link. There is no `a[href="#..."]` skip link on the route. With 101 visible tabbables and the rail's
~20 controls preceding the work column in DOM order, this is the criterion's whole use case.

**A correction to my own instrument, recorded because it nearly became a false finding.** My first tab
probe reported the first Tab stop as a `.hm-chip` at y=1223 — apparent evidence of a broken tab order.
That was wrong: I had blurred the autofocused CTA, and blurring does not move the *sequential focus
navigation starting point*, so Tab continued from mid-page. Re-measured in DOM order, the tab order is
correct:

```
  1. y=   50  button.hm-act    rail=Y  "Search /"
  2. y=   50  button.hm-act    rail=Y  "Shortcuts ?"
  3. y=  100  button.hm-act    rail=Y  "Theme"
  4. y=  181  button.hm-rrow   rail=Y  "Messaging & Events7"
  ... 5-8 the remaining room rows
```

**There is no tab-order defect.** Only the missing skip link.

### 4d. Concise card names, description demoted to `aria-describedby` — **NOT MET**

The sharpest of the four. Chromium's own AX tree over the built home:

```
  CHROMIUM AX: 99 named buttons in the whole home document
  accname length -- median 59, max 1198;  OVER 120 chars: 46
  longest accname (1198 chars): "10/21 , Probabilistic Data Structures , APPROXIMATE ANSWERS AT
    SCALE , Probabilistic data structures answer questions about massive datasets approximately,
    in a tiny fraction of the memory an exact an ..."

  .hm-lib buttons: 71  (with aria-label: 25, with aria-describedby: 0)
  unlabelled card buttons (name = full text content): 46
  name length chars -- min 157, median 481, max 1195;  over 120 chars: 46/46
```

All 46 library topic cards compute their accessible name from their entire contents — count, title,
eyebrow **and the full topic description**. Zero carry `aria-describedby`; zero carry `aria-label`. A
screen-reader user arrowing the library hears a 481-character name, median, before reaching the next
card. The 25 buttons that *do* carry `aria-label` are the `Cram: <room>` and `Reset progress for
<topic>` controls, and those are correct and concise — the pattern is present in the file, it simply
was not applied to the cards.

**On citing `at_name_hygiene` as corroboration, as the brief asked:** it passes 52/52 with 9+2
mutants, and the AX tree shows why that is not corroboration for *this* criterion. That check guards
**separators** — that adjacent fields do not fuse into "Notifications5" — and the names above are
indeed correctly comma-separated. It carries no assertion about name length or about the
name/description split, so it is structurally unable to see this. The wave shipped the commas; it did
not ship the demotion.

---

## 5. Zone-map reconciliation — PASS

Against `_ia/ADOPTED.md` (flow-first is the map of record) + `zonemap-flow.md` Z1/Z2 +
`zonemap-library.md` rules L2/L3.

### 5a. DOOR and BOARD: **two zones on one route**, with Z1 also carrying two states in one slot

`zonemap-flow.md:72` rules it: *"This is why DOOR and BOARD are two zones on one route rather than one
zone."* The builder implemented that, and additionally honoured Z1's own boundary *"Two states, one
slot"*. Measured, receipts case:

```
  .hm-continue : y=28  h=281     <- Z1 THE DOOR
  .hm-alt      : y=335 h=269     <- Z2 THE BOARD begins
  then .hm-duo (still-shaky + this-week), .hm-rooms (coverage by room)
```

- **Two zones**: the door is a distinct `<section class="hm-continue">`; the board is `.hm-alt` +
  `.hm-duo` + `.hm-rooms` + `.hm-tele` beneath it.
- **Two states in the door's one slot**: `continueHtml()` branches on `Panels.engaged()` — cold is
  "Start here" + the value-prop lead + a **Start** CTA; warm is "Where you stopped · <topic>" + the
  question + a **Resume** CTA. Same slot, different verb, which is Z1's boundary verbatim.
- **Z2 sits below the door, never above it** — satisfied by construction and by the geometry above.
- **Z1 owns exactly one primary action**: `autofocusCount: 1`, `autofocusSel: ["hm-cta"]`,
  `activeEl: "button.hm-cta"`. No second autofocus, no competing CTA.

The spec justifies it: CHOSEN.md §6 lists the block order (CONTINUE, ALTITUDE, STILL SHAKY, COVERAGE
BY ROOM, THIS WEEK, LIBRARY) and §6.5 explicitly keeps the telemetry *below* the decision.

**Z1's hard floor — the map's one "must not regress" — verified live.** From a bare `#home` arrival,
one keystroke, zero clicks:

```
  Z1 HARD FLOOR: Enter from a bare arrival  #home ->
    {"hash":"#caching/drill","view":"drill","topic":"caching","stageUp":true}
```

with the CTA sub-line reading `Probe Drill · probe 11 of 21`. It lands on the exact cursor. Intact.

### 5b. RULE L3 — the library does not occupy the decision's vertical budget: **SATISFIED**

L3: *"the shelf is a PERSISTENT FRAME, not a scroll block ... always available, never occupying the
decision's vertical budget."* The rule was written against a measured pre-wave state of the library at
y=1187→3405 of a 3405px home — **~65% of the home's scroll height**. Measured after:

```
  homeCol (#home): x=296 w=664   (right edge 960)
  lib (.hm-lib)  : x=961 w=319 h=800
  libInsideHomeColumn: false
  libParentLandmark : "aside.companion"
```

The library is a full-height own-scroll column in `aside.companion`, structurally outside `#home`. It
takes **0%** of the decision column's vertical budget. This is the rule's own prescribed expression,
and CHOSEN.md §3.3 is where it was promised.

### 5c. RULE L2 — coverage is SHAPE, never VERDICT: **SATISFIED**

The before receipt heroes `30% of the curriculum · 291 probes drilled · 19 of 46 topics started` — a
single coverage percentage as the headline state. That percentage is **gone**. What replaced it:

- the status census reports **counts**: `291 of 972 probes graded | 213 solid · 51 shaky · 27 missed |
  19 of 46 topics started` — shape, not judgement;
- the readiness readout is **level-against-tier** (three rails, per-tier solid share), which is the
  form L2 itself names as correct: *"Readiness is level-against-tier."* Its verdict sentence names
  which rail is thin, not how ready you are;
- and on a cold record the verdict refuses to accuse at all — the branch at `home-view.js:293` prints
  the instrument's explanation instead of "Staff is the thin rail", which with zero graded probes
  would be an accusation derived from nothing.

No coverage number is presented as a verdict anywhere on the route.

*Flagged, not charged to this wave:* `weeklyGoal()`'s "topics with done > 0" semantics — Risk 2 in the
same section of `zonemap-library.md`, the metric that lets five topics × one probe count as a met goal
— survives unchanged, and the home still shows "6 of 5 topics drilled this week · Goal met".
CHOSEN.md §6.5 explicitly keeps that telemetry as-is, so this is in-scope-as-kept rather than a miss.
Recorded so it is not read as endorsed by the wave.

---

## 6. Determinism — PASS

```
=== PRE-BUILD ===
4e81b7b654eea4759212ab33580315665824d591dbe12626a6fbdec588d00876 *deepdive_content_pipeline_rehearsal.html
a43114ac19ba0ea0395ae3338a75074070c3bf5b0c276c7cc6b1a57baf48af2c *src/tokens.generated.css
=== BUILD ===   BUILD EXIT=0   built in 15.43s
sync-deliverable: dist/index.html -> deepdive_content_pipeline_rehearsal.html (12204730 bytes)
=== POST-BUILD ===
4e81b7b654eea4759212ab33580315665824d591dbe12626a6fbdec588d00876 *deepdive_content_pipeline_rehearsal.html
a43114ac19ba0ea0395ae3338a75074070c3bf5b0c276c7cc6b1a57baf48af2c *src/tokens.generated.css
=== COMPARE ===  BYTE-IDENTICAL
=== GIT STATUS AFTER BUILD ===  (clean)
```

Independently corroborated inside my gate run by two checks measuring this from different angles:

```
  build_integrity    PASS  (12204730 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the
                     deliverable, COMMITTED deliverable == fresh build of HEAD)
  build_determinism  PASS  (88 Shiki blocks render identically under a simulated 600ms/line stall;
                     control confirmed the stall trips a default-budget tokenizer)
```

---

## 7. Commit hygiene — PASS

Tree clean at arrival, clean after my full gate run, clean after my rebuild. Two commits on
`1c533d7`:

- `e07e2a5` — 24 files: source, regenerated deliverable, tokens, the new + re-anchored checks, the two
  home baselines + manifest, the four receipts, the freeze, the gate capture.
- `532a1a6` — 9 files: the Chanel cut (`styles.css` + deliverable), the two baselines **re-shot**, the
  two `*-after.png` receipts **re-shot**, and a 4-line update to the gate capture.

That ordering matches the freeze's §7b/§8 account: the accessory came off, then the baselines and
receipts were re-taken, then the capture of record was refreshed — which is why my independent run
reproduces the committed capture line for line. Ignored paths are the normal generated set (`dist/`,
`node_modules/`, `src/tokens.generated.css`, `src/topics/_generated/`); no stray artefacts.
`src/tokens.generated.css` being gitignored is consistent with CHOSEN.md §4's "GENERATED. Never
hand-edit it."

The "written outside, then copied in" liturgy is not directly provable after the fact, but nothing
contradicts it and the capture is internally consistent with the tree it describes.

---

# FINDINGS

## BLOCKING — none.

## NON-BLOCKING

### B1. The hero is a QUESTION only when the resume view is the drill; otherwise it is the topic thesis, unclamped

The wave's headline claim — freeze §2, CHOSEN.md §6.1 — is *"the hero is the probe you were being
interrogated on"*, stated unconditionally. Measured, it is conditional on
`LastVisit.resumeView() === 'drill'`.

The path: `resumeView()` (`last-visit.js:50-58`) returns `'walk'` whenever there is no stored view or
the stored view is not a valid non-home route. `cursor(id, view)` (`home-view.js:97+`) only yields a
probe when `view === 'drill'`. `continueHtml()` then falls through at `home-view.js:217`:

```js
if (!q) q = plain((t.identity && t.identity.thesis) || t.identity.title);
```

So a returning user whose last pane was the Walkthrough — the app's own default landing view, and
`resumeView()`'s hard-coded fallback — gets the topic's **thesis** set in curly quotes at display
size, presented as something a person asked them. Measured at 1280x800 on a seeded record:

| case | hero | `.hm-continue` | `.hm-alt` top | fold |
|---|---|---|---|---|
| `resumeView=drill` + cursor (the receipts case) | 61 chars, a real question | 281px | y=335 | above |
| `resumeView=walk`, caching | 365 chars (thesis) | 417px | y=471 | above |
| `resumeView=walk`, probabilistic-structures | 1129 chars (thesis) | **827px** | **y=881** | **BELOW** |

Theses run 305–1247 chars (38 measured, median 477, 8 over 800). At roughly 0.54px of door height per
character, about the top six topics push the **altitude gauge — the wave's signature — entirely below
the 800px fold**, on the same viewport the VR baseline and the receipts use.

`.hm-q` carries no clamp. The app already clamps this exact string elsewhere: `.ix-c-thesis`
(`styles.css:1858`) clamps the thesis to 2 lines in the topic index, and `.nt-item-x`
(`styles.css:1795`) clamps to 3. The fix exists in the codebase's own vocabulary.

Two costs, one visual and one editorial: the signature instrument leaves the fold on a reachable path,
and a topic's thesis is typeset as a quotation nobody uttered. Freeze §3 is scrupulous about the *age*
limit and says nothing about this one; that section is the right home for it.

### B2. Library topic cards put the whole description in the accessible name (AT item P1-2 not implemented)

46 cards, 0 `aria-label`, **0 `aria-describedby`**, accname median 481 chars, max 1198, 46/46 over 120.
Receipts in §4d. The `Cram:` and `Reset progress for` buttons in the same subtree do it correctly, so
the pattern is present in the file — it was simply not applied to the cards. Note that
`at_name_hygiene` cannot detect this: it guards separators, not concision.

### B3. No skip link

Absent on a route with 101 visible tabbables. The only "skip"-named element is the `Skip the home —
resume straight into my last topic` preference checkbox. Partially mitigated by the autofocused CTA
(focus starts in the work column), but shift-tabbing, or any second visit to the rail, traverses ~20
controls.

### B4. Landmark gaps: no banner; `main#home` unnamed; the sidebar's name is wrong on the home route

No `<header>` / `role="banner"` anywhere. `main#home` has an empty accessible name. `aside.sidebar` is
announced **"Topic controls"** on the home route while it contains the home rail and none of the topic
chrome — a one-line fix where `home-view.js` mounts the rail. (`nav#hometabs` "Home sections" and
`nav#topicnav` "Switch topic" are correctly named and correctly hidden.)

### B5. Zero h1 on the home — pre-existing, not a W1 regression

Documented in the base's own `heading_tree.cjs` receipt correction dated 2026-07-29, and structurally
guaranteed on `1c533d7` because the whole `.app` was hidden there. The wave brought the application
frame back onto the home route — the moment to give the route a document title — and did not. Cheapest
correct fix: promote `hm-ask-h` to an `h1` on the home, since it is already the route's
`aria-labelledby` target.

## NOTES

**N1. The flake mechanism argument overstates by one listener.** Freeze §12: *"The home's own
document-level listeners are gated on `HomeView.isOpen()`."* Precisely: the `click` listener is
(`home-view.js:411`); the `change` listener (`home-view.js:425`) is **not** — it is gated on
`e.target.id === 'hm-skip-cb'`, an id that exists only on the home. The conclusion survives intact
(neither listener can act on a drill route), but the sentence as written is not what the code says.

**N2. Two different numbers are given for the same measurement.** The freeze §6 and the `check_all.py`
registration comment both say the Theme button's right edge landed at **394** inside a 390px bar.
`test/home_reflow.cjs`'s own file header says **421**. Both are presented as the measured figure for
the same pre-fix defect; one is wrong. Worth reconciling — this number is the receipt for why the
check exists.

**N3. `home_rhythm`'s `--measure-display` carve-out is a genuine scope narrowing.** A block whose only
`max-width` is the display measure now contributes **no** rhythm gaps (`home_rhythm.py:288`). It is
pinned both ways in the self-test (`.hm-q` must be judged as a measure but must not be asked for a
stack-rhythm role, and a raw `41ch` still fails via `.hm-rawdisplay`), and the REGISTRY cross-check
would fail STALE if a *registered* block drifted out of scope. The residual hole is a **new,
unregistered** home block adopting the display measure to escape rhythm judgement. Small — and the
freeze does not overclaim, writing "Re-anchored" rather than "strengthened".

**N4. A correction to my own instrument, recorded so it is not repeated.** My first tab-order probe
reported the first Tab stop as a still-shaky chip 1223px down the page. That was an artifact: blurring
the autofocused CTA does not move the sequential focus navigation starting point, so Tab continued
from mid-page rather than from the document start. Re-measured in DOM order the tab order is correct
(rail actions, then room rows). No tab-order defect exists. The nearly-filed false finding is exactly
the class this repo's "it took 4 tries to make it fail" note warns about.

---

## Files

My captures, probes and plants — all outside the repo, all dated 2026-08-01:

- `gate-run1.txt` — my independent 75/75 gate capture
- `build.txt`, `prebuild-hashes.txt`, `postbuild-hashes.txt` — the determinism receipt
- `grade_reveal-1.txt`, `-2.txt`, `-3.txt` — the flake re-runs
- `at-zone.txt`, `probe2.txt`, `probe3.txt` — AT + zone-map measurements
- `plant.mjs`, `pristine.html`, `plant-reflow.html`, `plant-brand.html` — the mutation harness
- `at-zone-probe.cjs`, `probe2.cjs`, `probe3.cjs`, `thesis-len.mjs` — the probes
- `committed-status.txt`, `mine-status.txt` — the gate-capture comparison

Not mine (preserved from the 2026-07-29 `frontend/w1-spotfixes` verify): `VERDICT-2026-07-29-w11-spotfix-PRIOR.md`,
`probe_*`, `crop-*`, `red-*`, `vr_diff.cjs`, `vr-diff.json`, `hittest.*`, `gate-COLDVERIFY.txt`,
`prefix-437564c.html`, `base-old/`, `histtest/`.
