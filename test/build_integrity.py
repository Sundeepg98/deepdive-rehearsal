#!/usr/bin/env python3
"""Dependency-free build-integrity check (no browser, no third-party packages).

Rebuilds src/ to a temp file and verifies:
  1. the build succeeds with ZERO unresolved include markers,
  2. the freshly-built output is byte-identical to the committed deliverable
     (i.e. src/ and the shipped artifact are in sync -- nobody forgot to rebuild),
  3. the expected structural anchors are present (9 panes, 7 dialog overlays).

Exits non-zero on any failure. Safe to run in CI.
"""
import os
import re
import sys
import hashlib
import tempfile
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DELIVERABLE = os.path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')
PANES = [b'walk', b'drill', b'wb', b'sys', b'trade', b'model', b'num', b'rf', b'open']
OVERLAYS = [b'mockov', b'mixov', b'cramov', b'sessov', b'keyov', b'scopeov', b'planov']

fd, tmp = tempfile.mkstemp(suffix='.html')
os.close(fd)
try:
    # On Windows npm is npm.cmd, which CreateProcess cannot launch by bare name;
    # shell=True routes it through cmd.exe. On POSIX a list + shell=True would
    # drop the args, so it stays off there.
    r = subprocess.run(['npm', 'run', 'build'], cwd=ROOT,
                       capture_output=True, text=True,
                       shell=(os.name == 'nt'))
    if r.returncode != 0:
        print('FAIL: build returned %d\n%s' % (r.returncode, r.stderr), file=sys.stderr)
        sys.exit(1)
    out = open(os.path.join(ROOT, 'dist', 'index.html'), 'rb').read()

    problems = []
    leftover = re.findall(rb'<!--@build:include', out)
    if leftover:
        problems.append('%d unresolved include marker(s) remain in the output' % len(leftover))

    committed = open(DELIVERABLE, 'rb').read()
    if hashlib.sha256(out).hexdigest() != hashlib.sha256(committed).hexdigest():
        # ASCII only. This string is printed by a CHILD process whose stdout Python encodes with
        # the console codec (cp1252 on Windows): a literal em-dash here left byte 0x97 on the
        # pipe, which is not valid UTF-8, so THE GATE's reader decoded it to U+FFFD and then died
        # trying to print that back to the same cp1252 console. A failure message must never be
        # the thing that takes down the harness reporting it.
        problems.append('rebuilt output != committed deliverable -- run `npm run build` and commit it')
        # SAY WHAT DIFFERS. "They differ" with no evidence is a blank red: it gets re-run rather
        # than diagnosed, which is how a compiler that destroyed 608 authored items per build stayed
        # green for weeks. This diff is what localises a cross-platform build divergence (the build
        # runs on Windows locally and Linux in CI) in ONE run instead of one guess per push.
        i = 0
        n = min(len(out), len(committed))
        while i < n and out[i] == committed[i]:
            i += 1
        lo = max(0, i - 50)

        def _s(b):
            return repr(b[lo:i + 70])[2:-1][:150]   # ASCII-safe, bounded

        # ONE dense line, and it must be LAST: THE GATE reports only the final line of a failing
        # check, so a diagnostic split across several lines is a diagnostic nobody ever reads.
        problems.append(
            'DIFF byte=%d line=%d sizes=%d/%d(%+d) || COMMITTED[%s] || FRESH[%s]' % (
                i, committed[:i].count(b'\n') + 1, len(committed), len(out),
                len(out) - len(committed), _s(committed), _s(out)))

    for pid in PANES:
        if b'id="' + pid + b'"' not in out:
            problems.append('missing pane id="%s"' % pid.decode())
    for oid in OVERLAYS:
        if b'id="' + oid + b'"' not in out:
            problems.append('missing overlay id="%s"' % oid.decode())

    if problems:
        print('BUILD INTEGRITY: FAIL', file=sys.stderr)
        for p in problems:
            print('  - ' + p, file=sys.stderr)
        sys.exit(1)

    print('BUILD INTEGRITY: PASS  (%d bytes, 0 unresolved, matches committed, 9 panes + 7 overlays)'
          % len(out))
finally:
    os.unlink(tmp)
