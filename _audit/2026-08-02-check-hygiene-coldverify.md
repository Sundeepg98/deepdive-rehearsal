# COLD VERIFY: the check-hygiene micro-wave

**Verifier:** gr-verifier. Warm to the territory (my first-keyframe proof in the gate-runtime cold
verify is what specified this fix), **independent of the builder's implementation** -- I had not
seen `_boot.cjs`, `primitive_battery.py`, or any of this wave's code before starting.
**Subject:** `infra/check-hygiene`, tip `44f02ab`, 1 commit on `b989e4a`.
**Worktree and main repo:** READ-ONLY. All work in `...\scratchpad\gr-verify\ch-mirror`
(clone at `44f02ab`, `node_modules` junctioned, junction unlinked non-recursively at teardown).

## VERDICT SUMMARY

| # | item | verdict |
|---|------|---------|
| 1 | corrected predicate's semantics | **PASS on 5 of 6 edges; 1 HOLE found (`paused`)** |
| 2 | re-arm 4 mutants + author my own | **PASS 4/4 re-armed; 2 novel mutants added, 1 exposes the hole** |
| 3 | soak touch_floor + cta_contrast | **PASS 0/15 each** |
| 4 | focus_ring substitution + tail move | **move ENDORSED; the shipped battery no longer measures what it claims** |
| 5 | serial untouched / byte-identity / claims / controls | **PASS (6 statistics reproduce exactly)** |

**Blocking: 0. Non-blocking: 4. Notes: 5.**

---

## ITEM 1 -- the corrected predicate, attacked at its edges

I drove the **real exported `B.REST_STATE`** (the builder exported it so a battery could prove the
primitive sees motion) against six constructed states. Scenario A is the harness's own negative
control: if the 42.2 case does not block, nothing else the harness prints means anything.

| edge | predicate says | correct? |
|------|----------------|----------|
| A: `panelIn` first keyframe (the 42.2 case) | **BLOCKED** | YES -- the defect is defeated |
| A2: after `panelIn` completes | at rest, box `{w:44,h:44}` | YES |
| B: resting non-identity transform `matrix(1,0,0,1,0,-1)` | **at rest** | YES -- identity would hang here |
| D: infinite + finite animation on ONE element | **BLOCKED**, names the finite one | YES -- **no masking** |
| D2: infinite animation alone | at rest | YES -- the deliberate exclusion |
| E: pure CSS **transition** in flight | **BLOCKED** (`transition:transform [running]`) | YES |
| **C: PAUSED animation** | **at rest** | **NO -- see below** |

**The deviation from the ruling is justified, and I reproduced its justification independently.**
Scenario B returns `tf: "#gr_probe_mask=matrix(1, 0, 0, 1, 0, -1)"` with `still: true` -- the
builder's `.mockbtn:hover{transform:translateY(-1px)}` refutation, reproduced exactly. Under the
ruled identity predicate this state never resolves. The substitution of "nothing in flight" for
"transform is identity" is correct, and D/D2/E show it separates the cases it claims to separate.

**The infinite-animation exclusion does not mask anything.** The `continue` advances within the
element's own animation list rather than abandoning it, so a finite animation sitting beside an
infinite one is still found (D). And the boot spinner cannot hang the guard (D2). Both verified,
not reasoned.

### THE HOLE: `paused` is treated as "not in flight"

```js
if (st !== 'running' && st !== 'pending') continue;
```

`playState === 'paused'` is skipped, so a paused animation contributes nothing to `still`. A paused
animation holds its element at an intermediate transform **indefinitely**, which is exactly the
state the primitive exists to refuse.

**Synthetic isolation (C1) -- unambiguous.** A 44px control with a finite scale animation, paused
mid-flight:

```
   while RUNNING : still=false  moving="#gr_paused <- gr_scale [running]"
   while PAUSED  : still=true   moving=null   alpha=1
   transform chain: "#gr_paused=matrix(0.961167, 0, 0, 0.961167, 0, 0)"
   BOX A CHECK WOULD MEASURE: {"w":42.3,"h":42.3}   (control is 44x44)
   rAF chain compare: tf identical across a frame? true -> confirmation arm CANNOT catch it
```

**42.3px on a 44px control, judged AT REST, with alpha at 1 and the rAF confirmation blind** --
because a paused transform is identical across frames. This is the 42.2 defect through a different
door, and it is the one door the ruled identity predicate would have closed.

**Reachability, measured rather than assumed -- and it is currently low.**

- The app **has** the rule: `styles.css:1482` sets `animation-play-state:paused!important` on
  `body.is-hidden` and every descendant, applied by `page-visibility.js` on `document.hidden`.
- But in a headless Playwright run `document.hidden` is **false** (`{"hidden":false,
  "state":"visible","cls":false}`), so the app never enters that state during the gate.
- And on the real app the **alpha arm masks the risky window**. Pause-offset sweep on `#cramx`:

| offset | alpha | still | box | slips through? |
|-------:|------:|-------|----:|----------------|
| 40 | 1 | true | 44 | no |
| 80 | 0.575 | true | 43.5 | no |
| 120 | 0.769 | true | 43.7 | no |
| 160 | 0.929 | true | 43.9 | no |
| 200 | 0.981 | true | 44 | no |
| 240 | 0.990 | true | 44 | no |
| 280 | 1 | true | 44 | no |

  `still` is **true at every offset** -- the paused animation never blocks -- but wherever the box
  is short, the concurrently-paused backdrop fade holds alpha under 0.995 and the alpha arm blocks
  instead. **That is a coincidence of durations, not a designed property**, and C1 shows what
  happens the moment a paused animation runs without a concurrent fade.

**Consequence, planted and measured** (my `paused_animation` mutant, item 2): `touch_floor` does not
false-pass, it **times out after 30s** --
`FAIL (harness error: condition never held within 30000ms ... still moving: {"alpha":0,"still":true,"moving":null})`.
That is the **false timeout** the freeze document itself calls the worse defect
(*"a false red is loud, a false timeout is a red nobody can act on"*).

**Fix is one line:** stop skipping `paused`. Finite paused animations should block; infinite ones
are already excluded, so there is no new hang risk.

---

## ITEM 2 -- mutants

### The builder's four, re-armed independently: **4/4**

```
  slow_animation  touch_floor    expect=PASS got=PASS  OK
  slow_fade       cta_contrast   expect=PASS got=PASS  OK
  short_control   touch_floor    expect=FAIL got=FAIL  OK
  low_contrast    cta_contrast   expect=FAIL got=FAIL  OK
```

The two-directional design is right and worth saying so: the SLOW pair proves the guard waits, the
BROKEN pair proves it did not buy its green by ceasing to measure -- which is the failure this
class of fix is most likely to introduce.

### My own, in classes the four do not cover

Both of the builder's "slow" mutants stretch a CSS **@keyframes animation**. Neither drives a
**transition**, and none touches the `paused` branch.

| mutant | class | target | expect | got |
|--------|-------|--------|--------|-----|
| `slow_transition` | CSSTransition (not CSSAnimation) | `touch_floor` | PASS | **PASS** |
| `paused_animation` | the `paused` playState branch | `touch_floor` | (deliberately unset) | **FAIL, 30s timeout** |

`slow_transition` stretches `.scrolltop`'s reveal to 3s. That reveal is a *transition*
(`styles.css:1445`), it is what `touch_floor`'s third at-rest call waits on, and at rest-hidden the
FAB sits at `scale(.9)` = **39.6px** -- the original documented mis-measurement. `CSSTransition` is a
different `getAnimations()` subclass from `CSSAnimation`, so nothing in the shipped battery proves
that branch. **It passes: the transition arm works.**

`paused_animation` is reported above. I set no expectation for it rather than assert one I had not
derived.

---

## ITEM 3 -- soaks: **0/15 each**

| check | red | mean wall |
|-------|----:|----------:|
| `touch_floor` | **0/15** | 5.8 s |
| `cta_contrast` | **0/15** | 27.3 s |

Pooled with the builder's 30: `touch_floor` **0/45**.

- P(0/15 | true rate still the pre-fix 20%) = **0.035**
- P(0/45 | true rate still 20%) = **4.4e-5**
- Fisher exact, 18/90 before vs 0/45 after: **p = 0.00071**
- Rule of three on 0/45: true post-fix rate **< 6.7%**

**The pre-fix rate is excluded.** Combined with a named source-level mechanism and a mutant that
reproduces the defect on demand, the retirement of `touch_floor` from the flake protocol is
supported.

Worth recording: `touch_floor` also got **faster**, ~11.9s mean pre-fix to ~5.8s now. That is the
right direction but it is the shape of number that would also appear if a check had quietly stopped
measuring -- `short_control` (re-armed, FAIL) is what rules that out.

---

## ITEM 4 -- the focus_ring substitution

### The tail move: ENDORSED

The stated criterion was *"0/30 means rare flake, leave it in the pool"*. The measurement was
**1/30**, so the criterion says move. That is a faithful application of a bright line the wave set
for itself **before** it measured, and the cost asymmetry (~12s of tail against an unexplainable
red in the lane people are asked to trust) is sound. Moving it to the tail does close the
concurrency exposure: `run_fast` runs tail members one at a time after the pool drains. My own full
serial and full `--fast` gates on the frozen tree both returned `focus_ring: PASS`, 76/76, zero
disagreements.

The statistics are honestly labelled -- p = 0.0949 is called suggestive and explicitly *not*
claimed as significant, which is correct.

### The substitution: sound in principle, but THE SHIPPED BATTERY NO LONGER MEASURES IT

The substitution -- run `focus_ring` in a 4-worker pool beside `render`, `cta_contrast`,
`scoreboard_salience` instead of 30 full fast gates -- is disclosed plainly and is defensible: the
variable under test really is concurrency. If anything it is *harsher* than reality, since
longest-first packing ranks `focus_ring` 17th of 60 in the pool (13.0s), so its real neighbours
would tend to be cheaper checks, not three of the most expensive.

**But this same commit moved `focus_ring` into `SERIAL_TAIL`, and `run_fast` routes tail members
out of the pool.** With the battery's own command
(`--fast --jobs 4 --only focus_ring,render,cta_contrast,scoreboard_salience`) `focus_ring` now runs
**alone, after** the other three. Measured, twice:

```
  3-check pool only          : 45s      44s
  4-check (battery's command): 54s      56s
```

Adding `focus_ring` costs **+9s and +12s** -- its solo runtime -- rather than the ~0s it would cost
if it shared a spare worker among four jobs and four workers.

Two consequences:

1. **The 1/30 receipt cannot be re-derived from the shipped code.** It was presumably valid when
   taken (before the tail edit), but nothing in the tree now reproduces it.
2. **A future re-run will report 0/N and mean nothing** -- it will be soaking a check running alone
   while its docstring says it is measuring concurrency. That is a harness that cannot fail.

Fix: have `do_focus` force pool membership for the trial (or assert that the trial actually ran
concurrently) so the battery keeps testing what it documents.

**One further gap in the substitution, from my side of the evidence:** my single fast-only red was
observed on a **mutant** tree (my `keyboard` mutant removed a `tabindex`, which changes tab order),
whereas the 30 trials ran on a clean tree. So the substitution differs from my observation in tree
state as well as in scope. This does not change the tail decision -- moving it is conservative
either way -- but it means neither of us has reproduced the failure, and the underlying assertion
remains unexplained, exactly as the freeze document says.

---

## ITEM 5 -- standard items

**Serial default untouched (AST, vs `b989e4a`):**

```
  BASE native=30 browser=46 total=76   HEAD native=30 browser=46 total=76
  NATIVE identical: True | BROWSER identical: True | ORDER identical: True
  SERIAL_TAIL: 15 -> 16, added ['focus_ring']
```

The only orchestration change is tail membership, which `run_fast` consumes and `run_serial` does
not -- the no-flag path walks `ORDER`. Confirmed by running it: **76 checks, 0 FAIL, 0 SKIP, exit 0,
714.9s.**

**Byte-identity:** `21eaaaf1786317f8f01857f3c7ef49204ad09bf2f7925ae9b765e15a8df85f38` -- verified in
the worktree, in a fresh clone, and after every one of my mutant reverts.

**Claims audit -- all six statistics reproduce exactly:**

| claim | stated | recomputed |
|-------|--------|-----------|
| touch_floor 18/90 vs 0/30, Fisher | 0.0061 | **0.0061** |
| rule of three, 0/30 | 10.0% | **10.0%** |
| focus_ring 2/37 vs 0/82, Fisher | 0.0949 | **0.0949** |
| rule of three, 0/82 | 3.7% | **3.66%** |
| pooled concurrent | 5.4% | **5.4%** |
| pooled serial | 0.0% | **0/82** |

The pooled inputs also check out against my own prior verify: I reported 0/52 serial and 1/7
concurrent, and both are carried forward correctly.

**Overlay family lists:** exactly five `*-ov` classes exist in `src/` (exhaustive grep). Four sites
were widened (`overlay_deadzone` x2, `visual_regression` x2), three of them from three classes and
one from four. **Zero sites naming fewer than five remain.**

**Runner stamp hygiene -- my previous finding is correctly fixed:**

| run | full_coverage | capture_of_record |
|-----|---------------|-------------------|
| no flags (serial, full) | true | **true** |
| `--fast --jobs 4` (full) | true | **false** |
| `--fast --only` 4 checks | false | false |
| `--only` 1 check | false | false |

No legacy `certifying` field survives anywhere.

**Negative controls on my own instruments:**

| instrument | control | result |
|------------|---------|--------|
| predicate edge harness | scenario A must block the 42.2 case; B/D2 must report rest | both directions demonstrated -- it is not stuck on either answer |
| soak driver | `#cramx` forced to 30px | reported **FAIL** naming the assertion, so 0/15 is a real zero |
| AST comparator | synthetic rename and script-repoint | **caught both**; unchanged control reports identical |
| scheduling measurement | 3-check baseline run twice (45s, 44s) | the +9/+12s delta is signal, not noise |

---

## FINDINGS BY SEVERITY

### BLOCKING -- none

The serial capture path is untouched and returns 76/76. The deliverable is byte-identical. The
primitive defeats the defect it was built for, the two adopting checks soak clean, and every
published statistic reproduces.

### NON-BLOCKING

1. **`paused` animations are judged at rest.** Demonstrated: a 44px control parked at scale(.961)
   reads 42.3px and is confirmed at rest, with the rAF chain compare blind to it. The app has a rule
   that produces this state (`styles.css:1482`), though the gate cannot currently reach it headless
   and the alpha arm masks the risky window on the real app today. Planted, the cost is a 30s false
   timeout. One-line fix; the ruled identity predicate would have closed this door.

2. **`primitive_battery.py focus` no longer measures concurrency on the shipped tree**, because the
   commit that moved `focus_ring` to `SERIAL_TAIL` routes it out of the pool the battery builds.
   Measured at +9s/+12s. The 1/30 receipt is not re-derivable, and a future re-run reports a
   meaningless 0/N.

3. **`test/touch_floor.cjs:74` describes the refuted design.** It says the shared primitive
   *"demands transform-identity as well as agreement"* -- identity is precisely the arm the battery
   refuted and the shipped code does not require. `_boot.cjs` says *"Identity itself is required by
   nothing"* and the freeze document agrees. The stale sentence sits in the very file whose defect
   motivated the wave, which is where a future reader is most likely to look.

4. **The null-probe fix did not reach the page-level entry point.** The freeze document says
   *"The probe now returns the state and the predicate judges it"*. True of `waitPainted`; the
   page-level `atRest` still `return null`s from its probe, and my paused mutant's timeout printed
   `last=null` verbatim. The `catch` block appends `| still moving: {...}` so the diagnostic is
   recovered and the outcome is fine -- but the claim is broader than the change.

### NOTES

5. **A second infinite animation exists that the document does not mention.** It names the boot
   spinner (`boot.js:18`, `_bs-spin ... infinite`); there is also
   `.timer.low{animation:pulse ... infinite}` in `src/scripts/app/drill/logic.js:79`. Both are
   correctly excluded, and `room_static` does not see either because it only scans `styles.css`.
   The exclusion is right; the census behind it is one short.

6. **"All five sites now list all five" -- there are four sites**, two in each of
   `overlay_deadzone` and `visual_regression`. The edit is complete and correct; the count is off
   by one.

7. **`touch_floor` got ~2x faster** (11.9s -> 5.8s mean). Benign and expected from replacing a
   100ms-cadence agreement poll with rAF confirmation, but it is worth noting explicitly because a
   large speedup is also what "the check stopped measuring" looks like. `short_control` is what
   rules that out, and it re-armed.

8. **`fail_dump`'s last-run-wins destroyed evidence again -- to me, this session.** I deleted my own
   15-run soak receipt while running its negative control and had to re-run the battery to
   regenerate it (0/15 both times; the receipted file is the second). Fourth occurrence in this
   campaign. Follow-up #1 in the freeze document is the right call and is worth doing soon.

9. **The `identity()` helper returns "is identity" for any transform form it does not model**
   (`if (!m) return true`). That is the safe direction -- it can only under-record `tf`, never
   block spuriously -- but it means the chain-compare arm is silently vacuous for any computed
   transform that is not `matrix()`/`matrix3d()`. Computed styles always resolve to those two
   today, so nothing is wrong now.

---

## WHAT I DID NOT VERIFY

- **The 1/30 focus_ring figure itself.** Not re-derivable from the shipped harness (finding 2), and
  I did not rebuild a corrected battery to re-measure it.
- **`dock_contrast`'s inherited benefit.** The freeze document says it gets the primitive for free
  via `waitPainted`; I confirmed that by reading, not by soaking it.
- **Any platform but this one** -- one box, one OS, `win32-chromium149` baselines.
- **The overlay widening's effect on outcomes.** I verified the lists are complete and that the
  gate is green; I did not construct a case where `.nt-ov` or `.xd-ov` fading would have corrupted a
  capture under the old three-class list.
- **Long-run `--fast` stability.** One full fast gate, not a battery.

## RECEIPTS

All under `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\gr-verify\`:

| file | what |
|------|------|
| `predicate_edges.cjs` | the six-edge harness against the real `B.REST_STATE` |
| `paused_hole.cjs`, `paused_reach.cjs` | the paused hole, isolated and then swept for reachability |
| `novel_primitive_mutants.py`, `novel_primitive_mutants.json` | `slow_transition` + `paused_animation` |
| `ch_soak.py`, `ch_soak_touch_floor.json`, `ch_soak_cta_contrast.json` | the two 15-run soaks |
| `ch_serial.json`, `ch_fast.json`, `ch_log_serial.txt`, `ch_log_fast.txt` | my own full gates and the stamp matrix |
| `nv_log_*.txt`, `nv_dump_*.txt` | mutant logs and the preserved timeout dump |
| `ch-mirror/` | the scratch clone (junction removed at teardown) |
