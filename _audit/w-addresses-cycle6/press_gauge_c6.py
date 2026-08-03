"""W-ADDRESSES cycle 6 -- press the three things this cycle added to scoreboard_salience.

  STABILITY   three consecutive runs of the shipped tree. The defect judge item 1 names is a
              reading that changes between runs with the panel's fractional y, so the first thing
              a fix owes is the same five figures three times.
  P1          THE SHOT-TIME STACK READ DELETED, leaving cycle 5's coverage exactly (the ancestor
              chain alone). MUTANT G -- a 10% full-viewport backdrop over the gauge -- must go
              UNDETECTED, because the alpha sits on a PSEUDO-element (body computes opacity 1) and
              its effective 0.90 is above the 0.877 the best declared-colour lever on this panel
              can catch. If anything else caught it, the stack read would not be load-bearing and
              this cycle's R15 would be decoration.
  P2          KEEL_MARGIN REVERTED TO A BARE `>=` (1.0), which is what the ordering arms carried
              through cycle 5. MUTANT H -- the two severities collapsed onto one mark -- must go
              UNDETECTED, reproducing the judges' finding that the `1280 dark` cell passed clean
              with the worst grade and the middle grade drawn identically.
  P3          THE FILL BOX REVERTED to the pre-cycle-6 fractional construction (S(x)+1 / S(w)-2,
              resolved by BOX_Y with Math.round, spanning the capsule's full height). The
              same-shot phase control must FIRE, because that box is both phase-dependent and
              corner-contaminated -- it is the box whose drift was billed to a compositing veil.

The plants are in test/scoreboard_salience.cjs, which reads the built deliverable, so no rebuild
is needed between them. Snapshot in memory; the tree is restored and re-run green at the end, and
the working-tree diff is compared before and after (git diff --exit-code compares against HEAD,
which already carries this cycle's uncommitted edits, so it cannot answer "did the press restore
the file").
"""
import os
import re
import subprocess

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SRC = os.path.join(ROOT, 'test', 'scoreboard_salience.cjs')

STACK_ON = ("      if (!s.opa.length && !s.anim.length && !s.stack.length && !s.covers.length\n"
            "        && s.inStack >= 0) return;")
STACK_OFF = "      if (!s.opa.length && !s.anim.length) return;"

MARGIN_ON = "const KEEL_MARGIN = GRADE_STEP_MIN;"
MARGIN_OFF = "const KEEL_MARGIN = 1.0;"

BOX_ON = """        const fx0 = Math.ceil(s.x * G.dsf) + 1;
        const fx1 = Math.floor((s.x + s.w) * G.dsf) - 1;
        const fy0 = Math.ceil((s.y + geo.rad) * G.dsf) + 1;
        const fy1 = Math.floor((s.y + s.h - geo.keelH - geo.keelGap) * G.dsf) - 1;"""
BOX_OFF = """        const fx0 = S(s.x) + 1;
        const fx1 = fx0 + S(s.w) - 2;
        const fy0 = S(s.y) + 1;
        const fy1 = fy0 + (s.h - geo.keelH - geo.keelGap) * G.dsf - 2;"""

PRESSES = [
    ('P1  the shot-time stack read deleted (cycle 5 coverage)', STACK_ON, STACK_OFF,
     'MUTANT G UNDETECTED'),
    ('P2  KEEL_MARGIN reverted to a bare >= (1.0)', MARGIN_ON, MARGIN_OFF,
     'MUTANT H UNDETECTED'),
    ('P3  the fill box reverted to fractional device coords', BOX_ON, BOX_OFF,
     'THE FILL SAMPLER IS PHASE-SENSITIVE'),
]


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def run():
    r = subprocess.run(['node', 'test/scoreboard_salience.cjs'], cwd=ROOT, capture_output=True,
                       text=True, encoding='utf-8', errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def numstat():
    r = subprocess.run(['git', 'diff', '--numstat', '--', 'test/scoreboard_salience.cjs'],
                       cwd=ROOT, capture_output=True, text=True, encoding='utf-8',
                       errors='replace')
    return (r.stdout or '').strip()


def strips(out):
    """the fill-strip row of every cell, keyed by width+theme"""
    got = {}
    key = None
    for ln in out.split('\n'):
        m = re.match(r'^(\d+px)\s+(light|dark)\s', ln)
        if m:
            key = m.group(1) + '/' + m.group(2)
        if 'fill strip' in ln and key:
            got[key] = ln.split('--lv', 1)[-1].strip()
    return got


def mutrows(out, needle):
    return [ln.strip()[:200] for ln in out.split('\n') if needle in ln]


snap = read(SRC)
before = numstat()
for _n, a, _b, _c in PRESSES:
    assert a in snap, 'anchor not found: %r' % _n

print('=== W-ADDRESSES cycle 6 -- the gauge arms, pressed ===\n')
print('--- STABILITY: three consecutive runs of the shipped tree ---')
seen = []
for i in range(3):
    code, out = run()
    s = strips(out)
    seen.append(s)
    print('run %d  exit %d' % (i + 1, code))
    for k in sorted(s):
        print('   %-12s %s' % (k, s[k]))
same = all(x == seen[0] for x in seen)
print('all three runs identical: %s' % same)

rows = []
try:
    for name, anchor, repl, needle in PRESSES:
        write(SRC, snap.replace(anchor, repl, 1))
        code, out = run()
        hits = mutrows(out, needle)
        rows.append('%-56s exit %d   %-34s %d' % (name, code, needle, len(hits)))
        print('\n' + rows[-1], flush=True)
        for h in hits[:4]:
            print('     ' + h, flush=True)
        if not hits:
            for h in mutrows(out, 'SCOREBOARD SALIENCE:')[:2]:
                print('     (verdict) ' + h, flush=True)
finally:
    write(SRC, snap)
    code3, out3 = run()
    after = numstat()
    print('\nRESTORED: source identical to snapshot %s; working-tree diff unchanged %s; '
          'scoreboard_salience exit %d' % (read(SRC) == snap, before == after, code3))
    for k in sorted(strips(out3)):
        print('   %-12s %s' % (k, strips(out3)[k]))

print()
for r in rows:
    print(r)
