<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (the-complaint lens, round 3), 2026-08-01, against appeal/home-instrument @ f08c4ac.
     Preserved unedited as the record round 4 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-4 addendum). -->

# W1 — ROUND 3 JUDGE: THE COMPLAINT

**Subject:** the BUILT home of Deep Rehearsal, `appeal/home-instrument` @ **`f08c4ac`**
("the home says only what the record can support"), worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i` — clean at HEAD before and after
this judgment (`git status` empty at both ends; the teeth-test ran against scratch mirrors of the
built file, never the repo).

**Lens:** the-complaint. *"the frontend is not looking like an application… the visual design is
not appealing."*

**Judged against:** the ROUND-3 ADDENDUM in `_audit/2026-07-31-appeal-home-freeze.md` (from line
300) and my own round-2 record at
`D:\claude-workspace\appeal-directions\_ia\w1-r2-judge-the-complaint.md`.

---

## VERDICT: **FIXABLE**

The headline class is genuinely dead. `Altitude.compute()` returning the SHAPE instead of a
nullable name is the right fix and it holds on **twelve** record classes — the eight the battery
drives plus four I invented to break it, including two rounding seams the addendum did not
enumerate. My round-2 F1 is closed. So are F2 (the hero, re-censused at 28 widths), F3 (the badge,
0 overlaps on four card surfaces), and F6 (the anchored panels). The disc, the room controls and
the Library tab are closed too, re-measured. This is the best round of the three.

But I can name concrete defects, so it is not clean — and **two of them are my own round-2
findings, asserted closed in prose the disk contradicts**:

1. **The census still cuts itself off mid-word.** Two of the four "shed by priority" steps are CSS
   rules whose selectors (`#st-2`, `#st-3`) match **no element in the document**. On an engaged
   record the bar clips from 420 to 639px, worst case **98px**. The new gate arm samples the band
   only on a cold record, at three widths where a cold record fits.
2. **The phone tab bar still names a destination that is not on screen**, now for 48% of the scroll
   range instead of 100%, and **the "Today" tab can never be current** — tapping it takes you to
   Today and leaves the bar marked Altitude.

And two fresh ones, both introduced by round 3:

3. **A keyboard-reachable state with focus and no focus indicator at all** — the cost of item 11's
   quiet-ring decision, unaccounted for on the re-render path.
4. **"Up next" printed above "Every probe here is graded"** — `firstUngraded()` returns the same 0
   for "the first probe is ungraded" and "no probe is ungraded". That is round 2's `posRestore`
   sentinel bug, verbatim, in the function next to the one that was fixed for it.

**The battery is not vacuous** — I planted round 2's exact verdict defect and it went red on eight
assertions. But **7 of the 10 mutants I planted survived**, including round 2's exact *hero*
stylesheet. Details in §4; that section is the one I would read first if I were writing round 4.

None of this needs redesign. Every fix is local — one media query with a live selector, one
`rootMargin`, one class guard, one sentinel.

Everything below was measured on the built file (12,237,125 bytes, mtime matches HEAD) under
Playwright at **1280×800/900** and **390×844**, both themes, plus width sweeps and a full scroll
sweep. Numbers are CSS px from `getBoundingClientRect` / `getComputedStyle` / `Range.getClientRects`.
Records were seeded as content-keyed progress through `CardId.forCards`. I re-derived every number
rather than reading the addendum.

---

## 1. THE ROUND-3 CHECKLIST, RE-MEASURED

| # | round-3 item | my lens | status | evidence |
|---|---|---|---|---|
| A/B | the gauge: record class → exact sentence | **F1** | **CLOSED** | §2.1 — 12 record classes |
| 2 | the hero is never truncated | **F2** | **CLOSED** | §2.2 — 0/972 at 28 widths |
| 3 | the outline heroes what the pixels hero | — | **CLOSED** | §2.3 |
| 4 | position honesty | — | **CLOSED** (new consequence → **D4**) | §2.4 |
| 5 | the room controls work again | — | **CLOSED** | §2.5 |
| 6 | the LIBRARY tab delivers the library | — | **CLOSED** | §2.5 |
| 7 | the badge never overprints a title | **F3** | **CLOSED** | §2.6 |
| 8 | the census sheds by priority | **F4** | **NOT CLOSED** → **D1** | §3.1 |
| 9 | the disc tracks the measurement | — | **CLOSED** | §2.7 |
| 10 | the tab bar tells the truth | **F5/F6** | **F6 CLOSED; F5 NOT CLOSED** → **D2** | §2.7, §3.2 |
| 11 | the autofocus ring | **F7** | **decided, and it holds at rest** (new consequence → **D3**) | §2.8, §3.3 |

---

## 2. WHAT IS GENUINELY CLOSED

### 2.1 — the gauge. **CLOSED**, and it survived four records the battery does not drive.

`Altitude.compute()` (`altitude.js:97-136`) now returns `thinSet` / `level` / `full` / `minPct` /
`ladder`, compared at the rendered integer percent. `verdictFor()` (`home-view.js:373-410`)
enumerates five classes. Driven at 1280 and 390:

| record | rails as rendered | verdict as rendered | true? |
|---|---|---|---|
| **empty** | 0/310 0% · 0/359 0% · 0/302 0% | *"Nothing graded yet. Each rail is one interview tier…"* | yes |
| **oneSolid** | 0/310 0% · 0/359 0% · **1**/302 0% | *"The rails are level. All three tiers sit at 0% solid…"* | yes — every rail renders 0% |
| **staffOnly** *(round 2's killer)* | **310/310 100%** · 0/359 0% · 0/302 0% | *"**SDE3 and SDE2 are the thin rails.** Both sit at 0% solid — SDE3 0 of 359, SDE2 0 of 302 — under a rail that is further along."* | **yes** |
| **sde2Only** (mirror) | 0/310 0% · 0/359 0% · **302/302 100%** | *"Staff and SDE3 are the thin rails…"* | yes |
| **heavy** (mid-campaign) | **133/310 43%** · 196/359 55% · 177/302 59% | *"Staff is the thin rail. 133 solid of 310 probes, across 46 of 46 topics…"* | yes, and that rail wears `.thin` |
| **perfect** | 310/310 · 359/359 · 302/302, all 100% | *"Every rail is full. Solid on all 971 probes across all three tiers…"* | yes (rails sum to 971) |
| **roundingTie** *(mine)* | **3**/310 **1%** · **1**/359 **0%** · 0/302 0% | *"SDE3 and SDE2 are the thin rails. Both sit at 0% solid — SDE3 **1 of 359**, SDE2 0 of 302…"* | yes at rendered precision — SDE3's own label reads `1 / 359 · 0%` |
| **allShaky** *(mine)* — all 972 graded, none solid | 0% · 0% · 0% | *"The rails are level. All three tiers sit at 0% solid…"* | yes |
| **extendOnly** *(mine)* — only the EXTEND probe graded | 0% · 0% · 0% | *"The rails are level…"* | yes |
| **ladderFull** *(mine)* — three rails full, EXTEND untouched | 100% · 100% · 100% | *"Every rail is full. Solid on all 971 probes…"* | yes — but see **D5** |

The sentence that was *provably false* in round 2 is now true, on the record that produced it and on
its mirror, and the fix survives the two rounding seams I built to break it (a rail with a nonzero
numerator rendering 0%; a record where `graded > 0` but no rail moves). **Confirmed closed.**

One note in the fix's favour that the addendum undersells: comparing at the **rendered** percent is
the correct call and it is what makes `roundingTie` come out true. A raw-float comparison there
would have named SDE3 alone the thin rail while its label and SDE2's both read `0%`.

### 2.2 — the hero. **CLOSED**, re-censused wider than claimed.

I drove all 972 probe questions through the **live** `.hm-q` node — same parent, same computed
width, same clamp, text restored after each — at 28 widths from 320 to 1440, including the two
boundaries where the rules switch (419/420 and 860/861):

| band | box | font | clamp | worst probe | clipped |
|---|---|---|---|---|---|
| 320–419 | 242–341 | 18px | 9 | **9.0 lines** (at 320) | **0** |
| 420–860 | 342–476.7 | 18px | 7 | 6.0 lines | **0** |
| 861–1440 | 535–556.2 | 21px | 6 | 5.0 lines | **0** |

**0 of 972 clipped at every one of the 28 widths.** The addendum claimed 8 widths; it holds at 28.
The stylesheet comment that was false on disk in round 2 is now true. **Confirmed closed.**

One number worth carrying forward, not a defect: at **320px the worst case is exactly 9.0 lines
against a clamp of 9** — zero margin. One longer probe, or one narrower default font, clips. The
7-line and 6-line bands carry 1 line of headroom each; the 9-line band carries none.

### 2.3 — the outline. **CLOSED.**

Exactly **1** rendered `h1` on all 12 records × 2 viewports, and it is the probe question. Heading
order at 1280 on an engaged record: `H1 "Why sign the hash of the package…"` → `H2 Altitude — solid
probes by interview tier` → `H2 Recent sessions` → `H2 Coverage by room`. No skipped level. The
cold home gives the h1 to *"Start here"*. The no-bank fallback (eyebrow carries the h1) is the right
shape. **Confirmed closed.**

### 2.4 — position honesty. **CLOSED** (the fabrication is gone).

- **absentField** — record stores `{drill:10}`, resume pointer on `walk`: *"You marked **3** probes
  shaky in this topic earlier today, and stopped."* — **no position claimed**. Round 2's *"you
  stopped at step 1 of 9"* out of a field that was never stored is gone. The **field** is the gate
  (`home-view.js:107`), which is the correct fix.
- **drillResume** — stored drill cursor, resume on drill: eyebrow *"Where you stopped"*, CTA sub
  *"Probe Drill"*, line *"…stopped at **probe 11** of 21. **15** still ungraded."* The unit matches
  the pane, and the remainder correctly drops its denominator because the position already stated it.
- **mixedPosition** — both positions stored, resume on walk: the walk cursor is read, the unit is
  steps, and the remainder **keeps** its denominator. Correct.
- `firstUngraded()` is genuinely reachable now — every non-drill record in my set heroes a probe
  chosen by it. That was provably dead code in round 2.

The claim in item 4 is delivered. What the fix did **not** anticipate is the sentinel — see **D4**.

### 2.5 — room controls and the LIBRARY tab. **CLOSED.**

`scrollToRoom()` now prefers the mount whose `offsetParent` is non-null and opens the drawer if that
is the host. Measured, six room rows each, page scroll before/after:

| width | room controls that moved the page | hotkey `3` |
|---|---|---|
| 1280 | **6 / 6** | scrollY 0 → 222 |
| 1024 | **6 / 6** | 0 → 2405 |
| 900 | **6 / 6** | 0 → 2359 |
| 390 | **6 / 6** | 0 → 3928 |

Focus lands on an `.ix-card` in every case. The regression against master is repaired at every width
I could reach. The **LIBRARY tab** at 390: `details.open` → **true**, scrollY 1737, drawer top at
**69** (clear of the 57px rail), **46** cards visible. The destination is delivered, not just named.

### 2.6 — the badge. **CLOSED**, with margin.

`.ix-c-name{padding-right:var(--space-92)}` against a widest badge of **46.3px** (`recalled`).
Measured by **text ink** (`Range.getClientRects`, not element boxes) across all 46 cards with all
four status classes seeded, on every card surface the app renders:

| surface | card width | cards | overlaps | worst title→badge gap |
|---|---|---|---|---|
| 1280 companion | 299px | 46 | **0** | 25.5px clear |
| Topic index, desktop | **234px** | 46 | **0** | 23.6px clear |
| phone in-column twin | 340px | 46 | **0** | 30.7px clear |
| Topic index, phone | 316px | 46 | **0** | 30.3px clear |

Round 2 measured 28 of 46 overprinted, worst 88px, and worse in the 234px cards. All four surfaces
are clean, including the one that was worst. **Confirmed closed.** The reserve (92px) is now
double the widest badge, which costs a little title room; no title reaches it, so I am not raising it.

### 2.7 — the disc, and the anchored panels. **BOTH CLOSED.**

**The disc** (`.scrolltop{bottom:calc(var(--chrome-bot,0px) + var(--space-24))}`), at 390×844:

| state | `--chrome-bot` | disc `bottom` | disc bottom edge | tab bar top | overlap |
|---|---|---|---|---|---|
| no inset | 45px | 69px | y 775 | y 799 | **0** (24px clear) |
| +34px home-indicator inset | **79px** | **103px** | y 741 | y 765 | **0** (24px clear) |

The constant is gone; the disc **moved with the bar** when I grew it at runtime. That is the arm
round 2's fix lacked. Confirmed.

**The anchored panels** (my F6), after each tab tap with the smooth scroll fully settled:

| tap | block lands at | rail bottom | hidden under the rail |
|---|---|---|---|
| Today | y **69** | 57 | **0** |
| Altitude | y **69** | 57 | **0** — the `.hm-phead` reads at y 70 |
| Library | y **69** | 57 | **0** |

`scroll-margin-top` computes to **69px** = `--chrome-top` (57) + `--space-12`. Round 2 measured 57px
and 56.7px of the destination hidden. **F6 confirmed closed.**

### 2.8 — the autofocus ring, at rest. **The decision holds.**

At 1280, engaged, no interaction: the CTA **is** focused (`document.activeElement === .hm-cta`),
`:focus-visible` **does** match — confirming the Chromium behaviour the addendum describes — and
`outline: none`, `box-shadow: none`. After a single `Shift`: `outline: solid 3px rgb(42,40,35)` plus
both halos, `hm-quiet-focus` removed. Exactly as designed, and the `r3-desktop-light.png` receipt
shows a screen whose loudest object is the gauge. The forced-colors rule at `styles.css:1377` carries
`!important`, so high-contrast users keep a ring throughout. **The design call is delivered.** Its
unpriced side is **D3**.

---

## 3. DEFECTS, RANKED

### D1. The census still cuts itself off mid-word — two of the four shed steps are dead CSS, and the new gate arm is sampled where it cannot fail.

**Where.** `styles.css` — the shed ladder:

```css
@media(max-width:1023px){ .hm-status .hm-st-dim{display:none} }
@media(max-width:759px){ #st-3,#st-3 + .hm-st-sep{display:none} }     /* matches nothing */
@media(max-width:559px){ #st-2,#st-2 + .hm-st-sep{display:none} }     /* matches nothing */
@media(max-width:519px){ .hm-status > .hm-st-i:first-child{display:none} }
```

against `statusHtml()` (`home-view.js:224-236`), which emits **no `id` attribute on any child**:

```js
'<span class="hm-st-i"><b>' + t.solid + '</b> solid &middot; …'      /* no id="st-2" */
'<span class="hm-st-i"><b>' + t.started + '</b> of ' + model.nTopics + ' topics started</span>'  /* no id="st-3" */
```

Measured on the live document: `document.querySelectorAll('#st-2').length === 0` and
`'#st-3' === 0`, at every one of the 19 widths I sampled. The middle two rungs of the stated priority
ladder — *"then topics-started, then the solid/shaky/missed breakdown"* — never fire.

**Measured, `.hm-status` scrollWidth − clientWidth, both a cold and an engaged record:**

| width | cold record | engaged record (972 graded, 46 topics started) | what is cut |
|---|---|---|---|
| 900 – 1280 | 0 | 0 | — |
| 700 | 0 | 0 | — |
| 640 | 0 | 0 | — |
| **560** | 0 | **10px** | *"…46 of 46 topics starte"* |
| 559 | 0 | **11px** | same |
| **520** | 0 | **50px** | *"…46 of 46 topics sta"* — **22px of the segment past the frame edge** |
| 519 | 0 | 0 | (the "RECORD" eyebrow drops here — the bar is **non-monotonic**: 519 fits, 520 clips 50px) |
| 500 | 0 | **18px** | trailing spacer |
| 460 | 1px | **58px** | *"46 of 46 topics st…"* |
| **430** | **31px** | **88px** | 60px of *"topics started"* gone |
| **420** | **41px** | **98px** | 70px of *"topics started"* gone |

Receipt: **`w1-r3-receipts/r3-census-520-clipped.png`** — the bar ends *"**46** of 46 topics sta"* at
the frame edge, no ellipsis, no wrap, no scroll. That is my round-2 F4 receipt one width over.

**Why the new arm cannot see it.** `home_reflow.cjs` grew its widths to {320, 390, 500, 700, 900}
and gained a census arm guarded by `if (w >= 420)`. Both changes are right in shape and both miss:

- The check **seeds nothing but the theme** (`home_reflow.cjs:98` sets `ddr.v1.theme` and nothing
  else), so every run is a **cold record** — 1-digit numerals, the narrowest content the bar can
  ever hold. A cold record fits at 500, 700 and 900.
- **520–639 is not sampled at all**, and that is the widest band where an engaged record clips.

So the arm added in the round that found the defect passes on the build that still has it. I verified
this is not theory: cold@500 = 0px over, engaged@500 = 18px, engaged@520 = 50px.

**What item 8 claims vs what is on disk.** *"Segments now drop lowest-priority-first; the
probes-graded figure never leaves"* — the second clause is true (it survives every width). The first
is one rung of four. *"The census sheds by priority **instead of clipping itself**"* is false: it
sheds one segment by priority and then clips itself.

**Fix (local).** Give the two segments the ids the stylesheet already asks for, or re-target the two
rules by `:nth-child`. Then seed `home_reflow`'s census arm with a full record and sample 520 and 560.

---

### D2. The phone tab bar names a block that is not on screen for half the page — and the "Today" tab can never be current.

**Where.** `watchTabs()` (`home-view.js:668-688`):

```js
tabObs = new IntersectionObserver(function (entries) { … if (!live) return; markTab(live); },
  { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
```

`-45%/-45%` shrinks the observer root to the **middle ~10% of the viewport — 84px at 844**. Only
three nodes are observed (`.hm-continue`, `.hm-alt`, `.hm-libm`). The home has ~600px of content
between the gauge and the library drawer — the duo panels, *Coverage by room*, the practice section —
none of it an observed target. When that stretch owns the 84px band, no target intersects, `live` is
null, the function **returns before `markTab`**, and the bar keeps a stale mark.

**Measured at 390×844, engaged record, 20px scroll steps over the whole range (0–1370):**

| | |
|---|---|
| marked tab **not on screen at all** | **660px of 1370 — 48% of samples**, continuously from y≈685 to y≈1325 |
| what the bar reads through that range | **Altitude**, with the gauge entirely off screen |
| tabs ever marked while scrolling | `{alt: 68, lib: 1}` — **"Today" never** |
| the bar on arrival (scrollY 0) | **Altitude**, while `.hm-continue` occupies **271px** of the visible area |
| **after tapping "Today"** | scrollY 4 (the top of the page) — **the bar marks Altitude** |

Receipt: **`w1-r3-receipts/r3-phone-y1000-tabstale.png`** — the bar's active mark and indicator sit
under **ALTITUDE** while the screen shows *Coverage by room* and *Cross-topic drill*.

Reproduced across records and viewports (all at widths where the bar exists, ≤419px):

| case | marked tab off screen | "Today" ever marked | after tapping Today |
|---|---|---|---|
| 390×844 engaged | 660 / 1370 (48%) | **no** | **Altitude** |
| 390×844 drill resume | 840 / 1571 (53%) | **no** | **Altitude** |
| 390×844 drawer open | 660 / 6924 (10%) | **no** | **Altitude** |
| 360×800 engaged | 680 / 1479 (46%) | **no** | **Altitude** |
| 390×667 engaged | 760 / 1547 (49%) | yes | Today |
| 390×844 **cold** | 420 / 1283 (32%) | yes | Today |

The cold record and the shorter viewport pass because the two blocks happen to straddle the band
there. On the 844-tall viewport this brief names, with any real record, **the first tab of a
four-tab bar is unreachable**: you cannot arrive at it, you cannot scroll to it, and tapping it
marks a different tab.

**This is materially better than round 2** — the bar was wrong for 1794px of an 1867px page then,
and it is right at the top and bottom now. It is not what item 10 says. *"The tab bar tells the
truth"* is false for 48% of the scroll range, and `aria-current` is announced, so the a11y half of my
round-2 F5 also survives: a screen-reader user is told *"Altitude, current"* while reading the rooms.

**Fix (local).** Two candidates, both one line: widen the band (`rootMargin: '-56px 0px -45% 0px'`
anchors on "what is at the top of the content area", which is what a tab bar means), or fall back to
the last target **above** the band when none intersects — the `for` loop already walks them in column
order, so `live` only needs an else-branch instead of a `return`. Then add the arm the round-2
finding asked for: scroll, assert the marked tab is on screen, and assert every tab is reachable.

---

### D3. There is a keyboard-reachable state with focus on a control and no focus indicator at all.

**Where.** `render()` (`home-view.js:560-568`) re-adds `hm-quiet-focus` and re-focuses the CTA on
**every** render; `bind()` (`home-view.js:602-604`) only removes the class on the **next** keydown.
`render()` is the `rerender` callback handed to `Panels.bind()` for all three mounts, so any control
that mutates progress re-enters it.

**Measured at 1280, engaged, keyboard only:**

| step | `document.activeElement` | outline | box-shadow | `hm-quiet-focus` |
|---|---|---|---|---|
| load | `BUTTON.hm-cta` | `none` | `none` | on |
| press **Tab** | — | ring armed | — | **off** |
| focus a library card's reset | `BUTTON.ix-c-reset` | `solid 2px` | halo | off |
| **press Enter on it** → re-render | **`BUTTON.hm-cta`** | **`none 3px`** | **`none`** | **on** |
| press Tab again | `BUTTON.ix-goal-b` | `solid 2px` | halo | off |

Row 4 is the defect: after a keyboard user has already pressed a key — after the app has already
concluded they are a keyboard user and re-armed the ring — one keyboard activation moves focus to a
different control and paints **nothing**. `background-color` is `rgba(0,0,0,0)` and `border-color`
is the CTA's resting `rgb(167,58,87)`; there is no second indicator. Receipt:
`w1-r3-receipts/r3-focus-after-rerender.png`.

That is **WCAG 2.4.7 Focus Visible** — a component that receives keyboard focus with no visible
focus indicator — in a state reachable by pressing Enter on a visible button. The quiet window is
supposed to be *"the load-time programmatic focus"*; on this path it is a **post-interaction**
programmatic focus, which is the case the rule was never meant to cover.

Note the focus **steal** itself (row 4's jump from the reset button to the CTA) predates round 3 —
round 2 had the same `setTimeout(cta.focus)`. What round 3 adds is that the stolen focus is now
**invisible**. Round 2 was worse-looking and better-behaved here.

`focus_ring.cjs`'s new arm asserts the quiet state at **load** only, so it cannot see this.

**Fix (local).** Gate the quiet window on "no key has been pressed this session" rather than on
"a render just happened" — a module-level `armed` flag set by the first keydown and never reset, so
`render()` adds the class only while `!armed`. Then the arm becomes: press a key, force a re-render,
assert the ring is present.

---

### D4. "Up next" is printed above a sentence saying every probe is graded — the round-2 sentinel bug, in the function beside the one that was fixed for it.

**Where.** `firstUngraded()` (`home-view.js:147-156`):

```js
for (var i = 0; i < cards.length; i++) if (!CardId.level(map, keys[i])) return i;
} catch (e) {}
return 0;
```

`0` means both *"probe 1 is the first ungraded one"* and *"nothing is ungraded."* `heroFor()` reads it
as a real queue position and labels the block **"Up next"**.

This is the same shape as the bug item 4 exists to fix. The addendum's own words:
*"`posRestore` returns 0 for an absent field, which is right for a pane restoring itself and wrong
for a sentence claiming where you stopped."* Identical sentence, `firstUngraded` for `posRestore`.

**Measured — 7 record × viewport combinations print both clauses in one panel:**

| record | eyebrow | the line 46px below it |
|---|---|---|
| 1280/heavy | **Up next** · Package Signing | *"You worked this topic earlier today, and stopped. **Every probe here is graded.**"* |
| 1280/perfect | **Up next** · Multi-Tenant Isolation | *"…**Every probe here is graded.**"* |
| 1280/allShaky | **Up next** · Package Signing | *"You marked 21 probes shaky…, and stopped. **Every probe here is graded.**"* |
| 1280/ladderFull | **Up next** · Multi-Tenant Isolation | *"…**Every probe here is graded.**"* |
| 390/heavy, 390/perfect, 390/allShaky | same | same |

Receipts: **`r3-upnext-over-finished-topic.png`** (cropped) and **`r3-desktop-light.png`**, where the
whole panel reads:

> **UP NEXT · CONTENT PIPELINE**
> *"Export a 1,000,000-row CSV without OOM. How?"*
> You worked this topic earlier today, and stopped. **Every probe here is graded.**

**The steelman, stated fairly:** the drill *would* open at probe 1 on that record, so "the probe the
drill would serve next" is literally satisfied. I still call it a defect, for two reasons. First,
the panel prints both halves of a contradiction 46px apart — that is my round-1 defect #4 (*"the
resume line contradicts itself"*), which round 2 closed, re-opened in a different pair of clauses.
Second, the probe under "Up next" is one the reader has already answered and graded, so the app's
single loudest element — the h1, the whole thesis of this wave — is a stale question presented as a
forthcoming one.

**Not catchable.** `home_claims.cjs` drives `perfect` and `mixedPosition`, which both land in this
state, and `judgeHero()` only fires on `"Where you stopped"`; `judgePosition()` only tests the
`"not graded yet"` × `"every probe graded"` pair. The battery renders the defect twice per run and
has no rule that looks at it.

**Fix (local).** Return `-1` for "nothing ungraded" and branch on it: with the topic finished there
is no honest "up next" in it, so either re-drill framing (*"Nothing left here — re-drill it, or pick
the next topic"*) or hero from a topic that does have one. Then the assertion writes itself:
*an "Up next" eyebrow may not sit beside "Every probe here is graded."*

---

### D5. *(minor)* The gauge's own headline figure counts a probe that is on none of its rails.

**Where.** `gaugeHtml()` (`home-view.js:440`) prints `model.totals.solid` / `model.totals.n` — the
**bank** — under the heading *"Altitude — solid probes by interview tier"*, while the rails and the
verdict are denominated in the **ladder**.

The bank holds exactly **one** probe that is not at a ladder tier — `content-pipeline` index 6, tier
`EXTEND`, *"Product wants live video transcoding added (not just thumbnails). How…"* — so
`ladder.n` = 971 and `totals.n` = 972.

| record | panel header | rails sum to | verdict |
|---|---|---|---|
| **perfect** | *"**972** solid of 972"* | 971 | *"Solid on all **971** probes across all three tiers"* |
| **ladderFull** | *"**971** solid of 972"* | 971 (all three at 100%) | *"**Every rail is full.** Solid on all 971 probes…"* |

The second row is the one I would fix: the panel says one probe is short of solid while its own
picture shows three full rails and its own sentence says the work is done. There is nowhere on the
panel to put the missing probe. Receipt: `r3-gauge-perfect-header972-verdict971.png`.

The builder found this exact 972-vs-971 seam **in the verdict** and fixed it there
(addendum §A: *"one probe wide"*). The header sits 60px above and kept it. Nothing is false — every
figure is derivable — but the panel prints two denominators without labelling either, which is the
softest form of the class this round exists to close.

**Fix.** Either label it (*"972 solid of 972 in the bank"*) or count the ladder, like everything else
on the panel does.

---

## 4. THE BATTERY, TEETH-TESTED — it is not vacuous, and it is not yet the class-killer

Method: `test/home_claims.cjs` takes the file as `argv[2]`, so I copied the built deliverable to a
scratch mirror, planted one defect per copy, ran the **real, unmodified** check against it, and
deleted the mirror. The repo was never touched (`git status` clean before and after; `git log -1`
still `f08c4ac`).

| # | planted defect | result |
|---|---|---|
| **M1** | **round 2 verbatim** — `level = (thinSet.length > 1)`, so Staff-at-100%-others-empty is called "level" | **CAUGHT** — 8 failures: *"claims the rails are level while they render 100% / 0% / 0%"* on staffOnly, sde2Only, absentField, mixedPosition, both viewports |
| **M7** | the eyebrow always says *"Where you stopped"*, decoupled from the record | **CAUGHT** — 4+ failures: *"'Where you stopped' heroes a probe while Resume opens 'Walkthrough'"* |
| **H1** | `-webkit-line-clamp:1` on the hero at every width | **CAUGHT** — 5 failures: *"the hero is visually truncated"* |
| M2 / M2b | the **single** thin-rail sentence quotes another rail's figures / inflates its own by 500 → *"Staff is the thin rail. 633 solid of 810 probes"* over a rail rendering `133 / 310 · 43%` | **MISSED** |
| M3 | the **two**-thin sentence quotes a percentage no rail renders → *"Both sit at 77% solid"* over rails at 0% | **MISSED** |
| M5 | the two-thin sentence quotes the **non-thin** rail's figures → *"SDE3 310 of 310, SDE2 310 of 310"* while those rails render `0/359` and `0/302` | **MISSED** |
| M6 | the panel **header** figure inflated by 500 → *"1007 solid of 1472"* above rails totalling 971 | **MISSED** |
| **H2** | **round 2 verbatim** — clamp 4 at the desktop measure, narrow step-down deleted, narrow clamp deleted: **the exact stylesheet that cut 1 of 972 at 1280 and 63 of 972 at 390** | **MISSED** |
| H3 | both narrow rules deleted (the phone alone regresses to 21px in a 312px box) | **MISSED** |

**3 caught, 7 missed.** The teeth-test the brief asked for is satisfied — I planted round 2's own
verdict defect and watched the check go red on eight assertions, then restored. The battery is real.
Two structural limits explain every miss:

1. **`judgeVerdict()` checks which sentence was chosen far better than which numbers are in it.**
   The `level` branch validates its percentage and the `full` branch validates its probe count;
   **neither thin-rail branch validates anything but tier membership**, and the header is not read at
   all. Section B of the addendum promises *"each rail quotes itself; no rail's number is asserted of
   another"* — M5 asserts one rail's numbers of another and passes.
2. **The hero arm's coverage is 10 probes.** I enumerated what the nine seeds actually render:
   **10 distinct hero questions of 972 (1.03%)**, none of them among the 63 that round 2's clamp cut.
   Item 2's wording — *"`home_claims` asserts the rendered hero is unclipped on every record it
   drives"* — is literally true and materially weak: **the arm cannot fail on the regression it was
   written to guard.** The 972-probe census that actually establishes the claim is a one-off builder
   measurement with nothing behind it, which is the same shape as *"the addendum asserts the fix with
   no check behind it"* from my round-2 §F1.

Coverage the battery does reach, for the record: all five verdict classes
(`cold` 2, `level` 4, `thin-SEVERAL` 8, `thin-ONE` 2, `full` 2 across 18 rows). Note the seed named
`level` does **not** produce a level record — its rounding lands on a single thin rail; the `level`
class is reached by `oneSolid` and `noRecord` instead. Not a defect, but the seed names do not
describe what they exercise.

**Two additions would close the class properly:** assert every numeral inside a verdict against the
rail it names (a generic *"every `N of M` in the sentence must equal the `N / M` on the rail whose
tier precedes it"* rule covers M2, M3, M5 at once), and move the 972-probe census **into the gate**
at the widths the addendum already measured — it is a clone-and-measure loop, ~40 lines, and it is
the only thing that can make H2 fail.

---

## 5. WHAT I CHECKED THAT IS GENUINELY FINE

Listed so this reads as calibrated, and so round 4 does not re-litigate it.

- **No horizontal document overflow** at any of the 19 widths I swept, cold or engaged.
- **The dark theme** holds at both breakpoints on an engaged record (`r3-desktop-dark.png`,
  `r3-phone-dark.png`); it remains the better of the two.
- **The `.thin` class** is applied to exactly the rail the verdict names, and correctly to **none**
  when two rails tie — the highlight says less rather than saying something wrong. Consistent with
  the standing rule.
- **`markTab()`** removes `aria-current` from every other tab, so there is never more than one
  current tab. The stale mark is a *wrong* mark, not a *duplicate* one.
- **At 430–919px the tab bar is `display:none`** — so my 430×932 sweep reading "100% off screen" is
  an artifact of there being no bar, not a defect. The missing affordance in that band is
  pre-existing and section D discloses it as uncharged. Not raising it.
- **`--chrome-bot` on topic routes** is unaffected by unscoping `.scrolltop`: the census is
  `display:none` off the home and `stolen()` returns 0, so the disc's desktop offset is unchanged.
- **The hero's line budget** carries one line of headroom in the 6- and 7-line bands.
- **Focus rings** on rail rows, room rows, library cards, card resets, goal steppers and the skip
  link are all present and visible; the only ringless state is D3.
- **Cold open** is untouched: one h1 (*"Start here"*), the value-prop lead, the de-jargoned Start CTA.
- **Item 11's forced-colors path** keeps the ring (`styles.css:1377`, `!important`).

**Noted, not ranked** (I do not want to pad the list): the home rail prints
*"**46** of 5 topics"* with a full bar when the week's drilled count exceeds the goal
(`home-view.js:208`, and the same phrasing in the `aria-label`). It is derivable, so it is not a
false claim, and the identical pattern already ships on master in `goalStrip()` — but the rail's copy
is this wave's, and *"46 of 5"* reads as a broken fraction to any reader. Reachable with a goal of 5
and six topics drilled.

---

## 6. WHAT IS BEST ABOUT THIS ROUND

Two things, said plainly, because they should carry forward.

**The gauge fix is the right kind of fix.** Returning the SHAPE instead of a nullable name, and
comparing at the *rendered* precision, does not patch the case I found — it removes the category of
inference that produced all three rounds of it. I threw four records at it that nobody had run,
including two rounding seams, and it holds on all of them. The comment block at `altitude.js:79-96`
that narrates the two earlier failures is the most useful thing in the diff.

**And the round found its own defect before I did.** The addendum reports that `home_claims`, on its
first run, caught the new gauge printing *"all 972 probes"* over rails totalling 971 — one probe
wide, on the builder's own code. That is the arm doing exactly the job the class rule asked for, and
it is why the verdict is FIXABLE rather than anything worse. My criticism in §4 is that the arm's
reach stops one step short of the numbers, not that it is theatre; it demonstrably is not.

The lesson I would carry into round 4 is narrower than round 2's. Round 2's was *"the two things
this wave is about have no arm."* Round 3 built the arms. Round 3's lesson is:
**an arm's negative control has to be the defect that actually shipped, not a defect of the same
family.** M1 proves the verdict arm against round 2's real bug and passes. H2 runs round 2's real
bug through the hero arm and it goes green. One of those two arms is finished and the other is not,
and only planting the historical mutant tells you which.

---

**Receipts** (durable, at `D:/claude-workspace/appeal-directions/_ia/w1-r3-receipts/`):

| file | shows |
|---|---|
| `r3-census-520-clipped.png` | **D1** — the bar ending *"46 of 46 topics sta"* at the frame edge |
| `r3-520-full.png` | **D1** in context at 520px |
| `r3-phone-y1000-tabstale.png` | **D2** — ALTITUDE marked while *Coverage by room* fills the screen |
| `r3-phone-arrival.png` | **D2** — the bar on arrival, marking Altitude |
| `r3-focus-after-rerender.png` | **D3** — focus on the CTA after a keyboard-triggered re-render, no ring |
| `r3-upnext-over-finished-topic.png` | **D4** — *"Up next"* above *"Every probe here is graded."* |
| `r3-gauge-perfect-header972-verdict971.png` | **D5** — header 972, rails 971, verdict 971 |
| `r3-desktop-light.png` / `r3-desktop-dark.png` / `r3-phone-light.png` / `r3-phone-dark.png` | the four states whole; the quiet CTA, the closed badge, the true gauge |
| `p1..p9.json` | every number above — census sweep, 972-probe hero census at 28 widths, scroll sweep, tab truth, verdict classes, badge ink, rooms/focus |
| `lib.cjs`, `p*-*.cjs`, `teeth*.cjs` | the probes and the three teeth-test rounds, re-runnable |

Nothing in this judgment depends on re-running anything; the JSON carries the output.
