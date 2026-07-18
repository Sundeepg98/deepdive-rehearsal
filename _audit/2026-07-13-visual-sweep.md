# 2026-07-13 — Visual sweep punch list (8 lenses, deduped, packaged)

**System of record.** The workflow return value is only a summary; this file is authoritative.

## Verdict

One P1 and seven P2s survive dedup across six productive lenses — nothing is P0, no rewrite is implied; the sweep found readability and identity-consistency debt, not breakage. The dominant theme is **pane-content typography**: reading prose renders at 12–13px (below the 14px desktop floor) and runs 100–129ch at 1536px, all *inside the nine shadow-DOM panes that `src/styles.css` cannot reach*. The lone P1 is a recoverable routing dead-end — browser Back from the landing index lands on a blank white page — independently **CONFIRMED** (though the verifier corrected its mechanism). Two live re-runs (`mobile-tools`, `overlays-desktop`) returned placeholder stubs — but the REAL pre-crash `mobile-tools` result survived in the workflow journal and was **recovered post-synthesis** (4 findings, overlay baseline CLEAN — see PKG-E below), so **the only true coverage gap is desktop dialog overlays** (follow-up lens dispatched same day).

## Ranked punch list (P0 → P3)

| # | Sev | Finding | Package | Owner surface |
|---|-----|---------|---------|---------------|
| 1 | **P1** | Browser Back from index → blank white empty-hash dead-end | PKG-A | app-shell JS (`router.js`) |
| 2 | **P2** | Reading prose 12–13px app-wide, below the 14px body floor | PKG-B | per-pane shadow CSS |
| 3 | **P2** | Reading measure 100–129ch at 1536px in 7/9 panes (no ch cap) | PKG-B | per-pane shadow CSS |
| 4 | **P2** | Only 3/9 pane tabs visible at 360px, weak scroll affordance | PKG-D | global `styles.css` |
| 5 | **P2** | Pervasive 9–9.5px content-bearing text on mobile | PKG-B | per-pane shadow CSS |
| 6 | **P2** | No single "body" role — 7 prose sizes; Walk 15px vs Model 16.5px | PKG-B | per-pane shadow CSS |
| 7 | **P2** | Group colour dual-sourced (JS Tailwind-600 vs CSS `--room`) — same group, two hues | PKG-C | app-shell JS (`groups.js`/`topic-nav.js`/`home-view.js`) |
| 8 | **P2** | JS `group.color` has no dark variant → dropdown/star dots 3.37:1 in dark | PKG-C | app-shell JS (same root as #7) |
| 9 | P3 | Always-visible derivation/diagram text at 9–11px (smallest in app) | PKG-B (deferred) | per-pane shadow CSS |
| 10 | P3 | 500ms entrance animations (panein/bodyIn/railin) + blur over 400ms budget | PKG-D (deferred) | global `styles.css` |
| 11 | P3 | Sub-lead lines uncapped (114ch) above 67ch beat body — measure jump | PKG-B (deferred) | per-pane shadow CSS |
| 12 | P3 | "Cram →" pills 21px tall (<24px target, desktop-only) | PKG-C (deferred) | index overlay (`home-view.js`) |
| 13 | P3 | `--topic-accent` is a dead, zero-consumer token (informational) | PKG-C (deferred) | app-shell JS (`groups.js`) |
| 14 | **P2** | Keyboard-shortcuts overlay UNREACHABLE on touch (`#keyopen` is `display:none` on mobile) + 17px grid clip at 360px | PKG-E | overlay DOM/logic |
| 15 | P3 | Overlay vertical anchoring inconsistent across dialog family (3 top offsets, 18px delta) | PKG-E (deferred) | overlay CSS |
| 16 | P3 | Mock-run overlay lands focus on `#mockbody` with an off-theme amber ring on touch | PKG-E (deferred) | overlay logic |
| 17 | P3 | Tools sheet opens with 41% (415px) below the fold, no scroll affordance | PKG-E (deferred) | Tools sheet CSS |

Counts: **P0 = 0, P1 = 1, P2 = 8, P3 = 8** (17 actionable; rows 14–17 recovered from the workflow journal post-synthesis — the resumed run's `mobile-tools` re-spawn stubbed, but the original run's real result survived. See PKG-E). One lens (`overlays-desktop`) remains genuinely uncovered; follow-up dispatched.

## Lens coverage

| Lens | Status | Usable findings | Notes |
|------|--------|-----------------|-------|
| desktop-panes | ✅ delivered | 2 (1 P2, 1 P3) | reading measure at 1536px + sub-lead measure |
| topic-identity | ✅ delivered | 3 (2 P2, 1 P3) | colour dual-source (light+dark) + dead-token probe |
| typography | ✅ delivered | 3 (2 P2, 1 P3) | app-wide size floor + type-scale + tiny labels |
| states-motion | ✅ delivered | 1 (P3) | entrance-animation budget |
| first-impression | ✅ delivered | 2 (1 P1, 1 P3) | routing dead-end (verify-CONFIRMED) + Cram pill |
| mobile-panes | ⚠️ delivered **out-of-pipeline** | 2 (2 P2) + strong negatives | fork completed the identical brief after a crash killed the in-pipeline copy; **treated first-class**. Cleared 45 loads @360 + 18 @390 across 5 topics/5 rooms: 0 page overflow, 0 sub-24px targets, 0 unreachable controls, 0 clipped content, 0 console errors. |
| **mobile-tools** | ✅ **recovered from journal** | 4 (1 P2, 3 P3) | The resumed run's re-spawn stubbed (`title:"t"` placeholder — a cache-prefix edit forced a full re-run and the fresh agent satisficed the schema), but the ORIGINAL run's real result survived in `journal.jsonl` and is recorded as **PKG-E** (rows 14–17). Its baseline sweep was CLEAN: all 42 overlay-opens across 6 topics fit the viewport, scroll to their end, scroll-lock the background, land focus inside, close on ESC, stack correctly (z-1000 over sheet z-60). |
| **overlays-desktop** | ❌ **DROPPED (stub)** | 0 | returned the same placeholder stub. **Desktop dialog overlays are the one genuinely uncovered surface** — zero findings because it was not measured, not because it is clean. Follow-up lens dispatched 2026-07-13; its findings will append as a PKG-E desktop addendum. |

## Shadow-DOM ownership constraint (read before assigning fixers)

The nine content panes (`sys`, `num`, `rf`, `trade`, `open`, `model`, `wb`, `walk`, `drill`) attach a **shadow root** via `src/scripts/app/topic-protocol.js` and adopt their CSS from the shared shadow sheets (`base-styles.js`, `shared-sheets.js`, `topic-protocol.js`) plus each pane's own logic module (`red-flags.js`, `num/logic.js`, `model-answers/logic.js`, `whiteboard.js`, …).

**Light-DOM selectors in `src/styles.css` do not cross the shadow boundary.** `styles.css` reaches the pane **host box** (`.pane`, the `.seg` tab strip, the `panein`/`railin` entrance animations — all confirmed at `styles.css:309–630`) but **not** the prose inside it (`.cmp-*`, `.opt-w`, `.rf-tell`, `.nrow-n`, `.dgm-*`, `.mbeat-t`, `.mscript-sub`, `.step-sub`).

Consequences for the cut:
- **PKG-B is fully shadow-constrained** — every typography/measure fix must be made in the shadow sheets, never in `styles.css`.
- The reading-measure fix (#3) must cap the **inner text blocks by ch** inside the shadow sheets. It must **not** be attempted by editing `.pane{max-width}` in `styles.css` — that box is **PKG-D's** surface, and capping the host would not cap the inner blocks anyway.
- **PKG-D reaches its targets** because they are host-level (`.pane` animations, `.seg` strip) — which is exactly *why* it is a clean, separate surface from PKG-B.
- **PKG-C** repaints via **JS-set inline styles / values** (`groupColorFor`, `TOPIC_GROUPS[].color`), not CSS selectors — it is a JS change, independent of both CSS surfaces.

Packages were cut so **no file appears in two packages** → parallel fixers in isolated worktrees cannot collide. Routing (`router.js`) is disjoint from the colour files (`groups.js`/`topic-nav.js`/`home-view.js`); both are disjoint from the shadow sheets and from `styles.css`.

---

## Packages

*Screenshots live under `D:/claude-workspace/_worktrees/deepdive-rehearsal/v-sweep/_sweep-shots/`. Filenames below are relative to that directory.*

### PKG-A — App-shell JS: boot & hash routing  `[1 finding · P1]`
**Owner file(s):** `src/scripts/app/router.js` (+ boot install, already at `router.js:174`). Disjoint from all other packages. **This is the one urgent package — dispatch first.**

#### A1 · P1 · Browser Back from the index lands on a fully blank white page (empty-hash dead-end)
- **Area:** boot / hash routing
- **Viewport:** 1280×800 **and** 360×740 (both blank)
- **Evidence:** On boot the app installs `#home`. Pressing browser Back **once** from the `#home` landing index navigates to `hash=''` and the viewport goes fully white at both sizes. Reproducible on every fresh session in a single Back press; entering a topic is not required. Aggravator: each pane switch also pushes a history entry, so a user who browses several panes then holds Back passes through `#home` straight into the blank state. Recovery is Forward or reload only (Forward returns to `#home`, verified).
- **verify_evidence (CONFIRMED, chromium 1.61.1, fresh context, both viewports):** Boot → `hash=#home`, `innerText.length=26091`. One `page.goBack()` → `hash=''`, `innerText.length=0`, `innerHTML.length=0`, **0 visible elements at both sizes**. In-browser canvas `getImageData`: **0 non-white pixels of 1,024,000 @1280×800 and 0 of 266,400 @360×740**; every sampled point `[255,255,255]`. Forward fully recovers (`innerText` back to 26091). `pageErrors:[]`. The app's index bg is cream `rgb(250,249,245)` — getting pure 255 proves the Back target is a genuinely blank surface, not the app index.
  **⚠️ MECHANISM CORRECTION (does not change the user-facing defect):** the claim said `#home` is installed as a **push** over a hashless entry and "the router renders nothing" at `''`. A sentinel probe refutes that: installing `#home` did **not** grow `history.length` (stayed 3) and one Back landed **directly on the prior document** (`href=about:blank`, app DOM gone: `innerHTML=0`). So `#home` is installed via **replaceState, not push** — consistent with `router.js:174` already using `replaceState`. The blank is the **tab's prior document** (about:blank when the app is the tab's entry page — the local-file-open / direct-entry case), **not** an app router state.
- **Fix (reconciled with the verifier):** Do **not** "switch the boot hash to replaceState" — `router.js:174` already does. The real work: since the app occupies a single history entry and Back unloads it, either (a) on a direct-entry boot (`history.length===1`) push one in-app `#home` guard entry so Back has an app state to catch, and/or (b) make `onHashChange` (`router.js:170`) treat `''`/unknown hashes as `#home` for the reached-from-another-page case. Rated **P1 not P0** because it is off-root and fully recoverable (Forward/reload).
- **Screenshots:** `back_past_index_emptyhash.png` (1280×800), `back_past_index_emptyhash_360.png` (360×740)

---

### PKG-B — Per-pane shadow CSS: pane typography & reading measure  `[4 findings · 4×P2 · +2 P3 deferred]`
**Owner file(s):** shared shadow sheets `base-styles.js`, `shared-sheets.js`, `topic-protocol.js` + pane modules `red-flags.js`, `num/logic.js`, `model-answers/logic.js`, `whiteboard.js` (and the sys/trade/open pane modules). **Shadow-constrained — see the boundary note above. Do NOT touch `styles.css`.**
Largest package; a single agent owns it so the shared body-size token and the per-pane classes are edited once, consistently. The systemic sizes are **byte-identical across all topics**, so the body-floor fix is a handful of edits in the shared sheets, not 38× per topic.

#### B1 · P2 · Reading prose sits at 12–13px app-wide — below the 14px desktop body floor
- **Area:** right-rail context column (`.cmp-thesis`/`.cmp-note`/`.cmp-move`/`.cmp-drive`) + center-pane supporting prose (`.opt-w`, `.rf-tell`, `.sm-intro`, `.mscript-sub`)
- **Viewport:** 1280×800
- **Evidence:** Of 410 wrapping multi-line prose blocks (≥30 chars) across 5 topics, **303 (74%) render at 12–13px** (201 @12px + 102 @13px); only 90 blocks are ≥14px. Right-rail study prose: `.cmp-thesis`=13px/400 (5.8:1), `.cmp-note`/`.cmp-move`/`.cmp-drive`=12px. Center content equally small: `.opt-w`=13px, `.rf-tell`=12px, `.sm-intro`/`.pa`=12px, `.mscript-sub`=12px. Values are **byte-identical** on content-pipeline (hand-coded) and event-driven/caching/circuit-breaker/multi-tenant (markdown) → a systemic token, not per-topic drift. Contrast is fine (5.27–5.8:1) — purely a **size** defect.
- **verify_evidence:** — (no independent verify pass recorded)
- **Fix:** Raise the base reading-body token to ≥14px in the shared shadow sheet; reserve 12–13px strictly for captions/metadata/labels.
- **Screenshots:** `11-cp-rightrail.png`, `12b-cp-trade-center.png` (opt-w 13px), `14b-cp-num-center.png`

#### B2 · P2 · Reading measure runs 100–129ch at 1536px in 7 of 9 panes (column has no ch cap)
- **Area:** pane content column (`max-width:830px` with no ch-based cap) — body prose in sys/num/rf/trade/open panes
- **Viewport:** 1536×864 (**very common — 1080p @125%**)
- **Evidence:** The content column is `max-width:830px` with **no ch cap**; at 1536 it renders ~816px wide with 11–14px body text, so prose wraps far past the 45–75ch optimum. Longest rendered line per pane (Range rects / '0'-advance), worst of 5 topics: **num 129ch** (circuit-breaker `.nrow-n`, 11px = 765px; kafka 125.7ch), sys 116.6ch (`.pa`, 12px), rf 116.2ch (`.rf-tell`, 12px), trade 112.1ch (`.dec-tell`), open 111.6ch (`.op-lead`, 14px). Even the **hand-coded** reference content is affected (sys 101.2ch, trade 108.4ch) → layout-driven, not markdown-driven. The same panes at 1280×800 all stay ≤86.9ch, so it is specific to the wide viewport. The 830px cap only engages above ~1548px and still permits ~118ch → gives no readability protection.
- **verify_evidence:** — (no independent verify pass recorded)
- **Fix:** Cap the text-bearing blocks by **ch** (`max-width ~34–42rem ≈ 60–72ch`) in the shadow sheets, or scale the column with font-size. The app already proves the pattern — the model-pane beat column (`.mbeat-t`) holds ~67ch via a fixed left label gutter. **Do NOT edit `.pane{max-width}` in `styles.css` (PKG-D surface); it wouldn't reach the inner blocks.**
- **Screenshots:** `LENS-circuit-breaker-num-1536.png` (primary, 129ch note lines); corroborating `LENS-caching-sys-1536.png`, `LENS-caching-trade-1536.png`, `LENS-caching-rf-1536.png`; clean 1280 baseline `LENS-caching-sys-1280.png` (78ch)

#### B3 · P2 · Pervasive 9–9.5px text on mobile, some content-bearing
- **Area:** content-bearing @9px — wb `.dgm-lbl`/`.dgm-note`/`.dgm-foot`, sys `.chip`/`.chip-dest`/`.here`, drill `.qk`/`.sigtag`/`.tier`; @9.5px — model `.l-frame`/`.l-head`/`.l-risk`/`.l-trade`. (Chrome @9px `.tn-eyebrow`/`.cmp-h`/`.arc-h` is P3-grade; borderline 11–11.5px `.fb` code chips carry function signatures.)
- **Viewport:** 360×740 (counts unchanged at 390×844)
- **Evidence:** 16–69 visible elements <12px per pane (content-pipeline drill=69, wb=68); sizes cluster at 9px, then 9.5/10/10.5/11/11.5. Body copy unaffected (~15px). **Dedup note:** the `.dgm-*` 9px labels here are the *same token* as deferred finding D9 (typography-C, desktop) — one edit fixes both viewports.
- **verify_evidence:** part of the out-of-pipeline replication; strong negatives cleared alongside (0 overflow, 0 sub-24px targets, 0 clipped content across 45+18 loads).
- **Fix:** Lift content-bearing labels to ≥11–12px in the shadow sheets; if space-constrained, shorten copy rather than shrink type. Leave true chrome/eyebrows as-is.
- **Screenshots:** `content-pipeline-walk-360.png`, `content-pipeline-sys-360.png`

#### B4 · P2 · No single "body" role — reading prose spans 7 sizes; the two primary bodies disagree (Walkthrough 15px vs Model Answers 16.5px)
- **Area:** type-scale consistency — Walkthrough (`.ins`/`.body`) vs Model Answers (`.mbeat-t`) vs right rail (`.cmp-thesis`)
- **Viewport:** 1280×800
- **Evidence:** Distinct normal-weight reading-prose sizes = **9, 11, 12, 13, 14, 15, 16.5px (7 steps for one role)**. Flagship bodies disagree: Walkthrough `.ins`/`.body`=15px/lh1.6 vs Model `.mbeat-t`=16.5px/lh1.6 — same tier, 1.5px apart. "Lead paragraph" is also split: right-rail `.cmp-thesis`=13px vs center `.lead`/`.numlead`=14px. Reproduces identically across 5 topics → designed-in, not random. Effect: text size no longer reliably signals role.
- **verify_evidence:** — (no independent verify pass recorded)
- **Fix:** Collapse reading prose to a 2-step scale (e.g. 15px primary / 13px secondary); make Walkthrough and Model Answers share **one** primary-body token. (Pairs naturally with B1 — do both in one pass.)
- **Screenshots:** `15-cp-model-full.png` (16.5px body) vs `10-cp-walk-full.png` (15px body)

---

### PKG-C — App-shell JS: group-colour single-sourcing + index-overlay chrome  `[2 findings · 2×P2 · +2 P3 deferred]`
**Owner file(s):** `src/scripts/app/groups.js` (`TOPIC_GROUPS` at `groups.js:8` — the divergent `color` field, the root), `topic-nav.js` (`.tn-g-dot` dropdown dots), `home-view.js` (`.ix-star-pill` starred pills + the "Cram →" pills). JS-driven inline styling; independent of both CSS surfaces. **C1 and C2 share one root cause and one fix.**

#### C1 · P2 · Six groups have two divergent colour sources — nav dropdown dots + starred pills use JS Tailwind-600 hex, everything else uses the CSS `--room` palette
- **Area:** group colour system — `.tn-g-dot` + `.ix-star-pill` vs index dots/cards/room-badges
- **Viewport:** 1440×900 (light; also holds in dark)
- **Evidence:** The 6 groups are defined **twice**. CSS `--room-*`=`--topic-ink` (architecture #963D86, reliability #924E00, security #A73A57…) is used by index section dots (`.ix-g-dot`), topic-card bars (`.ix-card`) and room badges (`.hm-room-n`). But `.tn-g-dot` and `.ix-star-pill` (via `groupColorFor`) use the **bright JS `TOPIC_GROUPS[].color`** — the Tailwind *-600 ramp (architecture #db2777, reliability #d97706, security #dc2626…). Same-group hue divergence (ΔRGB): reliability 82.2, security 74.9, architecture 74.0, platform 66.9, data 56.9, messaging 56.7. **Simultaneously visible** on the home overlay: the "5 Architecture & APIs" room badge renders #963D86 while the starred "★ Content Pipeline" pill (same group) renders #db2777 — one screen, two hues.
- **verify_evidence:** — (no independent verify pass recorded)
- **Fix:** Point `.tn-g-dot` and `groupColorFor()` at `var(--room-<id>)` / `--topic-ink` instead of `TOPIC_GROUPS[].color`; then delete the vestigial `color` field on `TOPIC_GROUPS`. **This is the actual unthreaded seam the in-flight accent work should target** (see D13). One fix closes C1 + C2.
- **Screenshots:** `col-starpill-vs-card.png` (both hues on one screen); `col-tnmenu-dots.png` (dropdown bright) vs `col-01-index-overlay.png` (index muted)

#### C2 · P2 · JS `group.color` has no dark-theme variant → dropdown/star dots drop to 3.37:1 in dark while the same groups render at 7.9:1 everywhere else
- **Area:** group colour system — dark theme (`.tn-g-dot` / `.ix-star-pill`)
- **Viewport:** 1440×900 dark
- **Evidence:** `TOPIC_GROUPS[].color` is a single fixed hex with no `data-theme=dark` override, so `.tn-g-dot`/`.ix-star-pill` render the light Tailwind-600 values in dark too. Contrast vs dark bg #0F0E13: platform #7c3aed **3.37:1**, data #2563eb 3.72:1, security #dc2626 3.98:1, architecture #db2777 4.18:1. The maintained dark `--room` variants score **7.89–8.17:1** — so these dots are the weakest rendering of each group's identity (up to 2.34× below the room palette). Above the 3:1 graphical floor (→ P2 not P1) but visibly muddy.
- **verify_evidence:** — (no independent verify pass recorded)
- **Fix:** Same root fix as C1 — routing through `var(--room-<id>)` inherits the tuned dark variant (7.9:1). No separate dark JS palette needed once the JS color path is removed.
- **Screenshots:** `col-dark-tnmenu.png` (Data #2563eb dot near-swallowed) vs `col-dark-index.png` (same group's badge a bright #7DA6F3)

---

### PKG-D — Global styles.css: mobile tab-strip affordance + motion budget  `[1 finding · P2 · +1 P3 deferred]`
**Owner file(s):** `src/styles.css` (`.seg` at 309–572; `panein`/`railin`/`bodyIn` + `--duration-slowest` at 283–630; reduced-motion neutraliser at 1319). Host-level light DOM — reaches its targets; disjoint from all other packages.

#### D1 · P2 · Pane tab-bar shows only 3 of 9 tabs at 360px with weak scroll affordance
- **Area:** `.seg` pane tab strip (mobile form: `.sidebar .seg`, `styles.css:571`, `overflow-x:auto`)
- **Viewport:** 360×740 (and 390×844)
- **Evidence:** `clientW=360 scrollW=976 overflowPx=616`; **fullyVisibleTabs=3/9**; 4th tab clipped to a ~24px letter-sliver at x=336; identical across 5 topics in 5 colour-rooms; at 390px **still 3/9**. The strip is `overflow-x:auto` and auto-scrolls the active tab into view (reachable → **P2 not P1**); the only discoverability cue is the letter-peek — **no gradient/arrow**. Tab height 44px (tap target OK).
- **verify_evidence:** part of the out-of-pipeline replication (negatives confirm the strip auto-scrolls the active tab into view — reachable).
- **Fix:** Add a scroll affordance to `.sidebar .seg` — an edge-fade gradient mask (`::after`) or scroll-shadow so the 6 off-screen tabs are discoverable. Pure CSS; optional tiny JS listener for a dynamic arrow.
- **Screenshots:** `content-pipeline-model-360.png`, `sharding-strategies-sys-360.png`

---

## DEFERRED (P3 — sweep opportunistically when a fixer is already in the surface)

Each is tagged with the package/surface that owns it, so a fixer already editing that surface can clear it cheaply. None blocks ship.

#### D9 · P3 · Always-visible derivation & diagram text at 9–11px (smallest prose in the app) — `PKG-B (shadow CSS)`
- **Viewport:** 1280×800. Numbers derivation sub-lines `.nrow-n`=11px are always visible and load-bearing — including the red overflow warnings ("exceeds the 1,000 default — RDS Proxy, or buffer through SQS") rendered at 11px, i.e. the estimation callouts the user must read closely are the *smallest* text on the pane. Whiteboard `.dgm-lbl`/`.dgm-note`/`.dgm-foot`=9px. Reinforces B1's under-sizing. **`.dgm-*` overlaps B3 (mobile) — one token, both viewports.**
- **Fix:** Lift `.nrow-n` to ≥12px and `.dgm-*` to ≥11px; shorten copy rather than shrink if space-constrained.
- **Screenshots:** `14b-cp-num-center.png`, `13-cp-wb-full.png`

#### D10 · P3 · Entrance animations run 500ms (panein/bodyIn/railin) — over the 400ms motion budget, on every pane-tab switch — `PKG-D (styles.css)`
- **Viewport:** 1280×800. Active pane `animation-duration=0.5s` (`panein`, `styles.css:624`); settles at 486ms; fires on every one of 9 pane-tab switches. A full scan found **exactly 4 elements >400ms**, all 500ms from the single `--duration-slowest:500ms` token (panein, bodyIn `+150ms delay`, railin, + an SVG stroke transition). The `blur(3px→0)` term momentarily softens legibility mid-switch. Correctly neutralised under `prefers-reduced-motion` (`styles.css:1319`).
- **Fix:** Lower `--duration-slowest` from 500 → ≤400ms (e.g. 340ms), and/or drop the `blur(3px)` term from the `panein` keyframe (fade+slide alone reads fine; the blur is the legibility-softening part). Every other token (150/200/250/300ms) is already within budget.
- **Screenshots:** `t12_pane_early55ms_blur.png` (55ms faded+blurred) vs `t12_pane_settled_walk.png` (settled); `t5_pane_midtransition_120ms.png`

#### D11 · P3 · Sub-lead lines uncapped (114ch) above 67ch beat body — 1.7× measure jump in one view — `PKG-B (shadow CSS)`
- **Viewport:** 1536×864. In Model Answers the beat body `.mbeat-t` (16.5px) holds ~67ch via a fixed left gutter, but the sub-lead above it `.mscript-sub` (12px) is full-bleed at **114.8ch** — a ~1.7× measure jump inside one view. Same in Whiteboard: `.step-sub` reaches 117.4ch while `.wb-foot` stays ~87–105ch. **Note: `.mscript-sub` is also a B1 target (its 12px size).** Fix its measure and size together.
- **Fix:** Apply the same ch-based max-width the beat column uses to `.mscript-sub` and `.step-sub` (and any pane sub-lead).
- **Screenshots:** `LENS-caching-model-1536.png`, `LENS-caching-wb-1536.png`, `LENS-multi-tenant-wb-1536.png`

#### D12 · P3 · "Cram →" room-header pills are 21px tall — under the 24px target-size minimum (desktop only) — `PKG-C (index overlay / home-view.js)`
- **Viewport:** 1280×800 (compliant at 360×740). The six "Cram →" pills in the ALL TOPICS group headers measure 63.2×**21px** — 3px under the WCAG 2.5.8 24px minimum; a full-index scan found exactly these 6 as the only sub-24px controls at 1280. At 360 the same control is ≥24px, so the shortfall is desktop-only where mouse pointing makes practical impact negligible; the full room card is a large alternate target.
- **Fix:** Give the Cram pill `min-height:24px` (or extra vertical padding). Purely cosmetic.
- **Screenshots:** `cram_button_crop.png`

#### D13 · P3 (informational) · `--topic-accent` is an undefined, zero-consumer token; the live per-room accent is `--acc` (=`--topic-ink`) — `PKG-C (groups.js)`
- **Viewport:** 1440×900 (both themes). `getComputedStyle(:root)['--topic-accent']` returns `""` in every group and both themes; a deep DOM + adopted-stylesheet scan and an 11.6MB source grep found **0 uses** of `--topic-accent`. The real accent is `--acc:var(--topic-ink)` (`styles.css:467`), retinting on `html[data-group]`, driving 262 `var(--acc)` sites (verified per group). **Consequence:** an accent-threading change keyed on the name `--topic-accent` would thread a **dead token nothing reads** — the accent system already flows correctly through `--acc`; the only off-palette surface is the JS `group.color` dual-source (C1/C2).
- **Fix:** Do **not** introduce/thread a `--topic-accent` token. Direct the in-flight accent work at replacing `TOPIC_GROUPS[].color` consumers with `var(--room-*)` — i.e. **C1 is the accent fix**.
- **Screenshots:** `col-topic-content-pipeline.png`, `col-topic-caching.png` (panes correctly threaded; the token's absence *is* the finding — nothing consumes it to shoot)

---

## Coverage gaps to close in a follow-up run (not findings — absence of coverage)

- **Desktop dialog overlays** (`cram` / `scope` / `gameplan` / `keyboard` / `search`) — the `overlays-desktop` lens returned a placeholder stub; **zero findings on this surface, uncovered not clean.** These overlays attach their own shadow roots (`cram-overlay.js`, `scope-overlay.js`, `gameplan-overlay.js`, `keyboard-overlay.js`) — a distinct 5th ownership surface with no fixer assigned this pass.
- **Mobile Tools** (`mobile-tools` lens, same stub) — the mobile Tools entry/sheet is unverified; a **known-sensitive** area (07-11 state audit: the Tools button — the only entry to 12 tools — was off-screen on 16–24/46 topics). Re-run before assuming it is fixed.

**Dispatch order:** PKG-A first (P1, standalone). PKG-B, PKG-C, PKG-D are mutually collision-free → run in parallel worktrees, serial verified merges. Re-run the two stub lenses (mobile-tools, overlays-desktop) before closing the sweep.

---

## PKG-E addendum — desktop dialog overlays (follow-up lens, 2026-07-13)

**Verdict.** The desktop overlay baseline is **CLEAN, matching the mobile baseline** — across 35 overlay-opens (7 dialogs × 4 topics from 4 colour groups @1280×800, + all 7 re-measured @1536×864) every dialog fits the viewport, scroll-locks the page, contains its own scroll, closes on Escape *and* on its × button, and returns focus to its trigger, with **0 P0/P1/P2 and 0 page errors**. Four **P3** consistency nits survive: the cram dialog diverges from its six siblings on width **and** vertical placement, the mock-family's top-pinning leaves short dialogs floating over a large void, the mock-run surface takes an un-themed focus ring, and on desktop the whole Tools list lives below the fold in the persistent sidebar.

**Provenance.** Self-measured (this lens is the measurement — no separate verifier pass), Playwright chromium 1.61.1, `file://`, deviceScaleFactor 1, light theme. Topics sampled: content-pipeline (architecture-apis), eav (data-storage), signing (security-tenancy), iac (platform-infra); mock-run ring also checked on circuit-breaker (reliability-observability). Numbers are `getBoundingClientRect` / `getComputedStyle`, focus read through the shadow boundary (`deepActiveElement`).

### Desktop verdict on the two mobile carry-over questions

- **Anchoring family — CONFIRMED at desktop (see ED2, and ED1 for cram).** The dialog family does not share one vertical anchoring. `cram-ov` centres its panel (top=18px, symmetric 18/18 margins); the six `mock-ov` dialogs pin to `top=36px`. Consequence at desktop: the two short dialogs — mock (h=295) and mix (h=252) — sit in the top third with **~470–510px of empty blurred backdrop below them**, while the tall ones (cram/sess/scope/plan, h≈764) run to the bottom edge. So the mobile "3 vertical anchorings" observation reproduces on desktop as a **cram-centred vs mock-family-top-pinned** split.
- **Mock-run amber focus ring — NOT reproduced at desktop; REFUTED.** Focus *does* land on `#mockbody` on open at desktop (confirmed all 5 topics), but there is **no amber ring**. `#mockbody`'s shadow root defines no `:focus-visible` rule, so: **mouse-open → no ring at all** (`outline-style:none`, `box-shadow:none`); **keyboard-open → the raw UA-default `auto` outline** (`outline-color rgb(16,16,16)` ≈ near-black, ~1px), *identical* on a magenta-accent topic (content-pipeline `--acc #963D86`) and an amber-accent topic (circuit-breaker `--acc #924E00`). The ring never picks up `--acc` and is never amber. The desktop defect is the *opposite* flavour (see ED3): an **un-themed** ring, not an off-theme one.

### Findings

#### ED1 · P3 · Cram dialog diverges from the six-dialog family on width AND vertical placement at once
- **Area:** dialog panel geometry — `.cram-panel` (cramov) vs `.mock-panel` (mockov/mixov/sessov/keyov/scopeov/planov)
- **Viewport:** 1280×800 (and 1536×864)
- **Evidence:** cramov's panel is **600px wide**; all six others are **560px** (40px wider). cramov is also **vertically centred** (top=18px, 18/18 symmetric margins) while the family **top-pins** (top=36px). At equal height (cram & sess both 764px tall @1280) cram sits at top=18/bottom=782 but sess at top=36/**bottom=800 (flush to the viewport edge, 0px bottom margin)** — so side by side the cram sheet is visibly wider and floats 18px higher and centred while its siblings hug the bottom. Byte-stable across all 4 topics and at 1536 (cram 600×828@18 vs family 560×828@36). Root: cramov is the one overlay built on a separate `.cram-ov`/`.cram-panel` style block; the other six share `.mock-ov`/`.mock-panel`.
- **verify_evidence:** measured 35/35 opens; backdrops/radii/close-sizes came back as a single unique value set (see MEASURED-CLEAN) — only width and top-offset diverge, and only for cramov.
- **Fix:** Give `.cram-panel` the same `max-width:560px` and the same vertical centring (or the same top-pin) as `.mock-panel`, so the seven read as one family. Purely cosmetic; no functional impact.
- **Screenshots:** `DESK-OV-content-pipeline-cramov.png` (600px, centred) vs `DESK-OV-content-pipeline-sessov.png` (560px, bottom-flush)

#### ED2 · P3 · The mock-family top-pins, so short dialogs float in the top third over ~470–510px of empty backdrop
- **Area:** `.mock-ov` vertical alignment — mock/mix (short, content-sized) vs the tall members
- **Viewport:** 1280×800
- **Evidence:** The six `.mock-ov` dialogs align to `top=36px` with **no vertical centring**. Content-sized dialogs therefore hang from the top: mock-run **h=295 → 469px of empty blurred backdrop below the panel**; mixed-fire **h=252 → ~513px below**. The tall members (sess/scope/plan h≈764) instead run flush to the bottom edge (bottom=800, 0px margin). Net: within one family, some dialogs are top-anchored-with-a-void and others are bottom-flush — no member is symmetrically centred except the out-of-family cram (ED1). This is the desktop face of the mobile "vertical anchoring inconsistent across the dialog family" carry-over.
- **verify_evidence:** heights vary only with authored content (mock 293–336, mix 252–305 across topics); the top=36 pin is invariant across all topics and both viewports.
- **Fix:** Centre the `.mock-ov` panel vertically (`align-items:center` + symmetric max-height margins), matching what cram already does — short dialogs then sit centred instead of floating, and tall dialogs gain a bottom margin instead of touching the edge. One rule aligns the whole family.
- **Screenshots:** `DESK-OV-content-pipeline-mockov.png` (295px panel, top-pinned, void below), `DESK-OV-content-pipeline-mixov.png`

#### ED3 · P3 · Mock-run surface takes an un-themed focus ring (UA default on keyboard, none on mouse) — not the app's `var(--acc)` ring
- **Area:** `#mockbody` (role=region, tabindex=0) inside `<deep-mock-run>`'s shadow root — the overlay's initial focus target
- **Viewport:** 1280×800
- **Evidence:** By design mockov opens focused on `#mockbody` (the run surface), not the close button (mock-run/logic.js `__initialFocus`). But `MOCK_STYLE` (the shadow `<style>`) defines **no `:focus-visible` rule** for `#mockbody`, so the surface never receives the app's themed ring (`2px solid var(--acc)` + accent halo, the light-DOM standard at styles.css:53/632). Measured on open: **mouse-open → `outline-style:none`, `box-shadow:none` (no visible ring)**; **keyboard-open → `outline:auto`, `outline-color rgb(16,16,16)` ~1px (the browser's default), `box-shadow:none`**. Identical for `--acc #963D86` (magenta) and `--acc #924E00` (amber) — the ring is accent-agnostic. Every other focusable in these dialogs (the close buttons, into which the other six overlays land focus) uses the themed ring correctly.
- **verify_evidence:** `mb.matches(':focus-visible')` returns true on keyboard-open (so the missing rule, not a missing match, is why the themed ring is absent); false-equivalent on mouse-open (correctly suppressed). Refutes the mobile "off-theme amber ring": desktop shows a near-black UA default or nothing, never amber.
- **Fix:** Add a `#mockbody:focus-visible{outline:2px solid var(--acc);outline-offset:-2px}` (offset inward since the surface is flush to the panel) to `MOCK_STYLE`, matching the app's ring. Same gap likely exists on `#mixbody` — check while in the file.
- **Screenshots:** `DESK-OV-ring-kbd-content-pipeline.png`, `DESK-OV-ring-kbd-circuit-breaker.png` (keyboard-open, UA-default ring); `DESK-OV-ring-content-pipeline.png` (mouse-open, no ring)

#### ED4 · P3 · Desktop Tools live in the persistent sidebar (no FAB); all 12 tool triggers sit below the fold, reached only by scrolling the sidebar
- **Area:** the "Tools menu" at desktop — `#toolsfab` is `display:none`; tools live in the always-present `.sidebar` › `.mockbar`
- **Viewport:** 1280×800 and 1536×864
- **Evidence:** On desktop there is **no Tools sheet/FAB** (the mobile toggle `#toolsfab` computes `display:none`); the tools are the persistent left `.sidebar` (296px wide, `overflow-y:auto`, **scrollH 1559 in an 800/864 viewport**). The primary "Mock run" CTA and the pane-tab switcher are above the fold, but **all 12 secondary triggers are below it** — idxopen/searchopen (y=995), cramopen/sessopen (1202), mixopen/planopen (1268), scopeopen (1316), keyopen (1396), resetall (1461) — identical at 1280×800 and 1536×864. They are **reachable via the sidebar's native `overflow-y:auto` scrollbar** (so this is milder than the mobile row-17 sheet, which had no affordance), but every study aid requires a sidebar scroll to discover.
- **verify_evidence:** all 7 overlay triggers clicked successfully after `scrollIntoViewIfNeeded` in the 35-open run — reachable, not clipped. `#keyopen` (the `.kbd-only` control that is `display:none` on mobile, mobile row 14) is **`display:flex` and reachable on desktop** — the mobile unreachability is mobile-only.
- **Fix:** Optional. If discoverability matters, ensure the sidebar scrollbar is always visible (not overlay-only) or add a section-count/scroll cue; otherwise accept as native-scroll IA. No functional defect.
- **Screenshots:** covered by the desktop overlay set (sidebar visible behind every `DESK-OV-*` shot)

### MEASURED-CLEAN negatives (desktop 1280×800 across 4 topics/4 groups, + 1536×864 spot)

- **Backdrop — identical on all 7:** `rgba(28,26,22,0.45)`, `backdrop-filter: blur(8px) saturate(1.2)`, opacity 1, z-index 1000. One unique value set across all 35 opens.
- **Panel radius — 18px uniform** on all 7. **Panel padding — 0 uniform** (insets live on the inner scroll region).
- **Close button (`.mock-x`) — 32×32px, 18px glyph, uniform** on all 7 (cramx/mockx/mixx/sessx/keyx/scopex/planx). Above the 24px target-size floor.
- **Title treatment — uniform:** 12px / font-weight 800 for every dialog title (`.mock-title` and `.cram-title` render identically).
- **Escape — closes all 7**, on all 4 topics, setting `aria-hidden=true` (`.open` cleared, `.closing` invariant respected).
- **× close button — closes all 7** (full protocol on content-pipeline), same as Escape.
- **Focus return — every overlay returns focus to its trigger button** on close, via **both** Escape and the × button (35/35).
- **Body scroll-lock — engaged while open** (`document.body.style.overflow:'hidden'`) and **released on close** to `''` on both close paths — no stuck lock, no page-scroll bleed.
- **Internal scroll — contained:** cram/scope/plan bodies are `overflow-y:auto` and scroll internally (cram scrollH 2899 vs 703 client; scope 1365; plan 1222); keyboard fits (681=681, no scroll); mock/mix/sess are content-sized. Background never scrolls.
- **Fit — every panel fits the viewport vertically** at 1280×800 **and** 1536×864 (fitsV true, 0px overflow) across all topics; the tall dialogs grow with the viewport (764→828) rather than clipping.
- **0 page errors** across all 35 opens + the ring/tools probes.

### Dark-theme spot (bonus, read-only — the brief was light-only; dark had known debt in C2)

Ran the 7 overlays in dark theme (`data-theme=dark`) on content-pipeline + signing to check for the C2-class "no dark variant" trap. **CLEAN — the overlay chrome is properly dark-aware and does NOT reproduce C2.** Colours canvas-normalised (computed `oklab()` → sRGB) and measured against the real panel surface, not the backdrop (first-pass instrument bug: it read the `rgba(28,26,22,.45)` scrim as the panel bg and returned `oklab`-as-null contrast — corrected before reporting):
- **Panel surface** is a genuine dark `rgb(30,28,37)` (#1E1C25) — no light-panel-in-dark leakage; body, header, and code chips all render dark (visually confirmed, `DESK-OV-dark-content-pipeline-cramov.png`).
- **Title tracks the topic accent AND has a real dark variant:** content-pipeline `rgb(222,158,207)` = **7.93:1**, signing `rgb(239,158,175)` = **8.16:1** — unlike C2's JS `group.color` dots that dropped to 3.37:1 for want of a dark variant. The overlay titles flow through the tuned dark `--acc`, so they land ~8:1.
- **Close glyph** `rgb(167,162,154)` on the dark surface = **6.63:1**, uniform across all 7.
- **Backdrop** unchanged (`rgba(28,26,22,.45)` + blur) — still dims correctly over a dark page.
- Uniform across all 7 overlays and both topics; 0 page errors. Screenshots: `DESK-OV-dark-{content-pipeline,signing}-*.png` (14).

**Counts (desktop overlays lens): P0 = 0, P1 = 0, P2 = 0, P3 = 4 (ED1–ED4).** Desktop overlay baseline CLEAN, consistent with the mobile baseline; both mobile carry-over questions answered (anchoring CONFIRMED, amber ring REFUTED). Dark-theme overlay chrome also CLEAN (bonus pass — no C2-class dark-variant gap).

---

## Mobile tab-strip drift follow-up (task #8) — CERTIFIED NEGATIVE, dual-instrument

The sweep's lens briefs excluded the topic-switch layout-shift class as known-in-flight, which also
excluded its MOBILE variant — so no data existed. Measured after the fact by TWO independent
instruments (the desktop fixer's fresh one and the desktop verifier's proven one, extended), same
artifact (n-drift deliverable — mobile-identical to base, the desktop fix is ≥920px-scoped), no
cross-talk, 360×740 + 390×844.

**VERDICT: mobile does NOT drift — 0px on all 46 topics, both instruments, both viewports**, incl.
wrap-extreme pairs, same-wrap zero-controls, and coordinate-landing tests. Not a blind negative:
both instruments passed a mandatory SYNTHETIC control — with the seg forced back into normal flow
plus a forced wrap, one read 59.4px and the other 39.6px (different plants, both fired), then 0px
again restored.

**Mechanism:** at <920px `.sidebar .seg` is `position:fixed; top:0` (main `styles.css:571`) — a
fixed top rail outside `.side-id`'s flow. The desktop defect (seg inherits identity-block height)
is structurally impossible there. `headin`/D2 is moot (<920px masthead is `display:none`).

**⚠ THE IMMUNITY IS ONE DECLARATION.** Remove or override that `position:fixed` and the drift
returns at ~40–60px for wrapping titles (the synthetic plants are the standing proof). A
LOAD-BEARING comment (+ ideally a one-line fixed-position assertion in a browser check) is being
added by the active styles.css owner (PKG-D).

Recorded discrepancy — RESOLVED (verifier self-correction): its "no title wraps at mobile" was an
overclaim from a 12-of-46 side-survey; the fixer's full-46 observation stands (exactly 1 title
wraps, side-id height 188.3→208.1px). Not an instrument conflict — a coverage gap in an incidental
aside, honestly retracted. The 0px verdict never rested on wrap count: the synthetic control forced
a 3-line title against the pinned strip and it moved 0px, so the immunity holds for any wrap count. Instruments: fixer scratch `mobile_drift_measure.cjs`; verifier
`D:/claude-workspace/v-drift-verifier/mobile_instrument.js` (+ `mobile-drift-results.json`) —
promotion into the repo gate is a punch-list-wave decision.
