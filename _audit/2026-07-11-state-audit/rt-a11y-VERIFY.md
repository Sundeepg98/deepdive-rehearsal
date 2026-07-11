# Adversarial Verification — `rt-a11y` lens

**Verifier stance:** default to REFUTING. Confirm only what I could reproduce myself.
**Artifact:** `dist/index.html` via `file://`, Playwright 1.61.1 / **Chromium 149.0.7827.55**
**Scripts (mine, independent of the original lens's):** `_audit/2026-07-11-state-audit/scripts/verify-a11y-{1..7}.mjs`
**Shots:** `_audit/2026-07-11-state-audit/shots/verify-a11y/`

---

## Verdict

| # | Finding | Verdict |
|---|---|---|
| F1 | No heading structure anywhere | **CONFIRMED** |
| F2 | Section nav exposes no selected state | **CONFIRMED** |
| F3 | Drill answer reveal is silent to AT | **CONFIRMED** (scope/effort understated) |
| F4 | `#keybody` unreachable by keyboard | **CONFIRMED** (survived a targeted attack) |
| F5 | axe adjudicates only 7% of text for contrast | **CONFIRMED** (exact) |
| F6 | No a11y check in the 19-check gate | **CONFIRMED** (repro command has a nit) |
| F7 | Copy-link mutates the trigger's own name | **CONFIRMED** |

**Refuted: 0 of 7.** I tried hard to kill F4 in particular (see below) and it survived.
**Missed by the original lens: 2, both P1.** Both are surfaces the lens *touched* and didn't flag.

The original report is unusually honest — it already discarded two of its own false alarms
(the mid-animation contrast hit and the `.badge` 1.05:1 artifact), and both discards are
correct. This is a high-quality lens. Its gaps are of the "didn't look one step further"
kind, not the hallucination kind.

---

## F1 — CONFIRMED · No heading structure

Live-DOM deep walk **piercing every shadow root** (`verify-a11y-1.mjs`):

```
ALL headings (h1-h6 + role=heading) in the LIVE DOM:
  [{ tag: "H1", text: "Content Pipeline", rendered: true }]      <- one. that's all.
Per-pane: walk/drill/wb/sys/trade/model/num/rf/open  -> *** NONE *** (all nine)
Headings inside <main class="stage">: 0
role=heading in src/: 0 matches
```

**A trap I defused for the fixer:** a naive `grep -o "<h[1-6][ >]" dist/index.html` returns
**2 `<h1>` + 1 `<h2>`**, which looks like it contradicts the finding. It does not — I proved
programmatically that **2 of those 3 live inside `<script>` text** (`print-qa.js:36,38` string
literals that build the *print window*, a separate document). Real DOM headings: exactly 1.

Source anchor `src/index.html:26` = `<h1>Content Pipeline</h1>` — exact.

---

## F2 — CONFIRMED · No selected state on the primary nav

All 10 `.seg` buttons, measured **before and after** `switchTab('num')`:

| tab | class `on` | aria-current | aria-selected | aria-pressed | role |
|---|---|---|---|---|---|
| walk → num | flips | `null` | `null` | `null` | `null` |

Only the class flips. The CDP AX tree (literally what a screen reader consumes) reproduces the
lens's quoted output **verbatim**:

```
role=button name="Walkthrough MECHANICS"  props: invalid="false" focusable=true
role=button name="Numbers ESTIMATE"       props: invalid="false" focusable=true
```

No `selected`, no `pressed`, no `current`. Source anchor `src/scripts/app/shell.js:47` is exact:

```js
for (let i = 0; i < segBtns.length; i++) segBtns[i].classList.toggle('on', segBtns[i].getAttribute('data-tab') === t);
```

The lens's "the codebase already knows the pattern" is also true — `topic-nav.js:29` and
`index-overlay.js:301` both emit `aria-current="true"`.

---

## F3 — CONFIRMED · Drill reveal is silent — *and the fix is bigger than stated*

The lens is right, and I can prove it harder than they did. **The panes are shadow DOM**
(`topic-protocol.js:133`, `TopicPane` calls `this.attachShadow({mode:'open'})`) — the lens never
mentions this, and it's why the defect is easy to miss. Piercing the shadow root:

```
BEFORE Space: ansExists=false, activeElement=BODY
AFTER  Space: ansExists=true, 70px, "Server-side cursor (pg-query-stream, batch 100) piped t…"
              aria-live=null   role=null   tabIndex=-1
              activeElement=BODY   shadowRoot.activeElement=null   (focus does NOT move)
```

**The stronger proof the lens didn't produce — the full ancestor chain through the shadow host.**
An `aria-live` on any ancestor would have rescued this. None has one:

```
.ans → .thread → .card → #dwrap → DEEP-DRILL → #drill → .stage(role=main) → .app → BODY → HTML
        aria-live: null null null null null null null null null null     <- no rescue anywhere
```

Only live regions in play: the doc-level ViewManager region (**still stale at "Walkthrough"**) and
the drill's hidden `#timer`.

### ⚠ Scope correction — "one-line fix in drill/logic.js:252, effort S" is wrong

The **same silent-reveal defect recurs in at least two more places**. Runtime-verified for Mixed Fire
(`verify-a11y-7.mjs`):

```
MIXED FIRE after clicking Reveal (#mxshow):
  #mxrev now contains "First I'd profile, not guess — Cost Explorer broke…"
  aria-live=null  role=null
  ancestor chain .ans → #mxrev → #mixbody → DEEP-MIXED-FIRE → .mock-panel → #mixov(role=dialog) → BODY
                 all aria-live: null
  focus stays on #mixx (close button); only live region still reads "Walkthrough"
  VERDICT: NO — same silent-reveal defect as the drill
```

Sites: `drill/logic.js:252`, `mixed-fire.js:85`, `cross-drill.js:41-45`. **Effort M, not S** —
or one centralized `announce()` helper wired into three reveal paths.

---

## F4 — CONFIRMED · and it survived a targeted attempt to refute it

This was the finding I most expected to break, because **Chromium 149 ships "keyboard-focusable
scrollers"** (Chrome 127+): an overflowing scroll container with no focusable children is supposed
to become a native Tab stop automatically. If that fired, F4 would be dead. **It doesn't fire.**

**Why:** the app's own focus trap defeats the browser's rescue. `shell.js:125-128` computes
`getFocusable(overlay)` with the selector
`'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'` — which does **not** match an
implicitly-focusable scroller — so it returns `["keyx"]` only. Then the capture-phase Tab handler
(`shell.js:148-158`) sees `first === last === keyx`, calls `preventDefault()` and re-focuses `keyx`.
**The defect is therefore NOT browser-version-dependent** — that makes F4 *stronger* than reported.

All five of the lens's overflow numbers **reproduce exactly**:

| Viewport | hidden (mine) | hidden (lens) | Tab cycle | `keybody` attrs |
|---|---|---|---|---|
| 1440×900 | **0 px** | 0 px | 8× `keyx` | `tabindex=null role=null label=null` |
| 1366×768 | **10 px** | 10 px | 8× `keyx` | idem |
| 1280×700 | **78 px** | 78 px | 8× `keyx` | idem |
| 853×533 (150%) | **245 px** | 245 px | 8× `keyx` | idem |
| 640×400 (200%) | **378 px of 681** | 378 px of 681 | 8× `keyx` | idem |

`focusableDescendants: 0` (I pierced the `<deep-keyboard>` shadow root too).
`appTrapFocusables: ["keyx"]`.

**The definitive test — a real keyboard user's journey.** At *every* Tab position, press ArrowDown ×8
and End, and measure `keybody.scrollTop`:

```
#keybody @640x400  | hidden=378px
  tabStep 0..6 -> focus ALWAYS 'keyx' -> scrollAfter8xArrowDown=0, scrollAfterEnd=0
  >>> BEST scroll achievable at ANY tab position: 0px of 378px (0%)
  >>> VERDICT: *** UNREADABLE by keyboard ***
```

**A/B control at the identical viewport** — the sibling that *did* get commit `2954f71`'s fix:

```
#cram @900x520 (tabindex=0 role=region aria-label="Cram sheet content") | hidden=1221px
  tabStep 2 -> focus lands ON 'cram' -> ArrowDown scrolls 220px; End scrolls 556px
  >>> VERDICT: READABLE by keyboard
#keybody @900x520 (no fix) | hidden=258px
  >>> BEST scroll: 0px of 258px (0%)  -> UNREADABLE
```

Same class (`.cram-body`), same overlay pattern, same viewport. One is keyboard-readable; the other
is 0% reachable. **Git corroborates the omission directly:** `git show --name-only 2954f71` touches
`cram.html`, `gameplan.html`, `scope.html`, `index.html`, `mock-run/logic.js`, `system-map.js` —
**not `keyboard.html`**, and its message enumerates *"the cram / game-plan / scope / mock scroll
bodies"*. `git log -- src/overlays/keyboard.html` shows it was never touched by any a11y commit.

Source anchor `src/overlays/keyboard.html:7` = `<div class="cram-body" id="keybody">` — exact, and
the only one of the four `.cram-body` regions without `tabindex/role/aria-label`.

---

## F5 — CONFIRMED (exact) · axe adjudicates 7% of text for contrast

Re-ran axe-core 4.12.1 myself. **Every number reproduces:**

```
passNodes=9   incompleteNodes=114   violationNodes=0
ADJUDICATED = 9/123 = 7.3%      ABSTAINED = 114/123 = 92.7%
reasons: 77x "…could not be determined due to a pseudo element"
         30x "…could not be determined due to a background gradient"
          7x "Element content contains only non-text characters"
Full axe run, all rules, default view: 0 violations.
```

77 / 30 / 7 — identical to the lens's table. The "zero violations" headline is real *and* nearly
vacuous for contrast, exactly as characterised.

---

## F6 — CONFIRMED · No a11y check in the gate (one nit in the repro)

`test/check_all.py` runs **19** checks: 15 in the first loop (ascii_guard, syntax_check,
global_collisions, build_integrity, css_syntax, file_integrity, unit_tests, visual_pane_smoke,
visual_regression, compiler_{md,emit,assembly,prose,flow,code}) + 4 browser checks (render,
entity_leak, e2e_interactions, topic_contract). **None is an accessibility check.** `axe-core ^4.12.1`
is in `package.json` devDependencies and wired into nothing.

**Nit for whoever re-runs the repro:** the lens says the grep "returns no accessibility check", but
literally running `grep -rli "axe\|a11y\|accessib" test/ tools/ .github/ Makefile vite.config.mjs`
**does return one file** — `test/global_collisions.py`. I checked: both hits are substring false
positives on the word **"Syntax<u>Error</u>"** (`synt`**`ax`**`E…` matches `axe` case-insensitively) in
prose comments. The *conclusion* is correct; the *command* as quoted will look like it contradicts it.

---

## F7 — CONFIRMED · Copy-link mutates the trigger's accessible name, silently

```
BEFORE click: "Copy link — a shareable link to this topic & view"
AFTER  click: "Copied — a shareable link to this topic & view"   <- this IS the accessible name
  aria-live=null  role=null
  ancestors: #copylink → .mockbar → .sidebar → .app → BODY   (aria-live: null on every one)
  anyCopiedInLiveRegion: false
  doc-level live region still reads "Walkthrough"
```

Source: `copy-link.js:9-14` — `flash()` sets `label.textContent = msg` on the `.mb-t` span inside the
button. Confirmed. (Trivial nit: the lens's transcription of the post-click text drops the trailing
"& view".)

---

# MISSED by the original lens

## M1 — P1 · On mobile, the *closed* Tools sheet keeps 12 focusable, screen-reader-exposed buttons off-screen

The sheet is hidden with **`transform` only** — `styles.css:323`:
`.sidebar .mockbar{ … transform:translateY(115%); … }`, un-done by `styles.css:324`
`body.tools-open .sidebar .mockbar{transform:none}`. `shell.js:169-190` toggles nothing but
`document.body.classList` — and the source comment at **`shell.js:172-173` literally says
*"No display manipulation needed."*** That is precisely the bug: **`transform` does not remove an
element from the tab order or from the accessibility tree.**

Measured at 390×844, sheet **CLOSED (the default state)**:

```
transform: matrix(1, 0, 0, 1, 0, 795.89)     rect.top=948  bottom=1640   viewportHeight=844
visibility: visible   display: flex   aria-hidden: null   inert: false
13 buttons; 12 with offsetParent !== null; 12 with client rects

Tab sweep (26 presses), sheet closed:
  … toolsfab → idxopen(top 1012) → searchopen(1055) → copylink(1130) → starbtn(1174)
  → notesopen(1218) → printqa(1261) → cramopen(1337) → sessopen(1380) → mixopen(1424)
  → planopen(1468) → scopeopen(1511) → themetog(1586) → …
>>> 12 tab stops land inside the visually-closed sheet. ALL 12 are OFF-SCREEN (top ≥ 844).

CDP AX tree, sheet closed: 5/5 sampled mockbar buttons  ignored: false
  ("Topic index — …", "One-page cram sheet — …", "Session progress — …", "Mixed fire — …", "Game plan — …")
>>> fully exposed to a screen reader while the panel is "closed".
```

Shots: `shots/verify-a11y/missed-mobile-tools-closed.png`, `missed-mobile-focus-offscreen.png`.

**Plus:** `#toolsfab` is a disclosure button with **`aria-expanded=null`, `aria-controls=null`,
`aria-haspopup=null`** — and it is **still `null` after opening the sheet**. The app knows this
pattern: I verified `#tntrigger` correctly maintains `aria-expanded` `false → true`. The Tools button
is the outlier.

**Impact.** A sighted keyboard user tabs off `#toolsfab` and their focus ring vanishes below the fold
for **12 consecutive presses**. A screen-reader user hears the entire contents of a panel that is
supposed to be closed. WCAG **2.4.3 Focus Order (A)** + **4.1.2 Name, Role, Value (A)**.

**Why the lens missed it.** Its focus check verified "a focus indicator exists" via a
focused-vs-unfocused *computed-style delta* on 49/49 stops — a method that **cannot detect that the
focused element is off-screen**. And axe has no rule for off-screen-but-focusable. The lens ran
mobile-390 scenarios and this still slipped through.

**Fix (S):** add `inert` + `aria-hidden="true"` to `.mockbar` when `tools-open` is absent (or
`visibility:hidden` alongside the transform, which *does* remove it from both trees), and put
`aria-expanded`/`aria-controls` on `#toolsfab`.

## M2 — P1 · The drill's mock timer is a per-second `aria-live="polite"` region — a screen-reader flood

`src/scripts/app/drill/logic.js:19`:

```html
<div class="timer" id="timer" role="timer" aria-live="polite" aria-label="Mock round time remaining" style="display:none">22:00</div>
```

`drill/logic.js:402-406` drives it with `setInterval(…, 1000)`. Measured in **Mock round** mode:

```
attrs: { role: "timer", ariaLive: "polite", display: "block" }
t=0s "22:00" | 1s "21:59" | 2s "21:58" | 3s "21:57" | 4s "21:56" | 5s "21:55"
-> one text mutation per second, inside a polite live region
```

Over a 22-minute round that is **~1,320 queued announcements**. `role="timer"` carries an implicit
`aria-live="off"` *precisely* to prevent this; the explicit `aria-live="polite"` overrides that safety
default. A screen-reader user in Mock round hears the clock tick, continuously.

**The app is internally inconsistent here, which shows it's an oversight rather than a choice:** the
mock-run *overlay*'s clock (`#mockclock`, `mock-run.html:6`) updates the same way and has **no
`aria-live` at all** (`grep -c aria-live src/overlays/mock-run.html` → `0`). Two countdown clocks; only
the drill's is in a live region.

**Combined with F3 this is savage:** in Mock round mode the answer reveal is silent and the clock
announces every second — an AT user hears the countdown and nothing else.

**Why the lens missed it.** It *saw* this element — its own F3 evidence names "the mock `#timer`
(`"22:00"`)" — but treated it only as background noise while proving `.ans` had no live region, and
never asked whether the live region it *did* find was itself a defect.

**Fix (S):** drop `aria-live` (keep `role="timer"`, whose implicit `off` is correct), and announce
milestones (10 min / 5 min / 1 min left) through the existing `ViewManager.announce()`.

---

## Checked and found HEALTHY (no finding)

- **`#tntrigger` `aria-expanded`** — correctly maintained `false → true` on open. Not a defect.
- **Full axe run, all rules, default view** — 0 violations. The lens's baseline is real.
- **`#mockclock`** (mock-run overlay) — updates per second but has **no** `aria-live`. Correct.

## Note on one of the lens's "verified healthy" claims

> "Focus is visible on 49/49 tab stops. Zero stops without an indicator."

True as measured (a computed-style delta), but **it does not mean what it sounds like on mobile**: M1
shows 12 tab stops whose focus ring is rendered ~168–742px *below the viewport*. "Has a focus
indicator" and "the user can see the focus indicator" are different claims, and only the first was
tested.
