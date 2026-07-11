# Accessibility Audit — deepdive-rehearsal

**Lens:** Accessibility (axe-core 4.12.1 + manual keyboard/AT verification)
**Date:** 2026-07-11
**Artifact:** `dist/index.html` (5.1 MB single-file offline SPA), driven via `file://` in Chromium/Playwright
**Coverage:** 53 axe scenarios — 9 panes × sampled topics (4 of 46), 10 overlays, light + dark, desktop 1440 + mobile 390, first-run + returning boot. Plus manual keyboard-only operation, CDP accessibility-tree inspection, and pixel-level contrast ground-truthing.

---

## Headline

**This is one of the more genuinely accessible codebases I've audited — and axe is almost useless at proving it.**

axe returned **zero violations across all 53 scenarios**. That is not the win it looks like: axe could only adjudicate **7% of the app's text** for contrast (9 nodes decided, 114 abstained), and its heading rules pass *because there is only one heading in the entire application*. The real findings are all in axe's blind spot and were found by hand.

The three a11y commits in the log (`fd50959`, `2954f71`, `1864a28`) **do deliver what they claim** — I verified each against the running build rather than taking them on trust. The defects below are gaps *adjacent* to that work, not failures of it.

---

## Verified TRUE (commit claims, checked against the running build)

| Claim | Commit | Verdict | Evidence |
|---|---|---|---|
| `prefers-reduced-motion` | `fd50959` | **TRUE** | 5 `@media (prefers-reduced-motion: reduce)` blocks in built CSS. Under `reducedMotion:'reduce'`, all 9 probed elements collapse to `animation-duration: 1e-05s` / `transition-duration: 1e-05s`, `scroll-behavior: auto`. Also honored in JS: `shell.js:271` picks `behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'`. |
| `forced-colors` covers interactions | `1864a28` | **TRUE** | Under `forcedColors:'active'` every control gains a real border. Active tab `2px solid rgb(55,0,110)` (Highlight) vs inactive `1px solid rgb(0,0,0)` — active-view state survives High Contrast Mode as a **border-weight** difference, not color-only. Focus ring survives: `2px solid rgb(55,0,110)`. Shot: `shots/a11y/50-forced-colors-shell.png` |
| `prefers-contrast` covers interactions | `1864a28` | **TRUE** (thin but present) | 1 `@media (prefers-contrast: more)` block; `matchMedia` matches. |
| keyboard-scrollable regions fixed | `2954f71` | **TRUE for 3 of 4** | `.cmp-inner`, `#cram`, `#scopebody`, `#planbody` all carry `tabindex=0 role=region aria-label`. **`#keybody` was missed** — see F4. |
| System Map jump links un-nested | `2954f71` | **TRUE** | axe `nested-interactive` clean on the `sys` pane across all sampled topics. |

## Verified healthy (not claimed, but checked)

- **Escape closes all 10 overlays** (7 static + index/search/notes), polled to 2 s.
- **Focus capture + restore works.** Real keyboard (focus trigger → Enter → Esc) and real mouse both restore focus to the originating trigger.
- **Focus is visible on 49/49 tab stops.** Zero stops without an indicator (verified by focused-vs-unfocused computed-style delta, not just presence).
- **No keyboard trap.** Tab exits the app to browser chrome after 48 stops.
- **Focus moves into every overlay on open** (close button, or the input/textarea for search/index/notes).
- **Contrast is genuinely fine.** 13/13 sampled text elements pass in **both** themes, measured by sampling actually-painted pixels.
- **No console or page errors** in any of the 53 scenarios.

### Two false alarms I chased down and discarded (recorded so they aren't re-raised)

1. **`color-contrast` on `rate-limiting`/drill (5 nodes).** Did **not** reproduce in 3/3 retries; measured clean after settle (`rgb(107,104,98)` on white). It was caught mid pane-fade — a transient animation frame, not a WCAG violation. **Not a finding.**
2. **`.badge` at 1.05:1.** A naive computed-style backdrop walk reports white-on-white because it steps *over* the element's `linear-gradient` background. Pixel ground truth: **6.48:1 — passes.** This is exactly the case axe abstains on, and exactly why "0 violations" needs interrogating. **Not a finding.**

---

## Findings

### F1 — P1 · No heading structure anywhere in the app

The **entire document contains exactly one heading**: `<h1>Content Pipeline</h1>` (`src/index.html:26`, the topic name in the sidebar). An exhaustive walk of the DOM **and every shadow root**, with the cram overlay open, returns:

```
ALL headings in the ENTIRE document: ["H1:Content Pipeline"]
```

All 9 panes individually: `*** NONE ***`. The `<main class="stage">` region — all the actual content — has **zero** headings.

Meanwhile 7 measured elements *are* visually headings but carry `<div>`/`<span>` with `role=null` (body-text baseline is 12px):

| Element | Rendered as | Text |
|---|---|---|
| `.sh-name` | **24px / 800** | "Walkthrough" ← the pane title |
| `.cmp-topic` | 24px / 600 | "Content Pipeline" |
| `.cs-st` | 10.5px / 800 uppercase | "The spine — what you draw" |
| `.cs-one-l` | 9.5px / 800 uppercase | "The one-liner" |
| `.cmp-h` | 9px / 800 uppercase | "This view" |
| `.cmp-eyebrow` | 9px / 800 uppercase | "You're rehearsing" |
| `.mb-sec` | 9px / 800 uppercase | "Find a topic" |

**Why axe missed it:** `page-has-heading-one` ✓, `heading-order` ✓, `empty-heading` ✓ — all pass *because* there is only one heading and nothing to be out of order with. Textbook blind spot.

**Impact.** Heading navigation (the `H` key / rotor) is the primary way screen-reader users move through a page. On a 46-topic × 9-pane study app, a screen-reader user has **no structural navigation at all**, and the one `h1` is a sidebar label that never changes as they move between panes.

**WCAG:** 1.3.1 Info and Relationships (A).
**Fix:** `.sh-name` → `<h1>` (built at `src/scripts/app/shell.js:230-231` as two `createElement('div')` calls — a two-character change gets the pane title); promote `.cmp-h` / `.mb-sec` / `.cs-st` / `.cs-one-l` to `<h2>`/`<h3>` or add `role="heading" aria-level=N`.
**Effort:** M

---

### F2 — P1 · The 9-section primary navigation exposes no selected state to assistive tech

With **Numbers** visually active, the CDP accessibility tree — literally what a screen reader consumes — reads:

```
role=button name="Walkthrough MECHANICS"  props: invalid="false" focusable=true
role=button name="Probe Drill GRADED"     props: invalid="false" focusable=true
role=button name="Numbers ESTIMATE"       props: invalid="false" focusable=true
```

No `selected`. No `pressed`. No `current`. Measured on all 10 buttons before *and* after `switchTab('num')`: `aria-selected=null, aria-pressed=null, aria-current=null` — **unchanged**.

**Root cause:** `src/scripts/app/shell.js:47`

```js
for (let i = 0; i < segBtns.length; i++) segBtns[i].classList.toggle('on', segBtns[i].getAttribute('data-tab') === t);
```

`switchTab()` toggles a **class only**. The active view is therefore conveyed by color alone.

**The codebase already knows the pattern** — `topic-nav.js:29` and `index-overlay.js:301` both emit `aria-current="true"`. It was simply omitted on the app's primary navigation.

**Nuance (in the app's favor):** in forced-colors mode the active tab *is* visually distinguishable (2px vs 1px border), so this is not a pure color-only-state defect visually. But the **programmatic** state — the thing a screen reader actually reads — is absent regardless of mode.

**WCAG:** 4.1.2 Name, Role, Value (A).
**Fix:** one line in `switchTab()` — `segBtns[i].setAttribute('aria-current', isActive ? 'true' : 'false')` (or convert to a real `role="tablist"` with `aria-selected` + roving tabindex).
**Effort:** S

---

### F3 — P1 · The drill's answer reveal — the app's core loop — is completely silent to assistive tech

The Probe Drill is a flashcard trainer; revealing the answer is *the* interaction. Measured, pressing `Space` on the drill pane:

| | before Space | after Space |
|---|---|---|
| `.ans` exists in DOM | **false** | **true** (inserted, 70px tall) |
| text | — | "Server-side cursor (pg-query-stream, batch 100)…" |
| `aria-live` | — | **null** |
| `role` | — | **null** |
| `tabIndex` | — | **-1** (explicitly unfocusable) |
| `document.activeElement` | `BODY` | **`BODY`** (focus does not move) |

The only live regions in play are the mock `#timer` (`"22:00"`) and the doc-level ViewManager region — still stale at `"Walkthrough"`.

**Source:** `src/scripts/app/drill/logic.js:252`

```js
if (stage >= 1) { html += '<div class="ans' + (stage === 1 ? ' dnr' : '') + '">' + card.a + '</div>'; }
```

The answer is injected via `innerHTML` with no live region, no status role, and no focus move. **A screen-reader user presses Space and receives nothing.** They cannot tell the answer appeared, let alone read it without hunting.

The app already has the mechanism: `ViewManager.announce()` (`view-manager.js:26`) and uses it for view changes.

**WCAG:** 4.1.3 Status Messages (AA).
**Fix:** add `role="status"` to `.ans`, or call `ViewManager.announce(card.a)` on reveal.
**Effort:** S
**Shots:** `shots/a11y/96-drill-before.png`, `shots/a11y/97-drill-after.png`

---

### F4 — P2 · The Keyboard-shortcuts overlay is the one overlay you cannot read with a keyboard

`src/overlays/keyboard.html:7`:

```html
<div class="cram-body" id="keybody">
```

Its three sibling `.cram-body` regions **all** received the fix in commit `2954f71`:

```html
src/overlays/cram.html:8      <div class="cram-body" id="cram"      tabindex="0" role="region" aria-label="Cram sheet content">
src/overlays/scope.html:7     <div class="cram-body" id="scopebody" tabindex="0" role="region" aria-label="Scope-it content">
src/overlays/gameplan.html:7  <div class="cram-body" id="planbody"  tabindex="0" role="region" aria-label="Game plan content">
```

`#keybody` is the only one of the four without them. That commit's own message enumerates *"the cram / game-plan / scope / mock scroll bodies"* — `keybody` was never on the list, despite being the same class and the same pattern.

**Measured overflow, and how much of the shortcut list is unreachable:**

| Viewport | Hidden | % of list |
|---|---|---|
| 1440×900 | 0 px | 0% |
| 1366×768 (laptop) | 10 px | 1% |
| 1280×700 (laptop) | 78 px | 11% |
| 853×533 (**150% zoom**) | 245 px | **36%** |
| 640×400 (**200% zoom**) | **378 px of 681 px** | **56%** |

**There is no way to scroll it.** The only focusable element in the entire open overlay is the close button. Measured Tab cycle inside it:

```
["keyx","keyx","keyx","keyx","keyx","keyx","keyx","keyx"]
```

Tab never enters `#keybody` (`tabIndex=-1`, `role=null`, 0 focusable descendants). At 200% zoom a keyboard user can see 44% of the shortcut reference and reach none of the rest.

**WCAG:** 2.1.1 Keyboard (A) + 1.4.4 Resize Text (AA).
**Fix:** copy the attribute set from any sibling — a genuinely one-line change.
**Effort:** S
**Shot:** `shots/a11y/98-keybody-200pct-zoom.png` (content cut mid-list; focus ring visibly parked on the close button)

---

### F5 — P2 · axe can only adjudicate 7% of the app's text for contrast — "0 violations" is close to vacuous

On the default view, the `color-contrast` rule reports:

```
PASS = 9 nodes   INCOMPLETE = 114 nodes   VIOLATIONS = 0
```

Reasons axe abstained:

| Count | Reason |
|---|---|
| 77× | "Element's background color could not be determined due to a **pseudo element**" |
| 30× | "…could not be determined due to a **background gradient**" |
| 7× | "content contains only non-text characters" |

This is a direct consequence of the mesh-gradient / glassmorphism design system: nearly every surface carries a gradient or an `::after` sheen, so axe declines to judge.

I therefore measured contrast by **ground truth** (sampling actually-painted pixels): **13/13 sampled elements pass in light, 13/13 in dark.** The contrast *is* healthy. But nothing automated can currently prove that, and a future regression across the other ~93% of text would be **invisible** to axe.

**Effort:** M — add a pixel-sampling contrast check to the gate, or give gradient surfaces a solid `background-color` fallback underneath so axe can resolve them.

---

### F6 — P2 · No a11y check exists in the 19-check gate — the a11y work is unguarded

`axe-core ^4.12.1` sits in `devDependencies` (`package.json:12`) but is **wired into nothing**. `grep -rli "axe|a11y|accessib"` across `test/`, `tools/`, `.github/`, `Makefile`, `vite.config.mjs` finds no accessibility check. The gate's 19 checks (`test/check_all.py:38-67`) are:

> ascii_guard, syntax_check, global_collisions, build_integrity, css_syntax, file_integrity, unit_tests, visual_pane_smoke, visual_regression, compiler_{md,emit,assembly,prose,flow,code}, render, entity_leak, e2e_interactions, topic_contract

Three commits' worth of real a11y work has **no regression guard** — and **F4 is the proof that an omission in exactly this class already shipped**.

**Effort:** S — the harness in `_audit/2026-07-11-state-audit/scripts/a11y-axe.mjs` is a working starting point.

---

### F7 — P3 · Copy-link confirmation mutates the trigger's own label; nothing is announced

Clicking `#copylink` changes the button's own text to `"Copied — a shareable link to this topic"` (the `.mb-t` span flips "Copy link" → "Copied"). There is no `aria-live` and no `role="status"`.

Screen readers do not re-announce a focused element's accessible-name change, so the confirmation is **silent**. Separately, mutating a control's accessible name to carry transient status is itself an anti-pattern — the button now *claims to be named* "Copied".

**WCAG:** 4.1.3 Status Messages (AA).
**Fix:** announce via the existing `ViewManager.announce()` and leave the button's name alone.
**Effort:** S

---

## Minor observations (not raised as findings)

- `<aside class="sidebar">` (`src/index.html:23`) is a `complementary` landmark with **no accessible name**, while its sibling `<aside class="companion">` has one. It also contains the `h1` and the primary navigation, so `complementary` is arguably the wrong role for it. axe's `landmark-unique` passes (the two asides differ by name), so this is stylistic rather than a measured violation.
- The ViewManager live region uses `width:var(--space-1); height:var(--space-1)` for visual hiding rather than the conventional `1px`. Functional, just unusual.

## Reproduction

All scripts are in `_audit/2026-07-11-state-audit/scripts/`, run from the repo root:

```
node _audit/2026-07-11-state-audit/scripts/a11y-axe.mjs       # 53-scenario axe sweep
node _audit/2026-07-11-state-audit/scripts/a11y-keyboard.mjs  # tab sweep, escape, focus, headings
node _audit/2026-07-11-state-audit/scripts/a11y-modes.mjs     # reduced-motion / forced-colors / prefers-contrast
node _audit/2026-07-11-state-audit/scripts/a11y-proof.mjs     # CDP a11y tree, incomplete-contrast reasons
node _audit/2026-07-11-state-audit/scripts/a11y-pixels.mjs    # pixel-level contrast ground truth
node _audit/2026-07-11-state-audit/scripts/a11y-zoom.mjs      # keybody reachability under zoom
```

Raw axe output: `scripts/axe-raw.json`. Raw keyboard data: `scripts/kbd-raw.json`. 40 screenshots in `shots/a11y/`.
