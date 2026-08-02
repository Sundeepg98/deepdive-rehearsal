#!/usr/bin/env python3
"""Agent-facing CI interface -- the userspace side of the kernel/userspace split.

Any agent, any probe, any platform, one command. The YAML kernel (ci-exec.yml)
never changes per-wave; agents push probe scripts on their branch and dispatch
them here. Requires: gh CLI authenticated (it is, on this box).

  python test/ci.py run --cmd "python test/my_probe.py" [--runner windows-latest]
                        [--shards 5] [--ref <branch>] [--install chromium|none|...]
                        [--timeout 30] [--push] [--nowait]
  python test/ci.py gate [--shards 6] [--ref <branch>] [--nowait]
      -> the fast advisory gate: all 76 checks sharded, verdict in ~6-8 min.
         ADVISORY (each shard stamps full_coverage:false by construction);
         the certification stays the local win32 serial gate.
  python test/ci.py status [<run-id>]
  python test/ci.py fetch <run-id>
      -> downloads shard artifacts to _ci_results/<run-id>/ and prints verdicts.

  python test/ci.py warm start [--ttl 45]   -> boot the warm executor (one-time
      ~5 min ritual; it then holds the built world for ttl minutes)
  python test/ci.py warm run --cmd "python test/check_all.py --only touch_floor"
      [--build]  -> execute on the warm pool in SECONDS. Snapshots your exact
      working tree (committed or not, via stash-create) so it tests what you
      have, not what you pushed. --build if your change alters build inputs.
  python test/ci.py warm status | warm stop

Lanes, honestly labeled: local --changed = instant, partial, non-certifying.
warm run = seconds, targeted, non-certifying. gate (sharded cold) = minutes,
all 76, advisory. The local win32 serial gate = the certification.

Discipline: dispatch EARLY (before you need the answer), keep building, consume
at your next natural boundary -- pipelined CI has effectively zero latency.
Block on --wait only when the verdict IS the task.
"""
import argparse
import json
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import NoReturn

REPO = Path(__file__).resolve().parent.parent
WORKFLOW = 'ci-exec.yml'


def sh(args, **kw):
    return subprocess.run(args, capture_output=True, text=True, cwd=str(REPO), **kw)


def die(msg, code=1) -> 'NoReturn':
    print('ci.py: ' + msg, file=sys.stderr)
    raise SystemExit(code)


def current_branch():
    r = sh(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
    return r.stdout.strip() if r.returncode == 0 else 'master'


def ensure_pushed(ref, do_push):
    """A dispatch tests what is on ORIGIN. Warn (or push) if local is ahead."""
    local = sh(['git', 'rev-parse', ref]).stdout.strip()
    remote = sh(['git', 'rev-parse', 'origin/' + ref]).stdout.strip()
    if local and remote and local != remote:
        if do_push:
            r = sh(['git', 'push', 'origin', ref])
            if r.returncode != 0:
                die('--push failed: ' + r.stderr.strip())
            print('pushed %s -> origin' % ref)
        else:
            print('WARNING: local %s != origin/%s -- CI will test the ORIGIN '
                  'state. Pass --push or push first.' % (ref, ref))


def dispatch(cmd, ref, runner, shards, install, timeout, tag=None):
    tag = tag or uuid.uuid4().hex[:10]
    r = sh(['gh', 'workflow', 'run', WORKFLOW,
            '-f', 'tag=' + tag, '-f', 'cmd=' + cmd, '-f', 'ref=' + ref,
            '-f', 'runner=' + runner, '-f', 'shards=' + str(shards),
            '-f', 'install=' + install, '-f', 'timeout_minutes=' + str(timeout)])
    if r.returncode != 0:
        die('dispatch failed: ' + r.stderr.strip())
    # gh workflow run returns nothing; correlate by the tag embedded in run-name.
    for _ in range(30):
        time.sleep(3)
        r = sh(['gh', 'run', 'list', '--workflow=' + WORKFLOW, '--limit', '20',
                '--json', 'databaseId,displayTitle,status'])
        if r.returncode == 0:
            for run in json.loads(r.stdout or '[]'):
                if tag in run.get('displayTitle', ''):
                    return tag, str(run['databaseId'])
    die('dispatched (tag %s) but could not resolve the run id -- '
        'gh run list --workflow=%s' % (tag, WORKFLOW))


def wait(run_id):
    print('waiting on run %s ...' % run_id)
    r = subprocess.run(['gh', 'run', 'watch', run_id, '--exit-status',
                        '--interval', '15'], cwd=str(REPO))
    return r.returncode


def fetch(run_id):
    dest = REPO / '_ci_results' / run_id
    dest.mkdir(parents=True, exist_ok=True)
    r = sh(['gh', 'run', 'download', run_id, '-D', str(dest)])
    if r.returncode != 0:
        print('no artifacts (or download failed): ' + r.stderr.strip())
    results, fails = [], []
    for f in sorted(dest.rglob('result_*.json')):
        d = json.loads(f.read_text())
        results.append(d)
        if d.get('exit', 1) != 0:
            fails.append(d)
    for d in results:
        print('shard %(shard)s: exit %(exit)s in %(seconds)ss' % d)
    if fails:
        print('\n%d FAILING shard(s); logs under %s' % (len(fails), dest))
        for d in fails:
            log = next(iter(dest.rglob('shard_%s.log' % d['shard'])), None)
            if log:
                tail = log.read_text(encoding='utf-8', errors='replace').splitlines()[-15:]
                print('\n--- shard %s tail ---' % d['shard'])
                print('\n'.join(tail))
    elif results:
        print('ALL %d shard(s) green (advisory verdict, not certification).' % len(results))
    return 1 if fails else 0


def warm_snapshot():
    """A commit of the EXACT current working tree, touching nothing."""
    r = sh(['git', 'stash', 'create'])
    sha = r.stdout.strip()
    if sha:
        return sha
    return sh(['git', 'rev-parse', 'HEAD']).stdout.strip()


def warm_run(cmd, build):
    job_id = uuid.uuid4().hex[:8]
    snap = warm_snapshot()
    payload = json.dumps({'cmd': cmd, 'build': bool(build)})
    tree = sh(['git', 'rev-parse', snap + '^{tree}']).stdout.strip()
    r = sh(['git', 'commit-tree', tree, '-p', snap, '-m', payload])
    if r.returncode != 0:
        die('commit-tree failed: ' + r.stderr.strip())
    job_sha = r.stdout.strip()
    t0 = time.time()
    if sh(['git', 'push', '--quiet', 'origin',
           '%s:refs/ci-jobs/%s' % (job_sha, job_id)]).returncode != 0:
        die('could not push the job ref')
    print('job %s submitted (tree %s) -- polling for the result...'
          % (job_id, snap[:9]))
    result_ref = 'refs/ci-results/' + job_id
    for _ in range(150):
        time.sleep(2)
        r = sh(['git', 'ls-remote', 'origin', result_ref])
        if r.stdout.strip():
            res_sha = r.stdout.split()[0]
            sh(['git', 'fetch', '--quiet', 'origin', res_sha])
            meta = json.loads(sh(['git', 'log', '-1', '--format=%B',
                                  res_sha]).stdout.strip())
            log = sh(['git', 'show', res_sha + ':out.log']).stdout
            sh(['git', 'push', '--quiet', 'origin', ':' + result_ref])
            dt = time.time() - t0
            print('--- result (round-trip %.1fs; execution %ss) ---'
                  % (dt, meta.get('seconds')))
            tail = log.splitlines()[-25:]
            print('\n'.join(tail))
            sys.exit(meta.get('exit', 1))
    # Leave the job ref for a future executor; tell the human what happened.
    die('no result after 300s -- is the pool running? (ci.py warm status; '
        'ci.py warm start if not)')


def warm(a):
    if a.warm_op == 'start':
        r = sh(['gh', 'workflow', 'run', 'warm-pool.yml',
                '-f', 'ttl_minutes=' + str(a.ttl)])
        if r.returncode != 0:
            die('start failed: ' + r.stderr.strip())
        print('warm pool starting (ttl %dm) -- the one-time ritual takes '
              '~5 min; warm runs are seconds after that.' % a.ttl)
    elif a.warm_op == 'run':
        warm_run(a.cmd, a.build)
    elif a.warm_op == 'status':
        subprocess.run(['gh', 'run', 'list', '--workflow=warm-pool.yml',
                        '--limit', '3'], cwd=str(REPO))
        r = sh(['git', 'ls-remote', 'origin', 'refs/ci-jobs/*'])
        n = len([l for l in r.stdout.splitlines() if l.strip()])
        print('queued jobs: %d' % n)
    elif a.warm_op == 'stop':
        head = sh(['git', 'rev-parse', 'HEAD']).stdout.strip()
        sh(['git', 'push', '--quiet', 'origin',
            '%s:refs/ci-control/stop' % head])
        print('stop signal pushed; the executor exits on its next poll.')


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='op', required=True)

    def add_common(sp):
        sp.add_argument('--ref')
        sp.add_argument('--runner', default='ubuntu-latest',
                        choices=['ubuntu-latest', 'windows-latest', 'macos-latest'])
        sp.add_argument('--shards', type=int, default=1)
        sp.add_argument('--install', default='chromium',
                        choices=['chromium', 'firefox', 'webkit', 'all', 'none'])
        sp.add_argument('--timeout', type=int, default=30)
        sp.add_argument('--push', action='store_true')
        sp.add_argument('--nowait', action='store_true')

    sp = sub.add_parser('run', help='run an arbitrary command on CI')
    sp.add_argument('--cmd', required=True)
    add_common(sp)

    sp = sub.add_parser('gate', help='fast advisory gate: 76 checks sharded')
    sp.add_argument('--except', dest='except_', default=None,
                    help='comma list of checks to drop (windows auto-drops '
                         'visual_regression; pass --except "" to override)')
    add_common(sp)

    sp = sub.add_parser('status', help='show a run (or recent ci-exec runs)')
    sp.add_argument('run_id', nargs='?')

    sp = sub.add_parser('fetch', help='download artifacts + print verdicts')
    sp.add_argument('run_id')

    sp = sub.add_parser('warm', help='the sub-minute lane: a runner held warm')
    wsub = sp.add_subparsers(dest='warm_op', required=True)
    w = wsub.add_parser('start')
    w.add_argument('--ttl', type=int, default=45)
    w = wsub.add_parser('run')
    w.add_argument('--cmd', required=True)
    w.add_argument('--build', action='store_true',
                   help='rebuild on the pool first (your change touches build inputs)')
    wsub.add_parser('status')
    wsub.add_parser('stop')

    a = p.parse_args()

    if a.op == 'warm':
        warm(a)
        return

    if a.op == 'status':
        args = ['gh', 'run', 'view', a.run_id] if a.run_id else \
               ['gh', 'run', 'list', '--workflow=' + WORKFLOW, '--limit', '10']
        sys.exit(subprocess.run(args, cwd=str(REPO)).returncode)

    if a.op == 'fetch':
        sys.exit(fetch(a.run_id))

    ref = a.ref or current_branch()
    ensure_pushed(ref, a.push)

    if a.op == 'gate':
        shards = a.shards if a.shards > 1 else 6
        excepts = a.except_
        if excepts is None and a.runner == 'windows-latest':
            excepts = 'visual_regression'
            print('windows gate: auto-excluding visual_regression (the runner '
                  'rasterizes differently from the win32 capture box; '
                  'pass --except "" to force it)')
        cmd = ('python test/ci_shard_gate.py --shard $SHARD/$SHARDS'
               + (' --except ' + excepts if excepts else ''))
    else:
        shards, cmd = a.shards, a.cmd

    tag, run_id = dispatch(cmd, ref, a.runner, shards, a.install, a.timeout)
    print('dispatched: tag %s  run %s  (%s x%d on %s)' %
          (tag, run_id, ref, shards, a.runner))
    print('  follow:  gh run watch %s' % run_id)
    print('  fetch:   python test/ci.py fetch %s' % run_id)
    if a.nowait:
        return
    code = wait(run_id)
    fetch(run_id)
    sys.exit(code)


if __name__ == '__main__':
    main()
