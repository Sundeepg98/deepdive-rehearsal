# Frontend cold audit — 2026-07-29

**Scope:** how the app looks, feels and behaves. Six lenses, run cold against LIVE
(https://sundeepg98.github.io/deepdive-rehearsal/), local repo read-only.
**Not in scope:** content correctness (separately certified at zero known defects across the
11-wave campaign). See *What this audit does not cover*.

**Delivered:** 34 findings / 6 lenses → **32 distinct** after cross-lens dedupe.
**2 P1 · 17 P2 · 13 P3.**

---

## Verdict

The app is not competent-default — it is genuinely well made, and the audit is unusually
consistent about *where* it is well made. Five of six lenses independently opened by saying so,
each with a measurement: the six-room colour system survived a deliberate attempt to break it;
reduced-motion rewrites the duration tokens themselves rather than checkbox-disabling animations;
the overlay family is one real motion contract across seven surfaces; all four dialogs hold a
shadow-aware focus trap; mobile layout integrity is clean across 60 measured states with zero
horizontal overflow; and reflow is clean at 100/200/400% zoom.

The defects cluster into **four honest themes**, and none of them is "the craft is missing."

1. **Spot fixes that were never generalised.** Prior #20 fixed the shadow focus ring on
   `.flow-go` and nothing else, so the three grade buttons and `Reveal answer` — the core
   rehearsal loop — still fall back to Chrome's UA hairline. Two independent lenses found this.
   Same shape: `aria-current` exists on the topic nav and the panels but not on the seg strip;
   the `.tn-trigger` wrap fix exists but is gated to ≤600px and never reaches desktop.
2. **The home screen was assembled; every other surface was drawn.** Zero display-face elements,
   70% of its text in an unintended Arial, and its single primary CTA painted in a retired brand
   indigo that belongs to no room — directly above six correctly-inked room cards.
3. **The phone has no vertical budget.** Verified on disk: **zero** short-viewport media queries
   in 1827 lines (`@media … max-height` returns nothing; the single `orientation` hit is
   `text-orientation`, a property). Every mobile decision in the codebase is a *fit* decision, not
   a *budget* decision. The consequence is the P1.
4. **The content campaign outgrew the presentation layer.** Styles sized for the hand-coded
   flagship's brevity now carry 2–6.5× longer authored prose. The cram sheet's ~103-char design
   point became 9.7 screens on desktop and 11.5 on a phone; `.dec-tell` went from 2 lines to 11
   at full bold.

Theme 4 is the one worth pausing on: it is the **cost of the content campaign succeeding**, and
it is invisible to the content gate (which asks "is this correct?", not "does this still fit the
box it was designed for?").

---

## P1 — materially degrades use

### P1-1 · On a phone the Probe Drill opens with ZERO pixels of the probe visible
**Lens:** mobile · **Receipt:** `scratchpad/mob/entry-360-drill-entry.png`

360×800, entered as a user does (tap Probe Drill from Walkthrough), scrollY=0. Fixed `.seg`
occupies 0–61, fixed `.mockcta` 728–800 → live band 667px. `.qq` top = **742** → **0px visible**.
`#adv` ("Reveal answer") top = 830. Scroll needed to seat the question: **682px**. At 390×844 the
question shows 50px of a 52px block — one line. Reconfirmed on a second topic (notifications).

**It is not a first-visit tax.** Measured: drill @scrollY 700 → tap Whiteboard (y=0) → tap Probe
Drill (y=0, qVisible=0). The 682px is re-paid on **every return**.

What fills the fold instead: `.side-id` identity block (187px), COMPANION accordion, mode tabs,
FOCUS BY LEVEL tabs, explainer line, THIS RUN scoreboard, card head. Desktop hides this entirely
because all of it lives in the sidebar; mobile stacks it into the one scarce axis.

*Root:* `src/styles.css:678` (`.side-id` mobile block) + the drill's above-card render order.

### P1-2 · The entire content area exposes exactly ONE heading
**Lens:** a11y · **Receipt:** deep light-DOM + all-shadow-root scan, 2 topics × 9 panes

`#notifications/walk` returns `renderedHeadings: 1` — the `h1` topic name. Repeated across all
nine panes: `headingCount: 0` inside every pane subtree. Second topic, different room
(`#rate-limiting`): same. **Positive control:** the same scanner on `#home` returns `h1` +
two visible `h2`s — it finds headings when they exist.

Across 46 topics × 9 panes of deliberately-structured study content, the rotor / H key /
"Landmarks and Headings" dialog returns one item: the topic name the user already knows. The
visual hierarchy is clear on every pane; **none of it reaches the accessibility tree.**

> ⚠️ **Receipt correction — verified on disk, this synthesis pass.** The lens reported
> `#stagehead` as `class="stage-head heading" tabindex="-1"`. Neither is true.
> `src/index.html:122` is `<div class="stage-head" id="stagehead"></div>`; the "heading" it saw
> is **`headin`**, the entry-animation class (`styles.css:1034`), added at `shell.js:575`. And
> **no `tabindex` is set on it anywhere** — the only `tabindex` reads in `shell.js` (:155, :307)
> are a read-only focusability test.
> **The finding stands** (the heading-count measurement is independent and positively
> controlled; `role`/`aria-level` are genuinely absent). **The suggested fix is understated:**
> it needs `tabindex="-1"` added as well, not just `role="heading" aria-level="2"` — which also
> makes it a prerequisite for P2-9's fix, not a freebie.

---

## P2 — real friction (17), ranked by value-per-effort

### P2-1 · The whole flow spine navigates WITHOUT the router — URL, title and history freeze
**Lens:** desktop-ux · **Verified on disk this pass ✓**

`src/scripts/app/session-progress.js:170` calls `switchTab(rec.tab)` directly. The contract it
skips is stated verbatim two files over — `src/scripts/app/shell.js:71-73`:

```
/* Intent -> Router.navigate (updates the URL hash + history) -> ViewManager -> switchTab. */
function goView(t) { if (window.Router) window.Router.navigate(t); else switchTab(t); }
```

The seg buttons and the Q..O hotkeys use `goView`. **`flowGo` is the outlier — and every flow
affordance funnels through it:** the dock CTA, the `n` key, all four terminal `.flow-go` strips,
and the mobile NextUp chip.

Measured live: press `n` → pane moves to drill, hash stays `#…/walk`, title stays "Walkthrough".
Downstream — **reload** after the dock CTA lands back on `walk` (the app discards the pane it
just sent you to); **Back** skips the dock navigation entirely; `#copylink` copies the wrong pane.

*Why it ranks first:* one line at one funnel repairs six affordances and four user-facing
guarantees. Highest value-per-effort in the audit.

### P2-2 · `--ease-spring` is a self-referential dead token — the controls using it have NO transition at all
**Lens:** interaction/motion · **Verified on disk this pass ✓**

`src/styles.css:75` is literally `--ease-spring:var(--ease-spring);` — a cycle, invalid at
computed-value time — shadowing the valid `cubic-bezier(.34,1.56,.64,1)` at
`src/tokens.generated.css:154`. Live: the token computes to the **empty string** while its
neighbours resolve fine.

The failure is worse than a wrong curve: an invalid `var()` in a shorthand resolves the **whole
declaration** to `unset`. Measured — `.inttog-dot::after` (the toggle knob) → `transition: all`,
`0s`; `.mock-x` → `0s`, killing all five of its declared transitions.

Concretely: the "Interviewer cuts in mid-answer" toggle animates its **track** over 250ms while
its **knob teleports** — the one micro-interaction where motion carries the whole meaning, broken
in a way that reads as a rendering bug.

*Fix:* delete line 75. (Line 74's `--ease-out:var(--ease-glide)` is a legitimate alias — keep it.)
*Latent trap:* any future `var(--ease-spring)` silently kills its transition too, invisibly to
both VR and the console.

### P2-3 · Core-loop controls fall back to Chrome's UA focus ring — the shadow-boundary fix was applied to one class
**Lens:** interaction/motion **+** a11y — **CROSS-CONFIRMED, two independent lenses**

`#jm` / `#js` / `#jg` (Missed / Shaky / Solid), `#adv` (Reveal answer) and the mode toggles all
compute `outline: auto ~0.7–0.8px rgb(16,16,16)`, offset 0 — with `:focus-visible` confirmed
genuinely active. Light-DOM control, same instrument, same page: `.seg button` →
`outline: solid 1.6px rgb(0,107,99)` at 2.4px offset.

Cause verified by dumping the drill root's `adoptedStyleSheets`: exactly four `:focus-visible`
rules exist there (`.flow-go`, `.revset-b`, two focus landing-pads). There is **no generic
`button:focus-visible`**, so the document rule at `styles.css:53` cannot reach any other shadow
control. This is prior **#20** — the fix landed correctly for `.flow-go` and was applied as a
spot fix rather than to the pattern.

A keyboard-driven trainer that ships 1/2/3 grading gives a ~1px near-black hairline to exactly
the controls that matter most, weakest in dark mode on a near-black card.

*Fix:* one generic `button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}` in the
shadow BASE_SHEET (`base-styles.js`) — covers grade buttons, `#adv`, toggles and every future
shadow control, and makes the existing per-class rules redundant instead of load-bearing.

### P2-4 · Desktop topic switcher shows 2.5% of the current topic name
**Lens:** desktop-ux · **Verified on disk this pass ✓** · **Receipt:** `shots/d05-topic-switcher-clipped.png`

`.tn-current` clientWidth **4px** vs scrollWidth **159px**. Identical at 1024/1280/1440/1600/1920
— the sidebar is fixed-width, so `.tn-trigger` is 131.6px at all of them; the "REHEARSING"
eyebrow eats 77px and the chevron 8px, leaving 4px for `flex:1`. The control renders as
`⌂ ‹ [REHEARSING S⋮ ▾] ›`, which reads as a rendering glitch.

**The remedy is already written** — `styles.css:1658-1677` wraps the trigger and gives the eyebrow
its own line — but it is gated to `@media(max-width:600px)` and never reaches the desktop sidebar.
The team's own comment sets the standard this fails: *"a switcher whose current value is
unreadable is still a bad control, and 91px -> 6px of clipping is real."* Desktop is 155px → 4px.

Not content loss (the sidebar `<h1>` above carries the full name) — but the primary
topic-switching control never shows what it is set to, on all 46 topics, at every desktop width.

### P2-5 · The cram sheet outgrew its own design point — on both viewports
**Lenses:** desktop-ux **+** mobile — **CROSS-CONFIRMED, two viewports, two lenses**

*Desktop (1280×800, body 704px):*

| topic | tallest step | median answer | sheet | screens |
|---|---|---|---|---|
| content-pipeline *(hand-coded flagship)* | 70px | 103 ch | 3212px | 4.6 |
| observability | 93px | 205 ch | 4799px | 6.8 |
| consistent-hashing | 186px | 362 ch | 6127px | 8.7 |
| **sharding-strategies** | **302px (13 lines)** | **673 ch** | 6855px | **9.7** |

*Mobile (360×800):* `.cram-body` scrollHeight **7967** vs clientHeight 692 = **11.5 screens**,
with panel controls exhaustively `×` and **Print** — `querySelector('nav,[class*=toc],[class*=jump]')`
returns null. No TOC, no section jump, no progress cue.

The pair also carries **no structural separation**: `.cs-cue` computes `display:inline`,
`font-weight:400` — byte-identical to the answer's weight and size, separated only by a 2.41:1
colour step. `cram-derive.js:69-72` states the artifact's own contract: *"read five minutes before
a loop with zero repair context, so a prompt -> recall pair both stands alone AND rehearses
better than a bare spine line."* You cannot cover an inline continuation to self-test — so it is
not a prompt→recall pair, it is one paragraph with a colour shift.

*Root:* `cram-derive.js:76-80` composes the pair inline; the composition is correct and the
flagship proves the design works at ~103-char answers. It is the campaign-length authored
`wb.steps[].a` the inline layout cannot carry. Mobile's premise — a glanceable last look on the
way in — is the one this hurts most, and Print is the least useful affordance on a phone.

### P2-6 · At 1280×800 only 4 of 9 pane tabs are above the fold
**Lens:** desktop-ux · **Receipt:** `shots/d25-sidebar-fold.png`

`.sidebar` scrollHeight **1662** vs clientHeight 800. Visible: walk, drill, wb, sys. Below the
fold: trade, model, num, rf, open. The 614px above the nav holds brand, ARC chip, topic `<h1>`,
FOCUS chip, switcher row, Continue dock, Mock CTA, the interrupt toggle, **Text size**, and the
**Focus Timer**.

Over half the app's surfaces are invisible on first landing on any topic, and the chrome pushing
them down is a pomodoro and a font-size control — set-once controls above a nav used every few
seconds. Mitigated (not solved) by the Q..O hotkeys and sidebar scrolling.

### P2-7 · Landscape (844×390) has no layout of its own
**Lens:** mobile · **Verified on disk this pass ✓**

Fixed chrome = 132px of a 390px viewport (**34%**); `.side-id` is still 185px, leaving **78px** of
content on the first screen. `.qq` top = 699 → not visible. No horizontal overflow — the failure
is purely vertical. The 844px of width is spent on nothing: the room badge stretches full-width
for two words.

I confirmed the structural claim: `@media … max-height` returns **zero** hits in `styles.css`, and
the single `orientation` match is `text-orientation` at :1532. Landscape is what a user reaches
for when they want more room to read a long answer, and it delivers less.

### P2-8 · The grade row walks off-screen every time you tap "Interviewer pushes further"
**Lens:** mobile · **Receipt:** `scratchpad/mob/drill-360-after-reveal.png`

At scrollY 968.8 with the answer revealed, `#jm/#js/#jg` sit at top 503 — in view, well-sized
(88.1×58.4). Tap `#adv`: scrollHeight 2939 → 3370, scrollY **unchanged**, grade buttons move to
top 933 — **205px below the bar**, with no scroll compensation. The fixed bar at that moment reads
"▶ Mock run · Tools" — **no grade affordance at the judgment point** (`.nd-m` is deliberately
hidden on the drill pane).

The shipped audit-#4 fix genuinely solved the desktop half; on mobile the row it added is the last
thing in the card, so the app's own "push further" path shoves it out of view, once per follow-up,
on a chain of 2–3.

### P2-9 · Pane-jump keys announce the new pane but never move focus — content is 28–35 Tab stops away
**Lens:** a11y

Press `w` from BODY → hash and live region update, `document.activeElement` is still `BODY`. The
first control inside the drill shadow root is Tab stop **#36** (34 chrome stops before it);
re-measured after `w`, **28**. `skipCandidates: []` — no skip link.

The keyboard model is otherwise excellent (one keystroke per pane; Space/1/2/3 work straight from
BODY so the highest-traffic loop needs no Tab). But for panes without a single-key action the jump
buys nothing, and an SR user hears "Probe Drill" while focus sits 34 controls upstream.

*Fix:* focus `#stagehead` in `goView`. **Note the corrected prerequisite from P1-2:** `#stagehead`
does **not** currently have `tabindex="-1"` — it must be added. Ship with P1-2.

### P2-10 · The seg strip never tells AT which pane is active
**Lens:** a11y · **Verified on disk this pass ✓**

All nine seg buttons return `ariaSelected: null, ariaCurrent: null, ariaPressed: null`.
`src/scripts/app/shell.js:54` is the sole state write and toggles a class, nothing else:

```js
for (let i = 0; i < segBtns.length; i++) segBtns[i].classList.toggle('on', segBtns[i].getAttribute('data-tab') === t);
```

The app does this correctly elsewhere — `panels.js:239` and `topic-nav.js:29` emit
`aria-current="true"`, and the recommended tab already carries `aria-describedby` →
"Recommended next". So AT users can hear which pane is *recommended* but not which one they are
*in*. One line, same loop, zero visual change.

### P2-11 · Search-as-you-type stalls ~150–290ms on the first two keystrokes
**Lens:** performance · **Verified on disk this pass ✓** (no debounce at :102; no cap at :350)

@4× CPU throttle, **validated under real typing** (`page.keyboard.type` after a real `/`), worst
rAF frame gap per keypress across 3 reps: `c` = **197 / 258 / 245ms**, `a` = 151 / 116 / 161ms,
remaining chars 68–100ms. Latency tracks rendered node count (`c` → 55 result buttons / 543 nodes;
by char 5 → 5 / 42). `renderResults` clears `innerHTML` and rebuilds the **uncapped** list per
keypress, attaching 3 listeners per item.

Genuinely new — in no prior. It lands on the first character a user types, on the keyboard-first
path the app advertises in its own hint strip. Self-corrects by char 3, which is why it is P2.

*Fix (highest leverage first):* cap the rendered list (~30 + "N more"); delegate the per-item
listeners; skip/defer the render under 3 chars.

### P2-12 · Drill first-activation still costs 227–357ms — unchanged since D3 · **DISPOSITION: WON'T-FIX**
**Lens:** performance

Two independent runs @4×: p50 **262ms** (226.8–287.2) and p50 **318.5ms** (251.9–356.8). Against
audit #2 (218/276/326) and D3's calm base (259.2) — **same; no regression, no improvement.** Not
noise: same cycles gave a no-op click 9.2ms and a re-click of the already-active pane 25.1ms.

Recorded for visibility, **not for a wave.** D3 already killed the four obvious levers, and proved
the cost is *above* the fold (containment reaches only ~11–12ms). A real fix means restructuring
the drill's visible first-paint content — a product decision. **Do not re-chase.**
*(Note the overlap: P1-1 is that same above-the-fold content on mobile. If W2 reworks it anyway,
re-measure this for free — but do not open it as a perf task.)*

### P2-13 · The motion hierarchy is inverted: a pane switch gets 500ms, a whole topic switch gets 150ms
**Lens:** interaction/motion · **Receipt:** `scratchpad/pane-crossfade-at-90ms.png`

Web Animations API on a real seg click: `paneinDark` on `.pane.on` → `duration === 500`;
`stagefade` on `.stage.topicswap` → `duration === 150`. Per-frame sampling through one pane
switch: 8ms op=0 blur(2px) / 98ms op=0.50 blur(0.99px) / 198ms op=0.79 / last blurred frame at
**482ms**. Light is worse — `panein` starts at blur(3px).

The app's most-repeated navigation action carries its longest transition; the far larger context
change (new topic, new title, new room, new content behind all 9 tabs) takes 150ms. Compounding
it, `.stage-head.headin` is 250ms, so the header settles while the body is still fading — the
screen reads half-loaded rather than as one movement. 500ms also sits outside the 150–250ms band
the rest of the app uses, including its own overlays.

*Fix:* `.pane.on` → `--duration-moderate` (250ms) or `--duration-base` (200ms); consider dropping
the blur (it, not the opacity, is what makes the first 100ms unreadable).

### P2-14 · The home screen is the only surface with no typographic identity
**Lens:** visual-design · **Verified on disk this pass ✓**

Space Grotesk is genuinely embedded (`fonts.css:1`, woff2 data URI) and genuinely used — a deep
traversal counts **198 live elements** on a topic route (`.sh-name` 24px, sidebar h1 21px,
`.cmp-topic` 24px, `.step-t` 18px, `.dec-q`, `.mscript-h`, mermaid labels). On `#home` the count
is **ZERO**. Largest type on the home screen: `{fs:20, cls:'hm-cta-t', ff:'-apple-system'}` — the
peak of the first impression is 20px of system UI. The fold census returns 8 distinct sizes with
12px alone carrying five different roles.

The craft already exists twelve pixels away. This is a placement problem, not a craft problem.

### P2-15 · 70% of the home screen's text renders in Arial
**Lens:** visual-design · **Verified on disk this pass ✓**

Live census under `.homev`: `{uaArial:147, appSegoeUI:56, mono:6, total:209}` — **70.3% Arial**.
Computed family is the bare string `"Arial"` at 13.3333px — Chrome's UA `<button>` default,
confirming these are buttons that never re-declare the family (verified: `.ix-cross` is
`<button class="ix-cross" type="button">` at `panels.js:190/194`, and `styles.css:1611` declares
no `font-family`). Child spans set size and weight but not family, so `.ix-c-name`,
`.ix-c-thesis` and `.ix-c-tail` all inherit it.

Not notional: the app stack measures 409.96px for a test string, Arial 420.23px — a 2.5%
divergence in a different typeface. The correct siblings prove the pattern: `.hm-room`, `.hm-cta`
and `.hm-act` all declare `font:inherit` and render correctly.

**Six room cards in Segoe UI, 46 topic cards immediately beneath them in Arial** — two typefaces
stacked vertically on the primary browse surface, invisible to a code reader and visible to a
designer. Four `font:inherit` declarations delete it.

### P2-16 · The home hero is painted in the retired brand indigo — a seventh colour belonging to no room
**Lens:** visual-design

Light, on architecture-apis: root `--acc` = `#963D86` but `.hm-cta` computes `rgb(83,74,183)` =
`#534AB7`, because `.ix-panel` re-binds `--topic-ink` and `.hm-cta` is nested inside it (verified:
`ctaInsidePanel=true`, `brandInsidePanel=false`). Dark: hero renders `rgb(157,147,240)`, matching
**none** of the six dark room inks. `styles.css:63` states the indigo *"lives only in the favicon
+ badge now."* Meanwhile the six room cards are perfectly disciplined, and `.hm-brand` sits
*outside* `.ix-panel` and wears the current room — two unrelated accents ~130px apart.

The neutralisation rule is good and deliberate — surfaces listing *all* rooms should be neutral —
and the same comment block reasons that `.tn-trigger` *should* wear the current room because
"that control names the CURRENT topic." **The hero names ONE topic.** By the codebase's own stated
principle it should wear that topic's room; it is neutral only because of where it sits in the DOM.
The largest, most saturated object on the first screen is the one whose colour means nothing.

### P2-17 · `.mockbtn` is the only primary CTA that changes visual grammar between themes
**Lens:** visual-design · *(weakest P2 — see note)*

Light: `.push` (Reveal answer) and `.mockbtn` (Mock run) are both gradient slabs with white ink —
identical grammar. Dark: `.push` is still a gradient slab; `.mockbtn` becomes an **outlined ghost**
(flat fill, 0.8px accent border, accent text) via a one-line override at `styles.css:534`, which
also opts it out of the documented `--on-slab` contract.

In dark, every other sidebar control is also an outlined dark card, so the primary is
differentiated by hue alone — while the drill's primary, 20px away, keeps the full filled
treatment. One component, two grammars for "primary."

*Note:* this is downstream of the **fix** for prior P1 #3 (which correctly flattened the dock).
The dock/Mock distinction is solved; Mock/Reveal consistency was the cost. Reasonable people could
call this P3 — nothing is degraded, only inconsistent. Flagged as the P2/P3 boundary case.

---

## P3 — polish (13)

| # | Finding | Lens | Note |
|---|---|---|---|
| P3-1 | **Prior #14 STILL OPEN** — dock says "Back to the drill" on the very first open of a brand-new topic. Verified genuinely cold (localStorage cleared, "0 of 46 started"): `KEEP GOING / Back to the drill → / 0 of 21 graded`. Branch at `session-progress.js:59` is unconditional on `dDone<dTot`, so it covers `dDone===0`. | desktop-ux | First-run copy asserting a return that never happened, beside a receipt that contradicts it |
| P3-2 | **Prior #22 STILL OPEN, and sharper** — after a mid-drill reload the tiles read `0 SOLID · 0 REVISIT · 18 LEFT` at Probe 4/21. The contradiction is now *internal to one widget*: "18 LEFT" derives from the restored record (21−3), Solid/Revisit from the empty live set. The three tiles do not sum and cannot both be true. | desktop-ux | Prior framed it as dock-vs-tiles; the sharper form is tiles-vs-themselves |
| P3-3 | **New regression from the #23 fix** — the recommended-next pip now sits **1px** from its label ("●Probe Drill"). Vertical centering was correctly fixed (`styles.css:619`) but `left:var(--space-5)` was inherited from the horizontal strip, where the pip sits in a corner, not beside text. | desktop-ux | Same cost as the orphaning it replaced: the signal doesn't land |
| P3-4 | `.dec-tell` renders 7–11 lines of 700-weight saturated green on ~38 topics. Flagship: `[2,2,2,2,3,2,3]`; multi-region: `[6,7,8,11,7,7,6]`. Source lengths: flagship median **80** chars vs corpus median-of-medians **327**, longest **757**. Nothing clips. | desktop-ux | Same root as P2-5 — a punchline style carrying paragraph content |
| P3-5 | Sub-44px touch targets, **systematic** in Numbers: every input across 6 topics measures **136.2×39.2** (`num/logic.js:28` has padding but no `min-height` — verified). Also `#scrolltop` 39.6², cram `×` 32 wide. Two genuinely fail WCAG 2.5.8 AA (24px): kafka viz range **140×16**, `#hm-skip-cb` label strip **272×18**. | mobile | 39.2 clears AA, misses the 44px floor the rest of the app meets; one `min-height` fixes ~25 inputs |
| P3-6 | Three chrome buttons delete the ring outright with `:focus{outline:none}` — `.ix-c-reset` (:1475), `.cmp-fold` (:1528), `.cmp-reopen` (:1530). `.cmp-fold:focus` (0,2,0) outranks `button:focus-visible` (0,1,1). What survives is an opacity change **byte-identical to its own `:hover`** — focus and hover are the same event. All three target `:focus`, not `:focus-visible`. | a11y | Same family as P2-3, different mechanism (light DOM, explicit removal) |
| P3-7 | The text-size control is entirely silent to AT and its ceiling is +16%. 8 presses → **zero** live-region utterances; no `aria-valuenow`/`valuetext`; at the ceiling `A+` takes `disabled` and silently leaves the tab order. `LEVELS = [0.85 … 1.16]`. | a11y | Real 200/400% browser zoom is clean — a control-quality gap, not a 1.4.4 failure |
| P3-8 | The sidebar `<aside>` (30+ tab stops) and `<main>` have **no accessible name** — verified `src/index.html:23` and `:121` carry none, while `nav#topicnav` ("Switch topic") and the companion aside ("Rehearsal companion") do. Two complementary landmarks, one named. *(Confirmed not landmark pollution: closed overlays resolve `exposed:false`.)* | a11y | Landmarks are the fallback when the heading list is empty — i.e. always (P1-2) |
| P3-9 | The Continue dock is the least responsive control in the app: `#ndock` and `.nd-go` both compute `transition: all` (0s), `animation: none`; regex confirms **no** `.nd-go:active`, no `.dock` transition/animation rule anywhere. Peers: `#mockopen` and `.crambtn` both carry full transform+shadow transitions. Because `.dock` has no motion at all, its guidance swap is an instantaneous substitution in peripheral vision. | interaction | The element whose job is "the situation changed" changes silently |
| P3-10 | The 9–10px uppercase label is one role rendered ~29 ways: **10** letter-spacing values (0.2→1.8px), 3 weights, 3 typefaces, 4 radii. At 9px, tracking *is* the craft variable. | visual-design | Systemic tidy — see *Parked* |
| P3-11 | The spacing token layer is a 1:1 pixel passthrough — 62 tokens including every integer 1→20. `--space-19/39/43` exist only because someone once wrote 19/39/43px. Home's five stacked sections use five different gaps (24/16/18/26/30). `var(--space-13)` looks disciplined and means "13px, chosen ad hoc." | visual-design | Systemic tidy — see *Parked* |
| P3-12 | The largest type on home is a magic number from an **undefined token's fallback**: `var(--font-size-h3,20px)`. Verified — `--font-size-h3` has **0** occurrences in `tokens.generated.css`; the scale has no 20. Same for `--space-980` (**0** occurrences), used at five sites. Both render as intended. | visual-design | A phantom token with a hardcoded fallback is a scale bypass that looks like compliance |
| P3-13 | **RECORD CORRECTION, not a defect** — the 2026-07-19 audit's #8 "fast half" pane numbers do not reproduce on the audit's own build. Matched-load paired A/B against extracted build `1770c99`: rf **138** / open **242** vs the recorded rf 80 / open 98. Pane scrollHeight identical across builds. Matched deltas are sign-incoherent (rf +22.6, open −10.4, trade +42.7, viz −3.4) = noise. Current truth: **7 of 10 panes** exceed 100ms on first visit, not 5. | performance | See *Action outside the waves* |

---

## Priors — status ledger

Everything below was **re-checked, not re-discovered**, per the brief.

**Confirmed FIXED and shipped** (multiple lenses, measured live):
`#1` focus trap (floating "× Exit focus" outside the collapsed sidebar; Esc exits; reachable on
mobile at 84.6×44) · `#3` dark dock/Mock tier collapse — **independently re-verified by two
lenses** (dock now neutral `linear-gradient(#1A1921,#151419)` + `rgb(55,51,63)` border, no accent
ink; Mock CTA keeps accent border + glow) · `#4` grade at the moment of truth · `#5` scroll-top FAB
collision (now x=302, clear of the bar) · `#6` debrief misclassification · `#10` `N` in the
Shortcuts overlay · `#12` mobile NextUp chip · `#13` value prop above the fold · `#18` dock
announce (via a dedicated `[data-nd-live]` region, `session-progress.js:262-290`) · `#19` pip
text-equivalent (`aria-describedby="flowpip-desc"`) · `#21` trend double-encode (localStorage
reads single-encoded) · `#20` `.flow-go` shadow ring — **fixed, but incompletely; see P2-3**.

**STILL OPEN, re-filed above:** `#14` → P3-1 · `#22` → P3-2 · `#15` (kbd badges need a
`pointer:coarse` gate — confirmed still rendering at 14.2×18.1 with `(pointer:coarse)` true) ·
`#16` (`.inttog` display:none on mobile, no mock-overlay equivalent) · `#17` (seg strip
scrollWidth 972 vs 360, 4 of 10 tabs visible — **now cued** with a `--fr:24px` right fade +
chevron, so materially improved).

**Fixed, with a new regression:** `#23` sidebar pip — vertical anchoring genuinely fixed
(`styles.css:619`); the horizontal offset was not, producing P3-3. *(One lens checked vertical only
and cleared it; the other checked both. The two-axis reading is correct.)*

**Closed by documented choice — not an open defect:** `#24` `--accbg` double duty. Two lenses
reported this differently; the sharper receipt resolves it: the `--dock-bg`/`--dock-bd` split
**shipped** (`styles.css:376-377`) and light **deliberately** keeps `--dock-bg:var(--accbg)`
byte-for-byte, with dark flattened. A conscious deferral, not an oversight. **No wave.**

**Not re-verified:** `#25` cold-start band (3.3–5.1s). One lens declined to measure it on a loaded
box; the perf lens measured 3.47–3.78s to app-ready and **confirmed the attribution** (TTFB 43ms;
a zero-network `file://` control measured 3.43–4.76s — i.e. identical, so network contributes
~nothing and the cost is parse+eval as recorded). Consistent with the prior; not a fresh
certification. `#26` is content-lens.

---

## Explicitly demoted, discarded, or held back

Recorded so nobody re-files them, and so no claim is read stronger than its receipt.

- **Discarded as the auditors' own automation artifacts** (good discipline, worth naming): the
  "heavy ink ring" on the home hero and the black ring on `.stage-head` appear **only** under
  script-driven `.click()`; a real mouse click leaves `:focus-visible` false and no ring. Likewise
  a manufactured 3.28:1 contrast failure on `.ix-g-n` traced to a walker mis-parsing
  `color(srgb …)` — recomputed properly it is ~5.0:1 and passes. Also discarded: `.mbeat` prose at
  76.4ch (a 1.4ch miss at 1536 only), and the pomodoro's teal/amber (a documented phase signal,
  not an accent leak).
- **Held back for lack of a repro — worth watching, not filing:** twice during rapid pane
  switching the app spontaneously left the topic for `#home`. One instance is captured in a
  history trace as a bare `hashchange → home` between `pushState #model` and `pushState #num` with
  no app-initiated navigation. **30** subsequent instrumented switches (all history APIs trapped)
  did not reproduce it. No root cause. If anyone sees a topic→home bounce, this is corroboration.
  *(Adjacent, unexplained: every pane switch does a `pushState`, and `history.length` sat pinned
  at Chrome's 50-entry cap. P2-1's router fix will change this path — re-watch after it lands.)*
- **Not a frame-stall — explicitly NOT filed:** a first instrument reported ~1300ms click→paint on
  9 of 10 first pane activations; re-measured with a continuous rAF driver, first activation paints
  in 4–16ms. Prior #8's first-visit tax is a **build** cost, not a frozen UI.
- **Receipt-scope caveat on P3-9:** live `:hover` could not be measured in that session
  (`querySelectorAll(':hover').length === 0` even with the pointer parked). The finding's core
  receipts are structural (computed `transition: all` at 0s; regex proving no `:active` rule
  exists), so it stands — but "feels inert under the pointer" is inferred from rule absence, not
  observed in pixels.
- **All performance absolutes are UPPER BOUNDS.** The box was shared with sibling agents
  throughout; the 4× calibration spin ran 176–232ms against D3's ~158ms calm point (~11–47%
  inflated). Every comparative claim rests on same-run ranking or matched-load paired A/B, both
  load-cancelling. Do not quote the absolutes as a baseline — that is exactly the mistake P3-13
  documents.
- **One corrected receipt:** the `#stagehead` `tabindex`/`heading` claim — see the box under P1-2.

### ⚠️ Instrument hazard — two lenses hit it independently

A shared Playwright page was being driven by more than one agent. One lens observed
`location.hash` changing between its own tool calls, and `page.setViewportSize()` reporting
1280×800 while `innerWidth` was **360** — i.e. **a lens trusting `browser_resize` could measure
MOBILE while believing it measured desktop.** A second lens independently produced **59/60 invalid
rows** before catching that its viewport override was being silently reset.

Three lenses isolated into dedicated contexts and re-took every load-bearing number
(visual-design, desktop-ux, mobile); performance used its own CDP session. Two lenses
(interaction/motion, a11y) did not state isolation. Most of their findings are
viewport-independent by nature — computed styles, animation durations, ARIA attributes, heading
counts, `adoptedStyleSheets` dumps — so exposure is low, but the **Tab-count (28–35)** in P2-9 is
the one number in that set worth re-taking at a known viewport before it is used as a target.

**Standing lesson for the house's parallel-lens pattern:** a shared browser page is not safe for
concurrent lenses. Assert `innerWidth` on every measurement, or give each lens its own context.

---

## Candidate waves

Four waves. House pattern: **worktree-isolated build → serial verified merge**, watched-red where
mechanically checkable, and VR-aware — **16 pixel baselines** guard the panes, and the sidebar
appears in most of them, which drives the grouping below more than theme does.

> **VR blast radius is the sequencing constraint.** W1 should change **zero** pixels (that is its
> own check). W3 changes `home-light`/`home-dark` intentionally. W4 changes the sidebar, which is
> present in ~7 baselines. W2 changes `m-walk-light`/`m-walk-dark` (+ `num-light` if the touch
> targets land there). Sequence **W1 → W3 → W2 → W4**, or run W1 and W3 in parallel worktrees
> (disjoint files, disjoint baselines) and keep W2/W4 serial — they are the two that need a
> reviewed rebaseline.

### W1 — "Finish the spot fixes" · effort **S** (half day) · VR: expected **zero-diff**
The correctness-and-completion wave. Every item is a one-to-few-line change with a verified
`file:line`, and **every one is mechanically checkable** — this is the watched-red wave.

**Scope:** P2-1 router bypass (`flowGo` → `goView`, one funnel, repairs dock + `n` + 4 terminal
strips + mobile chip) · P2-2 delete `styles.css:75` · P2-3 generic `button:focus-visible` in the
shadow BASE_SHEET · P2-10 `aria-current` in the `shell.js:54` loop · P2-13 `.pane.on` 500ms →
250ms · P1-2 + P2-9 together (`role="heading"` + `aria-level` + **`tabindex="-1"`** on
`#stagehead`, and focus it in `goView`) · P3-6 re-scope three `:focus{outline:none}` rules to
`:hover, :focus-visible` · P3-8 landmark names · P3-7 text-size `announce()` + `aria-disabled` ·
P3-9 `.nd-go` motion contract + `.dock` entry animation · P3-1 and P3-2 (the two still-open
priors — copy branch on `dDone===0`; one basis for all three scoreboard tiles) · P3-3 pip
horizontal offset.

**Checks to add (all can fail loudly):** assert every `--ease-*`/`--duration-*` token computes
non-empty on the built page (this class of bug is invisible to VR *and* the console) · assert
`location.hash` changes after `n` (extend `test/flow_data.cjs`, and pin the
navigate→switchTab ordering so `rec.weak`/`rec.wbreset` can't regress) · assert `aria-current`
on the active seg button · assert `outline-style !== none` on the three chrome buttons under
`:focus-visible` · assert `renderedHeadings > 1` on a topic route.

**Why it is one wave:** P1-2 and P2-9 share an element; P2-3 and P3-6 are the same *question*
(does focus look like this app?) through two mechanisms; the rest are independent one-liners that
would otherwise each pay a full worktree+merge cycle. Highest value-per-effort in the audit sits
here (P2-1).

### W2 — "The phone gets a vertical budget" · effort **M** (the big one) · VR: `m-walk-*` rebaseline
**Contains the P1.** One root cause, verified on disk: **zero** short-viewport media queries.

**Scope:** P1-1 (collapse `.side-id` to a single line once a pane is active; put mode + level
behind a compact disclosure; preserve per-pane scroll or `scrollIntoView` the probe card —
**target: the question's first line inside the live band at scrollY 0 on 360×800**) · P2-7 add one
short-viewport breakpoint, e.g. `(max-width:919px) and (max-height:480px)` (reclaiming the 185px
identity block alone takes landscape first-screen content from 78px → ~263px) · P2-8 sticky judge
row at `stage>=1`, or swap the bar's Mock slot for Missed/Shaky/Solid (`.nd-m` already proves the
bar can host a contextual control without changing height) · P3-5 `min-height:44px` on
`.ninp input` + `#scrolltop` + cram `×`, and raise the two genuine sub-AA targets · P2-5's mobile
half (sticky section chip-strip; demote Print on coarse pointers).

**Brief it as ITERATION, not one-shot.** This is real responsive design against a fold budget —
the most likely wave to need a "you missed one" round. Keep the fixer warm; use an independent
verifier. Free bonus: if the drill's above-fold content is restructured here, re-measure P2-12 —
that is the only lever D3 left standing.

### W3 — "Home looks like the product" · effort **S–M** · VR: `home-light` + `home-dark` **will** change
The first-impression wave. Four findings, one surface, one theme — and every item is a
declaration-level change that borrows identity the app **already paid for**.

**Scope:** P2-14 `font-family:var(--display)` on `.hm-cta-t` + the two `.hm-h` section heads ·
P2-15 `font:inherit` on `.ix-cross`, the `.ix-c-*` cards, `.ix-g-cram`, `.ix-io` (fold `.ix-io`'s
bespoke stack into the body stack) · P2-16 scope the `.ix-panel` neutralisation to the genuinely
all-rooms lists so `.hm-cta` wears its destination's room · P3-12 point `.hm-cta-t` at
`--font-size-display` (24px, on-scale — this *is* P2-14's fix) and `.hm-cta-ar` at
`--font-size-heading`; add a real token for `--space-980`.

**Checks to add:** any `<button>` with neither `font:inherit` nor an explicit family is a latent
Arial — cheap `check_all` guard · grep for `var(--[a-z-]+,<literal>)` to catch the next phantom
token.

**The deliverable is the VR diff itself.** This wave's whole point is that home changes visibly —
rebaseline *and* put the before/after in front of the operator. Note the intent: Space Grotesk at
24px is **quieter** than most apps' 32px system-bold; nothing here adds colour, weight or motion.

### W4 — "Long content, and the sidebar that hides the app" · effort **M** · VR: sidebar → ~7 baselines
**Grouped by VR blast radius, not by theme — and that is deliberate.** Two sub-scopes; both touch
surfaces in most topic baselines, so one rebaseline and one review covers them.

*Sub-scope A — the campaign's presentation debt (shared root: flagship-sized styles carrying
2–6.5× prose):* P2-5 desktop half — `.cs-cue{display:block;font-weight:bold}`, drop the inline
`.cs-arr`, and/or slice `.a` to its first sentence (the full text is one tab away in the
whiteboard; the sheet is a summary artifact by its own design note) · P3-4 `.dec-tell` →
medium weight, letting the authored `<b>` spans carry emphasis; optional ~3-line cap with
disclosure (~38 of 46 topics would use it).

*Sub-scope B — sidebar geometry:* P2-4 lift the existing wrap rule out of the ≤600px gate into
the `min-width:920px` sidebar block · P2-6 reorder so the 9-pane nav sits directly under the Mock
CTA, pushing Text size + Focus Timer below it (~150px, taking 7–8 tabs above the fold at 800px;
cheaper interim: collapse the timer to a one-line chip until started).

**Checks to add:** per-topic cram sheet height ceiling in `test/cram_surface.cjs` · `.tn-current`
clientWidth/scrollWidth in `test/04-reflow.mjs` at **desktop** widths, not just ≤600.

**Operator gate:** sub-scope A is a typographic judgment call ("drop the blanket bold", "truncate
the answer"). Reversible, but taste-dependent and it touches how authored content reads —
worth a before/after look before it merges.

### Parked — deliberately in no wave

- **P3-10** (29 tracking values) and **P3-11** (62 pass-through spacing tokens) are **design-system
  tidy with no user-visible defect**. Real observations, honestly filed, and the right move is to
  do them *as part of* a future systemic pass (two or three tracking tokens; a semantic
  `--gap-section`/`--gap-block` layer over the primitives) — not to open a wave that changes many
  pixels for no felt improvement. Note the asymmetry the audit itself surfaced: type and colour
  are contract-enforced pillars here; **space is the hollow one**.
- **P2-12** drill first-activation — evidenced won't-fix. Do not re-chase.

### Action outside the waves

**P3-13 is a one-line docs commit, not code.** Amend item #8 in
`_audit/2026-07-19-postship-cold-audit.md` to record that its "fast half" figures for `rf` and
`open` are **not reproducible on the build they were taken from** (re-measured on `1770c99`:
rf ~138, open ~242), and that the current count is **7 of 10** panes over 100ms. Do this
**before** any future perf wave — left uncorrected it presents as a clean 2.2–2.7× regression and
burns a cycle chasing a cause that does not exist. Any future perf comparison must be a
matched-load paired A/B against an extracted historical build (`_perf/ab.cjs`), never a diff
against a recorded absolute from a different session and a different box.

---

## What this audit does NOT cover

Stated plainly so the coverage is not over-read.

1. **Content correctness.** Separately certified at zero known defects. No lens here judged
   whether a probe's answer is *right* — only how it renders. Where content appears in a finding
   (P2-5, P3-4) the claim is strictly about *length vs. the box it was designed for*.
2. **The operator's own dogfood impressions.** Nothing here substitutes for actually using the app
   to prepare for an interview. Six instrumented lenses measured the app; none of them *needed*
   it. Judgment calls in W4 sub-scope A especially want a real user's eye.
3. **Any browser but Chromium.** All six lenses ran Chromium/Playwright, and the VR baselines are
   `win32-chromium149`. **Firefox and Safari/WebKit are entirely unmeasured** — and iOS Safari is
   the likely real device for a cram sheet read on the way into an interview. `color-mix`,
   `adoptedStyleSheets`, shadow-piercing behaviour, `zoom`, and fixed-chrome + dynamic-toolbar
   interaction are all places Safari plausibly differs. This is the audit's largest blind spot.
4. **Real touch hardware.** Mobile used an emulated Pixel-7 context (correctly verified
   `pointer:coarse`, `hover:none`, `ontouchstart`). Emulation is trustworthy for layout, weak for
   momentum scrolling, keyboard-overlay resize, and dynamic browser chrome — all of which bear
   directly on P1-1's fold budget.
5. **Real assistive technology.** The a11y lens used a live-region monitor, computed styles, a
   Tab-order walker and a pixel-differ — rigorous, and positively controlled. But **no NVDA, JAWS
   or VoiceOver ran.** Announcement *content* was verified; announcement *as heard* (pronunciation,
   interruption, verbosity, rotor behaviour) was not.
6. **Print output.** The cram sheet's Print button is its only action and no lens exercised the
   printed result — notable given P2-5 concludes Print is the wrong affordance on a phone.
7. **Cold-start on a quiet box.** Prior #25's band was not re-certified: the box was shared all
   session. The attribution (parse+eval, not network) *was* confirmed via a zero-network `file://`
   control. Per the house rule, a perf wave needs a genuinely quiescent slot.
8. **Long sessions and memory.** No multi-hour run. The `history.length` pin at Chrome's 50-entry
   cap was observed but not investigated — and P2-1's fix changes that path.
9. **Offline / `file://` operation**, the app's actual premise, was touched only as a perf control.
10. **The unreproduced topic→home bounce** remains genuinely open (see *Held back*).

---

*Six lenses: visual-design · interaction & motion · desktop-ux flow · mobile deep pass ·
a11y beyond compliance · performance feel. 34 findings delivered, 32 distinct after dedupe.
Two findings were cross-confirmed by independent lenses (P2-3, P2-5) and are correspondingly
high-confidence. Receipts live in each lens's scratchpad; the file:line claims load-bearing to
P1-2, P2-1, P2-2, P2-4, P2-10, P2-11, P2-15, P2-16, P3-5 and P3-12 were independently re-verified
against the repo during synthesis — all held except the `#stagehead` attributes noted under P1-2.*
