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

THE BUILD RUNS IN A SCRATCH MIRROR, NEVER IN THE TREE BEING CERTIFIED (W-ADDRESSES cycle 10,
R23a). This check was the serial gate's own WRITER: `npm run build` rewrites dist/index.html,
the deliverable, src/tokens.generated.css, src/scripts/visuals/kit.js and every compiled file
under src/topics/ -- so a 19-minute certification run had a check inside it mutating, at minute
one, the exact bytes the other 47 browser checks spend the next 18 minutes measuring. Nothing was
WRONG about the bytes (the rebuild of an unchanged HEAD is byte-identical to the committed blob,
which is this check's whole point), but "nothing was wrong" is a property of the input, not of
the arrangement: it made dist/index.html's mtime move mid-run, it made the R13 capture
impossible to seal against a concurrent writer, and it meant a judge auditing the run could not
distinguish this check's own write from an outside process building in the same tree. So the
tree is READ-ONLY for the whole run now: the inputs are copied to a temp mirror, node_modules is
linked (never copied), `npm run build` runs THERE, and the mirror's output is compared against
the COMMITTED BLOB and against the two files on disk. The comparison is unchanged; only the
place the bytes are produced moved. check_all.py seals the other half by hashing
dist/index.html at run start and run end and refusing to certify a run whose deliverable moved.

Exits non-zero on any failure. Safe to run in CI.
"""
import os
import re
import sys
import shutil
import hashlib
import subprocess
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
NAME = 'deepdive_content_pipeline_rehearsal.html'
DELIVERABLE = os.path.join(ROOT, NAME)
DIST = os.path.join(ROOT, 'dist', 'index.html')
PANES = [b'walk', b'drill', b'wb', b'sys', b'trade', b'model', b'num', b'rf', b'open']
OVERLAYS = [b'mockov', b'mixov', b'cramov', b'sessov', b'keyov', b'scopeov', b'planov']

# Everything `npm run build` READS, and nothing else. src/ carries the mermaid-cache's sibling
# inputs and tools/compiler/mermaid-cache carries the rasterised SVGs themselves -- both are
# committed, so the mirror builds from the same cache the tree does and the determinism the
# cache buys is not spent by moving directories. node_modules is LINKED, not copied.
BUILD_INPUTS = ['src', 'tools', 'design-tokens', 'visual-trainer', 'vite.config.mjs',
                'package.json', 'package-lock.json']
# visual-trainer IS a build input and the mirror learned it the hard way: tools/build-visual-kit
# .mjs bundles `visual-trainer/src/kit.js` into `src/scripts/visuals/kit.js` on every build, so a
# mirror without it does not fail SUBTLY -- esbuild refuses to resolve the entry point and the
# build exits 1. That is the right failure shape for a missing input, and it is why this list is
# a list rather than a copy-everything: a build input that stops being one shows up as a red.


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

# ---------------------------------------------------------------------------------------
# THE SCRATCH MIRROR (R23a). Built, used and removed inside this check; the tree it certifies
# is never written to. `link_node_modules` uses a DIRECTORY JUNCTION on Windows (no privilege
# required, and the same primitive the worktree fleet already uses) and a symlink elsewhere; the
# link is removed non-recursively at teardown, which is the one way to remove it that does not
# recurse into the shared install and delete it.
# ---------------------------------------------------------------------------------------
def link_node_modules(mirror):
    src = os.path.join(ROOT, 'node_modules')
    dst = os.path.join(mirror, 'node_modules')
    if not os.path.isdir(src):
        return False, 'no node_modules to link at ' + src
    if os.name == 'nt':
        # `mklink` is a cmd BUILTIN, so it needs cmd -- but it does not need a shell STRING:
        # the argument list form keeps both paths out of the metacharacter grammar entirely.
        p = subprocess.run(['cmd', '/c', 'mklink', '/J', dst, src],
                           capture_output=True, text=True)
        if p.returncode != 0:
            return False, 'mklink /J failed: ' + (p.stderr or p.stdout or '').strip()
        return True, ''
    try:
        os.symlink(src, dst, target_is_directory=True)
    except OSError as e:
        return False, 'symlink failed: %s' % e
    return True, ''


mirror = tempfile.mkdtemp(prefix='ddr-build-mirror-')
build_err = None
fresh = None
wrote = []              # generated paths this run had to materialise in the tree
differs_tracked = []    # TRACKED paths the mirror build disagreed with -- reported, never written
try:
    for rel in BUILD_INPUTS:
        s = os.path.join(ROOT, rel)
        d = os.path.join(mirror, rel)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        elif os.path.isfile(s):
            shutil.copy2(s, d)
        else:
            build_err = 'build input missing from the tree: %s' % rel
            break
    if build_err is None:
        linked, why = link_node_modules(mirror)
        if not linked:
            build_err = ('the scratch mirror could not reach the dependency tree, so this check '
                         'cannot build anything: %s' % why)
    if build_err is None:
        # On Windows npm is npm.cmd, which CreateProcess cannot launch by bare name; shell=True
        # routes it through cmd.exe. On POSIX a list + shell=True would drop the args, so it
        # stays off there.
        r = subprocess.run(['npm', 'run', 'build'], cwd=mirror,
                           capture_output=True, text=True,
                           shell=(os.name == 'nt'))
        if r.returncode != 0:
            build_err = 'build returned %d\n%s' % (r.returncode, r.stderr)
        else:
            fresh = open(os.path.join(mirror, 'dist', 'index.html'), 'rb').read()
            mirror_deliverable = os.path.join(mirror, NAME)
            if not os.path.exists(mirror_deliverable):
                build_err = ('`npm run build` produced no %s in the mirror at all -- '
                             'tools/sync-deliverable.mjs did not run' % NAME)
            elif sha(open(mirror_deliverable, 'rb').read()) != sha(fresh):
                build_err = ('`npm run build` did NOT sync the deliverable: in a clean mirror of '
                             'this tree, dist/index.html and %s came out different. The sync step '
                             '(node tools/sync-deliverable.mjs, last in package.json "build") is '
                             'broken or has been removed.' % NAME)
            else:
                # ---------------------------------------------------------------------------
                # THE BARRIER'S OTHER JOB, AND IT IS BIGGER THAN TWO FILES. `npm run build` does
                # not only write dist/ and the deliverable: it GENERATES SOURCES that other
                # checks read -- src/tokens.generated.css, src/scripts/visuals/*,
                # src/topics/_generated/** and src/topics/_generated-registry.js -- every one of
                # them gitignored, and therefore ABSENT on a fresh checkout. Moving the build
                # into a mirror stopped producing them in the tree, and the free ubuntu lane
                # reddened `numbers_lattice`, `bank_pushback` and `bank_novelty` within the hour
                # with "0 compiled num slices for 38 authored topics -- run npm run build".
                # That is the correct failure and the wrong cause, and it is what makes this a
                # SYNC rather than a two-file copy.
                #
                # THE RULE IS THE SAME ONE, WIDENED TO EVERY GENERATED PATH: write a file only
                # when the tree does not already carry exactly these bytes. On a clean tree that
                # already built itself -- the tree R13 certifies -- nothing is written at all.
                #
                # AND IT REFUSES TO TOUCH A TRACKED FILE. The tracked set comes from `git
                # ls-files`, and anything in it is SOURCE: if a mirror build produced different
                # bytes for a tracked path, that is a finding to report, never a file to
                # overwrite. Untracked output is the only thing this syncs.
                ok_tracked, tracked_out = git('ls-files')
                tracked = set(
                    tracked_out.decode('utf-8', 'replace').replace('\\', '/').split('\n'))
                for scan in ('src', 'dist'):
                    base = os.path.join(mirror, scan)
                    for dirpath, _dirs, files in os.walk(base):
                        for fn in files:
                            src_p = os.path.join(dirpath, fn)
                            rel = os.path.relpath(src_p, mirror).replace(os.sep, '/')
                            b = open(src_p, 'rb').read()
                            dst_p = os.path.join(ROOT, rel.replace('/', os.sep))
                            same = (os.path.exists(dst_p)
                                    and sha(open(dst_p, 'rb').read()) == sha(b))
                            if same:
                                continue
                            if ok_tracked and rel in tracked:
                                differs_tracked.append(rel)
                                continue
                            os.makedirs(os.path.dirname(dst_p), exist_ok=True)
                            open(dst_p, 'wb').write(b)
                            wrote.append(rel)
                # the deliverable lives at the repo root, outside both scanned trees
                if not os.path.exists(DELIVERABLE) or sha(open(DELIVERABLE, 'rb').read()) != sha(fresh):
                    open(DELIVERABLE, 'wb').write(fresh)
                    wrote.append(NAME)
finally:
    # UNLINK THE JUNCTION FIRST, NON-RECURSIVELY. `rmtree` over a junction recurses THROUGH it:
    # that is how one teardown in this project deleted all 29 @-scopes of a shared node_modules.
    nm = os.path.join(mirror, 'node_modules')
    if os.path.isdir(nm):
        try:
            os.rmdir(nm) if os.name == 'nt' else os.unlink(nm)
        except OSError:
            try:
                os.unlink(nm)
            except OSError:
                pass
    shutil.rmtree(mirror, ignore_errors=True)

if build_err is not None:
    print('FAIL: %s' % build_err, file=sys.stderr)
    sys.exit(1)

problems = []
tail = []          # diagnostics that must print LAST: THE GATE reports only a check's final line

# --- (1) the include tree fully resolved --------------------------------------------------
leftover = re.findall(rb'<!--@build:include', fresh)
if leftover:
    problems.append('%d unresolved include marker(s) remain in the output' % len(leftover))

# --- (2) the sync step ran; and the TREE was touched ONLY WHERE IT WAS NOT ALREADY THIS BUILD
# THE SYNC ASSERTION MOVED INTO THE MIRROR (R23a) and is above: the mirror's dist/index.html and
# the mirror's deliverable are compared there, which is now the only place a build happens, and
# the generated-path sync runs there too, while the mirror still exists. What is left here is the
# REPORT -- and a report is the point, because a run that touched the tree must never be readable
# as one that did not.
#     on a clean tree that already carries its own build -- the ONLY tree R13 certifies -- this
#     check writes nothing at all, and dist/index.html's mtime does not move.
if differs_tracked:
    problems.append(
        'the mirror build produced DIFFERENT bytes for %d TRACKED path(s) [%s]. A tracked file is '
        'source, so this check refuses to overwrite it: either the tree carries an edit its own '
        'build does not reproduce, or a generated file has been committed by mistake. Neither is '
        'a thing to silently repair.'
        % (len(differs_tracked), ', '.join(sorted(differs_tracked)[:5])))
tree_state = ('tree UNTOUCHED (every generated path already carried this build)' if not wrote
              else 'MATERIALISED %d generated path(s) absent-or-stale in the tree [%s] -- this run '
                   'WROTE the tree' % (len(wrote), ', '.join(sorted(wrote)[:4])
                                       + (', ...' if len(wrote) > 4 else '')))

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

print('BUILD INTEGRITY: PASS  (%d bytes, 0 unresolved, 9 panes + 7 overlays, built in a SCRATCH '
      'MIRROR and the mirror\'s build SYNCED the deliverable, %s, %s)'
      % (len(fresh), head_state, tree_state))
