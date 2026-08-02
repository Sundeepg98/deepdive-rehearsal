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
    add_common(sp)

    sp = sub.add_parser('status', help='show a run (or recent ci-exec runs)')
    sp.add_argument('run_id', nargs='?')

    sp = sub.add_parser('fetch', help='download artifacts + print verdicts')
    sp.add_argument('run_id')

    a = p.parse_args()

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
        cmd = 'python test/ci_shard_gate.py --shard $SHARD/$SHARDS'
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
