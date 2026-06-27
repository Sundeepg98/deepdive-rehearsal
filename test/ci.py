#!/usr/bin/env python3
"""
CI/CD Pipeline — 100% End-to-End Testing (ALL suites run in parallel)
Runs 3 suites simultaneously via multiprocessing:
  1. Parallel Test Runner (133 tests, 100% parallel)
  2. Production E2E Suite (42 tests)
  3. Comprehensive E2E Suite (146 tests)
Total: 321 tests

Usage:
  python3 test/ci.py              # Run all suites in parallel
  python3 test/ci.py --parallel   # Only parallel suite
  python3 test/ci.py --quick      # Fast tests only
  python3 test/ci.py --build      # Test + build
  python3 test/ci.py --deploy     # Test + build + deploy
"""
import subprocess, sys, os, time, json, argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime

REPORT_DIR = os.path.join(os.path.dirname(__file__), 'reports')
os.makedirs(REPORT_DIR, exist_ok=True)
PROJECT_DIR = '/mnt/agents/output/workspace/deepdive-rehearsal'


def run_suite(name, cmd, timeout):
    """Run a test suite, return (name, passed, total, output, elapsed)."""
    start = time.time()
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                          timeout=timeout, cwd=PROJECT_DIR)
        elapsed = time.time() - start
        output = r.stdout + r.stderr
        # Parse results
        passed = 0
        total = 0
        if 'passed' in output:
            for line in output.split('\n'):
                if 'RESULTS:' in line and 'passed' in line:
                    # "RESULTS: 133/133 passed" or "RESULTS: 42/42 passed (0 failed)"
                    parts = line.split('RESULTS:')[1].split('passed')[0].strip()
                    if '/' in parts:
                        p, t = parts.split('/')
                        passed = int(p.strip())
                        total = int(t.strip().split()[0])
                    break
        success = r.returncode == 0 and passed == total and total > 0
        return {'name': name, 'passed': passed, 'total': total,
                'success': success, 'elapsed': elapsed, 'output': output[-500:]}
    except subprocess.TimeoutExpired:
        return {'name': name, 'passed': 0, 'total': 0,
                'success': False, 'elapsed': timeout, 'output': 'TIMEOUT'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--parallel', action='store_true')
    parser.add_argument('--quick', action='store_true')
    parser.add_argument('--build', action='store_true')
    parser.add_argument('--deploy', action='store_true')
    args = parser.parse_args()

    suites_to_run = []
    if args.parallel:
        suites_to_run.append(('Parallel', 'python3 test/main.py --all --max-concurrent 6', 180))
    elif args.quick:
        suites_to_run.append(('Parallel (fast)', 'python3 test/main.py --marker fast --max-concurrent 6', 120))
    else:
        suites_to_run = [
            ('Parallel (133)', 'python3 test/main.py --all --max-concurrent 6', 180),
            ('Production (42)', 'python3 test/e2e_production_test.py', 120),
            ('Comprehensive (146)', 'python3 test/e2e_comprehensive_test.py', 150),
        ]

    print("=" * 70)
    print("  CI/CD PIPELINE — 321 E2E Tests")
    print(f"  Started: {datetime.now().isoformat()}")
    print(f"  Mode: {' + '.join(s[0] for s in suites_to_run)}")
    print("=" * 70)

    total_start = time.time()
    results = []

    # Run ALL suites in parallel processes
    with ProcessPoolExecutor(max_workers=len(suites_to_run)) as executor:
        futures = {executor.submit(run_suite, name, cmd, to): name
                   for name, cmd, to in suites_to_run}
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            status = "PASS" if result['success'] else "FAIL"
            print(f"\n  [{status}] {result['name']}: {result['passed']}/{result['total']} ({result['elapsed']:.1f}s)")

    total_elapsed = time.time() - total_start
    all_passed = all(r['success'] for r in results)
    total_tests = sum(r['total'] for r in results)
    total_passed = sum(r['passed'] for r in results)

    # Build
    if args.build and all_passed:
        print("\n  [BUILD] Building...")
        rc, out, _ = run_suite('Build', 'python3 build.py', 30)['success'], '', 0
        # Actually run build
        r = subprocess.run('python3 build.py', shell=True, capture_output=True, text=True, timeout=30, cwd=PROJECT_DIR)
        print(f"  [BUILD] {'OK' if r.returncode == 0 else 'FAIL'}")

    # Deploy
    if args.deploy and all_passed:
        print("\n  [DEPLOY] Copying...")
        r = subprocess.run('cp deepdive_content_pipeline_rehearsal.html deploy_temp/index.html',
                          shell=True, capture_output=True, text=True, timeout=10, cwd=PROJECT_DIR)
        print(f"  [DEPLOY] {'OK' if r.returncode == 0 else 'FAIL'}")

    # Summary
    print("\n" + "=" * 70)
    print("  FINAL REPORT")
    print("=" * 70)
    for r in results:
        s = "PASS" if r['success'] else "FAIL"
        print(f"  [{s}] {r['name']}: {r['passed']}/{r['total']} ({r['elapsed']:.1f}s)")
    print("-" * 70)
    print(f"  Total: {total_passed}/{total_tests} tests | {total_elapsed:.1f}s")
    print(f"  Status: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
    print("=" * 70)

    # Save report
    report = {'timestamp': datetime.now().isoformat(),
              'total_tests': total_tests, 'total_passed': total_passed,
              'elapsed': round(total_elapsed, 1), 'all_passed': all_passed,
              'suites': results}
    path = os.path.join(REPORT_DIR, f"ci_{int(time.time())}.json")
    with open(path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\n  Report: {path}")

    sys.exit(0 if all_passed else 1)


if __name__ == '__main__':
    main()
