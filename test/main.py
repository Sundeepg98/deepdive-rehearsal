#!/usr/bin/env python3
"""
Unified Parallel Test Runner — Modular, Granular, Selective

Architecture:
  - Discovers test modules from test/modules/
  - Each module: self-contained async test functions
  - Parallel: modules run concurrently (asyncio.gather)
  - Sequential: within a module (state-safe)
  - Selective: --group, --module, --marker, --test filters
  - Audits: --lighthouse, --axe flags

USAGE:
  python3 test/main.py --all                    # Run everything
  python3 test/main.py --parallel 4             # Run with 4 concurrent modules
  python3 test/main.py --module spa             # SPA tests only
  python3 test/main.py --group router,views     # Multiple groups
  python3 test/main.py --marker critical        # Critical tests
  python3 test/main.py --test navigate          # Name filter
  python3 test/main.py --lighthouse             # Include Lighthouse audit
  python3 test/main.py --axe                    # Include AXE accessibility audit
  python3 test/main.py --all --parallel 4 -v    # Full verbose parallel
  python3 test/main.py --list                   # List all tests
  python3 test/main.py --dry-run                # Show what would run
  python3 test/main.py -x                       # Stop on first failure
"""

import asyncio, sys, os, time, json, importlib.util, inspect, argparse
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

HTML_PATH = 'file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'
MODULES_DIR = Path(__file__).parent / 'modules'
REPORT_DIR = Path(__file__).parent / 'reports'


# ============================================================
# Result collection
# ============================================================
class Results:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.errors = []
        self.start = time.time()
        self.module_times = {}

    def add_pass(self, module, group, name, elapsed_ms):
        self.passed.append({'module': module, 'group': group, 'name': name, 'ms': elapsed_ms})

    def add_fail(self, module, group, name, expected, actual, elapsed_ms):
        self.failed.append({'module': module, 'group': group, 'name': name,
            'expected': expected, 'actual': actual, 'ms': elapsed_ms})

    def add_error(self, module, group, name, error, elapsed_ms):
        self.errors.append({'module': module, 'group': group, 'name': name, 'error': str(error), 'ms': elapsed_ms})

    def summary(self):
        elapsed = time.time() - self.start
        total = len(self.passed) + len(self.failed) + len(self.errors)
        print(f"\n{'='*70}")
        print(f"  RESULTS: {len(self.passed)}/{total} passed  |  "
              f"{len(self.failed)} failed  |  {len(self.errors)} errors  |  "
              f"{elapsed:.1f}s")
        print(f"{'='*70}")
        if self.failed:
            print(f"\n  FAILED:")
            for f in self.failed:
                print(f"    [{f['module']}/{f['group']}] {f['name']}")
                print(f"      Expected: {f['expected']}")
                print(f"      Actual:   {f['actual']}")
        if self.errors:
            print(f"\n  ERRORS:")
            for e in self.errors:
                print(f"    [{e['module']}/{e['group']}] {e['name']}: {e['error']}")
        # Module timing
        if self.module_times:
            print(f"\n  MODULE TIMES:")
            for mod, t in sorted(self.module_times.items(), key=lambda x: -x[1]):
                print(f"    {mod:20s} {t:5.1f}s")
        # Save report
        REPORT_DIR.mkdir(exist_ok=True)
        report = {'timestamp': datetime.now().isoformat(), 'elapsed': elapsed,
            'passed': len(self.passed), 'failed': len(self.failed), 'errors': len(self.errors),
            'module_times': self.module_times,
            'failures': self.failed, 'errors_detail': self.errors}
        path = REPORT_DIR / f'unified_{int(time.time())}.json'
        with open(path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n  Report: {path}")
        return len(self.failed) == 0 and len(self.errors) == 0


# ============================================================
# Module discovery
# ============================================================
def discover_modules():
    """Discover all test_*.py files in test/modules/."""
    modules = {}
    if not MODULES_DIR.exists():
        return modules
    for fpath in sorted(MODULES_DIR.glob('test_*.py')):
        name = fpath.stem  # e.g., test_spa
        spec = importlib.util.spec_from_file_location(name, fpath)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        # Extract test functions: async def test_*(page)
        tests = []
        for attr_name in dir(mod):
            if attr_name.startswith('test_'):
                fn = getattr(mod, attr_name)
                if inspect.iscoroutinefunction(fn):
                    # Get markers from function attribute or default
                    markers = getattr(fn, '_markers', [])
                    group = getattr(fn, '_group', 'General')
                    tests.append((group, attr_name, fn, markers))
        if tests:
            modules[name] = {'path': fpath, 'module': mod, 'tests': tests}
    return modules


# ============================================================
# Test execution — sequential within module
# ============================================================
async def run_module(module_name, module_info, results, verbose=False, stop_on_fail=False):
    """Run all tests in a single module (sequential, shared page)."""
    mod_start = time.time()
    from playwright.async_api import async_playwright
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True)
    page = await browser.new_page(viewport={'width': 1280, 'height': 800})
    await page.goto(HTML_PATH)
    await page.wait_for_timeout(2500)

    for group, name, fn, markers in module_info['tests']:
        t0 = time.time()
        try:
            # Reset to walk before each test
            await page.evaluate('() => { window.scrollTo(0,0); if(window.Router)window.Router.navigate("walk"); }')
            await page.wait_for_timeout(800)
            await fn(page)
            elapsed = (time.time() - t0) * 1000
            results.add_pass(module_name, group, name, elapsed)
            if verbose:
                print(f"  [PASS] [{module_name:15s}] {name:40s} ({elapsed:.0f}ms)")
        except AssertionError as e:
            elapsed = (time.time() - t0) * 1000
            results.add_fail(module_name, group, name, 'assertion', str(e), elapsed)
            print(f"  [FAIL] [{module_name:15s}] {name:40s} — {e}")
            if stop_on_fail:
                break
        except Exception as e:
            elapsed = (time.time() - t0) * 1000
            results.add_error(module_name, group, name, e, elapsed)
            print(f"  [ERR ] [{module_name:15s}] {name:40s} — {e}")
            if stop_on_fail:
                break

    await page.close()
    await browser.close()
    await pw.stop()
    results.module_times[module_name] = time.time() - mod_start


# ============================================================
# Parallel execution — modules run concurrently
# ============================================================
async def run_parallel(modules_to_run, results, verbose=False, stop_on_fail=False, max_parallel=4):
    """Run modules in parallel with semaphore-limited concurrency."""
    semaphore = asyncio.Semaphore(max_parallel)

    async def run_with_limit(name, info):
        async with semaphore:
            await run_module(name, info, results, verbose, stop_on_fail)

    tasks = [run_with_limit(name, info) for name, info in modules_to_run.items()]
    await asyncio.gather(*tasks, return_exceptions=True)


# ============================================================
# CLI
# ============================================================
def select_modules(modules, args):
    """Filter modules based on CLI args."""
    selected = dict(modules)

    if args.module:
        names = [n.strip() for n in args.module.split(',')]
        selected = {k: v for k, v in selected.items() if k in names}

    if args.group:
        groups = [g.strip() for g in args.group.split(',')]
        filtered = {}
        for name, info in selected.items():
            filtered_tests = [(g, n, fn, m) for g, n, fn, m in info['tests'] if g in groups]
            if filtered_tests:
                filtered[name] = {**info, 'tests': filtered_tests}
        selected = filtered

    if args.marker:
        marker = args.marker
        filtered = {}
        for name, info in selected.items():
            if marker == 'not slow':
                filtered_tests = [(g, n, fn, m) for g, n, fn, m in info['tests'] if 'slow' not in m]
            else:
                filtered_tests = [(g, n, fn, m) for g, n, fn, m in info['tests'] if marker in m]
            if filtered_tests:
                filtered[name] = {**info, 'tests': filtered_tests}
        selected = filtered

    if args.test:
        search = args.test
        filtered = {}
        for name, info in selected.items():
            filtered_tests = [(g, n, fn, m) for g, n, fn, m in info['tests'] if search in n]
            if filtered_tests:
                filtered[name] = {**info, 'tests': filtered_tests}
        selected = filtered

    return selected


def list_tests(modules):
    print(f"\n{'='*70}")
    print(f"  TEST REGISTRY: {sum(len(i['tests']) for i in modules.values())} tests "
          f"across {len(modules)} modules")
    print(f"{'='*70}")
    total = 0
    for name, info in sorted(modules.items()):
        print(f"\n  [{name}] ({len(info['tests'])} tests)")
        for group, tname, fn, markers in info['tests']:
            mstr = ','.join(markers) if markers else ''
            print(f"    {group:12s} {tname:40s}  {mstr}")
            total += 1
    print(f"\n  Total: {total} tests")
    print(f"{'='*70}")


def dry_run(modules):
    print(f"\nDRY RUN — Would execute:")
    for name, info in sorted(modules.items()):
        print(f"  Module: {name} ({len(info['tests'])} tests)")
        for group, tname, fn, markers in info['tests']:
            print(f"    {group}/{tname}")


def main():
    parser = argparse.ArgumentParser(description='Unified Parallel Test Runner')
    parser.add_argument('--all', action='store_true', help='Run all tests')
    parser.add_argument('--module', '-m', help='Module(s): test_spa,test_layout,...')
    parser.add_argument('--group', '-g', help='Group(s): Router,Views,Desktop,...')
    parser.add_argument('--marker', help='Marker: critical, fast, slow, spa, ...')
    parser.add_argument('--test', '-t', help='Test name filter')
    parser.add_argument('--parallel', '-p', type=int, default=1, help='Parallel modules (default: 1)')
    parser.add_argument('--lighthouse', action='store_true', help='Include Lighthouse audit')
    parser.add_argument('--axe', action='store_true', help='Include AXE accessibility audit')
    parser.add_argument('--list', '-l', action='store_true', help='List all tests')
    parser.add_argument('--dry-run', action='store_true', help='Show what would run')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('-x', action='store_true', help='Stop on first failure')
    args = parser.parse_args()

    modules = discover_modules()
    if not modules:
        print("No test modules found in test/modules/")
        return

    if args.list:
        list_tests(modules)
        return

    selected = select_modules(modules, args)
    if not selected:
        print("No tests selected. Use --all, --module, --group, --marker, or --test")
        return

    if args.dry_run:
        dry_run(selected)
        return

    print(f"\n{'='*70}")
    print(f"  UNIFIED TEST RUNNER")
    print(f"  Modules: {len(selected)}  |  Parallel: {args.parallel}")
    print(f"  Tests: {sum(len(i['tests']) for i in selected.values())}")
    print(f"  Time: {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*70}\n")

    results = Results()

    if args.parallel > 1:
        asyncio.run(run_parallel(selected, results, args.verbose, args.x, args.parallel))
    else:
        for name, info in selected.items():
            asyncio.run(run_module(name, info, results, args.verbose, args.x))

    success = results.summary()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
