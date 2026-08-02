#!/usr/bin/env python3
"""Run one shard of THE GATE -- for CI fan-out. ADVISORY BY CONSTRUCTION.

Usage: python test/ci_shard_gate.py --shard 3/6

Computes the round-robin slice ORDER[i-1::N] of the full check registry and
execs `check_all.py --only <slice>`. Round-robin interleaves the cheap native
checks with the expensive browser checks, so shard wall-clocks stay balanced.

This wrapper NEVER touches the certification path: `--only` runs stamp
`full_coverage: false` inside check_all.py itself, so even all six shards
passing is, per process, an advisory verdict -- the certification remains the
local win32 serial gate. The registry is extracted from check_all.py via AST
(never imported: importing check_all executes its argv parsing at module
level; never regexed: a span-regex over-captured neighbouring literals). If
the assignment shape ever drifts, the sanity checks fail loudly instead of
silently running a subset.
"""
import ast
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CHECK_ALL = REPO / 'test' / 'check_all.py'


def extract_order():
    """ORDER exactly as check_all.py builds it: native names then browser names."""
    tree = ast.parse(CHECK_ALL.read_text(encoding='utf-8'))
    lists = {}
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id in ('NATIVE_CHECKS', 'BROWSER_CHECKS'):
                    lists[t.id] = [entry[0] for entry in ast.literal_eval(node.value)]
    if set(lists) != {'NATIVE_CHECKS', 'BROWSER_CHECKS'}:
        sys.exit('registry extraction broke: found %s -- check_all.py assignment '
                 'shape changed; update ci_shard_gate.py' % sorted(lists))
    return lists['NATIVE_CHECKS'] + lists['BROWSER_CHECKS']


def main():
    if len(sys.argv) != 3 or sys.argv[1] != '--shard' or '/' not in sys.argv[2]:
        sys.exit('usage: ci_shard_gate.py --shard i/N   (e.g. --shard 3/6)')
    i, n = (int(x) for x in sys.argv[2].split('/'))
    if not (1 <= i <= n):
        sys.exit('--shard: need 1 <= i <= N, got %d/%d' % (i, n))

    order = extract_order()
    if (len(order) < 60 or len(order) != len(set(order))
            or 'render' not in order or 'ascii_guard' not in order):
        sys.exit('registry extraction broke (%d names, %d unique) -- check_all.py '
                 'changed shape; update ci_shard_gate.py'
                 % (len(order), len(set(order))))

    mine = order[i - 1::n]
    print('=== GATE SHARD %d/%d: %d of %d checks (advisory; full_coverage '
          'stamps false by design) ===' % (i, n, len(mine), len(order)))
    print('    ' + ','.join(mine))
    sys.stdout.flush()

    # Serial-gate world parity: in the full ORDER, build_integrity's fresh
    # `npm run build` materializes src/topics/_generated/** for every later
    # check. A shard that did not draw build_integrity starves without this
    # (first sharded run: numbers_lattice and bank_novelty red on exactly the
    # shards without it). The build is deterministic, so this is idempotent.
    print('=== materializing build outputs (npm run build) ===')
    sys.stdout.flush()
    npm = shutil.which('npm')
    if not npm:
        sys.exit('npm not on PATH -- shard cannot materialize the generated corpus')
    rc = subprocess.call([npm, 'run', 'build'], cwd=str(REPO))
    if rc != 0:
        sys.exit('npm run build failed (%d) -- shard cannot materialize '
                 'the generated corpus' % rc)
    code = subprocess.call(
        [sys.executable, str(CHECK_ALL), '--only', ','.join(mine)], cwd=str(REPO))
    sys.exit(code)


if __name__ == '__main__':
    main()
