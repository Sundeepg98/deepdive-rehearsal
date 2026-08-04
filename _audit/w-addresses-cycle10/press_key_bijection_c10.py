"""W-ADDRESSES cycle 10 -- R25: the legend arm becomes the BIJECTION three files already claim,
and the ruled form of the converse is CORRECTED on measurement rather than shipped on authority.

R25 ordered: `judgeKey` gains the converse -- every keel-shaped swatch colour in `r.keySwatch`
must appear in `r.keelPaint` -- reported in the same shape, guarded like the existing half, with
MUTANT 10c planted as 10b's mirror.

FOUR ARMS, and arm B is the one that changed the fix:

  A. the SHIPPED build, the cycle-10 arm            -> exit 0, 24 plants land
  B. the RULED FORM of the converse (denominator =
     `keelPaint`, this record's rails), shipped
     product                                        -> FALSE ALARM: `weakTopics` grades one probe
                                                      in seven Shaky and never Missed, so the
                                                      rails paint ONE severity while the key
                                                      correctly renders both, and the cell reds a
                                                      build with no defect in it
  C. 10c DELETED, cycle-10 arm                      -> the census moves 24 -> 23, so the plant is
                                                      load-bearing rather than decorative
  D. the CONVERSE DELETED, with 10c still planted   -> ABORT (MUTANT 10c UNDETECTED), so the
                                                      plant presses the branch and not the file

C and D are the pair that matters: C proves the count is derived from the plant, D proves the
plant is judged by the new branch. Either alone is satisfiable by an arm that does nothing.

NOTHING IN THE WORKTREE IS WRITTEN: every variant is a scratch copy of test/home_claims.cjs with
its `./_boot.cjs` require rewritten to an absolute path, run against the tree's own deliverable.
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
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle10', 'press-key-bijection.txt')

# ---- the RULED form of the converse: the denominator is this record's rails ------------------
CONVERSE_SHIPPED = """  const tokens = Object.keys(r.keelTokens || {}).map((t) => r.keelTokens[t]);
  const spare = (r.keySwatch || []).filter((s) => tokens.indexOf(s.color) < 0);"""
CONVERSE_RULED = """  const tokens = (r.keelPaint || []).map((p) => p.color);
  const spare = (r.keySwatch || []).filter((s) => tokens.indexOf(s.color) < 0);"""
CONVERSE_OFF = """  const tokens = Object.keys(r.keelTokens || {}).map((t) => r.keelTokens[t]);
  const spare = [];"""

# ---- MUTANT 10c's install, removed whole (its `land('10c')` goes with it) ---------------------
P10C_HEAD = "        const spare = await page.evaluate(() => {\n          const key = document"
P10C_TAIL = "        /* ---- THE KEY'S ROW GEOMETRY AT THE BAND'S TWO ENDS (cycle 10, R24) ---"


def variant(name, subs):
    src = open(CHECK, encoding='utf-8', newline='').read()
    for frm, to, want in subs:
        if src.count(frm) != want:
            sys.exit('%s: %r appears %d times in home_claims.cjs, expected %d'
                     % (name, frm[:60], src.count(frm), want))
        src = src.replace(frm, to)
    p = os.path.join(SCRATCH, name)
    open(p, 'w', encoding='utf-8', newline='').write(
        src.replace("require('./_boot.cjs')",
                    'require(' + repr(os.path.join(ROOT, 'test', '_boot.cjs')) + ')'))
    return p


def run(check):
    r = subprocess.run(['node', check, DIST], cwd=ROOT, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', shell=(os.name == 'nt'))
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def census(out):
    m = re.search(r'(\d+) planted mutants detected', out)
    return int(m.group(1)) if m else None


def legend_fails(out):
    return [ln.strip()[:300] for ln in out.split('\n')
            if ln.strip().startswith('FAIL') and 'gauge key' in ln]


def abort_line(out):
    for ln in out.split('\n'):
        if 'UNDETECTED' in ln or 'CANNOT LAND' in ln:
            return ln.strip()[:300]
    return ''


os.makedirs(SCRATCH, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
chk0 = open(CHECK, encoding='utf-8', newline='').read()
lines = ['=== W-ADDRESSES cycle 10 -- R25: the bijection the legend arm already claimed ===', '']

# ---- A ---------------------------------------------------------------------------------------
A = variant('_w10_hc_shipped.cjs', [])
cA, oA = run(A)
lines.append('A. the SHIPPED build, the CYCLE-10 arm -- exit %d, census %s' % (cA, census(oA)))
lines.append('   legend cells red: %d' % len(legend_fails(oA)))

# ---- B: the ruled form of the converse -------------------------------------------------------
B = variant('_w10_hc_converse_ruled.cjs', [(CONVERSE_SHIPPED, CONVERSE_RULED, 1)])
cB, oB = run(B)
lines.append('')
lines.append('B. THE RULED FORM (the denominator is THIS RECORD\'S rails, not the declared keel '
             'tokens) -- exit %d' % cB)
for f in legend_fails(oB)[:3]:
    lines.append('   ' + f)
lines.append('   THE FALSE ALARM, and it is why the shipped form widened the denominator: a '
             'record')
lines.append('   that earns one severity is not a record whose legend is wrong.')

# ---- C: 10c deleted, census must move --------------------------------------------------------
src = chk0
i, j = src.find(P10C_HEAD), src.find(P10C_TAIL)
if i < 0 or j < 0 or j <= i:
    sys.exit('MUTANT 10c\'s block could not be located for deletion')
C = variant('_w10_hc_no10c.cjs', [(src[i:j], '', 1)])
cC, oC = run(C)
lines.append('')
lines.append('C. MUTANT 10c DELETED (its install and its land() go together) -- exit %d, census %s'
             % (cC, census(oC)))
lines.append('   the shipped census is %s; deleting one plant moves it to %s'
             % (census(oA), census(oC)))

# ---- D: the converse deleted, 10c still planted ----------------------------------------------
D = variant('_w10_hc_converse_off.cjs', [(CONVERSE_SHIPPED, CONVERSE_OFF, 1)])
cD, oD = run(D)
lines.append('')
lines.append('D. THE CONVERSE BRANCH DELETED, 10c still planted -- exit %d' % cD)
lines.append('   ' + (abort_line(oD) or '(no abort line found)'))

ok_a = cA == 0
ok_b = cB != 0 and len(legend_fails(oB)) > 0
ok_c = census(oC) is not None and census(oA) is not None and census(oC) == census(oA) - 1
ok_d = cD != 0 and 'MUTANT 10c UNDETECTED' in oD
lines += ['', 'VERDICT',
          '  A  shipped build, the bijection arm green, census %s ............. %s'
          % (census(oA), ok_a),
          '  B  the RULED denominator FALSE-ALARMS on the shipped build ....... %s' % ok_b,
          '  C  deleting 10c moves the derived census by exactly one .......... %s' % ok_c,
          '  D  deleting the converse leaves 10c UNDETECTED (it aborts) ....... %s' % ok_d,
          '',
          '  B IS A CORRECTION TO A RULING, MADE BY MEASUREMENT. The converse is right; its',
          '  denominator was not. `keelPaint` is what THIS record painted, and a key that names a',
          '  severity the record has not earned is a legend rather than a defect. The shipped form',
          '  asks the honest question -- can the gauge draw this colour at all -- against the two',
          '  keel tokens resolved off the page.',
          '  THE WORKTREE WAS NOT WRITTEN: test/home_claims.cjs unchanged: %s'
          % (open(CHECK, encoding='utf-8', newline='').read() == chk0)]

text = '\n'.join(lines) + '\n'
open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
sys.stdout.write(text)
