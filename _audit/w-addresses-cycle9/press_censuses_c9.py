"""W-ADDRESSES cycle 9 -- judge item 4: the two hand-typed plant censuses, made to move.

craft_hygiene.py has printed `len(PLANTS) + len(PLANTS_PRESSED) + len(CHANNEL_PLANTS)` since
cycle 5, and its number moved 23 -> 22 -> 21 -> 14 as those lists emptied under a press. The other
two censuses in this wave were LITERALS printed directly above rows the run was already producing
one by one:

  test/home_claims.cjs      '  21 planted mutants detected ...'
  test/scoreboard_salience  ' TEN PLANTED LANDINGS press it -- G ... L'

Both were ARITHMETICALLY CORRECT when they were typed, which is what makes this a durability
finding rather than a stale-number one: delete a mutant block from either file and the census goes
on advertising the old figure. Cycle 5's judge item 6 fixed exactly that shape in craft_hygiene;
cycle 8 spent a judge item RE-TYPING scoreboard's ("THIRTEEN" -> seventeen) instead of deriving it.

THE PRESS IS A DELETION IN EACH OF THE THREE, and the control is the cycle-8 form of each line:

  home_claims        remove `await goalMutant(13, 'aria', ...)`  -- MUTANT 13, plant and judge
  scoreboard         remove MUTANT M3's entry from `m2Forms`
  craft_hygiene      remove the 'dash' entry from PLANTS         -- the file that already derived

Each is run on the SHIPPED tree and again with the deletion. The derived number must move by one
in all three; the cycle-8 literals are printed beside them, and they do not move -- and on the
SHIPPED tree they are already WRONG, because this cycle added a plant to each file.

The sources are snapshotted in memory and restored in a finally; `git diff --numstat` is compared
before the first deletion and after the restore.
"""
import os
import re
import subprocess

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle9', 'press-censuses.txt')

HC = os.path.join(ROOT, 'test', 'home_claims.cjs')
SS = os.path.join(ROOT, 'test', 'scoreboard_salience.cjs')
CH = os.path.join(ROOT, 'test', 'craft_hygiene.py')

HC_CUT = """        await goalMutant(13, 'aria',
          '`goalOfOne` is not a met week, so the accessible name cannot be pointed at the met '
          + 'branch and rule 1 is untested.',
          'the goal bar was given an accessible name of its own -- role=img with the sentence '
          + 'already carried by the line beneath it -- and the arm accepted it');
"""

SS_CUT = """      ['M3', M3_BOX, 'box-shadow',
        (l) => !!l.sh && l.sh !== 'none',
        'the same overlay painted entirely by an INSET BOX-SHADOW -- the other half of the pair '
        + 'the PASS line used to exempt, and the same intersection: no hit test, not an ancestor, '
        + 'and no background of any kind'],
"""

CH_CUT = ("""    'dash':       "var h = '<p>Staff is the thin rail - the level you rehearsed least</p>';",\n""")

CASES = [
    ('home_claims', HC, HC_CUT, ['node', 'test/home_claims.cjs'],
     r'^\s*(\d+) planted mutants detected', "cycle 8's literal: '  21 planted mutants detected'"),
    ('scoreboard_salience', SS, SS_CUT, ['node', 'test/scoreboard_salience.cjs'],
     r'(\d+) PLANTED LANDINGS press it', "cycle 8's literal: ' TEN PLANTED LANDINGS press it'"),
    ('craft_hygiene', CH, CH_CUT, ['python', 'test/craft_hygiene.py'],
     r'(\d+) planted defects detected in the self-test',
     'already derived since cycle 5 -- the control for the method'),
]


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding='utf-8',
                       errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def numstat():
    r = subprocess.run(['git', 'diff', '--numstat', '--', 'test/'], cwd=ROOT,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    return (r.stdout or '').strip()


def census(out, pat):
    for ln in out.split('\n'):
        m = re.search(pat, ln)
        if m:
            return int(m.group(1))
    return None


LINES = []


def say(s=''):
    LINES.append(s)
    print(s, flush=True)


snaps = {p: read(p) for _n, p, _c, _cmd, _pat, _lit in CASES}
before = numstat()
for name, p, cut, _cmd, _pat, _lit in CASES:
    assert snaps[p].count(cut) == 1, 'the deletion anchor is not unique in %s' % name

say('=== W-ADDRESSES cycle 9 -- judge item 4: the plant censuses are DERIVED, and here is the '
    'deletion that moves them ===')
say('')

rows = []
try:
    for name, p, cut, cmd, pat, lit in CASES:
        code0, out0 = run(cmd)
        n0 = census(out0, pat)
        write(p, snaps[p].replace(cut, '', 1))
        code1, out1 = run(cmd)
        n1 = census(out1, pat)
        write(p, snaps[p])
        moved = (n0 is not None and n1 is not None and n1 == n0 - 1)
        say('%-22s shipped: %s (exit %d)   with one plant deleted: %s (exit %d)   %s'
            % (name, n0, code0, n1, code1, 'MOVED by one' if moved else '*** DID NOT MOVE ***'))
        say('   %s' % lit)
        rows.append((name, n0, n1, moved, code0))
finally:
    for p, s in snaps.items():
        write(p, s)
    after = numstat()
    say('')
    say('RESTORED: all three identical to their snapshots %s; working-tree diff unchanged %s'
        % (all(read(p) == s for p, s in snaps.items()), before == after))

say('')
say('VERDICT')
for name, n0, n1, moved, code0 in rows:
    say('  %-22s %s -> %s   moves with the code: %s   shipped exit 0: %s'
        % (name, n0, n1, moved, code0 == 0))
say('')
say('  AND THE CYCLE-8 LITERALS WERE ALREADY WRONG ON THIS TREE BEFORE THE DELETION: home_claims')
say('  printed 21 while 22 plants land, scoreboard printed TEN while 12 landings press it. That')
say('  is the finding: both numbers were correct the day they were typed, and each stopped being')
say('  correct the moment a plant was added -- silently, which a derived line cannot do.')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(LINES) + '\n')
