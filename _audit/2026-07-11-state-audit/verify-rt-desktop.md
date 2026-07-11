# Adversarial verification — `rt-desktop` lens

**Verdict: 8/8 findings CONFIRMED.** This is an unusually solid lens. I attacked every finding,
independently re-measured every number against `dist/index.html`, and could not kill any of them.
Two *sub-claims inside* otherwise-correct findings are wrong and would send a fixer the wrong way —
those are itemised below. I also found **one P0 the lens (and the accessibility lens) missed**: the
app renders a **completely blank page** for any user with `prefers-reduced-motion: reduce`.

Method: fresh Playwright runs against `file:///D:/.../dist/index.html`, panes pierced through their
**open shadow roots** (`<deep-system-map>`, `<deep-numbers>`, `<deep-model-answers>` …), animations
settled, screenshots as ground truth.

---

## Two methodology traps I hit (and that shape the evidence)

1. **Panes are web components with shadow roots.** `document.querySelectorAll('.piv')` returns **0**.
   Everything lives in `host.shadowRoot`. My first scan reported 0/46 clipped and I nearly filed a
   false refutation. The lens's scripts pierce the shadow root correctly.
2. **`reducedMotion:'reduce'` makes the app paint BLANK** (see the missed P0). DOM geometry still
   measures correctly under it, so the lens's numbers are valid — but every screenshot taken under
   `reduce` is a blank cream rectangle. All my visual evidence is captured with normal motion.

---

## Finding-by-finding

### F1 (P0) System Map pivot answers destroyed in 38/46 topics — **CONFIRMED**

Reproduced to the integer at 1280×800:

| metric | lens | mine |
|---|---|---|
| topics with a clipped `.piv` | 38/46 | **38/46** (exactly the 38 md topics; 0/8 hand-authored) |
| total pivots app-wide | 132 | **132** |
| pivots with an EMPTY `.pa` | 70 | **70** (all 70 in md topics) |
| worst chip | stream-batch-processing 437ch / 2100px | **437ch / 2100px** |
| caching `.piv[0]` chip | 323ch / 1557px | **323ch / 1557px** |
| chip escapes viewport by | +1259px | **+1259px** |

The chip's literal text (`vrt-02-chiptext.mjs`) proves the compiler merge:

```
caching  chip (323 chars, 1557px):
  "→ cache-aside by default, write-through where the cache must stay warm
   Cache-aside caches only what's read and keeps writes simple, at the cost of a stale-populate race…"
caching  .pa: 0 chars   ← (((EMPTY — NOTHING RENDERS)))

authz    chip (19 chars, 110px): "→ Identity / tokens"
authz    .pa: 369 chars of real content
```

Root cause confirmed in source: `tools/compiler/parse_md.mjs:225-226` — `if (m && !piv.chip) piv.chip
= '→ ' + raw.slice(...); else piv.a = prose(raw);`. In `src/topics-md/caching.md:280-281` the `->`
chip line and the answer paragraph are **consecutive with no blank line**, so markdown-it emits one
paragraph token; the whole blob lands in `piv.chip` and `piv.a` is never assigned. Independent
corroboration: `_audit/.../caching.FIXED.md:281` — a prototype fix already in this repo — differs
from the live file by exactly **one inserted blank line**.

> **CORRECTION (matters for the fixer).** The lens blames `.stage{overflow-x:hidden}` (styles.css:290).
> That is **wrong**. Measured ancestor chain for the caching chip:
> ```
> details.piv   overflow-x: hidden   clips 1090px   (client 544px)   ← THE CLIPPER
> main.stage    overflow-x: hidden   clips    0px   (client 694px)
> ```
> `.stage` clips **nothing** on sys views. The clipper is `.piv{overflow:hidden}` (`system-map.js:38`).
> Editing styles.css:290 would change nothing. (Minor: authz's `.pa` is 369 chars, not 439.)

Evidence: `shots/verify-rt-desktop/f1-sys-1280-{caching,authz}.png`, `scripts/vrt-01-sysmap.mjs`, `vrt-02-chiptext.mjs`

---

### F2 (P1) Reading column is non-monotonic — **CONFIRMED** (but the headline superlative is FALSE)

Every measured width reproduces exactly (`caching/walk`):

| vw | 768 | 860 | 919 | **920** | 1024 | 1260 | **1280** | 1440 | 1520 | 1920 |
|---|---|---|---|---|---|---|---|---|---|---|
| column | 738 | 830 | 889 | **550** | 646 | 830 | **592** | 750 | 830 | 830 |

Both cliffs confirmed: 919→920 drops **−339px** (sidebar docks); 1270→1280 drops **−238px**
(companion appears). The 830px cap is not regained until **1520px**. Folding the companion at 1280
recovers exactly **+238px** (592→830, `body.cmp-collapsed`).

> **CORRECTION.** The finding's title and evidence claim 1280 is *"the narrowest column of ANY
> viewport ≥900px."* **It is not.** A 1px/4px sweep shows the band **920–964px** is narrower, bottoming
> at **550px @ vw 920** vs 592px @ 1280. The lens's own data (it printed `920 -> 550`) contradicts its
> own superlative. Consequence: the **920px cliff is the worse regression**, and the lens's three
> recommendations all target only the 1280–1519 companion band — a fix that follows them leaves the
> *worst* case untouched.

Evidence: `scripts/vrt-03-column.mjs`, `vrt-04-band.mjs`

---

### F3 (P1) Numbers pane truncates its numbers in 22/46 topics — **CONFIRMED** (I tried hard to kill this one and failed)

Scope reproduces **exactly**, and every clipping pair is a `/num` view:

| vw | 768 | 1024 | 1280 | 1440 | 1920 |
|---|---|---|---|---|---|
| clipping pairs (of 414) | **31** | **23** | **22** | **22** | **0** |

I first thought this was refuted: every `.nrow` child's *element box* ends at x=916, well inside the
x=990 clip edge — nothing appeared to be cut. **That was my error.** The `.nrow-v` is `white-space:nowrap`
inside a squeezed grid track, so its **border box stays narrow while its TEXT paints beyond it** —
`getBoundingClientRect()` on the element cannot see that. Measuring the **text** (Range rects):

```
storage-engines /num @1280   (clip edge x=990)
  TRUNCATED "Workload mix"    value="write-heavy 50,000 w/s : 10,000 r/s"
     box right=916 (nowrap content overflows its own box by 142px) | TEXT right=1058
     => 68px of text is PAST the clip edge and INVISIBLE
  TRUNCATED "LSM write path"  value="sequential 1 append + WAL"
     TEXT right=994  => 4px past the edge   ← the "L" of WAL loses its foot
  @1920: 0px hidden, everything visible.
```

That 142px is the lens's exact figure. And its odd-looking reading `sequential 1 append + WAI` is
literally what a 4px-clipped **WAL** looks like — a precise observation, not a fabrication. The
screenshot confirms it: `f3-num-1280-storage-engines-VERIFY.png` shows `write-heavy 50,000 w/s : `
cut mid-value. Root cause as stated: `num/logic.js:32` `grid-template-columns:1fr auto` (1fr carries
`min-width:auto`) + `:36` `.nrow-v{white-space:nowrap}`. Here `.stage{overflow-x:hidden}` **is** the
clipper (unlike F1) — measured 68px.

(Nit: the lens's *"worst topic"* attributions are off — `load-balancing` is worse than
`storage-engines` at every width, +112px @768, +75px @1280. The counts are exact.)

Evidence: `scripts/vrt-05-num.mjs`, `vrt-06-numtext.mjs`, `vrt-12-textclip.mjs`

---

### F4 (P1) Companion shows a stale note in 64.3% of topic×view — **CONFIRMED**

- Coverage: **266 / 414 pairs (64.3%)** have no note — exact. The 38 md topics compile notes for
  **only `walk` + `drill`**; the 8 hand-authored topics have all 9. (38 × 7 = 266.)
- **Fresh-load wrong-view:** `#storage-engines/num` → active tab `num`, but the rail renders the
  **walk** note ("How data is stored on disk"). `TOPIC_CMP_NOTES.num` is `false`.
- **In-session cross-topic leak** (the real user path): land on `#authz/sys`, `setTopic('caching')` →
  the rail reads **"YOU'RE REHEARSING: Caching Strategies"** while the note still says *"Zoom out:
  authorization sits between the identity that proves who you are…"* — **byte-identical** to authz's.
  The user is coached on authorization while rehearsing caching.

Root cause confirmed: `shell.js:237` `if (TOPIC_CMP_NOTES[tab]) { … }` with **no `else`** — a missing
key leaves the previous render in the DOM. (Lens said line 236; it's **237**.)

Evidence: `shots/verify-rt-desktop/f4-leak-companion-crop.png`, `scripts/vrt-16-rest.mjs`

---

### F5 (P2) Model-answer prose in a 76px label gutter — **CONFIRMED**

`.mbeat-l` renders at a fixed **76px** at every width (`--space-76: 76px`). stream-batch-processing:
**143 chars → 17 lines**; probabilistic-structures 102→11; multi-region 83→10. Only **3/46** topics
keep every label ≤2 lines. (Nit: I count **35**/46 topics with a label ≥4 lines; the lens said 34 —
a one-topic rounding difference at the line-count boundary.)

### F6 (P2) Sidebar topic pill shows ~18% of the name — **CONFIRMED exactly**

`.tn-current` renders **21px** of a 103px name, **identical at 1024/1280/1440/1920** (width-independent).
`.tn-eyebrow "Rehearsing"` = **77px**; `#tntrigger` = **149px**. The static label outranks the topic
name 77px→21px. `title` attribute is **null**, so the full name isn't even reachable on hover.

### F7 (P2) Horizontal overflow below 411px — **CONFIRMED exactly**

1px scan: 320→+91, 360→+51, 400→+11, 410→+1, **411 = first clean width**; `scrollWidth` pinned at a
hard 411 below that. Swept **every width 411→1920: all clean**. Culprit confirmed: `nav#topicnav`
(w=396, left=15, **right edge = 411**) and `button#tnnext.tn-step`; the only other escapees at 360px
sit inside `div.seg`, a legitimate horizontal scroller.

### F8 (P3) `.msel` reserves 3 tracks for 2 tabs — **CONFIRMED exactly**

Tab distribution across 46 topics: **{2 tabs: 38, 9 tabs: 8}**. `.msel` computes **3** tracks at every
desktop width (`model-answers/logic.js:22`). So 38 topics render 2 tabs into a 3-track grid.
(There is a `@media(max-width:560px)` 2-track override, so this is desktop-only — as reported.)

---

## MISSED — P0: the app is a **blank page** under `prefers-reduced-motion: reduce`

Not found by rt-desktop, and **actively certified healthy** by the accessibility lens
(`accessibility.md:24`: *"`prefers-reduced-motion` … **TRUE** … all 9 probed elements collapse to
`animation-duration: 1e-05s`"*). It probed `animation-duration` on 9 elements and never checked
`body`'s opacity or looked at a screenshot.

**Root cause (source):**
```css
src/styles.css:90   body{ … opacity:0; animation:bodyIn … forwards }
src/styles.css:91   @keyframes bodyIn{from{opacity:0}to{opacity:1}}
src/styles.css:137  @media (prefers-reduced-motion: reduce){ *{animation:none!important; …} }
```
`body` is authored at **`opacity:0`** and depends on `bodyIn` + `animation-fill-mode:forwards` to
reach `opacity:1`. The blanket `*{animation:none!important}` matches `body`, removes the animation, so
the fill-forwards never applies — **`body` stays at `opacity:0`.**

**Measured, fresh load, `reducedMotion:'reduce'`:**
```
body computed:  opacity=0   animationName=none   animationFillMode=none
document.body.innerText.length = 27,186     ← the whole app is there
rendered pixels                = none       ← uniform cream
```
Deterministic and **reversible**: flipping the media at runtime blanks an already-rendered page and
flipping it back restores it. Adding **one line** `body{opacity:1}` fully restores the app.

Note `styles.css:21-26` (the careful "v151: Respect prefers-reduced-motion" block) is *safe* — it only
shortens durations and scopes `animation:none` to specific selectors. The fatal rule is the second,
blunter block at **:137**. Two competing reduced-motion implementations; the blunt one wins.

**Impact:** every user with Reduce Motion enabled (Windows: Settings → Accessibility → Visual effects
→ Animation effects off; macOS: Reduce Motion) opens this offline trainer and sees **nothing**.

**Fix (S):** inside the reduce media block, `body{opacity:1!important}` — or stop authoring `body` at
`opacity:0` and drive the reveal from an animation that starts opaque.

Evidence: `shots/verify-rt-desktop/PROOF-reduce-blank.png`, `PROOF-reduce-fixed-with-body-opacity-1.png`,
`PROOF-normal-renders.png`, `flip-{1,2,3}-*.png`; `scripts/vrt-14-rmroot.mjs`, `vrt-15-rmproof.mjs`

---

## Scripts (all re-runnable from repo root)

```
vrt-01-sysmap.mjs      F1 — 46-topic shadow-pierced pivot scan
vrt-02-chiptext.mjs    F1 — chip/.pa text dump + true clipping ancestor
vrt-03-column.mjs      F2 — reading-column curve + cliffs + fold recovery
vrt-04-band.mjs        F2 — refutes the "narrowest ≥900px" superlative
vrt-05/06/12-*.mjs     F3 — 414-pair scope, row anatomy, TEXT-range truncation
vrt-16-rest.mjs        F4/F5/F6/F8
vrt-17/18-*.mjs        F7 — 1px overflow sweep + culprit
vrt-14/15-*.mjs        MISSED P0 — reduced-motion blank paint
```
