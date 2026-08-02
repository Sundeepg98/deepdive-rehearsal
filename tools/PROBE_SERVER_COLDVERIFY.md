# Probe server -- independent cold verify

Written by a verifier that shares no context with the builder of `tools/probe_server.cjs`, against
`tooling/probe-server` at `fb8a53b8`. The builder's own proof is `tools/PROBE_SERVER_RECEIPTS.txt`;
this is the second opinion, aimed deliberately at what that proof does not reach.

**Box:** Windows 11, 8 cores, node v25.2.1, playwright 1.61.1,
`chromium_headless_shell-1228`. Other agents were active on the box during these runs; where that
matters it is said so.

## VERDICT: ADOPT WITH NOTES

Every claim the tool makes reproduced independently -- the speed, the value parity, the reset, the
stamps, and the single-source settle -- including in nine measurement families the builder's 15
never touch. Two things were wrong and are now fixed in this commit: **there was no idle TTL**
(added, and proven), and **the documentation claimed more coverage than the contamination guard
delivers** (corrected, with the four escapes named in `PROBE_SERVER.md` Limits).

What remains open are four small, named fixes in section 12. None of them makes a measurement taken
the documented way -- assert mode, behind `/reload`, one client, one port -- wrong. All four require
the probe itself to spend the world, which is precisely the case the docs claimed to cover.

| | |
|---|---|
| builder's self-test, re-run by me | **PASS 15/15**, screenshot byte-identical, reset 5/5, exit 0 |
| new-family parity (9 families, 13 rows) | **13/13 identical** once no row samples an animation |
| concurrency | requests **serialise**; they do not interleave. But a second client silently **takes the world** |
| idle TTL | was **ABSENT**; **added** (`--idle-ttl`, default 20 min, on) and proven at the OS level |
| the builder's three self-caught bugs | all three fixes **hold** (re-tested, one with a fresh seed) |

Reproduce all of it:

```
node tools/probe_server.cjs --port 9401 &
node tools/probe_server_test.cjs --port 9401 --cold-repeats 3   # the builder's parity proof
node tools/probe_coldverify.cjs --port 9401                     # this battery
```

`probe_coldverify.cjs` exits 1 while the section-12 findings are open. That is deliberate: it is a
check that can fail, and it currently does.

---

## 1. The builder's receipts, re-run

Run of record `2026-08-02T09:27:53Z`, `--cold-repeats 3`, on the committed tree before any edit of
mine.

```
15/15 values identical      screenshot byte-identical      reset proof 5/5      exit 0
```

The regenerated receipts differ from the committed file **on zero value lines** -- only stamps and
timings move. The screenshot came back `sha256 6e7d78dd222d329b4875eac2dd4e4caa28331380146e976bab3b2ca953bea335`,
the same hash the builder committed, and again on two later runs: **three independent runs, one
image**.

| per probe (median) | builder's receipt | my re-run | my re-run after my edits |
|---|---|---|---|
| `/eval`, held state | 11 ms | **8 ms** | **7 ms** |
| `/reload` + measure | 1199 ms | **1260 ms** | **1241 ms** |
| cold launch + parse + measure | 2566 ms | **2258 ms** | **2208 ms** |
| held-state vs cold | 233.3x | **282.3x** | **315.4x** |
| fresh-world vs cold | 2.14x | **1.79x** | **1.78x** |

Both ratios are box-dependent and both claims survive: the held-state ratio came out *better* than
claimed on my box, the fresh-world ratio *worse* (1.79x vs 2.14x) because my cold column was faster,
not because the warm one was slower. Under contention (4 cold boots at once) I measured cold 3568 ms
median against warm 15 ms over 64 probes -- 237.9x, against the receipt's 190.7x.

**The claims reproduce.** The stated 11 ms / 1199 ms / 233x are honest numbers from one box, not
best-of cherry-picks.

## 2. Parity in families the 15 do not cover

Every row below runs the **identical step sequence** through the warm server and through a cold
chromium launched for that row alone, and compares exactly -- geometry as full floats, styles as
strings. The cold path imports `contextOpts`, `wrapExpression`, `waitReady` and `settleDoc` from the
server, so a mismatch can only be warm-versus-cold. Two rows are **also** measured cold by a
hand-written closure that never touches `wrapExpression`, so a wrapper that distorted both sides
identically could not hide behind a MATCH; both agreed.

| family | row | result |
|---|---|---|
| font loading | `fonts_state` -- `document.fonts.status/size/check()` | MATCH (+ closure cross-check) |
| environment / media queries | `env_and_media` -- dpr, 4 media queries, lang, tz, screen, cores | MATCH |
| **deep shadow DOM** | `shadow_deep_geom` -- 107 nodes inside `deep-walkthrough`'s shadow root, sub-pixel widths | MATCH (+ cross-check) |
| shadow computed style | `shadow_deep_style` -- font, colour, border, radius of a node inside the shadow tree | MATCH |
| **a cue in flight** | `anim_census_during_cue` -- 268 live CSS transitions one tick after a theme flip | MATCH |
| **computed style mid-transition** | `computed_style_mid_transition` -- every animation paused at exactly 120 ms, then interpolated colours read | MATCH |
| mid-session resize | `resize_midsession_geom` -- `/viewport` vs `page.setViewportSize` | MATCH |
| scroll state | `scrolled_fold` -- smooth scroll, sampled 2 frames later | **MISMATCH -- see 3** |
| CSSOM | `cssom_census` -- 4 sheets, rule counts | MATCH |
| **persisted state + reset** | `theme_persist_then_reset` -- theme to `ddr.v1.theme`, then a reload must erase it | MATCH |
| persisted state, 2nd class | `bookmark_persist_then_reset` -- 3 app keys written, then a reload | MATCH |
| **post-navigation surface** | `topic_surface_geom` -- a topic view, 3 panes, 92 cards | MATCH |
| post-navigation at phone | `topic_surface_geom_390` | MATCH |
| scroll, animation removed | `scroll_geometry_no_animation` (section I) | MATCH |
| smooth scroll, waited out | `smooth_scroll_completion` (section I) | MATCH |

Sharpest rows, because they are the ones a warm world could plausibly get wrong:

- `computed_style_mid_transition` pins the phase by hand (`pause()`, `currentTime = 120`) and then
  compares *interpolated* colours: `btn_color rgb(173, 167, 157)`, `btn_border rgb(55, 51, 63)`,
  `body_bg rgb(15, 14, 19)` -- **identical**, with 268 animations paused on both sides.
- `shadow_deep_geom` reads through a shadow boundary on a surface none of the builder's rows visit,
  and compares widths like `12.1500244140625` and tops like `126.40937805175781` -- **identical**.
- `theme_persist_then_reset` is the claim the fresh-context reload exists for: flip the theme (the
  app writes `ddr.v1.theme`), reload, and demand `light` / empty `localStorage` / the light
  background back. Warm and cold both return `{"theme":"light","ls":[],"bg":"rgb(250, 249, 245)"}`.
  A `keep_context` reload would not have cleared cookies; the default one does.

One row was **expected** to diverge and did: `instrument_footprint`. The warm world carries
`window.__probeLedger`; a cold one does not. Benign, but real -- a probe that enumerates globals or
counts MutationObservers gets a different answer through this server. It is on the record here so
that it is discovered by reading rather than by debugging.

## 3. The one mismatch, and what it actually was

```
[MISMATCH] scrolled_fold      warm {"y":12,...}   cold {"y":2,...}      (first run: warm 2, cold 0)
```

The app sets `scroll-behavior: smooth` (2 sites in the stylesheet), so `window.scrollTo(0, 400)` is
**animated**. Reading `scrollY` two frames later samples an animation phase, and the two sides do not
have the same gap between the step and the read: the warm side puts an HTTP round trip (~10 ms,
about one frame) where the cold side has an in-process call.

Then my own "fix" was worse than the bug, and it is worth recording. I re-ran the row waiting for
`scrollY` to hold still for 5 frames -- and got **warm 400, cold 0**. That predicate cannot tell
*finished* from *not begun*: the cold side, whose steps arrive back-to-back, satisfies "held for 5
frames" before the scroll animation starts. It is this repo's inverted-guard shape, built fresh, by
the verifier, on the first attempt. On a later run the same predicate returned 400/400 -- a coin
flip.

The row that settles it removes the animation instead of trying to time it:

```
scroll_geometry_no_animation   (scrollBehavior = "auto", scrollTo(0,400), 2 rAF)
  warm = cold = {"y":400,"sh":1349,"tops":[... homestatus top 770.5 ...]}     IDENTICAL
smooth_scroll_completion       (wait for motion to APPEAR, then to stop)
  warm = cold = {"y":400,"behavior":"smooth"}                                 IDENTICAL
```

**Conclusion: the mismatch was the probe, not the tool.** Warm and cold scroll to the same place and
lay out identically afterwards. This is exactly the limit `PROBE_SERVER_RECEIPTS.txt` section 4
declares -- "a measurement that depends on wall-clock time, on animation phase" -- and it now has a
worked example. The operational rule for adopters: **never measure a smooth scroll, a transition or
any in-flight animation by sampling it N frames later, through this server or otherwise. Remove the
animation, or wait on a condition that a not-yet-started animation cannot satisfy.**

## 4. The second client

The docs say "single client". Measured, that is a **convention with no mechanism**.

**Requests serialise -- they do not interleave.** A 900 ms busy-loop probe was issued, then a trivial
probe 60 ms later:

```
slow probe (900ms busy loop) returned at t+2405ms   ms=905
fast probe issued at t+60ms  returned at t+2427ms   ms=4
```

The fast probe waited out the slow one. Two clients therefore cannot cross-attribute mutations, and
the mutation ledger's attribution window stays defensible. That is the good news, and it is the part
that matters most.

**But a second client's `/reload` takes the first client's world, mid-sequence, silently:**

```
client A reloads at 1280x800  -> world 18
client B reloads at  390x844  -> world 19
client A then measures        -> {"iw":390,"ih":844}
                                 stamp world=19 pristine=true viewport={"w":390,"h":844}
```

A believes it is measuring the 1280 world it just built. It is measuring B's phone world, and it is
told `pristine: true`. The stamp does carry `world_id` and `viewport`, so the receipt is auditable
after the fact -- but **nothing checks it**, and `withFreshPage()` does not compare the `world_id` it
got from `/reload` against the one each `eval` returns.

This is not exotic: the default port is fixed at 9377 and `ensureUp()` **adopts** a server that is
already listening. Two agents that both call `ensureUp()` on one box land in exactly this state.
Fix F4 in section 12; `probe_client.cjs` now warns about it at the call site.

## 5. The client dies. The server dies.

| event | outcome |
|---|---|
| client killed mid-probe (`SIGKILL` during a 4 s eval) | server answers `/status` normally, keeps the port and the browser. Uptime kept climbing. |
| server killed with `taskkill /F` (no `/T`, no handler runs) | **0 chromium processes left behind** (subtree tracked by PID lineage) |
| server killed with `taskkill /F /T` | 0 left behind |
| server exits by idle TTL | 0 left behind, port free |
| a probe that never returns (`while(true){}`), then idle TTL | server still exited (7.2 s), port free, **0 left behind** |

So the orphan risk is **not** "a killed server leaves a browser" -- Playwright's browser dies with
its parent's pipe, reliably, even on a hard kill. The orphan risk is **"a server nobody ever kills
never dies"**, which is what the idle TTL is for (section 10). The wedged-renderer row also shows the
shutdown path is not defeated by a page that will not stop running.

## 6. Error paths

Thirteen shapes, all named, none silently null:

```
syntax error             -> 400  SyntaxError: Invalid or unexpected token
reference error          -> 400  ReferenceError: thisIdentifierDoesNotExist is not defined
throw                    -> 400  TypeError: deliberate
rejecting promise        -> 400  Error: rejected on purpose
DOM node returned        -> 400  "produced a DOM node, which cannot cross the wire: <div>. Return ..."
DOM collection returned  -> 400  "produced a DOM collection ... [object NodeList]"
function returned        -> 400  "produced a function ..."
circular object          -> 400  "produced a object (Converting circular structure to JSON ...)"
empty expr               -> 400  need {expr} or {body}
bad mode                 -> 400  mode must be "assert" or "explore"
undefined returned       -> 200  value null, kind "undefined"     (distinct from kind "null")
NaN / +-Infinity         -> 200  {"w":"__NaN__","h":"__Infinity__","d":"__-Infinity__"} + warning
2 MB string length       -> 200  2000000
unknown route            -> 404  with the endpoint list
Host: evil.example.com   -> 403  loopback only (bad Host header)
```

The envelope does its job: nothing came back as a confident `null`. Note that `probe()` returns
`r.value`, so the `undefined`-vs-`null` distinction only reaches a caller who asks for `{raw:true}`.

## 7. What the guard cannot see

The MutationObserver is a **DOM-mutation instrument**, and the docs claimed the discipline "survives
an author who believed their expression was a pure read and was wrong". Four ways of spending a
world are not DOM mutations. Each of these ran in **assert** mode, was attributed **0 mutations**,
left the world **`pristine: true`**, and the **next assert probe was served**:

| what the probe did | measured effect on the next measurement |
|---|---|
| `styleSheets[0].insertRule("#homerail{width:5px !important}")` | `#homerail` width **260 -> 5** |
| a write inside a shadow root (`sr.querySelector("div").textContent = ...`) | shadow text **"" -> "SHADOW-CONTAMINATED"** |
| `localStorage.setItem("ddr.v1.theme", ...)` | keys **`[]` -> `["ddr.v1.theme"]`** (survives into the app's next boot) |
| `location.href = "about:blank"` | the whole document replaced; next probe reads `{"url":"about:blank","app":"undefined","ledger":"undefined"}` with `pristine: true` |

The navigation case is the sharpest: the document goes, **the ledger goes with it**, `drainLedger()`
returns empty on failure, and so the server reports the *old* world as still pristine. `/status`
after it: `pristine=true world=22 dirty_why=""`.

The control arm is clean -- a one-attribute set on `<html>` **is** caught (1 mutation, next assert
refused 409), and a mutation on a **detached** node correctly does **not** dirty the world (no false
refusal). So the mechanism is right; its stated scope was wrong. `PROBE_SERVER.md` now says what it
covers, and section 12 has the fixes.

Scroll position is invisible to the ledger for the same structural reason. I could not make it
change a measurement on the home surface (the smooth-scroll animation had not moved when the next
probe ran), so it is listed as unproven rather than demonstrated -- but it is the same class.

## 8. The builder's three self-caught bugs, re-tested

1. **The envelope names what cannot cross the wire.** Verified above -- DOM node, DOM collection,
   function and a circular object each come back as a named 400 with the remedy in the message, and
   `NaN`/`Infinity` survive as strings rather than becoming `null`.

2. **The quiesce-by-shape guard catches a one-mutation contamination.** Re-tested with a **different
   mutation class** from the builder's (they write `textContent`, a `childList` record; I set a
   single attribute on `<html>`), 3/3 trials:

   ```
   trial 1..3: quiesce=5f/4f/3f | pure read pristine=yes | caught=yes(1: ["attributes html[data-cv]"])
               | next=REFUSED 409 | explore saw it=yes | after reload=GONE  -> PASS
   ```

   Plus two arms the builder did not run: a **net-zero** mutation (set then remove) is caught
   (2 mutations, dirty) -- an end-state comparison would have missed it; and a **detached-node**
   mutation is correctly ignored, so the guard has no false-positive appetite.

3. **`vacuous()` fails a run on an all-zero rect row.** Seeded: a copy of the builder's own test with
   `#hometabs` measured at 1280x800, where it is `display:none`, so warm and cold agree perfectly at
   all zeros. `vacuous()` in the copy is character-identical to the shipped one.

   ```
   homerail_geom_1280         cold 2555ms | MATCH
   SEEDED_hometabs_geom_1280  cold 2576ms | VACUOUS (carries no information -- this row proves nothing)
   === VERDICT: FAIL  (1/2 values identical, 1 problem(s)) ===        exit 1
   ```

   The guard fails the run on a comparison that could not fail. It holds.

## 9. The stamps

Present on **every** response shape, including the refusal:

```
/reload              world=36 probes_since_reload=0 since_reload_ms=0   pristine=true
/eval#1,#2,#3        world=36 probes_since_reload=1,2,3                 (monotonic)
/reload(2)           world=37 probes_since_reload=0 since_reload_ms=0   pristine=true
/eval after reload   world=37 probes_since_reload=1 since_reload_ms=8
/screenshot          world=37 probes_since_reload=2
/viewport            world=37 pristine=false
/eval refused 409    world=37 pristine=false        <- the 409 payload carries the stamp too
```

`world_id` increments per reload, `probes_since_reload` resets to 0 and counts up from 1, and
`since_reload_ms` restarts. No endpoint is missing a field. The claim holds exactly as written.

## 10. The idle TTL -- verifier-added, and proven

**State before this commit: absent.** There was an opt-in `--idle-exit-ms` that defaulted to `0`,
i.e. never, and the only caller that passed it was `ensureUp()`. A server started by hand -- the
documented way -- lived forever. Measured on the unmodified build: `--idle-ttl` was ignored,
`/status` had no idle fields, and after 30 s of silence the process was still alive with the port
held.

Added, per the adoption gate:

- `--idle-ttl MINUTES`, **default 20, on by default**; `--idle-exit-ms N` still wins if both are
  given; `0` disables and the server says so at startup. A flag given without a value is a startup
  error, not a guessed default -- a server that ran forever because a flag was mistyped is the exact
  failure the timer exists to prevent.
- The timer is reset when a request **arrives** and again when its response **completes**, so a
  1.3 s `/reload` or a slow screenshot can never be mistaken for silence. Poll interval is a quarter
  of the budget, capped at 5 s, so a small TTL is honest rather than rounded up.
- `/status` publishes `idle_ttl_ms`, `idle_ttl_min`, `idle_ms` (the gap **before** the request being
  answered -- reporting the post-touch 0 would be a number that could never be interesting) and
  `idle_exit_in_ms`. The startup line carries `idle_ttl_ms` too.
- Shutdown closes the browser but **exits regardless after 8 s**: a probe that left an infinite loop
  running can wedge `browser.close()`, and a shutdown path that can hang is the orphan again in a
  graceful-close costume.

Proof, at the OS level:

```
started pid 12636 on port 9408 with --idle-ttl 0.05 (3s)
/status reports idle_ttl_ms=3000 idle_ms=98
a probe at t+2.0s was served (200)                     -- the timer must have been reset
at t+4.2s (2.2s after that probe): server alive = true -- keep-alive works; it did not die at 3s
left idle: process exited after 4615ms of silence = true
port 9408 free at the OS level: true
VERDICT: the idle TTL fires, the process exits and the port is released
```

And against a wedged renderer (`while(true){}` left running in the page):

```
server exited after 7174 ms of silence: true
port 9412 free: true      browser processes left behind: 0 []
```

Budget resolution is unit-checked: 6/6 correct (`{}` -> 1200000, `--idle-ttl 0.05` -> 3000,
`--idle-ttl 0` -> 0, `--idle-exit-ms 5000` -> 5000, both-given -> the ms one), and 4/4 malformed
inputs rejected with a message naming the unit.

**Regression:** the builder's own self-test was re-run against the modified server --
**15/15 MATCH, screenshot byte-identical, reset 5/5, exit 0, and zero value-line differences against
the committed receipts.** The lifecycle change moved no measurement.

## 11. Smaller findings

- **The viewport is sticky.** `/viewport 390x844` writes `state.viewport`, so a later **bare**
  `/reload` boots at 390 rather than at the size the session started with. Measured: started 1280,
  resized to 390, bare reload -> `innerWidth 390`. The stamp reports it, so it is auditable; pass the
  viewport explicitly when a verdict rests on it. Documented in `PROBE_SERVER.md` Limits.
- **`POST /viewport {}` dirties the world for nothing.** With no `w`/`h`/`viewport` in the body,
  `parseViewport` falls back to the current size, the resize is a no-op, and the world is still
  marked dirty -- costing a 1.3 s reload for a request that changed nothing.
- **`/viewport`'s dirty-by-design is prudent but not demonstrated here.** I compared a **booted**
  390x844 world against a **resized** one over a wide read -- `innerWidth/Height`, scroll extents,
  four element rects with `display` and `position`, twelve `.hm-seg` sub-pixel widths, card count --
  and they were **identical**. The reasoning in the docs is sound in general (one-shot boot
  decisions really can differ); on this app, on this surface, the extra reload buys nothing
  measurable. Keep the behaviour, but the doc should not imply it has been shown to matter here.
- **One runaway expression wedges the server for everyone.** There is no per-probe timeout: a
  `while(true){}` probe blocks the serial chain, and every later request from any client hangs until
  the process dies. The idle TTL now bounds the damage in time; it does not bound it in requests.
- `doEval` sets `e.stamp = true` on its error path and nothing ever reads it -- dead code.
- The Host-header check splits on `:`, so a literal `[::1]:9377` Host resolves to `[` and would be
  403'd. Unreachable in practice (the server binds `127.0.0.1` only), noted for completeness.

## 12. Named fixes, prioritised

**F1 -- detect a replaced document (closes the navigation escape).** At the end of `reload()`, plant
`window.__probeWorld = state.worldId`; in `doEval`, read it back in the same round trip as the
drain. If it is missing or different, the document was replaced: `dirty('the page navigated away
(...) -- the world is gone')`. About six lines, and it converts the worst silent case into the loud
one.

**F2 -- observe shadow roots.** `INSTALL_LEDGER` observes `document.documentElement` with
`subtree: true`, which does **not** cross shadow boundaries. Walk the hosts
(`[...document.querySelectorAll('*')].filter(e => e.shadowRoot)`) and `obs.observe(host.shadowRoot,
...)` for each; this app has 17, so the walk is cheap, and re-walking on drain covers hosts that
appear later.

**F3 -- a side-state digest beside the mutation count.** In the same evaluate as `drain()`, return
`{sheets: [...document.styleSheets].map(s => s.cssRules.length), ls: localStorage.length, sx: scrollX,
sy: scrollY}`. Compare against the value captured at reload; any change dirties the world. Closes
CSSOM, storage and scroll in one shot, at the cost of no extra round trip.

**F4 -- a world token on the wire.** Accept `/eval {expect_world: N}` and answer 409
`WORLD_CHANGED` when `state.worldId !== N`; have `withFreshPage()` pass the `world_id` its `/reload`
returned, automatically. That turns the second-client case from a silent wrong answer into a
refusal. Cheaper still, and complementary: derive the default port per agent rather than fixing it
at 9377, so `ensureUp()` cannot adopt a stranger's browser.

**F5 -- bound a probe.** A `--probe-timeout-ms` (30 s, say) that races `page.evaluate`, then forces a
fresh context and marks the world unusable. Without it, one bad expression takes the server down for
every client until the idle TTL collects it.

**F6 -- nits.** Delete the dead `e.stamp`; make `POST /viewport` with no size a 400 instead of a
free dirty.

## 13. What this verify does not prove

- **Not parity under load.** Like the builder's, both passes ran on a box that was quiet apart from
  the measurement itself. Other agents were active during some runs; that moves timings, not values,
  and the values were compared exactly.
- **Not every measurement.** 15 (builder) + 15 (mine, in nine further families) is not "all". The
  class where warm and cold genuinely can part company is named and now has a worked example:
  anything sampled while an animation is in flight (section 3).
- **Not that the guard is complete.** Section 7 is a list of four escapes found by looking; it is
  not proof that there is no fifth. The right reading of section 7 is that the guard covers DOM
  mutations well and that its documented scope, not its mechanism, was the defect.
- **Not that adoption is free.** The tool is still opt-in, nothing in `test/` calls it, and
  `check_all.py` is untouched. That remains true after this verify.
