"""W-ADDRESSES cycle 5, R14 -- press the rebuilt gauge-names arm with the judges' four mutants.

The arm this replaces read ONE rail with querySelector and asserted that THREE SAMPLED TITLES were
CONTAINED in its description. Four mutations walk through that and all four must now go RED:

  CAP       the description built from row.slice(0, 3) -- exactly the three the old arm sampled,
            and the whole rest of the lattice gone. Containment cannot see a cap.
  FIRST     every rail's description built from the FIRST tier's rail. Rail 1 is unchanged, so an
            arm that reads rail 1 is green while two of three rails describe the wrong topics.
  WRONGNUM  every clause's `solid` figure off by one. The titles are all still present, so
            containment of titles is satisfied and the numbers are lies.
  SHUFFLE   the clauses emitted in reverse. Same set, same count, wrong order -- and the ORDER is
            the whole claim, because the description says "topic by topic" of a picture that is
            read left to right.

Each mutant is applied to src/scripts/app/home-view.js, BUILT, and run through test/home_claims.cjs
(which reads the built deliverable). Snapshots in memory; never `git checkout`. The tree is rebuilt
and re-run green at the end, and that re-run is part of the receipt.
"""
import os
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SRC = os.path.join(ROOT, 'src', 'scripts', 'app', 'home-view.js')

DESC = "      var desc = row.map(function (s) { return esc(segLabel(s, tier)); }).join('. ');"
ROW = "      var row = Altitude.rail(model, tier);"
NUM = "      ? s.solid + ' solid of ' + s.n + ' ' + tier + ' probes'"

MUTANTS = [
    ('CAP       description = the first three clauses only',
     DESC, "      var desc = row.slice(0, 3).map(function (s) { return esc(segLabel(s, tier)); })"
           ".join('. ');"),
    ('FIRST     every rail describes the FIRST tier s rail',
     ROW, "      var row = Altitude.rail(model, model.order[0]);"),
    ('WRONGNUM  every clause s solid figure off by one',
     NUM, "      ? (s.solid + 1) + ' solid of ' + s.n + ' ' + tier + ' probes'"),
    ('SHUFFLE   the clauses emitted in reverse order',
     DESC, "      var desc = row.slice().reverse().map(function (s) { return esc(segLabel(s, tier)); })"
           ".join('. ');"),
]


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def build():
    r = subprocess.run(['npm', 'run', 'build'], cwd=ROOT, capture_output=True, text=True,
                       shell=True, encoding='utf-8', errors='replace')
    if r.returncode:
        print((r.stdout or '')[-1500:], (r.stderr or '')[-1500:])
    return r.returncode


def run():
    r = subprocess.run(['node', 'test/home_claims.cjs'], cwd=ROOT, capture_output=True,
                       text=True, encoding='utf-8', errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def gauge_lines(out):
    return [ln.strip() for ln in out.split('\n')
            if 'gauge names' in ln and ln.strip().startswith('FAIL')]


snap = read(SRC)
for _n, a, _b in MUTANTS:
    assert a in snap, 'anchor not found: %r' % a[:60]

rows = []
try:
    for name, anchor, repl in MUTANTS:
        write(SRC, snap.replace(anchor, repl, 1))
        if build():
            rows.append('%s -> BUILD FAILED' % name)
            continue
        code, out = run()
        fails = gauge_lines(out)
        rows.append('%-52s exit %d   %d gauge-names assertion(s) RED' % (name, code, len(fails)))
        print(rows[-1], flush=True)
        for f in fails[:4]:
            print('     ' + f[:230], flush=True)
finally:
    write(SRC, snap)
    ok = build()
    code, out = run()
    print('\nRESTORED (source identical to snapshot: %s, build exit %d): home_claims exit %d  %s'
          % (read(SRC) == snap, ok, code, out.strip().split('\n')[-1][:110]))

print('\n'.join(rows))
