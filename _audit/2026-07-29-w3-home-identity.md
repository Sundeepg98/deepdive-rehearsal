# W3 -- "Home looks like the product" -- FREEZE REPORT

**Branch** `frontend/w3-home-identity` - **base** `437564c` - **built by** w13-builder - **2026-07-29**
**Source of record:** `_audit/2026-07-29-frontend-audit.md`, findings P2-14, P2-15, P2-16, P3-12.

Every number below comes from ONE instrument, `_audit/2026-07-29-w3-home-census.cjs`, run twice:
once against the **committed pre-fix deliverable** (`git show 437564c:deepdive_content_pipeline_rehearsal.html`)
and once against the built tree. Same boot path, same viewport (1280x800), same route (`hash ''`)
the VR harness uses, both themes.

---

## The scoreboard

| measure | before | after |
|---|---|---|
| text-bearing elements under `#home` in UA Arial | **147 / 210 (70.0%)** | **0 / 210 (0.0%)** |
| all `#home` descendants in UA Arial | 197 / 365 (54.0%) | 2 / 365 (0.5%) [1] |
| display-face elements on `#home` | **0** | **3** |
| `.hm-cta-t` size / face | 20px, `-apple-system` | **24px, Space Grotesk** |
| `.hm-cta-ar` size | 20px | 21px |
| `.hm-h` face (both heads) | `-apple-system` @12px | **Space Grotesk** @12px |
| hero fill, light | `rgb(83,74,183)` = `#534AB7` | **`rgb(0,107,99)` = `#006B63`** |
| hero fill, dark | `rgb(157,147,240)` = `#9D93F0` | **`rgb(19,186,172)` = `#13BAAC`** |
| hero ink-on-fill contrast, light | 6.93:1 | 6.40:1 |
| hero ink-on-fill contrast, dark | 6.66:1 | 7.32:1 |
| `#home` scrollHeight | 2890 | 3033 (+143, +4.9%) |
| `.hm-cta` / topic card / room card height | 105 / 89 / 119 | 111 / 97 / 119 |
| phantom tokens in the deliverable | 5 | 3 (all out of scope, ratcheted) |

[1] The two survivors are `<input>` elements -- the `#hm-skip-cb` checkbox and the hidden file
input for Import. Neither renders text and neither is a `<button>`, so neither is in P2-15's class
or the new guard's scope. Noted rather than fixed.

**Unchanged, deliberately, and verified unchanged:**

| | light | dark |
|---|---|---|
| six room cards `--acc` | `#534AB7` | `#9D93F0` |
| 46 topic cards `--acc` | `#534AB7` | `#9D93F0` |
| `.ix-cross` border (cross-topic drill) | `rgb(83,74,183)` | `rgb(157,147,240)` |
| `.hm-brand` colour | `rgb(150,61,134)` | `rgb(218,141,202)` |

---

## P2-14 -- the display face reaches the home screen

**Where:** `src/styles.css:916` (was `:914`).

```
-.side-id h1,.stage-head .sh-name,.sr-h{font-family:var(--display)}
+.side-id h1,.stage-head .sh-name,.sr-h,.hm-cta-t,.hm-h{font-family:var(--display)}
```

**Token verified on disk before use, as briefed.** The audit suggested `var(--display)`; the real
declaration is `:root{--display:'Space Grotesk',-apple-system,...}` at `styles.css:914`, and the
canonical consumer pattern is the grouped selector on the very next line -- the app's light-DOM
registry of "what wears the display face". `.hm-cta-t` and `.hm-h` were added to that registry
rather than given their own scattered declarations. (`base-styles.js:20` is the shadow-DOM twin of
the same list; untouched, since nothing on `#home` is in a shadow root.)

**Receipt:** display-face count on `#home` **0 -> 3** (`span.hm-cta-t`, and both `h2.hm-h`).

A note on the audit's "198 on a topic route" comparison figure: the census's own walk of the same
route (all 18 roots, visible elements only, one pane mounted) returns **4**, before and after. The
two numbers are different measurements -- the audit's traversal reached content this one does not
mount -- and the discrepancy was not chased, because it is not what this wave changes. The
load-bearing number is the **home** delta, 0 -> 3, taken by one instrument on both sides.

**Restraint, on purpose:** `.sh-name` also carries `letter-spacing:-.5px` at this exact size.
That was NOT copied onto `.hm-cta-t`. Adding tracking is a second, independent judgement, and
P3-10 (the audit's "one role rendered 29 ways" tracking finding) is explicitly parked. Flagged
here so the next pass can decide it deliberately rather than inherit it by accident.

---

## P2-15 -- the 70% Arial is gone

**Where:** `src/styles.css`, twelve rules. Ten take `font:inherit`; two had a bespoke stack folded
into the body stack.

The `font` shorthand RESETS `font-size`, `font-weight` and `line-height`, so `font:inherit` was
placed **before** every existing font declaration in each rule -- the pattern `.hm-act` already
uses. Verified mechanically: no rule in `styles.css` now has a `font-size`, `font-weight` or
`line-height` declaration ahead of a `font:inherit` in the same block.

| rule | change | on home? |
|---|---|---|
| `.ix-card` (x46) | `font:inherit` | yes -- the 46 topic cards |
| `.ix-cross` | `font:inherit` | yes -- cross-topic drill |
| `.ix-g-cram` (x6) | `font:inherit` | yes -- the room pills |
| `.ix-io` | `font:var(--font-weight-semibold) 11px -apple-system,system-ui,sans-serif` -> `font:inherit;font-size:var(--font-size-micro);font-weight:var(--font-weight-semibold)` | yes -- footer Export/Import |
| `.ix-x` | `font:inherit` | index overlay |
| `.ix-c-reset`, `.ix-goal-b`, `.ix-due-b`, `.ix-weak-b`, `.ix-home-btn`, `.ix-reset` | `font:inherit` | home, but only once engaged |
| `.ix-undo-btn` | bespoke stack folded, size/weight put on the scale | home, after a card reset |

**Why more than the four the brief named.** The brief's four are the ones a COLD home mounts. Six
more `.ix-*` controls carry the identical defect and simply do not exist until the user has
progress (telemetry chips, the goal stepper, reset). Leaving them would have meant the guard goes
green on a cold boot and red the first time someone with a week of history opens the app. Every
one of them is invisible in the cold home baseline, so they add **zero** pixels to the VR diff --
this is completeness at no VR cost, not scope creep.

`.ix-undo-btn` was folded alongside `.ix-io` for the same reason: identical defect, adjacent line,
same file, and it appears on home. `.xd-again` has the same bespoke stack but lives on the
cross-drill panel, not home; it is left for whoever owns that surface.

**Receipt:** 147 -> **0** text-bearing Arial elements under `#home`, both themes. The
`app stack measures 409.96px / Arial 420.23px` divergence the audit measured is now moot on this
surface: nothing here renders in Arial.

**Geometry, stated plainly because it is the one non-obvious consequence.** `font:inherit` also
inherits the body line-height (1.5) where the UA gave buttons `normal`. Topic cards go 89 -> 97px,
the hero 105 -> 111px, and the home page 2890 -> 3033px (+4.9%). Room cards are unchanged at 119px
(they already declared `font:inherit`). This is the app's own text rhythm arriving on cards that
were opted out of it; it reads as slightly calmer, not louder.

---

## P2-16 -- the hero wears its destination's room

**Where:** `src/scripts/app/home-view.js` (new `roomStyle()`, applied in both `ctaHtml()`
branches) and `src/styles.css` `.hm-cta` (`var(--acc)` -> `var(--rm)`, three sites).

**The neutralisation rule is untouched.** `.ix-panel,.xd-panel,#_search-overlay,.tn-menu` still
re-bind the neutral exactly as before, and the table above proves it: room cards, topic cards and
`.ix-cross` all compute the same values they computed pre-fix, in both themes.

### The deviation from the brief, and the measurement that forced it

The brief specified re-scoping the neutral bind so `.hm-cta` **inherits** its topic's room ink.
Measured on disk, inheriting does not produce that:

```
root data-group          architecture-apis      <- src/index.html:2, HARD-CODED for first paint
root --acc (light)       #963D86                <- architecture-apis
hero destination topic   event-driven           <- TopicRegistry.ids()[0], the Start CTA's target
its room                 messaging-events (#006B63)
```

`applyIdentity()` **deliberately does not run at boot** (`topic-protocol.js`, and the registry's
own comment says so), so on the home route the document accent is a first-paint constant, not a
current topic. Re-scoping alone would have painted the hero `#963D86` -- architecture-apis magenta
on a button that says "Start / Event-Driven Backbone", a messaging-events topic. That is a
different meaningless colour, and it would have failed the brief's own acceptance test
("light hero = destination room ink").

So the mechanism is `--rm`, which is **the codebase's own per-element room binding**, emitted the
same way `roomsHtml()` and the index's group sections already emit it:

```js
function roomStyle(topic) {
  var g = (topic && topic.identity && topic.identity.group) || '';
  return ' style="--rm:' + (g ? 'var(--room-' + g + ')' : 'var(--acc)') + '"';
}
```

A topic with no group degrades to today's colour rather than to an invalid `var()`. No new
`var(--x,<literal>)` shape was introduced, so the new phantom-token guard has no hole drilled
through it.

This satisfies the brief's stated goal and its verification criteria; only the mechanism differs,
and it differs *because* the disk contradicted the mechanism. Flagged prominently here and in the
commit message so the reviewer can overrule it cheaply -- the change is three CSS values and one
helper.

**Receipt, both themes:**

| | light | dark |
|---|---|---|
| hero fill + border + shadow | `#006B63` | `#13BAAC` |
| messaging-events room ink | `#006B63` | `#13BAAC` |
| match | **yes** | **yes** |
| retired indigo `#534AB7` / `#9D93F0` still on the hero | no | no |

The six room inks for reference -- light `#006B63 #315BB4 #924E00 #694EB0 #963D86 #A73A57`,
dark `#13BAAC #7DA6F3 #E19556 #AD9AEE #DA8DCA #EE8CA4`. The dark hero matches room 1 exactly;
pre-fix it matched none of the six.

**Ink contract unchanged, and checked across ALL SIX rooms, not just the one on screen.**
`--on-slab` still supplies the ink (`#fff` light, `#1A1622` dark -- fixed per theme, not
room-dependent). Measured on the rendered hero: **6.40:1 light** (was 6.93:1) and **7.32:1 dark**
(was 6.66:1). Since any of the six rooms can land here, all twelve were computed from the palette
hexes:

| room | light ink | vs `#fff` | dark ink | vs `#1A1622` |
|---|---|---|---|---|
| messaging-events | `#006B63` | 6.40:1 | `#13BAAC` | 7.32:1 |
| data-storage | `#315BB4` | 6.39:1 | `#7DA6F3` | 7.29:1 |
| reliability-observability | `#924E00` | 6.34:1 | `#E19556` | 7.31:1 |
| platform-infra | `#694EB0` | 6.33:1 | `#AD9AEE` | 7.31:1 |
| architecture-apis | `#963D86` | 6.35:1 | `#DA8DCA` | 7.31:1 |
| security-tenancy | `#A73A57` | **6.20:1** | `#EE8CA4` | **7.55:1** |

Range **6.20-6.40** light, **7.29-7.55** dark; the AA floor is 4.5 and the worst case clears it by
38%. The retired indigo was 6.93:1 light / 6.66:1 dark, so **dark improves in every room** and
light gives up at most 0.73 while gaining a colour that means something. The numbers barely move
because the fill went from one ink-tier colour to another -- `--acc` was already `--topic-ink`,
never `--topic-solid`. (`room_contrast.py` owns the token side of this contract and passes.)

An honest note on process: the first version of the CSS comment claimed "6.3-6.4:1" from a
hand-computed spot check. Computing all six showed security-tenancy at **6.20**, below that stated
floor. The comment now carries the real range. A comment asserting a property the code does not
have is the exact failure mode this repo's own gate comments keep describing.

**`.hm-brand` behaviour is unchanged as briefed** (`rgb(150,61,134)` light, both before and after).
One honest consequence: the brand wears that same hard-coded boot constant, so on a cold home it
is now magenta above a teal hero. Both are real room colours and only one of them means anything.
The audit filed this as "two unrelated accents ~130px apart"; this wave fixed the half it was
scoped to fix. **Recommended follow-up:** either bind `.hm-brand` to the same destination room, or
give it a deliberately roomless treatment. That is a taste call, and it is the operator's.

---

## P3-12 -- the phantom tokens

**`--font-size-h3`** -- 0 definitions, 2 use sites, both on the hero.
`.hm-cta-t` -> `var(--font-size-display)` (24px, the rung `.sh-name` and `.cmp-topic` already
wear -- so P2-14's face change and P3-12's size change are the same edit, as the audit predicted).
`.hm-cta-ar` -> `var(--font-size-heading)` (21px).

**`--space-980`** -- 0 definitions, **9** use sites (the audit said 5; the real count is 9, all in
the home block). Added to `design-tokens/tokens.json` as `space.980 = 980px` and **generated** --
`src/tokens.generated.css` is gitignored and produced by `style-dictionary` + `postprocess-tokens.mjs`;
it was never hand-edited. The nine call sites dropped their now-redundant `,980px` fallbacks to
match `--space-830`'s existing style. Zero pixel change by construction: 980px via a fallback and
980px via a token are the same 980px.

Placement rationale: `830 / 760 / 680 / 660 / 620 / 600 / 560` are already in the space scale and
already used as max-widths (`.stage .pane`, `.stage-head`, `.mcomp`, `.ix-panel`, `.xd-panel`), so
980 goes where its siblings live. Inventing a `--width-*` layer would be doing P3-11's parked work.

**Build reproducibility spot-checked before any edit:** `npm run build` at the base commit
reproduced the committed deliverable **byte-for-byte** (`git status` clean afterwards), so the
pre-fix measurements below were taken against the artifact of record, not a re-derivation of it.
The gate's own `build_determinism` check covers the post-fix tree in the run captured below.

---

## The two new gate guards

Both were run against **pre-fix code first**, with an empty allowlist, and the red captured
verbatim. Full captures: `_audit/w3-home-before-after/watched-red-latent-arial.txt` and
`_audit/w3-home-before-after/watched-red-phantom-tokens.txt`.

### G-A `test/latent_arial.cjs` -- registered in `check_all.py` (browser checks)

Every `<button>` in the app, across four surfaces (home, a topic route, the index overlay, the
search overlay), walking document + all 18 roots.

**It does not hardcode "Arial."** It plants a bare `<button>` in the live document and reads what
the UA gives it, so the reference is whatever the platform's control font is -- the same question
is asked on the ubuntu runner as on this box. Three controls run on every invocation and ABORT
rather than pass blind:

- **A** a planted bare button must be detected (else the detector is blind)
- **B** a planted `font:inherit` button must not be (else it flags everything)
- **C** the UA font must differ from the app stack (else the check cannot see the defect at all)

```
WATCHED RED (pre-fix, empty allowlist)   19 components, exit 1
    ix-card 46 | ix-cross 1 | ix-g-cram 6 | ix-x 1        <- W3's scope
    tn-item 46 | crambtn 14 | mock-x 7 | tn-step 3 | cmp-rel 3 | pomodoro-btn 2
    cmp-fold | cmp-reopen | nd-m | scrolltop | tools-fab | tn-trigger
    #_focus-exit | #_focus-toggle | (unclassed)@body      <- 15 out of scope

GREEN (post-fix, empty allowlist)        15 components, exit 1
    -- the four in scope are gone; nothing else moved

PASS (post-fix, committed allowlist)     15 allowlisted, 0 NEW, 0 STALE, exit 0
```

**Why a ratchet and not a big-bang fix.** The other 15 are the sidebar / topic-nav / cram /
companion families -- W4's surfaces by the audit's own wave plan, and present in seven committed VR
baselines. Re-facing them here would have blown this wave's zero-churn contract and merged an
unreviewed sidebar rebaseline into a home wave. Each is allowlisted **by name with a reason** in
`test/latent_arial_debt.json`, and the check fails on both a NEW offender and a STALE entry, so the
list can only shrink. `.crambtn` (14 visible buttons on every topic route) is the largest remaining
surface and is called out as such in the file.

### G-B `test/phantom_tokens.py` -- registered in `check_all.py` (static checks)

`var(--x)` where `--x` is defined nowhere. Generous about what counts as defined -- any `--x:`
declaration, an `@property` registration, an inline style attribute written by JS, or a runtime
`setProperty('--x', v)` -- because in all four the token genuinely exists and the fallback is doing
the job fallbacks are for.

```
WATCHED RED (pre-fix)   5 phantoms, exit 1
    --font-size-h3  2 sites   <- P3-12
    --space-980     9 sites   <- P3-12
    --rx --ry --tx-dim        <- 3 out of scope

PASS (post-fix, committed allowlist)   3 allowlisted, 0 NEW, 0 STALE, exit 0
```

**Three parsing traps were hit and fixed while building it** -- worth recording, because each one
would have made the guard lie:

1. `'var(--room-' + g.id + ')'` in JS is not a reference to a token called `--room-`. A name is
   only counted when the `var()` actually closes.
2. `setProperty('--fb', ...)` is a definition with no colon. Without this, `--fb`, `--fl` and
   `--read-zoom` were reported as phantoms when they are the *correct* use of a fallback.
3. **Prose is not code.** `styles.css` is inlined verbatim into the deliverable, so the comment
   this wave added explaining "`--font-size-h3` used to say `var(--font-size-h3,20px)`" scanned as
   a live reference -- the guard reported the very fix it had just verified. Comments are now
   stripped on both sides of the ledger, and the self-test covers it. (`visual_regression.cjs`
   carries the same scar from the other direction: it once read a class name in a comment as
   markup.)

Its self-test runs a synthetic fixture with two planted phantoms and six legitimate shapes and
aborts unless it flags exactly the two.

**The three allowlisted phantoms are real and named** in `test/phantom_tokens_debt.json`:
`--rx`/`--ry` are the cursor coordinates of the radial spotlight whose setter was deleted with
`card-spotlight.js` (no setter exists anywhere in `src/`, so the gradient is permanently centred on
its fallback) and `--tx-dim` is the WebGL pane's empty-state grey. Fixing `--rx`/`--ry` means
editing a global `button::after` rule, and `--tx-dim` changes a surface VR cannot photograph;
neither belongs in a home-identity wave.

---

## Visual regression

**`home-light` and `home-dark` were rebaselined on purpose.** Measured against the base-commit
baselines: **210,204 px** and **211,249 px** changed, in a 992x618 box at (144,178) -- the home
panel, starting below the header, which is `.hm-brand` staying put.

**The other 14 measured 0 changed pixels.** Not "within budget" -- zero, every one:

```
walk-light 0  walk-dark 0  drill-light 0  drill-dark 0  sys-light 0  num-light 0  wb-light 0
room-data-storage 0  room-reliability-observability 0  room-platform-infra 0
room-architecture-apis 0  room-security-tenancy 0  m-walk-light 0  m-walk-dark 0
```

**One thing worth knowing about the rebaseline.** `npm run vr:update` regenerates all 16 files, and
`walk-dark` and `wb-light` came back with different BYTES despite having measured 0 changed pixels
-- sub-tolerance antialiasing jitter, the same class the harness header documents as "worst ever
observed, 9px at 6/255". Committing those would have baked today's noise into the reference for two
baselines this wave never touched, so **both files and their manifest sha entries were restored**;
only the home pair and the manifest are in the diff. A confirming verify run afterwards passed
16/16 -- and reported 4px on `walk-light`, a file nobody rewrote, which is that same jitter seen
from the other side.

**Before / after, for review:** `_audit/w3-home-before-after/`

| | |
|---|---|
| `before-light.png` / `before-dark.png` | the base-commit VR baselines, byte-verified: a full 16/16 VR run at `437564c` reported 0 changed px, so these ARE the pre-fix render of record, not a re-derivation |
| `after-light.png` / `after-dark.png` | the newly committed baselines, same protocol, same viewport, same cold-boot state |
| `before-library-light.png` / `after-library-light.png` | **supplementary, and the pair worth looking at hardest.** The VR baselines are VIEWPORT shots and the home page is 3033px tall, so the four above contain the hero, the room cards and the cross-topic drill -- and not one topic card. The 46 topic cards ARE P2-15's headline, so this pair scrolls to the library. Captured by `capture-library-pair.cjs` (committed beside them), anchored on the "All topics" section rather than on a scroll Y, because the two pages are different heights and a shared Y would frame different content |

The capture script asserts its own framing and throws if the scroll does not land -- its first
version shot the post-fix page at scrollY 0 and produced a "library" pair in which one side was
the hero. Caught by looking at the images, which is the only reason a review artifact is worth
making.

**On the intent note in the brief:** Space Grotesk at 24px is quieter than most apps' 32px
system-bold, and nothing in this wave adds colour, weight or motion. The hero moved from a
saturated indigo to a room ink of the same tier; the section heads changed face at the same 12px
and the same weight; the only thing that grew is line-height, and it grew toward the rhythm the
rest of the app already uses. The result reads calmer than the pre-fix home, not louder.

---

## Gate

Captured verbatim: `_audit/2026-07-29-w3-home-gate.txt`. Run on the **committed** tree
(`146b626`), after the commit, so `build_integrity` had no untracked files to defer on.

GATE_SUMMARY_PLACEHOLDER

---

## Left for someone else, deliberately

1. **15 latent-Arial components** (`test/latent_arial_debt.json`) -- sidebar / topic-nav / cram /
   companion. W4's surfaces; needs its own reviewed rebaseline of ~7 baselines. `.crambtn` is the
   big one at 14 visible buttons per topic route.
2. **3 phantom tokens** (`test/phantom_tokens_debt.json`) -- `--rx`/`--ry` (dead spotlight setter,
   in a global `button::after` rule) and `--tx-dim` (viz pane empty state, unphotographable by VR).
3. **`.hm-brand`'s colour on the home route** -- it wears `index.html:2`'s hard-coded boot constant,
   which means nothing on a topic-less route. Out of scope by the brief; now visually adjacent to a
   hero that does mean something. Taste call, operator's.
4. **`.hm-cta-t` tracking** -- `.sh-name` pairs this exact size and face with `letter-spacing:-.5px`.
   Not copied; P3-10 is parked.
5. **`.xd-again`'s bespoke font stack** -- same defect as `.ix-io`, on the cross-drill panel.
