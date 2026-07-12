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
                  ('file_integrity', ['python3', 'test/file_integrity.py']),
                  ('unit_tests', ['python3', 'test/unit_tests.py']),
                  # 15: the end-to-end behavior contract -- boots both first-run and
                  # returning branches, the conditional GPU pane pipeline, [hidden]
                  # integrity, mobile tap floors. Runs after build_integrity so
                  # dist/index.html exists. Needs a browser: local shells export
                  # CHROME; CI installs Chromium via npx playwright install.
                  ('visual_pane_smoke', ['node', 'test/visual_pane_smoke.mjs']),
                  ('visual_regression', ['python3', 'test/visual_regression.py']),
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
                  ('compiler_code', ['node', 'tools/compiler/prove_code.mjs'])]:
    r = run(cmd)
    results.append((name, 'PASS' if r.returncode == 0 else 'FAIL', last_line(r)))

chrome = browser()
deliverable = os.path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')
for name, script in [('render', 'test/render.cjs'), ('entity_leak', 'test/entity_leak.cjs'),
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
                     ('rail_integrity', 'test/rail_integrity.cjs')]:
    if not chrome:
        results.append((name, 'SKIP', 'no Playwright/Chrome (npm install && npx playwright install chromium)'))
        continue
    env = dict(os.environ, CHROME=chrome)
    r = run(['node', script, deliverable], env=env)
    results.append((name, 'PASS' if r.returncode == 0 else 'FAIL', last_line(r)))

w = max(len(n) for n, _, _ in results)
print('=' * 64)
for n, st, msg in results:
    print('  %-*s  %-4s  %s' % (w, n, st, ascii_safe(msg)))
print('=' * 64)
failed = [n for n, st, _ in results if st == 'FAIL']
print('GATE: FAIL (%s)' % ', '.join(failed) if failed else 'GATE: PASS')
sys.exit(1 if failed else 0)
