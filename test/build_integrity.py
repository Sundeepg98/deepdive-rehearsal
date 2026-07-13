#!/usr/bin/env python3
"""Dependency-free build-integrity check (no browser, no third-party packages).

Runs `npm run build` -- whose last step now SYNCS the deliverable -- and verifies:
  1. the build succeeds with ZERO unresolved include markers,
  2. the build actually SYNCED the deliverable  (dist/index.html == the file on disk),
  3. the COMMITTED deliverable is byte-identical to a fresh build of the COMMITTED source,
  4. the expected structural anchors are present (9 panes, 7 dialog overlays).

WHY (3) REPLACED "fresh build == the deliverable on disk".
That WAS the right assertion, for exactly as long as `npm run build` left the deliverable
alone: it caught "you forgot to rebuild". It is now a TAUTOLOGY. The build writes the
deliverable, and this check runs the build -- so it would be comparing the build's output
against the build's own output, and could never go red. Eleven checks that could not fail
have already shipped in this repo (an a11y audit that certified a blank page; a "visual
regression" check that was a regex over source and had never looked at the screen). This
was not going to be the twelfth.

What still has teeth after the build syncs is a GIT invariant. deploy-pages.yml deploys the
deliverable AS COMMITTED -- it copies the checked-out file to _site/index.html -- so the
thing that must be true is: THE COMMITTED BYTES ARE A FAITHFUL BUILD OF THE COMMITTED SOURCE.
That is (3), and it still catches the one mistake no amount of build-time syncing can prevent:
`git add src/ && git commit` without the rebuilt artifact -- "you rebuilt but didn't commit
it". The build can guarantee the two files match ON DISK; only git can tell you whether the
pair you COMMITTED matches, and the committed pair is what ships.

(2) is the regression guard on the fix itself. If the sync step is ever dropped from
package.json, dist/ and the deliverable silently diverge again and every browser check in THE
GATE goes back to measuring a stale artifact. This check goes red instead.

Exits non-zero on any failure. Safe to run in CI.
"""
import os
import re
import sys
import hashlib
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
NAME = 'deepdive_content_pipeline_rehearsal.html'
DELIVERABLE = os.path.join(ROOT, NAME)
DIST = os.path.join(ROOT, 'dist', 'index.html')
PANES = [b'walk', b'drill', b'wb', b'sys', b'trade', b'model', b'num', b'rf', b'open']
OVERLAYS = [b'mockov', b'mixov', b'cramov', b'sessov', b'keyov', b'scopeov', b'planov']


def git(*args):
    """(ok, stdout_bytes). Never raises: a source tarball with no .git must still build."""
    try:
        r = subprocess.run(('git',) + args, cwd=ROOT, capture_output=True)
    except OSError:
        return False, b''
    return r.returncode == 0, r.stdout


def sha(b):
    return hashlib.sha256(b).hexdigest()


def diff_line(la, a, lb, b):
    """ONE dense line locating the first differing byte. SAY WHAT DIFFERS: "they differ" with
    no evidence is a blank red, and a blank red gets re-run rather than diagnosed -- which is
    how a compiler that destroyed 608 authored items per build stayed green for weeks. This is
    what localises a cross-platform build divergence (the build runs on Windows locally and
    Linux in CI) in ONE run instead of one guess per push.

    ASCII ONLY. This string is printed by a CHILD process whose stdout Python encodes with the
    console codec (cp1252 on Windows): a literal em-dash here left byte 0x97 on the pipe, which
    is not valid UTF-8, so THE GATE's reader decoded it to U+FFFD and then died trying to print
    that back to the same cp1252 console. A failure message must never be the thing that takes
    down the harness reporting it."""
    i = 0
    n = min(len(a), len(b))
    while i < n and a[i] == b[i]:
        i += 1
    lo = max(0, i - 50)

    def _s(x):
        return repr(x[lo:i + 70])[2:-1][:150]   # ASCII-safe, bounded

    return ('DIFF byte=%d line=%d sizes=%s:%d/%s:%d(%+d) || %s[%s] || %s[%s]'
            % (i, a[:i].count(b'\n') + 1, la, len(a), lb, len(b), len(b) - len(a),
               la, _s(a), lb, _s(b)))


# ---------------------------------------------------------------------------------------
# ASK GIT WHETHER THE TREE IS CLEAN **BEFORE** RUNNING THE BUILD.
#
# This ordering is the most load-bearing thing in the file, and it is invisible if you get it
# wrong. The build WRITES the deliverable. So if someone commits src/ without the rebuilt
# artifact -- the exact failure (3) exists to catch -- then the moment the build runs, the
# stale committed deliverable is overwritten and becomes a MODIFIED file. A "was the tree
# clean?" question asked AFTER the build would therefore answer "no, it's dirty, so I can't
# compare against HEAD", and the check would go GREEN on the one thing it is here to catch.
#
# Ask first. Build second. Do not reorder these.
# ---------------------------------------------------------------------------------------
in_git, _ = git('rev-parse', '--is-inside-work-tree')
status_ok, porcelain = git('status', '--porcelain')
dirty_paths = [ln[3:] for ln in porcelain.decode('ascii', 'backslashreplace').splitlines() if ln.strip()]
tree_clean = in_git and status_ok and not dirty_paths

# On Windows npm is npm.cmd, which CreateProcess cannot launch by bare name; shell=True routes
# it through cmd.exe. On POSIX a list + shell=True would drop the args, so it stays off there.
r = subprocess.run(['npm', 'run', 'build'], cwd=ROOT,
                   capture_output=True, text=True,
                   shell=(os.name == 'nt'))
if r.returncode != 0:
    print('FAIL: build returned %d\n%s' % (r.returncode, r.stderr), file=sys.stderr)
    sys.exit(1)

fresh = open(DIST, 'rb').read()
problems = []
tail = []          # diagnostics that must print LAST: THE GATE reports only a check's final line

# --- (1) the include tree fully resolved --------------------------------------------------
leftover = re.findall(rb'<!--@build:include', fresh)
if leftover:
    problems.append('%d unresolved include marker(s) remain in the output' % len(leftover))

# --- (2) the build synced the deliverable -------------------------------------------------
on_disk = open(DELIVERABLE, 'rb').read() if os.path.exists(DELIVERABLE) else None
if on_disk is None:
    problems.append('the build produced no %s at all -- tools/sync-deliverable.mjs did not run' % NAME)
elif sha(on_disk) != sha(fresh):
    problems.append(
        '`npm run build` did NOT sync the deliverable: dist/index.html and %s differ. The sync '
        'step (node tools/sync-deliverable.mjs, last in package.json "build") is broken or has '
        'been removed. Restore it -- without it, `npm run build` leaves a STALE deliverable, and '
        'the deliverable is what ships, what CI deploys, and what 18 checks in THE GATE measure '
        '(all 16 browser checks, plus layout_static and unit_tests).' % NAME)
    tail.append(diff_line('DELIVERABLE', on_disk, 'FRESH', fresh))

# --- (3) the COMMITTED pair is consistent -------------------------------------------------
# Asserted whenever the tree was clean, which is ALWAYS the case in CI (actions/checkout gives a
# pristine checkout), and that is the run that gates the deploy. A dirty local tree cannot
# support the assertion -- a fresh build of YOUR edits tells you nothing about what HEAD ships --
# so it is deferred, LOUDLY, in the one line the gate prints. It is never silently skipped.
head_ok, head_bytes = git('cat-file', 'blob', 'HEAD:' + NAME)

if os.environ.get('CI') and not tree_clean:
    # A dirty tree in CI would silently downgrade (3) to a no-op -- and (3) is the assertion that
    # stops a stale artifact reaching the live site. Refuse instead of quietly weakening.
    problems.append('CI ran on a DIRTY tree (%d path(s): %s). The committed-state assertion cannot '
                    'run, and it is the one that keeps a stale artifact off the live site. CI must '
                    'build from a clean checkout.' % (len(dirty_paths), ', '.join(dirty_paths[:5])))
    head_state = 'HEAD-match IMPOSSIBLE (dirty tree in CI)'
elif not in_git:
    head_state = 'HEAD-match SKIPPED (not a git work tree)'
elif not head_ok:
    head_state = 'HEAD-match SKIPPED (%s is not in HEAD yet)' % NAME
elif not tree_clean:
    head_state = ('HEAD-match DEFERRED -- %d uncommitted path(s) [%s]: commit src/ AND the rebuilt '
                  'deliverable together, or CI will reject the pair'
                  % (len(dirty_paths), ', '.join(dirty_paths[:3])))
elif sha(head_bytes) != sha(fresh):
    problems.append(
        'the COMMITTED %s is NOT a build of the COMMITTED source. Something was committed without '
        'the other half: either src/ was committed without rebuilding, or the rebuild happened and '
        'the deliverable was never `git add`ed. This is what CI deploys, so it must be the fresh '
        'build. Run `npm run build` (it now writes the deliverable too) and commit BOTH.' % NAME)
    tail.append(diff_line('COMMITTED', head_bytes, 'FRESH', fresh))
    head_state = 'HEAD-match FAILED'
else:
    head_state = 'COMMITTED deliverable == fresh build of HEAD'

# --- (4) structure ------------------------------------------------------------------------
for pid in PANES:
    if b'id="' + pid + b'"' not in fresh:
        problems.append('missing pane id="%s"' % pid.decode())
for oid in OVERLAYS:
    if b'id="' + oid + b'"' not in fresh:
        problems.append('missing overlay id="%s"' % oid.decode())

if problems or tail:
    print('BUILD INTEGRITY: FAIL', file=sys.stderr)
    for p in problems + tail:
        print('  - ' + p, file=sys.stderr)
    sys.exit(1)

print('BUILD INTEGRITY: PASS  (%d bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the '
      'deliverable, %s)' % (len(fresh), head_state))
