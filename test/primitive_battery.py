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

    # ===== ADOPTED FROM THE COLD VERIFY, verbatim. Both drive branches this battery never did. ====
    {'id': 'slow_transition', 'check': 'touch_floor', 'expect': 'PASS',
     'css': '\n/* GR-VERIFIER: .scrolltop reveal TRANSITION stretched to 3s (a CSSTransition, not a\n'
            '   CSSAnimation -- the branch the builder battery never drives). At rest-hidden the FAB\n'
            '   is scale(.9) = 39.6 against a 44px floor: the original documented mis-measurement.\n'
            '   The primitive must WAIT for the transition rather than sample it early. */\n'
            '.scrolltop{transition:opacity 3000ms linear,transform 3000ms linear,'
            'visibility 0s linear var(--vis-delay)!important}\n',
     'why': 'transitions are a different getAnimations() subclass from animations -- both of this '
            'battery\'s original SLOW mutants stretch a @keyframes animation, so the CSSTransition '
            'branch was unproven until the cold verify wrote this'},

    # THE REGRESSION PROOF FOR THE PAUSED HOLE. The verifier set no expectation here, correctly:
    # against the shipped predicate it produced a 30s timeout whose diagnostic said
    # `still moving: {"alpha":0,"still":true,"moving":null}` -- blank, and WRONG (still:true while a
    # 44px control measured 42.3px). The expectation is derived now that `paused` blocks.
    #
    # IT STILL FAILS, AND THAT IS THE CORRECT ANSWER. A permanently paused animation means the page
    # never comes to rest, so there is nothing honest to measure and the check must say so. What the
    # fix changes is WHICH failure: a blank timeout that hid a false at-rest reading becomes a
    # timeout that NAMES the paused animation. So the verdict alone cannot prove the fix -- the
    # message is the assertion, which is why this mutant carries `expect_msg`.
    {'id': 'paused_animation', 'check': 'touch_floor', 'expect': 'FAIL', 'expect_msg': '[paused]',
     'css': '\n/* GR-VERIFIER: panelIn frozen with the app\'s own idiom (styles.css:1482 applies\n'
            '   animation-play-state:paused to body.is-hidden and every descendant). A paused\n'
            '   animation parks its element mid-transform indefinitely -- a 44px control reads\n'
            '   42.3px -- and the rAF chain-compare is blind to it, because a paused transform is\n'
            '   identical across frames. */\n'
            '.cram-ov.open .cram-panel{animation-play-state:paused!important}\n',
     'why': 'the paused branch of the playState filter -- the 42.2 defect through a different door, '
            'and the one door the refuted identity predicate would have closed'},
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
    """One check, alone. Returns (verdict, seconds, dump_text).

    The dump is PRESERVED here, not read later: fail_dump is last-run-wins, so the next passing
    run deletes test/_last_fail_<name>.txt. That has now destroyed evidence four times across this
    campaign (twice in the gate-runtime verify, once at trial 7 of the focus battery, once in the
    verifier's own soak). Any battery that asserts on a FAILURE MESSAGE has to capture it in the
    same breath as the verdict."""
    vp = os.path.join(OUT, 'v_%s.json' % tag)
    t0 = time.time()
    r = sh(['python3', 'test/check_all.py', '--only', name, '--verdicts', vp])
    dt = time.time() - t0
    with open(os.path.join(OUT, 'log_%s.txt' % tag), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write((r.stdout or '') + '\n--- stderr ---\n' + (r.stderr or ''))
    dump = ''
    p = os.path.join('test', '_last_fail_%s.txt' % name)
    if os.path.exists(p):
        with open(p, encoding='utf-8', errors='replace') as fh:
            dump = fh.read()
        with open(os.path.join(OUT, 'faildump_%s.txt' % tag), 'w',
                  encoding='utf-8', newline='\n') as fh:
            fh.write(dump)
    try:
        with open(vp, encoding='utf-8') as fh:
            return json.load(fh)['verdicts'].get(name, '(absent)'), dt, dump
    except Exception:
        return '(no verdicts file)', dt, dump


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
        got, dt, dump = run_check(m['check'], 'mut_' + m['id'])
        want_msg = m.get('expect_msg')
        msg_ok = (want_msg is None) or (want_msg in dump)
        row = {'id': m['id'], 'check': m['check'], 'expect': m['expect'], 'got': got,
               'expect_msg': want_msg, 'msg_ok': msg_ok,
               'ok': got == m['expect'] and msg_ok, 'build_ok': built, 'wall_s': round(dt, 1),
               'why': m['why']}
        res.append(row)
        save('mutants.json', res)
        print('  %-16s %-13s expect=%-4s got=%-4s%s  %s'
              % (m['id'], m['check'], m['expect'], got,
                 ('' if want_msg is None else ('  msg[%s]=%s' % (want_msg, 'YES' if msg_ok else 'NO'))),
                 'OK' if row['ok'] else '**WRONG**'))
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
            got, dt, _dump = run_check(name, 'soak_%s_%d' % (name, i + 1))
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

    The cold verify measured 1/7 under --fast against 0/52 serial and recommended the 30-run
    treatment touch_floor got. This is that battery. It does NOT run 30 full gates (~5 hours): the
    variable under test is CONCURRENCY, not the rest of the registry, so each trial runs focus_ring
    alongside three heavyweight browser siblings it competes with in the real gate.

    ===== WHY THIS NO LONGER GOES THROUGH `--fast`, AND WHY THAT IS THE POINT =====
    The first version drove `check_all.py --fast --jobs 4 --only focus_ring,render,...` and let the
    lane logic provide the concurrency. THE SAME COMMIT THAT WROTE IT MOVED focus_ring INTO
    SERIAL_TAIL, and run_fast routes tail members out of the pool -- so on the shipped tree
    focus_ring ran ALONE, after the other three. The cold verify measured the tell: adding it to
    the command cost +9s and +12s, its full solo runtime, instead of the ~0s a spare worker would
    cost. Two consequences, both fatal to the battery's claim: the 1/30 receipt was no longer
    re-derivable from the shipped code, and any future re-run would report a meaningless 0/N while
    its docstring said "concurrency". A harness that cannot fail.

    So the trial now spawns the four checks as parallel subprocesses ITSELF, and ASSERTS they
    actually overlapped. That is both more faithful (concurrency is guaranteed, not hoped for) and
    self-proving: `overlap_s` is recorded per trial, and a trial whose overlap is zero is reported
    as INVALID rather than counted. The battery measures what it claims, or it says it didn't.
    """
    from concurrent.futures import ThreadPoolExecutor
    SUBJECT = 'focus_ring'
    LOAD = ['render', 'cta_contrast', 'scoreboard_salience']
    ALL = [SUBJECT] + LOAD

    def one(name, tag):
        vp = os.path.join(OUT, 'v_%s_%s.json' % (tag, name))
        t0 = time.time()
        r = sh(['python3', 'test/check_all.py', '--only', name, '--verdicts', vp])
        t1 = time.time()
        try:
            with open(vp, encoding='utf-8') as fh:
                v = json.load(fh)['verdicts'].get(name, '(absent)')
        except Exception:
            v = '(no verdicts file)'
        return {'name': name, 'verdict': v, 'start': t0, 'end': t1, 'r': r}

    runs = load_rows('focus_ring_fast.json')
    while len(runs) < n:
        i = len(runs)
        tag = 'focus_%d' % (i + 1)
        t0 = time.time()
        with ThreadPoolExecutor(max_workers=len(ALL)) as ex:
            got = list(ex.map(lambda nm: one(nm, tag), ALL))
        dt = time.time() - t0
        by = {g['name']: g for g in got}
        subj = by[SUBJECT]
        # PROOF OF CONCURRENCY: how long the subject's window overlapped each sibling's.
        overlaps = {}
        for nm in LOAD:
            o = min(subj['end'], by[nm]['end']) - max(subj['start'], by[nm]['start'])
            overlaps[nm] = round(max(0.0, o), 1)
        concurrent_s = round(max(overlaps.values()) if overlaps else 0.0, 1)
        valid = concurrent_s > 0
        verdict = subj['verdict']
        if verdict != 'PASS':
            with open(os.path.join(OUT, 'log_%s.txt' % tag), 'w',
                      encoding='utf-8', newline='\n') as fh:
                fh.write((subj['r'].stdout or '') + '\n--- stderr ---\n' + (subj['r'].stderr or ''))
            # fail_dump is last-run-wins; capture before any sibling's next run erases it.
            p = os.path.join('test', '_last_fail_%s.txt' % SUBJECT)
            if os.path.exists(p):
                with open(p, encoding='utf-8', errors='replace') as src, \
                     open(os.path.join(OUT, 'faildump_%s.txt' % tag), 'w',
                          encoding='utf-8', newline='\n') as dst:
                    dst.write(src.read())
            print('    trial %d/%d: %s %s  (dump preserved)' % (i + 1, n, SUBJECT, verdict))
        if not valid:
            print('    trial %d/%d: INVALID -- no overlap, nothing concurrent was measured'
                  % (i + 1, n))
        runs.append({'run': i + 1, 'focus_ring': verdict, 'wall_s': round(dt, 1),
                     'overlap_s': overlaps, 'concurrent_s': concurrent_s, 'valid': valid,
                     'others': {nm: by[nm]['verdict'] for nm in LOAD}})
        save('focus_ring_fast.json', runs)

    good = [r for r in runs if r.get('valid')]
    red = [r for r in good if r['focus_ring'] != 'PASS']
    save('focus_ring_fast.json',
         {'runs': runs, 'n': len(runs), 'valid_n': len(good), 'red': len(red),
          'subject': SUBJECT, 'load': LOAD, 'method': 'parallel subprocesses, overlap asserted',
          'rate': round(len(red) / float(len(good)) * 100, 1) if good else None})
    print('  %s run CONCURRENTLY with %s: %d/%d red (%.1f%%)   [%d trial(s) invalid, excluded]'
          % (SUBJECT, '+'.join(LOAD), len(red), len(good),
             (len(red) / float(len(good)) * 100) if good else 0.0, len(runs) - len(good)))
    print('  [prior: cold verify 1/7 under --fast; this wave 1/30 via the old --fast harness]')
    return len(red) == 0 and len(good) == len(runs)


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
