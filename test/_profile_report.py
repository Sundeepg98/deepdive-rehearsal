#!/usr/bin/env python3
"""Generate _audit/2026-08-01-gate-profile.md from the raw --profile dumps.

The prose in that document is written by hand; every NUMBER in it is written by this script.
A profile whose figures are retyped is a profile that drifts from its own evidence the first
time a run is repeated, and this wave exists to replace estimates with measurement.

usage: python3 test/_profile_report.py run1.json run2.json run3.json out.md
"""
import json, sys

def load(p):
    with open(p, encoding='utf-8') as fh:
        return json.load(fh)

def main(p1, p2, p3, out):
    r1, r2, r3 = load(p1), load(p2), load(p3)
    i1 = {c['check']: c for c in r1['checks']}
    i2 = {c['check']: c for c in r2['checks']}
    i3 = {c['check']: c for c in r3['checks']}
    names = [c['check'] for c in r1['checks']]

    eng = lambda x: ((x.get('launch_ms') or 0) + (x.get('context_ms') or 0)) / 1000.0
    t1, t2, t3 = r1['total_wall_s'], r2['total_wall_s'], r3['total_wall_s']

    L = []
    W = L.append

    # ---- totals ----------------------------------------------------------------------------
    nat1 = sum(i1[n]['wall_s'] for n in names if not i1[n]['browser'])
    nat2 = sum(i2[n]['wall_s'] for n in names if not i2[n]['browser'])
    nat3 = sum(i3[n]['wall_s'] for n in names if not i3[n]['browser'])
    br1 = t1 - nat1
    br2 = t2 - nat2
    br3 = t3 - nat3
    engine = sum(eng(i3[n]) for n in names)
    runtime = sum((i3[n].get('runtime_boot_ms') or 0) for n in names if i3[n].get('launches')) / 1000.0
    launches = sum((i3[n].get('launches') or 0) for n in names)
    ctxs = sum((i3[n].get('contexts') or 0) for n in names)
    pages = sum((i3[n].get('pages') or 0) for n in names)

    W('| run | when | total wall | native | browser |')
    W('|-----|------|-----------:|-------:|--------:|')
    for lbl, r, nt, bt in (('run 1 (COLD tree)', t1, nat1, br1),
                           ('run 2 (warm)', t2, nat2, br2),
                           ('run 3 (warm)', t3, nat3, br3)):
        W('| %s | | %.1f s (%.2f min) | %.1f s | %.1f s |' % (lbl, r, r / 60.0, nt, bt))
    W('')
    W('### Where the time is NOT going')
    W('')
    W('| | seconds | share of run 3 |')
    W('|-|--------:|---------------:|')
    W('| engine boot -- every `chromium.launch()` + `newContext()` summed | %.1f | **%.1f%%** |'
      % (engine, engine / t3 * 100))
    W('| node boot + `require(\'playwright\')` before the first launch | %.1f | %.1f%% |'
      % (runtime, runtime / t3 * 100))
    W('| everything else -- navigating and asserting | %.1f | **%.1f%%** |'
      % (t3 - engine - runtime, (t3 - engine - runtime) / t3 * 100))
    W('')
    W('Census for one whole gate run: **%d** `chromium.launch()` calls, %d browser contexts, '
      '%d pages.' % (launches, ctxs, pages))
    W('')

    # ---- ranked table ----------------------------------------------------------------------
    rows = sorted(names, key=lambda n: -max(i2[n]['wall_s'], i3[n]['wall_s']))
    W('## Ranked cost table')
    W('')
    W('Sorted by the warm cost actually used to pack the parallel lanes '
      '(`test/gate_cost.json` = max of runs 2 and 3).')
    W('')
    W('| # | check | run1 (cold) | run2 | run3 | kind | launches | ctx | pages | engine s |')
    W('|---|-------|------------:|-----:|-----:|------|---------:|----:|------:|---------:|')
    for k, n in enumerate(rows, 1):
        W('| %d | `%s` | %.2f | %.2f | %.2f | %s | %s | %s | %s | %s |' % (
            k, n, i1[n]['wall_s'], i2[n]['wall_s'], i3[n]['wall_s'],
            'browser' if i3[n]['browser'] else 'native',
            i3[n].get('launches') if i3[n].get('launches') is not None else '-',
            i3[n].get('contexts') if i3[n].get('contexts') is not None else '-',
            i3[n].get('pages') if i3[n].get('pages') is not None else '-',
            ('%.2f' % eng(i3[n])) if i3[n].get('launches') else '-'))
    W('')

    # ---- the cold/warm confound -------------------------------------------------------------
    W('## Appendix: the cold/warm confound, stated in full')
    W('')
    W('Biggest movers, run 1 -> run 2:')
    W('')
    W('| check | run1 | run2 | delta | kind |')
    W('|-------|-----:|-----:|------:|------|')
    mv = sorted(names, key=lambda n: i2[n]['wall_s'] - i1[n]['wall_s'])
    for n in mv[:6] + mv[-6:]:
        W('| `%s` | %.2f | %.2f | %+.2f | %s |' % (
            n, i1[n]['wall_s'], i2[n]['wall_s'], i2[n]['wall_s'] - i1[n]['wall_s'],
            'browser' if i1[n]['browser'] else 'native'))
    W('')
    W('Aggregate: native **%+.1f s**, browser **%+.1f s**.' % (nat2 - nat1, br2 - br1))
    W('')

    with open(out, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(L) + '\n')
    print('wrote %s' % out)

if __name__ == '__main__':
    main(*sys.argv[1:5])
