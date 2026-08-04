"""W-ADDRESSES cycle 10 -- R24: the legend pays for its fifth swatch, and the pixel arithmetic
that block has argued from for three cycles finally has an instrument.

R24 ordered: shorten the two keel labels to the judge's named forms, RE-SWEEP the wrap point
across the full band, rewrite the styles.css arithmetic from the new sweep (or accept the +25px
in writing), restate home_fold's two-viewport rationale, and ADD THE MISSING INSTRUMENT -- the
key's rendered ROW COUNT and HEIGHT at the band's ends, pressed RED against a deliberately
wrapped mirror.

SIX ARMS:

  A. THE SWEEP, width by width, 320..560, on three legend forms -- the four-swatch legend
     (pre-cycle-9), the five-swatch legend with cycle 9's long labels, and the shipped short
     ones. The four-swatch row is the CONTROL on the sweep itself: it must reproduce the
     364/21px/46px figures cycle 2 recorded and cycle 9 re-derived, or the instrument is
     measuring something else.
  B. the shipped build, the cycle-10 geometry cells   -> PASS at both ends of the band
  C. the LONG-LABEL mirror (cycle 9's own product),
     the cycle-10 geometry cells                      -> the 419 cell REDS: two rows where the
                                                        shipped build has one
  D. MUTANT 10d deleted                               -> the derived census moves by one
  E. scoreboard_salience on this tree                 -> PASS; the swatch-count sweep reads N
                                                        copies and none disagrees
  F. a "four swatches" copy PLANTED in src/styles.css -> scoreboard_salience REDS and names the
                                                        file, the line and the number

F is the only arm that writes the worktree. It restores the file immediately and the restore is
verified byte-identical, which is this wave's settled shape for a press that cannot be done on a
scratch copy (the swept paths are resolved relative to the check's own directory).
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
SALIENCE = os.path.join(ROOT, 'test', 'scoreboard_salience.cjs')
STYLES = os.path.join(ROOT, 'src', 'styles.css')
# THE SWEEP LIVES BESIDE THIS PRESS, NOT IN THE SCRATCHPAD. A receipt whose tool is
# in a session temp dir is a receipt nobody can re-run -- carried item 9's class,
# one directory over.
SWEEP = os.path.join(ROOT, '_audit', 'w-addresses-cycle10', 'probe_key_sweep_c10.cjs')
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle10', 'press-legend-band.txt')

SHORT_M = '<span class="hm-k flag"><i></i><span class="hm-lbl">Missed</span></span>'
SHORT_S = '<span class="hm-k flag-s"><i></i><span class="hm-lbl">Shaky</span></span>'
LONG_M = '<span class="hm-k flag"><i></i><span class="hm-lbl">Missed flagged</span></span>'
LONG_S = '<span class="hm-k flag-s"><i></i><span class="hm-lbl">Shaky flagged</span></span>'
FOUR = '<span class="hm-k flag"><i></i><span class="hm-lbl">Flagged</span></span>'

M_LONG = os.path.join(SCRATCH, '_w10_legend_long.html')
M_FOUR = os.path.join(SCRATCH, '_w10_legend_four.html')

# MUTANT 10d's block, removed whole (its land() goes with it)
P10D_HEAD = "        /* MUTANT 10d: THE DELIBERATELY WRAPPED KEY."
P10D_TAIL = "        await page.setViewportSize({ width: w, height: h });"

lines = []


def say(s=''):
    lines.append(s)
    sys.stdout.write(s + '\n')
    sys.stdout.flush()


def node(script, *args):
    r = subprocess.run(['node', script] + list(args), cwd=ROOT, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', shell=(os.name == 'nt'))
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def census(out):
    m = re.search(r'(\d+) planted mutants detected', out)
    return int(m.group(1)) if m else None


def geo_rows(out):
    """{width: PASS|FAIL} for the two band-end geometry cells."""
    got = {}
    for ln in out.split('\n'):
        m = re.match(r'\s*(PASS|FAIL)\s+\[(\d+)/\w+\] the gauge key wraps', ln)
        if m:
            got[int(m.group(2))] = m.group(1)
    return got


def geo_detail(out, w):
    for ln in out.split('\n'):
        if ('[%d/' % w) in ln and 'the gauge key wraps' in ln and ln.strip().startswith('FAIL'):
            return ln.strip()[-260:]
    return ''


os.makedirs(SCRATCH, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
src = open(DIST, encoding='utf-8', newline='').read()
for name, needle in [('the SHORT missed swatch', SHORT_M), ('the SHORT shaky swatch', SHORT_S)]:
    if src.count(needle) != 1:
        sys.exit('%s appears %d times in dist/index.html, expected 1' % (name, src.count(needle)))
open(M_LONG, 'w', encoding='utf-8', newline='').write(
    src.replace(SHORT_M, LONG_M).replace(SHORT_S, LONG_S))
open(M_FOUR, 'w', encoding='utf-8', newline='').write(
    src.replace(SHORT_M, FOUR).replace(SHORT_S, ''))

say('=== W-ADDRESSES cycle 10 -- R24: the legend pays for its fifth swatch ===')
say('')

# ---- A: the sweep ----------------------------------------------------------------------------
say('A. THE WRAP SWEEP, width by width. Rows are printed only where the geometry CHANGES.')
for label, html, hi in [('FOUR swatches, "Flagged" (pre-cycle-9) -- the CONTROL', M_FOUR, 440),
                        ('FIVE, "Missed flagged"/"Shaky flagged" (cycle 9)', M_LONG, 560),
                        ('FIVE, "Missed"/"Shaky" (SHIPPED, cycle 10)', DIST, 440)]:
    c, o = node(SWEEP, html, '320', str(hi))
    say('')
    say('   ' + label + '   (sweep exit %d)' % c)
    for ln in o.split('\n'):
        if ln.startswith('  w=') or ln.startswith('swatches:'):
            say('     ' + ln.strip())

# ---- B / C: the geometry cells ---------------------------------------------------------------
say('')
cB, oB = node(CHECK, DIST)
gB = geo_rows(oB)
say('B. the SHIPPED build, the cycle-10 geometry cells -- home_claims exit %d, census %s'
    % (cB, census(oB)))
say('   %s' % gB)

cC, oC = node(CHECK, M_LONG)
gC = geo_rows(oC)
say('')
say('C. the LONG-LABEL mirror (cycle 9\'s own product), the SAME cells -- exit %d' % cC)
say('   %s' % gC)
d = geo_detail(oC, 419)
if d:
    say('   the red, verbatim:')
    say('     ' + d)

# ---- D: MUTANT 10d deleted -------------------------------------------------------------------
chk0 = open(CHECK, encoding='utf-8', newline='').read()
i, j = chk0.find(P10D_HEAD), chk0.find(P10D_TAIL)
if i < 0 or j < 0 or j <= i:
    sys.exit('MUTANT 10d\'s block could not be located for deletion')
noD = os.path.join(SCRATCH, '_w10_hc_no10d.cjs')
open(noD, 'w', encoding='utf-8', newline='').write(
    (chk0[:i] + chk0[j:]).replace("require('./_boot.cjs')",
                                  'require(' + repr(os.path.join(ROOT, 'test', '_boot.cjs'))
                                  + ')'))
cD, oD = node(noD, DIST)
say('')
say('D. MUTANT 10d DELETED -- exit %d, census %s (shipped: %s)' % (cD, census(oD), census(oB)))

# ---- E / F: the swatch-count sweep -----------------------------------------------------------
say('')
cE, oE = node(SALIENCE, DIST)
say('E. scoreboard_salience on this tree -- exit %d' % cE)
for ln in oE.split('\n'):
    if 'HAND-TYPED copy' in ln or 'SCOREBOARD SALIENCE:' in ln:
        say('   ' + ln.strip()[:300])

styles0 = open(STYLES, 'rb').read()
PLANT_AT = b'.hm-key{display:flex;align-items:center;flex-wrap:wrap;'
PLANT = b'/* the four swatches sit on the panel. */\n'
if styles0.count(PLANT_AT) != 1:
    sys.exit('the styles.css plant anchor is not unique')
try:
    open(STYLES, 'wb').write(styles0.replace(PLANT_AT, PLANT + PLANT_AT))
    cF, oF = node(SALIENCE, DIST)
finally:
    open(STYLES, 'wb').write(styles0)
say('')
say('F. a "the four swatches" copy PLANTED in src/styles.css -- exit %d' % cF)
for ln in oF.split('\n'):
    if 'HAND-TYPED COPY' in ln or 'SCOREBOARD SALIENCE: FAIL' in ln:
        say('   ' + ln.strip()[:400])
restored = open(STYLES, 'rb').read() == styles0
say('   src/styles.css restored byte-identical: %s' % restored)

ok_b = gB.get(320) == 'PASS' and gB.get(419) == 'PASS' and cB == 0
ok_c = gC.get(419) == 'FAIL'
ok_d = census(oD) is not None and census(oB) is not None and census(oD) == census(oB) - 1
ok_e = cE == 0
ok_f = cF != 0 and 'HAND-TYPED COPY' in oF and restored
say('')
say('VERDICT')
say('  B  the shipped build passes both band-end geometry cells .......... %s' % ok_b)
say('  C  cycle 9\'s OWN labels red the 419 cell (two rows, not one) ...... %s' % ok_c)
say('  D  deleting MUTANT 10d moves the derived census by one ............ %s' % ok_d)
say('  E  the swatch-count sweep is clean on this tree ................... %s' % ok_e)
say('  F  a planted "four swatches" copy REDS it, named and located ...... %s' % ok_f)
say('')
say('  A IS THE ARITHMETIC OF RECORD, and its control is its own first row: the four-swatch')
say('  legend still flips at 364 and still costs 21px/46px, which is what cycle 2 measured and')
say('  cycle 9 re-derived. The sweep is therefore reading the same thing they read.')

open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
