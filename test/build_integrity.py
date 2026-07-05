#!/usr/bin/env python3
"""Dependency-free build-integrity check (no browser, no third-party packages).

Rebuilds src/ to a temp file and verifies:
  1. the build succeeds with ZERO unresolved include markers,
  2. the freshly-built output is byte-identical to the committed deliverable
     (i.e. src/ and the shipped artifact are in sync — nobody forgot to rebuild),
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
    r = subprocess.run(['npm', 'run', 'build'], cwd=ROOT,
                       capture_output=True, text=True)
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
        problems.append('rebuilt output != committed deliverable — run `npm run build` and commit it')

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
