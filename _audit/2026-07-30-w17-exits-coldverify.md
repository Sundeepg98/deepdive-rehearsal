# W17 COLD VERIFY -- xb/x3x4-exits-keyboard @ 5d4debd (base d481901)

**VERDICT: CLEAN -- both fixes do what the freeze says, both guards fail on the pre-fix build and
on independently planted regressions, VR baselines are identical at the git object level, and the
gate reproduces 67/67 PASS check-for-check on the committed tree. 5 NON-BLOCKING findings,
0 BLOCKING.** Nothing here should hold the merge.

The shipped **code** survived every attack I could construct. The findings are about the **freeze
report's claims** and one **coverage gap in the new plants** -- not about the product.

Verifier: w17-verifier (cold; no context shared with the builder; own instruments throughout).
All receipts in `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w17-verify\`.

---

## The headline: one claim in the freeze does not survive contact

The freeze says of its two anti-overreach plants:

> "the obvious wrong fix -- navigate unconditionally -- passes all five home arms and **fails both of
> these**"

**It does not.** I built that over-fix (`plant-a2`: delete the `rc.view !== 'home'` line from
`navigateAfterPick`, keep everything else) and the shipped check went **green on all 24 arms.**

And that over-fix is a **real regression**, not a stylistic one. Deep-link to the whiteboard with a
stale resume pointer, then pick a topic in the index:

| build | journey | lands on |
|---|---|---|
| tip (shipped) | `#event-driven/wb`, pointer says `drill`, pick `kafka-internals` | `#kafka-internals/wb` -- **the view they were in** |
| plant-a2 (guard deleted) | same | `#kafka-internals/drill` -- **dumped into the stale pointer's view** |

So the guard the freeze describes IS load-bearing, and **nothing in the suite would notice if
someone deleted it.** (`race.cjs`; both runs confirm the pointer was still `{saga,drill}` at click
time, i.e. inside the pre-arm window.)

The plants are not worthless -- they catch the *other* reading of "navigate unconditionally"
(`plant-a3`: navigate to a hardcoded `'walk'`), where both go red exactly as advertised. The freeze
just claims more discriminating power than the arms have.

Why the plants miss it: `LastVisit.record()` keeps `nav.last.view` synchronised with the current view
on every routechange, so on a settled topic route `resumeView() === Router.current().view` and the
over-fix's extra navigate is a no-op -- **measured identical to the tip, hash and `history.length`
both** (`x3-tip.json` vs `x3-a2.json`, arms F/G: `3 -> 3` on both). The divergence exists only in the
~500ms window before `LastVisit` arms, which the check never enters.

**Suggested (non-blocking) close:** a unit-shaped arm needs no race --
`LastVisit.navigateAfterPick('topic')` must return `false` when `Router.current().view !== 'home'`.

---

## 1. X3 -- reproduced pre-fix, fixed at tip, no regression on topic routes

My own driver (`x3.cjs`), fresh isolated context per arm, `innerWidth` asserted on every read,
real `/` `\` `?` keypresses, real typing, `locator.click()` on hit-tested card centres
(`elementFromPoint` confirmed `BUTTON.ix-card` at the click point on every index pick).

| arm | PRE-FIX (`d481901`) | TIP (`5d4debd`) |
|---|---|---|
| bare arrival | `#home` / "Home" / `.app` hidden / topic `content-pipeline` | identical |
| **search "kafka" from `#home`**, ArrowDown+Enter | `#home` / "Home" / `.app` **hidden** / topic **moved to `kafka-internals`** | `#kafka-internals/walk` / "Walkthrough" / `.app` **visible** |
| **index pick `event-driven` from `#home`** | `#home` / "Home" / `.app` **hidden** / topic **moved to `event-driven`** | `#event-driven/walk` / "Walkthrough" / `.app` **visible** |
| Back after a home search-pick | (n/a -- never left) | back to **`#home`**, home visible |
| Back after a home index-pick | (n/a -- never left) | back to **`#home`**, home visible |
| search "saga" from `#event-driven/drill` | `#saga/drill` | `#saga/drill` -- **identical** |
| index pick from `#saga/drill` | `#event-driven/drill` | `#event-driven/drill` -- **identical** |
| plant: pick the topic ALREADY current, from `#home` | `#home` (nothing happened) | `#walk` -- left the home |

The pre-fix rows are the defect exactly as filed: **the topic moved and the user did not**, with
`.app` still `display:none` and the title still "Home". `history.length` goes `3 -> 4` on the fixed
home picks (one entry, not two) and `3 -> 3` on the topic-route picks -- so the "the switch costs no
second history entry" claim holds, and **Back works**: one press returns to `#home`.

**Zero console/page errors on either build, on every arm** -- the silent-loss framing is accurate.

`resumeView()` is genuinely load-bearing, not a dressed-up constant: with `nav.last` seeded to
`{saga, drill}`, a home index-pick lands on `#event-driven/**drill**` at the tip, while the pre-fix
build reports `LastVisit.resumeView` as `(absent)` and stays on `#home` (`x3b-*.json`, arm P2).

### Scope guard: HELD, at the object level

`src/scripts/app/router.js` is byte-identical at base and tip -- **same blob SHA
`92eb3a83d910c834f7263b6e87a1b2b0e589b3bd`**, not merely "no diff shown". `TOPICLESS` is untouched.
The whole change is 5 source files; `test/check_all.py` is untouched, so the registry genuinely
stays at 67.

`home-view.js` was touched beyond the brief's two overlays, which the freeze flags itself. I
confirmed it is behaviour-preserving: with a seeded pointer, the home's own CTA lands on
`#event-driven/drill` and Back returns to `#home` on **both** builds, identically (`x3b`, arm P3).

---

## 2. X4 -- reproduced, fixed, and confirmed through the real accessibility tree

`x4.cjs`, overlay opened with a **real `?` keypress**, measured at both 1280x800 and the guard's own
1440x900.

| measurement (1280x800) | PRE-FIX | TIP |
|---|---|---|
| `#keybody` scrollHeight / clientHeight | 911 / 703 | 911 / 703 |
| clipped px | **208** | 208 |
| `tabindex` / `role` / `aria-label` | `null` / `null` / `null` | `"0"` / `region` / `Keyboard shortcuts content` |
| distinct stops over **12 real Tab presses** | **1** (`button#keyx`) | **2** (`div#keybody`, `button#keyx`) |
| presses to reach the body | **never** | **1** |
| **CDP accessibility tree** role / name | `generic` / (the raw text run) | **`region` / "Keyboard shortcuts content"**, not ignored |
| Playwright role engine: regions in `#keyov` / matched by name | 0 / 0 | 1 / 1 |
| leaves below the fold after `End` | -- | **0** |

At 1440x900 the clip is 108px and the same conclusions hold (`x4-*-1440.json`), which is why the
guard's arms measure the overflow instead of asserting a literal.

The DOM census reproduces the freeze's table exactly: `#cram`, `#scopebody`, `#planbody` all carry
`tabindex="0" role="region"` + a `"<dialog> content"` name; pre-fix `#keybody` carries none of the
three; at the tip it matches the siblings' idiom exactly.

**One nuance worth recording** (it strengthens the fix rather than weakening it): the pre-fix
`#keybody` *is* programmatically focusable and *does* scroll once focused -- my force-focus probe got
ArrowDown -> 40 and End -> 208 = max on the pre-fix build. The defect is **purely tab-order
reachability**, which is exactly what the `tabindex` supplies. The freeze's "scrollTop after
ArrowDown: 0" is a tab-driven measurement and is correct as such.

---

## 3. Negative controls -- every green earned, demonstrated by planting failures

Each plant is a surgical edit of the committed deliverable, built by an anchor that **asserts a
unique match** (two plants were initially rejected because `</body>` occurs twice -- the builder
would have got a silently-unmodified copy and a fake green).

| plant | what it breaks | shipped guard | result |
|---|---|---|---|
| *(none)* -- base `d481901` | the real pre-fix build | `search_deadend` | **FAIL, 5 arms** -- byte-for-byte the freeze's quoted capture, 2 anti-overreach plants staying GREEN as controls |
| *(none)* -- base `d481901` | " | `overlay_keyboard` | **FAIL, 7 of 57** -- identical text, incl. "End left 108px still unreachable" and `{"regionsInKeyov":0,...}` |
| `plant-a1` | `navigateAfterPick` returns false (fix reverted) | `search_deadend` | **FAIL, same 5 arms** |
| `plant-a2` | the `rc.view !== 'home'` guard deleted (over-fix) | `search_deadend` | **PASS** -- see the headline finding |
| `plant-a3` | navigate unconditionally to a hardcoded `'walk'` | `search_deadend` | **FAIL** -- both anti-overreach plants go red, as advertised |
| `plant-b` | `tabindex="0"` stripped from `#keybody` | `overlay_keyboard` | **FAIL, 4 of 57** (census-focusable + Tab-reaches + ArrowDown + End) |
| `plant-c` | a **5th** dialog injected with a bare `.cram-body` | `overlay_keyboard` | **FAIL, 3** -- census names `#plantbody in #plantov`: it really does enumerate the family from the DOM, not a list |
| `plant-d` | the `.cram-body` class stripped at runtime | `overlay_keyboard` | **FAIL** on the census's own control: *"found 0 bodies across 0 dialogs -- if this is 0 the census selector is dead"* (the 3 attribute arms passed vacuously on the empty set -- exactly the failure the control exists to catch) |

`plant-c` and `plant-d` together are the proof the freeze's central X4 claim needed: the census
closes the **class**, and it cannot report a spotless sweep of nothing.

### No wall-clock or font dependence

Structural, not a repeat-run guess: **every threshold in the new arms is derived in-page** --
`census.length >= 4 && === dialogsWithBody` (counts), `geom.clipped > 0` (the vacuity premise),
`keyWant + 3` (the dialog's own focusable count), `scrollTop >= scrollHeight - clientHeight - 2`
(derived max), and the landing hash compared against a **canonical encoding recomputed in-page**
rather than a literal. There is no pixel constant, no font metric, and no `waitForTimeout` in any new
arm -- the single duration is a `{timeout:3000}` **hang budget** on a `waitForFunction`, with
`.catch(() => {})` so a slow box still reads the real value and fails honestly.

---

## 4. VR, parse sanity, gate

- **VR baselines: identical at the git object level.** `test/baselines` resolves to the *same tree
  object* `5b788fc2fd5ddea5cc6de077d5070e19e4a02022` at `d481901` and `5d4debd` -- so all 18 tracked
  files (16 PNG + `manifest.json` + `README.md`) are byte-identical by construction, not by
  inspection. The "16 baselines" figure is exact. Only the two guard files are touched under `test/`.
- **`node --check` passes on all 6 touched JS/CJS files.**
- **The IDE's `search_deadend.cjs` "Router" flag is NOISE.** Every `Router.*` reference sits inside a
  `page.evaluate()` / `waitForFunction` callback that is serialised and run **in the browser**, where
  `Router` is a real global (lines 79, 91, 186, 232, 233). Syntax is valid and the check runs green.
- **Gate re-run on the committed tree: `GATE: PASS`, 67 PASS / 0 FAIL / 0 SKIP** -- and
  **check-for-check identical to the committed capture** (same 67 names, same verdicts; diffed
  mechanically). Capture: `gate-verifier.txt`. `build_integrity` independently confirms *"COMMITTED
  deliverable == fresh build of HEAD"* at 12,116,367 bytes, and `global_collisions` stays at 685 --
  the two new `LastVisit` members added no top-level global.
- **The gate run left the repo byte-identical.** `git status --porcelain` empty before and after;
  `deepdive_content_pipeline_rehearsal.html` SHA-256 `95071642...a5b` before and after. Read-only
  discipline intact.

### Why the ordering is safe (checked, not assumed)

`Router.navigate()` and `emit()` are fully **synchronous**, so no paint can occur between
`navigateAfterPick()` and `TopicRegistry.setTopic()` -- there is no window for a flash of the
outgoing topic's content. `navigate()` also guards `if (window.location.hash !== hash)` before
`pushState`, which is the mechanism behind the measured `history.length 3 -> 3` on topic-route picks
(and behind plant-a2 being invisible to a history-length check as well as a hash check).

---

## 5. NON-BLOCKING findings

**F1 -- the anti-overreach claim is stronger than the arms.** Detailed above. The shipped code is
correct; the freeze's sentence and the guard's coverage are what need adjusting. Fix costs one
assertion (`navigateAfterPick` returns false off the home route).

**F2 -- the freeze's source-delta figure is wrong.** It says *"Net source delta is 5 files,
+79/-25"*; the tree says **+65/-12**. The freeze's own file table in the same document sums to 77
changed lines, which matches 65+12 -- so the prose contradicts the table beside it. File count (5)
is right.

**F3 -- an undocumented behaviour delta on a surface the freeze does not table.** A **'cross' pick**
(Cross-topic drill / Weak-spot review, both rendered inside the Topic index by
`Panels.actionsHtml()`) made **from `#home`** now navigates before opening the cross-drill overlay:

| | PRE-FIX | TIP |
|---|---|---|
| Topic index -> "Cross-topic drill", from `#home` | stays `#home`, overlay opens over the home | **`#walk`**, overlay opens over the topic route |
| same, from `#saga/drill` | `#saga/drill` | `#saga/drill` -- unchanged |

This is a **consistency alignment, not an invention**: the home's *own* cross bar already navigated
to `#walk` on **both** builds (measured, `x3b` arm P1), so the tip makes the index overlay agree with
the home. The code comment ("'topic' and 'cross' both need us") shows it was deliberate. But the
freeze's before->after table covers topic picks only, and no arm covers this path.

**F4 -- three small over-precisions in the freeze's prose** (no assertion depends on any of them):

- **The "11 leaf nodes below the fold" does not reproduce under any convention I can construct.**
  At 1280x800, fold = 781: strict leaves (`top >= fold`) = **8**; leaves not *fully* visible
  (`bottom > fold`) = **10**; all elements with text, strict = 15; loose = 21. The closest match is
  **10**, and that looser convention is the one the freeze's own prose implies -- its five named rows
  (`G Start the guided tour`, `D Cycle spacing density`, `Esc`, `?`, the `Ctrl`/`⌘` footer) appear
  *only* in the loose set, because `G` is partially clipped rather than fully below the fold. So the
  figure is off by one against its own implied convention, and the convention is never stated. The
  qualitative claim -- the `Esc` and `?` rows were unreachable -- is exactly right either way.
- *"Every measurement below is Chromium 149 at 1280x800"* is not true of the quoted watched-red
  captures. `overlay_keyboard` runs at **1440x900** (the freeze does note this parenthetically) and
  `search_deadend` runs at **1280x900**, which it does not.
- **The post-fix `ArrowDown -> 13` is a mid-animation sample, confirmed.** Chromium animates keyboard
  scrolling here (`.cram-body` sets no `scroll-behavior` -- the animation is the browser's). Polling
  a single ArrowDown to rest gives the sample sequence `0, 13, 13, 40, 40, 40 (settled)` -- the
  freeze's own number appears in it as an intermediate. Settled value is **40**, not 13. Same story
  for `PageDown -> 184`.

**F5 -- informational, not a defect: the ArrowDown arm's timing margin is thin.** It reads
`scrollTop` after exactly two rAFs, and the scroll is animated -- so the arm's greenness depends on
the animation having advanced by then. I ran that exact sequence **30 times at the check's own
1440x900**: **0 failures, minimum advance 2px** (observed values 2, 3, 5, 7, 40). It is safe, and the
risk direction is reassuring -- a *loaded* box lengthens the rAF gap and increases the margin; only a
much faster display could shrink it. Worth knowing, not worth changing.

---

## 6. Hazards pre-cleared

- **Sibling builder `..\w16-print` never written to.** The only thing I ever ran against it was a
  read-only `git rev-parse --abbrev-ref HEAD` (it is on `xb/x1-print-truth`) to confirm I was not
  standing in it. No file in that tree was opened, modified, or removed.
- **Repo read-only.** Both comparison builds came out of `git show` into scratch; all six plants and
  every driver live in scratch. The only repo-touching command was `npm run gate` (the required
  re-run); the tree's cleanliness and the deliverable's SHA-256 are recorded before and after.
- **No image-wide kills.** Every driver closes the browser it launched; nothing else was signalled.
- **No PowerShell** -- Bash + node only.
- **Isolated context per arm, `innerWidth` asserted on every read**; drivers throw on viewport drift.
- **No boot timeouts observed**, so no retries were needed; browser work was serialised and held off
  entirely while the gate's own browser checks ran.
