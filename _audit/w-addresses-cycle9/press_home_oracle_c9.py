"""W-ADDRESSES cycle 9 -- R22: the harvested cells get the press's own oracle, and the false
alarm is proved dead by a DIFFERENTIAL rather than argued.

R21 harvested two standing cells (`#/home`, `#<TOPIC>/home`) out of a 22-shape press whose oracle
READ THE PAGE: `Panels.resumeTarget()`'s room when `data-view` says the app is showing the HOME,
`TopicRegistry.current()`'s room otherwise. The harvest dropped the switch and kept the second
branch alone, which pins the ROUTER'S CURRENT SHAPE rather than the claim the cells print.

THE FAILURE THAT PROVES IT IS A FALSE ALARM, NOT A MISS. Make parseHash's topic lookup
case-INSENSITIVE and teach boot.js's `_rm` the same lower-casing -- a SELF-CONSISTENT build, and
the router-side repair this wave has carried as a W2 candidate since cycle 7 -- and
`#<TOPIC>/home` becomes a HOME. The door then lights the RESUME room, correctly, and a cell whose
oracle is hard-coded to `TopicRegistry.current()` reddens on a build with no defect in it.

THREE ARMS, and the middle one is the control:

  A. the SHIPPED build           -- fixed cells PASS  (the fix changes nothing that works today)
  B. the FUTURE-W2 mirror        -- fixed cells PASS, PRE-FIX cells FAIL   <-- the differential
  C. the CYCLE-7-line mirror     -- fixed cells FAIL  (R21's own differential must SURVIVE R22;
                                    a fix that makes a cell unfalsifiable is not a fix)

TWO SCRATCH MIRRORS AND A SCRATCH COPY OF THE CHECK. Nothing in the worktree is written:
home_claims takes the deliverable path as argv[2] (test/home_claims.cjs:83), the mirrors are
copies of dist/index.html outside the repository, and the PRE-FIX check is a copy of
test/home_claims.cjs in the scratchpad with its `./_boot.cjs` require rewritten to an absolute
path and the cycle-8 predicate restored verbatim.
"""
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
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle9', 'press-home-oracle.txt')

M_FUTURE = os.path.join(SCRATCH, '_w9_mirror_caseinsensitive.html')
M_CYCLE7 = os.path.join(SCRATCH, '_w9_mirror_cycle7line.html')
C_PREFIX = os.path.join(SCRATCH, '_w9_home_claims_prefix.cjs')

# ---- the FUTURE-W2 build: parseHash and boot.js made case-insensitive TOGETHER ----------------
ROUTER_OLD = ("    if (typeof TopicRegistry !== 'undefined' && TopicRegistry.get(parts[0])"
              " && !ROUTES[parts[0]]) {\n      topicId = parts[0]; rest = parts.slice(1);")
ROUTER_NEW = ("    var _p0 = (parts[0] || '').toLowerCase();\n"
              "    if (typeof TopicRegistry !== 'undefined' && TopicRegistry.get(_p0)"
              " && !ROUTES[_p0]) {\n      topicId = _p0; rest = parts.slice(1);")
BOOT_OLD = "var _rm=function(i){if(!i)return '';for(var g in window.__doorRooms){"
BOOT_NEW = ("var _rm=function(i){if(!i)return '';i=String(i).toLowerCase();"
            "for(var g in window.__doorRooms){")

# ---- the CYCLE-7 classifier line, restored verbatim (R21's own press) -------------------------
SHIPPED = ("var _dg=(!_raw||_seg.toLowerCase()==='home'||(_hr&&(_raw.split('/')[1]||'')"
           ".toLowerCase()==='home'))?_door:(_hr||_rm(window.__doorBoot));")
CYCLE7 = ("var _dg=(!_raw||_seg.toLowerCase()==='home'||(_raw.split('/')[1]||'')"
          ".toLowerCase()==='home')?_door:(_hr||_rm(window.__doorBoot));")

# ---- the PRE-FIX cells: the cycle-8 predicate, which hard-codes one of the two oracles --------
PRED_FIXED = ("              !!want && uwore.length > 0 && uwore.every((v) => v === want)\n"
              "                && (isHome || uf.shown === px.boot),")
PRED_C8 = ("              !!uf.shown && uf.shown !== pick.group && uwore.length > 0\n"
           "                && uwore.every((v) => v === uf.shown),")

CELLS = [
    ('#walk', 'a BARE-VIEW route (#walk)'),
    ('#drill', 'a BARE-VIEW route (#drill)'),
    ('#Walk', 'a BARE-VIEW route (#Walk)'),
    ('#Nonsense', 'a BARE-VIEW route (#Nonsense)'),
    ('#HOME', '[boot] #HOME --'),
    ('#<topic>/home', 'a TOPIC-PREFIXED HOME (#'),
    ('#/home', 'NOT a registered topic (#/home)'),
    ('#<TOPIC>/home', 'NOT a registered topic (#AUTHZ/home)'),
]


def run(check, html):
    r = subprocess.run([shutil.which('node') or 'node', check, html],
                       cwd=ROOT, capture_output=True, text=True, encoding='utf-8',
                       errors='replace')
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
            return ln.strip()[:420]
    return ''


def table(lines, title, v, base=None):
    lines.append(title)
    for label, _ in CELLS:
        moved = '' if (base is None or base[label] == v[label]) else '   <-- MOVED'
        lines.append('    %-16s %s%s' % (label, v[label], moved))


os.makedirs(SCRATCH, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

src = open(DIST, encoding='utf-8', newline='').read()
chk = open(CHECK, encoding='utf-8', newline='').read()
for name, needle, want in [('the shipped classifier line', SHIPPED, 1),
                           ('parseHash\'s topic strip', ROUTER_OLD, 1),
                           ('boot.js\'s _rm', BOOT_OLD, 1)]:
    if src.count(needle) != want:
        sys.exit('%s appears %d times in dist/index.html, expected %d'
                 % (name, src.count(needle), want))
if chk.count(PRED_FIXED) != 1:
    sys.exit('the R22 predicate is not present exactly once in test/home_claims.cjs')

open(M_FUTURE, 'w', encoding='utf-8', newline='').write(
    src.replace(ROUTER_OLD, ROUTER_NEW).replace(BOOT_OLD, BOOT_NEW))
open(M_CYCLE7, 'w', encoding='utf-8', newline='').write(src.replace(SHIPPED, CYCLE7))
open(C_PREFIX, 'w', encoding='utf-8', newline='').write(
    chk.replace(PRED_FIXED, PRED_C8)
       .replace("require('./_boot.cjs')",
                'require(' + repr(os.path.join(ROOT, 'test', '_boot.cjs')) + ')'))

lines = ['=== W-ADDRESSES cycle 9 -- R22: the harvested cells get the press\'s own oracle ===', '']

cA, oA = run(CHECK, DIST)
vA = verdicts(oA)
table(lines, 'A. SHIPPED build, FIXED cells -- home_claims exit %d' % cA, vA)

lines.append('')
cB, oB = run(CHECK, M_FUTURE)
vB = verdicts(oB)
table(lines, 'B1. FUTURE-W2 mirror (parseHash AND boot.js both case-insensitive), FIXED cells '
             '-- exit %d' % cB, vB, vA)

cB2, oB2 = run(C_PREFIX, M_FUTURE)
vB2 = verdicts(oB2)
lines.append('')
table(lines, 'B2. THE SAME MIRROR, PRE-FIX cells (the cycle-8 predicate) -- exit %d' % cB2,
      vB2, vB)
d = detail(oB2, 'NOT a registered topic (#AUTHZ/home)')
if d:
    lines.append('    the false alarm, verbatim:')
    lines.append('      ' + d)

lines.append('')
cC, oC = run(CHECK, M_CYCLE7)
vC = verdicts(oC)
table(lines, 'C. CYCLE-7-line mirror, FIXED cells -- R21\'s differential must survive R22 '
             '-- exit %d' % cC, vC, vA)

ok_a = cA == 0 and vA['#/home'] == 'PASS' and vA['#<TOPIC>/home'] == 'PASS'
ok_b1 = vB['#/home'] == 'PASS' and vB['#<TOPIC>/home'] == 'PASS'
ok_b2 = vB2['#<TOPIC>/home'] == 'FAIL'
ok_c = vC['#/home'] == 'FAIL' and vC['#<TOPIC>/home'] == 'FAIL'
lines += ['', 'VERDICT',
          '  A  shipped build, fixed cells green ............................ %s' % ok_a,
          '  B1 future-W2 build, fixed cells green (the false alarm is dead) %s' % ok_b1,
          '  B2 future-W2 build, PRE-FIX cells RED (the false alarm, shown) . %s' % ok_b2,
          '  C  cycle-7 line, fixed cells RED (R21 differential survives) ... %s' % ok_c,
          '',
          '  THE DIFFERENTIAL B1 vs B2 IS THE CONTROL: one build, two versions of the same cell.',
          '  THE WORKTREE WAS NOT WRITTEN: dist/index.html unchanged: %s; test/home_claims.cjs '
          'unchanged: %s'
          % (open(DIST, encoding='utf-8', newline='').read() == src,
             open(CHECK, encoding='utf-8', newline='').read() == chk)]

text = '\n'.join(lines) + '\n'
open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
sys.stdout.write(text)
