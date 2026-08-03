"""W-ADDRESSES cycle 6, R16 -- press the two new route x record cells against the PRE-FIX
classifier.

The classifier at src/scripts/boot.js read `_h`, a `/^#([a-z0-9-]+)/` match, so EVERY hash the
pattern refused collapsed to the empty string and took the `!_h` branch -- the DOOR's answer.
"no hash" and "a hash this regex cannot parse" are not the same route. The two shapes added to
test/home_claims.cjs's route x record matrix are the ones that walk through that hole:

  #Walk       a MIXED-CASE view. The router lower-cases the view id (router.js:50), so this is a
              bare view of the BOOT topic -- and the pre-fix classifier lit the RESUME room.
  #Nonsense   a MALFORMED hash. The router falls back to DEFAULT_ROUTE for an unknown view, so
              this is also a bare view of the boot topic -- same hole, same wrong room.

A third cell guards the fix from over-reaching: #HOME must still take the DOOR's answer, because
the router resolves it to the home. The pre-fix classifier gets that one RIGHT by accident (its
regex refuses the capitals, so it falls to `!_h` -> the door), which is exactly why it has to be
in the matrix: without it, "anything unparsed is a bare view" would be an equally simple and
equally wrong fix, and nothing would say so.

The plant is the pre-fix classifier restored VERBATIM. Snapshot in memory; the tree is rebuilt and
re-run green at the end. The restoration oracle is a byte comparison against the snapshot PLUS the
file's `git diff --numstat` taken before the plant and after the restore: on a working tree that
already carries this cycle's uncommitted edits, `git diff --exit-code` compares against HEAD and
is non-zero whether or not the press restored anything, so it is the wrong oracle and is not used
as one.
"""
import os
import subprocess

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SRC = os.path.join(ROOT, 'src', 'scripts', 'boot.js')

FIXED_DECL = ",_raw=(location.hash||'').replace(/^#/,''),_seg=_raw.split('/')[0]||''"
PRE_DECL = ",_h=(location.hash.match(/^#([a-z0-9-]+)/)||[])[1]||''"
FIXED_CLS = ("  var _hr=_rm(_seg),_door=_rm(_nl&&_nl.id)||_rm(_bi)||_rm(window.__doorCold);\n"
             "  var _dg=_hr||((!_raw||_seg.toLowerCase()==='home')?_door:_rm(window.__doorBoot));")
PRE_CLS = ("  var _hr=_rm(_h),_door=_rm(_nl&&_nl.id)||_rm(_bi)||_rm(window.__doorCold);\n"
           "  var _dg=_hr||((!_h||_h==='home')?_door:_rm(window.__doorBoot));")

CELLS = ['(#walk)', '(#drill)', '(#Walk)', '(#Nonsense)', '#HOME --']


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def build():
    r = subprocess.run(['npm', 'run', 'build'], cwd=ROOT, capture_output=True, text=True,
                       shell=True, encoding='utf-8', errors='replace')
    if r.returncode:
        print((r.stdout or '')[-1200:], (r.stderr or '')[-1200:])
    return r.returncode


def run():
    r = subprocess.run(['node', 'test/home_claims.cjs'], cwd=ROOT, capture_output=True,
                       text=True, encoding='utf-8', errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def verdicts(out):
    """PASS/FAIL for each boot route cell, keyed by the hash it drives."""
    got = {}
    for ln in out.split('\n'):
        t = ln.strip()
        if not (t.startswith('PASS') or t.startswith('FAIL')):
            continue
        for c in CELLS:
            if c in t:
                got[c] = t.split()[0]
    return got


def numstat():
    r = subprocess.run(['git', 'diff', '--numstat', '--', 'src/scripts/boot.js'], cwd=ROOT,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    return (r.stdout or '').strip()


snap = read(SRC)
before = numstat()
assert FIXED_DECL in snap, 'the shipped declaration anchor is not in boot.js'
assert FIXED_CLS in snap, 'the shipped classifier anchor is not in boot.js'

print('=== W-ADDRESSES cycle 6 / R16 -- the hash classifier, pressed ===\n')

code, out = run()
base = verdicts(out)
print('SHIPPED (the fixed classifier):   home_claims exit %d' % code)
for c in CELLS:
    print('   %-14s %s' % (c, base.get(c, '(cell not found)')))

planted = snap.replace(FIXED_DECL, PRE_DECL, 1).replace(FIXED_CLS, PRE_CLS, 1)
assert planted != snap
rows = []
try:
    write(SRC, planted)
    if build():
        rows.append('BUILD FAILED under the plant')
    else:
        code2, out2 = run()
        got = verdicts(out2)
        print('\nPLANTED (the pre-fix `_h` classifier): home_claims exit %d' % code2)
        for c in CELLS:
            print('   %-14s %s' % (c, got.get(c, '(cell not found)')))
        for ln in out2.split('\n'):
            t = ln.strip()
            if t.startswith('FAIL') and ('(#Walk)' in t or '(#Nonsense)' in t):
                print('     ' + t[:260])
        rows = ['%s %s -> %s' % (c, base.get(c, '?'), got.get(c, '?')) for c in CELLS]
finally:
    write(SRC, snap)
    ok = build()
    code3, out3 = run()
    after = numstat()
    print('\nRESTORED: source identical to snapshot %s; working-tree diff unchanged %s '
          '(%r before, %r after); build exit %d; home_claims exit %d  %s'
          % (read(SRC) == snap, before == after, before, after, ok, code3,
             out3.strip().split('\n')[-1][:120]))

print('\nshipped -> planted, per cell:')
for r in rows:
    print('  ' + r)
