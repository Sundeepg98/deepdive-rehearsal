<!-- Filed verbatim. Author: w24-verifier (independent cold verify, 2026-07-31), commissioned by
     team-lead as round 2 on this wave. The body below is unedited; the builder's responses to each
     finding are in _audit/2026-07-31-w24-names.md under "Round 2". -->

# W24 Real-AT Wave A -- COLD VERIFY

**VERDICT: 6 FINDINGS, ALL NON-BLOCKING. The wave is sound and safe to merge.**
All seven audit findings (P2-3, P2-4, P2-6, P2-7, P3-2, P3-3, P3-8) are genuinely fixed and I
confirmed every one of them **by ear on the committed tree with my own drive**. The gate re-runs
74/74 first try, the VR contract is exact at the object level, and the glyphs still paint. What
the findings touch is the wave's **claims and its ratchet**, not its behaviour: one headline count
is over-scoped (a real P2-7-class defect survives, with a by-ear receipt), and the ratchet does
not hold shut two things it is described as holding shut. Nothing here is a regression -- every
site I flag is **better** on the tip than on the base.

Target verified: worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\w24-names`,
branch `at/a-name-hygiene`, tip `3e18fcc`, base `8b2599b`.
Repo left **untouched** (`git status` clean, tip unmoved, the three tracked build outputs
hash-identical before and after my gate run). Bench written only as authorised: two new
`logs/w24v-*.jsonl`.

---

## FINDINGS

### F1 -- NON-BLOCKING (material): the measured "27 distinct offending names -> 0" is refuted. Four remain, and NVDA speaks them.

The freeze's headline is a **measured** whole-app claim:

> Chromium's full AX tree was swept across the home, the topic route, all ten panes and four
> overlays [...] **before 27 / after 0**

My independent stateful sweep of the **shipped** deliverable (998 named controls across 16 stops)
returns **4**, all the same control class:

```
[U+2713] button  "1 . , Strategy dispatch"        @walk:step0
[U+2713] button  "2 . , Single-read fork"         @walk:step1
[U+2713] button  "3 . , Cursor export"            @walk:step2
[U+2713] button  "4 . , Import conflict ladder"   @walk:step3      (. = U+2713)
```

**Source:** `src/scripts/app/walkthrough/logic.js:122`

```css
.arc-step.done .arc-n::after{content:"\\2713";font-size:var(--font-size-nano);margin-left:var(--space-1)}
```

CSS generated content carrying a decorative glyph inside a nameable subtree -- **exactly the
fourth fix shape the wave itself defines** ("two `content` declarations: the plain one, then the
alt-text one"), which the wave applied at four other CSS sites (U+203A, U+2605, U+25CF, U+21B3)
and not at this one. The wave edited this very file and this very element three lines of intent
away, inserting the `.nsep` at `logic.js:194`.

**It is heard, not merely present.** No round had ever driven the walkthrough into its `.done`
state, so I did -- one run, one build, the same control before and after advancing:

```
pending | clickable, 1,The producer emits and moves on, button
done    | clickable, 1, check, ,The producer emits and moves on, button
```

NVDA speaks the word **"check"** on every completed step. By the audit's own established rule
("when NVDA verbalizes a symbol the capture contains the ENGLISH WORDS") this is a live P2-7
defect on the shipped tree. It also lands *between* the numeral and the authored comma, giving a
doubled-comma stutter: `1, check, ,`.

**Why non-blocking.** The base is strictly worse at this same site (`1 [U+2713] Strategy dispatch`
-- glyph *and* glue), so the wave improves it; the remedy is one line plus one ratchet assertion;
and it is invisible to both the static check (arm B has no entry for it) and to any sweep that
does not instantiate the state. This is the wave's own `#wnext` lesson -- *"a source inventory can
only hold shut what someone thought to list"* -- one step short: the runtime sweep only covered
the states someone thought to instantiate.

**Correction required:** the "27 -> 0" sentence should read as scoped to the surfaces swept, with
the walkthrough's completed-step state named as uncovered.

Receipts: `axsweep-stateful` output in `w24v-arc-console.txt`;
`D:\claude-workspace\at-spike\logs\w24v-arc-check.jsonl` (record `ARC-CHECK-VERDICT`).

### F2 -- NON-BLOCKING: the ratchet does not hold shut the wave's own hardest-won decision.

The wave's most-emphasised rule, written at the primitive's declaration: *"One character,
everywhere; do not make it prettier."* A period was shipped in drive 1 and NVDA spoke it as "dot"
on every card -- the finding the whole wave turns on.

Measured on a green scratch copy (baseline 47/47, exit 0):

| mutation | result |
|---|---|
| period at the kicker/description seam (drive 1's exact defect) | **PASS 47/47** |
| period at **all 12** separator sites | **PASS 47/47, 0 FAIL** |

Arm A asserts only that a separator is **non-whitespace**; a period is non-whitespace. So the
single defect the wave discovered by ear can be reintroduced everywhere and the gate stays green.

### F3 -- NON-BLOCKING: the non-whitespace assertion has a blind spot at the one DOM-API site.

`[nsep] every authored separator carries a NON-WHITESPACE character` scans
`class="nsep"...>text<` **markup only**. The focus timer builds its separator through the DOM
(`pomodoro.js`: `sep.textContent = ', '`), so its text is never checked -- and that site's own
`[sep]` assertion is structural (`timeText ... nsep ... phaseText`).

Setting the timer separator to a single space passes **47/47**. That is precisely the "likemodel"
bug this arm exists to prevent (an authored space collapsed away at a block boundary),
reintroducible at one of the twelve sites.

### F4 -- NON-BLOCKING (documentation): the registration comment's numbers are wrong.

`test/check_all.py` states `RED on 41 of 44 assertions before the wave`. Measured with the
**shipped** instrument against `git archive 8b2599b src`: **44 of 47**. The freeze's own table is
correct (`3/47 assertions`, `FAILED 44`); only the registration comment disagrees.

### F5 -- NON-BLOCKING (evidence gap, and I closed it): the audit's binding layout condition had no committed receipt.

The audit makes this binding for P2-4: *"any 'glue fixed' check that runs at a single viewport and
text size proves nothing. Verify at two widths at minimum."* The freeze asserts a precise result --
"verified at **1440x900, at 1024x768, and at 116% text zoom** [...] byte-identical in all three" --
but **nothing in the commit carries it**: the NVDA logs contain no viewport or zoom phase, the
ratchet has no such arm, and no script or capture was committed.

I reproduced it rather than just flagging it. Reading the flattening path (`innerText`) on both
builds at all three conditions:

- BASE: no separator at any of the three.
- TIP: separator present at all three; `--read-zoom` measured `1.16` at the ceiling arm.

**The claim is TRUE.** Only its receipt was missing.

### F6 -- OBSERVATION, outside Wave A's scope: NVDA verbalizes the native `<details>` marker.

My drive heard `filled right-pointing small triangle, What a complete answer sounds like,...`.
**Pre-existing, not a regression:** it appears in the AT-1 logs (`at1-d4-overlays`,
`at1-d5-browse-reader`) carrying the *old* glue (`sounds likemodel script`). Neither the audit nor
the wave's drive reports it -- the wave's drive never reached that control. It is a UA-generated
marker outside the accessible name, so it is invisible to both the accname sweep and the static
check. Worth an entry in a future wave's inventory; nothing for W24 to answer for.

---

## WHAT I VERIFIED GREEN

**Gate, re-run by me:** `GATE: PASS -- 74 checks, 0 FAIL, 0 SKIP`, exit 0, **first try** (no
retry; `touch_floor` and the reveal/grade checks all PASS). `visual_regression PASS (16 baselines
... matched its committed pixels)`; `at_name_hygiene: 47/47 assertions, 6 + 2 mutants all
detected`. Tree still clean afterwards. -> `gate-rerun.txt`

**Watched-red, shipped instrument vs pre-wave source** -- reproduces the freeze **exactly**:

```
at_name_hygiene: 3/47 assertions, 6 + 2 mutants all detected
FAILED 44 assertion(s)
   3 [nsep]   12 [sep]   22 [glyph]   2 [toggle]   5 [collision]
```

-> `watched-red.txt`. The 3 green are arm D's corpus guards, correctly green before the wave.

**Falsification (brief-mandated), on a green scratch copy:**

| mutation | expected | result |
|---|---|---|
| re-glue ONE separator (room numeral) | red | RED -- isolates `[sep] room numeral / room name` |
| un-hide ONE glyph (mock-run play U+25B6) | red | RED -- isolates `[glyph] mock-run play U+25B6` |
| re-duplicate the Cram name | red | RED -- 2 `[collision]` assertions |
| whitespace-only separator at a markup site | red | RED -- `[nsep] ... NON-WHITESPACE` |

Each mutation was verified to have actually applied (an anchor matching != 1 aborts the test);
two early attempts were silent no-ops and were rejected and redone rather than reported as passes.

**VR, object-level:** 1327 PNG blobs compared `8b2599b` vs `3e18fcc` -- `identical=1327 changed=0
new=0`. `test/baselines` = 16 baselines + `manifest.json`, `git diff --name-only` returns **0**
changed files. The freeze's stated contract is byte-identical with no churn and none used --
verified exactly, and the live VR check re-passed against committed pixels in my own gate run.

**Glyphs still paint** (the accessibility fix is visually inert): element-level PNG crops on the
topic route, base vs tip -- `crambtn-chevron`, `theme-toggle-moon`, `mock-run-play`,
`walk-next-arrow`, `walk-prev-arrow` -- **all five byte-identical** (same sha256, same WxH, same
byte length). `.crambtn::after` resolves to `"[U+203A]" / ""`: glyph kept, alt text empty.

**My own AX census, boot surfaces** (my own 19-code-point set, deliberately excluding the em dash
and middot the audit measured as unspoken): identical 17 stops and 800 named controls on both
builds -- **BASE 21 distinct offenders -> TIP 0**. Exactly 13 of the base offenders are U+203A
tool buttons, **independently confirming the freeze's "13"** against the audit's under-count of 11.

**My own NVDA drive** -- `logs/w24v-names-verify.jsonl`, 130 utterances, **5/5 focus gates passed
first attempt**, 4 positive controls PASS. I added the control the wave's drive lacked: master and
this worktree share a window title, so a positive fingerprint alone cannot prove which build you
drove. **Eight NEGATIVE controls, all PASS (absent):** the fused room numeral, the fused
kicker/description, the spoken period, the colliding Cram name, the fused timer, the empty spoken
field, the doubled toggle state, and every verbalized decoration. **Zero** of my 130 utterances
carry any decorative code point.

As-heard, verbatim from my log:

```
1,Messaging and Events 7 topics 0 of 7 started 0 percent drilled, button   (all six rooms)
Attribute Store,ATTRIBUTE BOUNDARY,A schema-flexible attribute store ...
Consistency Models,THE CONSISTENCY SPECTRUM,A consistency model is the contract ...
Cram: Messaging and Events, button / Cram: Data and Storage / Cram: Reliability and Observability
25:00,FOCUS
Search, button, slash Control plus K Meta plus, K   /   Topic index, button, backslash
Interviewer cuts in mid-answer, toggle button, not pressed
Mock run -- the full round, on the clock, button   /   Start the drill, button, N
```

**Coverage the wave did NOT have, which I obtained.** The freeze states these were "NOT reached by
ear". My longer sweep reached them, and each is clean:

- **the theme toggle** -- `Dark mode, toggle button, not pressed` (action named once, state from
  `aria-pressed`, no U+263D moon spoken). The freeze covered this by CDP accname only.
- **13 of 13 chevron-tailed tool buttons** heard (the freeze claimed 5 of 13), chevron absent on
  every one.
- **the shadow-root separator sites** -- the walkthrough's arc steps heard as `2,The emit is made
  atomic ...`, which proves `BASE_SHEET`'s `.nsep` copy works **by ear**, not only by VR inference.
- **the model-script summary seam** -- `sounds like,model script ...`, the authored-space bug fixed.

**Freeze accuracy, cross-checked:**

- 17 of 17 "before" strings found verbatim in the AT-1 logs (the chevron one only in the UTF-8
  JSONL -- the ASCII transcript transliterates it, which is why a naive grep misses it).
- Every "after" string found verbatim in the committed drive-2 log.
- The drive-1 spoken-period receipt is **genuine and committed**: `608710e` is a pure rename;
  drive 1 shows `Attribute Store,ATTRIBUTE BOUNDARY dot A schema-flexible` and carries `" dot "`
  on **100** lines against **0** in drive 2; "comma" is spoken **0** times in both.
- 12 separator sites: 11 `class="nsep"` in markup + 1 DOM-API separator = 12. Matches.
- 4 CSS alt-text pairs in the shipped deliverable. Both `.nsep` declarations present.
- The freeze honestly reports only 3 of 6 Cram names as heard; drive 2 contains exactly those 3.
- The freeze's G1 FAIL is correctly diagnosed as a harness artifact: my differently-built control
  on the same channel PASSES, and the window title is independently proven by 5 passing gates.
- 17 shadow roots + 1 light DOM = the VR check's "18 roots". Consistent.

---

## HAZARDS PRE-CLEARED

Speech Viewer `showSpeechViewerAtStartup = False` and oneCore `volume = 0` confirmed in the
portable config before starting; no NVDA process running beforehand; real desktop session; keys
validated via `assertKeys` before the machine was touched; Chrome profile reset per run; every
control matched by **spoken name**, never by tab index; focus gate at every phase boundary (8/8
passed first attempt across both drives). Browser work was run **before** NVDA and never
concurrently, so no load artifact could truncate an utterance.

**No image-wide kills.** I censused Chrome by executable path first: all 49-50 processes were the
operator's own browser and were left untouched; my spike Chrome was closed with the bench's own
`close-spike-chrome.ps1`, which filters on the isolated `--user-data-dir`. Final census: zero
Playwright or bench processes remaining. PowerShell was invoked only via `.ps1` files.

---

## RECOMMENDED FOLLOW-UP (none blocks the merge)

1. `walkthrough/logic.js:122` -> `content:"\\2713";content:"\\2713" / ""` (the wave's own shape #4),
   and add the matching arm-B assertion so it is held shut.
2. Correct the "27 -> 0" sentence to name the surfaces swept, and the completed-step state as
   uncovered.
3. Pin the separator **character** in arm A (assert a comma, not merely non-whitespace) -- that is
   what makes drive 1's finding permanent.
4. Extend the non-whitespace check to the DOM-API site, or assert `sep.textContent` directly.
5. Fix the `41 of 44` comment in `check_all.py` to `44 of 47`.
6. Commit a receipt for the two-viewport + 116%-zoom verification (the claim holds; only the
   evidence was missing).

---

## RECEIPTS

Scratch root: `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w24-verify\`

| what | file |
|---|---|
| my gate re-run, 74/74 | `gate-rerun.txt` |
| watched-red, shipped instrument vs pre-wave src | `watched-red.txt` |
| green baseline + 7 mutation demos | `mut-0-baseline.txt`, `mut-1..7-*.txt`, `mutate.py` |
| AX glyph census, both builds | `axsweep.cjs`, `axsweep-BASE.json`, `axsweep-TIP.json` |
| stateful AX census (found F1) | `axsweep-stateful.cjs`, `w24v-arc-console.txt` |
| glyph paint, element crops | `glyphpixels.cjs`, `px-{BASE,TIP}-*.png`, `glyphpixels-*.json` |
| **my NVDA utterance log** | `D:\claude-workspace\at-spike\logs\w24v-names-verify.jsonl` |
| **my NVDA console (controls)** | `w24v-drive-console.txt` |
| **my arc-check NVDA log (F1 receipt)** | `D:\claude-workspace\at-spike\logs\w24v-arc-check.jsonl` |
| arc-check console, before/after A/B | `w24v-arc-console.txt` |
| drive scripts | `w24v-drive.mjs`, `w24v-arc-drive.mjs` |
| chrome path census (no image-wide kills) | `chrome-census.ps1` |
| consolidated static/browser evidence | `evidence-static.md` |
