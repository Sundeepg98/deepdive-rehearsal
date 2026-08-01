#!/usr/bin/env python3
"""ACCEPTANCE FOR THE FAST GATE: does it return the same verdicts as the serial one?

THE CLAIM UNDER TEST is narrow and it is the only one that matters. --fast changes the ORDER and
the CONCURRENCY of the checks and nothing else; therefore, for any tree, it must reach the same
verdict on every check as the serial gate does. A faster gate that disagrees with the slow one
about whether the app is broken is not a faster gate, it is a second opinion nobody asked for.

Three questions, three modes:

  preflight  -- are the planted defects real? Applies each mutant and runs ONLY the check it is
                aimed at. Cheap (no full gate), and it exists because a mutant that fails to
                apply, or applies and changes nothing, would sail through the expensive phases
                below as a green "verdicts matched" -- agreement about a tree that was never
                broken. That is the same failure this repo's own gate header warns about: a test
                whose reference comes from the system under test cannot fail.
  green      -- serial vs fast on the unmodified tree.
  mutants    -- serial vs fast on each planted-broken tree, one per check CLASS.
  stability  -- N repeated --fast runs. Verdict stability, not timing stability: the question is
                whether a check that passes alone can FAIL beside three siblings, and no amount
                of wall-clock data answers it.

Receipts are written incrementally under test/_acceptance/ so a battery that dies at hour three
still leaves behind everything it had proved by hour two.
"""
import json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
OUT = os.path.join('test', '_acceptance')

# ===== THE MUTANTS ============================================================================
# One per check CLASS. Each is a SINGLE surgical edit to real app or build source -- never to a
# check -- because the point is to break the product and watch the gate notice, in both
# configurations, identically.
#
# `find` must occur exactly `n` times or the mutant refuses to apply. A silent no-op mutant is
# the one thing that would make this whole file lie.
MUTANTS = [
    {'id': 'geometry', 'klass': 'browser-geometry', 'want': 'chrome_metrics',
     'file': 'src/styles.css', 'n': 1,
     'find': '.app{flex-direction:column;min-height:0;padding-top:var(--chrome-top);',
     'repl': '.app{flex-direction:column;min-height:0;padding-top:20px;',
     'why': 'the app reserves 20px for a fixed bar that does not measure 20px -- the exact '
            'class chrome_metrics exists to catch (it shipped 5px out in Chromium)'},

    # AIMED BY READING THE COUNTER, NOT BY GUESSING. The first attempt capped bulletsAsProse()
    # and preflight scored it NOT DETECTED: conservation compares scanSource against scanParsed,
    # and scanParsed counts structured fields (walkSteps, drillCards, bankBeats), not loose prose
    # lines. walk.steps.length is on both sides of that comparison, so dropping a step is a
    # conservation failure by construction.
    {'id': 'content', 'klass': 'content', 'want': 'compiler_conservation',
     'file': 'tools/compiler/parse_md.mjs', 'n': 1,
     'find': '      step = { t: title }; steps.push(step);',
     'repl': '      step = { t: title }; if (steps.length < 8) steps.push(step);',
     'why': 'the compiler silently discards the ninth authored walkthrough step -- the exact '
            'shape of the defect that destroyed 608 authored items per build while the gate '
            'reported PASS 19/19'},

    {'id': 'atname', 'klass': 'AT-name', 'want': 'at_name_hygiene',
     'file': 'src/scripts/app/panels.js', 'n': 0,          # 0 = replace every occurrence
     'find': 'class="nsep">, <',
     'repl': 'class="nsep">. <',
     'why': 'the separator becomes a period at every site -- the defect a cold verify proved '
            'could be reintroduced with the gate still green, which is why the check pins ", " '
            'exactly rather than merely "non-whitespace"'},

    {'id': 'vr', 'klass': 'VR', 'want': 'visual_regression',
     'file': 'src/scripts/app/base-styles.js', 'n': 1,
     'find': '*{margin:0;padding:0;box-sizing:border-box}',
     'repl': '*{margin:0;padding:0;box-sizing:border-box}\n'
             '.card{outline:1px solid rgba(255,0,0,.45)}',
     'why': 'paints an outline on every card in all 17 shadow roots. outline does not affect '
            'layout, so this moves PIXELS and almost nothing else -- the VR class in isolation'},

    {'id': 'determinism', 'klass': 'determinism', 'want': 'build_determinism',
     'file': 'tools/compiler/shiki-highlight.mjs', 'n': 1,
     'find': ", theme: 'ddr', tokenizeTimeLimit: 0 }",
     'repl': ", theme: 'ddr' }",
     'why': 'restores Shiki\'s 500ms per-line wall-clock budget -- the bug that made this '
            'build a ~10% coin flip'},

    # ALSO RE-AIMED BY PREFLIGHT. The first attempt inflated the quoted solid count by one, and
    # scored NOT DETECTED for a reason worth recording: judgeQuotedFigures matches
    # /\b(Staff|SDE3|SDE2)\b[^.;]{0,40}?(\d+)\s+of\s+(\d+)/ and the rendered sentence puts a
    # PERIOD between the tier name and its figures ("Staff is the thin rail. 4 solid of 10"), so
    # [^.;] cannot reach across it. That arm is structurally blind to the single-thin-rail
    # sentence. judgeVerdict's own rule is not, so the mutant aims there instead: name a tier
    # that is not on the board at all.
    {'id': 'claims', 'klass': 'claims', 'want': 'home_claims',
     'file': 'src/scripts/app/home-view.js', 'n': 1,
     'find': "      return '<b>' + set[0] + ' is the thin rail.</b> ' + a1.solid + ' solid of ' + a1.n +",
     'repl': "      return '<b>SDE1 is the thin rail.</b> ' + a1.solid + ' solid of ' + a1.n +",
     'why': 'the home names SDE1 the thin rail -- a tier it does not render, so the sentence '
            'accuses a rail that is not on the board. The class three rounds of judgment kept '
            'finding: a claim the record cannot derive'},
]


def sh(args, timeout=2400):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True,
                          encoding='utf-8', errors='replace', timeout=timeout,
                          env=dict(os.environ, PYTHONIOENCODING='utf-8'))


def build():
    # npm is npm.cmd on Windows and CreateProcess cannot launch it by bare name. Naming the real
    # executable keeps this off the shell entirely -- there is no shell=True anywhere in this
    # harness, so nothing here can be persuaded to interpret a metacharacter.
    r = sh(['npm.cmd' if os.name == 'nt' else 'npm', 'run', 'build'], timeout=1200)
    return r.returncode == 0


def apply_mutant(m):
    p = os.path.join(ROOT, m['file'])
    with open(p, encoding='utf-8') as fh:
        src = fh.read()
    hits = src.count(m['find'])
    want = m['n']
    if want and hits != want:
        sys.exit('MUTANT %s: anchor found %d times, expected %d -- REFUSING to apply. A mutant '
                 'that does not land would be scored as agreement about an unbroken tree.'
                 % (m['id'], hits, want))
    if not want and hits < 1:
        sys.exit('MUTANT %s: anchor not found at all -- REFUSING to apply.' % m['id'])
    with open(p, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(src.replace(m['find'], m['repl']))
    return hits


def revert(m=None):
    """Back to HEAD, and REBUILT. Reverting the source without rebuilding would leave a mutated
    deliverable on disk for the next phase to measure."""
    files = [m['file']] if m else [x['file'] for x in MUTANTS]
    sh(['git', 'checkout', '--'] + files)
    build()


def gate(args, tag):
    """One gate run. Returns (verdicts dict, wall seconds, exit code)."""
    vp = os.path.join(OUT, 'verdicts_%s.json' % tag)
    t0 = time.time()
    r = sh(['python3', 'test/check_all.py'] + args + ['--verdicts', vp])
    wall = time.time() - t0
    with open(os.path.join(OUT, 'log_%s.txt' % tag), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write((r.stdout or '') + '\n----- stderr -----\n' + (r.stderr or ''))
    try:
        with open(vp, encoding='utf-8') as fh:
            v = json.load(fh)['verdicts']
    except Exception:
        v = {}
    return v, wall, r.returncode


def diff_verdicts(a, b):
    """Every check on which the two runs disagree. Missing counts as a disagreement."""
    return sorted(n for n in set(a) | set(b) if a.get(n, '(absent)') != b.get(n, '(absent)'))


def save(name, obj):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(obj, fh, indent=1)


def red(v):
    return sorted(n for n, s in v.items() if s == 'FAIL')


# ===== modes ==================================================================================
def do_preflight(fast_args):
    res = []
    for m in MUTANTS:
        hits = apply_mutant(m)
        ok_build = build()
        v, wall, _ = gate(['--only', m['want']], 'pre_' + m['id'])
        got = v.get(m['want'])
        res.append({'id': m['id'], 'klass': m['klass'], 'target': m['want'], 'sites': hits,
                    'build_ok': ok_build, 'target_verdict': got, 'detected': got == 'FAIL',
                    'wall_s': round(wall, 1)})
        print('  %-12s %-18s sites=%-3d build=%-5s %s -> %s' % (
            m['id'], m['want'], hits, ok_build, m['klass'],
            'DETECTED' if got == 'FAIL' else 'NOT DETECTED (%s)' % got))
        revert(m)
    save('preflight.json', res)
    bad = [r for r in res if not r['detected']]
    print('\npreflight: %d/%d mutants detected by their target check' % (len(res) - len(bad), len(res)))
    return not bad


def do_green(fast_args):
    s, sw, sx = gate([], 'green_serial')
    f, fw, fx = gate(fast_args, 'green_fast')
    d = diff_verdicts(s, f)
    save('green.json', {'serial_wall_s': round(sw, 1), 'fast_wall_s': round(fw, 1),
                        'serial_exit': sx, 'fast_exit': fx, 'disagreements': d,
                        'serial_red': red(s), 'fast_red': red(f),
                        'checks': len(s), 'speedup': round(sw / fw, 2) if fw else None})
    print('green: serial %.1fs (%d checks, %d red) | fast %.1fs (%d checks, %d red) | '
          'disagreements: %s' % (sw, len(s), len(red(s)), fw, len(f), len(red(f)), d or 'NONE'))
    return not d


def do_mutants(fast_args):
    res = []
    for m in MUTANTS:
        hits = apply_mutant(m)
        s, sw, _ = gate([], 'mut_%s_serial' % m['id'])
        f, fw, _ = gate(fast_args, 'mut_%s_fast' % m['id'])
        d = diff_verdicts(s, f)
        row = {'id': m['id'], 'klass': m['klass'], 'target': m['want'], 'sites': hits,
               'serial_wall_s': round(sw, 1), 'fast_wall_s': round(fw, 1),
               'serial_red': red(s), 'fast_red': red(f), 'disagreements': d,
               'target_red_serial': s.get(m['want']) == 'FAIL',
               'target_red_fast': f.get(m['want']) == 'FAIL'}
        res.append(row)
        save('mutants.json', res)          # incremental: a battery that dies keeps its receipts
        print('  %-12s serial red=%-2d fast red=%-2d target(%s) s=%s f=%s | disagreements: %s'
              % (m['id'], len(red(s)), len(red(f)), m['want'],
                 row['target_red_serial'], row['target_red_fast'], d or 'NONE'))
        revert(m)
    return all(not r['disagreements'] and r['target_red_serial'] and r['target_red_fast']
               for r in res)


def do_stability(fast_args, n):
    runs = []
    for i in range(n):
        v, w, x = gate(fast_args, 'stab_%d' % (i + 1))
        runs.append({'run': i + 1, 'wall_s': round(w, 1), 'exit': x,
                     'red': red(v), 'verdicts': v})
        save('stability.json', runs)
        print('  run %d/%d: %.1fs exit=%d red=%s' % (i + 1, n, w, x, red(v) or 'none'))
    base = runs[0]['verdicts']
    drift = [{'run': r['run'], 'diff': diff_verdicts(base, r['verdicts'])} for r in runs[1:]]
    unstable = [d for d in drift if d['diff']]
    save('stability.json', {'runs': runs, 'drift': drift,
                            'stable': not unstable, 'n': n})
    print('stability: %d/%d runs identical to run 1%s'
          % (n - len(unstable), n, '' if not unstable else '  UNSTABLE: %s' % unstable))
    return not unstable


if __name__ == '__main__':
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
    jobs = '4'
    for i, a in enumerate(sys.argv):
        if a == '--jobs' and i + 1 < len(sys.argv):
            jobs = sys.argv[i + 1]
    shared = ['--shared-browser'] if '--shared-browser' in sys.argv else []
    FAST = ['--fast', '--jobs', jobs] + shared
    print('acceptance: mode=%s  fast=%s' % (mode, ' '.join(FAST)))
    ok = True
    if mode in ('preflight', 'all'):
        print('\n== PREFLIGHT: are the planted defects real? ==')
        ok &= do_preflight(FAST)
    if mode in ('green', 'all'):
        print('\n== GREEN TREE: serial vs fast ==')
        ok &= do_green(FAST)
    if mode in ('mutants', 'all'):
        print('\n== PLANTED-BROKEN TREES: serial vs fast, one mutant per class ==')
        ok &= do_mutants(FAST)
    if mode in ('stability', 'all'):
        n = 8
        for i, a in enumerate(sys.argv):
            if a == '--runs' and i + 1 < len(sys.argv):
                n = int(sys.argv[i + 1])
        print('\n== STABILITY: %d repeated --fast runs ==' % n)
        ok &= do_stability(FAST, n)
    print('\nACCEPTANCE: %s' % ('PASS' if ok else 'FAIL'))
    sys.exit(0 if ok else 1)
