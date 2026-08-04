"""W-ADDRESSES cycle 9 -- every part of the veil guard, deleted alone, WITH THE TWO BRANCHES THAT
SIT AT THE INTERSECTION OF THE UNION'S TWO STATED LIMITS.

Cycle 8 closed `painted()`'s third branch and said so in a PASS line that also stated the sweep's
limit honestly: "the SWEEP does not reach paint arriving from a border or a box-shadow spread
(only the hit stack does)". The second half is where the sentence rounded up. The hit stack is
`document.elementsFromPoint`, which SKIPS `pointer-events:none` -- the exact class the sweep was
added for -- so a pointer-events:none out-of-flow box painted only by a border or an inset
box-shadow over the track's centre was invisible to BOTH reads. `painted()` now reads both, and
MUTANT M2 (the border box with hit-testing OFF) and MUTANT M3 (an inset box-shadow, same shape)
are the landings that can fail if either branch is narrowed back.

ALL NINE PRESSES ARE RE-RUN, not only the two new ones, and cycle 8's own note is why: adding a
plant can change which deletion a press reds on. It did again, and P4c is the receipt --
`painted()` now sees a border, so deleting the hit stack leaves MUTANT M caught by the SWEEP and
MIS-ATTRIBUTED rather than UNDETECTED. Still red, still the hit stack's only landing, and the
expected needle is updated to what the arm actually asserts (that a box in front of the panel is
NAMED as being in front of it). That is the same shape R18 gave MUTANT G in cycle 7.

  P4a  the chain composite read neutered      -> K, L1, L2, L3 UNDETECTED
  P4b  cycle 6's widening dropped             -> L1, L2, L3 UNDETECTED (K still caught)
  P4c  the hit stack neutered                 -> M MIS-ATTRIBUTED          [needle changed]
  P4d  the ELEMENT half of the sweep neutered -> I, Ib, Ic, M2, M3 UNDETECTED
  P4e  the PSEUDO half of the sweep neutered  -> J UNDETECTED
  P4f  painted()'s background-image branch    -> Ib UNDETECTED
  P4g  painted()'s backdrop-filter branch     -> Ic UNDETECTED
  P4h  painted()'s BORDER branch              -> M2 UNDETECTED   [NEW]
  P4i  painted()'s BOX-SHADOW branch          -> M3 UNDETECTED   [NEW]

Same harness as cycles 7 and 8: the plants live in test/scoreboard_salience.cjs, which READS the
built deliverable, so nothing is rebuilt. The file is snapshotted in memory, restored in a
finally, and its `git diff --numstat` compared before the first plant and after the restore.
"""
import os
import re
import subprocess

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SRC = os.path.join(ROOT, 'test', 'scoreboard_salience.cjs')
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle9', 'press-veil-parts.txt')

CHAIN_ON = "      const opa = chain.map((n) => ({ el: name(n), o: composits(n).join(' + ') }))"
CHAIN_OFF = "      const opa = chain.map((n) => ({ el: name(n), o: '' }))"

WIDEN_ON = """        if (cs.filter && cs.filter !== 'none') out.push('filter ' + cs.filter);
        const bf = cs.backdropFilter || cs.webkitBackdropFilter;
        if (bf && bf !== 'none') out.push('backdrop-filter ' + bf);
        if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') {
          out.push('mix-blend-mode ' + cs.mixBlendMode);
        }"""
WIDEN_OFF = """        void cs;"""

STACK_ON = """          const hit = document.elementsFromPoint(cx, cy) || [];
          deepest = hit.length ? name(hit[0]) : '(nothing hit)';
          at = hit.indexOf(el);
          stack = (at < 0 ? hit : hit.slice(0, at))
            .filter((n) => !el.contains(n)).map(name);"""
STACK_OFF = """          const hit = document.elementsFromPoint(cx, cy) || [];
          deepest = hit.length ? name(hit[0]) : '(nothing hit)';
          at = 0;
          stack = [];"""

ELEM_ON = """            const cs = getComputedStyle(n);
            const why = (cs.position === 'static' || cs.position === 'relative'
              || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) ? '' : painted(cs);"""
ELEM_OFF = """            const cs = getComputedStyle(n);
            const why = cs ? '' : '';"""

PSEUDO_ON = "          for (let k = 0; k < 2; k++) {"
PSEUDO_OFF = "          for (let k = 0; k < 0; k++) {"

BGIMG_ON = """          const bi = cs.backgroundImage;
          if (bi && bi !== 'none') return 'background-image ' + bi.slice(0, 44);"""
BGIMG_OFF = """          void cs.backgroundImage;"""

BDF_ON = """          const bf = cs.backdropFilter || cs.webkitBackdropFilter;
          if (bf && bf !== 'none') return 'backdrop-filter ' + bf;"""
BDF_OFF = """          void cs.backdropFilter;"""

BORDER_ON = """          const clear = (c) => !c || c === 'transparent' || /rgba\\([^)]*,\\s*0\\s*\\)$/.test(c);
          const sides = [['Top', cs.borderTopStyle, cs.borderTopWidth, cs.borderTopColor],
            ['Right', cs.borderRightStyle, cs.borderRightWidth, cs.borderRightColor],
            ['Bottom', cs.borderBottomStyle, cs.borderBottomWidth, cs.borderBottomColor],
            ['Left', cs.borderLeftStyle, cs.borderLeftWidth, cs.borderLeftColor]];
          for (const [side, st, wd, col] of sides) {
            if (st && st !== 'none' && st !== 'hidden' && parseFloat(wd) > 0 && !clear(col)) {
              return 'border-' + side.toLowerCase() + ' ' + wd + ' ' + st + ' ' + col;
            }
          }"""
BORDER_OFF = """          void cs.borderTopStyle;"""

SHADOW_ON = """          const sh = cs.boxShadow;
          if (sh && sh !== 'none') return 'box-shadow ' + sh.slice(0, 44);"""
SHADOW_OFF = """          void cs.boxShadow;"""

PRESSES = [
    ('P4a  the chain composite read neutered (composits() -> [])', CHAIN_ON, CHAIN_OFF,
     ['MUTANT K UNDETECTED', 'MUTANT L1 UNDETECTED', 'MUTANT L2 UNDETECTED',
      'MUTANT L3 UNDETECTED']),
    ('P4b  cycle 6 widening dropped (filter/backdrop-filter/blend)', WIDEN_ON, WIDEN_OFF,
     ['MUTANT L1 UNDETECTED', 'MUTANT L2 UNDETECTED', 'MUTANT L3 UNDETECTED']),
    ('P4c  the hit stack neutered', STACK_ON, STACK_OFF, ['MUTANT M MIS-ATTRIBUTED']),
    ('P4d  the ELEMENT half of the geometric sweep neutered', ELEM_ON, ELEM_OFF,
     ['MUTANT I UNDETECTED', 'MUTANT Ib UNDETECTED', 'MUTANT Ic UNDETECTED',
      'MUTANT M2 UNDETECTED', 'MUTANT M3 UNDETECTED']),
    ('P4e  the PSEUDO half of the geometric sweep neutered', PSEUDO_ON, PSEUDO_OFF,
     ['MUTANT J UNDETECTED']),
    ('P4f  painted()\'s background-image branch dropped', BGIMG_ON, BGIMG_OFF,
     ['MUTANT Ib UNDETECTED']),
    ('P4g  painted()\'s backdrop-filter branch dropped', BDF_ON, BDF_OFF,
     ['MUTANT Ic UNDETECTED']),
    ('P4h  painted()\'s BORDER branch dropped [NEW]', BORDER_ON, BORDER_OFF,
     ['MUTANT M2 UNDETECTED']),
    ('P4i  painted()\'s BOX-SHADOW branch dropped [NEW]', SHADOW_ON, SHADOW_OFF,
     ['MUTANT M3 UNDETECTED']),
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


def hits(out, needle):
    return [ln.strip()[:150] for ln in out.split('\n') if needle in ln]


def mutrow(out):
    """every mutant verdict line, so a press that changes something ELSE is visible too"""
    got = {}
    key = None
    for ln in out.split('\n'):
        m = re.match(r'^(\d+px)\s+(light|dark)\s', ln)
        if m:
            key = m.group(1) + '/' + m.group(2)
        for tag, pat in (('J', 'the SAME backdrop with pointer-events:none'),
                         ('I/Ib/Ic', 'a pointer-events:none SIBLING overlay'),
                         ('M/M2/M3', 'a box painted only by its BORDER'),
                         ('chain', 'the ancestor chain, one property at a time')):
            if pat in ln and key:
                got.setdefault(key, {})[tag] = ln.split('->', 1)[-1].strip()[:230]
    return got


LINES = []


def say(s=''):
    LINES.append(s)
    print(s, flush=True)


snap = read(SRC)
before = numstat()
for name, a, _b, _c in PRESSES:
    assert a in snap, 'anchor not found: %s' % name
    assert snap.count(a) == 1, 'anchor is not unique: %s' % name

say('=== W-ADDRESSES cycle 9 -- each part of the veil guard, deleted alone ===')
say('')
code, out = run()
say('SHIPPED (nothing deleted): scoreboard_salience exit %d' % code)
census = [ln.strip() for ln in out.split('\n') if 'PLANTED LANDINGS press it' in ln]
if census:
    m = re.search(r'(\d+) PLANTED LANDINGS press it \(([^)]*)\)', census[0])
    if m:
        say('   the PASS line\'s own census, formatted from the roster: %s landings (%s)'
            % (m.group(1), m.group(2)))
base = mutrow(out)
for k in sorted(base):
    say('   %-12s %s' % (k, base[k]))

rows = []
try:
    for name, anchor, repl, needles in PRESSES:
        write(SRC, snap.replace(anchor, repl, 1))
        code2, out2 = run()
        found = {n: len(hits(out2, n)) for n in needles}
        ok = code2 != 0 and all(v > 0 for v in found.values())
        rows.append('%-58s exit %d   %s   %s'
                    % (name, code2, 'RED as required' if ok else '*** NOT RED ***',
                       ', '.join('%s x%d' % (n.replace(' UNDETECTED', '')
                                             .replace(' MIS-ATTRIBUTED', '(mis-attr)'), v)
                                 for n, v in found.items())))
        say('')
        say(rows[-1])
        for n in needles:
            for h in hits(out2, n)[:1]:
                say('     ' + h)
        if not ok:
            for h in hits(out2, 'SCOREBOARD SALIENCE:')[:1]:
                say('     (verdict) ' + h)
finally:
    write(SRC, snap)
    code3, out3 = run()
    after = numstat()
    say('')
    say('RESTORED: source identical to snapshot %s; working-tree diff unchanged %s; '
        'scoreboard_salience exit %d' % (read(SRC) == snap, before == after, code3))

say('')
for r in rows:
    say(r)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(LINES) + '\n')
