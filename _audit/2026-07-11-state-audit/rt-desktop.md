# LENS: Desktop / Responsive Layout Audit (Playwright)

**Target:** `file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html`
**Date:** 2026-07-11
**Method:** Playwright/Chromium. Full sweep 320→1920px in 40px steps × 9 panes × 3 topics (1,107 samples),
then all-46-topic passes, then a re-verification pass with `reducedMotion:'reduce'` to eliminate
entrance-animation artifacts. All numbers below are from the animation-settled pass.

---

## Headline

The app has **three CSS layout tiers** — `≤919px` (stacked), `920–1279px` (sidebar docked), `≥1280px`
(sidebar + 290px companion rail). Those breakpoints are **clean** — no document-level horizontal
overflow at any width ≥411px, and the 1920px case is correctly max-width capped.

The real damage is elsewhere, and it splits cleanly along one line:
**the 8 hand-authored topics render correctly; the 38 markdown-compiled topics do not.**
The markdown compiler feeds *prose* into fields whose CSS was designed for *short labels*, and the
resulting overflow is swallowed by `.stage{overflow-x:hidden}` — so it is **clipped, unreachable, and
silent** (no scrollbar, no console error). The worst instance destroys **70 of 132 pivot answers** app-wide.

Separately, the reading column is **non-monotonic**: widening the window *narrows* the text twice.

---

## 1. P0 — System Map pivot answers are destroyed in 38/46 topics

### The mechanism (two bugs compounding)

`tools/compiler/parse_md.mjs:225`
```js
const m = /^(->|→)\s*/.exec(raw);
if (m && !piv.chip) piv.chip = '→ ' + raw.slice(m[0].length);
else piv.a = prose(raw);
```

In `src/topics-md/caching.md` the chip line and the answer paragraph are **consecutive lines with no
blank line between them**, so markdown-it merges them into ONE paragraph token:

```markdown
#### Which caching pattern?

-> cache-aside by default, write-through where the cache must stay warm
Cache-aside caches only what's read and keeps writes simple, at the cost of a stale-populate race. ...
```

`raw` is therefore the *whole blob*. It all goes into `piv.chip`, and **`piv.a` is never assigned.**

Then `src/scripts/app/system-map.js:47`:
```css
.piv .chip{flex:none; ... white-space:nowrap; ...}
```
`flex:none` + `white-space:nowrap` = the chip can never wrap and never shrink.

### The rendered result (verified via `outerHTML`)

**Hand-authored (`authz`) — correct:**
```html
<details class="piv">
  <summary>
    <span class="pq">Where does the tenant claim come from — who mints and signs the token?</span>
    <span class="chip">→ Identity / tokens</span>          <!-- 19 chars / 110px -->
  </summary>
  <div class="pa">From the <b>identity provider</b> (Cognito, an OIDC issuer): ...</div>  <!-- 439 chars -->
</details>
```

**Markdown-compiled (`caching`) — broken:**
```html
<details class="piv">
  <summary>
    <span class="pq">Which caching pattern?</span>
    <span class="chip">→ cache-aside by default, write-through where the cache must stay warm
Cache-aside caches only what's read and keeps writes simple, at the cost of a stale-populate race.
Write-through keeps hot data consistent and warm, at the cost of every write paying the cache.
Match it to the read/write ratio and the consistency need.</span>   <!-- 323 chars / 1557px NOWRAP -->
  </summary>
  <div class="pa">
</div>                                                      <!-- EMPTY -->
</details>
```

### Measured impact (animations off, @1280)

| Metric | Value |
|---|---|
| Topics with a horizontally-clipped `.piv` | **38 / 46** |
| Pivot answers app-wide whose `.pa` body is **EMPTY** | **70 / 132** |
| Worst chip width | `stream-batch-processing` — **2100px** (437 chars) in a 592px column |
| Worst `.piv` clip | `stream-batch-processing` — **+1624px** of content clipped |
| Chip overflow past the viewport @1280 | up to **+1259px** |
| Occurs at widths | **every width 320 → 1920** (it is not width-dependent) |

Per-topic worst chips @1280 (`scrollWidth` of the chip span):

```
stream-batch-processing  2100px (437 chars)   consistency-models  1903px (398 chars)
multi-region             1902px (400 chars)   real-time-delivery  1871px (393 chars)
api-design               1805px (374 chars)   rate-limiting       1805px (374 chars)
state-machine            1787px (374 chars)   kafka-internals     1713px (352 chars)
caching                  1557px (323 chars)   ...
```

**Why the user never sees an error:** `.stage{overflow-x:hidden}` (styles.css:290) clips it. No
scrollbar appears. The user opens the `<details>` and gets a **blank answer body**.

**Evidence:**
- `shots/rt-desktop/sys-1280-caching-CLIPPED.png` — chip text cut mid-sentence at the card edge
- `shots/rt-desktop/sys-1280-caching-UNCLIPPED-proof.png` — same view with `white-space:normal` forced
  (red dashed outline) showing the ~250 words of answer prose the user cannot read
- `shots/rt-desktop/sys-1280-authz.png` — the correct hand-authored rendering for comparison

**Fix:** correct the compiler to split the chip line from the answer paragraph (require a blank line,
or take only the first line of the merged paragraph as the chip and the remainder as `piv.a`).
Defensively also give `.piv .chip` a `max-width` + `white-space:normal`.

---

## 2. P1 — The reading column is non-monotonic: widening the window narrows the text

Measured `.pane.on` width (the actual reading column), topic `caching`, view `walk`:

```
  vw     column
  760  →  730px
  860  →  830px   ← reaches the designed 830px cap
  900  →  870px
  919  →  889px   ← local maximum
  920  →  550px   ←←← CLIFF #1: −339px (sidebar docks: 0 → 296px; padding 15px → 36.8px)
 1024  →  646px
 1220  →  826px
 1260  →  830px   ← back at the cap
 1280  →  592px   ←←← CLIFF #2: −238px (companion rail appears: 0 → 290px)
 1440  →  750px
 1520  →  830px   ← finally back at the cap
 1920  →  830px
```

**You need a 1520px viewport to get back the reading column you already had at 860px.**

At **1280×800** — one of the five required test sizes, and one of the most common laptop resolutions —
the reading column is **592px**, which is:
- 29% narrower than at 1260px (830px),
- narrower than at **1024px** (646px),
- **the narrowest column of any viewport ≥ 900px.**

Geometry at 1280: `296px sidebar + 290px companion = 586px of chrome`, leaving a 694px stage; minus
`clamp(20px, 4vw, 52px)` × 2 = 102px of padding → **592px** of text.

This is the *root amplifier* for findings 3 and 5 below — both only manifest while the column is
squeezed, and both go away at 1920px.

**Mitigation exists and works:** folding the companion (`.cmp-fold` → `body.cmp-collapsed`) at 1280
restores the column to the full **830px** (+238px), and the `.cmp-reopen` button appears correctly.
The fold mechanism is healthy — it is the *default un-folded geometry* in 1280–1519px that is wrong.

**Evidence:** `shots/rt-desktop/bp/walk-{768x1024,1024x768,1280x800,1440x900,1920x1080}.png`,
`shots/rt-desktop/companion-folded-1280.png`

**Fix options:** narrow the companion below 1520px; make the stage padding `clamp()` tighter when the
companion is present; or default `body.cmp-collapsed` in the 1280–1519px band.

---

## 3. P1 — The Numbers pane truncates its numbers in 22/46 topics

`src/scripts/app/num/logic.js:32,36`
```css
.nrow{display:grid; grid-template-columns:1fr auto; ...}
.nrow-v{... white-space:nowrap; ...}
```

The `1fr` track carries an implicit `min-width:auto` (it will not shrink below its content), and the
`auto` track holds a `white-space:nowrap` value that can never wrap. The row's min-content width
(688px) exceeds the available column (546px) → 142px overflows → `.stage{overflow-x:hidden}` clips it
**with no scrollbar**.

**Side-by-side, same topic (`storage-engines`), same pane, only the viewport differs:**

| | @1280 (column 592px) | @1920 (column 830px) |
|---|---|---|
| `.stage` clipped by | **68px** | **0px** |
| "Workload mix" value renders as | `write-heavy 50,000 w/s : 1` ✂ | `write-heavy 50,000 w/s : 10,000 r/s` ✓ |
| "LSM write path" renders as | `sequential 1 append + WAI` ✂ | `sequential 1 append + WAL` ✓ |

Scope (animation-settled, all 46 topics × 9 views = 414 pairs):

| viewport | (topic,view) pairs clipping `.stage` |
|---|---|
| 768px  | **31 / 414** (worst `consistency-models/num` +83px) |
| 1024px | **23 / 414** (worst `storage-engines/num` +78px) |
| 1280px | **22 / 414** (worst `storage-engines/num` +68px) |
| 1440px | **22 / 414** (worst `storage-engines/num` +67px) |
| 1920px | **0 / 414** ✓ |

Every clipping pair is a `/num` view. A Numbers/estimation pane that silently truncates its numbers
is a functional failure, not a cosmetic one.

**Evidence:** `shots/rt-desktop/num-1280-storage-engines-CLIPPED.png` vs
`shots/rt-desktop/num-1920-storage-engines-CLEAN.png`

**Fix:** `grid-template-columns: minmax(0,1fr) auto` and allow `.nrow-v` to wrap (or `min-width:0`).

---

## 4. P1 — The companion rail shows a stale/wrong note in 64% of topic×view combinations

`src/scripts/app/shell.js:236`
```js
if (TOPIC_CMP_NOTES[tab]) {
  deskView.textContent = TOPIC_CMP_NOTES[tab][0];
  deskNote.textContent = TOPIC_CMP_NOTES[tab][1];
  deskMove.textContent = TOPIC_CMP_NOTES[tab][2];
  ...
}
// <-- NO else. If the topic has no note for this view, the PREVIOUS render stays in the DOM.
```

**Data coverage:** the 38 markdown-compiled topics only compile `cmpNotes` for **`walk` and `drill`**.
The other 7 views (`wb, sys, trade, model, num, rf, open`) have no entry. The 8 hand-authored topics
have a full 9/9.

> **266 of 414 (topic,view) pairs — 64.3% — have no companion note**, so the panel keeps whatever was
> rendered last.

**Two distinct user-visible symptoms, both reproduced:**

**(a) Wrong VIEW (fresh load).** Load `#storage-engines/num` → the companion header reads
**"THIS VIEW — How data is stored on disk"** (the *walk* note) while the user is on the **Numbers**
view. Verified across topics: `caching/sys`, `caching/model`, `kafka-internals/rf`,
`observability/trade`, `api-design/open` … all render the stale `drill`/`walk` note and its view name.

```
caching/wb      cmpView renders "Probe Drill"   (active tab is "wb")
caching/sys     cmpView renders "Probe Drill"   (active tab is "sys")
caching/model   cmpView renders "Probe Drill"   (active tab is "model")
...
```

**(b) Wrong TOPIC (in-session switch — the real user path).** Land on `#authz/sys` (authz owns a sys
note), then switch topic via the index overlay (`TopicRegistry.setTopic('caching')`) without reloading:

```
STEP 1  topic=authz    tab=sys   cmpNote="Zoom out: authorization sits between the identity that proves who you are..."
STEP 2  topic=caching  tab=sys   cmpNote="Zoom out: authorization sits between the identity that proves who you are..."
                                          ^^^ STILL AUTHZ'S NOTE — while rehearsing CACHING
```

`cmpMove` likewise still reads *"Lead with the boundary… the token proves identity, the data layer
enforces scope…"* — coaching the user on **authorization** while they rehearse **caching**.

**Evidence:** `shots/rt-desktop/companion-step1-authz-sys.png`,
`shots/rt-desktop/companion-step2-caching-sys-LEAK.png`, `shots/rt-desktop/num-1280-storage-engines-CLIPPED.png`
(visible top-right: "THIS VIEW / How data is stored on disk" on the Numbers pane)

**Fix:** add the `else` branch (clear or fall back to a generic per-view note), and compile `cmpNotes`
for all 9 views in `parse_md.mjs`.

---

## 5. P2 — Model Answers: prose in a fixed 76px label gutter (up to 17 lines)

`src/scripts/app/model-answers/logic.js:31`
```css
.mbeat-l{flex:none; width:var(--space-76); font: ... 9.5px; text-transform:uppercase; ...}
```

A fixed 76px gutter designed for a short beat name. The markdown-compiled topics put a full clause there:

| topic | label chars | lines rendered in the 76px gutter |
|---|---|---|
| `stream-batch-processing` | 143 | **17 lines** |
| `probabilistic-structures` | 102 | 11 |
| `multi-region` | 83 | 10 |
| `kafka-internals` | 74 | 9 |
| `storage-engines` | 63 | 8 |
| *(healthy)* `cdc` | 16 | 2 |
| *(healthy)* `rate-limiting` | 12 | 2 |

**34 / 46 topics** have a beat label wrapping to ≥4 lines; only **3 / 46** keep every label to ≤2 lines.
At the squeezed 592px column this produces a 76px column of 1-word lines beside a 458px column of
mostly whitespace.

**Evidence:** `shots/rt-desktop/panes-1280/model.png`

---

## 6. P2 — The sidebar topic pill shows 18% of the topic name, at every desktop width

`.tn-current` (styles.css:624) renders **21px of a 118px** name — "Storage Engines" displays as **"S…"**.
Measured identical at 1024 / 1280 / 1440 / 1920 (width-independent).

Flex budget inside the 263px `.topic-nav`:
```
#homeBtn .tn-step     32px  (flex:0 0 auto)
#tnprev  .tn-step     32px  (flex:0 0 auto)
#tntrigger .tn-trigger 149px (flex:1 1 0)
   ├─ .tn-eyebrow "Rehearsing"   77px  (flex:0 1 auto)   ← static label
   ├─ #tncurrent  "Storage Engines"  21px  (flex:1 1 0)  ← the actual topic name
   └─ .tn-chev    "▾"             8px
#tnnext  .tn-step     32px  (flex:0 0 auto)
```

The static word **"Rehearsing" (77px) is given 3.7× more space than the topic name (21px)**, because
the eyebrow is `flex:0 1 auto` (won't shrink past its content) while `.tn-current` is `flex:1 1 0` and
absorbs the entire shortfall. `text-overflow:ellipsis` is set, so it degrades to a single letter
rather than overflowing — the truncation is "clean" but the control is useless.

Visible in every desktop screenshot as `REHEARSING  S… ▾`.

---

## 7. P3 — `.msel` reserves 3 grid tracks for 2 tabs in 38/46 topics

`src/scripts/app/model-answers/logic.js:22`
```css
.msel{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); ...}
```
Tab-count distribution across 46 topics: **`{2: 38 topics, 9: 8 topics}`**. The 38 markdown topics
render 2 tabs into a hardcoded 3-track grid → **one empty phantom track**; the tab strip occupies ⅔ of
its container with a dead gap on the right (visible in `shots/rt-desktop/panes-1280/model.png`).

---

## 8. P2 — Horizontal page overflow below 411px (exact breaking width)

The sweep's headline requirement — the precise pixel widths where `scrollWidth > clientWidth`:

```
 320px → scrollWidth=411  OVERFLOW +91px
 360px → scrollWidth=411  OVERFLOW +51px
 400px → scrollWidth=411  OVERFLOW +11px
 410px → scrollWidth=411  OVERFLOW  +1px
 411px → scrollWidth=411  clean          ← first clean width
 …
1920px → clean
```

> **Document-level horizontal overflow occurs at every viewport < 411px, and at NO width from 411px to
> 1920px.** The page has a hard 411px minimum content width.

Root cause: `nav#topicnav.topic-nav` has a 411px min-content width (its four `flex:0 0 auto` children —
`#homeBtn`, `#tnprev`, `#tnnext` at 32px each plus `#tnnext{min-width:44px}` — plus the non-shrinking
`.tn-eyebrow`). Nothing else escapes.

*(Overlaps the mobile lens; reported here because the sweep was in scope.)*

---

## What is HEALTHY (verified, no action needed)

| Area | Verdict |
|---|---|
| Document-level horizontal overflow at 768 / 1024 / 1280 / 1440 / 1920 | **Clean at all five.** `scrollWidth == clientWidth` exactly. |
| Very-wide (1920px) behaviour | **Correct.** Content is `max-width:830px` capped and centred — 504px of stage whitespace, no absurd stretching. |
| Companion appear / fold / reopen | **Works.** Appears ≥1280px, `.cmp-fold` → `body.cmp-collapsed` hides it, `.cmp-reopen` shows, folding recovers the full 830px column. |
| `.mcomp` mobile-companion fallback | **Correct.** Shows <1280px, hidden ≥1280px — the coaching content is never simply absent. |
| Breakpoint cleanliness (920 / 1280) | **No broken intermediate width.** No layout tears in the 768–1279 "tablet dead zone"; the issue there is column *width* (finding 2), not breakage. |
| Console / page errors during the 1,107-sample sweep | **None.** |

### False positive, explicitly retracted
`span.badge` ("Deep rehearsal") appeared to be clipped by 135px in 283 samples of the first sweep.
Re-measured with animations disabled: **`scrollWidth == clientWidth == 135px`, clip = 0px** at 1160 /
1440 / 1920. The original reading was an artifact of the `.pane.on` entrance animation
(`transform:scale(.995)` + `filter:blur(3px)`), which perturbs `scrollWidth` mid-flight. **Not a bug.**
(This is also why the first Numbers-pane pass reported an unstable 22-vs-12 topic count; every number
in this report comes from the animation-settled re-verification pass.)

---

## Reproduction

```bash
cd D:/claude-workspace/deepdive-rehearsal
node _audit/2026-07-11-state-audit/scripts/rt-desktop-sweep.mjs        # 320→1920 × 9 panes × 3 topics
node _audit/2026-07-11-state-audit/scripts/rt-desktop-verify.mjs       # animation-settled re-verification
node _audit/2026-07-11-state-audit/scripts/rt-desktop-column.mjs       # reading-column curve + fold
node _audit/2026-07-11-state-audit/scripts/rt-desktop-allchips.mjs     # chip overflow, all 46 topics
node _audit/2026-07-11-state-audit/scripts/rt-desktop-companion3.mjs   # cross-topic companion leak
node _audit/2026-07-11-state-audit/scripts/rt-desktop-num3.mjs         # Numbers-pane truncation
node _audit/2026-07-11-state-audit/scripts/rt-desktop-final.mjs        # .mbeat-l / .msel across topics
```
