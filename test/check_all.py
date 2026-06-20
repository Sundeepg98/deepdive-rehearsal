#!/usr/bin/env python3
"""THE GATE. One command runs every correctness check; non-zero exit if any fail.

This replaces per-edit manual vigilance with tooling that runs on every build:
  ascii_guard      source is ASCII-only            (encoding invariant)
  syntax_check     every editable module parses
  build_integrity  build resolves + deliverable consistent + structure present
  render           panes/overlays render, no JS/ref errors, no overflow  (browser)
  entity_leak      no HTML entity reaches visible text                   (browser)

Browser checks are SKIPPED (not failed) when Playwright/Chrome are absent, so
this is CI-safe; locally, with a browser present, it is the full gate.
"""
import os, sys, subprocess, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def run(cmd, env=None):
    return subprocess.run(cmd, capture_output=True, text=True, env=env)

def last_line(r):
    out = (r.stdout + r.stderr).strip().split('\n')
    return out[-1] if out and out[-1] else (out[-2] if len(out) > 1 else '')

def browser():
    if run(['node', '-e', "require.resolve('playwright')"]).returncode != 0:
        return None
    g = glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome')
    return g[0] if g else None

results = []
for name, cmd in [('ascii_guard', ['python3', 'test/ascii_guard.py']),
                  ('syntax_check', ['python3', 'test/syntax_check.py']),
                  ('build_integrity', ['python3', 'test/build_integrity.py'])]:
    r = run(cmd)
    results.append((name, 'PASS' if r.returncode == 0 else 'FAIL', last_line(r)))

chrome = browser()
deliverable = os.path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')
for name, script in [('render', 'test/render.cjs'), ('entity_leak', 'test/entity_leak.cjs')]:
    if not chrome:
        results.append((name, 'SKIP', 'no Playwright/Chrome'))
        continue
    env = dict(os.environ, CHROME=chrome, NODE_PATH='/home/claude/.npm-global/lib/node_modules')
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
