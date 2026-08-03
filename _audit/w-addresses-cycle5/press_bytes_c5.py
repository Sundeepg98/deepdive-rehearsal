"""W-ADDRESSES cycle 5, judge item 3 -- RE-RUN THE DROP THROUGH ARM F ITSELF.

The figure "14 bytes of 125,089" is quoted in six places and reproduces under neither of the two
mutations those sentences describe. It is re-measured here THROUGH print_truth.cjs -- the same
process, the same seed, the same warm-up and the same alternating on/off/on/off sequence that
produces the number the PASS line quotes -- because a standalone re-implementation measures a
different renderer state (a fresh page's consecutive `on` renders drift ~7k, which is the very
font-cache artefact ARM F's warm-up and interleave exist to defeat).

MUTATION: the OFF override with the SIX GRADE_SEL selectors dropped, and separately with the FIVE
the code comment lists. Snapshots in memory; never `git checkout`.
"""
import os
import re
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SRC = os.path.join(ROOT, 'test', 'print_truth.cjs')

FULL = ("    const OFF = '.hm-seg,.hm-seg::after,.hm-seg.open,.hm-seg.keel::before,.hm-k i,"
        ".hm-k i::after,'\n"
        "      + '.hm-gr-t,.hm-room-n,.hm-room-bar,.hm-room-bar i,.ix-goal-bar,.ix-goal-bar span'\n")
MINUS6 = ("    const OFF = '.hm-seg,.hm-seg::after,.hm-seg.open,.hm-seg.keel::before,.hm-k i,"
          ".hm-k i::after'\n"
          "      + ''\n")
MINUS5 = ("    const OFF = '.hm-seg,.hm-seg::after,.hm-seg.open,.hm-seg.keel::before,.hm-k i,"
          ".hm-k i::after,'\n"
          "      + '.hm-gr-t'\n")


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def run():
    r = subprocess.run(['node', 'test/print_truth.cjs'], cwd=ROOT, capture_output=True,
                       text=True, encoding='utf-8', errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def lattice(out):
    m = re.search(r'"lattice":\{([^}]*)\}', out)
    return m.group(1) if m else '(no lattice line)'


snap = read(SRC)
assert FULL in snap, 'anchor not found in print_truth.cjs'

CONFIGS = [('BASELINE  OFF as shipped', FULL),
           ('MINUS6    the six GRADE_SEL selectors dropped from OFF', MINUS6),
           ('MINUS5    the five the code comment lists dropped from OFF', MINUS5)]
REPS = int(sys.argv[1]) if len(sys.argv) > 1 else 2

lines = []
try:
    for name, body in CONFIGS:
        for rep in range(REPS):
            write(SRC, snap.replace(FULL, body, 1))
            code, out = run()
            row = '%-58s run %d  exit %d  %s' % (name, rep + 1, code, lattice(out))
            print(row, flush=True)
            lines.append(row)
finally:
    write(SRC, snap)
    print('\nrestored test/print_truth.cjs (identical to snapshot: %s)'
          % (read(SRC) == snap))

print('\n'.join(lines))
