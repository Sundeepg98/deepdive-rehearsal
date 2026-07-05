#!/usr/bin/env python3
"""THE GATE. One command runs every correctness check; non-zero exit if any fail.

This replaces per-edit manual vigilance with tooling that runs on every build:
  ascii_guard      source is ASCII-only            (encoding invariant)
  syntax_check     every editable module parses
  build_integrity  build resolves + deliverable consistent + structure present
  render           panes/overlays render, no JS/ref errors, no overflow  (browser)
  entity_leak      no HTML entity reaches visible text                   (browser)
  e2e_interactions theme/text-zoom/drill must-hit/rescues, 0 console errs (browser)
  topic_contract   every registered topic conforms to the shared shape  (browser)

Browser checks are SKIPPED (not failed) when Playwright/Chrome are absent, so
this is CI-safe; locally (or in CI after `npm install && npx playwright install
chromium`), with a browser present, it is the full gate. Chromium is located via
Playwright itself, so there are no hardcoded paths.
"""
import os, sys, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def run(cmd, env=None):
    return subprocess.run(cmd, capture_output=True, text=True, env=env)

def last_line(r):
    out = (r.stdout + r.stderr).strip().split('\n')
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
                  ('visual_regression', ['python3', 'test/visual_regression.py'])]:
    r = run(cmd)
    results.append((name, 'PASS' if r.returncode == 0 else 'FAIL', last_line(r)))

chrome = browser()
deliverable = os.path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')
for name, script in [('render', 'test/render.cjs'), ('entity_leak', 'test/entity_leak.cjs'),
                     ('e2e_interactions', 'test/e2e_interactions.cjs'),
                     ('topic_contract', 'test/topic_contract.cjs')]:
    if not chrome:
        results.append((name, 'SKIP', 'no Playwright/Chrome (npm install && npx playwright install chromium)'))
        continue
    env = dict(os.environ, CHROME=chrome)
    r = run(['node', script, deliverable], env=env)
    results.append((name, 'PASS' if r.returncode == 0 else 'FAIL', last_line(r)))

w = max(len(n) for n, _, _ in results)
print('=' * 64)
for n, st, msg in results:
    print('  %-*s  %-4s  %s' % (w, n, st, msg))
print('=' * 64)
failed = [n for n, st, _ in results if st == 'FAIL']
print('GATE: FAIL (%s)' % ', '.join(failed) if failed else 'GATE: PASS')
sys.exit(1 if failed else 0)
