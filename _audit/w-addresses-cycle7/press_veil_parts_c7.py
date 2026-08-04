"""W-ADDRESSES cycle 7 -- the acceptance test judge item 1 named: DELETE EACH PART OF THE VEIL
GUARD ALONE AND WATCH IT GO RED.

Freeze condition 1 declares a four-part guard. The judges measured that only ONE part had a plant
that could fail it -- MUTANT G, which is a `body::after` with default pointer-events and is
therefore caught by the HIT STACK. Deleting the other three alone left the gate GREEN with every
planted mutant still caught. R18 then added a fifth part (the pseudo arm of the sweep), so there
are five parts and a sixth sub-branch worth pressing on its own:

  P4a  THE CHAIN COMPOSITE READ NEUTERED (`opa` always empty, which is `composits()` returning [])
       -> MUTANTS K, L1, L2, L3 UNDETECTED.
  P4b  CYCLE 6'S WIDENING DROPPED (filter / backdrop-filter / mix-blend-mode removed from
       composits(), opacity kept) -> L1, L2, L3 UNDETECTED, K still caught.
  P4c  THE HIT STACK NEUTERED (stack always empty, .hm-alt always in it) -> MUTANT M UNDETECTED.
       M is a full-viewport box painted ENTIRELY BY ITS BORDER: `painted()` tests
       background-color, background-image and backdrop-filter, so the sweep cannot see it by
       construction and the hit stack is the only arm that can. (Through cycle 6 this press left
       MUTANT G undetected; after R18 the sweep catches G too, so G no longer isolates the stack
       read and M is the plant that does. That change is the reason M exists.)
  P4d  THE ELEMENT HALF OF THE SWEEP NEUTERED -> MUTANTS I and Ib UNDETECTED.
  P4e  THE PSEUDO HALF OF THE SWEEP NEUTERED -> MUTANT J UNDETECTED. J is MUTANT G plus
       `pointer-events:none` -- the intersection of the two exemptions the other two reads already
       declared, and the shape the app's own faded boot splash has.
  P4f  painted()'s BACKGROUND-IMAGE BRANCH DROPPED (judge item 2) -> MUTANT Ib UNDETECTED, I still
       caught. Same box, same position, same pointer-events; only the property carrying the paint
       differs.

The plants are in test/scoreboard_salience.cjs, which reads the built deliverable, so no rebuild is
needed. Snapshot in memory; the tree is restored and re-run green as the last step, and the file's
`git diff --numstat` is compared before the plant and after the restore -- NOT `git diff
--exit-code`, which on a working tree already carrying this cycle's edits is non-zero either way
and so cannot answer "did the press restore the file".
"""
import os
import re
import subprocess

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SRC = os.path.join(ROOT, 'test', 'scoreboard_salience.cjs')

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

PRESSES = [
    ('P4a  the chain composite read neutered (composits() -> [])', CHAIN_ON, CHAIN_OFF,
     ['MUTANT K UNDETECTED', 'MUTANT L1 UNDETECTED', 'MUTANT L2 UNDETECTED',
      'MUTANT L3 UNDETECTED']),
    ('P4b  cycle 6 widening dropped (filter/backdrop-filter/blend)', WIDEN_ON, WIDEN_OFF,
     ['MUTANT L1 UNDETECTED', 'MUTANT L2 UNDETECTED', 'MUTANT L3 UNDETECTED']),
    ('P4c  the hit stack neutered', STACK_ON, STACK_OFF, ['MUTANT M UNDETECTED']),
    ('P4d  the ELEMENT half of the geometric sweep neutered', ELEM_ON, ELEM_OFF,
     ['MUTANT I UNDETECTED', 'MUTANT Ib UNDETECTED']),
    ('P4e  the PSEUDO half of the geometric sweep neutered', PSEUDO_ON, PSEUDO_OFF,
     ['MUTANT J UNDETECTED']),
    ('P4f  painted()\'s background-image branch dropped', BGIMG_ON, BGIMG_OFF,
     ['MUTANT Ib UNDETECTED']),
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
                         ('I', 'a pointer-events:none SIBLING overlay'),
                         ('M', 'a box painted only by its BORDER'),
                         ('chain', 'the ancestor chain, one property at a time')):
            if pat in ln and key:
                got.setdefault(key, {})[tag] = ln.split('->', 1)[-1].strip()[:120]
    return got


snap = read(SRC)
before = numstat()
for name, a, _b, _c in PRESSES:
    assert a in snap, 'anchor not found: %s' % name
    assert snap.count(a) == 1, 'anchor is not unique: %s' % name

print('=== W-ADDRESSES cycle 7 -- each part of the veil guard, deleted alone ===\n')
code, out = run()
print('SHIPPED (nothing deleted): scoreboard_salience exit %d' % code)
base = mutrow(out)
for k in sorted(base):
    print('   %-12s %s' % (k, base[k]))

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
        print('\n' + rows[-1], flush=True)
        for n in needles:
            for h in hits(out2, n)[:1]:
                print('     ' + h, flush=True)
        if not ok:
            for h in hits(out2, 'SCOREBOARD SALIENCE:')[:1]:
                print('     (verdict) ' + h, flush=True)
finally:
    write(SRC, snap)
    code3, out3 = run()
    after = numstat()
    print('\nRESTORED: source identical to snapshot %s; working-tree diff unchanged %s; '
          'scoreboard_salience exit %d' % (read(SRC) == snap, before == after, code3))

print()
for r in rows:
    print(r)
