#!/usr/bin/env python3
"""GUARD: every editable .js module parses (node --check).

Files containing a `@build:include` marker are aggregators (their job is to pull
partials together at build time), not standalone modules — they are not valid
JS on their own, so they are skipped by design.
"""
import os, sys, subprocess
fails, checked, skipped = [], 0, []
for dp, _, fns in os.walk('src'):
    for fn in sorted(fns):
        if not fn.endswith('.js'):
            continue
        p = os.path.join(dp, fn)
        if '@build:include' in open(p, encoding='utf-8', errors='replace').read():
            skipped.append(p.replace('src/', ''))
            continue
        r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
        checked += 1
        if r.returncode != 0:
            fails.append((p.replace('src/', ''), r.stderr.strip().split('\n')[0]))
if fails:
    print('SYNTAX CHECK: FAIL  (%d file(s))' % len(fails))
    for p, e in fails:
        print('  %s  %s' % (p, e))
    sys.exit(1)
print('SYNTAX CHECK: PASS  (%d modules parse; %d aggregator files skipped)'
      % (checked, len(skipped)))
