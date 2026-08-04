"""W-ADDRESSES cycle 8 -- judge item 6: ci.py's check count, pressed.

Cycle 7's thesis was "a cited record has to be able to fail" and it armed test/gate_cost.json
against ORDER. test/ci.py -- the file that DISPATCHES the CI lanes -- still said 76 in three
places while the gate registered 78: the module docstring (which argparse prints as its
description), the lanes paragraph in the same docstring, and the `gate` subparser's help. Same
drift class, same wave, one file over. ci_shard_gate.py was clean because it never types the
number: it extracts ORDER from check_all.py by AST and prints len(order).

THE FIX IS TO STOP TYPING IT. ci.py now formats `{N}` from ci_shard_gate.extract_order() at print
time -- the same extraction the shards are actually cut from -- so the number ci.py advertises and
the number that runs cannot disagree.

THE PRESS. A count that is DERIVED must move when the registry moves; a count that is TYPED
cannot. Both are driven against the same registry change, which is applied to a SCRATCH MIRROR of
check_all.py (ci_shard_gate resolves the registry through a module-level path, so redirecting that
path exercises the whole wiring -- ci.counted -> ci.registered_checks -> extract_order -> the
registry text -- without writing a byte in the worktree).

usage: python3 _audit/w-addresses-cycle8/press_ci_count_c8.py
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses')
SCRATCH = Path(r'C:\Users\Dell\AppData\Local\Temp\claude'
               r'\D--claude-workspace-deepdive-rehearsal'
               r'\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w8')
OUT = ROOT / '_audit' / 'w-addresses-cycle8' / 'press-ci-count.txt'

sys.path.insert(0, str(ROOT / 'test'))
import ci_shard_gate                                                    # noqa: E402
import ci                                                              # noqa: E402

LINES = []


def say(s=''):
    LINES.append(s)
    print(s, flush=True)


def counts():
    """what ci.py would PRINT: the docstring's two sites and the subparser help"""
    doc = ci.counted(ci.__doc__)
    helptext = ci.counted('fast advisory gate: {N} checks sharded')
    sites = re.findall(r'all (\d+|the registered) checks sharded', doc)
    sites += re.findall(r'all (\d+|the registered), advisory', doc)
    sites += re.findall(r'gate: (\d+|the registered) checks sharded', helptext)
    return sites


say('=== W-ADDRESSES cycle 8 -- judge item 6: can ci.py print a wrong check count? ===')
say('')
real = ci_shard_gate.extract_order()
say('THE REGISTRY: check_all.py registers %d checks (AST extraction, ci_shard_gate.extract_order)'
    % len(real))
say('ci.py prints, at its three sites: %s' % counts())
say('')

src = (ROOT / 'test' / 'check_all.py').read_text(encoding='utf-8')
mirror = SCRATCH / '_w8_check_all_plus_one.py'
anchor = "NATIVE_CHECKS = [('ascii_guard', ['python3', 'test/ascii_guard.py']),"
assert src.count(anchor) == 1, 'the NATIVE_CHECKS anchor moved -- press is stale'
mirror.write_text(
    src.replace(anchor, anchor + "\n                  "
                "('_press_ghost_check', ['python3', 'test/ascii_guard.py']),"),
    encoding='utf-8')

held = ci_shard_gate.CHECK_ALL
try:
    ci_shard_gate.CHECK_ALL = mirror
    moved = ci_shard_gate.extract_order()
    say('THE PLANT: one check added to the registry (a scratch mirror, %d checks)' % len(moved))
    say('ci.py now prints, at its three sites:  %s' % counts())
    derived_moved = counts() == [str(len(moved))] * 3
    say('  -> the DERIVED count moved with the registry: %s' % derived_moved)
    say('')
    old = (ROOT / 'test' / 'ci.py')
    import subprocess
    prev = subprocess.run(['git', 'show', 'HEAD:test/ci.py'], cwd=str(ROOT),
                          capture_output=True, text=True, encoding='utf-8').stdout
    typed = re.findall(r'all (\d+) checks sharded', prev) \
        + re.findall(r'all (\d+), advisory', prev) \
        + re.findall(r'gate: (\d+) checks sharded', prev)
    say('THE CONTROL -- the SAME registry change against cycle 7\'s ci.py (git HEAD):')
    say('  its three sites are literals and read %s under BOTH registries -- '
        'they could not move, which is the defect' % typed)
    say('  (the gate registered %d at that commit, so all three were stale by %d)'
        % (len(real), len(real) - int(typed[0]) if typed else 0))
    say('')
    say('VERDICT: derived count tracks the registry: %s | the typed form was inert: %s | '
        'old file: %s -- new file: %s'
        % (derived_moved, len(set(typed)) == 1, typed, counts()))
finally:
    ci_shard_gate.CHECK_ALL = held
    if mirror.exists():
        os.remove(mirror)
    say('')
    say('RESTORED: ci_shard_gate.CHECK_ALL -> %s; ci.py prints %s; the worktree was not written.'
        % (ci_shard_gate.CHECK_ALL.name, counts()))
    OUT.write_text('\n'.join(LINES) + '\n', encoding='utf-8', newline='\n')
