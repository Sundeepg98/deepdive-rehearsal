"""W-ADDRESSES cycle 8 -- every part of the veil guard, deleted alone, WITH THE BRANCH CYCLE 7
LEFT UNPRESSED.

Cycle 7's acceptance test was six deletions (P4a-P4f) and its commit headline said "every part of
the veil guard now has a plant that can fail it". It was one branch short. `painted()` installed
THREE reasons -- background-color, background-image, backdrop-filter -- and cycle 7 planted two:
MUTANT I presses the first, Ib the second, and NOTHING pressed the third. Deleting that branch
alone left this check exit 0 with every mutant still caught and all four cells green (measured by
the judges, reproduced here as P4g's shipped baseline). MUTANT L2 is not a press of it: L2 plants
backdrop-filter on `#home`, an ANCESTOR, which the CHAIN read catches before the sweep is
consulted -- so the one shape that presses the sweep's backdrop-filter branch is a box the chain
and the hit stack both cannot see (a fixed `pointer-events:none` SIBLING) painted ONLY by a
backdrop-filter. MUTANT Ic is that box.

ALL SEVEN PRESSES ARE RE-RUN, not only the new one: adding a plant can change which deletion a
press reds on, and cycle 7's P4c is the receipt for that -- it was written expecting MUTANT G and
came back naming a gap that cycle's own fix had opened.

  P4a  the chain composite read neutered      -> K, L1, L2, L3 UNDETECTED
  P4b  cycle 6's widening dropped             -> L1, L2, L3 UNDETECTED (K still caught)
  P4c  the hit stack neutered                 -> M UNDETECTED
  P4d  the ELEMENT half of the sweep neutered -> I, Ib, Ic UNDETECTED
  P4e  the PSEUDO half of the sweep neutered  -> J UNDETECTED
  P4f  painted()'s background-image branch    -> Ib UNDETECTED (I, Ic still caught)
  P4g  painted()'s backdrop-filter branch     -> Ic UNDETECTED (I, Ib still caught)   [NEW]

Same harness as cycle 7: the plants live in test/scoreboard_salience.cjs, which READS the built
deliverable, so nothing is rebuilt. The file is snapshotted in memory, restored in a finally, and
its `git diff --numstat` compared before the first plant and after the restore -- not
`git diff --exit-code`, which on a working tree already carrying this cycle's edits is non-zero
either way and so cannot answer "did the press restore the file".
"""
import os
import re
import subprocess

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SRC = os.path.join(ROOT, 'test', 'scoreboard_salience.cjs')
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle8', 'press-veil-parts.txt')

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

# the branch cycle 7 left unpressed. The anchor carries the `return`, which the identical two
# lines inside composits() do not, so it is unique.
BDF_ON = """          const bf = cs.backdropFilter || cs.webkitBackdropFilter;
          if (bf && bf !== 'none') return 'backdrop-filter ' + bf;"""
BDF_OFF = """          void cs.backdropFilter;"""

PRESSES = [
    ('P4a  the chain composite read neutered (composits() -> [])', CHAIN_ON, CHAIN_OFF,
     ['MUTANT K UNDETECTED', 'MUTANT L1 UNDETECTED', 'MUTANT L2 UNDETECTED',
      'MUTANT L3 UNDETECTED']),
    ('P4b  cycle 6 widening dropped (filter/backdrop-filter/blend)', WIDEN_ON, WIDEN_OFF,
     ['MUTANT L1 UNDETECTED', 'MUTANT L2 UNDETECTED', 'MUTANT L3 UNDETECTED']),
    ('P4c  the hit stack neutered', STACK_ON, STACK_OFF, ['MUTANT M UNDETECTED']),
    ('P4d  the ELEMENT half of the geometric sweep neutered', ELEM_ON, ELEM_OFF,
     ['MUTANT I UNDETECTED', 'MUTANT Ib UNDETECTED', 'MUTANT Ic UNDETECTED']),
    ('P4e  the PSEUDO half of the geometric sweep neutered', PSEUDO_ON, PSEUDO_OFF,
     ['MUTANT J UNDETECTED']),
    ('P4f  painted()\'s background-image branch dropped', BGIMG_ON, BGIMG_OFF,
     ['MUTANT Ib UNDETECTED']),
    ('P4g  painted()\'s backdrop-filter branch dropped [NEW]', BDF_ON, BDF_OFF,
     ['MUTANT Ic UNDETECTED']),
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
                         ('M', 'a box painted only by its BORDER'),
                         ('chain', 'the ancestor chain, one property at a time')):
            if pat in ln and key:
                got.setdefault(key, {})[tag] = ln.split('->', 1)[-1].strip()[:210]
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

say('=== W-ADDRESSES cycle 8 -- each part of the veil guard, deleted alone ===')
say('')
code, out = run()
say('SHIPPED (nothing deleted): scoreboard_salience exit %d' % code)
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
                       ', '.join('%s x%d' % (n.replace(' UNDETECTED', ''), v)
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

open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(LINES) + '\n')
