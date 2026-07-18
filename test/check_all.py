#!/usr/bin/env python3
"""THE GATE. One command runs every correctness check; non-zero exit if any fail.

This replaces per-edit manual vigilance with tooling that runs on every build:
  ascii_guard      source is ASCII-only            (encoding invariant)
  syntax_check     every editable module parses
  build_integrity  build resolves + deliverable consistent + structure present
  render           panes/overlays render, no JS/ref errors, no overflow  (browser)
  entity_leak      no HTML entity reaches visible text                   (browser)
  e2e_interactions theme/text-zoom/drill must-hit/rescues, 0 console errs (browser)
  progress_merge   a filtered sub-drill MERGES into progress, never truncates (browser)
  card_identity    a grade survives its bank being REORDERED + INSERTED into  (browser)
  topic_contract   every topic POPULATED to the depth of the hand-coded 8 (browser)
  cram_scope_distinct  no two topics RENDER the same cram/scope body       (browser)
  rail_integrity   the coaching rail NEVER shows another topic's note      (browser)
  layout_static    source-level layout assertions (a regex; SEES NO PIXELS)
  visual_regression the app is RENDERED and its pixels diffed vs baselines (browser)

A NOTE ON WHAT A GREEN GATE MEANS (learned the hard way, 2026-07-11).
This gate reported PASS 19/19 while the compiler silently discarded 571 authored items on every
build, because every compiler check compared the parser against a fixture curated to the parser's
working subset, or against the parser's own output. A test whose reference is derived from the
system under test cannot fail when that system is wrong; it can only agree with it. Two checks
here now hold an INDEPENDENT reference -- compiler_conservation (the author's raw bytes) and
compiler_doc_examples (the format spec's own worked examples) -- and topic_contract now measures
POPULATION against the 8 hand-coded topics rather than asserting a slice is merely present
(`if (!data[v])` is truthy for `{stages: []}`). Do not add a compiler check whose expected value
comes from the compiler.

Browser checks are SKIPPED (not failed) when Playwright/Chrome are absent, so
this is CI-safe; locally (or in CI after `npm install && npx playwright install
chromium`), with a browser present, it is the full gate. Chromium is located via
Playwright itself, so there are no hardcoded paths.
"""
import os, sys, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def run(cmd, env=None):
    # THE GATE MUST SURVIVE WHATEVER A CHECK PRINTS. Two separate ways it did not:
    #
    # 1. DECODE. Without encoding/errors, Python decodes a child's stdout with the platform codec
    #    (cp1252 on Windows), so a SINGLE non-ASCII byte in any check's output -- a "->" chip
    #    rendered as U+2192, a smart quote in a topic's prose -- raises UnicodeDecodeError inside
    #    the reader thread, leaves r.stdout as None, and takes down the whole gate with a
    #    TypeError instead of reporting the check.
    # 2. ENCODE. A Python child inherits the console's cp1252 stdout, so its own print() of an
    #    em-dash puts byte 0x97 on the pipe -- not valid UTF-8. errors='replace' turns that into
    #    U+FFFD, and printing U+FFFD back to the cp1252 console raises UnicodeEncodeError. The
    #    gate then dies while REPORTING a failure, which is the worst possible moment.
    #    PYTHONIOENCODING makes every Python child emit UTF-8 regardless of the console, and
    #    ascii_safe() below guarantees the summary line is printable no matter what arrives.
    env = dict(env or os.environ)
    env.setdefault('PYTHONIOENCODING', 'utf-8')
    return subprocess.run(cmd, capture_output=True, text=True, env=env,
                          encoding='utf-8', errors='replace')

def ascii_safe(s):
    """Anything -> printable ASCII. The summary must render on any console."""
    return str(s).encode('ascii', 'backslashreplace').decode('ascii')

def last_line(r):
    out = ((r.stdout or '') + (r.stderr or '')).strip().split('\n')
    return out[-1] if out and out[-1] else (out[-2] if len(out) > 1 else '')

def report(r):
    """The message the gate prints for a check.

    THE GATE MUST NEVER PRINT A RED IT CANNOT EXPLAIN. A check that dies without output --
    killed, crashed, or exiting before its diagnostic flushed -- used to render as a blank
    message next to the word FAIL. A failure with no stated cause is indistinguishable from
    noise, and a human who cannot tell noise from signal re-runs the gate until it is green.
    That reflex is exactly how a compiler bug that destroyed 608 authored items per build
    survived weeks of PASS 19/19. So: say the exit code, say that there was no output, and
    make a silent death look like the anomaly it is instead of a shrug."""
    msg = last_line(r)
    if msg:
        return msg
    return '(no output; the check died silently -- exit=%s. This is a HARNESS fault, not a flake.)' % r.returncode

def browser():
    """Locate Chromium via Playwright itself -- portable across OSes once
    `npm install` + `npx playwright install chromium` have run. Relies on the
    local node_modules (no NODE_PATH) and has no hardcoded sandbox paths."""
    r = run(['node', '-e', "process.stdout.write(require('playwright').chromium.executablePath())"])
    p = (r.stdout or '').strip()
    return p if r.returncode == 0 and p and os.path.exists(p) else None

results = []
for name, cmd in [('ascii_guard', ['python3', 'test/ascii_guard.py']),
                  ('syntax_check', ['python3', 'test/syntax_check.py']),
                  ('global_collisions', ['python3', 'test/global_collisions.py']),
                  ('build_integrity', ['python3', 'test/build_integrity.py']),
                  ('css_syntax', ['python3', 'test/css_syntax.py']),
                  # THE SIX ROOMS invariants (Phase 6 -- each would have caught a bug that
                  # shipped for months). room_static: codemod=0, styles.css infinite=0, the
                  # palette + rebind + boot stamp are present. room_contrast: the six rooms'
                  # ink/bg + on-solid contrast is re-derived from the hex via WCAG and must
                  # clear AA -- the contract is the contrast, not the hex.
                  ('room_static', ['python3', 'test/room_static.py']),
                  ('room_contrast', ['python3', 'test/room_contrast.py']),
                  # slab_ink: EVERY colour this app fills a slab with (--acc/--acc2, and the
                  # verdict hues --teal/--red/--amber/--indigo) INVERTS its lightness between the
                  # two themes -- it has to, to stay legible against its own background. So a
                  # literal `color:#fff` on one is correct in exactly ONE theme, and nothing about
                  # the rule looks wrong. 25 rules had it; measured in dark, white on the drill-nav
                  # chip came in at 2.35-2.44:1 -- half the AA floor, on a "you are here" marker,
                  # shipped. A grep cannot see contrast, but it CAN see a literal white in the same
                  # rule as a flipping background, which is the shape this bug has every time --
                  # and unlike the browser check it reaches the :hover, :focus and ::selection
                  # rules no smoke test can navigate to. 0.6s.
                  ('slab_ink', ['python3', 'test/slab_ink.py']),
                  ('file_integrity', ['python3', 'test/file_integrity.py']),
                  ('unit_tests', ['python3', 'test/unit_tests.py']),
                  # The visual sim's invariants ARE the teaching points its modes exist to
                  # convey (capacity is linear in a worker pool; partition-capped in a Kafka
                  # consumer group; a pool does not stop the world when you add a worker).
                  # They shipped UNGATED: nothing in CI ran them, so a sim that taught a
                  # falsehood would have gone green. Includes the golden-trajectory replay
                  # that pins kafka-internals' shipped visual to the exact numbers it had
                  # before the sim was generalised. Pure node, no browser, ~1s.
                  ('sim_invariants', ['node', 'visual-trainer/test/sim_invariants.mjs']),
                  # 15: the end-to-end behavior contract -- boots both first-run and
                  # returning branches, the conditional GPU pane pipeline, [hidden]
                  # integrity, mobile tap floors. Runs after build_integrity so
                  # dist/index.html exists. Needs a browser: local shells export
                  # CHROME; CI installs Chromium via npx playwright install.
                  ('visual_pane_smoke', ['node', 'test/visual_pane_smoke.mjs']),
                  # WAS `visual_regression`, and the name was the bug. It is a regex over the CSS/HTML
                  # SOURCE -- it imports re/sys/os and nothing else, so it structurally cannot observe a
                  # pixel, and a DOM reorder that moved the pane switcher went through it GREEN. Its
                  # assertions are still worth having (they reach :hover rules and keyframe bodies that no
                  # screenshot can navigate to); they are simply not visual regression, so they no longer
                  # claim to be. The pixel check now owns that name, and runs below with the browser.
                  ('layout_static', ['python3', 'test/layout_static.py']),
                  # ---- COMPILER: does it keep what the authors wrote? --------------------------
                  # These two have an INDEPENDENT reference and are the only checks here capable of
                  # detecting a silent drop. Everything else in this section compares the compiler
                  # against a fixture or against itself, and stayed green through 571 lost items.
                  #   conservation  -- reference: the author's raw bytes in src/topics-md/*.md.
                  #                    A line scanner that shares no code with the parser. Fails if
                  #                    ANY authored item is dropped, annihilated, fused or misfiled.
                  #   doc_examples  -- reference: the worked examples in TOPIC_MARKDOWN_FORMAT.md.
                  #                    Fails if the documented format does not survive its own parser.
                  #                    This is the check that would have caught all 380 drops on day 1.
                  ('compiler_conservation', ['node', 'tools/compiler/prove_conservation.mjs']),
                  ('compiler_doc_examples', ['node', 'tools/compiler/prove_doc_examples.mjs']),
                  # ---- COMPILER: fixture / serializer checks ------------------------------------
                  # compiler_md asserts its own COVERAGE now: a pane missing from the fixture is a
                  # pane it is blind to, and blindness is a hard failure (that blindness is exactly
                  # how 23 green assertions coexisted with a compiler that dropped a third of every
                  # topic). The two below CANNOT detect a parser bug and are named so nobody reads
                  # them as if they could:
                  #   emit_serializer   -- reference is the PARSER'S OWN OUTPUT (round-trip). A parser
                  #                        that drops a field drops it on both sides of the equals sign.
                  #   legacy_topic      -- exercises parse.mjs / the .topic format: 0 shipping topics.
                  ('compiler_md', ['node', 'tools/compiler/prove_md.mjs']),
                  ('compiler_emit_serializer', ['node', 'tools/compiler/prove_emit.mjs']),
                  ('compiler_legacy_topic', ['node', 'tools/compiler/prove_assembly.mjs']),
                  ('compiler_prose', ['node', 'tools/compiler/prove_prose.mjs']),
                  ('compiler_flow', ['node', 'tools/compiler/prove_flow.mjs']),
                  ('compiler_code', ['node', 'tools/compiler/prove_code.mjs']),
                  # build_determinism: the build's syntax highlighting must not depend on the wall
                  # clock. Shiki gives each LINE a 500ms wall-clock tokenize budget and, when a line
                  # is preempted past it (GC, a busy box, builds back to back), BAILS and ships the
                  # rest of that line as one unstyled token. Same source, different bytes, ~10% of
                  # builds -- build_integrity caught the divergence but could only flag it
                  # intermittently. renderShiki now passes tokenizeTimeLimit:0; this drives every
                  # authored block under a SIMULATED stall and fails if the option is ever dropped.
                  # A plain build-twice-and-diff would be decoration here: the flip is load-dependent
                  # so two clean builds agree ~90% of the time. Carries a negative control that
                  # aborts if the stall does not trip a default-budget tokenizer. Pure node, ~2s.
                  ('build_determinism', ['node', 'test/build_determinism.mjs'])]:
    r = run(cmd)
    results.append((name, 'PASS' if r.returncode == 0 else 'FAIL', report(r)))

chrome = browser()
deliverable = os.path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')
for name, script in [('render', 'test/render.cjs'), ('entity_leak', 'test/entity_leak.cjs'),
                     # THE FIRST CLICK MUST LAND. Every layer this app paints over the viewport --
                     # the boot splash and the three overlays -- kept HIT-TESTING while invisible
                     # or fading, and swallowed the user's input. A real trusted click at
                     # splash+87ms landed on #_bootsplash: that is the literal first tap of every
                     # session, for EVERY user. The index overlay held pointer-events:auto over the
                     # whole viewport for 220ms after close(), and left focus in its own <input>,
                     # which shell.js bails on BEFORE it reaches the dialog gate -- so clicks AND
                     # keys were eaten. It also opened ITSELF at boot, in front of first paint.
                     # This check dispatches REAL, HIT-TESTED input (page.mouse.click, not
                     # el.click(), which bypasses hit-testing and reports success on a provably
                     # unclickable button -- exactly how this class of bug survives a suite), and
                     # counts PAINTED PIXELS, never nodes. It carries an anti-regression arm: under
                     # a genuinely OPEN modal the keymap must STILL be suppressed, which is what
                     # catches the plausible-but-wrong `.vis` gate. It FAILED 20 of 35 assertions
                     # on the pre-fix build before it was committed. A check that has never failed
                     # is not a check.
                     ('overlay_deadzone', 'test/overlay_deadzone.cjs'),
                     # ...AND NEITHER MAY A SWITCH. The sister check: same invariant (a surface being
                     # ANIMATED, not interacted with, must never consume input), one layer further out.
                     # overlay_deadzone guards the layers the APP paints; this guards the layer the
                     # BROWSER paints. Both switch paths ran their DOM swap inside
                     # document.startViewTransition(), which CAPTURES A SNAPSHOT -- and a browser does
                     # not hit-test what it has captured. The UA default captures the ENTIRE DOCUMENT,
                     # so for 0-500ms after every pane and topic switch elementsFromPoint over a pane
                     # tab returned exactly ["HTML"] -- not the button, not even BODY -- while the
                     # button was still visible and pointer-events:auto. Nothing was covering it. The
                     # page was INERT and a real trusted click did nothing. Stacked with the index
                     # overlay's fade-out that is the PRIMARY entry action: pick a topic, click a pane
                     # tab, and the app ignores you for over half a second.
                     # The reflex fix -- ::view-transition{pointer-events:none} -- is CORRECT, survives
                     # the build, computes `none` across the whole pseudo tree, AND CHANGES NOTHING;
                     # a check asserting on that property would have gone green on a no-op. So every
                     # assertion here is BEHAVIOURAL: real page.mouse.click / page.keyboard.press at
                     # +0/+16/+60/+150/+300ms after each switch, each of which must REACH its tab AND
                     # make the app respond. It also asserts each switch genuinely happened, so it
                     # cannot pass because nothing moved. FAILED 24 of 38 assertions on the pre-fix
                     # build, and still failed on the plausible half-fix (scoping the capture).
                     ('transition_deadzone', 'test/transition_deadzone.cjs'),
                     # ...AND THE TARGET MAY NOT MOVE EITHER. The third of the trio, and the other half
                     # of the same sentence: transition_deadzone guards against a click being EATEN,
                     # this guards against a click being MISSED. A MISSED CLICK IS INDISTINGUISHABLE
                     # FROM AN EATEN ONE -- both read as "the app ignored me".
                     # transition_deadzone could not catch either defect, structurally: it re-measures
                     # its target's LIVE box before clicking (correct, for ITS invariant), and it only
                     # ever clicks light-DOM pane tabs, which sit in the sidebar and outside every
                     # transform this app applies. It reported the shift in a NOTE and moved on. This
                     # is that NOTE, promoted to an assertion, and aimed INSIDE the shadow roots.
                     #   1. THE PANE TABS MOVED UP TO 55.6px WHEN THE TOPIC CHANGED. .seg is positioned
                     #      by an identity block sized from content that changes on every switch, so the
                     #      tabs landed at FOUR heights across the 46 topics. THREE variables stacked,
                     #      and the obvious one (the title wrapping, 23.1px) was worth less than half:
                     #      the locator dropping below the badge is 24px, and the locator wrapping is
                     #      13.5px more. Fixing only the title would have left 32px still moving.
                     #   2. panein's `translateY(16px) scale(.995)` MOVED EVERY CONTROL IN THE INCOMING
                     #      PANE for 500ms -- +18.2px at t=0 -- and HIT-TESTING FOLLOWS TRANSFORMS. It is
                     #      HEIGHT-DEPENDENT, which is why it hid: a click at the resting centre still
                     #      lands while the displacement is under half the control's height, so drill's
                     #      41px controls worked and the 28px "Reveal" buttons did not. 29 of 70 controls
                     #      are under the threshold. The fix is ZERO displacement, not a smaller one: a
                     #      click near a control's top edge misses for ANY downward shift.
                     # The reflex fix -- pointer-events:none during the animation -- is the disease the
                     # View Transition API was just REMOVED for. It does not move the target, it DELETES
                     # it. So the pane keeps hit-testing throughout and only the motion goes.
                     # Every assertion is BEHAVIOURAL (real page.mouse.click at +0/+16/+60/+150/+300ms
                     # on both switch paths), and all four probes are RE-ARMED AGAINST A PLANTED DEFECT
                     # ON EVERY RUN -- it re-injects the translateY, neutralises the sidebar reserve,
                     # adds a pane animation to the topic path, and blanks a pane -- and exits non-zero
                     # if any probe fails to notice. It also asserts its own COVERAGE, so it cannot pass
                     # by skipping every target. FAILED 14-15 of 128 assertions on the pre-fix build (timing-dependent at the +60ms sample).
                     ('click_drift', 'test/click_drift.cjs'),
                     # overlay_keyboard: overlay_deadzone above tests Escape, hit-testing and focus
                     # RESTORE -- and never once presses Enter on a button. An audit built on those
                     # questions certified these overlays "10/10, no defects" with two WCAG 2.1.1
                     # defects underneath it:
                     #   (1) Enter on the mock run's OWN close button did not close it. Its keydown
                     #       gated on "is the overlay open" and preventDefault()-ed Enter, so the key
                     #       fired #mbnext AND was suppressed on the focused button. Same disease as
                     #       the drill's "gate on the pane, never on focus".
                     #   (2) THE FOCUS TRAP WAS SHADOW-BLIND. Every dialog hosts its body in a shadow
                     #       root, and shell.js's getFocusable() used querySelectorAll, which does not
                     #       cross one -- so for mock/session/mixed-fire/keyboard it returned exactly
                     #       ONE element (the close button), first === last, and every Tab was bounced
                     #       back onto it. MEASURED: 1 distinct tab stop across 8 presses. The session
                     #       tracker's <input>/<textarea>/Copy/Compare, the mock's Reveal/Next and its
                     #       whole end-screen score row were UNREACHABLE BY KEYBOARD.
                     # It also pins the reopen race it uncovered: ovShow() cancelled ovHide()'s
                     # fallback timer but not its animationend listener, so reopening ANY overlay made
                     # it close itself 446-700ms later with no user action.
                     # Drives TRUSTED keys only (a synthetic Enter does not reproduce native button
                     # activation, so it would have passed on the broken build) and reads focus THROUGH
                     # the shadow boundary (document.activeElement stops at the host and reports that
                     # focus never moves). Asserts the ring against the TRUE focusable set, not a
                     # threshold -- the keyboard overlay legitimately has one control. All five
                     # mechanisms were reverted one at a time and watched going red. ~2m.
                     ('overlay_keyboard', 'test/overlay_keyboard.cjs'),
                     # room wired at boot (data-group + --topic-ink + --acc rebind) AND the
                     # blank-page class of bug cannot recur (reduced-motion still RENDERS,
                     # both themes). The two things a grep cannot see. (Phase 6)
                     ('room_browser', 'test/room_browser.cjs'),
                     # back_deadend: the ROUTING sibling of room_browser's blank-page guard. The app
                     # installs its landing route with replaceState, so on a DIRECT entry (the offline
                     # file opened by itself, or a URL typed into a fresh tab) it holds the tab's only
                     # in-document history entry -- and one browser Back unloaded the whole document to
                     # the blank page beneath it (about:blank). Measured pre-fix at BOTH viewports: one
                     # Back -> innerText 0, a single-colour viewport, recoverable only by Forward/reload.
                     # It is the literal first Back of every direct session, so it shipped as a P1.
                     # This measures the SCREEN (decoded pixels: a blank page is inkPct ~0 / distinct ~1)
                     # AND the DOM, presses real browser Back/Forward, and holds both arms: the fix
                     # (first Back -> a painted home) and the anti-regression (a second Back still LEAVES
                     # the app, and pane Back/Forward still round-trips -- the guard is ONE entry, never a
                     # Back-blocking loop). FAILED every "one Back" assertion on the pre-fix build.
                     ('back_deadend', 'test/back_deadend.cjs'),
                     # cta_contrast: the primary CTAs are painted in a GRADIENT, and
                     # getComputedStyle('background-color') on a gradient returns rgba(0,0,0,0) --
                     # it tells you nothing, in a tone of voice that sounds like an answer. This
                     # DECODES THE RENDERED PIXELS: screenshot the CTA, screenshot it again with
                     # its text forced transparent, solve per-pixel alpha to find the pixels that
                     # genuinely ARE the text colour, and read the background LOCAL TO EACH GLYPH.
                     # (The naive "worst pixel anywhere in the button" metric manufactures false
                     # failures at ~3.1:1 off the gradient's brightest corner, where no glyph has
                     # ever been painted.) room_contrast pins the token; this proves the BUTTON.
                     # 6 rooms x 2 themes x 3 CTAs. ~1m40s.
                     ('cta_contrast', 'test/cta_contrast.cjs'),
                     # scoreboard_salience: the drill scoreboard once encoded its verdict in HUE --
                     # and two of the six ROOM hues were the same two colours, so in the teal room
                     # the Solid tile dissolved into the wallpaper and the board read INVERTED: a
                     # good score pulled your eye to the failure count. Fixed by moving the verdict
                     # onto FILL-vs-OUTLINE... and then verified BY HAND, asserted in a comment, and
                     # left UNGUARDED -- after which the comment drifted into claiming a property
                     # the code did not have. This measures PAINTED INK per tile (mean |Y - Y(card)|,
                     # deliberately hue-BLIND, because hue-blindness is the property under test) and
                     # fails if Solid is ever not the loudest tile, or if it fills at zero.
                     # 6 rooms x 2 themes x 4 score states. ~1m50s.
                     ('scoreboard_salience', 'test/scoreboard_salience.cjs'),
                     ('e2e_interactions', 'test/e2e_interactions.cjs'),
                     # A filtered sub-drill must MERGE into the topic's canonical progress
                     # record, never REPLACE it. Guards a shipped P0: the app's own
                     # recommended "Drill my N Revisit probes ->" button turned a completed
                     # {done:22,tot:22,revisit:[3]} into {done:1,tot:3,revisit:[]} after ONE
                     # grade, because the persistence layer wrote the drill's current
                     # WORKING SET into the record. Reference is the user's own completed
                     # run, read back from localStorage -- not anything the writer produced.
                     ('progress_merge', 'test/progress_merge.cjs'),
                     # A stored grade belongs to a QUESTION, not to a SLOT. Grades were keyed by
                     # the probe's INDEX IN THE BANK, so inserting one probe at the top of a bank
                     # slid every stored grade below it onto the WRONG question -- silently, with
                     # no error and no count change, telling the user they had mastered a probe
                     # they had never seen. 38 topics are about to be authored, so probes WILL be
                     # inserted. This check does the thing that detonates it: completes a topic,
                     # then REORDERS the bank AND INSERTS probes into it, and asserts every
                     # surviving grade still lands on its original question -- matched by content,
                     # never by position. Reference is the user's own completed run, captured
                     # before the bank is touched, so the writer agreeing with itself cannot make
                     # it pass. Also proves the v1 -> v2 migration is exact, and that a record
                     # whose bank has already shifted is salvaged, never mis-attributed.
                     ('card_identity', 'test/card_identity.cjs'),
                     ('topic_contract', 'test/topic_contract.cjs'),
                     ('cram_scope_distinct', 'test/cram_scope_distinct.cjs'),
                     # The rail is per (topic, view), and a MISSING note is a state the renderer has
                     # to handle -- not a state it may skip. shell.js's `if (TOPIC_CMP_NOTES[tab])`
                     # had no `else`, so a topic with no note for the active pane simply kept the
                     # PREVIOUS topic's coaching on screen: 266 of 414 combos (64%) displayed another
                     # topic's advice. Authoring the 266 missing notes would have hidden the bug, not
                     # fixed it -- the next topic to ship with a gap would leak again -- so this check
                     # asserts the INVARIANT over all 46 x 9 combos, after adversarially priming the
                     # rail with a foreign note each time. It measures TEXT, not pixels, so a leak has
                     # to be structurally impossible rather than merely hidden by CSS.
                     ('rail_integrity', 'test/rail_integrity.cjs'),
                     # THE SHADOW BOUNDARY. Four times now, CSS written in styles.css has silently
                     # failed to reach elements that live in a shadow root -- the v142 loading
                     # shimmer (never ran once), the print page-break rules (the "Print Q&A" tool
                     # shipped with NO page-break control for the app's whole life), the mobile 44px
                     # tap floor, and the entire forced-colors + prefers-contrast block (the shipped
                     # "high-contrast support" matched ZERO nodes). Every one was found by a human
                     # squinting at a screenshot months later; not one was found by a test. The
                     # failure is silent by construction: no error, no warning, and a dead rule looks
                     # exactly like a live one in the diff.
                     # This enumerates every class on every element in the light DOM and in all 17
                     # shadow roots -- across all 10 panes and all 10 overlays -- and FAILS if a
                     # selector in styles.css targets a class that exists ONLY in a shadow root. It
                     # is asymmetric on purpose: a class never observed anywhere is never reported,
                     # so thin state coverage can only cause a MISS, never a false accusation. It
                     # plants a known-dead rule on every run and aborts if it cannot see it, so it
                     # is not the seventh check here that cannot fail.
                     ('shadow_css_guard', 'test/shadow_css_guard.mjs'),
                     # THE CHECK THAT ACTUALLY LOOKS AT THE SCREEN. Everything above this line reads the
                     # DOM, the source, or a computed style; none of them can tell you what was PAINTED.
                     # The old `visual_regression.py` claimed to and could not -- it was a regex over CSS
                     # text (see layout_static, above). This renders the app, brings it to a PROVEN rest
                     # state, and diffs decoded pixels against committed baselines.
                     #
                     # Three things make it hard, and it handles each rather than hoping:
                     #  - THE SHADOW BOUNDARY, again. document.getAnimations() is BLIND to shadow roots
                     #    (measured: a planted animation in <deep-drill> is reported by
                     #    shadowRoot.getAnimations() and NOT by document's), so a stillness gate built on
                     #    it reports "all still" across 17 of the 18 roots while they animate. The gate
                     #    walks every root, and plants an animation in a shadow root ON EVERY RUN, aborting
                     #    if it cannot see it -- so nobody can quietly simplify it back.
                     #  - ANIMATIONS. bodyIn/panein/railin are mid-flight for 650ms and the boot spinner is
                     #    INFINITE (it freezes at a random angle). Finite animations are FINISHED, infinite
                     #    ones PINNED to a fixed phase, and nothing is captured until two consecutive frames
                     #    are byte-identical. MEASURED: a capture taken 60ms early is 460,000+ px wrong.
                     #  - A BLANK BASELINE WOULD CERTIFY A BLANK PAGE -- the exact trap that let an a11y
                     #    audit pass an empty screen here. Every capture must clear an ink floor, on the
                     #    write path as well as the verify path.
                     #
                     # PROVEN: a 1px border on ONE rule inside a shadow root turns 14 of 16 baselines red
                     # (22,656-58,086 px each); reverting it turns them green. Noise floor over repeated
                     # runs is <=9 px against a 120 px budget.
                     #
                     # EXIT 2 = SKIP: baselines are per-platform ON PURPOSE. The app's body text is a
                     # SYSTEM font stack, so the glyphs on this box are not the glyphs on the CI runner,
                     # and no tolerance absorbs a different typeface while still catching a 1px shift.
                     # An environment with no baselines is reported SKIP -- never a PASS it did not earn,
                     # and never a red nobody can act on. To cover CI: run `npm run vr:update` ON the
                     # runner and commit test/baselines/. (A MISSING MANIFEST is still a hard FAIL --
                     # deleting the baselines must not turn the gate green.)
                     ('visual_regression', 'test/visual_regression.cjs')]:
    if not chrome:
        results.append((name, 'SKIP', 'no Playwright/Chrome (npm install && npx playwright install chromium)'))
        continue
    env = dict(os.environ, CHROME=chrome)
    r = run(['node', script, deliverable], env=env)
    # exit 2 = "this check has no baselines for THIS platform". That is a genuine environment fact,
    # not a defect and not a pass, so it gets the same SKIP the missing-browser branch gets. Any
    # other non-zero is a real failure. A check must never be able to buy a green with an exit code.
    st = 'PASS' if r.returncode == 0 else ('SKIP' if r.returncode == 2 else 'FAIL')
    results.append((name, st, report(r)))

w = max(len(n) for n, _, _ in results)
print('=' * 64)
for n, st, msg in results:
    print('  %-*s  %-4s  %s' % (w, n, st, ascii_safe(msg)))
print('=' * 64)
failed = [n for n, st, _ in results if st == 'FAIL']
print('GATE: FAIL (%s)' % ', '.join(failed) if failed else 'GATE: PASS')
sys.exit(1 if failed else 0)
