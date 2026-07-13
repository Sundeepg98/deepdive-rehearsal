# Keyboard-only operation — audit

**Lens:** unplug the mouse. Can a keyboard-only user actually use this product end to end?
**Build:** `dist/index.html` @ `4318509`, Playwright/Chromium, 1440×960, light+dark, all 6 rooms.
**Scripts:** `_audit/2026-07-13-a11y/kb-*.mjs` · **Shots:** `_audit/2026-07-13-a11y/shots/keyboard/`
**Read-only:** nothing in the repo was edited, built, or committed.

---

## 0. Instrument first — because the last a11y check here certified a blank page

The headline check in this lens is *"is there a visible focus indicator on every control?"*. That
question has an obvious wrong instrument (`getComputedStyle().outline`) which cannot fail: an
`outline:2px solid var(--acc)` reads perfectly in the CSSOM even when `--acc` resolves to the
element's own background, and a higher-specificity `:focus{outline:none}` silently beats
`:focus-visible{outline:2px}` while a stylesheet grep still reports "styled".

So focus visibility here is **measured in painted pixels**: screenshot the control's box padded by
12px (rings and glows paint *outside* the border box), unfocused; screenshot it focused; count
pixels that changed. Two refinements were forced by the app itself:

* **a per-element noise floor** — two baseline shots before focusing, so idle animation churn can
  never be mistaken for a focus ring;
* **scroll discipline** — `scrollIntoView` *before* the baseline, because focusing scrolls, and a
  before/after pair taken at different scroll offsets makes 100% of pixels "change" and every
  control falsely pass.

### The negative control — and my three failed attempts at it

**A check I have not seen fail is decoration.** Getting this one to fail took four tries, and the
three failures are worth recording because each is a trap that would have produced a green check:

| attempt | what I injected on `:focus` | why it did **not** go red |
|---|---|---|
| 1 | `background:inherit !important` | `inherit` is not "no change" — it is the *parent's* value, which differs from the element's own. I **painted a new change** on focus. The differ correctly saw it; the control "passed" for a real reason. |
| 2 | `box-shadow:none !important` | `#searchopen` carries a resting drop-shadow and the active `.seg` button a resting glow. Zeroing box-shadow **on focus deletes styling the element has at rest** — again a visible change. |
| 3 | pin properties to resting values | I read the "resting" values **while the element was still focused** (it was the last one measured and never blurred), so I pinned the ring **on**. Signal unchanged, exactly. |

The rule those failures teach: **a negative control must make the focused state pixel-identical to
the resting state — it must PIN properties to their resting values, never zero them.**

Final design (`kb-10-paired.mjs`): **every control is measured twice** — as shipped, and with every
ring-capable property pinned to its resting value (a control that provably has no focus indicator).
The negative control is not a ceremony at the end; it runs against all 48 controls, and pass 2 *is*
the deliberate breakage. Pinning is done with **inline `!important`**, not a stylesheet, because
`addStyleTag` cannot reach inside a shadow root — and 12 of this app's controls live in one. A
light-DOM-only negative control would silently never break them.

```
controls with an indicator in pass 1 : 47
of those, signal COLLAPSED when the ring was removed : 47 / 47
median signal   as shipped : 1842 px
median signal  ring removed:   16 px      (a 115x margin)

VALID: the check goes red on demand.
```

Shots: `negctl-01-ring-present.png`, `negctl-02-ring-killed.png`, `negctl-03-synthetic-pair.png`.
Everything below is reported against that validated instrument.

---

## 1. Findings

### P0-1 — Enter and Space are hijacked app-wide while the Probe Drill is showing
`src/scripts/app/shell.js:104` · WCAG 2.1.1 Keyboard (A) · `kb-12`, `kb-13`

```js
} else if (current === 'drill') {
    const advBtn = r.getElementById('adv');
    if ((event.key === ' ' || event.key === 'Enter') && advBtn) { event.preventDefault(); advBtn.click(); }
```

This is a **document-level** listener gated on the **active pane**, never on where focus actually
is. While the drill pane is showing, *every* Enter and *every* Space anywhere in the document is
`preventDefault()`-ed and redirected into the drill's advance button.

Measured, with focus parked on the sidebar theme toggle:

| drill stage | `#adv` exists | Enter → what actually fired | theme toggled? |
|---|---|---|---|
| 0 (Reveal answer) | yes | `["adv"]` | **NO — stolen** |
| 1 (Interviewer pushes further) | yes | `["adv"]` | **NO — stolen** |
| 2 (Interviewer pushes further) | yes | `["adv"]` | **NO — stolen** |
| 3 (grading) | **no** | `["themetog"]` | yes |

It goes dormant at the grading stage only because `#adv` and the judge row are mutually exclusive
(`drill/logic.js:319`) — which is also why a casual test of the grade buttons misses this entirely.

**The consequence is a functional trap.** With the drill showing, I tabbed 27 times to the
"Whiteboard" pane button and pressed Enter:

```
pressed Enter -> clicks fired: ["adv"]
active pane now: drill   *** STILL ON THE DRILL — the pane switcher did not fire ***
pressed Space -> clicks fired: ["adv"]   active pane: drill
pressed "e"   -> active pane: wb   (the ONLY keyboard way out)
```

A keyboard-only user who lands on the drill **cannot leave it using the visible pane switcher**, and
cannot activate *any* other control in the app — search, cram, notes, theme, topic switcher — because
Tab-then-Enter, the universal keyboard idiom, is globally broken for as long as that pane is up. The
sole escape is knowing a letter shortcut. Shot: `hijack-01-cannot-leave-drill.png`.

*Fix:* gate the intercept on focus location — bail out if `document.activeElement` is not the body /
is a control that handles its own activation.

---

### P0-2 — Global shortcuts fire while you are typing in the Numbers pane
`shell.js:78-79`, `focus-mode.js:61-63` · `kb-17`

The typing guard is:

```js
const activeTag = (event.target.tagName || '').toLowerCase();
if (activeTag === 'input' || activeTag === 'textarea') return;
```

The Numbers pane's four estimation fields live inside `deep-numbers`' **shadow root**. A listener on
`document` sees the event **retargeted to the host**, so the guard tests the wrong element:

```
keydown as seen by a listener on `document` while typing in #n_obj:
   event.target.tagName      = "deep-numbers"   <-- what the guard tests
   composedPath()[0].tagName = "input"          <-- what it actually is
```

They are in the **main app**, not an overlay, so shell.js's "bail out while a dialog is open" guard
does not cover them either. **14 of 17 keys leak** while typing:

| key | effect while typing in a number field |
|---|---|
| `q w e r t y i o v` | **switches pane** (9 of them) — navigates off Numbers mid-entry |
| `d` | cycles spacing density |
| `f` | toggles focus mode |
| `g` | **starts the guided tour** |
| `[` | **changes the topic** (content-pipeline → rate-limiting) *and* switches pane |

The realistic failure, since these are `type=number` fields where `e` is legal scientific notation:

```
typed "1e6":
   field now contains : (input gone — pane rebuilt)
   active pane        : wb   <-- the "e" navigated the user OFF the Numbers pane mid-entry
```

Note the three text fields in the *overlays* (search / index / notes) are clean — but for the wrong
reason: they are clean because shell.js bails out entirely while an overlay is open. **The tagName
guard itself is never exercised there**, so it has been silently broken for every shadow-DOM field
and will break the next one added. Shot: `numleak-01-typed-1e6.png`.

*Fix:* test `event.composedPath()[0]` (or `deepActiveElement()`), not `event.target`.

---

### P1-3 — Focus order does not follow visual order: the pane switcher is 25 Tabs deep
`styles.css:412` + `:420` · WCAG 2.4.3 Focus Order (A) · `kb-03c`, `kb-04`

```css
.sidebar .seg     { order:1; ... }   /* the 10-pane switcher — the app's primary navigation */
.sidebar .mockbar { order:2; ... }   /* the 13 tool buttons */
```

The DOM has `.mockbar` **before** `.seg` (`index.html:44` vs `:63`); flex `order` swaps them
**visually only**. Focus order follows DOM order — this is the textbook 2.4.3 violation.

```
DOM idx | order | painted top..bottom | class
    5   |    2  |   960..1455         | mockbar     <- painted BELOW, tabbed FIRST
    6   |    1  |   526..946          | seg         <- painted ABOVE, tabbed LAST

PAINTED (visual): tools-bd -> side-id -> mockcta -> textzoom -> pomodoro -> seg -> mockbar
DOM (= TAB order): side-id -> mockcta -> tools-bd -> textzoom -> pomodoro -> mockbar -> seg
visual order == tab order? NO

Tab presses to reach the FIRST pane button: 25   (of 48 total stops)
Tab presses to reach the LAST pane button:  33
```

A keyboard user tabbing down the sidebar sees focus jump *past* the visible pane switcher, walk all
13 tool buttons at the bottom, then jump **back up** to the switcher. It is the app's primary
navigation and it is the second-to-last thing reachable. Shot: `order-01-seg-reached-at-stop25.png`.

*Fix:* put `.seg` before `.mockbar` in the DOM and delete both `order` declarations. One line.

---

### P1-4 — `#scrolltop` is focusable while invisible: focus vanishes for one Tab stop
`styles.css:794` · WCAG 2.4.7 Focus Visible (A) · `kb-05`, `kb-10`, `kb-11`

```css
.scrolltop      { opacity:0; pointer-events:none; ... }   /* no visibility, no display:none, no tabindex=-1 */
.scrolltop.show { opacity:1; pointer-events:auto; }
```

`opacity:0` + `pointer-events:none` removes the button from the **mouse** but not from the
**keyboard**. It is the one control in the app my validated instrument scores **INVISIBLE**:

```
at top : tabbable=true  opacity=0  pointer-events=none  -> focus ring painted: 0 px
reached by pressing Tab 49 times from the top of the page: YES
while focused: {"focused":"scrolltop","opacity":"0","matchesFocusVisible":true}
```

The browser considers it focused, matches `:focus-visible`, and paints an outline it has already
told the compositor is 0% opaque. And it is not a transient state: on the default pane the document
only scrolls ~70px against a 400px reveal threshold, so **it never becomes visible at all** — a
permanent phantom stop at the end of every Tab cycle. Shot:
`scrolltop-01-focused-but-invisible.png`.

*Fix:* add `visibility:hidden` to `.scrolltop` and `visibility:visible` to `.scrolltop.show`.

---

### P2-5 — The app's own `?` panel documents the drill grades wrongly
`keyboard-overlay.js` (KBD_HTML) vs `drill/logic.js:335-337` · `kb-19`

The `?` panel — a keyboard user's only map of this app — says:

> **1** **2** — In the drill, score the probe — **Solid or Revisit**

What the drill actually renders and binds:

```
buttons actually rendered : ["✗ Missed [1]", "~ Shaky [2]", "✓ Solid [3]"]
  key "1" -> #jm (Missed)
  key "2" -> #js (Shaky)
  key "3" -> #jg (Solid)
```

Three keys, not two; and the labels are Missed/Shaky/Solid, not "Solid or Revisit". Both the key
count and the vocabulary are wrong.

---

### P2-6 — Bound but undocumented: `V`, `F`, `Ctrl+P`, and a bare `p`
`kb-19`, `kb-21`

`V` (Visual trainer pane) and `F` (focus mode) are live and absent from the `?` panel — `V` is
missing even though the panel enumerates Q–O as "the whole top row". `Ctrl+P` is rerouted to the
printable Q&A (`print-qa.js:59`), and a bare **`p` prints whenever the cram sheet is open**
(`cram-sheet.js:16`) — neither is documented.

---

### P2-7 — Shortcut conflict: one Ctrl+P fires two print paths
`print-qa.js:59` + `cram-sheet.js:16` · `kb-21`

Both are document-level `keydown` listeners; neither calls `stopPropagation`. `cram-sheet`'s guard
is `event.key.toLowerCase() === 'p'`, which is **true for Ctrl+P**. With the cram sheet open:

```
window.print() calls: 1 -> 2   (cram-sheet.js handler)
popup windows      : 0 -> 1   (print-qa.js handler)
*** ONE keypress fired BOTH print paths — a popup Q&A window AND a raw print of the cram sheet ***
```

---

## 2. What is genuinely good (measured, not assumed)

These are passes from the instrument that **provably goes red** (§0) — not absence of evidence.

**The focus ring survives all six rooms, in both themes.** The ring is `2px solid var(--acc)` and
`--acc` is re-aliased per room, so this was the obvious place for the new tint system to break. It
does not: 6 rooms × 2 themes × 4 control types = **48 measurements, 0 rings below the WCAG 2.4.11
3:1 threshold, 0 rings painting nothing**, weakest 5.4:1 (security-tenancy / light), best 7.6:1.
Shots: `room-<group>-<theme>.png` (12).

**Overlays are correctly built — 10/10, no defects.** Every one opens by keyboard, moves focus
inside, traps Tab (0 escapes in 25 presses), closes on Escape, **and restores focus to the trigger**:
Mock run, Topic index, Search, Notes, Cram sheet, Session progress, Mixed fire, Game plan, Scope,
Keyboard shortcuts. Focus restoration is the thing people forget, and it is right in all ten.

**No traps, no unreachable controls, no tabindex abuse.** Tab cycles cleanly through **48 stops** and
returns to the start; all 48 enumerated focusables are reached; **0 controls are mouse-operable but
not keyboard-operable**; **0 elements carry a positive tabindex**; tab order follows DOM order.

**All 18 documented shortcuts fire** (Q–O, ←/→, Space/Enter, `/`, `\`, `[`/`]`, `G`, `D`, `?`).
The defects are in what the docs *omit* and *misstate* (P2-5, P2-6), not in dead keys.

---

## 3. Findings I generated, chased, and withdrew

Reported because a lens that ships its own artifacts as findings is worse than no lens.

| claim | why it was wrong |
|---|---|
| "`#wprev` (← Prev) is mouse-reachable but not keyboard-reachable" | It is **disabled** at walkthrough step 1 (`walkthrough/logic.js:182`). My clickable-enumeration counted `onclick`-bearing elements without excluding `disabled`. Advancing one step makes it tabbable. Withdrawn. |
| "Tab #1 lands in a closed, invisible `#_index-overlay` — ghost tab stops" | Measured it: the index overlay is genuinely `open`, `display:flex`, opacity 1 — it is the app's **landing topic-picker**. The other 7 overlays are cleanly `display:none` (0 tabbables). Withdrawn. |
| "2 backward jumps in tab order" | I compared `getBoundingClientRect().y` **across tab stops**, but focusing scrolls the sidebar, so those y's were measured at different scroll offsets. Re-measured scroll-invariantly: **1** real inversion (P1-3), not 2. |
| "The Search overlay does not open on Enter" | My detector required a `.open` class the search overlay never sets (it uses `display:flex` + an `isOpen()` API). It opens fine on Enter/Space/`/`/click, traps, and restores. Withdrawn. |
| "`q` does nothing" | My test's reset parked on the `walk` pane, and `q` navigates *to* walk. No-op by construction. Works from any other pane. Withdrawn. |
| "`Enter` does not advance the drill" | I detected advance by the button's **label**, which reads "↳ Interviewer pushes further" for every stage 1..n-1. Re-measured by revealed content: Enter advances (blocks 0→1→3 → judge row). Withdrawn. |
| "2 `<summary>` elements have a WEAK focus ring" | Flagged by my strict 2.4.11 *area* heuristic (1384px vs a 1432px threshold on a very wide, short control). Inspected the pixels: the ring is a clear, full-width outline at **18.4:1** contrast. **Not a defect.** |

---

## 4. Summary

| # | severity | finding | WCAG |
|---|---|---|---|
| 1 | **P0** | Enter/Space hijacked app-wide while the drill pane is up; cannot leave the pane by keyboard | 2.1.1 (A) |
| 2 | **P0** | Global shortcuts fire while typing in the Numbers pane (shadow-DOM retargeting defeats the guard) | — |
| 3 | P1 | Pane switcher paints 2nd from top, tabs 25th of 48 (flex `order`) | 2.4.3 (A) |
| 4 | P1 | `#scrolltop` focusable while `opacity:0` — 0 painted pixels on focus | 2.4.7 (A) |
| 5 | P2 | `?` panel documents 2 grade keys / wrong labels; app binds 3 | — |
| 6 | P2 | `V`, `F`, `Ctrl+P`, bare `p` bound but undocumented | — |
| 7 | P2 | Ctrl+P with cram open fires both print paths | — |

Both P0s share one root cause: **document-level keyboard handlers that reason about the active
*pane* or the retargeted `event.target`, instead of about where focus actually is.** Fix that idea
once — bail on focus location, and read `composedPath()[0]` — and both disappear.

The parts that were *designed* for keyboard use (overlay focus management, the ring, the room tints)
are genuinely solid. The failures are all in **global handlers reaching over the top of focus.**
