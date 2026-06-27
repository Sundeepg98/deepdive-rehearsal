#!/usr/bin/env python3
"""
Unified 100% Parallel Test Runner

Architecture:
  - Discovers test modules from test/modules/
  - Each test runs in its OWN browser context — fully isolated
  - All tests execute simultaneously via asyncio.gather
  - True 100% parallelization regardless of module boundaries
  - CI/CD friendly: exit codes, JSON reports, selective running

USAGE:
  python3 test/main.py --all                    # Run ALL tests in parallel
  python3 test/main.py --all --max-concurrent 8 # Limit to 8 concurrent tests
  python3 test/main.py --module spa             # SPA module only
  python3 test/main.py --group Router           # Router group only
  python3 test/main.py --marker critical        # Critical tests
  python3 test/main.py --test navigate          # Name filter
  python3 test/main.py --list                   # List all tests
  python3 test/main.py --ci                     # CI mode (minimal output, JSON report)
  python3 test/main.py --sequential             # Sequential mode (for debugging)
  python3 test/main.py --all -v                 # Verbose
  python3 test/main.py --all -x                 # Stop on first failure
"""

import asyncio, sys, os, time, json, importlib.util, inspect, argparse
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

HTML_PATH = 'file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'
MODULES_DIR = Path(__file__).parent / 'modules'
REPORT_DIR = Path(__file__).parent / 'reports'


class Results:
    """Collect and report test results."""
    def __init__(self):
        self.passed = []
        self.failed = []
        self.errors = []
        self.start = time.time()

    def add(self, module, group, name, status, detail='', elapsed_ms=0):
        entry = {'module': module, 'group': group, 'name': name,
                 'status': status, 'detail': detail, 'ms': elapsed_ms}
        if status == 'PASS':
            self.passed.append(entry)
        elif status == 'FAIL':
            self.failed.append(entry)
        else:
            self.errors.append(entry)

    def summary(self):
        elapsed = time.time() - self.start
        total = len(self.passed) + len(self.failed) + len(self.errors)
        print(f"\n{'='*70}")
        print(f"  RESULTS: {len(self.passed)}/{total} passed | "
              f"{len(self.failed)} failed | {len(self.errors)} errors | "
              f"{elapsed:.1f}s")
        print(f"{'='*70}")
        if self.failed:
            print("\n  FAILED:")
            for f in self.failed:
                print(f"    [{f['module']:12s}] {f['name']:40s} — {f['detail']}")
        REPORT_DIR.mkdir(exist_ok=True)
        path = REPORT_DIR / f'parallel_{int(time.time())}.json'
        with open(path, 'w') as fp:
            json.dump({'elapsed': elapsed, 'passed': len(self.passed),
                'failed': len(self.failed), 'errors': len(self.errors),
                'tests': self.passed + self.failed + self.errors}, fp, indent=2)
        print(f"\n  Report: {path}")
        return len(self.failed) == 0 and len(self.errors) == 0


def discover_modules():
    """Discover all test_*.py files in test/modules/."""
    modules = {}
    if not MODULES_DIR.exists():
        return modules
    for fpath in sorted(MODULES_DIR.glob('test_*.py')):
        name = fpath.stem
        spec = importlib.util.spec_from_file_location(name, fpath)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        tests = []
        for attr in dir(mod):
            if attr.startswith('test_') and inspect.iscoroutinefunction(getattr(mod, attr)):
                fn = getattr(mod, attr)
                tests.append((getattr(fn, '_group', 'General'), attr, fn,
                             getattr(fn, '_markers', [])))
        if tests:
            modules[name] = tests
    return modules


def select_tests(modules, args):
    """Filter tests based on CLI args. Returns flat list of (module, group, name, fn, markers)."""
    selected = []
    for mod_name, tests in modules.items():
        for group, name, fn, markers in tests:
            selected.append((mod_name, group, name, fn, markers))

    if args.module:
        names = [n.strip() for n in args.module.split(',')]
        selected = [t for t in selected if t[0] in names]
    if args.group:
        groups = [g.strip() for g in args.group.split(',')]
        selected = [t for t in selected if t[1] in groups]
    if args.marker:
        if args.marker == 'not slow':
            selected = [t for t in selected if 'slow' not in t[4]]
        else:
            selected = [t for t in selected if args.marker in t[4]]
    if args.test:
        selected = [t for t in selected if args.test in t[2]]
    return selected


# ============================================================
# 100% PARALLEL: Each test runs in its own browser context
# ============================================================
async def run_single_test(browser, test_tuple, results, verbose=False):
    """Run one test in its own isolated browser context.
    test_tuple = (module, group, name, fn, markers)"""
    module, group, name, fn, markers = test_tuple
    t0 = time.time()
    context = None
    try:
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(3000)
        await fn(page)
        elapsed = (time.time() - t0) * 1000
        results.add(module, group, name, 'PASS', '', elapsed)
        if verbose:
            print(f"  [PASS] [{module:12s}] {name:40s} ({elapsed:.0f}ms)")
    except AssertionError as e:
        elapsed = (time.time() - t0) * 1000
        results.add(module, group, name, 'FAIL', str(e), elapsed)
        print(f"  [FAIL] [{module:12s}] {name:40s} — {e}")
    except Exception as e:
        elapsed = (time.time() - t0) * 1000
        results.add(module, group, name, 'ERROR', str(e), elapsed)
        print(f"  [ERR ] [{module:12s}] {name:40s} — {e}")
    finally:
        if context:
            await context.close()


async def run_parallel_100(browser, tests, results, verbose=False, max_concurrent=0):
    """Run ALL tests simultaneously — 100% parallelization.
    
    max_concurrent: 0 = unlimited (true 100% parallel)
                    N = semaphore-limited (for resource-constrained CI)
    """
    if max_concurrent > 0:
        semaphore = asyncio.Semaphore(max_concurrent)
        async def run_limited(test):
            async with semaphore:
                await run_single_test(browser, test, results, verbose)
        await asyncio.gather(*[run_limited(t) for t in tests], return_exceptions=True)
    else:
        # TRUE 100% PARALLEL — all tests at once
        await asyncio.gather(
            *[run_single_test(browser, t, results, verbose) for t in tests],
            return_exceptions=True
        )


async def run_sequential(browser, tests, results, verbose=False):
    """Run tests one at a time — for debugging."""
    for t in tests:
        await run_single_test(browser, t, results, verbose)


# ============================================================
# CLI
# ============================================================
def list_tests(modules):
    total = sum(len(t) for t in modules.values())
    print(f"\n{'='*70}")
    print(f"  TEST REGISTRY: {total} tests across {len(modules)} modules")
    print(f"{'='*70}")
    for name, tests in sorted(modules.items()):
        print(f"\n  [{name}] ({len(tests)} tests)")
        for group, tname, fn, markers in tests:
            mstr = ','.join(markers) if markers else ''
            print(f"    {group:12s}  {tname:40s}  {mstr}")
    print(f"\n  Total: {total} tests")
    print(f"{'='*70}")


def main():
    parser = argparse.ArgumentParser(description='100% Parallel Test Runner')
    parser.add_argument('--all', action='store_true', help='Run all tests')
    parser.add_argument('--module', help='Module filter: test_spa,test_layout,...')
    parser.add_argument('--group', '-g', help='Group filter: Router,Views,...')
    parser.add_argument('--marker', help='Marker filter: critical,fast,slow,...')
    parser.add_argument('--test', '-t', help='Test name filter')
    parser.add_argument('--max-concurrent', type=int, default=8,
                       help='Max concurrent tests (default: 8, 0=unlimited)')
    parser.add_argument('--sequential', action='store_true', help='Sequential mode')
    parser.add_argument('--ci', action='store_true', help='CI mode (minimal output)')
    parser.add_argument('--list', '-l', action='store_true', help='List tests')
    parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('-x', action='store_true', help='Stop on first fail')
    args = parser.parse_args()

    modules = discover_modules()
    if not modules:
        print("No test modules found in test/modules/")
        return 1

    if args.list:
        list_tests(modules)
        return 0

    tests = select_tests(modules, args)
    if not tests:
        print("No tests selected. Use --all, --module, --group, --marker, or --test")
        return 1

    mode = "sequential" if args.sequential else (f"parallel(max={args.max_concurrent})" if args.max_concurrent > 0 else "100% parallel")
    print(f"\n{'='*70}")
    print(f"  100% PARALLEL TEST RUNNER")
    print(f"  Tests: {len(tests)}  |  Mode: {mode}  |  Time: {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*70}\n")

    results = Results()

    async def run():
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=True)
        if args.sequential:
            await run_sequential(browser, tests, results, args.verbose)
        else:
            await run_parallel_100(browser, tests, results, args.verbose, args.max_concurrent)
        await browser.close()
        await pw.stop()

    asyncio.run(run())
    success = results.summary()
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
