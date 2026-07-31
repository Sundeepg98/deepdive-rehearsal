# FREEZE -- appeal/home-instrument -- 2026-07-31

Branch `appeal/home-instrument`, branched from master tip `1c533d7`.
Scope: the `#home` route only. Spec: `appeal-directions/CHOSEN.md` (D1 "The Instrument" spine,
per the blind five-judge panel ruling of 21:05).

Gate: **75/75 PASS** -- capture at `_audit/2026-07-31-appeal-home-gate.txt`, written outside the
repo during the run and copied in.
Baseline for comparison: 74/74 PASS on the untouched tree at `1c533d7`.
Delta: `home_reflow` added. **No check was deleted, weakened, or skipped.**

One flake seen and run down rather than shrugged at: an intermediate full-gate run failed
`grade_reveal` on the arm that clicks Missed and reads the record back, while the adjacent re-grade
arm passed. It then passed 3/3 in isolation. The wave touches neither the drill, the shadow root,
`progress.js` nor `card-id.js`, and the one plausible mechanism it does introduce was checked and
ruled out: `Panels.bind` attaches to the root it is handed, never to `document`, and this wave's
three roots (`#home`, `#homerail`, `#homelib`) are disjoint subtrees that never contain the drill.
The home's own document-level listeners are gated on `HomeView.isOpen()`, which is false on a drill
route. Load artefact on a box that was also rendering receipts; the capture of record above is a
clean run with nothing else on the machine.

---

## 1. What changed, in one line of stylesheet

```
src/styles.css   html[data-view="home"] .app{display:none}
```

That declaration was the operator's whole complaint. The TOPIC routes already shipped a
three-column shell, measured fixed phone chrome (`--chrome-top`/`--chrome-bot`, written at runtime
by `chrome-metrics.js`) and a docked verdict bar (`#ndock`). Entering the home switched all of it
off and painted a centred 980px column on `--bg`. One route, and it was the entire defect.

`#home` is now a tenant of the shell instead of a replacement for it: it sits in the `.stage` slot,
the sidebar carries a HOME tenant beside its untouched TOPIC tenant, the library lives in the
`.companion` column, and a status census bar sits at the frame's foot. Same element per slot, same
geometry, same sticky and scroll behaviour. No parallel shell was built.

## 2. What the home now says

- **The hero is the QUESTION.** The probe you were being interrogated on, in curly quotes at
  display size on a new `--measure-display` (41ch). The rule that token exists to state: display
  type takes a shorter measure than body type. Previously the home heroed a topic NAME, which is
  what a table of contents does.
- **The line under it is second person, with a REASON and a RECENCY**: "You marked 4 probes shaky
  in this topic 3d ago, and stopped. 9 probes left here." Previously: "probe 11 of 21" -- a cursor.
- **ALTITUDE**, the gauge: three rails (Staff / SDE3 / SDE2), 46 segments each, one per topic,
  brightness = that topic's Solid share at that tier, ordered strongest-first so the lit mass is
  contiguous and the taper is legible. Fill and outline carry the grade; hue never does, because
  hue already means WHICH ROOM. Untouched topics keep an empty outline so the denominator is never
  hidden. It is derived at READ TIME from `progress.<id>.cards` joined against the tier on the card
  -- about 972 lookups per render, **no schema change and no migration**.
- **Weakness chips gained AGE and the CONCEPT tail**, both from data already stored (`ts`, and
  `revisit[]`, which holds signal strings).
- **A status census** on the frame's foot, and a **bottom tab bar** on the phone.

## 3. The honest limit, stated rather than papered over

`progress.<id>.ts` is a per-TOPIC last-write stamp. There is **no per-card timestamp anywhere in
the store**, so nothing here can honestly age an individual probe. The copy is written to exactly
what the record can pay: "You marked 4 probes shaky in this topic 3d ago" means *you last worked
this topic three days ago*, and the Still-shaky panel says so in as many words ("The age is how
long since you last worked that topic"). Per-probe recency is a storage change with a migration and
is recorded as a follow-up wave in the spec, not faked here.

The gauge's verdict also refuses to accuse without evidence: on a cold record every rail ties at
0%, so "Staff is the thin rail" would be an accusation derived from nothing. The cold copy explains
the instrument instead. This was caught by looking at the regenerated VR baseline before committing
it, which is the reason that review step exists.

## 4. Two defects this wave introduced and fixed

1. **The focus halo was deleted.** `.hm-act .hm-cta{box-shadow:none}` was written to remove the
   resting drop shadow. `.hm-cta:focus-visible` delivers the focus HALO as a box-shadow at the same
   specificity, so the blanket rule won by source order and silently removed it in both themes.
   `test/focus_ring.cjs` caught it -- the arm exists for exactly this. Fixed with
   `:not(:focus-visible)`, and the reason is written at the rule.
2. **The brand mark lost its neutral.** `styles.css` bound the home brand mark to a roomless
   neutral via `#home .hm-brand`. Moving the mark into the rail took it out of `#home`, so it would
   have worn a room accent -- the exact W15 defect `test/room_browser.cjs` guards. Both the selector
   and the check were re-pointed to `.hm-rail .hm-brand`.

## 5. Checks -- re-anchored, never deleted

| check | what happened |
|---|---|
| `home_rhythm.py` | **Re-anchored** via its own documented procedure. The stack changed membership: `.hm-state`, `.hm-cta` and `.hm-top` left it (the first retired into the status bar; the other two became component-internal and stopped declaring the content measure), and `.hm-continue` / `.hm-alt` / `.hm-duo` joined. REGISTRY and `gap.home.*` tokens moved together, so no orphan is left on either side. The check also learned that `--measure-display` is a DIFFERENT kind of measure -- judged, so a raw `41ch` still fails, but never pulled into the centred column. A 7th planted defect was added for it and the display measure is pinned BOTH ways in the self-test. |
| `search_deadend.cjs` | **Re-anchored, and strengthened.** It used `appVisible === false` as the proxy for "you are on the home". The shell now stays up on every route, so that flag is true everywhere and would have silently weakened four arms. Replaced with `stageVisible` -- down on the home, up on a topic route, which is what the proxy always meant -- and `appVisible === true` is now asserted on the home as the new invariant that the frame never leaves. |
| `room_browser.cjs` | **Re-anchored** to `.hm-rail .hm-brand` (see defect 2). The assertion is unchanged: the product mark claims no room. |
| `at_name_hygiene.cjs` | **Re-anchored.** The separator ratchet went 12 -> 14 because the weakness chip gained a third field. The two new seams are pinned by name in `SEP_SITES` as well as counted, so raising the number without adding the separators still fails. |
| `focus_ring.cjs`, `cold_open.cjs`, `heading_tree.cjs`, `touch_floor.cjs`, `visual_pane_smoke.mjs`, `phantom_tokens.py`, `at_name_layout_probe.cjs`, `flow_cursor.cjs`, `latent_arial.cjs`, `overlay_deadzone.cjs`, `rail_integrity.cjs`, `back_deadend.cjs` | **Passed unmodified.** The cold branch deliberately keeps `.hm-lead` and `.hm-cta .hm-cta-d` so `cold_open`'s contract holds as written. |
| `chrome_metrics.cjs`, `fold_budget.cjs`, `click_drift.cjs`, `sidebar_geometry.cjs` | **Untouched and unmoved.** All four run on TOPIC routes, which this wave does not change. The spec predicted this against my own DIRECTION.md, which had overstated it as "the real work"; measured here, it was none. |
| `home_reflow.cjs` | **NEW.** See below. |

## 6. The new check, and why it had to exist

`test/home_reflow.cjs`. The usual reflow predicate, `documentElement.scrollWidth > clientWidth`, is
**blind in a fixed shell**: a `position:fixed` bar with `overflow:hidden` does not grow the document
when its contents are too wide, it CLIPS them, so the document stays exactly viewport-width and the
predicate stays green while a control sits off-screen and unreachable.

This is not hypothetical. It happened on this wave: at 390px the home's Theme button painted its
right edge at 394 inside a 390px bar, with `scrollWidth` reporting 390 and every existing arm green.
The new check measures each element's painted box against its nearest CLIPPING ancestor instead, and
treats a horizontally-scrollable clipper as reachable rather than lost. It plants two mutants every
run -- one inside the fixed bar (the case `scrollWidth` cannot see) and one in the flow -- and
ABORTS rather than report a green it did not earn. It found the real defect before it was fixed, so
its negative control is demonstrated, not asserted.

## 7. Visual regression

`home-light` and `home-dark` REBASELINED under the authorization; the pair is kept and
`manifest.json` updated. **The other 14 baselines are byte-identical** -- `git diff --stat` over
`test/baselines/` shows exactly three changed files. The new baselines were reviewed before
committing, which is what surfaced the cold-verdict copy defect in section 3.

## 8. Appearance receipts

`_audit/appeal-home-receipts/` -- before (master tip `1c533d7`) and after, at 1280x800 and 390x844,
on the SAME seeded returning-user record, so each pair differs by design and nothing else.

**The note, in the appeal's own register.** The before shot is the operator's sentence made
literal: a centred column on cream, a wordmark and four pill buttons floating with nothing to
belong to, one progress line, a full-bleed blue slab reading a topic's NAME, then sections stacked
down a page that scrolls as one document. Nothing on that screen is chrome, so nothing on it is an
application -- it is a well-set page about an application. The after keeps every one of those
facts and re-houses them: the wordmark and the actions become a rail that persists, the progress
line becomes a census bar that is always at the foot, the library becomes a column that is always
present and never in the way, and the slab stops shouting a topic's name because the loudest thing
on the screen is now the question you were being asked when you stopped. The gauge is the part that
could not have been on the old screen at all: three rails that taper, saying in one look that the
level you are interviewing for is the one you have rehearsed least. On the phone the same frame
survives as a fixed top bar and a bottom tab bar rather than dissolving back into a document. The
reading quality the operator called soothing was never in the frame, and the frame is all that
moved: the prose face, the reading measure and the answer surfaces are untouched by this wave.

## 9. Costs carried forward

- The status census renders on the home route ONLY. Putting new furniture on a topic route would
  have moved fourteen baselines this wave is forbidden to touch. The spec's phrasing ("live state
  at the frame's foot") was narrowed to home-only during the build, deliberately.
- The sidebar now has two tenants, which is a conditional that did not exist before.
- `Progress.summary()` is unchanged, but `Altitude.compute()` is a new derived model over it.
- Age is topic-granular (section 3).
- Follow-up waves are recorded in `CHOSEN.md` section 9: the `_mustHit()` correctness fix, pushes
  as spoken lines, chain depth as count only, a designed pre-reveal state, and per-probe recency.
