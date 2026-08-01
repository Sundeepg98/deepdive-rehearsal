<!-- VERBATIM COPY. Authored by an independent judge/verifier of the appeal campaign
     (direction-fidelity lens), 2026-08-01, against appeal/home-instrument @ 532a1a6.
     Preserved unedited as the record round 2 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-2 addendum). -->

# W1 JUDGE — DIRECTION FIDELITY

**Subject:** the BUILT home of Deep Rehearsal, `appeal/home-instrument` @ `532a1a6`
(worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`).
**Judged against:** `D:\claude-workspace\appeal-directions\CHOSEN.md` and the team-lead coherence
ruling as it is recorded in the freeze (`_audit/2026-07-31-appeal-home-freeze.md` §7b — rule 1 one
signature, rule 2 the question-as-hero is a copy correction, rule 3 hygiene silent, rule 4 no steal
fighting the spine, rule 5 the Chanel cut).
**One lens only:** does the built thing read as THE INSTRUMENT, is there exactly ONE signature, is
the question-as-hero a correction rather than a monument, is the hygiene silent.

## VERDICT: FIXABLE — six named defects, one of them must-fix

The direction landed. The shell extension is real and correct, the altitude gauge is a genuine
signature and the best thing on the screen, the census bar and the phone tab bar are honest
furniture, and the panel grammar holds in both themes. Nothing here needs re-architecting.

But the direction's own headline sentence — *the hero is the QUESTION* — **fails open on the
default resume path**, and it fails into the exact thing the panel condemned. That is D1 and it is
must-fix. The other five are craft-floor debts that the receipts happen not to show.

Everything below was measured on the built file
(`deepdive_content_pipeline_rehearsal.html`) under Playwright at 1280x800, 1440x900, 1000x800 and
390x844, on the same seeded returning-user record the receipts used.

---

## THE THREE QUESTIONS, ANSWERED FIRST

**Does it read as THE INSTRUMENT? — Yes.** `html[data-view="home"] .app{display:none}` is gone and
the home is a tenant of the frame: rail at 260x692 inside the sticky 296px sidebar, work column in
the `.stage` slot, library in the `.companion`, census fixed at the foot (`.hm-status` 1280x29.5 at
y=770.5). The scroll grammar is genuinely the app's own, not a new one — I checked the home against
a topic route and both behave identically (sidebar sticky `top:0`; at maximum scroll the home reads
-70.5 and the topic route -69.7, the same `body{padding-bottom:70px}` tail). The frame persists.

**Is there exactly ONE signature? — Yes, and it is the gauge.** A type census over the whole home
shell puts the hero question at 21px as the largest type on the page and **the gauge carries nothing
above 14px** — it wins on nothing but density and information, which is what an instrument should
win on. Fill and outline carry the grade; hue never does; untouched topics keep hollow outlines so
the denominator is honest; the keel marks flagged without adding a hue; and the cold verdict refuses
to accuse ("Nothing graded yet…") where an accusation would be derived from nothing. Three rails
that taper is a finding no single percentage can state, and it is delivered in one look.

**Is the question-as-hero a correction rather than a monument? — Yes, on the path the receipts
show.** `.hm-q` is `--font-size-heading` (21px), inside `.hm-continue`, 1.17x the CTA's own topic
name (18px), no rule, no slab, no frame of its own. That is a copy correction. On every other
path it is not a monument either — it is a wall of prose. See D1.

**Is the hygiene silent? — Mostly.** The age stamps, the second-person copy and the fill/outline
grade marks all build with no feature surface of their own. The measure rule does not (D3), and
the retained room block is not silent at all (D5).

---

## D1 — MUST FIX. The hero is not the question on the default resume path

`src/scripts/app/home-view.js:213-217`

```js
if (cur && cur.kind === 'drill') {
  var card = t.data && t.data.bank && t.data.bank.cards && t.data.bank.cards[cur.i];
  if (card && card.q) q = plain(card.q);
}
if (!q) q = plain((t.identity && t.identity.thesis) || t.identity.title);
```

The question is read **only** when the resume cursor is a drill cursor. `src/scripts/app/last-visit.js:50-56`
returns the last visited pane and **defaults to `'walk'`** — the drill is one of nine routes and it
is not the default. So the fallback is the majority path, not an edge.

What the fallback renders, measured at 1280x800 with the resume view set to `walk`, everything else
identical to the receipts:

| | drill path (what the receipts show) | walk path (the default) |
|---|---|---|
| `.hm-q` box | 556.2 x 54.6 (2 lines) | **556.2 x 191.1 (7 lines)** |
| `.hm-continue` height | 280.7 | **417.2** |
| `.hm-alt` (the signature) | y=334.7, bottom 603.9 | y=471.2, **bottom 740.4** |
| hero text | "What is the race between a read and a write in cache-aside?" (59 chars) | the topic **thesis**, 372 chars |

And the thesis is not short anywhere. Across all 46 topics: **min 124, median 435, max 1127
characters; 40 of 46 exceed 250; none is under 120.** The bank questions, by contrast, run 28-90
characters. The median case is worse than the one I screenshotted; the max is roughly twenty-one
lines of display type.

Rendered (crop: `w1-dirfid/shots/continue-walk.png`), under the eyebrow **"Where you stopped ·
Caching Strategies"**, in curly quotes, at display size:

> “Serving reads from a fast store in front of the source of truth to cut latency and load — where
> the hard part is not the lookup but keeping the cache consistent with the source, which is why
> cache-aside with explicit invalidation and a TTL safety net is the default, and the failure modes
> you design for are the stampede, the stale read, and the cache going down.”

Three separate costs, and they compound:

1. **It is not a question.** CHOSEN.md §6.1 and the module's own header say the hero exists to "drop
   you back into the interrogation." A declarative topic summary is the opposite move — it is the
   table-of-contents voice the appeal exists to leave behind, promoted to the largest type on the
   screen.
2. **The quotation marks assert a speech act that did not happen.** Curly quotes under "Where you
   stopped" claim *this is what you were being asked*. Nobody asked it. That is the one kind of
   dishonesty this spec is otherwise scrupulous about — §7's whole AGE discussion exists to refuse
   a stronger false claim over a weaker true one, and this is the same class of claim, unrefused.
3. **It out-monuments the signature.** Rule 2 says the question is a copy correction, not a second
   monument. At 191px of display type it is a monument, and it pushes the gauge's verdict and legend
   into the last 60px of an 800px viewport — under it entirely on a 700-750px laptop.

The fix is contained: when there is no drill cursor, either read a question from the topic's bank
(`bank.cards[0].q` is already a real interview sentence) or drop the quotes and the "where you
stopped" framing and say what the screen actually knows. It does not touch the shell, the gauge or
the census.

## D2 — The single primary action is a button inside a button

`src/styles.css:2049` defines `.hm-act` as the home's **pill button** — the rail's Search /
Shortcuts / Theme:

```css
.hm-act{min-height:44px;padding:var(--space-8) var(--space-14);border:1px solid var(--bd);border-radius:10px;
  background:var(--card);color:var(--ink);…;cursor:pointer;display:inline-flex;align-items:center;gap:var(--space-6)}
.hm-act:hover{border-color:var(--acc);color:var(--acc)}        /* :2052 */
```

`src/scripts/app/home-view.js:198` and `:246` reuse that same class name for the CTA's wrapper
`<div class="hm-act">`, and `src/styles.css:2222` overrides **only** the padding
(`.hm-act{padding:0 var(--space-24) var(--space-24)}`). Everything else leaks: the border, the
radius, the card fill, the 44px floor, `display:inline-flex`, `cursor:pointer` and the accent hover.

Measured, 1280x800, engaged home:

| | box | border | radius | background | cursor |
|---|---|---|---|---|---|
| wrapper `div.hm-act` | 301.7 x 115.5 @ (317, 192.2) | 1px solid rgb(232,228,220) | 10px | rgb(255,255,255) | **pointer** |
| `button.hm-cta` | 251.7 x 89.5 @ (342, 193.2) | 1px solid rgb(49,91,180) | 11px | transparent | pointer |

- **35.4% of the wrapper is dead zone.** Gaps: left 25, right 25, bottom 25, **top 1**.
- `document.elementFromPoint(606.2, 237.9)` — inside the wrapper, right of the CTA, vertically
  centred — returns `DIV.hm-act` with `cursor: pointer`. Hovering it changes the wrapper's
  `border-color` **and** `color` to `rgb(83,74,183)`. A non-interactive div lights up like a button
  and does nothing: a false affordance, 25px wide, wrapped around the one control on the page that
  must be unambiguous.
- The 1px top gap is less than the CTA's 3px focus-halo spread, so the halo overflows the wrapper's
  top edge and **amputates its top-left corner**. Visible in the shipped receipt
  (`1280x800-after.png`, region x 497-967 / y 290-475) and unmistakable in
  `w1-dirfid/shots/1280x800-continue-crop.png`. On the cold home the wrapper stretches to the full
  column and you get two concentric bordered rounded rectangles 25px apart running 900px wide
  (`w1-dirfid/shots/cold-1280.png`).

Direction cost, precisely: this falsifies the freeze's own §7b sentence — *"it is the only bordered
control in the column."* It is not. Rule 5's Chanel cut took the saturated fill off the CTA and left
a second, phantom button frame around it. And the hover indigo `rgb(83,74,183)` is a second,
meaningless hue sitting 25px outside a room-blue `rgb(49,91,180)` CTA, on a screen whose stated rule
(CHOSEN.md §4) is that colour means exactly one thing — which room.

One declaration fixes it: give the wrapper its own class, or reset `border/background/radius/cursor`
alongside the padding at `styles.css:2222`.

## D3 — The display measure is applied to body copy, inverting the rule it was minted to state

`src/styles.css:2216`

```css
.hm-since{font-size:var(--font-size-caption);…;max-width:var(--measure-display)}
```

`ch` is font-relative, so one token resolves to two very different physical widths:

| element | font-size | `41ch` resolves to |
|---|---|---|
| `.hm-q` (display) | 21px | **556.2px** |
| `.hm-since` (body) | 12px | **265.2px** |

Identical at 1280, 1440, 1000 and 390 — the lead is pinned at 265.2px in a 624px column (1280),
a 784px column (1440) and a 664px column (1000). CHOSEN.md:128-130 states the rule the token exists
for: *"display type takes a shorter measure than body type"* and *"Body measure is unchanged"*
(68ch). Built, the body line is **47% the physical width of the display line above it**. The rule is
inverted for the one pair it was written to govern.

Visible: on the engaged home the reason/recency/remainder sentence — the whole of rule 2's copy
correction — wraps to two short lines with ~360px of empty column beside it (`1280x800-after.png`,
region x 341-606 / y 138-172). On the cold home it is three lines with ~600px empty beside it while
the question above runs to x=1250 (`w1-dirfid/shots/cold-1280.png`).

`test/home_rhythm.py` cannot catch this. Its new `DISPLAY_TOKEN_RE` arm judges the token FORM only —
"Report the measure so its token form is still judged; take no rhythm gaps from it" — so
`var(--measure-display)` passes wherever it lands. The check is correct about scope and blind about
target; the gate's green here is honest and uninformative.

## D4 — The cursor the direction says it replaced still ships, and contradicts the line above it

`src/scripts/app/home-view.js:253`

```js
(vt ? esc(vt) + (cur ? ' &middot; probe ' + (cur.i + 1) + ' of ' + cur.n : '') : 'pick up where you left off')
```

Rendered on the receipts' own record, 20px apart inside one block:

- lead: "You marked **4** probes shaky in this topic 3d ago, and stopped. **9** probes left here."
- CTA sub-line: "Probe Drill · **probe 11 of 21**"

Both are honest against different fields (`tot - done` versus the restored position), and a reader
cannot reconcile them: nine left, but you are on eleven of twenty-one. The freeze §2 names this
exact string as the defect it fixed — *"Previously: 'probe 11 of 21' — a cursor."* It was not
replaced; it was demoted one line and now argues with its replacement.

Second bug on the same line: the walk path renders **"Walkthrough · probe 5 of 9"**. `cursor()`
returns `{kind:'walk'}` over `t.data.walk.steps`, and the template hardcodes "probe". Walkthrough
STEPS are being called probes — and "probe" is the unit the entire instrument is denominated in
("291 of 972 probes graded" in the census, "solid probes by interview tier" on the gauge). Spending
the denominator's own word on a different countable is the cheapest kind of incoherence to fix and
the most expensive to leave.

## D5 — Spec block 4 was not built, and the freeze does not record the deviation

CHOSEN.md:174 §6.4 — *"COVERAGE BY ROOM. Six dense rows, four-state proportion bar."*

Built: the pre-existing `Panels.roomsHtml()` card grid, heading **"Choose a room"**, six cards with
a single-fill percentage bar. `git diff 1c533d7 HEAD -- src/scripts/app/panels.js` shows
`roomsHtml()` untouched. `src/styles.css:2294-2299` states the reason honestly — keeping
`test/focus_ring.cjs`'s six room-halo assertions alive — and says *"Only the density changes."*
The engineering reason is good. The problem is that the freeze §7b says *"Nothing else was cut"* and
its §5 table does not record it, so a block the spec specified is missing without a line anywhere
saying so.

In this lens the cost is real, not bookkeeping:

- it is the **only block below the hero not in the panel grammar** (no `.hm-panel`, no `.hm-phead`);
- at **377px (1280) / 258px (1440) / 734px (390)** it is the second-tallest block in the column;
- its titles are **16px/700 — the largest type on the page after the hero and the CTA**, larger than
  the gauge's own verdict sentence (14px);
- it carries six saturated hue badges and six saturated bars, making it the loudest colour mass in
  the work column;
- it is the **third** presentation of the same six rooms on one screen (rail rows at
  `.hm-rrow[data-room]` x6, these cards x6, library group heads x6);
- and its heading is a navigation verb — "Choose a room" — on the one screen whose whole direction
  is to stop being a table of contents. The spec's own label, "Coverage by room", is the instrument
  register and is right there in the file.

The four-state proportion bar is also where the solid/broken/hollow grade axis (CHOSEN.md:180-182,
"adopted wherever the home shows a graded mark") would have earned its keep a second time. It is
absent here.

## D6 — The new census bar and the pre-existing scroll-top disc collide

Measured at 1280x800 scrolled to the bottom: `.hm-status` at y=770.5 (h 29.5, z 60);
`.scrolltop` at y=732 (h 44, z 150, `bottom:24px`) → **5.5px overlap**. The saturated disc straddles
the census bar's top hairline, breaking it across 44px, and its glow washes the census surface
(`w1-dirfid/shots/float-after-1280-light.png`).

Control run, so the charge is fair: on the BEFORE build the disc is at the **identical** box
[618, 732, 44, 44] with the identical gradient. The disc did not move — the wave put a new fixed bar
underneath it. And the wave *did* solve exactly this on the phone: `.scrolltop`'s bottom goes 24px →
69px (`--chrome-bot` 45 + 24), clearing the tab bar by 24px. Only the desktop case is unreconciled,
because `--chrome-bot` stays 0px at 1280 while the census is nonetheless fixed and 29.5px tall.

---

## CHECKED AND CLEARED — do not re-litigate these

Four things looked like defects and are not. Each was killed by a control, and the controls are
worth keeping:

1. **The magenta accent on the rail's hover, on `#scrollprog` and on `.scrolltop` is PRE-EXISTING,
   not a wave regression.** `:root --acc/--acc2` is `#963D86 / #B537A1` — the boot constant
   home-view.js:112-115 itself warns about. I expected the rail move to have taken these buttons out
   of `.ix-panel`'s roomless-indigo scope, the same mechanism as the brand-mark defect the freeze
   documents in §4.2. It did not: on the BEFORE build the chain was already
   `button.hm-act < div.hm-acts < header.hm-top < main#home.homev` — outside `.ix-panel` all along —
   and the hover border is `rgb(150,61,134)` on **both** builds. That is also why `#home .hm-brand`
   needed its explicit override in the first place.
2. **The sidebar losing its top ~70px at maximum scroll is the app's own grammar**, not a broken
   frame: `body{padding-bottom:70px}` sits below `.app`, and the topic route does the same thing
   (home -70.5, topic -69.7). The freeze's "same geometry, same sticky and scroll behaviour" is
   true and now verified.
3. **The library's 92 `.ix-card` nodes are the documented one-renderer/two-mount pattern**, not a
   duplicate. Exactly 46 are visible at every width measured — companion at 1280/1440, `.hm-libm` at
   1000/390, never both.
4. **The gauge does not compete with anything and nothing competes with it.** Verified by type
   census (nothing in it above 14px), by saturation scan (no saturated fill inside it), and by the
   fill/outline rule holding on all three rails including the hollow untouched segments.

## WHAT THE RECEIPTS DO AND DO NOT SHOW

The receipt pair is honest about what it shows and silent about what it does not. It shows the
drill path — the one path where D1 does not fire — and it shows the engaged home at the top of the
scroll, which is above D5's room block and above D6's collision. D2 is *in* the receipts
(`1280x800-after.png` x 497-967 / y 290-475; `390x844-after.png` x 33-748 / y 410-640) and D3 is *in*
the receipts (x 341-606 / y 138-172); both were simply not read as defects at capture time.

## THE SHORT VERSION

The instrument is built and the signature is right. The gauge is the best thing anyone has put on
this screen and it should not be touched. What is not finished is the seam where the copy correction
meets the record: the hero has no honest fallback (D1), the one action wears a phantom second frame
(D2), the measure rule is applied to the wrong kind of type (D3), the cursor it claims to have
retired is still on screen arguing with its replacement (D4), one specified block was quietly not
built (D5), and the new foot furniture was not reconciled with the old floating furniture (D6).

None of that is a redesign. D1 is one branch in `continueHtml()`. D2 is one declaration. D3 is one
`max-width`. D4 is one template string. D5 is a disclosure plus a heading, or the block the spec
asked for. D6 is one home-scoped `bottom`.

---

*Judged 2026-08-01. Evidence: `w1-dirfid/shots/` — `measure.json`, `probe2.json`, `probe3.json`,
`probe4.json`, `1280x800-continue-crop.png`, `1280x800-alt-crop.png`, `continue-walk.png`,
`cold-1280.png`, `final-dark.png`, `float-after-1280-light.png`, `float-before-1280-light.png`
(scratchpad `…/bfc4e186-9eb0-4148-a383-84020244f407/scratchpad/w1-dirfid/`).*
