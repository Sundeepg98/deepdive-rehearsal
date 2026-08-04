"""W-ADDRESSES cycle 9 -- judge item 2: the half of parseHash's condition nothing measured.

R21 gates the second-segment home test on `_hr = _rm(_seg)` and argues that `_hr` truthy IS
parseHash's own condition, `TopicRegistry.get(p0) && !ROUTES[p0]` (router.js:41). home_claims
measured the FIRST conjunct entry by entry, in both directions. It measured NOTHING of `!ROUTES[p0]`
-- that half was inherited from router.js's own comment, "a hyphenated topic slug can NEVER equal
one of the 9 short view ids", whose stated premise the registry stopped satisfying 16 single-token
slugs ago (authz, cdc, eav, iac, slos, saga, caching, signing, ...). The property holds today by
the COINCIDENCE of today's names.

THE PRESS INSTALLS THE COINCIDENCE'S FAILURE. A scratch mirror adds `eav` -- a registered topic
slug -- to `Router.ROUTES`, which is the shape a future topic named `open`, `num`, `model`, `sys`,
`rf`, `wb` or `viz` would take on the day it is written. Three arms:

  A. the SHIPPED build           -- the new direction is green (0 collisions, measured)
  B. the COLLISION mirror        -- the new direction is RED and NAMES `eav`
  C. the SAME mirror, cell as it stood before cycle 9 -- the whole check exits 0, which is the
     finding: the defect is live, every one of the eight route cells is green, and nothing in the
     gate can see it

Plus D: the defect itself, driven. `#eav/home` on a seeded record, with the door read off the
page -- the app shows a bare view, the document wears the RESUME room, which is R21's defect
verbatim arriving through a name.

Nothing in the worktree is written: the mirror is a copy of dist/index.html in the scratchpad and
the pre-cycle-9 check is a copy of test/home_claims.cjs with its `./_boot.cjs` require made
absolute.
"""
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SCRATCH = (r'C:\Users\Dell\AppData\Local\Temp\claude'
           r'\D--claude-workspace-deepdive-rehearsal'
           r'\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w9')
DIST = os.path.join(ROOT, 'dist', 'index.html')
CHECK = os.path.join(ROOT, 'test', 'home_claims.cjs')
PROBE = os.path.join(ROOT, '_audit', 'w-addresses-cycle9', 'probe_door_c9.cjs')
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle9', 'press-routes-disjoint.txt')

MIRROR = os.path.join(SCRATCH, '_w9_mirror_routecollision.html')
C_PRE9 = os.path.join(SCRATCH, '_w9_home_claims_pre9.cjs')

COLLIDE = 'eav'
ROUTES_OLD = "  var ROUTES = {\n    walk:  { id: 'walk',  title: 'Walkthrough' },"
ROUTES_NEW = ("  var ROUTES = {\n    %s:   { id: '%s',   title: 'Collision' },\n"
              "    walk:  { id: 'walk',  title: 'Walkthrough' }," % (COLLIDE, COLLIDE))

PRED_FIXED = ("      !!tab && !tab.dupes.length && !tab.missing.length && !tab.wrong.length"
              " && !tab.extra.length\n        && tab.n === tab.regN && !!tab.routes"
              " && tab.routes.length > 0\n        && !!tab.collide && tab.collide.length === 0,")
PRED_PRE9 = ("      !!tab && !tab.dupes.length && !tab.missing.length && !tab.wrong.length"
             " && !tab.extra.length\n        && tab.n === tab.regN,")

TABLE_CELL = "boot.js's id->room table agrees with the registry"
ROUTE_CELLS = ['a BARE-VIEW route (#walk)', 'a BARE-VIEW route (#drill)',
               'a BARE-VIEW route (#Walk)', 'a BARE-VIEW route (#Nonsense)',
               '[boot] #HOME --', 'a TOPIC-PREFIXED HOME (#',
               'NOT a registered topic (#/home)', 'NOT a registered topic (#AUTHZ/home)']


def run(check, html):
    r = subprocess.run([shutil.which('node') or 'node', check, html],
                       cwd=ROOT, capture_output=True, text=True, encoding='utf-8',
                       errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def verdict(out, needle):
    hit = [ln for ln in out.split('\n') if needle in ln and re.match(r'\s*(PASS|FAIL)\s', ln)]
    if not hit:
        return 'MISSING', ''
    ln = hit[0].strip()
    return ('PASS' if ln.startswith('PASS') else 'FAIL'), ln


os.makedirs(SCRATCH, exist_ok=True)
src = open(DIST, encoding='utf-8', newline='').read()
chk = open(CHECK, encoding='utf-8', newline='').read()
if src.count(ROUTES_OLD) != 1:
    sys.exit('the ROUTES table head is not present exactly once in dist/index.html')
if chk.count(PRED_FIXED) != 1:
    sys.exit('the cycle-9 boot-table predicate is not present exactly once')

open(MIRROR, 'w', encoding='utf-8', newline='').write(src.replace(ROUTES_OLD, ROUTES_NEW))
open(C_PRE9, 'w', encoding='utf-8', newline='').write(
    chk.replace(PRED_FIXED, PRED_PRE9)
       .replace("require('./_boot.cjs')",
                'require(' + repr(os.path.join(ROOT, 'test', '_boot.cjs')) + ')'))

lines = ['=== W-ADDRESSES cycle 9 -- judge item 2: topic ids and route ids must be DISJOINT ===',
         '', 'the collision installed in the mirror: a route id `%s`, which is also a registered '
             'topic slug' % COLLIDE, '']

cA, oA = run(CHECK, DIST)
vA, lA = verdict(oA, TABLE_CELL)
lines.append('A. SHIPPED build, cycle-9 cell -- home_claims exit %d, the boot-table cell %s'
             % (cA, vA))
m = re.search(r'(\d+) route ids, colliding with a topic id: (\[[^\]]*\])', oA)
if m:
    lines.append('     measured: %s route ids, collisions %s' % (m.group(1), m.group(2)))

cB, oB = run(CHECK, MIRROR)
vB, lB = verdict(oB, TABLE_CELL)
lines += ['', 'B. COLLISION mirror, cycle-9 cell -- home_claims exit %d, the boot-table cell %s'
          % (cB, vB)]
if lB:
    lines.append('     ' + lB[:520])

cC, oC = run(C_PRE9, MIRROR)
vC, _ = verdict(oC, TABLE_CELL)
lines += ['', 'C. THE SAME MIRROR, the cell as it stood BEFORE cycle 9 -- home_claims exit %d, '
          'the boot-table cell %s' % (cC, vC), '',
          '   and every route cell in the matrix, on that same defective build:']
for needle in ROUTE_CELLS:
    v, _ln = verdict(oC, needle)
    lines.append('     %-42s %s' % (needle[:42], v))

lines += ['', 'D. THE DEFECT ITSELF, driven on the collision mirror (seed: a topic in a third '
          'room; the oracle is read off the page)']
seed = 'caching'      # data-storage: neither the boot room (architecture-apis) nor eav's own
pr = subprocess.run([shutil.which('node') or 'node', PROBE, MIRROR, seed,
                     '#%s/home' % COLLIDE, '#%s' % COLLIDE, '#authz/home'],
                    cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
for ln in (pr.stdout or '').strip().split('\n'):
    if not ln.strip():
        continue
    try:
        d = json.loads(ln)
    except ValueError:
        lines.append('     ' + ln[:200])
        continue
    lines.append('     %-14s app shows %-12s ought %-26s wore %-26s %s'
                 % (d['hash'], d['showing'], str(d['ought']), ','.join(d['wore']),
                    'ok' if d['ok'] else 'MIS-LIT'))
if pr.returncode != 0:
    lines.append('     (probe exit %d) %s' % (pr.returncode, (pr.stderr or '')[-300:]))

ok = (vA == 'PASS' and cA == 0) and vB == 'FAIL' and vC == 'PASS'
lines += ['', 'VERDICT',
          '  A shipped: 0 collisions, measured rather than inherited ....... %s' % (vA == 'PASS'),
          '  B a colliding id reds the cell and names it ................... %s' % (vB == 'FAIL'),
          '  C the pre-cycle-9 cell passes the SAME build ................. %s' % (vC == 'PASS'),
          '    -- which is the finding: the defect is live and nothing saw it',
          '  overall %s' % ok, '',
          '  THE WORKTREE WAS NOT WRITTEN: dist/index.html unchanged: %s; test/home_claims.cjs '
          'unchanged: %s' % (open(DIST, encoding='utf-8', newline='').read() == src,
                             open(CHECK, encoding='utf-8', newline='').read() == chk)]

text = '\n'.join(lines) + '\n'
open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
sys.stdout.write(text)
