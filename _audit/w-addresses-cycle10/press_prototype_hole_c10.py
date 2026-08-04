"""W-ADDRESSES cycle 10 -- R26: THE PROTOTYPE HOLE, pressed the way judge item 2 was pressed.

R26's product fix is one line per table: `Router.ROUTES` and `TopicRegistry`'s `byId` are created
with a NULL PROTOTYPE, so `ROUTES['constructor']` and `get('__proto__')` stop being truthy for
names nobody registered. Its check fix is two: the boot-table cell now drives the ROUTER'S OWN
EXPRESSION (`!!Router.ROUTES[id]`) instead of a key-set comparison, and `#constructor` and
`#__proto__` join the route-shape drive list.

THE PRESS THE RULING ORDERS: on a mirror with a topic id named `constructor`, the PRE-FIX cell
exits 0 and the FIXED cell REDS and names it. Four arms:

  A. the SHIPPED build, the cycle-10 cell                     -> exit 0 (the fix changes nothing
                                                                 that works today)
  B. the COLLISION mirror -- the PRE-FIX PRODUCT with a
     registered topic renamed `constructor` -- read by the
     PRE-FIX cell (cycle 9's key-set comparison)              -> the boot-table cell is GREEN
                                                                 <-- the MISS
  C. the SAME mirror, the cycle-10 cell                       -> the boot-table cell REDS, naming
                                                                 `constructor`
  D. a PRE-FIX PRODUCT mirror alone (both tables back to
     object literals, no rename), the cycle-10 cell           -> reds through the LIVE drives:
                                                                 #constructor titles the document
                                                                 "undefined -- Deep Rehearsal"

B vs C is the differential: ONE build, two versions of one cell. D is the other differential: one
cell, two versions of the product -- and it is what shows the drive list is not decoration, since
it reds through the shapes rather than through the table read.

TWO THINGS MEASURING FOUND THAT ARGUING WOULD NOT HAVE. The mirror has to rename the slug on BOTH
sides (the registry AND boot.js's `__doorRooms`) or the cell reds on its entry-by-entry direction
instead -- a hit for the wrong reason. And the collision mirror has to be built on the PRE-FIX
PRODUCT: on the fixed one, a topic named `constructor` is simply harmless, both versions of the
cell come back green, and there is nothing to detect. The collision is a property of a table with
a prototype, not of the name.

NOTHING IN THE WORKTREE IS WRITTEN. home_claims takes the deliverable path as argv[2]; the
mirrors are copies of dist/index.html in the scratchpad and the PRE-FIX check is a copy of
test/home_claims.cjs there with its `./_boot.cjs` require rewritten to an absolute path.
"""
import os
import re
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SCRATCH = (r'C:\Users\Dell\AppData\Local\Temp\claude'
           r'\D--claude-workspace-deepdive-rehearsal'
           r'\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w10')
DIST = os.path.join(ROOT, 'dist', 'index.html')
CHECK = os.path.join(ROOT, 'test', 'home_claims.cjs')
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle10', 'press-prototype-hole.txt')

M_COLLIDE = os.path.join(SCRATCH, '_w10_mirror_topic_constructor.html')
M_PREFIX_PRODUCT = os.path.join(SCRATCH, '_w10_mirror_prefix_product.html')
C_PREFIX = os.path.join(SCRATCH, '_w10_home_claims_prefix.cjs')

# ---- the COLLISION mirror: a registered topic slug renamed to an inherited property name -----
# `eav` is the slug cycle 9's own routes press used, for the same reason: short, single-token,
# and real. Renaming it to `constructor` is the shape a topic named after any Object.prototype
# member takes on the day it is written.
#
# THE RENAME IS DONE ON BOTH SIDES, AND THE FIRST ATTEMPT WAS NOT. Renaming only the registry's
# `'eav'` left boot.js's `window.__doorRooms` still listing `eav`, so the boot-table cell reddened
# on its ENTRY-BY-ENTRY direction -- a real finding about a broken mirror, not about the
# collision, and it would have made arm B look like a hit for the wrong reason. A mirror that
# reds a cell through a different direction than the one under test is a confound, and this
# wave's own scar (cycle 9's P4c) is exactly that shape.
COLLIDE = [("'eav'", "'constructor'", 3),
           ('consistent-hashing eav probabilistic-structures',
            'consistent-hashing constructor probabilistic-structures', 1)]

# ---- the PRE-FIX PRODUCT mirror: both tables back to ordinary object literals -----------------
ROUTES_FIXED = 'var ROUTES = Object.assign(Object.create(null), {'
ROUTES_PRE = 'var ROUTES = ({'
ROUTES_FIXED_CLOSE = "    home:  { id: 'home',  title: 'Home' }\n  });"
ROUTES_PRE_CLOSE = "    home:  { id: 'home',  title: 'Home' }\n  });"
REG_FIXED = 'var byId = Object.create(null), order = [], cur = null, bootId = null;'
REG_PRE = 'var byId = {}, order = [], cur = null, bootId = null;'

# ---- the PRE-FIX CELL: cycle 9's key-set comparison, restored verbatim ------------------------
CELL_FIXED = """      const collide = routes
        ? ids.filter((id) => !!Router.ROUTES[id])
        : null;"""
CELL_PRE = """      const collide = routes ? ids.filter((id) => routes.indexOf(id) >= 0) : null;"""
GUARD_FIXED = """        && !!tab.collide && tab.collide.length === 0
        && !!tab.inherited && tab.inherited.length === 0,"""
GUARD_PRE = """        && !!tab.collide && tab.collide.length === 0,"""

CELLS = [
    ('boot-table', 'no name nobody registered'),
    ('#constructor', 'a BARE-VIEW route (#constructor)'),
    ('#__proto__', 'a BARE-VIEW route (#__proto__)'),
    ('title', 'a hash naming an INHERITED property'),
]


def run(check, html):
    r = subprocess.run(['node', check, html], cwd=ROOT, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', shell=(os.name == 'nt'))
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def verdicts(out):
    got = {}
    for label, needle in CELLS:
        hit = [ln for ln in out.split('\n')
               if needle in ln and re.match(r'\s*(PASS|FAIL)\s', ln)]
        got[label] = ('MISSING' if not hit
                      else ('PASS' if hit[0].strip().startswith('PASS') else 'FAIL'))
    return got


def detail(out, needle):
    for ln in out.split('\n'):
        if needle in ln and ln.strip().startswith('FAIL'):
            return ln.strip()[:460]
    return ''


def table(lines, title, v, base=None):
    lines.append(title)
    for label, _ in CELLS:
        moved = '' if (base is None or base[label] == v[label]) else '   <-- MOVED'
        lines.append('    %-14s %s%s' % (label, v[label], moved))


os.makedirs(SCRATCH, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

src = open(DIST, encoding='utf-8', newline='').read()
chk = open(CHECK, encoding='utf-8', newline='').read()
for name, needle, want in [('the null-prototype ROUTES', ROUTES_FIXED, 1),
                           ('the null-prototype registry', REG_FIXED, 1)]:
    n = src.count(needle)
    if n != want:
        sys.exit('%s appears %d times in dist/index.html, expected %d' % (name, n, want))
if chk.count(CELL_FIXED) != 1 or chk.count(GUARD_FIXED) != 1:
    sys.exit('the R26 cell is not present exactly once in test/home_claims.cjs')

prefix_product = src.replace(ROUTES_FIXED, ROUTES_PRE).replace(REG_FIXED, REG_PRE)
open(M_PREFIX_PRODUCT, 'w', encoding='utf-8', newline='').write(prefix_product)

# THE COLLISION MIRROR IS BUILT ON THE PRE-FIX PRODUCT, AND MEASURING FOUND THAT OUT. Renaming a
# topic to `constructor` on the FIXED product is harmless -- `Router.ROUTES['constructor']` is
# undefined on a null-prototype table, so there is no collision left to detect and BOTH versions
# of the cell come back green (measured: arms B and C both exit 0 on that build). The collision
# is a property of a table WITH a prototype, so the mirror that carries it must carry both.
collided = prefix_product
for frm, to, want in COLLIDE:
    if prefix_product.count(frm) != want:
        sys.exit('the collision mirror cannot be built: %r appears %d times, expected %d'
                 % (frm, prefix_product.count(frm), want))
    collided = collided.replace(frm, to)
open(M_COLLIDE, 'w', encoding='utf-8', newline='').write(collided)
open(C_PREFIX, 'w', encoding='utf-8', newline='').write(
    chk.replace(CELL_FIXED, CELL_PRE).replace(GUARD_FIXED, GUARD_PRE)
       .replace("require('./_boot.cjs')",
                'require(' + repr(os.path.join(ROOT, 'test', '_boot.cjs')) + ')'))

lines = ['=== W-ADDRESSES cycle 10 -- R26: the prototype hole ===', '']

cA, oA = run(CHECK, DIST)
vA = verdicts(oA)
table(lines, 'A. the SHIPPED build, the CYCLE-10 cell -- home_claims exit %d' % cA, vA)

lines.append('')
cB, oB = run(C_PREFIX, M_COLLIDE)
vB = verdicts(oB)
table(lines, 'B. the PRE-FIX PRODUCT with a topic slug renamed `constructor`, read by the '
             'PRE-FIX cell (cycle 9\'s key-set comparison) -- exit %d' % cB, vB, vA)
lines.append('   THE MISS IS THE boot-table ROW: `Object.keys(ROUTES).indexOf("constructor")` is '
             '-1, so the')
lines.append('   cell that exists to measure `!ROUTES[p0]` certified a registry whose slug makes '
             'that')
lines.append('   predicate FALSE. (The live drives red on this build either way -- that is the '
             'DEFECT')
lines.append('   being present, not the cell seeing it.)')

lines.append('')
cC, oC = run(CHECK, M_COLLIDE)
vC = verdicts(oC)
table(lines, 'C. THE SAME MIRROR, the CYCLE-10 cell -- exit %d' % cC, vC, vB)
d = detail(oC, 'no name nobody registered')
if d:
    lines.append('    named, verbatim:')
    lines.append('      ' + d)

lines.append('')
cD, oD = run(CHECK, M_PREFIX_PRODUCT)
vD = verdicts(oD)
table(lines, 'D. the PRE-FIX PRODUCT ALONE (both tables back to object literals, no rename), '
             'the CYCLE-10 cell -- exit %d' % cD, vD, vA)
for needle in ('a hash naming an INHERITED property', 'a BARE-VIEW route (#constructor)'):
    d = detail(oD, needle)
    if d:
        lines.append('      ' + d)

ok_a = cA == 0 and all(v == 'PASS' for v in vA.values())
ok_b = vB['boot-table'] == 'PASS'
ok_c = vC['boot-table'] == 'FAIL'
ok_d = cD != 0 and (vD['title'] == 'FAIL' or vD['#constructor'] == 'FAIL')
lines += ['', 'VERDICT',
          '  A  shipped build, every cycle-10 cell green ...................... %s' % ok_a,
          '  B  the collision is INVISIBLE to the pre-fix cell (boot-table green)  %s' % ok_b,
          '  C  the same build REDS the cycle-10 cell, naming the slug ........ %s' % ok_c,
          '  D  the pre-fix PRODUCT alone reds through the live drives ........ %s' % ok_d,
          '',
          '  B vs C IS ONE BUILD READ BY TWO VERSIONS OF ONE CELL. A vs D is one cell reading two',
          '  versions of the product. Neither alone would separate "the check grew" from "the',
          '  product changed".',
          '  THE WORKTREE WAS NOT WRITTEN: dist/index.html unchanged: %s; test/home_claims.cjs '
          'unchanged: %s'
          % (open(DIST, encoding='utf-8', newline='').read() == src,
             open(CHECK, encoding='utf-8', newline='').read() == chk)]

text = '\n'.join(lines) + '\n'
open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
sys.stdout.write(text)
