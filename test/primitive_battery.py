#!/usr/bin/env python3
"""ACCEPTANCE FOR THE AT-REST PRIMITIVE: does it wait for motion, and still fail real defects?

A stillness guard has exactly two ways to be wrong, and they pull in opposite directions:

  TOO LOOSE -- it returns while the page is still moving, and the check measures an animation
               instead of a control. That is the ~20% false red this wave exists to remove.
  TOO TIGHT -- it waits for a condition that never arrives, or it swallows the measurement, and a
               genuinely broken control sails through green. That failure is far worse, because a
               false red is loud and a false green is silent.

So the battery drives BOTH sides, and neither half is optional:

  SLOW mutants  -- motion is stretched far past the poll interval. The guard must WAIT, and the
                   check must still PASS. (Fixes the too-loose failure.)
  BROKEN mutants -- a genuinely short control and a genuinely low-contrast one. The check must
                   still FAIL. (Proves the fix did not buy its green by going blind.)

Plus a soak: the two checks run solo on a quiet box, N times, rate stated against the ~20%
(18/90) pre-fix baseline.

modes: mutants | soak | all      (soak: --runs N --check touch_floor,cta_contrast)
"""
import json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
OUT = os.path.join('test', '_primitive')
CSS = 'src/styles.css'

# Each mutant is APPENDED to src/styles.css -- an override at the end of the cascade, so it cannot
# perturb specificity anywhere else, and `git checkout` reverts it exactly.
MUTANTS = [
    {'id': 'slow_animation', 'check': 'touch_floor', 'expect': 'PASS',
     'css': '\n/* BATTERY: panelIn stretched to 2.5s. Under the OLD guard ("two agreeing reads")\n'
            '   this is the defect: both samples land on the first keyframe at scale(.96) and the\n'
            '   check measures 42.2 against a 44px floor. The primitive must WAIT instead. */\n'
            '.cram-ov.open .cram-panel{animation-duration:2500ms!important}\n',
     'why': 'motion far slower than the 100ms poll -- the guard must not mistake "not started" '
            'for "at rest"'},

    {'id': 'slow_fade', 'check': 'cta_contrast', 'expect': 'PASS',
     'css': '\n/* BATTERY: a 2.2s fade over the whole app. Glyphs sit well under CORE_ALPHA for\n'
            '   most of it, which is exactly the state that produced "no core glyph pixels". */\n'
            '@keyframes batteryFade{from{opacity:0}to{opacity:1}}\n'
            '.app{animation:batteryFade 2200ms both!important}\n',
     'why': 'paint far slower than the poll -- the alpha arm must wait rather than shoot early'},

    {'id': 'short_control', 'check': 'touch_floor', 'expect': 'FAIL',
     'css': '\n/* BATTERY: a GENUINELY short control. The check must still catch it. */\n'
            '#cramx{width:30px!important;min-width:30px!important;'
            'height:30px!important;min-height:30px!important}\n',
     'why': 'the fix must not have bought its green by ceasing to measure'},

    {'id': 'low_contrast', 'check': 'cta_contrast', 'expect': 'FAIL',
     'css': '\n/* BATTERY: a GENUINELY low-contrast CTA. The check must still catch it. */\n'
            '#mockopen{color:#9a9a9a!important}\n',
     'why': 'ditto, on the pixel side'},
]


def sh(args, timeout=2400):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True,
                          encoding='utf-8', errors='replace', timeout=timeout,
                          env=dict(os.environ, PYTHONIOENCODING='utf-8'))


def build():
    return sh(['npm.cmd' if os.name == 'nt' else 'npm', 'run', 'build'], timeout=1200).returncode == 0


def apply_mutant(m):
    with open(CSS, 'a', encoding='utf-8', newline='\n') as fh:
        fh.write(m['css'])


def revert():
    sh(['git', 'checkout', '--', CSS])
    build()


def run_check(name, tag):
    """One check, alone. Returns (verdict, seconds)."""
    vp = os.path.join(OUT, 'v_%s.json' % tag)
    t0 = time.time()
    r = sh(['python3', 'test/check_all.py', '--only', name, '--verdicts', vp])
    dt = time.time() - t0
    with open(os.path.join(OUT, 'log_%s.txt' % tag), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write((r.stdout or '') + '\n--- stderr ---\n' + (r.stderr or ''))
    try:
        with open(vp, encoding='utf-8') as fh:
            return json.load(fh)['verdicts'].get(name, '(absent)'), dt
    except Exception:
        return '(no verdicts file)', dt


def save(name, obj):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(obj, fh, indent=1)


def load_rows(name):
    p = os.path.join(OUT, name)
    if not os.path.exists(p):
        return []
    try:
        with open(p, encoding='utf-8') as fh:
            v = json.load(fh)
        return v.get('runs', []) if isinstance(v, dict) else (v if isinstance(v, list) else [])
    except Exception:
        return []


def do_mutants():
    res = []
    for m in MUTANTS:
        apply_mutant(m)
        built = build()
        got, dt = run_check(m['check'], 'mut_' + m['id'])
        row = {'id': m['id'], 'check': m['check'], 'expect': m['expect'], 'got': got,
               'ok': got == m['expect'], 'build_ok': built, 'wall_s': round(dt, 1),
               'why': m['why']}
        res.append(row)
        save('mutants.json', res)
        print('  %-15s %-14s expect=%-4s got=%-4s  %s'
              % (m['id'], m['check'], m['expect'], got, 'OK' if row['ok'] else '**WRONG**'))
        revert()
    bad = [r for r in res if not r['ok']]
    print('\nprimitive mutants: %d/%d behaved as required' % (len(res) - len(bad), len(res)))
    return not bad


def do_soak(checks, n):
    """Solo, quiet-box repetition. RESUMABLE -- this environment has killed long runs before."""
    out = {}
    for name in checks:
        runs = load_rows('soak_%s.json' % name)
        while len(runs) < n:
            i = len(runs)
            got, dt = run_check(name, 'soak_%s_%d' % (name, i + 1))
            runs.append({'run': i + 1, 'verdict': got, 'wall_s': round(dt, 1)})
            save('soak_%s.json' % name, runs)
            if got != 'PASS':
                print('    run %d/%d: %s' % (i + 1, n, got))
        red = [r for r in runs if r['verdict'] != 'PASS']
        save('soak_%s.json' % name, {'runs': runs, 'n': len(runs), 'red': len(red),
                                     'rate': round(len(red) / float(len(runs)) * 100, 1)})
        out[name] = (len(red), len(runs))
        print('  %-14s %d/%d red  (%.1f%%)   [pre-fix baseline for touch_floor: 18/90 = 20.0%%]'
              % (name, len(red), len(runs), len(red) / float(len(runs)) * 100))
    return all(r == 0 for r, _ in out.values())


def do_focus(n):
    """Is focus_ring load-sensitive, or was its one fast-only red a rare flake?

    The cold verify measured 1/7 under --fast against 0/52 across serial contexts (Fisher exact
    p = 0.119 -- not significant) and recommended the same 30-run treatment touch_floor got, before
    anyone promotes the fast lane. This is that battery.

    IT DOES NOT RUN 30 FULL GATES. That would be ~5 hours, and the variable under test is not the
    other 72 checks -- it is CONCURRENCY. So each trial runs focus_ring in a 4-worker pool beside
    three heavyweight pool siblings it genuinely competes with in the real gate (render,
    cta_contrast, scoreboard_salience: three browsers, all pool members, ~30-40s each). That
    reproduces the condition the verifier's red appeared under at about a twentieth of the cost.
    Stated plainly here because the difference from "30 full fast gates" is exactly the sort of
    substitution a reader is entitled to judge for themselves.
    """
    LOAD = 'focus_ring,render,cta_contrast,scoreboard_salience'
    runs = load_rows('focus_ring_fast.json')
    while len(runs) < n:
        i = len(runs)
        vp = os.path.join(OUT, 'v_focus_%d.json' % (i + 1))
        t0 = time.time()
        r = sh(['python3', 'test/check_all.py', '--fast', '--jobs', '4',
                '--only', LOAD, '--verdicts', vp])
        dt = time.time() - t0
        try:
            with open(vp, encoding='utf-8') as fh:
                v = json.load(fh)['verdicts']
        except Exception:
            v = {}
        got = v.get('focus_ring', '(absent)')
        if got != 'PASS':
            with open(os.path.join(OUT, 'log_focus_%d.txt' % (i + 1)), 'w',
                      encoding='utf-8', newline='\n') as fh:
                fh.write((r.stdout or '') + '\n--- stderr ---\n' + (r.stderr or ''))
            # PRESERVE THE DUMP IMMEDIATELY. fail_dump is last-run-wins: the next passing run
            # DELETES test/_last_fail_focus_ring.txt. That has now destroyed this exact evidence
            # twice -- once in the cold verify (which could not name the failing assertion) and
            # once in trial 7 here. A battery that reproduces a rare failure and then loses its
            # identity has spent the failure for nothing.
            dump = os.path.join('test', '_last_fail_focus_ring.txt')
            if os.path.exists(dump):
                with open(dump, encoding='utf-8', errors='replace') as src, \
                     open(os.path.join(OUT, 'faildump_focus_%d.txt' % (i + 1)), 'w',
                          encoding='utf-8', newline='\n') as dst:
                    dst.write(src.read())
            print('    run %d/%d: focus_ring %s  (dump preserved)' % (i + 1, n, got))
        runs.append({'run': i + 1, 'focus_ring': got, 'wall_s': round(dt, 1),
                     'others': {k: s for k, s in v.items() if k != 'focus_ring'}})
        save('focus_ring_fast.json', runs)
    red = [r for r in runs if r['focus_ring'] != 'PASS']
    save('focus_ring_fast.json', {'runs': runs, 'n': len(runs), 'red': len(red),
                                  'load': LOAD, 'jobs': 4,
                                  'rate': round(len(red) / float(len(runs)) * 100, 1)})
    print('  focus_ring under --fast --jobs 4 beside 3 pool siblings: %d/%d red (%.1f%%)'
          % (len(red), len(runs), len(red) / float(len(runs)) * 100))
    print('  [cold verify: 1/7 fast vs 0/52 serial, p=0.119 -- unresolved]')
    return len(red) == 0


if __name__ == '__main__':
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
    n = 30
    checks = ['touch_floor', 'cta_contrast']
    for i, a in enumerate(sys.argv):
        if a == '--runs' and i + 1 < len(sys.argv):
            n = int(sys.argv[i + 1])
        if a == '--check' and i + 1 < len(sys.argv):
            checks = [x for x in sys.argv[i + 1].split(',') if x]
    ok = True
    if mode in ('mutants', 'all'):
        print('\n== PRIMITIVE MUTANTS: waits for motion, still fails real defects ==')
        ok &= do_mutants()
    if mode in ('focus', 'all'):
        print('\n== FOCUS_RING under concurrency: %d trials ==' % n)
        ok &= do_focus(n)
    if mode in ('soak', 'all'):
        print('\n== SOAK: %d solo runs each, quiet box ==' % n)
        ok &= do_soak(checks, n)
    print('\nPRIMITIVE BATTERY: %s' % ('PASS' if ok else 'FAIL'))
    sys.exit(0 if ok else 1)
