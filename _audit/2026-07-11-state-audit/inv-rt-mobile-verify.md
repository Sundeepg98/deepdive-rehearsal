# Adversarial Verification — `rt-mobile` lens

**Verifier:** independent re-measurement, 2026-07-11
**Method:** every runtime claim re-run from scratch with my own Playwright scripts; every code claim opened and read; every git/doc claim re-run.
**Scripts:** `_audit/2026-07-11-state-audit/scripts/v1-overflow.mjs` … `v9-final.mjs`
**Shots:** `_audit/2026-07-11-state-audit/shots/verify-rt-mobile/`

---

## Headline

The lens is **substantially right about the layout defects and substantially wrong about their consequences.**

Six of seven findings reproduce — several *exactly*, to the pixel. But the single claim that drove the report's P1 severity — **"the `›` next-topic button is NOT clickable; a real Playwright click TIMES OUT; the document cannot be scrolled horizontally to reach it"** — is a **measurement artifact**, and it is refuted three independent ways. The page is *wider than the screen* (real, worth fixing, one-line fix). It is not *broken*.

The lens also **missed the biggest consequence of its own root cause**: the same overflow pushes **`#toolsfab` — the only mobile entry point to all ~13 tools — fully off-screen on 16 of 46 topics.**

---

## 1. Horizontal overflow — **CONFIRMED (core)**, severity **P1 → P2**

### What reproduced, exactly

| viewport | lens said | I measured |
|---|---|---|
| 320px | 46/46 topics | **46/46** ✓ |
| 360px | 46/46 | **46/46** ✓ |
| 390px | 34/46 | **35/46** (±1) |
| 414px | 26/46 | **26/46** ✓ |
| 430px | 19/46 | **19/46** ✓ |
| 1440px | +0px | **+0px** ✓ |
| worst topic | `debugging` +219px @360 | **`debugging` +219px @360** ✓ |

Root cause **confirmed**: `#topicnav` is a flex item of `.side-id` with `min-width:auto`. A parent-squeeze test (`.side-id{width:50px}`) bottoms the topic-nav out at its min-content — it cannot shrink. `src/styles.css:619` (`.topic-nav`, no `min-width:0`); `src/styles.css:825` (mobile rule sets `flex-basis:100%` but **not** `min-width:0`).

**Fix verified independently.** Injecting `min-width:0` on `.side-id .topic-nav`:
- doc scrollWidth **579 → 360** (over = 0) at 360px
- `#tnnext` moves from `x=535..579` (off-screen) to **`x=301..345`** (on-screen)
- `#toolsfab` moves from `x=497..564` to **`x=278..345`**
- both then **click successfully**

Screenshot at rest, 360px: `shots/verify-rt-mobile/v-real-360-debugging-walk.png` — the `›` button and the right of the tab strip are visibly past the edge.

### Two of the lens's numbers do not hold

- **"doc scrollWidth is a constant 453px at every viewport"** — false. scrollWidth ranges **367 → 579** across topics. It *is* constant per-topic across viewports (that insight is right), but 453 is one topic's value presented as universal.
- **"min-content floor of 437.7px"** — not universal. It scales with the topic name. On the boot topic I measured **380.6px** (= 3×44 `.tn-step` + 230.6 `.tn-trigger` + 3×6 gap — the decomposition is right, the constant isn't).

---

## 2. **REFUTED** — "the `›` button is NOT clickable / the page cannot scroll to it"

This is the claim that turned a layout bug into a "functional break". It does not survive.

**Proof 1 — the same click fails where there is NO overflow.**
At **1440px desktop, overflow = 0**, `#tnnext` *also* times out. So does `#tnprev`. Cause: on a fresh profile the app opens a **first-run topic-index modal** (`index-overlay.js:427`: `if (!window.__bootHash && !hasProgress) setTimeout(open, 30)`). It is `position:fixed; inset:0; z-index:1000; pointer-events:auto` and covers the page. Every button fails a click behind it. The lens's harness navigated by assigning `location.hash` *after* load, which never dismisses it — so it measured through a modal scrim.

**Proof 2 — the real interception is a coordinate-frame artifact.**
With the overlay suppressed (load the URL *with* the hash, so `__bootHash` is set), the full Playwright call log for `#tnnext` reads:

```
- scrolling into view if needed
- done scrolling
- <span id="tncurrent" class="tn-current">Production Debugging and Incident Diagnosis</span>
  from <button id="tntrigger" class="tn-trigger"> subtree intercepts pointer events
```

`#tncurrent` spans x≈115..345. `#tnnext`'s centre is x=557. `window.visualViewport.offsetLeft` at that moment is **219**. 557 − 219 = **338** — squarely inside `#tncurrent`. Playwright dispatched at a layout-viewport coordinate that Chrome resolved against a panned visual viewport. That is a Playwright mobile-emulation bug, not an app bug.

**Proof 3 — remove the emulation and the button works.**
Same 360px viewport, same 579px overflow, same `x=535..579` position, `isMobile:false`:

```
#tnnext click (non-mobile 360): {"ok":true,"hash":"#slos/walk"}
```

**It clicks and it navigates.** `#tnprev`, `#tntrigger`, `#homeBtn` all click fine under emulation too.

## 3. **REFUTED** — "documentElement.scrollLeft / body.scrollLeft / window.scrollTo(999,0) all leave scrollX=0 … the overflow is not reachable"

Wrong API. On mobile, horizontal panning moves the **visual viewport**, not `window.scrollX`.

- a real drag (340 → 40) moved `window.visualViewport.offsetLeft` **0 → 204**
- a native `scrollIntoView()` moved it **0 → 219**

The page **can** be panned to the `›` button. `scrollX` staying 0 is expected mobile behaviour, not evidence of unreachability.

**Net:** the overflow is real and worth the one-line fix. It is **P2** — the page is wider than the screen and the right-edge controls need a sideways pan — not **P1** "structurally broken / cannot navigate".

---

## 4. Content clipped by `.stage{overflow-x:hidden}` — **CONFIRMED, exactly**

Using the lens's own metric (`.stage.scrollWidth > .stage.clientWidth`), sweeping 46 topics × 9 panes = 414 states @360px:

| | lens | me |
|---|---|---|
| total clipped states | 40/414 | **40/414** ✓ |
| `num` | 31/46, worst +112px | **31/46, worst +111px** ✓ |
| `walk` | 9/46, worst +208px | **9/46, worst +206px** ✓ |
| other 7 panes | clean | **clean** ✓ |

Mechanism reproduces to the pixel on `api-design/num`:
- `.nrow` computed `grid-template-columns: 167.219px 104.781px`, **clientWidth 284 / scrollWidth 419 = +135px** — the lens's "284px box holding 419px of content (+135px)" is exact
- 'Stability under inserts' **+57px**, 'Offset penalty' **+42px**, 'Rows scanned (offset)' **+35px** — all three exact
- stage clientWidth 360 / scrollWidth 457 → **+97px silently clipped**, no scroll affordance

Source verified: `src/scripts/app/num/logic.js:32` (`grid-template-columns:1fr auto`), `:36` (`.nrow-v{white-space:nowrap}`), `src/scripts/app/walkthrough/logic.js:31` (`.fb{white-space:nowrap}`).
Desktop 1440: `api-design/num` still clips **+60px** — the lens's "not mobile-specific" call is right.

Shots: `v-num-clip-360.png`, `v-walk-clip-360.png`.

*(Minor internal inconsistency in the lens's report: F2 says "other 7 panes clean", but its own F6 documents `sys` clipping badly. Both are true — `sys` clips **inside `.piv`**, so a stage-level metric can't see it.)*

---

## 5. Mockbar focus trap — **CONFIRMED**

- `src/styles.css:323` — `transform:translateY(115%)` and **no `display` toggle**; `:148` — `.mockbar{display:flex}`. Guard gone. ✓
- `src/scripts/app/shell.js:178-184` — `openMockbar()`/`closeMockbar()` only add/remove a class. The comment at `:172` even says *"No display manipulation needed."* ✓
- `ROOT_CAUSE_ANALYSIS.md` § "Final Fix Applied" **does** document the `display:none`/`display:flex` toggle + the reflow-forcing JS. So the documented fix **has** been reverted. ✓
- Closed state @390×844: `display:flex`, `visibility:visible`, `transform: matrix(1,0,0,1,0,795.89)`, `aria-hidden:null`, `inert:false`, **13 buttons, all tabbable**. ✓
- **Tab trail: Tab#19 → `#idxopen` at top=1149 in an 844px viewport (offscreen).** 12 distinct mockbar buttons receive focus inside the closed sheet.

The lens said "Tab #9 … y=1025 … 857px viewport"; I got Tab#19 / top=1149 / 844px. The indices differ (starting focus), the **substance is identical and reproduces**. Their nuance — the *visual* half of the RCA has **not** regressed, only the a11y half — is also correct.

Shot: `v-mockbar-focus.png`.

---

## 6. **REFUTED** — "the `.seg` tab strip NEVER scrolls the active tab into view / `scrollLeft` is PINNED AT 0"

`ensureActiveVisible()` **exists** — `src/scripts/app/shell.js:265-273`:

```js
activeBtn.scrollIntoView({ behavior: …, inline: 'center', block: 'nearest' });
```

and it **works**. Clean per-path test at 360px (fresh page each):

| path | scrollLeft | active tab visible? |
|---|---|---|
| **click** (all 9 views) | 0 → 191 → 411 → 580 | **YES, 9/9** |
| keyboard `o` | 0/580 | NO |
| deep-link `#…/open` | 0/580 | NO |
| deep-link `#…/rf` | 0/580 | NO |
| deep-link `#…/num` | 0/580 | NO |

So "never" and "pinned at 0" are false — and the recommendation ("add a ~3-line `scrollIntoView` call") would have someone **add a feature that already exists.**

### The real, narrower bug (kept, at P3)

`ensureActiveVisible()` is wired **only** to `.seg` button *click* listeners (`shell.js:273`). `switchTab()` (`shell.js:44-59`) — the single applier that every other path funnels through — **never calls it**. So:
- **keyboard**: 6/9 views leave the active tab off-screen (the lens's 6/9 is right)
- **deep-link / boot restore**: off-screen (verified)
- **swipe**: `touch-swipe.js` → `Router.navigate()` → `switchTab()` → no call. Off-screen by code inspection (neither of us could fire the synthetic touch; the lens was honest about this and I confirm the limitation)
- **router back/forward**: same

**Correct fix:** call the existing `ensureActiveVisible()` from `switchTab()`, not add a new one.
**Severity P3, not P2:** the click path works, and the stage header (`.sh-kick`/`.sh-name`, visible in every screenshot as "MECHANICS / Walkthrough") independently shows the current view, so the user is never actually disoriented.

---

## 7. Sub-44px tap targets — **CONFIRMED (and worse)**

- `#_focus-toggle` = **60×20 px, 9px font, padding 4px 12px** — exact match to the lens. `src/scripts/app/focus-mode.js:32`. Below even the 24×24 WCAG 2.5.8 floor. ✓
- I count **46** distinct undersized controls (lens: 30), excluding the closed mockbar.
- Spot-checks all match: `.wb-rev` 67.1×28, `.op-rev` 99.1×28, `#wnext` 82.8×35, `#toolsfab` 66.6×40, `.seg` tabs 39px tall.
- **New:** `#scrolltop` 39.6×39.6.
- `src/styles.css:842-846` — the 2026-07-08 "comfortable tap targets" commit covers only `.tn-step`, `.tn-trigger`, `.ix-x`. ✓

## 8. Text under 12px — **CONFIRMED**

- `.mbeat-l` = **9.5px, `text-transform:uppercase`, holding 74 / 72 / 68-character full sentences** — exactly as reported ("A topic is N append-only partitions; records retained…"). ✓
- **42** distinct elements <12px (lens: 29).
- `.qk` 9px ("Probe 1 / 21"), `.chip` **9px holding 374 characters**.

---

## 9. Pivot chip — **CONFIRMED, and far bigger than reported**

- `api-design/sys`: chip = **1804.7px** inside a **284px** `.piv` — *exact* match to the lens's numbers.
- `.pa` (the disclosure body that should hold the explanation) is **empty**. ✓
- Reproduces at 1440px desktop. ✓
- `system-map.js:38` (`.piv{overflow:hidden}`), `:47` (`.chip{flex:none;white-space:nowrap}`). ✓
- *(The lens's "1601.5px / 89% hidden" vs my "1520.7px / 84.3%" is just chip-vs-visible-slot against chip-vs-`.piv`-box. Same defect.)*

**What the lens missed: the blast radius.**

- **38 of 46 topics** have a clipped pivot chip **and** ≥1 empty `.pa`. Worst: `stream-batch-processing` **+1815.5px, 86.5% of the text invisible**.
- Root-caused to source: `tools/compiler/parse_md.mjs:225` —
  ```js
  if (m && !piv.chip) piv.chip = '→ ' + raw.slice(m[0].length);
  ```
  takes the **whole paragraph**. In `src/topics-md/*.md` the `->` chip line and the explanation are authored on **adjacent lines with no blank line** (verified with `cat -A` on `api-design.md:311-312`), so markdown-it merges them into one paragraph → both land in `chip`, and `a` stays `''`.
- **A corpus scan finds the broken shape in 38/38 markdown-authored topics — 2/2 pivots each, i.e. 100%.** That matches the 38/46 runtime figure exactly (the other 8 topics are authored elsewhere and are correct — e.g. `content-pipeline` compiles to `chip:"→ Signing (2)"`, `a:"The pipeline's output feeds…"`, the intended shape).

This is a **systemic content bug**: every pivot in every markdown topic loses its explanation body and buries it in an unreadable 9px clipped chip.

---

## 10. **MISSED by the lens** — the Tools button is pushed off-screen

The lens bisected the overflow correctly and then only asked what it did to `#tnnext`. It never checked the **fixed bars**.

Because the layout viewport expands to the overflowed width (579px on `debugging`), every `position:fixed; left:0; right:0` bar stretches with it:

```
.seg      x=0..579  (position:fixed)   <- top tab strip, 579px not 360px
.mockcta  x=0..579  (position:fixed)   <- bottom bar
#toolsfab x=497.4..564                 <- outside the 360px visible edge
```

Measured across all 46 topics at 360px (visible edge = `documentElement.clientWidth` = 360):

| control | fully outside the visible viewport | partially clipped |
|---|---|---|
| `#tnnext` | **28/46** | 18/46 (0 fully usable) |
| **`#toolsfab`** | **16/46** | 8/46 |

`#toolsfab` is the **only** entry point on mobile to the entire tools sheet — index, search, copy link, bookmark, notes, print, cram sheet, session progress, mixed fire, game plan, scope, theme. `#tnnext` at least has `#tnprev`, swipe, and keyboard as alternatives; **the Tools sheet has none.**

This is the same one-line fix (`min-width:0`), and it is the strongest reason to actually do it.

---

## Console / page errors

**Zero** console errors and **zero** page errors across every state I drove (≈900 navigations). The lens's clean bill of health here is confirmed.

---

## Scoreboard

| # | Lens finding | Verdict |
|---|---|---|
| 1a | Horizontal overflow, 46/46 topics, root cause, fix | **CONFIRMED** (P1 → **P2**) |
| 1b | "› is NOT clickable, click times out" | **REFUTED** — Playwright emulation artifact |
| 1c | "document cannot scroll horizontally to reach it" | **REFUTED** — wrong API; `visualViewport.offsetLeft` reaches 219 |
| 2 | `num` 31/46, `walk` 9/46 clipped by `.stage` | **CONFIRMED** (exact) |
| 3 | Mockbar `display:none` guard gone; 12 focusable buttons | **CONFIRMED** |
| 4a | ".seg NEVER scrolls active tab into view / scrollLeft pinned at 0" | **REFUTED** — click path works 9/9 |
| 4b | Active tab off-screen on keyboard / deep-link / swipe | **CONFIRMED** (P2 → **P3**) |
| 5 | 30 controls <44px; `#_focus-toggle` 60×20 | **CONFIRMED** (46, not 30) |
| 6 | Pivot chip clipped; `.pa` empty; compiler bug | **CONFIRMED** (38/46 topics, not 1) |
| 7 | 29 text elements <12px; `.mbeat-l` 9.5px sentences | **CONFIRMED** (42, not 29) |
| — | `#toolsfab` pushed off-screen on 16/46 topics | **MISSED** by the lens |
