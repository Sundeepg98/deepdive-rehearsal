<!-- ============================================================================
     AUTHOR: w1-verifier (independent cold verification agent).
     Committed verbatim by w11-builder (the wave's BUILDER) at team-lead direction,
     2026-07-29 -- body unaltered below the rule; only this header was added.

     Independence note, because it is the whole value of this document: the verifier
     shares no context with the builder, wrote its OWN instruments (its differ decodes
     through Chromium's canvas.getImageData and shares no code with test/_pixels.cjs),
     and never wrote to this worktree -- history was extracted with `git show` into a
     scratch directory. It verified the tree at tip 7e702b0.

     Its two NON-BLOCKING findings are both defects in the BUILDER's freeze report,
     not in the code, and both have been amended into
     _audit/2026-07-29-w1-spotfixes.md (see the two boxed corrections there).
     Nothing in this file was softened to make that amendment read better.
     ============================================================================ -->

---

# W1 cold verification — VERDICT

**VERDICT: CLEAN.** Every one of the 13 fixes is real, measured and live on the shipped build; all
five guards are genuinely falsifiable; the gate is 62/62 on the committed tree; the VR churn is
correctly attributed. **Two NON-BLOCKING findings, both in the freeze REPORT's accuracy, neither in
the code, neither affecting the merge decision.** No blocking findings.

- Target: `D:\claude-workspace\_worktrees\deepdive-rehearsal\w11-spotfix`, branch
  `frontend/w1-spotfixes`, tip `7e702b0`, base `437564c`.
- Worktree **byte-clean at 7e702b0** at start and at finish; deliverable md5
  `f4d17435db9b7aa22f516836ab62aa3a` unchanged across the gate's in-place rebuild. No commits, no
  edits, no `vr:update`, no checkout of history in the worktree (history was extracted with
  `git show` into scratch).
- All instruments, captures and crops:
  `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w1-verify\`

---

## FINDING 1 — NON-BLOCKING · the flow_data 7b red is NOT reproducible from history

The freeze states: *"All reds were captured against `437564c` before any fix existed; the guards
were committed in `ffcbd80`, one commit ahead of the fixes, **so the red is reproducible from
history**."* That is false for `flow_data` section 7b.

I ran `git show ffcbd80:test/flow_data.cjs` verbatim (with `ffcbd80:test/_boot.cjs`, which is
byte-identical to tip) against the pre-fix deliverable. It **dies before reaching 7b**:

```
Error: timed out after 30000ms waiting for: reset to the walk route before the ordering pin
    at flow_data.cjs:334
```

Cause: that version's reset asserts `/(^|\/)walk$/.test(location.hash)`, which cannot match the
**bare** `#walk` hash the boot topic uses (`router.js` `topicPrefix()` keeps the boot topic's URLs
bare). Commit `51496c9` — the *fix* commit — silently repaired it to a `hashView()` comparison.

So the freeze's quoted 7b red block cannot have come from any committed instrument:

```
FAIL 7b ORDERING: ... -> {"which":"drill.weak","hash":"#home","title":"Home - Deep Rehearsal","on":"drill"}
```

Corroborating: the app emits an **em dash** (`view-manager.js:69/85`,
`label + ' \u2014 ' + BASE_TITLE`), not the ASCII hyphen in that quote. The block is a hand
transcription of an intermediate working copy (one without the reset step, which would indeed have
left the spy firing from `#home` after `goBack()`).

**Why non-blocking.** The substance holds. I reproduced the red with the **shipped** instrument
against the pre-fix build — the property that actually matters:

```
FAIL 7b ORDERING: -> {"which":"drill.weak","hash":"#walk","title":"Walkthrough — Deep Rehearsal","on":"drill"}
FAIL 7b ORDERING: -> {"which":"wb.rerunMissed","hash":"#walk","title":"Walkthrough — Deep Rehearsal","on":"wb"}
```

**Recommended correction:** amend the freeze to state that the 7b red was captured from a working
copy and re-quote it from the shipped instrument, or record the `ffcbd80` regex defect explicitly.
Receipts: `red-flow_data-AS-COMMITTED-ffcbd80.txt` (dies), `red-flow_data.txt` (tip instrument, 7 red).

## FINDING 2 — NON-BLOCKING · the VR churn geometry is under-described

My differ decodes through **Chromium's own decoder** (`canvas.getImageData`), so it shares no code
with `test/_pixels.cjs`; it clusters changed pixels into connected regions and I hit-tested each
centroid in the live app. The desktop churn is **three disjoint clusters**, not "one box at (20,239)":

| cluster (walk-light) | px | hit-test | attribution |
|---|---|---|---|
| `[16,224,160,288]` | 1055 | `button.nd-go` < `div#ndock.dock` | **P3-1** dock copy — visually confirmed `KEEP GOING / Back to the drill →` -> `START HERE / Start the drill →` |
| `[16,672,48,688]` | 130 | `button.flow-pip` < `div.seg` | **P3-3** pip — visually confirmed, dot moved left |
| `[272,272,288,288]` | 6 | dock card's own bottom-right rounded corner | antialiasing, **max channel delta 6/255** |

The pip sits **~400px below** the dock; `(20,239)` is only the bounding box's top-left corner, so
"one box" reads as one surface when it is two well-separated ones.

The freeze's *"The rest of the 1280x800 frame is untouched"* / *"Nothing else moved"* is **2 pixels
too strong on `walk-dark`**: a cluster at `(20,382)`+`(20,383)`, **delta 1 in a single channel**
(`rgb(30,27,37)`->`rgb(30,28,37)`), hit-tests to `div.mockcta` / `button#inttog` — outside both
attributed surfaces.

**Why non-blocking.** Both stragglers are sub-perceptual curve antialiasing (delta <= 6 of 255), and
the gate's `visual_regression` passing 16/16 against the committed baselines proves they are a
*deterministic* consequence of the change, not encoder noise. The attribution **conclusion** — every
changed pixel traces to P3-1 or P3-3 — stands. `m-walk` is a single cluster `[0,768,272,848]`,
visually confirmed as the NextUp chip (`Keep going —` -> `Start here —`) plus the `Mock run` button
shifting as the chip's width changed — exactly as the freeze says. The 4 untouched baselines
re-confirmed byte-identical by md5. Receipts: `vr-diff.json`, `crop-A-dock.png`, `crop-B-y672.png`,
`crop-C-dot.png`, `crop-D-walkdark.png`, `crop-E-mwalk.png`, `hittest.txt`.

---

## 1. P2-1 router fix — end to end, my own instrument (`probe_router.cjs`, 22/22 PASS)

Real `n` keypress on a cold topic, driven through the keyboard, not the DOM:

| | measured |
|---|---|
| hash | `#walk` -> `#drill` |
| title | `Walkthrough — Deep Rehearsal` -> `Probe Drill — Deep Rehearsal` |
| history depth | 3 -> 4 (**exactly** +1) |
| pane | follows to `drill` |
| focus | lands on `#stagehead` (P2-9), not BODY |
| Back | hash returns to `#walk`, **pane follows**, and `aria-current` follows (exactly one, on `walk`) |
| reload | lands on `drill` — the audit's named downstream guarantee |
| `#copylink` | copies `file:///...html#drill` — the pane we are on |

Also: re-navigating to the pane you are already on adds **no** history entry (3x `goView('drill')`
while on drill: `history.length` 5 -> 5), so Back is not poisoned (`probe_hist.txt`).
And no surviving bypass: the only executable `switchTab(` outside comments is the legitimate
no-Router fallback at `shell.js:102`.

### The same-tick ordering claim — CONFIRMED, and the 7b spy is NOT vacuous

`router.js:99-107`: `navigate()` calls `pushState()` then `emit()` in the same function body; it
never waits on a `hashchange` (which `pushState` does not fire). So `goView` -> `applyRoute` ->
`switchTab` completes before `flowGo` continues, and `rec.weak` / `rec.wbreset` keep their ordering.

**Negative control (the brief's ask), executed concretely.** I wrapped `Router.navigate` to defer
via `setTimeout(...,0)` and re-ran the same spy shape:

```
SYNCHRONOUS (real): [{"which":"drill.weak","hash":"#drill","on":"drill"},{"which":"wb.rerunMissed","hash":"#wb","on":"wb"}]
ASYNC (control):    [{"which":"drill.weak","hash":"#walk","on":"walk"},{"which":"wb.rerunMissed","hash":"#walk","on":"walk"}]
```

The spy records the hash **at the moment the side effect fires**, and under an async navigation it
sees the stale hash — i.e. flow_data 7b would go RED. The pin is real.

## 2. P3-2's deliberate divergence — ADJUDICATED, all three disk reasons hold

1. **`scoreboard_resume` pins the opposite** — `test/scoreboard_resume.cjs:93` asserts
   `sGot === '0' && sShk === '0'` on resume plus a `/this run/i` caption, and
   `drill/logic.js:126-131` documents choosing relabelling over seeding in prose, as the #22 fix.
   Deriving all three tiles from the record breaks that assertion head-on. **Holds.**
2. **The microtask-freshness law** — `judge()` calls `this.renderD(true)` at `logic.js:728` and
   dispatches `drillgraded` at `:760`; `progress.js:417` snapshots on that event. renderD provably
   reads a record one grade stale. **Holds.**
3. **Not a resume defect** — the probe-nav delegated handler at `logic.js:367` sets
   `self.di = +btn.getAttribute('data-i')` and re-renders without touching `results`. **Holds** (the
   freeze's line number is exact).

### Both cases verified LIVE (`probe_scoreboard.cjs`, 14/14 PASS)

| case | measured |
|---|---|
| clean sequential run | `2 + 1 + 19 = 22` = working set; `di === results.length`, so byte-identical to the old basis |
| **mid-drill reload at probe 4** | `0 + 0 + 22 = 22` OK — pre-fix `cards - di` would have given LEFT 19, summing to **19 != 22** |
| **fresh-run probe-nav jump to 14** | `0 + 0 + 22 = 22` OK — pre-fix LEFT 8, summing to **8 != 22**; no reload involved |
| caption | still `This run` (the #22 contract untouched) |

**Spoken readout** (`:753` in the shipped tree; the freeze cites `:729`): `"Solid. 1 solid, 0
revisit, 21 left."` — agrees with the tiles digit for digit and sums to 22; pre-fix it would have
said `7 left`. **`scoreboard_resume`: PASS** in the gate.

Minor, not a finding: `scoreboard_resume.cjs:81` still derives a payload field named `di` as
`stats.dTot - +sLeft`, which post-fix no longer equals `di`. It is never asserted, so nothing breaks
— but the name now misleads.

## 3. The five guards — falsifiability and anti-vacuity

**Reds reproduced with the TIP instruments against the pre-fix build** (437564c deliverable
extracted into scratch; the worktree was never dirtied):

| guard | red | matches freeze |
|---|---|---|
| `token_liveness` | FAIL(8) — `--ease-spring -> ""`, probe at `0s`, `.mock-x` + `.inttog-dot::after` `all 0s`, both themes | yes |
| `heading_tree` | FAIL(6) — 4 topic routes at `renderedHeadings = 1`, `#stagehead` role/level null, static markup bare | yes |
| `seg_state` | FAIL(20) — `ariaCurrent null` on all 10 tabs | yes |
| `focus_ring` | FAIL(5) — `#adv`/`#jg` `1px auto rgb(16,16,16)`; the three chrome buttons `3px none` | yes |
| `flow_data` | FAIL(7) — the freeze's 6 section-7 arms **plus** ladder 4a (a P3-1 pin added in `51496c9`) | yes (+1 expected) |

**Anti-vacuity demonstrated, not asserted:**

- **`focus_ring` asserting the APP ring is load-bearing.** Pre-fix `#adv`/`#jg` computed
  `outline: 1px auto rgb(16,16,16)` — style is `auto`, **not** `none`, so the weaker
  `outline-style !== 'none'` form would have **PASSED on exactly the UA hairline the check exists to
  eliminate**. The shipped form (`fv && solid && >=2px && color === var(--acc)` resolved in-page)
  discriminates.
- **`token_liveness` arm 2's design is load-bearing against a real token.** `--duration-instant: 0ms`
  **exists** in `tokens.generated.css`. Checking duration tokens by *timing-function* (`linear`)
  rather than by duration is what lets it pass honestly instead of being indistinguishable from the
  shorthand-reset signature. In my pre-fix red exactly one token failed (`--ease-spring`).
- **`seg_state`'s 10-tab walk.** I ran my own independent walk of all 10 tabs on tip (exactly one
  `aria-current="true"`, on the active tab, nothing stale) and reproduced 20 reds across all 10
  pre-fix — an attribute hardcoded on one button could not produce that.
- **`heading_tree`'s `#home` control** passed pre-fix while all four topic arms failed — the shape
  that says the app is wrong, not the instrument.

**Receipt correction #2 adjudicated and CORRECT.** On `#home` the DOM holds 4 heading elements and
only **2 render** — both `h2.hm-h` ("Choose a room", "All topics"). The single `h1` ("Content
Pipeline") has no layout boxes, and `.app` computes `display: none`. The audit's "h1 + two h2s = 3"
was wrong; the freeze's correction is right (`probe_home.txt`).

**Ubuntu-CI hazard pre-cleared.** Scanned all four new guards and flow_data's 7a/7b for
`waitForTimeout`, `Date.now`, `setTimeout`, `screenshot`, `getBoundingClientRect`, `offsetWidth`,
`clientWidth`, `fontSize`, `document.fonts`, `Math.random`: **zero hits**. Every assertion is a
computed-style, attribute or structural read. No wall clock, no font metrics, no pixels, no load
sensitivity.

## 4. Receipt correction #1 — `#stagehead` tabindex

- **Runtime:** `topic-protocol.js:198` reads
  `if (head) { try { head.setAttribute('tabindex','-1'); head.focus({preventScroll:true}); } catch(e){} }`
  — confirmed verbatim. The proof it was already there: `heading_tree`'s tabindex arm **PASSED on the
  pre-fix build**. The audit's erratum ("absent anywhere") was wrong.
- **Static markup:** the shipped deliverable declares
  `<div class="stage-head" id="stagehead" role="heading" aria-level="2" tabindex="-1">`
  (independent grep of the 12MB deliverable).
- **G5 pins the SHIPPED markup**, not the runtime value: `heading_tree.cjs:141` reads the HTML file
  with `fs.readFileSync(HTML)` and regexes the `<div ... id="stagehead" ...>` tag.
- **Hotkeys with focus parked on `#stagehead`:** `q`->walk, `w`->drill, `e`->wb, `r`->sys,
  `o`->open all jump; `Space` reveals in the drill (grade row appears); `3` grades (a result is
  recorded). Focus stays on `#stagehead` through the pane jumps.
- Edges: `goView('home')` does **not** park focus on the hidden `#stagehead`; the focus move does not
  scroll the stage (`preventScroll` honoured, `stage.scrollTop` and `window.scrollY` both 0).

## 5. The remaining spot fixes — sampled with receipts (`probe_spotfix.cjs`)

- **P2-2** `--ease-spring` = `cubic-bezier(.34,1.56,.64,1)` in **both** themes; `.mock-x` ->
  `transform/background/color/border-color/box-shadow` at `.15s/.2s x4`; `.inttog-dot::after` ->
  `left, transform` at `.25s` both carrying the spring. Source level: **zero** self-references
  outside comments (the one textual hit in the deliverable is inside the explanatory comment); the
  only live declaration is the real curve.
- **P2-10** `aria-current` exactly one, on the active tab, across all 10 tabs.
- **P3-6 / P2-3** the three chrome buttons and the two shadow controls: green under `focus_ring`,
  red pre-fix with the computed values above.
- **P3-7** announces `Text size 108%` / `Text size 116%, largest` / `Text size 85%, smallest`; at the
  ceiling `aria-disabled="true"` with `disabled === false`, `tabIndex 0`, computed `opacity 0.4`
  (look unchanged) — and a **real Tab** from `A-` lands on the at-ceiling `A+` button, which a
  `disabled` button would have skipped.
- **P3-9** `.nd-go` -> `transform, color, opacity` at `.15s`; `.nd-go:active{transform:translateY(1px);
  opacity:.75}`; `.dock.nd-swap{animation:ndswap var(--duration-moderate) var(--ease-glide)}` with no
  `fill:forwards`. Replay discipline verified: same-state re-render twice -> class **not** stamped;
  genuinely different CTA -> stamped.
- **P3-1** cold -> `Start here / Start the drill →`; `dDone=10` still `Back to the drill →` (strict
  refinement); **empty bank (`dTot=0`) -> `Try the whiteboard →`**, so the `dTot>0` gate holds.
- **P3-3** measured with one instrument on **both** builds: pre-fix pip spans x=5..11, tip spans
  x=2..8, label at x=12 -> **gap 1px -> 4px**. Negative control demonstrated.
- **P2-13** `.pane.on` computes `panein 0.25s`; neither `panein` nor `paneinDark` carries `blur()`.
- **P3-8** `<aside class="sidebar" aria-label="Topic controls">`, `<main class="stage" role="main"
  aria-label="Study content">` in the shipped deliverable.
- Zero page errors across every probe run.

## 6. VR

- Gate `visual_regression`: **PASS — 16 baselines, every capture reached a proven rest state across
  all 18 roots, cleared the blank-page floor, and matched its committed pixels.**
- Independent md5 of all 16 baselines vs their `437564c` versions: **12 changed, 4 byte-identical**
  (drill-light/dark, home-light/dark) — exactly the freeze's addendum table.
- Region attribution: see FINDING 2. Conclusion stands; geometry description is loose.

## 7. Gate

**62 PASS / 0 FAIL** on the committed tree, reproduced independently
(`gate-COLDVERIFY.txt`). `build_integrity` reports the **full** form —
`COMMITTED deliverable == fresh build of HEAD` — not `DEFERRED`, because I wrote the capture outside
the worktree. Notably green after what this wave touched: `scoreboard_resume`, `flow_data`,
`flow_handoff` / `flow_evidence` / `flow_contract` / `flow_cursor`, `transition_deadzone`,
`click_drift`, `overlay_keyboard` (47 assertions across 7 dialogs), `shadow_css_guard`,
`build_determinism`. Tree byte-clean afterwards; the in-place rebuild reproduced the deliverable
byte for byte.

## 8. Residuals — honest

- **`.piv-jump`**: `system-map.js:44` is
  `.piv-jump:hover,.piv-jump:focus{background:var(--acc);color:var(--on-slab);border-color:var(--acc);outline:none}`
  — live, and the freeze's line number is exact. It is a real `<button>` (emitted at `:110`), and
  `.piv-jump:focus` is (0,2,0), so it does outrank `button:focus-visible` (0,1,1). Genuinely the same
  defect class as P3-6 (focus reveal byte-identical to hover, ring deleted) and genuinely outside the
  13-item scope.
- **`.chip-link` dead CSS**: grepping `chip-link` across all of `src/` returns **only** the two CSS
  rule lines at `system-map.js:60-61`. Zero emitters. The claim is exact.
- **Pre-cleared, not a finding:** `num/logic.js:30` `.ninp input:focus{outline:none;...}` also removes
  the outline, but replaces it with a visible 3px accent box-shadow + accent border — a legitimate
  custom focus indicator, not the P3-6 defect.

## 9. My own instrument defects, disclosed

Three failures in my probes were **mine**, not the app's, and are corrected above:

1. Pip check: I added a clause `textLeft <= padding-left + 0.5`; the label starts at x=12 against an
   11px padding, so the clause failed while the real measurement (gap 4px) passed.
2. "hotkey from `#home`": `shell.js:256-257` deliberately no-ops the tab keys on the home when
   `LastVisit.topicId()` is empty ("no topic to mean"), and I had cleared localStorage. Pre-existing,
   deliberate, and untouched by W1 — the `51496c9` `shell.js` diff touches only the `switchTab` loop
   and `goView`.
3. "no bogus history entry": failed twice on my own sequencing (I was not on the drill when I
   re-navigated). Re-run cleanly: 5 -> 5. PASS.

## 10. Cosmetic staleness noticed (not findings, no action required)

- `topic-protocol.js:307` still cites *"session-progress.js reveals a pane with a bare
  switchTab(rec.tab) and no hash write"* as one of two reasons `_tpOnScreen()` reads the `.pane.on`
  class rather than the hash. P2-1 removed that bare call, so the prose is stale — but the
  implementation is unchanged, remains the safer choice, and its second justification (`setTopic()`
  re-deriving the view from the OLD hash) still stands. **No behavioural risk.**
- `session-progress.js:91` cites `drill/logic.js:638` for the renderD-before-`drillgraded` fact,
  which now lives at `:728`/`:760`.
- The freeze's P3-2 table says "at probe 4/21" while the bank is 22 (its own P3-1 row says "0 of 22
  graded"). Illustrative numbers only; measured values are 22 cards, pre-fix LEFT 19.
