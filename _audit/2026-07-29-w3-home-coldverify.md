> **Author: w3-verifier** (independent cold verify of branch `frontend/w3-home-identity` at
> tip `db70282`, 2026-07-29). Copied verbatim into the branch by w13-builder at the team-lead's
> direction -- the campaign keeps verdicts in the tree. Not edited: the round-2 responses to
> N1 and N2 live in `_audit/2026-07-29-w3-home-identity.md`, not in here.

---

# W3 COLD-VERIFY VERDICT -- `frontend/w3-home-identity` @ db70282

## VERDICT

**CLEAN with TWO NON-BLOCKING findings. Zero BLOCKING.**

- **N1 (NON-BLOCKING, report accuracy + newly-visible incoherence):** the hero's *drop shadow* did move
  to the room ink in source, but the shipped hero is **autofocused on paint**, so `button:focus-visible`
  (styles.css:53) replaces that shadow with a glow in `--acc-a15/--acc-a20` -- **still the retired
  indigo**. The freeze's P2-16 receipt table asserts "hero fill + border + **shadow** = #006B63/#13BAAC"
  and "retired indigo still on the hero: **no / no**". Both are false of the as-photographed hero. Not a
  regression (the glow is byte-identical before and after) -- but before it was indigo-on-indigo and
  invisible, and now it is a **3px lavender ring hugging a teal button, in the committed baseline**.
- **N2 (NON-BLOCKING, robustness):** `--rm` has no CSS-level fallback, so the hero's entire fill hangs on
  a JS-emitted inline attribute. Unreachable on the shipped path, but the failure mode is an invisible
  hero rather than a wrong colour.

Everything the freeze claims as a *measurement* reproduced under an independent instrument, most of it to
the digit: the scoreboard, the twelve contrast figures, the VR diff bounding boxes, the byte-identity of
the 14 untouched baselines, the review pair, and both watched-red captures. Both new guards are genuinely
falsifiable -- I made each fail in both directions and broke every one of their abort-controls.

---

## Instruments I built (and their negative controls)

All scratch lives in
`C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w3-verify\`.
The repo was **never written to**: `git status --porcelain` was empty before and after every run.

| instrument | what it measures | negative control demonstrated |
|---|---|---|
| `census.cjs` | own walk of `#home` (+ shadow roots): UA-font counts, display-face counts, hero/room/card computed colour + geometry | planted a bare `<button>` into `#home` -> `textBearingInUA` 0 -> **1**, named in the offender list; planted a `font:inherit` button -> still **0**; built-in assert `UA != app stack` |
| `shadow.cjs` | hero focus state; box-shadow focused vs blurred | reports both states, so a claim true of one and false of the other cannot hide |
| `contrast.py` | WCAG 2.x ratio, re-derived from the palette hexes | `#000/#fff = 21.00`, `#777/#fff = 4.48`, `#767676/#fff = 4.54`, `#fff/#fff = 1.00` -- all match published reference values |
| `mech.py` | `font:inherit` ordering over all 723 declaration blocks | re-ran the identical scan with one planted `font-size:11px;font:inherit` rule -> **1 violation** found |
| `face.cjs` | does Space Grotesk *render*, or is it only *named* | measured a bogus first family: width came back **exactly** the fallback width, so the probe can detect a face that failed to load |
| `crop.cjs` + scanline sampler | pixel-level read of the committed baselines | n/a (direct observation) |

A note on why `face.cjs` exists: a computed `font-family` string naming "Space Grotesk" does **not** prove
the glyphs rendered in it -- if the `@font-face` had failed, the string would be unchanged. That is a
display-face census that cannot fail, and the freeze's `0 -> 3` rests on exactly that kind of count. It
holds up (below), but it needed checking.

---

## 1. The scoreboard, re-derived (brief item 1)

My own census, booted on the VR harness's protocol (1280x800, dsf 1, `hash ''`, theme via
`ddr.v1.theme`, seeded RNG, UTC/en-US), run against `git show 437564c:...` and `git show db70282:...`:

| measure | freeze says | **I measure** | |
|---|---|---|---|
| text-bearing under `#home` in UA Arial, before | 147 / 210 | **147 / 210** | exact |
| ditto, after | 0 / 210 | **0 / 210** | exact |
| all `#home` descendants in UA, before -> after | 197/365 -> 2/365 | **197/365 -> 2/365** | exact |
| the 2 survivors | two `<input>`, no text | **`INPUT [no-text]` x2** | exact |
| display-face on `#home`, before -> after | 0 -> 3 | **0 -> 3** | exact |
| which 3 | `.hm-cta-t`, both `.hm-h` | **`SPAN.hm-cta-t @24px`, `H2.hm-h @12px` x2** | exact |
| `#home` scrollHeight | 2890 -> 3033 | **2890 -> 3033** | exact |
| hero height | 105 -> 111 | **105 -> 111** | exact |
| room card height | 119 unchanged | **119 both** | exact |
| hero fill light | `#534AB7` -> `#006B63` | **rgb(83,74,183) -> rgb(0,107,99)** | exact |
| hero fill dark | `#9D93F0` -> `#13BAAC` | **rgb(157,147,240) -> rgb(19,186,172)** | exact |
| six room cards `--acc` | unchanged | **`{#534AB7:6}` light / `{#9D93F0:6}` dark, both builds** | exact |
| 46 topic cards `--acc` | unchanged | **`{#534AB7:46}` / `{#9D93F0:46}`, both builds** | exact |
| `.ix-cross` border | unchanged | **rgb(83,74,183) / rgb(157,147,240), both builds** | exact |
| `.hm-brand` | unchanged | **rgb(150,61,134) / rgb(218,141,202), both builds** | exact |
| `.hm-cta-t` / `.hm-cta-ar` size | 20 -> 24 / 20 -> 21 | **20 -> 24 / 20 -> 21** | exact |

Zero page errors on all four runs. **`shadowHostsUnderHome` is `[]`** -- the freeze's aside that nothing
on `#home` is in a shadow root is true, and my walk descends into shadow roots, so it would have found one.

Two things the freeze rounds that I will state fully, neither a defect:
- Topic-card heights are three classes before and two after -- `{89:29, 104:15, 114:2}` -> `{97:30, 116:16}`.
  "89 -> 97" is the modal class, not the whole distribution.
- **Space Grotesk genuinely renders.** `document.fonts.check('700 24px "Space Grotesk"')` is `true`, the
  face is `loaded` (variable 300-700), and the shipped title "Event-Driven Backbone" measures
  **270.47px** against **262.38px** for the same element forced to the fallback stack -- a real 3.1%
  different typeface, not a nominal one.

---

## 2. The two brief deviations (brief item 2)

### 2a. P2-16 used `--rm` instead of re-scoping the neutralisation -- **JUSTIFIED, on disk**

Every link in the builder's argument holds:

| claim | verified |
|---|---|
| `index.html:2` hard-codes the boot accent | `<html lang="en" data-group="architecture-apis">` -- yes, line 2 |
| `applyIdentity` does not run at boot | `topic-protocol.js:73-75` comment says so; it is called **only** from `setTopic()` (`:222`), which returns early when `id === cur`, and `register()` seeds `cur` without calling it |
| the boot accent is therefore wrong for the hero | measured live: `rootDataGroup=architecture-apis`, `rootAcc=#963D86` (light) / `#DA8DCA` (dark) |
| the CTA's destination is a *different* room | `ctaTarget = event-driven`, `TopicRegistry.ids()[0] = event-driven`, `identity.group = messaging-events` (`#006B63`) |

So inheritance would have painted the hero **#963D86 magenta** on a button reading "Start / Event-Driven
Backbone". The brief's own acceptance test ("light hero = destination room ink") would have **failed**.
The deviation is correct and the report flags it prominently.

`--rm` is genuinely the codebase's own idiom, not an invention: `panels.js:258` emits
`style="--rm:var(--room-' + b.group.id + ')"` on `.ix-group` and `panels.js:282` the same on `.hm-room`,
and `styles.css:1465-1467, 1818-1827` already consume it.

**The neutralisation rule is untouched** -- confirmed both by the diff (the `.ix-panel,.xd-panel,...`
re-bind is not in it) and by measurement: room cards, topic cards and `.ix-cross` compute identical
values in both builds, both themes.

**Groupless degrade path -- tested live, works.** Setting `style="--rm:var(--acc)"` (what `roomStyle()`
emits for a topic with no group) renders `rgb(83,74,183)` light / `rgb(157,147,240)` dark: exactly
today's colour, not an invalid `var()`. And it is unreachable anyway -- all **46** registered topics
carry a group (`messaging-events 7, data-storage 10, reliability-observability 8, platform-infra 11,
architecture-apis 7, security-tenancy 3`; `groupless: []`). Both `class="hm-cta"` emitters
(`home-view.js:131` and `:145`) call `roomStyle()`, so there is no third path.

### 2b. P2-15 fixed 12 rules, not 4 -- **JUSTIFIED**, with one clarification the freeze already makes

The twelve are `.ix-x .ix-g-cram .ix-c-reset .ix-card .ix-goal-b .ix-due-b .ix-home-btn .ix-weak-b
.ix-reset .ix-io .ix-undo-btn .ix-cross` -- confirmed by parsing the diff (13 lines gain `font:inherit`;
the 13th is the `.hm-cta` continuation line that already had it and was rewritten for `--rm`).

The brief asked me to check the extra 8 are "same-defect". They are, but in **two** classes, and the
freeze is explicit about this rather than blurring it:

- **UA-Arial class** (no author family at all): `.ix-x`, `.ix-c-reset`, `.ix-goal-b`, `.ix-due-b`,
  `.ix-home-btn`, `.ix-weak-b`, `.ix-reset`. Verified by reading the pre-fix declarations -- none
  declares `font-family` or a `font` shorthand.
- **Bespoke-stack class**: `.ix-io` (`font:<semibold> 11px -apple-system,system-ui,sans-serif`) and
  `.ix-undo-btn` (`font:<bold> 12px ...`). These were **never** UA-Arial, which is why neither appears
  in the 19-component watched red. The freeze says exactly this ("Ten take `font:inherit`; two had a
  bespoke stack folded into the body stack").

**The folds are size-neutral.** `--font-size-micro -> --size-font-11 -> 11px` and
`--font-size-caption -> --size-font-12 -> 12px`, so `.ix-io` keeps its 11px and `.ix-undo-btn` its 12px.

**Zero cold-home VR cost -- measured, and the claim is stronger than stated.** I counted each rule's
elements on a cold home at the VR viewport (1280x800, scrollY 0):

| selector | in DOM | rendered | **in cold-home viewport** | height before -> after |
|---|---|---|---|---|
| `.ix-x` `.ix-c-reset` `.ix-goal-b` `.ix-due-b` `.ix-home-btn` `.ix-weak-b` `.ix-reset` `.ix-undo-btn` | **0** | 0 | **0** | n/a |
| `.ix-io` | 2 | 2 | **0** (at y=2921) | 27 -> 28.5 |
| `.ix-g-cram` | 6 | 6 | 0 (y=827) | **24 -> 24** (`min-height:24px` absorbs it) |
| `.ix-card` | 46 | 46 | 0 (y=885) | 88.78 -> 96.78 |
| `.ix-cross` | 1 | 1 | **1** (y=624) | 60 -> 66 |

Seven of the eight are not "invisible" -- they are **absent from the DOM entirely** on a cold home.
`.ix-io` is present but sits at y=2921, ~2100px below an 800px viewport. So the eight contribute
exactly zero pixels to the cold-home baselines, and the only one of the twelve inside the diff box is
`.ix-cross`, which is in W3's declared scope. Consistent with the measured outcome: **all 14 non-home
baselines byte-identical**, home diff starting at the hero.

One unphotographed consequence worth recording (not a defect): `font:inherit` also inherits
`line-height`, so `.ix-io`'s line-height goes `normal -> 16.5px` and its height 27 -> 28.5px in the
home footer. No committed artifact frames that region -- neither the viewport baselines nor the
library pair reach y=2921 -- so it ships unphotographed. The freeze's geometry paragraph covers cards,
hero and page height but not this 1.5px.

---

## 3. Guard falsifiability (brief item 3)

### G-A `test/latent_arial.cjs`

Baseline: **PASS, 15 allowlisted, exit 0.** Then I made it fail, five ways:

| test | how | result |
|---|---|---|
| NEW (real defect) | surgically reverted `.ix-card`'s `font:inherit` in a scratch copy of the deliverable, ran the **real unmodified check** | `NEW: 1` -- `46 x .ix-card (visible 46) [home, index-overlay]`, **exit 1** |
| NEW (planted) | injected `<button class="vplant-new">` into the deliverable, real check | `NEW: 1` -- `.vplant-new`, **exit 1** |
| STALE | added `ix-card` to a copy of the debt file (it was fixed this wave) | `STALE: 1` -- `.ix-card`, **exit 1** |
| STALE control | same copy, **real** debt file | `PASS`, exit 0 -- so the red came from the debt content, not the copy |
| CONTROL C, broken **environmentally** | injected `<style>button{font-family:inherit}</style>`, real check | `SELF-TEST ABORT` on **B and C**, exit 1 |
| CONTROL A | inverted the predicate | `SELF-TEST ABORT: CONTROL A ... the detector is blind`, exit 1 |
| CONTROL B | inverted the predicate | `SELF-TEST ABORT: CONTROL B ... flags everything`, exit 1 |

The Control-C test is the one worth reading twice. On that doctored page **every button looks clean** --
a naive check would have reported zero offenders and 15 STALE entries, i.e. "the whole app is fixed!".
The guard refuses and says it cannot see the defect on this platform. That is a check that has genuinely
earned its greens.

The STALE/copy tests used a copy differing from `test/latent_arial.cjs` in **exactly 2 lines** (the
`_boot.cjs` require path and `DEBT_FILE`), diffed line-by-line to prove it. Both NEW tests used the
**real** file.

### G-B `test/phantom_tokens.py`

Baseline: **PASS, 3 allowlisted, exit 0.** Then:

| test | result |
|---|---|
| phantom planted in **live** CSS (`.zz{font-size:var(--zzz-ghost,4px)}`) | `NEW: 1 --zzz-ghost`, **exit 1** |
| **the comment trap** -- the *same token string* placed only inside `/* ... */` | **PASS, exit 0** |
| reverted P3-12 (`--font-size-h3,20px` restored) | `NEW: 1 --font-size-h3`, **exit 1** |
| STALE (`--font-size-h3` planted in a debt copy) | `STALE: 1`, **exit 1** |
| STALE control (same copy, real debt) | `PASS`, exit 0 |
| self-test broken (comment-stripping made a no-op) | `SELF-TEST ABORT -- false positive on a token named only inside a comment`, exit 1 |

The comment pair is the discriminating test: identical token text, opposite verdicts, decided solely by
whether it sits in code or in prose. Trap 3 is genuinely handled.

**Nit (cosmetic, not a finding):** when reporting a NEW phantom, the line-number snippet is searched in
the **unstripped** text, so the P3-12 revert pointed at *line 2070* -- the comment that mentions the
token -- rather than the live declaration. Detection is correct (it runs on stripped text); only the
human-facing pointer can aim at prose.

### Watched-red captures are honest -- both reproduced against the pre-fix build

I re-ran **both** guards against `git show 437564c:...` with an **empty allowlist**.

- `phantom_tokens.py`: matches the committed `watched-red-phantom-tokens.txt` **line for line** --
  same 5 phantoms, same use-site counts (`--font-size-h3` 2, `--space-980` **9**, `--rx`/`--ry`/
  `--tx-dim` 1 each), same source line numbers (2055, 1163, 2016, 75896). The only textual difference
  is the self-test summary line, which gained `/ comment-prose` after trap 3 was fixed -- consistent
  with the freeze's own account of the build order.
- `latent_arial.cjs`: matches the committed `watched-red-latent-arial.txt` **line for line** -- `19`
  components, `NEW: 19`, `buttons walked: 252`, `UA control font: [Arial]`, and every per-component
  count and surface list identical (`.ix-card` 46, `.ix-cross` 1, `.ix-g-cram` 6, `.ix-x` 1 in scope;
  15 out). Exit 1.

Neither capture was written by hand or lightly edited: they are what the guards actually print.

Note the audit said `--space-980` had **5** use sites; the real count is **9**, and the freeze corrects
it rather than inheriting the number.

---

## 4. Visual regression (brief item 4)

**My own `npm run vr` (verify, no update): PASS, 16/16, exit 0.**

```
home-light 0   home-dark 0   walk-light 0   walk-dark 0   drill-light 0   drill-dark 0
sys-light 0    num-light 0   wb-light 0     room-data-storage 0
room-reliability-observability 0   room-platform-infra 3   room-architecture-apis 0
room-security-tenancy 0            m-walk-light 0          m-walk-dark 0
worst = 3 px (room-platform-infra), budget 32
```

The 3px on `room-platform-infra` is the same sub-tolerance jitter class the freeze describes (it saw 4px
on `walk-light` on its confirming run). Different baseline, same noise -- which **corroborates** the
characterisation rather than contradicting it.

**Byte-identity of the 14, at the object level** (`git rev-parse <commit>:<path>`):

```
IDENTICAL  drill-dark  drill-light  m-walk-dark  m-walk-light  num-light
IDENTICAL  room-architecture-apis  room-data-storage  room-platform-infra
IDENTICAL  room-reliability-observability  room-security-tenancy  sys-light
IDENTICAL  walk-dark     <- the one vr:update rewrote; RESTORED, confirmed
IDENTICAL  walk-light
IDENTICAL  wb-light      <- the other one; RESTORED, confirmed
CHANGED    home-dark  home-light
```

`manifest.json`'s diff is exactly three lines of substance: the two home `sha256` entries and the
`generated` timestamp. **The restore claim is true**, including the manifest sha entries.

**Home-pair diff, my own per-pixel diff at the harness's tolerance (>2/255):**

```
home-light   changed=210204   bbox=(144,178) 992x618   worst channel delta 255
home-dark    changed=211249   bbox=(144,178) 992x618   worst channel delta 236
```

Identical to the freeze's `210,204` / `211,249` and `992x618 at (144,178)`. The box starts at **y=178**,
which is the hero's exact top; `.hm-brand` lives at y=41..59 and is **outside** it -- so "the home panel,
starting below the header, which is `.hm-brand` staying put" is literally true. `x=144` is the hero's
x=150 minus the 3px focus outline at 3px offset.

---

## 5. The review pair (brief item 5)

**All four are byte-identical to the baselines they claim to be** (sha256, first 16 hex):

```
before-light.png ff91cf05a7ca161d == 437564c:home-light-win32-chromium149.png ff91cf05a7ca161d
before-dark.png  d33877a16d2570fb == 437564c:home-dark-win32-chromium149.png  d33877a16d2570fb
after-light.png  e45189168f729fde == db70282:home-light-win32-chromium149.png e45189168f729fde
after-dark.png   eace5cba78ea24a2 == db70282:home-dark-win32-chromium149.png  eace5cba78ea24a2
```

They are not re-derivations; they are the same objects. The `before-*` sha values also match the *old*
manifest entries (`ff91cf05a7ca161d`, `d33877a16d2570fb`), closing the loop.

**The library pair reproduces byte-for-byte.** I re-ran the committed `capture-library-pair.cjs` against
both deliverables:

```
before: anchored "All topics" at viewport top 24px, scrollY 680 -> sha 8c945505d784aade == committed
after : anchored "All topics" at viewport top 24px, scrollY 692 -> sha e2ba253502c67c1c == committed
```

Same anchor (24px), **different scrollY** (680 vs 692) -- which is precisely the point of anchoring on the
section rather than a shared Y, and proves the framing claim rather than asserting it. The script throws
if the section lands more than 2px off, so a silently-misframed capture cannot be produced.

---

## 6. Mechanical claims (brief item 6)

- **`font:inherit` ordering:** 723 declaration blocks scanned, **17** declare `font:inherit`, **0**
  violations -- no `font-size`/`font-weight`/`line-height`/`font-family` ahead of it in any block.
  Negative control: the same scan with one planted `color:red;font-size:11px;font:inherit` rule finds
  **1**. The scan can fail.
- **`tokens.generated.css` is generated, not hand-edited:** `design-tokens/tokens.json` carries
  `space.980 = {"$value": "980px"}`; the generated file resolves `--space-980: 980px`; it is
  `.gitignore:20` and **untracked** (`git ls-files` returns nothing) -- so it *cannot* have been
  hand-edited into the commit. The deliverable embeds `--space-980: 980px`.
- **The nine call sites dropped their fallbacks:** `var(--space-980)` appears **9** times and
  `var(--space-980, <fb>)` **0** times, in both `src/styles.css` and the built deliverable.
- **Strict ASCII:** all ten added/modified source, test and audit files are 7-bit ASCII (0 non-ASCII lines).
- **Registration:** `phantom_tokens` is in the static list and `latent_arial` in the browser list of
  `check_all.py`, each with a substantive rationale comment.
- **`_audit/INDEX.md`** carries the new pointer.

---

## 7. Contrast, re-derived across all six rooms (brief item 7)

My own WCAG 2.x implementation, after passing four published reference values:

| room | light ink | mine | claimed | dark ink | mine | claimed |
|---|---|---|---|---|---|---|
| messaging-events | `#006B63` | **6.40** | 6.40 | `#13BAAC` | **7.32** | 7.32 |
| data-storage | `#315BB4` | **6.39** | 6.39 | `#7DA6F3` | **7.29** | 7.29 |
| reliability-observability | `#924E00` | **6.34** | 6.34 | `#E19556` | **7.31** | 7.31 |
| platform-infra | `#694EB0` | **6.33** | 6.33 | `#AD9AEE` | **7.31** | 7.31 |
| architecture-apis | `#963D86` | **6.35** | 6.35 | `#DA8DCA` | **7.31** | 7.31 |
| security-tenancy | `#A73A57` | **6.20** | 6.20 | `#EE8CA4` | **7.55** | 7.55 |

**Zero mismatches on twelve figures.** Range **6.20-6.40** light, **7.29-7.55** dark, exactly as claimed.
Worst case 6.20 clears the 4.5 AA floor by **38%**. The retired indigo re-derives to **6.93** light /
**6.66** dark, so "dark improves in every room" is true (7.29 > 6.66) and "light gives up at most 0.73"
is exact (6.93 - 6.20 = 0.73).

`--on-slab` is confirmed theme-fixed and room-independent by live measurement: `#fff` light, `#1A1622`
dark, on both builds.

One reading note, not an error: **security-tenancy is the floor in LIGHT (6.20) but the CEILING in dark
(7.55)**; the dark floor is data-storage at 7.29. The freeze's table bolds both of security-tenancy's
figures, which is accurate as printed.

---

## 8. Full gate (brief item 8)

See `gate-full.txt` in the scratch dir. Run on the committed tree with output written **outside** the
repo, so `build_integrity`'s committed-pair assertion was earned rather than deferred -- the same
discipline the freeze describes. `git status --porcelain` captured before and after: **empty both times**.

```
60 rows    PASS 60    FAIL 0    SKIP 0    GATE: PASS    exit 0

ascii_guard        PASS  811 files strict 7-bit ASCII (src 686, src/topics-md 38, test 62, tools 25)
build_integrity    PASS  12046399 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the
                         deliverable, COMMITTED deliverable == fresh build of HEAD
phantom_tokens     PASS  3 known phantom(s) allowlisted; no new one, none left stale        [NEW]
latent_arial       PASS  15 known component(s) allowlisted; no new latent-Arial button,
                         no fixed entry left stale                                          [NEW]
visual_regression  PASS  16 baselines, win32-chromium149; every capture reached a proven rest
                         state across all 18 roots and matched its committed pixels
build_determinism  PASS  88 Shiki blocks identical under a simulated 600ms/line stall
cta_contrast       PASS  36 CTA x room x theme, every core glyph pixel >= 5.0:1
room_contrast      PASS  12 rooms: ink/bg >= 4.5, on-slab/solid >= 5.0
```

This **matches the committed capture row for row**, independently reproduced ~4 hours later on a
box that had a sibling builder on it. Two things worth stating explicitly:

- **`build_integrity`'s committed-pair arm FIRED in my run too** ("COMMITTED deliverable == fresh
  build of HEAD"), so it is earned, not deferred -- and it also settles the freeze's
  build-reproducibility claim from the *forward* direction without my having to rebuild anything.
- **Registration delta is exactly +2.** `check_all.py`'s tuple registrations go 55 -> 57 between
  437564c and db70282, and the capture has 60 rows -- i.e. 58 + 2, as claimed.

The pre-fix side needs no separate build check: my "before" numbers were read from
`git show 437564c:deepdive_content_pipeline_rehearsal.html` -- the committed artifact itself -- and
they reproduced the freeze's before-column exactly, so the artifact of record is confirmed as the
measurement substrate either way.

---

## FINDING N1 -- NON-BLOCKING -- the hero's halo is still the retired indigo, and the report says it is not

**What the freeze claims** (P2-16 receipt table):

| | light | dark |
|---|---|---|
| hero fill + border + **shadow** | `#006B63` | `#13BAAC` |
| retired indigo `#534AB7`/`#9D93F0` still on the hero | **no** | **no** |

**What is on screen.** The hero carries `data-autofocus="1"` and `home-view.js:208` focuses it on paint.
I confirmed the state directly: at VR-capture time `document.activeElement === .hm-cta` and
`cta.matches(':focus-visible')` is `true`, in **both** builds. That activates

```
styles.css:53  button:focus-visible{outline:2px solid var(--acc);outline-offset:2px;
                 box-shadow:0 0 0 3px var(--acc-a15),0 0 16px -4px var(--acc-a20)}
```

whose specificity (0,1,1) beats `.hm-cta`'s (0,1,0) for `box-shadow`. So the wave's new
`box-shadow:0 10px 30px -12px var(--rm)` **is never the shadow that paints** in the shipped rest state.
`--acc` inside `.ix-panel` is the neutralised indigo, so the glow is `#534AB7`/`#9D93F0` at 15%/20%.

Measured, both builds, both themes:

```
                     focused (as shipped & photographed)                      blurred
before light   color(srgb .32549 .290196 .717647 /.15) 0 0 0 3px, ...   rgb(83,74,183)  0 10px 30px -12px
after  light   color(srgb .32549 .290196 .717647 /.15) 0 0 0 3px, ...   rgb(0,107,99)   0 10px 30px -12px
before dark    color(srgb .615686 .576471 .941176 /.15) ...             rgb(157,147,240) ...
after  dark    color(srgb .615686 .576471 .941176 /.15) ...             rgb(19,186,172)  ...
```

`0.32549*255 = 83, 0.290196*255 = 74, 0.717647*255 = 183` -> **#534AB7**. The focused value is
**identical before and after**; only the blurred (unobserved) value moved.

**It is visible in the committed baseline.** Scanline y=233 across the hero's left edge, read out of
`test/baselines/home-*-win32-chromium149.png`:

```
             x=144..146        x=147..149                      x=150+
light before  42,40,35    219,216,233 / 217,215,233 / 216,214,233    83,74,183
light after   42,40,35    219,216,233 / 217,215,233 / 216,214,233     0,107,99
dark  before 236,234,228   42,38,60 / 43,39,62 / 44,41,63          157,147,240
dark  after  236,234,228   42,38,60 / 43,39,62 / 44,41,63           19,186,172
```

x=144-146 is the `--ink` focus outline; **x=147-149 is the indigo glow, byte-identical across the
change**; x=150+ is the fill, which is the only thing that moved. A crop of the corner shows it plainly:
a lavender ring hugging a teal button. Before the wave the same ring was indigo-on-indigo and read as
part of the fill.

**Why it is NON-BLOCKING.** It is not a regression -- the glow is byte-for-byte what it always was, no
gate check covers it, and the substantive half of P2-16 (fill + border) is real and verified. But two
receipt rows in the freeze are false as written, and the wave's own colour change converted an invisible
incoherence into a visible one -- which is precisely the defect class P2-16 exists to remove ("the
largest, most saturated object on the first screen is the one whose colour means nothing").

**Cheapest honest resolutions**, in order of scope: (a) correct the two rows to say the *declaration*
moved and note the focus glow is out of scope; (b) additionally scope `button:focus-visible`'s glow to
`--rm` where `--rm` is bound; (c) leave it and record it beside the `.hm-brand` follow-up, which is the
same "an adjacent accent still means nothing" taste call already handed to the operator.

---

## FINDING N2 -- NON-BLOCKING -- `--rm` has no CSS-level fallback

`.hm-cta` binds **border, background and box-shadow** to `var(--rm)`, and `--rm` is defined **only** by
the inline attribute `roomStyle()` emits. Measured on the shipped build by removing that attribute:

```
light   background: rgba(0,0,0,0)   border: rgb(255,255,255)
dark    background: rgba(0,0,0,0)   border: rgb(26,22,34)
```

-- a transparent hero with a white border and `--on-slab` white text on a near-white page. Invisible.

Not reachable today: both emitters call `roomStyle()`, and `roomStyle()` always emits a binding (room or
`var(--acc)`). I class it NON-BLOCKING for that reason. It is worth recording because the precedent the
builder cites is weaker than the use: on `.hm-room`, `--rm` drives an inset stripe, so an unbound token
costs a decoration; on `.hm-cta` it costs the whole control.

**Hardening, one token:** `var(--rm,var(--acc))` at the three sites. That degrades to today's colour, and
because the fallback is a **token rather than a literal** it opens no hole in the new phantom-token guard
(`--rm` and `--acc` are both defined, so neither is reported).

---

## Hazards pre-cleared (named even though clean -- campaign convention)

1. **No VR baseline opens the index overlay.** All 16 specs are `hash: ''` or `#<topic>/<pane>`; the
   `room-*` five are `#<topic>/walk`. So `.ix-x` and the overlay-mounted `.ix-card`/`.ix-cross`/`.ix-g-cram`
   genuinely change face on a surface no baseline photographs. This is a **pre-existing** coverage
   boundary that the wave neither widened nor misclaimed, and `latent_arial` covers the surface
   functionally across all four surfaces.
2. **The mobile home is likewise unphotographed** -- both mobile baselines are `walk`. `.hm-cta` has a
   `<=919px` padding override, so the mobile home changed and is unphotographed. Same pre-existing boundary.
3. **`.ix-io` / `.ix-undo-btn` are not the Arial defect** and correctly do not appear in the watched red;
   their pixel sizes are preserved exactly through the token chain. Checked because a reader could
   mistake "12 rules, one defect" for a claim the watched red does not support.
4. **`roomStyle()` interpolates `topic.identity.group` into an HTML attribute unescaped.** All six group
   ids are fixed slugs and `panels.js:258/282` already do exactly this; no new exposure.
5. **`.hm-cta-k` still reads `var(--font-size-micro,11px)`** -- a *defined* token with a fallback, so
   legal by the guard's stated rule and by the brief. Noted only because P3-12 stripped the adjacent
   `,980px` fallbacks for consistency and left this one two lines away.
6. **`build_determinism` / the deliverable rebuild** were not re-run by hand; `build_integrity`'s
   "COMMITTED deliverable == fresh build of HEAD" arm covers it and fired in my own gate run, on a tree
   I verified clean before and after.
7. **The 198-vs-4 display-face discrepancy** the freeze declines to chase: I did not chase it either, and
   agree it is not load-bearing -- the home delta (0 -> 3) is measured by one instrument on both sides,
   and I reproduced it with a second, independent one.
8. **`base-styles.js:20`, the shadow-DOM twin of the display registry, is genuinely untouched** -- it is
   `.step-t,.dec-q,.num-h,...,.side-id h1,.stage-head .sh-name{font-family:var(--display)}` and the file
   is absent from the diff. The justification for leaving it (nothing on `#home` is in a shadow root)
   is independently confirmed by my census returning `shadowHostsUnderHome: []` from a walk that does
   descend into shadow roots.
9. **`styles.css:53` is byte-identical between 437564c and db70282** (sha of the single line matches), so
   finding N1 is definitively a pre-existing rule made newly visible, not a regression this wave
   introduced.

---

## What I did NOT verify, and why

Stated so the next reader does not mistake silence for coverage.

- **I did not run `npm run vr:update`.** It rewrites all 16 baselines, which the brief forbids. So the
  freeze's *intermediate* claim -- that `vr:update` returned `walk-dark` and `wb-light` with different
  bytes at zero changed pixels -- is not something I can confirm. What matters is the **outcome**, and
  that is verified at the object level: both files' blobs are identical to 437564c, and the manifest
  carries only the two home sha changes plus its timestamp. If the restore had been botched, that
  comparison would have caught it.
- **I did not rebuild at the base commit.** The freeze's "npm run build at 437564c reproduced the
  committed deliverable byte-for-byte" is unverified by me. It is also moot: I took every before-number
  from `git show 437564c:...`, the artifact of record itself, and they reproduced the freeze's
  before-column exactly.
- **I did not re-audit the 15 allowlisted latent-Arial components or the 3 allowlisted phantoms** beyond
  confirming each entry is live (no STALE) and carries a written reason. Whether W4 should absorb them
  is a scoping call, not a verification one.
