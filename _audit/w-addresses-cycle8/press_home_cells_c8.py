"""W-ADDRESSES cycle 8 -- the two NEW route x record cells, pressed RED against the pre-fix line.

R21's harvest: `#/home` and `#<TOPIC>/home` become STANDING cells in test/home_claims.cjs. A cell
that cannot fail certifies nothing, so each is driven against the CYCLE-7 classifier -- the line
this cycle replaced -- and must go RED, while the six shapes that were already there must not
move. That second half matters as much as the first: re-ordering a classifier can break the cells
it is not aimed at, and cycle 7's own press receipt reported "the other five unmoved" while the
predicate it had just widened was pressed by none of them.

A SCRATCH MIRROR, NOT AN EDIT OF THE TREE. home_claims takes the deliverable path as argv[2]
(`test/home_claims.cjs:83`), so the plant is applied to a COPY of dist/index.html outside the
repository and the check is pointed at it. Nothing in the worktree is written, so there is no
restore step to get wrong and no window in which a concurrent reader sees a planted build.
"""
import os
import re
import shutil
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SCRATCH = (r'C:\Users\Dell\AppData\Local\Temp\claude'
           r'\D--claude-workspace-deepdive-rehearsal'
           r'\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w8')
DIST = os.path.join(ROOT, 'dist', 'index.html')
MIRROR = os.path.join(SCRATCH, '_w8_mirror_cycle7line.html')
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle8', 'press-home-cells.txt')

SHIPPED = ("var _dg=(!_raw||_seg.toLowerCase()==='home'||(_hr&&(_raw.split('/')[1]||'')"
           ".toLowerCase()==='home'))?_door:(_hr||_rm(window.__doorBoot));")
CYCLE7 = ("var _dg=(!_raw||_seg.toLowerCase()==='home'||(_raw.split('/')[1]||'')"
          ".toLowerCase()==='home')?_door:(_hr||_rm(window.__doorBoot));")

# every cell in the route x record matrix, by the substring that identifies its line
CELLS = [
    ('#walk', 'a BARE-VIEW route (#walk)'),
    ('#drill', 'a BARE-VIEW route (#drill)'),
    ('#Walk', 'a BARE-VIEW route (#Walk)'),
    ('#Nonsense', 'a BARE-VIEW route (#Nonsense)'),
    ('#HOME', '[boot] #HOME --'),
    ('#<topic>/home', 'a TOPIC-PREFIXED HOME (#'),
    ('#/home  (NEW)', 'NOT a registered topic (#/home)'),
    ('#<TOPIC>/home (NEW)', 'NOT a registered topic (#AUTHZ/home)'),
]


def run(html):
    r = subprocess.run([shutil.which('node') or 'node', 'test/home_claims.cjs', html],
                       cwd=ROOT, capture_output=True, text=True, encoding='utf-8',
                       errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def verdicts(out):
    got = {}
    for label, needle in CELLS:
        hit = [ln for ln in out.split('\n') if needle in ln and re.match(r'\s*(PASS|FAIL)\s', ln)]
        got[label] = ('MISSING' if not hit
                      else ('PASS' if hit[0].strip().startswith('PASS') else 'FAIL'))
    return got


lines = ['=== W-ADDRESSES cycle 8 -- the new route x record cells, against the cycle-7 line ===',
         '']
src = open(DIST, encoding='utf-8', newline='').read()
if src.count(SHIPPED) != 1:
    sys.exit('the shipped classifier line is not present exactly once in dist/index.html')

code0, out0 = run(DIST)
v0 = verdicts(out0)
lines.append('SHIPPED build (dist/index.html): home_claims exit %d' % code0)
for label, _ in CELLS:
    lines.append('    %-22s %s' % (label, v0[label]))

os.makedirs(SCRATCH, exist_ok=True)
open(MIRROR, 'w', encoding='utf-8', newline='').write(src.replace(SHIPPED, CYCLE7))
code1, out1 = run(MIRROR)
v1 = verdicts(out1)
lines.append('')
lines.append('MIRROR with the CYCLE-7 line restored verbatim: home_claims exit %d' % code1)
for label, _ in CELLS:
    moved = '' if v0[label] == v1[label] else '   <-- MOVED'
    lines.append('    %-22s %s%s' % (label, v1[label], moved))

lines.append('')
for ln in out1.split('\n'):
    if ln.strip().startswith('FAIL') and 'SECOND SEGMENT' in ln:
        lines.append('  ' + ln.strip()[:400])
    if 'the app shows' in ln and 'while the record resumes' in ln and 'stamps' in ln:
        lines.append('     ' + ln.strip()[:300])

newred = all(v1[l] == 'FAIL' for l in ('#/home  (NEW)', '#<TOPIC>/home (NEW)'))
oldsame = all(v0[l] == v1[l] for l, _ in CELLS
              if l not in ('#/home  (NEW)', '#<TOPIC>/home (NEW)'))
lines.append('')
lines.append('VERDICT: both new cells RED under the pre-fix line: %s; '
             'the six pre-existing cells unmoved: %s; shipped build exit 0: %s'
             % (newred, oldsame, code0 == 0))
lines.append('THE WORKTREE WAS NOT WRITTEN: dist/index.html unchanged: %s'
             % (open(DIST, encoding='utf-8', newline='').read() == src))

text = '\n'.join(lines) + '\n'
open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
sys.stdout.write(text)
