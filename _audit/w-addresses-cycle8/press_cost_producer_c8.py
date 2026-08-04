"""W-ADDRESSES cycle 8 -- R20's CONTROL: the guard still guards, the producer produces, and the
printed remedy walks end to end.

Cycle 7 made the cost-table reconciliation a fatal load-time abort in EVERY mode. Its own printed
remedy is "run `python3 test/check_all.py --profile` TWICE warm, then write max(run2, run3) into
gate_cost.json" -- and that first command exited 1 before a single check ran, because --profile is
a mode of the file the abort guards. The remedy could not be followed; the only way out was to
hand-edit the table the arm exists to stop being hand-edited. R20 exempts the PRODUCER and nothing
else, keeps the mismatch REPORT in every mode, and adds the exemption to the printed remedy so the
instruction is executable as written.

THREE BRANCHES, ON A TABLE WITH `craft_hygiene` REMOVED:
  (a) --dry-run and --only STILL exit 1 -- the guard still guards, and --only stays strict on
      purpose: six red shards are what forces a new check's cost row into the same commit as the
      check.
  (b) --profile exits 0 AND writes test/_profile.json -- and prints the full mismatch first, so a
      profile run that regenerates the table still says loudly that the table was wrong.
  (c) THE CLOSED LOOP, walked rather than argued: --profile twice warm, write max(run2, run3) per
      check per the remedy's own rule, re-run --dry-run, exit 0.

The two --profile runs in (c) are ALSO this cycle's real regeneration of gate_cost.json -- the
table's own rule is max of two warm profile runs of the tree being committed, and cycle 8 changed
two of the checks in it. The control and the regeneration are one measurement, taken once.

usage: python3 _audit/w-addresses-cycle8/press_cost_producer_c8.py
  (~26 min: two full profiled gate runs. Nothing else must be running on this box.)
"""
import json
import os
import shutil
import subprocess
import sys
import time

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SCRATCH = (r'C:\Users\Dell\AppData\Local\Temp\claude'
           r'\D--claude-workspace-deepdive-rehearsal'
           r'\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w8')
COST = os.path.join(ROOT, 'test', 'gate_cost.json')
PROF = os.path.join(ROOT, 'test', '_profile.json')
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle8', 'press-cost-producer.txt')
PY = sys.executable

LINES = []


def say(s=''):
    LINES.append(s)
    print(s, flush=True)


def run(args, env=None, tag=''):
    e = dict(os.environ)
    if env:
        e.update(env)
    t0 = time.time()
    r = subprocess.run([PY] + args, cwd=ROOT, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', env=e)
    out = (r.stdout or '') + (r.stderr or '')
    say('  $ python %s%s -> exit %d  (%.1fs)'
        % (' '.join(args), (' [' + tag + ']') if tag else '', r.returncode, time.time() - t0))
    return r.returncode, out


def quote(out, needles, n=1):
    for needle in needles:
        for ln in out.split('\n'):
            if needle in ln:
                say('      | ' + ln.strip()[:150])
                break


snap = open(COST, encoding='utf-8', newline='').read()
table = json.loads(snap)
assert 'craft_hygiene' in table, 'craft_hygiene is not in the table -- press anchor is stale'
os.makedirs(SCRATCH, exist_ok=True)

say('=== W-ADDRESSES cycle 8 -- R20: the producer is exempt, pressed in three branches ===')
say('')
say('BASELINE (the committed table, %d entries):' % len(table))
code, out = run(['test/check_all.py', '--dry-run'], tag='committed table')
say('    the shipped table reconciles: exit %d (expected 0)' % code)

try:
    holed = dict(table)
    holed.pop('craft_hygiene')
    open(COST, 'w', encoding='utf-8', newline='\n').write(json.dumps(holed, indent=1) + '\n')
    say('')
    say('THE HOLE: craft_hygiene removed from test/gate_cost.json (%d entries against 78 checks)'
        % len(holed))

    say('')
    say('(a) THE GUARD STILL GUARDS -- every mode except the producer:')
    a1, o1 = run(['test/check_all.py', '--dry-run'], tag='must be 1')
    quote(o1, ['THE GATE COST TABLE DOES NOT DESCRIBE THE GATE.', 'holds 77 entries',
               '- craft_hygiene'])
    a2, o2 = run(['test/check_all.py', '--only', 'ascii_guard'], tag='must be 1')
    quote(o2, ['holds 77 entries'])
    say('    --dry-run exit %d, --only exit %d  -> the guard still guards: %s'
        % (a1, a2, a1 == 1 and a2 == 1))

    say('')
    say('(b) + (c) THE PRODUCER PRODUCES, AND THE LOOP CLOSES.')
    say('    Two warm --profile runs of this tree, the table still holed for both, each writing')
    say('    its own dump so max(run2, run3) is a real maximum and not a re-read of one file.')
    runs = []
    for i in (2, 3):
        # NO GATE_PROFILE_OUT: the run must write test/_profile.json, which is the file the
        # printed remedy names. It is copied aside to test/_profile_run<i>.json (gitignored) and
        # the default path is removed, so the tree is clean for the freeze and max(run2, run3) is
        # a real maximum over two dumps rather than a re-read of one.
        if os.path.exists(PROF):
            os.remove(PROF)
        rc, o = run(['test/check_all.py', '--profile'], tag='run %d, must be 0' % i)
        quote(o, ['THE GATE COST TABLE DOES NOT DESCRIBE THE GATE.',
                  'cost table mismatch -- proceeding', 'profile: test/_profile.json', 'GATE: PASS'])
        wrote = os.path.exists(PROF)
        say('      exit %d; wrote test/_profile.json: %s' % (rc, wrote))
        if not wrote:
            raise SystemExit('the producer did not produce -- test/_profile.json missing')
        dest = os.path.join(ROOT, 'test', '_profile_run%d.json' % i)
        shutil.copyfile(PROF, dest)
        os.remove(PROF)
        runs.append((rc, json.load(open(dest, encoding='utf-8')), o))

    say('')
    say('    the mismatch was REPORTED in the profile runs (not silently skipped): %s'
        % all('THE GATE COST TABLE DOES NOT DESCRIBE THE GATE.' in o for _, _, o in runs))
    say('    both profile runs exit 0: %s' % all(rc == 0 for rc, _, _ in runs))
    say('    both profile runs GATE: PASS: %s' % all('GATE: PASS' in o for _, _, o in runs))
    for i, (_, d, _) in enumerate(runs, start=2):
        say('    run %d total wall %.1fs, %d checks profiled'
            % (i, d['total_wall_s'], len(d['checks'])))

    r2 = {c['check']: c['wall_s'] for c in runs[0][1]['checks']}
    r3 = {c['check']: c['wall_s'] for c in runs[1][1]['checks']}
    assert set(r2) == set(r3), 'the two profile runs do not cover the same checks'
    rebuilt = {k: round(max(r2[k], r3[k]), 3) for k in sorted(r2)}
    open(COST, 'w', encoding='utf-8', newline='\n').write(json.dumps(rebuilt, indent=1) + '\n')
    say('')
    say('    wrote max(run2, run3) per check into test/gate_cost.json: %d entries, total %.1fs'
        % (len(rebuilt), sum(rebuilt.values())))
    moved = [(k, table.get(k), rebuilt[k]) for k in rebuilt
             if k not in table or abs(table[k] - rebuilt[k]) >= 0.5]
    for k, was, now in sorted(moved, key=lambda t: -(t[2] - (t[1] or 0)))[:12]:
        say('      %-24s %s -> %.3f' % (k, ('%.3f' % was) if was is not None else 'ABSENT', now))
    c1, o3 = run(['test/check_all.py', '--dry-run'], tag='the loop closes, must be 0')
    say('    --dry-run after the regeneration: exit %d' % c1)
    say('')
    say('VERDICT: guard still guards (a): %s | producer produces (b): %s | '
        'the printed remedy walks end to end (c): %s'
        % (a1 == 1 and a2 == 1, all(rc == 0 for rc, _, _ in runs), c1 == 0))
    if c1 != 0:
        say('    (the loop did NOT close -- the regenerated table is left in place for reading)')
except BaseException as exc:                      # a half-written table is the worst outcome
    open(COST, 'w', encoding='utf-8', newline='').write(snap)
    say('')
    say('ABORTED (%s) -- test/gate_cost.json restored to the committed bytes.' % exc)
    raise
finally:
    open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(LINES) + '\n')
