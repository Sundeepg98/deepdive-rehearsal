"""W-ADDRESSES cycle 5 -- press craft_hygiene's two cycle-5 changes on the real tree.

JUDGE ITEM 7 -- THE SEPARATOR-ONLY LITERAL.
  S1  home-view.js's segLabel reverted to `' -- '`, the shipped state that rendered 138 spaced
      double hyphens on the home. The check must go RED naming a `dash` at that site. On the
      cycle-4 check it printed `dash 0`.
  S2  the same revert with the SEP_ONLY branch in judge() disabled AND its two plants removed --
      which is cycle-4's code exactly. Must be GREEN, i.e. must reproduce the cycle-4 blindness.
      (Disabling the RULE alone ABORTS on the undetected plants, which is the property judge item
      6 is about, arriving here as a side effect: the rule can no longer be removed quietly.)
  S3  the bound: a RANGE label (`p50 + ' - ' + p99`) planted at the same site. Must stay GREEN --
      a lone hyphen between two figures is not a dash doing an em dash's job, and a rule that
      cannot tell them apart would report every joiner in the tree.

JUDGE ITEM 6 -- THE RECEIPT THAT COULD NOT REPORT ITS OWN LOSS.
  R1  PLANTS_SINK emptied. Cycle 4 printed the IDENTICAL "19 planted defects detected" here; the
      count is derived from the driving lists now, so the printed figure must MOVE.
  R2  sink_bodies() reverted to cycle 3's first-token behaviour, plants intact -- must ABORT, which
      is what makes those two fixtures the guard on R10's widening.
  R3  both at once: the widening reverted AND its only guard deleted. Under cycle 4's receipt this
      was silent and green with an unchanged count. The count is what tells you now.

Snapshots in memory; never `git checkout`. The shipped tree is re-run green at the end.
"""
import os
import re
import subprocess

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
CH = os.path.join(ROOT, 'test', 'craft_hygiene.py')
HV = os.path.join(ROOT, 'src', 'scripts', 'app', 'home-view.js')

SEG = "    return s.title + ' \\u2014 ' + (s.done"
SEG_OLD = "    return s.title + ' -- ' + (s.done"
SEG_RANGE = "    return s.title + ' - ' + (s.done"
SEP_BRANCH = "    sep = SEP_ONLY.match(span)"
SEP_OFF = "    sep = None and SEP_ONLY.match(span)"
SINK_HEAD = "    starts = [m.end() for rx in (SINK_ASSIGN, SINK_SETATTR) for m in rx.finditer(src)]"
SINK_FIRST = ("    starts = [m.end() for rx in (SINK_ASSIGN, SINK_SETATTR) for m in rx.finditer(src)]\n"
              "    FIRST_TOKEN_ONLY = True   # cycle 3's behaviour, put back")
STOP_HEAD = "                out.add(''.join(buf))\n            i += 1"
STOP_FIRST = ("                out.add(''.join(buf))\n"
              "                if FIRST_TOKEN_ONLY:\n                    break\n            i += 1")
PLANTS_SINK = """PLANTS_SINK = {
    'sink-ternary-prose': ("el.placeholder = compact ? 'Filter' : 'the interviewer\\\\'s list';",
                           'apostrophe'),
    'attr-ternary-prose': ("el.setAttribute('title', on ? 'Pause' : 'the interviewer\\\\'s cue');",
                           'apostrophe'),
}"""
PLANTS_SINK_EMPTY = "PLANTS_SINK = {}"
PLANTS_SEP = """PLANTS_SEP = {
    'sep-dash':     ("var s = t.title + ' -- ' + rest;", 'dash'),
    'sep-ellipsis': ("var s = head + '...' + tail;", 'ellipsis'),
}"""


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def run():
    r = subprocess.run(['python', '-X', 'utf8', 'test/craft_hygiene.py'], cwd=ROOT,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def digest(out):
    bits = []
    m = re.search(r'^\s*(\d+) planted defects detected', out, re.M)
    if m:
        bits.append('receipt says %s plants' % m.group(1))
    m = re.search(r'plus (\d+) negative controls', out)
    if m:
        bits.append('%s controls' % m.group(1))
    for ln in out.split('\n'):
        t = ln.strip()
        if t.startswith('dash ') or 'SELF-TEST ABORT' in t or t.startswith('CRAFT HYGIENE:'):
            bits.append(t[:120])
        if 'home-view.js' in t and ('dash' in t or '--' in t):
            bits.append(t.strip()[:150])
    return ' | '.join(bits)


snap_ch = read(CH)
snap_hv = read(HV)
assert SEG in snap_hv and SEP_BRANCH in snap_ch and SINK_HEAD in snap_ch
assert STOP_HEAD in snap_ch and PLANTS_SINK in snap_ch and PLANTS_SEP in snap_ch

CASES = [
    ('S1  segLabel reverted to " -- " (the shipped 138 marks)',
     snap_ch, snap_hv.replace(SEG, SEG_OLD, 1), 1),
    ('S2a ...with the SEP_ONLY branch disabled, plants kept',
     snap_ch.replace(SEP_BRANCH, SEP_OFF, 1), snap_hv.replace(SEG, SEG_OLD, 1), 1),
    ('S2b ...branch AND its two plants removed = cycle-4 s code',
     snap_ch.replace(SEP_BRANCH, SEP_OFF, 1).replace(PLANTS_SEP, 'PLANTS_SEP = {}', 1),
     snap_hv.replace(SEG, SEG_OLD, 1), 0),
    ('S3  a RANGE label " - " at the same site (the bound)',
     snap_ch, snap_hv.replace(SEG, SEG_RANGE, 1), 0),
    ('R1  PLANTS_SINK emptied -- the receipt must MOVE',
     snap_ch.replace(PLANTS_SINK, PLANTS_SINK_EMPTY, 1), snap_hv, 0),
    ('R2  sink_bodies reverted to first-token, plants intact',
     snap_ch.replace(SINK_HEAD, SINK_FIRST, 1).replace(STOP_HEAD, STOP_FIRST, 1), snap_hv, 1),
    ('R3  both: the widening reverted AND its only guard deleted',
     snap_ch.replace(SINK_HEAD, SINK_FIRST, 1).replace(STOP_HEAD, STOP_FIRST, 1)
            .replace(PLANTS_SINK, PLANTS_SINK_EMPTY, 1), snap_hv, 0),
]

rows = []
try:
    for name, ch, hv, want in CASES:
        write(CH, ch)
        write(HV, hv)
        code, out = run()
        verdict = 'as expected' if code == want else '*** UNEXPECTED (wanted exit %d) ***' % want
        rows.append('%-52s exit %d  %s\n     %s' % (name, code, verdict, digest(out)))
        print(rows[-1], flush=True)
finally:
    write(CH, snap_ch)
    write(HV, snap_hv)
    code, out = run()
    print('\nRESTORED (craft_hygiene identical: %s, home-view identical: %s): exit %d\n     %s'
          % (read(CH) == snap_ch, read(HV) == snap_hv, code, digest(out)))

print('\n'.join(rows))
