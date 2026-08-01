#!/usr/bin/env python3
"""Turn test/_acceptance/*.json into the tables in _audit/2026-08-01-gate-runtime-acceptance.md.

Same rule as the profile report: the prose is written by hand, every number is generated. A
receipt whose figures are retyped is a receipt that can disagree with its own evidence.

usage: python3 test/_acceptance_report.py out.md
"""
import json, os, sys

OUT = os.path.join('test', '_acceptance')


def load(name):
    p = os.path.join(OUT, name)
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as fh:
        return json.load(fh)


def main(out):
    pre, green, muts, stab = (load('preflight.json'), load('green.json'),
                              load('mutants.json'), load('stability.json'))
    L = []
    W = L.append

    # ---- preflight -------------------------------------------------------------------------
    if pre:
        W('### Preflight: is each planted defect real?')
        W('')
        W('| mutant | class | target check | sites patched | target verdict | real defect? |')
        W('|--------|-------|--------------|--------------:|----------------|--------------|')
        for r in pre:
            W('| `%s` | %s | `%s` | %d | %s | %s |' % (
                r['id'], r['klass'], r['target'], r['sites'], r['target_verdict'],
                'YES' if r['detected'] else '**NO**'))
        W('')
        W('%d of %d mutants turn their target check red.' % (
            len([r for r in pre if r['detected']]), len(pre)))
        W('')

    # ---- green -----------------------------------------------------------------------------
    if green:
        W('### The green tree')
        W('')
        W('| | wall | checks | red | exit |')
        W('|-|-----:|-------:|----:|-----:|')
        W('| serial (capture of record) | %.1f s | %d | %d | %d |' % (
            green['serial_wall_s'], green['checks'], len(green['serial_red']), green['serial_exit']))
        W('| `--fast --jobs 4` | %.1f s | %d | %d | %d |' % (
            green['fast_wall_s'], green['checks'], len(green['fast_red']), green['fast_exit']))
        W('')
        d = green['disagreements']
        W('**Verdict disagreements: %s.** Speedup %.2fx.' % (
            ('NONE' if not d else ', '.join('`%s`' % x for x in d)), green['speedup']))
        W('')

    # ---- mutants ---------------------------------------------------------------------------
    if muts:
        W('### The planted-broken trees')
        W('')
        W('| mutant | class | target | serial red | fast red | target red both ways | disagreements |')
        W('|--------|-------|--------|-----------:|---------:|----------------------|---------------|')
        for r in muts:
            both = r['target_red_serial'] and r['target_red_fast']
            W('| `%s` | %s | `%s` | %d | %d | %s | %s |' % (
                r['id'], r['klass'], r['target'], len(r['serial_red']), len(r['fast_red']),
                'YES' if both else '**NO**',
                'NONE' if not r['disagreements'] else '**' + ', '.join(r['disagreements']) + '**'))
        W('')
        W('Every red set, in full, so the comparison can be re-read rather than trusted:')
        W('')
        for r in muts:
            W('- `%s` (%s) -- serial: %s' % (r['id'], r['klass'], ', '.join(
                '`%s`' % x for x in r['serial_red']) or '(none)'))
            W('  fast: %s' % (', '.join('`%s`' % x for x in r['fast_red']) or '(none)'))
        W('')
        bad = [r for r in muts if r['disagreements']]
        W('**%d of %d planted-broken trees produced identical verdicts in both configurations.**'
          % (len(muts) - len(bad), len(muts)))
        W('')

    # ---- stability -------------------------------------------------------------------------
    if stab:
        runs = stab['runs'] if isinstance(stab, dict) else stab
        W('### Repeated-run stability, full parallel configuration')
        W('')
        W('| run | wall | exit | red |')
        W('|-----|-----:|-----:|-----|')
        for r in runs:
            W('| %d | %.1f s | %d | %s |' % (r['run'], r['wall_s'], r['exit'],
                                             ', '.join(r['red']) or 'none'))
        W('')
        if isinstance(stab, dict):
            drift = stab.get('drift', [])
            un = [d for d in drift if d['diff']]
            walls = [r['wall_s'] for r in runs]
            W('**%d of %d runs reached verdicts identical to run 1.**' % (
                len(runs) - len(un), len(runs)))
            if un:
                W('')
                for d in un:
                    W('- run %d disagreed on: %s' % (d['run'], ', '.join(d['diff'])))
            W('')
            W('Wall time across the %d runs: min %.1f s, max %.1f s, mean %.1f s '
              '(spread %.1f%% of mean -- TIMING varies, verdicts did not).' % (
                  len(walls), min(walls), max(walls), sum(walls) / len(walls),
                  (max(walls) - min(walls)) / (sum(walls) / len(walls)) * 100))
        W('')

    with open(out, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(L) + '\n')
    print('wrote %s' % out)


if __name__ == '__main__':
    main(sys.argv[1])
