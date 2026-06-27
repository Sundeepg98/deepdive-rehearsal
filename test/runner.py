#!/usr/bin/env python3
"""
Modular Test Runner — Selective, fast, reliable.

Uses proven async execution (same as e2e_comprehensive_test.py) but with
modular test groups that can be run individually or in any combination.

USAGE:
  # Run all modular tests
  python3 test/runner.py

  # Run specific group
  python3 test/runner.py --group router
  python3 test/runner.py --group views
  python3 test/runner.py --group layout
  python3 test/runner.py --group accessibility

  # Run multiple groups
  python3 test/runner.py --group router,views,layout

  # Run by marker
  python3 test/runner.py --marker critical
  python3 test/runner.py --marker fast
  python3 test/runner.py --marker "not slow"

  # Run specific test
  python3 test/runner.py --test router_exists

  # List all available tests
  python3 test/runner.py --list

  # Verbose output
  python3 test/runner.py -v

  # Stop on first failure
  python3 test/runner.py -x
"""

import asyncio, sys, os, time, json, argparse
from playwright.async_api import async_playwright

HTML_PATH = 'file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'
REPORT_DIR = '/mnt/agents/output/workspace/deepdive-rehearsal/test/reports'


class TestResult:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.start = time.time()

    def add_pass(self, group, name):
        self.passed.append((group, name))

    def add_fail(self, group, name, expected, actual):
        self.failed.append((group, name, expected, actual))

    def summary(self):
        elapsed = time.time() - self.start
        total = len(self.passed) + len(self.failed)
        print(f"\n{'='*60}")
        print(f"RESULTS: {len(self.passed)}/{total} passed ({len(self.failed)} failed) in {elapsed:.1f}s")
        if self.failed:
            print(f"\nFAILED:")
            for g, n, e, a in self.failed:
                print(f"  [{g}] {n}")
                print(f"    Expected: {e}")
                print(f"    Actual:   {a}")
        print(f"{'='*60}")
        os.makedirs(REPORT_DIR, exist_ok=True)
        with open(os.path.join(REPORT_DIR, f'runner_{int(time.time())}.json'), 'w') as f:
            json.dump({'elapsed': elapsed, 'passed': len(self.passed), 'failed': len(self.failed),
                'failures': [{'group': g, 'name': n, 'expected': e, 'actual': a} for g, n, e, a in self.failed],
                'passes': [{'group': g, 'name': n} for g, n in self.passed]}, f, indent=2)
        return len(self.failed) == 0


# ============================================================
# Helper functions
# ============================================================
async def nav(page, view_id):
    """Navigate and wait for transition to fully complete."""
    await page.evaluate(f'() => {{ if (window.Router) window.Router.navigate("{view_id}"); }}')
    # Wait for: router hash update + ViewManager transition (320ms) + settle
    await page.wait_for_timeout(1200)


async def current_view(page):
    return await page.evaluate('() => window.Router ? window.Router.current().view : "no-router"')


# ============================================================
# Test definitions — each is an async function(page) -> None
# Raises AssertionError on failure
# ============================================================

# --- Router tests ---
async def test_router_exists(page):
    assert await page.evaluate('() => !!window.Router && !!window.Router.navigate')

async def test_routes_defined(page):
    routes = await page.evaluate('() => Object.keys(window.Router.ROUTES)')
    assert routes == ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']

async def test_default_route(page):
    assert await current_view(page) == 'walk'

async def test_navigate_to_drill(page):
    await nav(page, 'drill')
    assert await current_view(page) == 'drill'

async def test_navigate_to_wb(page):
    await nav(page, 'wb')
    assert await current_view(page) == 'wb'

async def test_navigate_all_views(page):
    for v in ['drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'walk']:
        await nav(page, v)
        cv = await current_view(page)
        assert cv == v, f"Expected {v}, got {cv}"

async def test_hash_updates(page):
    await nav(page, 'drill')
    assert await page.evaluate('() => window.location.hash') == '#drill'

async def test_title_updates(page):
    await nav(page, 'drill')
    title = await page.evaluate('() => document.title')
    assert 'Probe Drill' in title, f"Title '{title}' doesn't contain 'Probe Drill'"

async def test_back_button(page):
    await nav(page, 'drill')
    await nav(page, 'wb')
    await page.go_back()
    await page.wait_for_timeout(600)
    assert await current_view(page) == 'drill'

async def test_forward_button(page):
    await nav(page, 'drill')
    await nav(page, 'wb')
    await page.go_back()
    await page.wait_for_timeout(600)
    await page.go_forward()
    await page.wait_for_timeout(600)
    assert await current_view(page) == 'wb'

# --- View Manager tests ---
async def test_view_manager_exists(page):
    assert await page.evaluate('() => !!window.ViewManager')

async def test_initial_view_walk(page):
    vid = await page.evaluate('() => document.querySelector(".pane.on")?.id')
    assert vid == 'walk'

async def test_single_pane_active(page):
    await nav(page, 'drill')
    count = await page.evaluate('() => document.querySelectorAll(".pane.on").length')
    assert count == 1

async def test_correct_pane_visible(page):
    await nav(page, 'sys')
    active = await page.evaluate('() => document.querySelector(".pane.on")?.id')
    assert active == 'sys', f"Expected 'sys', got '{active}'"

async def test_other_panes_hidden(page):
    await nav(page, 'trade')
    hidden = await page.evaluate('''() =>
        ['walk','drill','wb','sys','model','num','rf','open'].every(
            id => { const p = document.getElementById(id); return p && !p.classList.contains('on'); }
        )
    ''')
    assert hidden

async def test_active_pane_opaque(page):
    await nav(page, 'drill')
    op = await page.evaluate('() => parseFloat(getComputedStyle(document.querySelector(".pane.on")).opacity)')
    assert op == 1.0

async def test_nav_button_activated(page):
    await nav(page, 'drill')
    btn = await page.evaluate('''() => {
        const btns = document.querySelectorAll('.seg button, .sidebar .seg button');
        for (const b of btns) if (b.getAttribute('data-tab') === 'drill') return b.classList.contains('on');
        return false;
    }''')
    assert btn, "Drill nav button not activated"

async def test_title_matches_view(page):
    await nav(page, 'wb')
    assert 'Whiteboard' in await page.evaluate('() => document.title')

# --- Layout tests ---
async def test_no_scroll_whitespace(page):
    m = await page.evaluate('''() => {
        const app = document.querySelector('.app'), body = document.body;
        return { gap: document.documentElement.scrollHeight - (app ? Math.round(app.getBoundingClientRect().bottom) : 0) - parseFloat(getComputedStyle(body).paddingBottom) };
    }''')
    assert m['gap'] <= 25, f"Scroll gap = {m['gap']}px"

async def test_app_height_bounds(page):
    h = await page.evaluate('() => document.querySelector(".app").offsetHeight')
    assert 850 <= h <= 1200

async def test_stage_position_relative(page):
    pos = await page.evaluate('() => getComputedStyle(document.querySelector(".stage")).position')
    assert pos == 'relative'

async def test_body_overflow_hidden(page):
    ov = await page.evaluate('() => getComputedStyle(document.body).overflow')
    assert ov == 'hidden'

async def test_html_overflow_hidden(page):
    ov = await page.evaluate('() => getComputedStyle(document.documentElement).overflow')
    assert ov == 'hidden'

async def test_nine_nav_items(page):
    count = await page.evaluate('() => document.querySelectorAll(".seg button, .sidebar .seg button").length')
    assert count == 9

async def test_companion_visible(page):
    d = await page.evaluate('() => getComputedStyle(document.querySelector(".companion")).display')
    assert d != 'none'

async def test_sidebar_visible(page):
    d = await page.evaluate('() => getComputedStyle(document.querySelector(".sidebar")).display')
    assert d != 'none'

# --- Accessibility tests ---
async def test_tab_moves_focus(page):
    await page.keyboard.press('Tab')
    f = await page.evaluate('() => document.activeElement.tagName')
    assert f != 'BODY'

async def test_q_navigates_walk(page):
    await nav(page, 'drill')
    await page.keyboard.press('q')
    await page.wait_for_timeout(800)
    assert await current_view(page) == 'walk'

async def test_w_navigates_drill(page):
    await nav(page, 'walk')
    await page.keyboard.press('w')
    await page.wait_for_timeout(800)
    assert await current_view(page) == 'drill'

async def test_html_has_lang(page):
    assert await page.evaluate('() => document.documentElement.lang')

async def test_page_has_title(page):
    assert await page.evaluate('() => document.title')

async def test_buttons_have_text(page):
    count = await page.evaluate('''() => Array.from(document.querySelectorAll('button')).filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length''')
    assert count == 0

async def test_reduced_motion_in_css(page):
    with open('/mnt/agents/output/workspace/deepdive-rehearsal/src/styles.css') as f:
        assert 'prefers-reduced-motion' in f.read()

# --- Performance tests ---
async def test_html_under_500kb(page):
    assert os.path.getsize('/mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html') < 500000

async def test_brace_balance(page):
    with open('/mnt/agents/output/workspace/deepdive-rehearsal/src/styles.css') as f:
        c = f.read()
    assert c.count('{') == c.count('}')

async def test_has_keyframes(page):
    with open('/mnt/agents/output/workspace/deepdive-rehearsal/src/styles.css') as f:
        assert '@keyframes' in f.read()

async def test_has_media_queries(page):
    with open('/mnt/agents/output/workspace/deepdive-rehearsal/src/styles.css') as f:
        assert f.read().count('@media') >= 2


# ============================================================
# Test registry — groups and markers
# ============================================================
TEST_GROUPS = {
    'router': [
        ('Router', 'test_router_exists', test_router_exists, ['spa', 'router', 'critical', 'fast']),
        ('Router', 'test_routes_defined', test_routes_defined, ['spa', 'router', 'critical', 'fast']),
        ('Router', 'test_default_route', test_default_route, ['spa', 'router', 'critical', 'fast']),
        ('Navigation', 'test_navigate_to_drill', test_navigate_to_drill, ['spa', 'router', 'critical']),
        ('Navigation', 'test_navigate_to_wb', test_navigate_to_wb, ['spa', 'router', 'critical']),
        ('Navigation', 'test_navigate_all_views', test_navigate_all_views, ['spa', 'router', 'critical', 'slow']),
        ('Navigation', 'test_hash_updates', test_hash_updates, ['spa', 'router', 'critical']),
        ('Navigation', 'test_title_updates', test_title_updates, ['spa', 'router', 'critical']),
        ('History', 'test_back_button', test_back_button, ['spa', 'router']),
        ('History', 'test_forward_button', test_forward_button, ['spa', 'router']),
    ],
    'views': [
        ('Views', 'test_view_manager_exists', test_view_manager_exists, ['spa', 'views', 'critical', 'fast']),
        ('Views', 'test_initial_view_walk', test_initial_view_walk, ['spa', 'views', 'critical', 'fast']),
        ('Views', 'test_single_pane_active', test_single_pane_active, ['spa', 'views', 'critical']),
        ('Views', 'test_correct_pane_visible', test_correct_pane_visible, ['spa', 'views', 'critical']),
        ('Views', 'test_other_panes_hidden', test_other_panes_hidden, ['spa', 'views', 'critical']),
        ('Views', 'test_active_pane_opaque', test_active_pane_opaque, ['spa', 'views', 'fast']),
        ('Views', 'test_nav_button_activated', test_nav_button_activated, ['spa', 'views', 'critical']),
        ('Views', 'test_title_matches_view', test_title_matches_view, ['spa', 'views']),
    ],
    'layout': [
        ('Desktop', 'test_no_scroll_whitespace', test_no_scroll_whitespace, ['layout', 'critical']),
        ('Desktop', 'test_app_height_bounds', test_app_height_bounds, ['layout', 'critical', 'fast']),
        ('Desktop', 'test_stage_position_relative', test_stage_position_relative, ['layout', 'critical', 'fast']),
        ('Desktop', 'test_body_overflow_hidden', test_body_overflow_hidden, ['layout', 'critical', 'fast']),
        ('Desktop', 'test_html_overflow_hidden', test_html_overflow_hidden, ['layout', 'critical', 'fast']),
        ('Desktop', 'test_nine_nav_items', test_nine_nav_items, ['layout', 'critical', 'fast']),
        ('Desktop', 'test_companion_visible', test_companion_visible, ['layout', 'critical', 'fast']),
        ('Desktop', 'test_sidebar_visible', test_sidebar_visible, ['layout', 'critical', 'fast']),
    ],
    'accessibility': [
        ('Keyboard', 'test_tab_moves_focus', test_tab_moves_focus, ['accessibility', 'critical']),
        ('Keyboard', 'test_q_navigates_walk', test_q_navigates_walk, ['accessibility', 'critical']),
        ('Keyboard', 'test_w_navigates_drill', test_w_navigates_drill, ['accessibility', 'critical']),
        ('ARIA', 'test_html_has_lang', test_html_has_lang, ['accessibility', 'fast']),
        ('ARIA', 'test_page_has_title', test_page_has_title, ['accessibility', 'fast']),
        ('ARIA', 'test_buttons_have_text', test_buttons_have_text, ['accessibility', 'fast']),
        ('ARIA', 'test_reduced_motion_in_css', test_reduced_motion_in_css, ['accessibility', 'fast']),
    ],
    'performance': [
        ('Size', 'test_html_under_500kb', test_html_under_500kb, ['performance', 'fast']),
        ('CSS', 'test_brace_balance', test_brace_balance, ['performance', 'fast']),
        ('CSS', 'test_has_keyframes', test_has_keyframes, ['performance', 'fast']),
        ('CSS', 'test_has_media_queries', test_has_media_queries, ['performance', 'fast']),
    ],
}


def list_tests():
    print("\nAvailable tests:")
    print(f"{'='*60}")
    total = 0
    for group, tests in TEST_GROUPS.items():
        print(f"\n  [{group}] ({len(tests)} tests)")
        for g, name, fn, markers in tests:
            marker_str = ', '.join(markers)
            print(f"    {name}  —  {marker_str}")
            total += 1
    print(f"\n{'='*60}")
    print(f"Total: {total} tests across {len(TEST_GROUPS)} groups")
    print(f"\nRun examples:")
    print(f"  python3 test/runner.py --group router")
    print(f"  python3 test/runner.py --group router,views")
    print(f"  python3 test/runner.py --marker critical")
    print(f"  python3 test/runner.py --test navigate_to_drill")
    print(f"  python3 test/runner.py -x")


def select_tests(args):
    if args.group:
        groups = args.group.split(',')
        selected = []
        for g in groups:
            g = g.strip()
            if g in TEST_GROUPS:
                selected.extend(TEST_GROUPS[g])
            else:
                print(f"WARNING: Unknown group '{g}'. Available: {', '.join(TEST_GROUPS.keys())}")
        return selected

    if args.marker:
        marker = args.marker
        selected = []
        for group_tests in TEST_GROUPS.values():
            for g, name, fn, markers in group_tests:
                if marker == 'not slow':
                    if 'slow' not in markers:
                        selected.append((g, name, fn, markers))
                elif marker in markers:
                    selected.append((g, name, fn, markers))
        return selected

    if args.test:
        search = args.test
        selected = []
        for group_tests in TEST_GROUPS.values():
            for g, name, fn, markers in group_tests:
                if search in name:
                    selected.append((g, name, fn, markers))
        return selected

    # Default: all tests
    selected = []
    for group_tests in TEST_GROUPS.values():
        selected.extend(group_tests)
    return selected


async def run_tests(selected, verbose=False, stop_on_fail=False):
    result = TestResult()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # Group tests to minimize page reloads
        from itertools import groupby
        grouped = {k: list(v) for k, v in groupby(selected, key=lambda x: x[0])}

        for group_name, tests in grouped.items():
            # Fresh page per group for proper isolation
            page = await browser.new_page(viewport={'width': 1280, 'height': 800})
            await page.goto(HTML_PATH)
            await page.wait_for_timeout(2500)

            for g, name, fn, markers in tests:
                try:
                    # Reset to walk before each test (long wait for ViewManager to settle)
                    await page.evaluate('() => { window.scrollTo(0,0); if (window.Router) window.Router.navigate("walk"); }')
                    await page.wait_for_timeout(1000)
                    await fn(page)
                    result.add_pass(g, name)
                    if verbose:
                        print(f"  [PASS] [{g}] {name}")
                except AssertionError as e:
                    result.add_fail(g, name, 'assertion', str(e))
                    print(f"  [FAIL] [{g}] {name} — {e}")
                    if stop_on_fail:
                        await page.close()
                        await browser.close()
                        return result.summary()
                except Exception as e:
                    result.add_fail(g, name, 'exception', str(e))
                    print(f"  [ERR ] [{g}] {name} — {e}")
                    if stop_on_fail:
                        await page.close()
                        await browser.close()
                        return result.summary()

            await page.close()

        await browser.close()

    return result.summary()


def main():
    parser = argparse.ArgumentParser(description='Modular E2E Test Runner')
    parser.add_argument('--group', '-g', help='Run specific group(s): router,views,layout,accessibility,performance')
    parser.add_argument('--marker', '-m', help='Run by marker: critical, fast, slow, spa, router, etc.')
    parser.add_argument('--test', '-t', help='Run tests matching name')
    parser.add_argument('--list', '-l', action='store_true', help='List all tests')
    parser.add_argument('-v', action='store_true', help='Verbose output')
    parser.add_argument('-x', action='store_true', help='Stop on first failure')
    args = parser.parse_args()

    if args.list:
        list_tests()
        return

    selected = select_tests(args)
    if not selected:
        print("No tests selected.")
        return

    print(f"\nRunning {len(selected)} tests...")
    if args.group: print(f"  Group: {args.group}")
    if args.marker: print(f"  Marker: {args.marker}")
    if args.test: print(f"  Test filter: {args.test}")
    print()

    success = asyncio.run(run_tests(selected, verbose=args.v, stop_on_fail=args.x))
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
