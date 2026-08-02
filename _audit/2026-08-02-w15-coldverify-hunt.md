# W1.5 COLD VERIFY -- INDEPENDENT HOSTILE HUNT

**Hunter** an agent with no part in building, judging or freezing W1.5, and no sight of the build
or judge transcripts. Every number below was produced by this agent driving the frozen build.

**Subject** branch `appeal/w15-refinements`, frozen tip `9421057`, worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\w15-home`. Base for the wave diff: `2696291`.

**Ground** everything the wave touched: `src/scripts/app/shell.js`, `view-manager.js`, `panels.js`,
`home-view.js`, `print-qa.js`, `keyboard-overlay.js`, the `@media print` block and the stepper /
gauge / telemetry blocks in `src/styles.css`, and the wave's own new arms in `test/`
(`home_fold.cjs`, the `overlay_deadzone.cjs` section 5/6 additions, the `home_claims.cjs` judge and
mutant additions, the `focus_ring.cjs` 13-16 additions, the `touch_floor.cjs` section 6/6b
additions, `check_all.py`, `home_rhythm.py`, `visual_regression.cjs`).

**Mandate** hunt for what is BROKEN. Arms are hunted as hard as the app. Ruled decisions are not
relitigated; surfaces the wave never touched are out of scope except where the wave's own change
newly exposes them.

**Read-only** the worktree was never written except for this file. Every mutant was planted in a
live page (`addInitScript` / `page.evaluate` / an injected `<style>`) or in a scratch file under
`%TEMP%\claude\...\scratchpad\`; nothing under `src/`, `test/`, `dist/` or `_audit/` was modified.
A sibling verifier's `_audit/2026-08-02-w15-coldverify-fixes.md` was present and untracked; it was
not opened past its header and not touched.

**Instruments** Playwright / chromium-1228 (`D:\dev-cache\ms-playwright`), driving
`dist/index.html` -- `cmp` clean against the committed `deepdive_content_pipeline_rehearsal.html`.
Trusted input only (`page.keyboard.press`, `page.mouse.click`, a real `setInputFiles` drop). Paper
is a real `page.pdf({format:'A4', preferCSSPageSize:true, printBackground:true})`, not a DOM proxy.
Where a boot-window state had to be held open, the instrument is the same `Router.init` accessor
hold `overlay_deadzone.cjs` section 6 uses -- the state that check itself certifies as
byte-identical to the window its natural runs land in. Accessibility facts are read from CDP
`Accessibility.getFullAXTree`, not inferred from attributes.

---

## VERDICT

**Not a clean bill.** Eight findings: two MODERATE defects in the app, one MODERATE arm gap around
a latent defect, three LOW, two observations. None of them is a reason to unfreeze on its own; F1
and F2 are one line and ~six lines respectively and both sit on surfaces this wave created or
newly exposed. The wave's own arms are strong -- `home_fold`, `home_claims` and `overlay_deadzone`
all re-run green on the frozen tree with every planted mutant caught, and I could not find a check
among them that cannot fail. The gaps are all in what the arms do NOT reach: nothing in 77 checks
presses the goal stepper, nothing enumerates what else lands on the home's paper, and the boot arm
tests every key except the chord the same cycle fixed.

Arms re-run by me on the frozen tree, from `dist/index.html`:

| arm | result |
|---|---|
| `home_fold.cjs` | PASS, 88 assertions, 2 planted mutants detected, 27.2s |
| `home_claims.cjs` | PASS, 13 planted mutants detected, legend arm exercised on 6 keel-painting records |
| `overlay_deadzone.cjs` | PASS, 74 assertions incl. the seeded boot-gate mutant |

---

## FINDINGS

### F1 [MODERATE] The floating "Scroll to top" disc prints on the home's record

**Mechanism.** The wave's new `@media print` home block (styles.css :549-597) hides `.hm-rail`,
`.hm-tabs`, `.hm-skip` and un-fixes `.hm-status`, on the stated ground that a `position:fixed` bar
"painted OVER the flow at the bottom of EVERY sheet". The same paragraph examines `#scrolltop` and
leaves it alone:

> `#scrolltop` was checked and left alone: it is opacity:0 / visibility:hidden until you scroll,
> and it is a child of `<body>` rather than of `.app`, so it never depended on the hide above.

The second clause is exactly why it survives -- nothing hides it. The first is true only at scroll
0. `scroll-to-top.js` adds `.show` past `THRESHOLD = 400`, and `.scrolltop.show` is
`opacity:1;visibility:visible;position:fixed`. W1.5 cycle 4 deliberately handed Ctrl+P on the home
back to the browser, so the print a reader takes is the print of the page they were reading --
after scrolling.

**Measured** (frozen `dist/index.html`, engaged record = 12 topics drilled to the end with a shaky
probe left in each):

| page | after a normal scroll | A4 PDF | negative control (`.show` lifted, same page) |
|---|---|---|---|
| `#home` @1280x800 | `scrolltop show`, `position:fixed`, `opacity:1`, `visibility:visible`, 44x44, scrollY 712 | **2pp, 149,264 B, U+2191 x1** | 2pp, 143,721 B, U+2191 x0 |
| `#home` @680x900 (the A4 content-box band) | same, scrollY 725 | **2pp, 149,264 B, U+2191 x1** | 2pp, 143,721 B, U+2191 x0 |

Delta attributable to the disc alone: **+5,543 bytes and the arrow glyph**. The `show` state
survives `emulateMedia({media:'print'})` unchanged (re-read after the switch: `opacity:1`,
`visibility:visible`, `position:fixed`).

**Reachability.** Max scroll on `#home`: 371px cold @1280x800 (under the 400px threshold), **1008px
on an engaged record @1280x800**, 1326px cold @390x844. So it is reachable on the desktop as soon
as the record has any content, and on the phone always.

**Why nothing caught it.** `overlay_deadzone.cjs` section 6's CTRL+P-outcome arm asserts two things
about the sheet -- `#home` has rects with `homeText > 1000`, and no `.cram-ov` paints. It never
enumerates what else is on the paper, and it measures under `emulateMedia` at viewport 1280x900,
which is a different layout from the ~680px A4 content box the fix is reasoned about.

**Named fix.** One line, beside the three hides already there:

```css
html[data-view="home"] .scrolltop{display:none !important}
```

Wider option: add `.scrolltop` to the unconditional `.app, .mock-ov, .rail, .badge` hide -- it is UI
chrome on every route. I could not reproduce it over the cram sheet on a topic route only because
`#saga/walk` @1280x800 scrolls 340px, under the 400px threshold; a taller pane would show it there
too.

**Arm fix.** The CTRL+P-outcome arm should assert a POSITIVE list of what may paint on the home's
sheet, not `#home` present plus one named absence.

---

### F2 [MODERATE] The weekly-goal stepper's only announcement channel cannot fire, and its clamp is silent

**Mechanism.** Cycle 4 stripped the bar's `role="img"` + `aria-label` -- the right call, it
duplicated the line beneath it -- and named its compensations in source (panels.js, `goalStrip`):

> Nothing is lost: the visible line directly under it carries the whole fact, in the accessibility
> tree as text, and the two stepper buttons keep their own names ("Lower/Raise the weekly goal")
> **and the target keeps its `aria-live`**.

The first two hold. The third does not. The `[data-goal]` handler re-renders by swapping the whole
strip (`panels.js:620`, unchanged by this wave):

```js
if (gEl) { var _gt = document.createElement('div'); _gt.innerHTML = goalStrip(); if (_gt.firstChild) gEl.replaceWith(_gt.firstChild); }
```

so the `aria-live="polite"` node on `.ix-goal-t` is destroyed and recreated on every press. It is
never mutated, so it never fires. This is the failure mode this repo already documents verbatim, in
`view-manager.js`:

> A live region must already be in the accessibility tree BEFORE its content changes, or the change
> is not an update to a known region -- it is just a new subtree appearing, and NVDA/JAWS commonly
> miss it.

**Measured** -- one press of `+` through the real control (`page.mouse.click` on the painted box),
cold record @1280x900:

```
before : target "5"   line "0 of 5 topics drilled this week &middot; 5 more to go"
after  : target "6"   line "0 of 6 topics drilled this week &middot; 6 more to go"
         liveRegionMutations      0        <- MutationObserver(childList+characterData+subtree+attributes)
         liveRegionSameNode       false
         liveRegionStillAttached  false    <- the region was detached, not updated
         stripReplaced            true
         parentChildListMutations 1        <- one swap
         ariaLive                 "polite" (on the NEW node)
```

CDP `Accessibility.getFullAXTree` over `.ix-goal`, before and after, confirms two facts changed in
the tree (`StaticText "5"` -> `"6"`, and the sentence) with no update to an existing live region.
The only thing an AT is given after the press is the re-focused button's own name, which is
unchanged ("Raise the weekly goal").

**Second half: the clamp says nothing either.** 7x `Enter` on `-`, engaged record, both widths:

```
1280x800 : 4 -> 3 -> 2 -> 1 -> 1 -> 1 -> 1     aria-disabled = null at every step
390x844  : 4 -> 3 -> 2 -> 1 -> 1 -> 1 -> 1     aria-disabled = null at every step
```

Three presses do nothing and nothing says so. This repo has a ruled pattern for exactly this
control shape, in `text-zoom.js` (audit P3-7): *"aria-disabled, NOT disabled... at either end of the
range the control SILENTLY VANISHED from under a keyboard user's fingers"*. The goal stepper does
not follow it. And on a MET week the visible line carries no target at all ("12 topics drilled this
week &middot; Goal met -- nice work."), so lowering the goal from 5 to 1 changes **nothing** on screen
except the stepper figure -- the one channel that cannot announce.

**Wave ownership.** The `replaceWith` and the missing `aria-disabled` are byte-identical to master
`2696291`. What is this wave's is (a) the source claim that the `aria-live` compensates for the name
it removed, which does not survive measurement, and (b) the REACH: cycles 2-3 hoisted `goalStrip()`
out of `telemetryHtml()`'s `engaged()` gate and deleted `duoHtml()`'s early return, so this control
now renders for every record class at every viewport including the first-run home of every new user.
That is the same argument the wave itself used to claim the 20x20 touch target as its own.

**Named fix** (panels.js, the `[data-goal]` branch): mutate in place instead of swapping --

```js
var g2 = weeklyGoal();
root.querySelector('.ix-goal-t').textContent = g2.target;              // live region survives
root.querySelector('.ix-goal-bar span').style.width = g2.pct + '%';
root.querySelector('.ix-goal-bar').classList.toggle('met', g2.met);
root.querySelector('.ix-goal .ix-home-v').innerHTML = goalLine(g2, true) + ' &middot; ' + (g2.met ? 'Goal met &mdash; nice work.' : (g2.target - g2.done) + ' more to go');
root.querySelector('[data-goal=dec]').setAttribute('aria-disabled', g2.target <= 1);
root.querySelector('[data-goal=inc]').setAttribute('aria-disabled', g2.target >= 20);
```

No re-focus is then needed, which also removes the focus-restore round trip.

**Arm gap (this is the reason it shipped).** `grep -rn "data-goal" test/` returns two files:
`touch_floor.cjs` (`getBoundingClientRect` only) and `focus_ring.cjs` (programmatic `.focus()`
only). **No check in the gate presses this control.** The whole `[data-goal]` interaction path --
clamp, re-render, focus restoration, announcement -- is unguarded across 77 checks, on a control
this wave rebuilt and put in front of every new user.

---

### F3 [MODERATE arm gap; LATENT in the app] The boot-window gate closes the keymap and leaves the chord open

**Mechanism.** `shell.js` now returns until `ViewManager.routed()` -- one gate for every key,
explicitly chosen over a patch per key. `print-qa.js`'s sibling guard, added in the same cycle,
reads a different bit:

```js
if (document.documentElement.dataset.view === 'home') return;
e.preventDefault(); openPrint();
```

and its comment asserts the two are the same thing:

> Same precedent as shell.js:262, same reader (documentElement.dataset.view, which applyRoute is
> the single authority for).

They stopped being the same in this cycle. `shell.js:262`'s reader is now covered by a `routed()`
gate above it; print-qa's is not, and `dataset.view` is `undefined` in exactly the window that gate
exists for -- so the chord fails OPEN where the map fails CLOSED.

**Measured**, using the wave's own hold instrument, `#home` load:

| state | result |
|---|---|
| held boot window (`routed()==false`, `dataset.view==null`, `held==true`), `Control+p` | **`window.open` 1x, title "Content Pipeline &mdash; Q&A", 50,368 bytes, `defaultPrevented: true`**, `TopicRegistry.current()` = `content-pipeline` |
| same held page, plain `p` (positive control for the shell gate) | dialogs `[]` -- the gate holds |
| routed `#home`, `Control+p` (the shipped guard) | `opens: 0, prevented: false` -- correct |
| after releasing the hold | `routed: true`, `view: "home"` |

So in that state the user's own print is taken AND a printable Q&A is built for a topic they never
chose -- the exact sentence the wave wrote to justify the guard, one module over.

**Natural width, measured.** An rAF sampler installed at `document_start`, plus a wrapper on
`document.addEventListener` that records the moment print-qa's handler is attached, over 4 real
boots:

```
boot 0: listener attached with routed=false view=null; 19 frames sampled; frames with (wired AND !routed) = 0
boot 1: ... 31 frames ... 0
boot 2: ... 32 frames ... 0
boot 3: ... 28 frames ... 0
```

The listener is attached during the DOMContentLoaded dispatch and `Router.init()` runs later in the
**same synchronous dispatch**, so no input event can interleave. Contrast the shell keymap, whose
window is parse-time to DOMContentLoaded and genuinely wide -- `overlay_deadzone`'s own natural arm
logged 3 presses landing inside it over 3 boots on this same build.

**So: latent, not reachable today** -- and reachable the moment anything defers `Router.init()` past
that dispatch: a `type=module` script, an `await`, an rAF, or a throw in `window._hideBootSplash()`,
which `index.html`'s `boot()` calls immediately before `Router.init()` with no guard. The guard is
held up by script ordering rather than by a condition, which is the precise argument the wave made
for putting one gate at the top of the keymap.

**The arm gap is live now.** `overlay_deadzone` section 6's boot arm drives `p` and `w` through
`held()`. It does not drive `Control+p` -- even though the same section drives `Control+p` on the
routed home, and even though the chord is what cycle 4 fixed. The seeded-mutant preflight
(`BOOT_GATE` deleted from a scratch copy) is likewise only aimed at `p` and `w`.

**Named fix.** In `print-qa.js`, read the same bit first and fail toward the browser's own print:

```js
if (!(window.ViewManager && window.ViewManager.routed && window.ViewManager.routed())) return;
if (document.documentElement.dataset.view === 'home') return;
```

and add `['Control+p', ...]` to the boot arm's `held()` matrix, with the same
`opens === 0 && prevented === false` assertion the routed row already uses.

---

### F4 [LOW] `goalPhrase()`'s met branch is unreachable in the app, and the gate is what keeps it alive

`grep -rn goalPhrase src/` finds exactly one call site: `panels.js:181`, inside `goalLine()`, and
only on the `!g.met` branch --

```js
return (g.met ? n(g.done) + topicWord(g.done) : goalPhrase(g, bold)) + ' drilled this week';
```

So `goalPhrase`'s `if (g.done >= g.target)` block, both its strings including
`"...-topic goal met with N to spare"`, cannot render on any record. I drove 20 combinations of
target x done (below) and never produced it.

Its only remaining executor is `home_claims.cjs` MUTANT 11, which composes the pre-cycle-3 defect
from the live API rather than a literal. Consequence: a routine dead-code removal of that branch
turns MUTANT 11's plant into `CANNOT LAND` and **aborts** `home_claims`. A dead branch that is
load-bearing for the gate and for nothing else should say so at the export, or the mutant should
compose the literal.

---

### F5 [LOW] The one goal surface will state a figure the record cannot support, and its judge cannot see that

`weeklyGoal()` counts every key in `Progress.all()` without intersecting the registry, and accepts
any `ts >= weekStart` including future ones:

```js
for (var id in a) { if (a[id] && a[id].done > 0 && a[id].ts >= ws) done++; }
```

Driven through the real door -- the footer's hidden `<input type=file data-io="import">`, via
`setInputFiles`, confirm accepted, page reloaded:

| payload | rendered goal line |
|---|---|
| 300 x `progress.fakeN`, `ts = now + 1 day` | **"301 topics drilled this week &middot; Goal met &mdash; nice work."** on a 46-topic app |
| one `progress.not-a-topic` | `done` 0 -> 1 -- one bogus key is enough |

`judgeGoalSentence` rule 2 compares the rendered bold figure to `Panels.weeklyGoal().done` -- the
same function that produced it -- so it is structurally blind to a wrong model and can only catch a
renderer that diverges from it. The arithmetic is pre-existing (unchanged in this diff); what the
wave changed is that this is now the app's ONE goal surface, on every record class.

**Named fix.** `if (typeof TopicRegistry === 'undefined' || !TopicRegistry.get(id)) continue;` and
`a[id].ts <= now` in the loop; and one arm in `judgeGoalSentence` that derives `done` from the
registry rather than from `weeklyGoal()`. `progress.js:308` already records a prior incident of this
same counter being wrong for everyone ("weeklyGoal() (counts ts >= weekStart) FALSELY COMPLETED the
goal, for everyone"), which is a reason to make the counter defensive rather than to trust callers.

---

### F6 [LOW] Three different ranges are recorded for the fold measurement; the arm's own log exceeds all three, every run

| where | recorded |
|---|---|
| `test/home_fold.cjs:27` | "the chip list lands anywhere from 30px inside the band to **188px** below it" |
| `test/check_all.py:1090-92` | "landing anywhere from 30px inside the band to **251px** below it -- ... this asserts it on all **nine combinations**" |
| `src/styles.css:2485` | "Across all nine measured combinations the chips run from 769 to 1006" |

Measured on the frozen build this run, and **printed by the arm itself** in its own PASS output:

```
[360x844 two-thin x 2 bars x LONG hero x no-record]  chips top 1087, first chip OUT by 332px   (band [57,799])
[360x844 two-thin x 2 bars x LONG hero x has-record] chips top 1087, first chip OUT by 332px
```

332 > 251 > 188. And the arm asserts 11 records x 2 viewports, not nine combinations. The
`styles.css` line is honest -- it is explicitly scoped to 390x844, and my 390 measurements land
856-1006, inside its stated range. The two stale ones are the arm's own header and, more
consequentially, the `check_all.py` registry entry, which is what a reader consults to learn what a
check covers. Both were written at cycle 2 and not updated when cycle 3 added the two crossed cells
and the 360x844 viewport.

---

### F7 [OBSERVATION] `home_fold`'s disjunction is carried by one disjunct in 22 of 22 cells

Every row of the passing run reports the chip list OUT (by 101 to 332px) and the act IN (clearing
the fold by 187 to 353px). `f.actIn || f.chipIn` is therefore never satisfied by `chipIn`, and the
self-test only proves the arm goes red when BOTH carriers leave. The arm cannot distinguish "the act
left the band while the chips happened to come in" from a healthy home. Given the measured margins
that combination is remote -- recording it because the contract is written as a disjunction and is
being enforced as a single term, and because a future compaction that trades act position for chip
position would pass.

---

### F8 [OBSERVATION] An open Topic index prints on top of the home's record

The wave's rule hides `.cram-ov:not(.open)` on the home. `.ix-ov` (`#_index-overlay`, a `<body>`
child, `position:fixed;inset:0` with a backdrop blur) is in no print hide list, and `.app` is now
`display:block` on the home, so both paint. `\` opens the Topic index right there on the home.

| home @1280x900, print media | A4 PDF |
|---|---|
| nothing open | 2pp, 143,721 B, 1,306 extracted chars |
| after `\` (Topic index open) | **2pp, 551,833 B, 2,761 extracted chars** -- both the overlay's content and the home's |
| after `?` (shortcuts overlay open) | 2pp, 143,721 B, 1,306 chars -- unaffected |

The asymmetry is incidental: `#keyov` carries class `mock-ov`, which the unconditional print hide
already covers; `.ix-ov` does not. This may be intended under the wave's own "print follows the
screen" ruling for an open sheet -- but what lands on paper here is the overlay *over* the record
rather than instead of it. One line if wanted: add `.ix-ov` beside `.cram-ov:not(.open)` in the home
print block.

---

## NEGATIVE RESULTS -- probed hard, held

Recorded because a hunt that only lists hits is not a measurement.

**The goal sentence, 20 combinations of target x done, read off the rendered page.** target in
{1,2,5,20} x done in {0,1,2,21,46}. Every line grammatical; noun agreement holds in both directions
("0 of 1 **topic** drilled this week &middot; 1 more to go", "1 **topic** drilled this week", "2
**topics** ..."); "goal met" never appears twice; no "0 more to go", no negative remainder; `pct`
clamps at 100. The three defects `judgeGoalSentence` was written for are genuinely gone.

**The ruled fold contract under an axis `home_fold` never varies: spacing density.** `d` is an
advertised, always-live shortcut ON the home, and `cozy` inflates the whole space scale. Driven at
390x844 and 360x844 x 4 record shapes x {default, compact, cozy} = **24 cells, contract HOLDS in
all 24**. The act clears the fold by 187-256px at worst (cozy, 360x844: act bottom 612 against a
band bottom of 799). Density is not a hole.

**Rapid route flips.** 28 hash writes at 8ms across `#home` / `#saga/drill` / `#event-driven/walk` /
`#saga/wb`, settling on the home: 1 goal surface in the DOM and 1 visible, 1 practice act in the
column and 1 in the rail, `.ix-panel` 9 children, `data-view="home"`, sidebar `aria-label="Home
controls"`, title "Home &mdash; Deep Rehearsal", zero page or console errors. Then to
`#saga/drill`: `data-view` deleted, sidebar back to "Topic controls", `#home` not visible. No wedge,
no duplication, no leak.

**The import door, hostile payloads through the real `<input type=file>`.** `goal.weekly` =
`999999` / `-7` / `"5"` / `null` are all stored verbatim and all clamp to 5 via `goalTarget()`'s
`typeof t === 'number' && t >= 1 && t <= 20`. `nav.last.id = "<img src=x onerror=alert(1)>"` is
stored verbatim and rendered nowhere -- 0 `script` and 0 `img` nodes injected into `#home`,
`resumeTarget()` validates against the registry. A `progress.__proto__` key and a
`progress.saga` record with `done:'lots' tot:null ts:'yesterday' cards:'nope' shk:-3 got:{}` produce
no page error, no console error and no prototype pollution; the home renders its full 26,756
characters. (The one thing that does get through is F5.)

**The print rules are correctly scoped.** Control at `#saga/walk`: `.app` `display:none`, `#home`
`display:none`, the cram sheet paints 3,260px, 6pp / 872,952 B -- unchanged by the home block.
`.hm-status` computes `position:static` under print media (the wave's fix) and `position:fixed` on
screen, at every width where it displays; the A4 content box is ~680px, which is inside the
`<=919px` band where it is fixed and outside the `<=419px` band where it is hidden, so the fix is
load-bearing on real paper rather than inert.

**The focus ring fix works on the path a user takes, not only the one the arm drives.** Tab walk on
an engaged home at 1280x800 and 390x844: the stepper is reached in 8 and 9 stops, box 44x44,
`:focus-visible` true, painted indicator extent 4px on the chip. Zero focus stops with
`:focus-visible` and no indicator; zero zero-size stops; zero focusables inside an `aria-hidden`
subtree. `hm-quiet-focus` is scoped to `.hm-cta[data-autofocus]` only and does not reach the
stepper. Focus is correctly restored to the pressed button after each re-render and re-arms
`:focus-visible` every time (7/7 presses).

**The DOM move (not CSS `order`) delivers what it claimed for the keyboard.** At 390x844 the tab
order is monotonic in y -- 0 inversions -- and the first three stops after the autofocused CTA are
`Weak-spot review` @y360, `Cross-topic drill` @y438, i.e. the two practice acts directly under the
decision, in the ruled order. (At 1280x800 my naive detector flags one 260px "inversion"; it is the
`.hm-duo` two-column grid handing off from the left panel's last chip to the right panel's first
control, which is correct DOM order for a two-column row, not a defect.)

**The three arms I could most plausibly break, could not be broken.** `home_fold`'s self-test
genuinely goes red at both viewports (act 2367, chips 894, band [57,799]). `home_claims` catches all
13 planted mutants including MUTANT 7's negative control and the `keelChecked` non-zero assertion
(6 records painted a keel). `overlay_deadzone`'s boot arm genuinely aborts if the seeded mutant is
not detected, and its `BOOT_GATE` string still matches the shipped build exactly once.
`touch_floor`'s 6b media-query plant is a stronger self-test than a plain shrink -- it must go red
at 1280 AND stay green at 390 -- and `focus_ring`'s 13-16 plant restores the pre-fix cascade rather
than deleting the fix, and asserts `painted.length > 0` first so a deleted indicator cannot pass.
I found no check among the wave's new arms that cannot fail.

---

## METHOD NOTES

- Probes: `p1_bootwindow_ctrlp.cjs`, `p2_goal_and_flips.cjs`, `p3_print.cjs`, `p4_scrolltop.cjs`,
  `p5_fold_density_and_more.cjs`, `p6_focus_walk.cjs`, `p7_ax.cjs`, all under the session scratchpad.
- Every measured claim above carries a negative or positive control: the print-disc count is paired
  with the same page's `.show` lifted; the boot-window leak is paired with plain `p` on the same held
  page and with the routed home; the live-region finding is paired with a `MutationObserver` on the
  region AND on its parent, so "swapped" is distinguishable from "not updated".
- Where I expected a defect and did not find one, it is in NEGATIVE RESULTS rather than dropped:
  the `.hm-status` print rule (I expected it inert at the paper width; it is not), density vs the
  fold contract, and the import door's injection surface.
