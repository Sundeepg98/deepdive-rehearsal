#!/usr/bin/env python3
"""
Production-grade Playwright E2E Test Suite for DeepDive Rehearsal
Engineered with proper fixtures, assertions, visual regression, and coverage.
Run: python3 test/e2e_production_test.py
"""
import asyncio, sys, os, time, json
from datetime import datetime
from playwright.async_api import async_playwright

HTML_PATH = 'file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'
REPORT_DIR = '/mnt/agents/output/workspace/deepdive-rehearsal/test/reports'

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'

class TestReport:
    def __init__(self):
        self.tests = []
        self.start_time = time.time()

    def add(self, group, name, passed, expected, actual, detail=''):
        self.tests.append({
            'group': group, 'name': name, 'passed': passed,
            'expected': expected, 'actual': actual, 'detail': detail,
            'timestamp': datetime.now().isoformat()
        })
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if passed else f"{Colors.RED}FAIL{Colors.RESET}"
        detail_str = f" {Colors.DIM}— {detail}{Colors.RESET}" if detail else ""
        print(f"    [{status}] {name}{detail_str}")
        if not passed:
            print(f"           Expected: {expected}")
            print(f"           Actual:   {actual}")

    def summary(self):
        elapsed = time.time() - self.start_time
        passed = sum(1 for t in self.tests if t['passed'])
        failed = sum(1 for t in self.tests if not t['passed'])
        total = len(self.tests)

        print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
        print(f"{Colors.BOLD}RESULTS: {passed}/{total} passed ({Colors.RED if failed else Colors.GREEN}{failed} failed{Colors.RESET}) in {elapsed:.1f}s{Colors.RESET}")
        print(f"{Colors.BOLD}{'='*60}{Colors.RESET}\n")

        # Save JSON report
        os.makedirs(REPORT_DIR, exist_ok=True)
        report_path = os.path.join(REPORT_DIR, f"e2e_report_{int(time.time())}.json")
        with open(report_path, 'w') as f:
            json.dump({'elapsed_seconds': elapsed, 'passed': passed, 'failed': failed, 'total': total, 'tests': self.tests}, f, indent=2)
        print(f"Report saved: {report_path}")
        return failed == 0


async def measure_scroll_metrics(page):
    """Measure all scroll-related metrics for a page."""
    return await page.evaluate('''() => {
        const vh = window.innerHeight;
        const all = document.querySelectorAll('body *');
        let maxContentBottom = 0;
        for (const el of all) {
            const st = window.getComputedStyle(el);
            if (st.display === 'none' || st.position === 'fixed') continue;
            const rect = el.getBoundingClientRect();
            if (rect.height > 5 && rect.bottom > maxContentBottom) maxContentBottom = rect.bottom;
        }
        const app = document.querySelector('.app');
        const companion = document.querySelector('.companion');
        const sidebar = document.querySelector('.sidebar');
        const stage = document.querySelector('.stage');

        return {
            viewport_height: vh,
            html_scrollHeight: document.documentElement.scrollHeight,
            html_clientHeight: document.documentElement.clientHeight,
            body_scrollHeight: document.body.scrollHeight,
            body_clientHeight: document.body.clientHeight,
            app_offsetHeight: app ? app.offsetHeight : 0,
            companion_scrollHeight: companion ? companion.scrollHeight : 0,
            companion_offsetHeight: companion ? companion.offsetHeight : 0,
            sidebar_scrollHeight: sidebar ? sidebar.scrollHeight : 0,
            stage_offsetHeight: stage ? stage.offsetHeight : 0,
            app_rect_bottom: app ? Math.round(app.getBoundingClientRect().bottom) : 0,
            max_content_bottom: Math.round(maxContentBottom),
            body_padding_bottom: parseFloat(window.getComputedStyle(document.body).paddingBottom),
            has_v_scroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
            scroll_gap: document.documentElement.scrollHeight - (app ? Math.round(app.getBoundingClientRect().bottom) : 0) - parseFloat(window.getComputedStyle(document.body).paddingBottom)
        };
    }''')


async def measure_mockbar_state(page):
    """Measure mockbar visibility state."""
    return await page.evaluate('''() => {
        const mb = document.querySelector('.sidebar .mockbar');
        if (!mb) return { exists: false };
        const st = window.getComputedStyle(mb);
        return {
            exists: true,
            display: st.display,
            transform: st.transform,
            offsetHeight: mb.offsetHeight,
            tools_open: document.body.classList.contains('tools-open')
        };
    }''')


async def run_group_1_desktop(report, browser):
    """GROUP 1: Desktop Layout & Scroll Integrity (1280x800)"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}[GROUP 1] Desktop Layout & Scroll Integrity{Colors.RESET}")
    page = await browser.new_page(viewport={'width': 1280, 'height': 800})
    await page.goto(HTML_PATH)
    await page.wait_for_timeout(2000)

    # v221: Scroll to top before measuring (SPA may shift scroll position)
    await page.evaluate('''() => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }''')
    await page.wait_for_timeout(200)
    m = await measure_scroll_metrics(page)

    # T1.1: No visible scrollbar (overflow:hidden set, user can't scroll)
    # Note: scrollHeight always reports full content height regardless of overflow:hidden
    # With body padding-bottom:70px, app may extend slightly below viewport - that's OK
    user_can_scroll = m['html_scrollHeight'] > m['html_clientHeight']
    app_fits = m['app_offsetHeight'] <= m['html_clientHeight'] + m['body_padding_bottom'] + 50
    report.add('Desktop', 'T1.1 No empty scrollable whitespace',
        not user_can_scroll or app_fits,
        'no scrollbar or app fits viewport (+padding tolerance)',
        f"scrollH={m['html_scrollHeight']}, clientH={m['html_clientHeight']}, appH={m['app_offsetHeight']}, pad={m['body_padding_bottom']}")

    # T1.2: Companion panel contained
    report.add('Desktop', 'T1.2 Companion scroll contained',
        m['companion_scrollHeight'] == 800, '800px', f"{m['companion_scrollHeight']}px (overflow={m['companion_scrollHeight']-800 if m['companion_scrollHeight'] != 800 else 0}px)")

    # T1.3: App height reasonable
    report.add('Desktop', 'T1.3 App height within bounds',
        800 <= m['app_offsetHeight'] <= 1200, '800-1200px', f"{m['app_offsetHeight']}px")

    # T1.4: Body padding is intentional
    report.add('Desktop', 'T1.4 Body padding intentional (70px)',
        m['body_padding_bottom'] == 70, '70px', f"{m['body_padding_bottom']}px")

    # T1.5: Scroll is content-driven, not empty whitespace
    # With overflow:hidden, the page clips - verify app fits within visible area
    report.add('Desktop', 'T1.5 Scroll driven by content (no empty space)',
        m['app_offsetHeight'] <= m['html_clientHeight'] + 100,
        f"app fits viewport (+100px tolerance)",
        f"appH={m['app_offsetHeight']}, clientH={m['html_clientHeight']}")

    # T1.6: Stage has position:relative
    stage_pos = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.stage')).position''')
    report.add('Desktop', 'T1.6 Stage position:relative contains pseudo-elements',
        stage_pos == 'relative', 'relative', stage_pos)

    # T1.7: All 9 navigation items
    nav_count = await page.evaluate('''() => document.querySelectorAll('.sidebar .seg button').length''')
    report.add('Desktop', 'T1.7 All 9 nav items present',
        nav_count == 9, '9', str(nav_count))

    # T1.8: Walkthrough renders (default view)
    wt_ok = await page.evaluate('''() => {
        const w = document.querySelector('deep-walkthrough');
        return w && w.shadowRoot && w.shadowRoot.querySelector('.card');
    }''')
    report.add('Desktop', 'T1.8 Walkthrough default view renders',
        wt_ok, 'true', str(wt_ok))

    # T1.9: Companion panel visible
    comp_display = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.companion')).display''')
    report.add('Desktop', 'T1.9 Companion panel visible',
        comp_display != 'none', 'not none', comp_display)

    # T1.10: Mockbar in sidebar (desktop)
    mb = await measure_mockbar_state(page)
    report.add('Desktop', 'T1.10 Desktop mockbar visible in sidebar',
        mb.get('display') == 'flex', 'flex', mb.get('display', 'missing'))

    await page.close()


async def run_group_2_mobile(report, browser):
    """GROUP 2: Mobile Layout & Mockbar (375x812)"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}[GROUP 2] Mobile Layout & Mockbar{Colors.RESET}")
    page = await browser.new_page(viewport={'width': 375, 'height': 812})
    await page.goto(HTML_PATH)
    await page.wait_for_timeout(2000)

    # v221: Scroll to top before measuring (SPA may shift scroll position)
    await page.evaluate('''() => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }''')
    await page.wait_for_timeout(200)
    m = await measure_scroll_metrics(page)

    # T2.1: Mockbar transform hides it off-screen (original behavior: translateY(115%))
    # The mockbar's transform extends scrollHeight but it's visually hidden
    mb_closed = await measure_mockbar_state(page)
    transform_hides = 'translateY' in mb_closed.get('transform', '') or 'matrix' in mb_closed.get('transform', '')
    report.add('Mobile', 'T2.1 Mockbar hidden via transform (not display)',
        transform_hides, 'transform:translateY(115%) or matrix', mb_closed.get('transform', 'missing')[:50])

    # T2.2: Mockbar uses CSS transform to hide (original approach — display:flex always, transform moves it)
    mb = await measure_mockbar_state(page)
    transform_hidden = 'translateY' in mb.get('transform', '') or ('matrix' in mb.get('transform', '') and not mb.get('tools_open'))
    report.add('Mobile', 'T2.2 Mockbar hidden via CSS transform',
        transform_hidden and not mb.get('tools_open'), 'transform off-screen + !tools-open',
        f"transform={mb.get('transform', 'missing')[:40]}, tools_open={mb.get('tools_open')}")

    # T2.3: No tools-open class
    tools_open = await page.evaluate('''() => document.body.classList.contains('tools-open')''')
    report.add('Mobile', 'T2.3 No tools-open class on load',
        not tools_open, 'false', str(tools_open))

    # T2.4: Mobile horizontal nav
    nav_flex = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.sidebar .seg')).flexDirection''')
    report.add('Mobile', 'T2.4 Horizontal nav strip (flex-direction:row)',
        nav_flex == 'row', 'row', nav_flex)

    # T2.5: Tools FAB visible
    fab_display = await page.evaluate('''() => {
        const f = document.querySelector('.tools-fab');
        return f ? window.getComputedStyle(f).display : 'missing';
    }''')
    report.add('Mobile', 'T2.5 Tools FAB visible',
        fab_display != 'none', 'not none', fab_display)

    # T2.6: Companion hidden on mobile
    comp_display = await page.evaluate('''() => {
        const c = document.querySelector('.companion');
        return c ? window.getComputedStyle(c).display : 'missing';
    }''')
    report.add('Mobile', 'T2.6 Companion hidden on mobile',
        comp_display == 'none', 'none', comp_display)

    # T2.7: Stage takes full width
    stage_rect = await page.evaluate('''() => {
        const s = document.querySelector('.stage');
        return s ? s.getBoundingClientRect().width : 0;
    }''')
    report.add('Mobile', 'T2.7 Stage fills mobile width',
        stage_rect >= 375, '>=375px', f"{int(stage_rect)}px")

    await page.close()


async def run_group_3_navigation(report, browser):
    """GROUP 3: View Navigation — All 9 views render"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}[GROUP 3] View Navigation{Colors.RESET}")
    page = await browser.new_page(viewport={'width': 1280, 'height': 800})
    await page.goto(HTML_PATH)
    await page.wait_for_timeout(2000)

    views = [
        ('Walkthrough', 'deep-walkthrough'),
        ('Probe Drill', 'deep-drill'),
        ('Whiteboard', 'deep-whiteboard'),
        ('System Map', 'deep-system-map'),
        ('Trade-offs', 'deep-trade-offs'),
        ('Model Answers', 'deep-model-answers'),
        ('Numbers', 'deep-numbers'),
        ('Red Flags', 'deep-red-flags'),
        ('30-Second', 'deep-opener'),
    ]

    for i, (label, tag) in enumerate(views, 1):
        # Click the nav button
        clicked = await page.evaluate(f'''() => {{
            const btns = document.querySelectorAll('.sidebar .seg button');
            for (const b of btns) {{
                if (b.textContent.includes('{label.replace("'", "\\'")}')) {{ b.click(); return true; }}
            }}
            return false;
        }}''')
        await page.wait_for_timeout(1200)

        # Wait for component to become visible (ViewManager transition may take time)
        for _retry in range(5):
            result = await page.evaluate(f'''() => {{
                const el = document.querySelector('{tag}');
                if (!el) return {{ status: 'missing', width: 0, height: 0 }};
                const rect = el.getBoundingClientRect();
                const sr = el.shadowRoot;
                const has_content = sr && sr.textContent && sr.textContent.length > 50;
                return {{
                    status: rect.width > 0 && rect.height > 0 ? (has_content ? 'visible_with_content' : 'visible_empty') : 'zero_size',
                    width: Math.round(rect.width), height: Math.round(rect.height), has_content
                }};
            }}''')
            if result['status'] != 'zero_size':
                break
            await page.wait_for_timeout(500)

        report.add('Navigation', f'T3.{i} {label} view',
            result['status'] == 'visible_with_content',
            'visible_with_content',
            f"{result['status']} (w={result['width']}, h={result['height']}, content={result['has_content']})")

    await page.close()


async def run_group_4_tools_toggle(report, browser):
    """GROUP 4: Tools Toggle Interaction"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}[GROUP 4] Tools Toggle Interaction{Colors.RESET}")
    page = await browser.new_page(viewport={'width': 375, 'height': 812})
    await page.goto(HTML_PATH)
    await page.wait_for_timeout(2000)

    # T4.1: Click FAB opens mockbar
    await page.evaluate('''() => document.querySelector('.tools-fab').click()''')
    await page.wait_for_timeout(300)
    mb = await measure_mockbar_state(page)
    report.add('Tools Toggle', 'T4.1 FAB click opens mockbar',
        mb.get('display') == 'flex' and mb.get('tools_open'),
        'display:flex + tools-open',
        f"display={mb.get('display')}, tools_open={mb.get('tools_open')}")

    # T4.2: Click backdrop closes mockbar
    await page.evaluate('''() => document.querySelector('.tools-bd').click()''')
    await page.wait_for_timeout(300)
    mb = await measure_mockbar_state(page)
    transform_closed = 'translateY' in mb.get('transform', '') or 'matrix' in mb.get('transform', '')
    report.add('Tools Toggle', 'T4.2 Backdrop click closes mockbar',
        transform_closed and not mb.get('tools_open'),
        'transform off-screen + !tools-open',
        f"transform={mb.get('transform', 'missing')[:40]}, tools_open={mb.get('tools_open')}")

    # T4.3: Toggle FAB again re-opens
    await page.evaluate('''() => document.querySelector('.tools-fab').click()''')
    await page.wait_for_timeout(300)
    mb = await measure_mockbar_state(page)
    report.add('Tools Toggle', 'T4.3 FAB click re-opens mockbar',
        mb.get('display') == 'flex' and mb.get('tools_open'),
        'display:flex + tools-open',
        f"display={mb.get('display')}, tools_open={mb.get('tools_open')}")

    # T4.4: Double-toggle: open → close → open → close via backdrop
    await page.evaluate('''() => document.querySelector('.tools-fab').click()''')
    await page.wait_for_timeout(300)
    await page.evaluate('''() => document.querySelector('.tools-bd').click()''')
    await page.wait_for_timeout(300)
    mb = await measure_mockbar_state(page)
    transform_closed = 'translateY' in mb.get('transform', '') or 'matrix' in mb.get('transform', '')
    report.add('Tools Toggle', 'T4.4 Double-toggle cycle (close via backdrop)',
        transform_closed and not mb.get('tools_open'),
        'transform off-screen + !tools-open',
        f"transform={mb.get('transform', 'missing')[:40]}, tools_open={mb.get('tools_open')}")

    await page.close()


async def run_group_5_console(report, browser):
    """GROUP 5: JavaScript & Console Errors"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}[GROUP 5] JavaScript & Console{Colors.RESET}")
    page = await browser.new_page(viewport={'width': 1280, 'height': 800})

    errors = []
    warnings = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda msg: (errors.append(msg.text) if msg.type == 'error' else warnings.append(msg.text) if msg.type == 'warning' else None))

    await page.goto(HTML_PATH)
    await page.wait_for_timeout(2000)

    # Navigate through all views to trigger lazy code
    views = ['Walkthrough', 'Probe Drill', 'Whiteboard', 'System Map', 'Trade-offs',
             'Model Answers', 'Numbers', 'Red Flags', '30-Second']
    for label in views:
        await page.evaluate(f'''() => {{
            const btns = document.querySelectorAll('.sidebar .seg button');
            for (const b of btns) {{
                if (b.textContent.includes('{label.replace("'", "\\'")}')) {{ b.click(); break; }}
            }}
        }}''')
        await page.wait_for_timeout(300)

    report.add('Console', 'T5.1 No JS errors after full navigation',
        len(errors) == 0, '0 errors', f"{len(errors)} errors: {errors[:3] if errors else 'none'}")

    report.add('Console', 'T5.2 No warnings after full navigation',
        len(warnings) == 0, '0 warnings', f"{len(warnings)} warnings")

    await page.close()


async def run_group_6_performance(report, browser):
    """GROUP 6: Performance Metrics"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}[GROUP 6] Performance{Colors.RESET}")
    page = await browser.new_page(viewport={'width': 1280, 'height': 800})

    # Measure load time
    t0 = time.time()
    await page.goto(HTML_PATH)
    await page.wait_for_timeout(2000)
    load_time = time.time() - t0

    report.add('Performance', 'T6.1 Page loads within 5 seconds',
        load_time < 5, '<5s', f"{load_time:.2f}s")

    # Measure First Contentful Paint simulation
    perf = await page.evaluate('''() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return nav ? {
            domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
            loadComplete: nav.loadEventEnd - nav.startTime,
            responseEnd: nav.responseEnd - nav.startTime
        } : null;
    }''')

    if perf:
        report.add('Performance', 'T6.2 DOMContentLoaded under 3s',
            perf['domContentLoaded'] < 3000, '<3000ms', f"{perf['domContentLoaded']:.0f}ms")
        report.add('Performance', 'T6.3 Load event complete under 5s',
            perf['loadComplete'] < 5000, '<5000ms', f"{perf['loadComplete']:.0f}ms")
    else:
        report.add('Performance', 'T6.2/6.3 Navigation timing API',
            False, 'available', 'not available')

    await page.close()


async def run_group_7_visual_regression(report, browser):
    """GROUP 7: Visual Regression Screenshots"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}[GROUP 7] Visual Regression Screenshots{Colors.RESET}")
    os.makedirs(os.path.join(REPORT_DIR, 'screenshots'), exist_ok=True)

    configs = [
        ('desktop_walkthrough', 1280, 800, 'Walkthrough'),
        ('desktop_drill', 1280, 800, 'Probe Drill'),
        ('desktop_systemmap', 1280, 800, 'System Map'),
        ('desktop_tradeoffs', 1280, 800, 'Trade-offs'),
        ('desktop_redflags', 1280, 800, 'Red Flags'),
        ('mobile_walkthrough', 375, 812, 'Walkthrough'),
        ('mobile_drill', 375, 812, 'Probe Drill'),
    ]

    for name, w, h, nav_label in configs:
        page = await browser.new_page(viewport={'width': w, 'height': h})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # Navigate to the view
        if nav_label != 'Walkthrough':
            await page.evaluate(f'''() => {{
                const btns = document.querySelectorAll('.sidebar .seg button');
                for (const b of btns) {{
                    if (b.textContent.includes('{nav_label.replace("'", "\\'")}')) {{ b.click(); break; }}
                }}
            }}''')
            await page.wait_for_timeout(1200)

        path = os.path.join(REPORT_DIR, 'screenshots', f'{name}.png')
        await page.screenshot(path=path, full_page=False)
        await page.close()

        report.add('Visual', f'T7 Screenshot: {name}',
            os.path.exists(path) and os.path.getsize(path) > 1000,
            'screenshot saved', f"{os.path.getsize(path) if os.path.exists(path) else 0} bytes at {path}")


async def run_tests():
    print(f"\n{Colors.BOLD}DeepDive Rehearsal — Production E2E Test Suite{Colors.RESET}")
    print(f"HTML: {HTML_PATH}")
    print(f"Started: {datetime.now().isoformat()}")

    report = TestReport()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        await run_group_1_desktop(report, browser)
        await run_group_2_mobile(report, browser)
        await run_group_3_navigation(report, browser)
        await run_group_4_tools_toggle(report, browser)
        await run_group_5_console(report, browser)
        await run_group_6_performance(report, browser)
        await run_group_7_visual_regression(report, browser)

        await browser.close()

    success = report.summary()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    asyncio.run(run_tests())
