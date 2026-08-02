#!/usr/bin/env python3
"""Run one shard of THE GATE -- for CI fan-out. ADVISORY BY CONSTRUCTION.

Usage: python test/ci_shard_gate.py --shard 3/6 [--except visual_regression]

Computes the round-robin slice ORDER[i-1::N] of the full check registry and
execs `check_all.py --only <slice>`. Round-robin interleaves the cheap native
checks with the expensive browser checks, so shard wall-clocks stay balanced.
--except drops named checks from the pool first -- the CI windows legs use it
for visual_regression, whose win32 baselines legitimately RUN there (platform
key matches the capture box) but measure the runner's rasterization delta
(~0.22% on home-light, run 30733xxx), a permanent red that carries no
information. The exclusion is self-labeling: any --only run stamps
full_coverage:false inside check_all.py.

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
    usage = 'usage: ci_shard_gate.py --shard i/N [--except a,b]   (e.g. --shard 3/6)'
    shard_arg, excludes = None, []
    args = sys.argv[1:]
    k = 0
    while k < len(args):
        if args[k] == '--shard' and k + 1 < len(args):
            shard_arg = args[k + 1]
            k += 2
        elif args[k] == '--except' and k + 1 < len(args):
            excludes = [x for x in args[k + 1].split(',') if x]
            k += 2
        else:
            sys.exit(usage)
    if not shard_arg or '/' not in shard_arg:
        sys.exit(usage)
    i, n = (int(x) for x in shard_arg.split('/'))
    if not (1 <= i <= n):
        sys.exit('--shard: need 1 <= i <= N, got %d/%d' % (i, n))

    order = extract_order()
    if (len(order) < 60 or len(order) != len(set(order))
            or 'render' not in order or 'ascii_guard' not in order):
        sys.exit('registry extraction broke (%d names, %d unique) -- check_all.py '
                 'changed shape; update ci_shard_gate.py'
                 % (len(order), len(set(order))))
    unknown = [x for x in excludes if x not in order]
    if unknown:
        sys.exit('--except: no such check: %s' % ', '.join(unknown))

    pool = [c for c in order if c not in excludes]
    mine = pool[i - 1::n]
    print('=== GATE SHARD %d/%d: %d of %d checks%s (advisory; full_coverage '
          'stamps false by design) ==='
          % (i, n, len(mine), len(order),
             ' [minus %s]' % ','.join(excludes) if excludes else ''))
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
