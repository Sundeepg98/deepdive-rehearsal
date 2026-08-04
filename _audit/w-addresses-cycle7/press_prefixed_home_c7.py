"""W-ADDRESSES cycle 7, R19 -- press the NEW route x record cell against the PRE-FIX classifier.

The classifier at src/scripts/boot.js resolved the TOPIC first and let it win:

    var _dg=_hr||((!_raw||_seg.toLowerCase()==='home')?_door:_rm(window.__doorBoot));

so `#authz/home` -- a topic prefix on a topicless view -- lit `authz`'s room (security-tenancy)
while the app rendered the HOME. That shape is not hypothetical: router.js's own setTopic()
comment records that a topic switch on the home "turned the hash into `#saga/home` via
replaceState", and copy-link.js copies location.href verbatim, so URLs of that shape were written
by the app, were copied, and outlive the guard that stopped new ones being written. The home's
whole question is which room you are RETURNING to, so the prefix must not answer it:

    var _dg=(!_raw||_seg.toLowerCase()==='home'||(_raw.split('/')[1]||'').toLowerCase()==='home')
            ?_door:(_hr||_rm(window.__doorBoot));

THE OTHER FIVE CELLS MUST NOT MOVE. Putting the home test first re-orders the whole classifier, so
this press drives every cell in the matrix, not only the new one: a fix that lights #authz/home
correctly by breaking #saga/walk is not a fix.

The plant is the pre-fix line restored VERBATIM, built, and run through the real check. Snapshot in
memory; the tree is rebuilt and re-run green at the end. The restoration oracle is a byte
comparison against the snapshot PLUS `git diff --numstat` before the plant and after the restore --
`git diff --exit-code` compares against HEAD, which already carries this cycle's uncommitted edits,
and so is non-zero either way.
"""
import os
import subprocess

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SRC = os.path.join(ROOT, 'src', 'scripts', 'boot.js')

FIXED = ("  var _dg=(!_raw||_seg.toLowerCase()==='home'"
         "||(_raw.split('/')[1]||'').toLowerCase()==='home')?_door:(_hr||_rm(window.__doorBoot));")
PRE = "  var _dg=_hr||((!_raw||_seg.toLowerCase()==='home')?_door:_rm(window.__doorBoot));"

CELLS = ['(#walk)', '(#drill)', '(#Walk)', '(#Nonsense)', '#HOME --', 'TOPIC-PREFIXED HOME']


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
assert FIXED in snap, 'the shipped classifier anchor is not in boot.js'
assert snap.count(FIXED) == 1

print('=== W-ADDRESSES cycle 7 / R19 -- the topic-prefixed home, pressed ===\n')

code, out = run()
base = verdicts(out)
print('SHIPPED (the home test first):        home_claims exit %d' % code)
for c in CELLS:
    print('   %-22s %s' % (c, base.get(c, '(cell not found)')))

rows = []
try:
    write(SRC, snap.replace(FIXED, PRE, 1))
    if build():
        rows.append('BUILD FAILED under the plant')
    else:
        code2, out2 = run()
        got = verdicts(out2)
        print('\nPLANTED (the topic lookup first):     home_claims exit %d' % code2)
        for c in CELLS:
            print('   %-22s %s' % (c, got.get(c, '(cell not found)')))
        for ln in out2.split('\n'):
            t = ln.strip()
            if t.startswith('FAIL') and 'TOPIC-PREFIXED HOME' in t:
                print('     ' + t[:300])
            if t.startswith('   ') and 'the prefix names' in t:
                print('     ' + t.strip()[:300])
        rows = ['%-22s %s -> %s' % (c, base.get(c, '?'), got.get(c, '?')) for c in CELLS]
finally:
    write(SRC, snap)
    ok = build()
    code3, out3 = run()
    after = numstat()
    print('\nRESTORED: source identical to snapshot %s; working-tree diff unchanged %s '
          '(%r before, %r after); build exit %d; home_claims exit %d\n   %s'
          % (read(SRC) == snap, before == after, before, after, ok, code3,
             out3.strip().split('\n')[-1][:160]))

print('\nshipped -> planted, per cell:')
for r in rows:
    print('  ' + r)
