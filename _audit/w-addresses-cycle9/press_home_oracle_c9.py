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
# THE RECEIPT MOVED WHEN THE SCRIPT GREW (cycle 10, judge item 1). This script now runs SIX arms,
# not four: cycle 10 added E1/E2, the press of R22's second conjunct. The four-arm run this file
# produced as cycle 9 is left byte-intact beside it at `../w-addresses-cycle9/press-home-oracle
# .txt`, and it is the receipt the cycle-9 ledger section quotes; re-generating it here would
# make that section and its own evidence disagree, which is the class of defect this wave keeps
# finding. This run writes the cycle-10 path.
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle10', 'press-home-oracle-armE.txt')

M_FUTURE = os.path.join(SCRATCH, '_w9_mirror_caseinsensitive.html')
M_CYCLE7 = os.path.join(SCRATCH, '_w9_mirror_cycle7line.html')
M_RESTORE = os.path.join(SCRATCH, '_w9_mirror_restore_last_topic.html')
C_PREFIX = os.path.join(SCRATCH, '_w9_home_claims_prefix.cjs')
C_FIRST = os.path.join(SCRATCH, '_w9_home_claims_first_conjunct.cjs')

# ---- the RESTORE-LAST-TOPIC build: the one shape that reds R22's SECOND conjunct --------------
# TWO substitutions, and they have to be made TOGETHER or the build is a defect rather than a
# product change: view-manager adopts the record's last-visited topic on a route with no topic
# axis, and boot's bare-view branch stamps the DOOR room so the stamp agrees with what the app
# then shows. On that build a bare view shows a NON-boot topic and the document wears that same
# room, so the first conjunct holds and only the second can fail.
VM_ON = """    if (route.topic && typeof TopicRegistry !== 'undefined') {
      var curT = TopicRegistry.current();
      if (curT && route.topic !== curT.id) TopicRegistry.setTopic(route.topic);
    }"""
VM_RESTORE = """    if (route.topic && typeof TopicRegistry !== 'undefined') {
      var curT = TopicRegistry.current();
      if (curT && route.topic !== curT.id) TopicRegistry.setTopic(route.topic);
    }
    if (!route.topic && typeof TopicRegistry !== 'undefined'
        && window.LastVisit && LastVisit.topicId) {
      var _lv = LastVisit.topicId();
      var _cv = TopicRegistry.current();
      if (_lv && TopicRegistry.get(_lv) && _cv && _cv.id !== _lv) TopicRegistry.setTopic(_lv);
    }"""
BOOT_DOOR = ("var _dg=(!_raw||_seg.toLowerCase()==='home'||(_hr&&(_raw.split('/')[1]||'')"
             ".toLowerCase()==='home'))?_door:(_hr||_door||_rm(window.__doorBoot));")

# ---- the FIRST-CONJUNCT-ONLY cell: the control for arm E --------------------------------------
PRED_FIRST = "              !!want && uwore.length > 0 && uwore.every((v) => v === want),"

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

for name, needle in [('view-manager\'s topic adoption', VM_ON), ('boot\'s classifier line',
                                                                 SHIPPED)]:
    if src.count(needle) != 1:
        sys.exit('%s appears %d times in dist/index.html, expected 1'
                 % (name, src.count(needle)))
open(M_RESTORE, 'w', encoding='utf-8', newline='').write(
    src.replace(VM_ON, VM_RESTORE).replace(SHIPPED, BOOT_DOOR))
open(C_FIRST, 'w', encoding='utf-8', newline='').write(
    chk.replace(PRED_FIXED, PRED_FIRST)
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

# ---- ARM E: THE SECOND CONJUNCT'S OWN PRESS (cycle 10, judge item 1) --------------------------
# R22's predicate is a conjunction, and cycle 9 pressed ONE half of it. `uf.shown === px.boot`
# was added because it was free -- px.boot was already read, already asserted distinct -- and
# "free" was taken as "sound". A judge then MEASURED it inert: replacing the whole predicate with
# `(isHome || uf.shown === px.boot)` alone left both cells GREEN on the cycle-7-line build that
# carries R21's defect, so nothing any arm above drives is discriminated by it. That is the
# wave's own second law arriving inside the fix that quotes it: an instrument enters only if it
# has been SHOWN FAILING.
#
# THE SHAPE THAT REDS IT is a RESTORE-LAST-TOPIC build -- a plausible product change, not a
# contrivance: view-manager adopts LastVisit.topicId() on a topicless route, and boot's bare-view
# branch stamps the door room to match, so the door and the app AGREE on a room that is not the
# boot topic's. The first conjunct (every value the document wore is the room of the surface the
# app reports) therefore HOLDS, and only the second can fail.
#
# E2 IS THE CONTROL AND IT IS NOT OPTIONAL: a red that both conjuncts could produce proves
# neither. It runs the SAME build against a cell carrying the FIRST conjunct alone, which must
# come back green.
lines.append('')
cE1, oE1 = run(CHECK, M_RESTORE)
vE1 = verdicts(oE1)
table(lines, 'E1. RESTORE-LAST-TOPIC mirror, BOTH conjuncts -- exit %d' % cE1, vE1, vA)
d = detail(oE1, 'NOT a registered topic (#/home)')
if d:
    lines.append('    the red, verbatim:')
    lines.append('      ' + d)

cE2, oE2 = run(C_FIRST, M_RESTORE)
vE2 = verdicts(oE2)
lines.append('')
table(lines, 'E2. THE SAME MIRROR, the FIRST CONJUNCT ALONE (the control) -- exit %d' % cE2,
      vE2, vE1)
lines.append('    E2\'s EXIT is not the reading -- the two cells above are. A restore-last-topic')
lines.append('    build moves other boot cells too, which is what makes it a product change')
lines.append('    rather than a one-line poke; the verdict below is taken per CELL.')

ok_a = cA == 0 and vA['#/home'] == 'PASS' and vA['#<TOPIC>/home'] == 'PASS'
ok_b1 = vB['#/home'] == 'PASS' and vB['#<TOPIC>/home'] == 'PASS'
ok_b2 = vB2['#<TOPIC>/home'] == 'FAIL'
ok_c = vC['#/home'] == 'FAIL' and vC['#<TOPIC>/home'] == 'FAIL'
ok_e1 = vE1['#/home'] == 'FAIL' or vE1['#<TOPIC>/home'] == 'FAIL'
ok_e2 = vE2['#/home'] == 'PASS' and vE2['#<TOPIC>/home'] == 'PASS'
lines += ['', 'VERDICT',
          '  A  shipped build, fixed cells green ............................ %s' % ok_a,
          '  B1 future-W2 build, fixed cells green (the false alarm is dead) %s' % ok_b1,
          '  B2 future-W2 build, PRE-FIX cells RED (the false alarm, shown) . %s' % ok_b2,
          '  C  cycle-7 line, fixed cells RED (R21 differential survives) ... %s' % ok_c,
          '  E1 restore-last-topic build, BOTH conjuncts: RED ............... %s' % ok_e1,
          '  E2 the same build, FIRST conjunct alone: GREEN (the control) ... %s' % ok_e2,
          '',
          '  THE DIFFERENTIAL B1 vs B2 IS THE CONTROL: one build, two versions of the same cell.',
          '  E1 vs E2 IS THE SAME MOVE FOR THE SECOND CONJUNCT: one build, two versions of one',
          '  predicate. E1 alone would not distinguish "the second conjunct fired" from "the first',
          '  one did"; together they say the clause is FALSIFIABLE, on a build somebody could',
          '  plausibly write, which is what "free" did not say.',
          '  THE WORKTREE WAS NOT WRITTEN: dist/index.html unchanged: %s; test/home_claims.cjs '
          'unchanged: %s'
          % (open(DIST, encoding='utf-8', newline='').read() == src,
             open(CHECK, encoding='utf-8', newline='').read() == chk)]

text = '\n'.join(lines) + '\n'
open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
sys.stdout.write(text)
