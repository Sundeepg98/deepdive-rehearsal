<!-- VERBATIM COPY. Authored by an independent judge/verifier of the appeal campaign
     (the-complaint lens), 2026-08-01, against appeal/home-instrument @ 532a1a6.
     Preserved unedited as the record round 2 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-2 addendum). -->

# W1 — JUDGE: THE COMPLAINT

**Subject:** the BUILT home of Deep Rehearsal, branch `appeal/home-instrument` (`532a1a6`), judged
against master tip `1c533d7`, the spec `appeal-directions/CHOSEN.md`, the freeze
`_audit/2026-07-31-appeal-home-freeze.md`, and the three originals `d1/d2/d3/home.html`.

**Lens:** the-complaint. *"the frontend is not looking like an application… the visual design is not
appealing."*

**VERDICT: FIXABLE.** The complaint is answered — structurally, decisively, and in the right
direction. But the one region the wave singled out for its own final polish is the region that
shipped broken, and the hero it is built around is unbounded: on the default path it grows to 103%
of a 1280×800 viewport and 166% of a phone, pushing the signature entirely off-screen. Six named
defects follow. None require redesign; all are local. Nothing here argues for abandoning the spine.

Everything below was measured on the built file
(`deepdive_content_pipeline_rehearsal.html`) driven under Playwright at 1280×800 and 390×844,
deviceScaleFactor 2, both themes. Numbers are CSS px from `getBoundingClientRect` /
`getComputedStyle`, not read off screenshots.

---

## 1. Is the complaint answered?

**Yes, and it is not a close call.**

The operator's sentence was literally true of the old home, and the cause was three lines of
stylesheet (`styles.css:1984-1986`, `html[data-view="home"] .app{display:none}`). Measured on the
built tree, on the home route:

| | before (`1c533d7`) | after (`532a1a6`) |
|---|---|---|
| `.app` computed display on `#home` | `none` | **`flex`** |
| shell columns present | 0 | **3** — rail `x0→296`, stage `x296→960`, companion `x960→1280` |
| persistent chrome | none | status census pinned at the frame's foot; companion has its own scroller (`overflow:auto`, `scrollW 319 == clientW 319`) |
| phone | a document that scrolls as one page | fixed top bar `h52` + bottom tab bar `.hm-tabs` `y799 h45`, `.app` padded `52px 0 53px` to reserve both |

That is an application shell, and it is the shell the topic routes already owned — extended, not
forked. The before shot is a well-set page *about* an application; the after is the application.

**The signature is real.** The altitude gauge (`.hm-alt` `624×269`, `.hm-gauge` `590×112`) is three
tapering rails of 46 segments each, grade carried by fill and outline, hue reserved for room,
untouched topics kept as empty outline so the denominator stays honest. Nothing on the before screen
could have been mistaken for an instrument. This could not have existed on the old home at all, and
it is the single best thing on the new one.

**Both themes ship and the dark one is genuinely handsome** — the desk-darker-than-the-work-surface
relationship holds, and the gauge reads better in dark than light.

Against the three originals: the build is a faithful execution of **d1 "The Instrument"** (rail /
stage / companion, the gauge, the census bar, the phone tab bar) with **d3's** question-hero, 41ch
display measure (`.hm-q` max-width resolves to `556.2px` at 21px Space Grotesk — the token is live)
and second-person resume line grafted on. The graft is where it comes apart.

## 2. Would a person opening this tomorrow feel they are opening software they want to use?

**On the state the receipts capture — yes.** On a state one keystroke away — **no.**

The receipts were captured with the resume pointer on the **drill** pane, where the hero is a real
57-character probe question. That is one of nine panes, and it is not the default.

`home-view.js:213-217` heroes a probe question **only** when `cur.kind === 'drill'`; otherwise it
falls back to `t.identity.thesis`. `cursor()` (`home-view.js:96-108`) returns a drill cursor only
when `view === 'drill'` **and** a position is stored. `lastView()` (`home-view.js:50`) reads
`LastVisit.resumeView()`, whose fallback is `'walk'` (`last-visit.js:56`) — and `walk` is the app's
own default pane (`test/_boot.cjs:109` navigates a bare topic entry to `walk`).

So the fallback is not an edge case; it is the default path. Measured census of what it heroes:

| | probe questions | topic theses |
|---|---|---|
| n | 972 | 46 |
| median length | **62 chars** | **435 chars** |
| p90 | 105 | 927 |
| max | 224 | **1127** |
| ends in a question mark | — | **0 of 46** |

The hero is a `<p class="hm-q">` wrapped in curly quotes under the heading *"Where you stopped ·
&lt;Topic&gt;"*. On the fallback branch it puts a **median-435-character declarative paragraph in
quotation marks** and presents it as something an interviewer said. Rendered worst case
(`probabilistic-structures`, 1129 chars):

- **1280×800:** `.hm-q` = **22 lines, 600.5px tall**; `.hm-continue` = **826.6px = 103% of the
  viewport**. The gauge is entirely below the fold. The Resume button is at `y≈855` — off-screen.
- **390×844:** `.hm-q` = **42 lines, 1146.5px**; the panel = **1399.6px = 166% of the viewport.**

Receipt: `worst-thesis-desktop.png`. A person opening that tomorrow sees a wall of quoted prose, no
instrument, and no action.

## 3. The weakest region of the new screen

**The CONTINUE strip — `.hm-continue` / `.hm-act` (`home-view.js:198, 246`; `styles.css:2222`).**

It is the weakest region three times over: it is the only place the wave applied its own deliberate
final polish (the "Chanel cut", freeze §7b); it is the region all three prototypes solved cleanly and
identically; and it is the region that shipped visibly broken in the receipts themselves.

The cut removed the CTA's saturated fill and left it in a `<div class="hm-act">` that the wave
added. `.hm-act` was already the class of the three rail utility **buttons** (`home-view.js:140-142`),
and `styles.css:2049` gives it `min-height:44px; border:1px solid var(--bd); border-radius:10px;
background:var(--card); cursor:pointer`. The new rule at `styles.css:2222` overrides **only** the
padding. So the wrapper `<div>` keeps the entire button chrome.

Measured, desktop, engaged state:

| | value |
|---|---|
| `.hm-continue` panel | `x316 w624`, border `1px rgb(232,228,220)`, bg `rgb(255,255,255)`, bottom `363.3` |
| `.hm-act` wrapper (a `<div>`) | `x317 w248.9`, border `1px rgb(232,228,220)`, bg `rgb(255,255,255)`, radius `10px`, bottom `362.3`, `cursor:pointer`, `min-height:44px` |
| same border colour / same background | **true / true** |
| left borders apart | **1.0px** |
| bottom borders apart | **1.0px** |
| wrapper short of panel's right edge | **374.1px — 60% of the panel width** |

The result is a phantom bordered card that shares two edges with its parent 1px off and terminates
in mid-air on the third. It is plainly visible in the shipped receipt — see
`crop-hero-receipt.png`, cropped from `_audit/appeal-home-receipts/1280x800-after.png`: the
light rounded rectangle hugging the panel's bottom-left corner with the Resume button breaking out
of its top edge. It is *more* visible in dark, where `var(--card)` is a lighter plate.

It is also a **fake control**. Hovering its dead padding — verified at `(929, 362)`, inside the
wrapper's 24px right padding, `matches(':hover') === true` — fires `.hm-act:hover`
(`styles.css:2052`) and swings its border and text from `rgb(232,228,220)` to **`rgb(83,74,183)`,
the brand indigo**. Receipt: `hover-phantom.png`. A non-interactive `<div>` with `cursor:pointer`
that lights up in the brand accent and does nothing when clicked, wrapped around the primary action,
on the first screen — including the **cold** home a new user lands on.

And the freeze's own §7b says of the CTA: *"it is the only bordered control in the column."* Measured
on the shipped build, that sentence is false — the thing it is wrapped in is bordered too, in the
same token, one pixel away.

The remaining 374.1px of that row is empty plate. All three prototypes fill it: d1 puts *"Resume the
drill"* on the right of the strip level with the title; d2 puts *"TAKE THE STAGE →"* there; d3 sets
Resume and the reason line side by side in one row. The build alone stacks them and leaves 60% of
the row blank inside a visible border.

## 4. Defects, ranked

1. **The hero is unbounded and usually not a question.** `home-view.js:217` —
   `if (!q) q = plain((t.identity && t.identity.thesis) || t.identity.title);` — puts a median-435-char,
   max-1127-char declarative thesis in curly quotes on the default (`walk`) path. Worst case the
   Continue panel is **103% of a 1280×800 viewport / 166% of 390×844**, `.hm-q` is **22 / 42 lines**,
   and the altitude gauge — the signature — is entirely off-screen. 0 of 46 theses is a question.
   Fix is local: clamp `.hm-q`, and quote only what was actually asked.

2. **The phantom `.hm-act` card.** `home-view.js:198, 246` + `styles.css:2049` vs `:2222`. Section 3
   above: a bordered white `<div>` inheriting the utility-button class, 1px inside the panel's left
   border, 1px above its bottom border, 374.1px short on the right, `cursor:pointer`, and lighting
   its border to brand indigo on hover of dead space. Visible in the shipped receipts, both themes,
   both breakpoints, cold and engaged. Fix: give the wrapper its own class.

3. **The gauge's verdict accuses on a tie.** `home-view.js:293` guards with `graded === 0`, but the
   comment directly above it (`:286-290`) correctly describes the failure as *"every tier ties at
   0%"*. `Altitude.compute()` (`altitude.js:85`) uses a strict `<`, so `thin` can never leave the
   first tier on a tie and is always `'Staff'`. Measured on a record with 4 probes graded and 0 solid
   — Staff 0/310·0%, SDE3 0/359·0%, SDE2 0/302·0% — the home printed: **"Staff is the thin rail. 0
   solid of 310 probes… the level you are interviewing for is the one you have rehearsed least."**
   That is the accusation-from-nothing the comment forbids, and it also fires in reverse on a perfect
   record (all rails tie at 1.0). Receipt: `live-desktop.png`. The signature's punchline must not be
   provably false. Fix: test share equality, not emptiness.

4. **The resume line contradicts itself.** `home-view.js:234` + `:238`. When the resume target has no
   progress record, `why` reads *"You opened this topic and have not graded a probe in it yet."* and
   `rest` reads *"Every probe here is graded."* — because `left = max(0, (pr.tot||0) - (pr.done||0))`
   is `0` on an absent record. Two adjacent sentences, flatly opposed, in the second line of the
   screen. Visible in `worst-thesis-desktop.png`.

5. **The library cards paint a button under the count.** `styles.css:1690` `.ix-c-reset{position:absolute;
   top:9px; right:9px; width:22px; height:22px; …; opacity:.3}` and `:1700` `.ix-c-badge{position:absolute;
   top:10px; right:11px; …}` are pinned to the same corner unconditionally; source order puts the
   badge on top. Measured in the companion column: badge `x1227.8→1258`, reset `x1239→1261` —
   **19px of overlap**. The word "weak" is printed across a 22px reset button. Pre-existing in the
   `ix-cell` component, but this wave promoted that component from a behind-a-keystroke overlay to
   the permanent landing-screen companion column, so it is now on the first screen on every card
   with progress. Receipt: `crop-libbadge.png`, cropped from the shipped
   `_audit/appeal-home-receipts/1280x800-after.png`.

6. *(minor)* **The phone's brand mark reads as a hamburger and isn't one.** `.hm-brand` is a
   `<span>` (`home-view.js:137`), not a button, `closest('button,a') === null`. On mobile it is
   clipped to `18×13px` containing three stacked `<i>` bars, and `.hm-wm` ("Deep rehearsal") is
   clipped to zero — so the top-left of a fixed phone bar holds a three-bar glyph in the canonical
   hamburger position that does nothing when tapped, and the product name appears nowhere on the
   phone. Receipt: `live-mobile.png`.

## 5. What is genuinely good, so this reads as calibrated

The shell extension is the correct diagnosis executed correctly, and it does not fork anything. The
gauge is a real signature with real rules (fill/outline for grade, hue reserved for room, honest
denominator) and it survives greyscale. The status census at the foot is good, quiet furniture. The
census/gauge split — the bar reports the whole bank, the gauge reports the three rungs — is an
honest distinction rather than one number reused. Dark theme is not an afterthought. The 41ch
display measure is live and correct. The room hue on the CTA (`--rm`, not the boot-constant `--acc`)
is right. The freeze's honesty about topic-granular age is the right instinct, and the copy
("You marked 4 probes shaky in this topic 3d ago") pays only what the record can pay.

Every defect above is in one strip of one column, plus one inherited component that got promoted.
The direction is not in question. The hero region needs another pass.

---

**Receipts** (all under
`C:/Users/Dell/AppData/Local/Temp/claude/D--claude-workspace-deepdive-rehearsal/bfc4e186-9eb0-4148-a383-84020244f407/scratchpad/w1judge/`):
`probe.json`, `probe2.json` (geometry, palette, thesis census), `crop-hero-receipt.png`,
`crop-libbadge.png` (crops of the shipped receipts), `live-desktop.png`, `live-desktop-dark.png`,
`live-mobile.png` (tie-verdict state), `worst-thesis-desktop.png`, `worst-thesis-mobile.png`,
`hover-phantom.png`, `proto-d1/d2/d3.png`.
