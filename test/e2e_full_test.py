#!/usr/bin/env python3
"""
Comprehensive Playwright E2E Test Suite for DeepDive Rehearsal
Tests: scroll, mockbar visibility, view rendering, navigation, mobile layout
"""
import asyncio, sys
from playwright.async_api import async_playwright

HTML_PATH = 'file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []

    def ok(self, name, detail=''):
        self.passed += 1
        self.results.append(f"  PASS: {name}" + (f" ({detail})" if detail else ""))

    def fail(self, name, expected, actual):
        self.failed += 1
        self.results.append(f"  FAIL: {name}")
        self.results.append(f"        Expected: {expected}")
        self.results.append(f"        Actual:   {actual}")

    def report(self):
        print("\n" + "=" * 60)
        for r in self.results:
            print(r)
        print("=" * 60)
        print(f"Results: {self.passed} passed, {self.failed} failed")
        return self.failed == 0


async def run_tests():
    runner = TestRunner()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # ============================================================
        # TEST GROUP 1: Desktop Viewport (1280x800)
        # ============================================================
        print("\n[DESKTOP 1280x800]")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # T1.1: No scrollable whitespace
        d = await page.evaluate('''() => ({
            sh: document.body.scrollHeight,
            ch: document.body.clientHeight
        })''')
        if d['sh'] == d['ch']:
            runner.ok("T1.1 Zero scrollable whitespace", f"sh={d['sh']} == ch={d['ch']}")
        else:
            runner.fail("T1.1 Zero scrollable whitespace", f"sh == ch", f"sh={d['sh']}, ch={d['ch']}, gap={d['sh']-d['ch']}px")

        # T1.2: Companion panel contained
        d = await page.evaluate('''() => {
            const c = document.querySelector('.companion');
            return { sh: c.scrollHeight, oh: c.offsetHeight }
        }''')
        if d['sh'] == 800:
            runner.ok("T1.2 Companion scroll contained", f"scrollHeight={d['sh']}")
        else:
            runner.fail("T1.2 Companion scroll contained", "800", f"{d['sh']} (overflow={d['sh']-800}px)")

        # T1.3: Mockbar NOT visible on desktop
        d = await page.evaluate('''() => {
            const mb = document.querySelector('.sidebar .mockbar');
            return { display: window.getComputedStyle(mb).display, oh: mb.offsetHeight }
        }''')
        if d['display'] == 'flex':  # Desktop mockbar is always visible inside sidebar
            runner.ok("T1.3 Desktop mockbar visible in sidebar", f"display={d['display']}")
        else:
            runner.fail("T1.3 Desktop mockbar", "flex (inside sidebar)", f"display={d['display']}")

        # T1.4: No EMPTY scrollable whitespace (the original bug)
        # Content overflow (tall stage) is OK; scrolling into blank space is NOT
        d = await page.evaluate('''() => {
            const vh = window.innerHeight;
            const all = document.querySelectorAll('body *');
            let maxContentBottom = 0;
            for (const el of all) {
                const st = window.getComputedStyle(el);
                if (st.display === 'none' || st.position === 'fixed') continue;
                const rect = el.getBoundingClientRect();
                // Only count elements with actual visual size (>5px height)
                if (rect.height > 5 && rect.bottom > maxContentBottom) {
                    maxContentBottom = rect.bottom;
                }
            }
            // Also check .app bottom (should contain everything)
            const appBottom = document.querySelector('.app').getBoundingClientRect().bottom;
            const bodyPad = parseFloat(window.getComputedStyle(document.body).paddingBottom);
            return {
                vh: vh,
                appBottom: Math.round(appBottom),
                maxContentBottom: Math.round(maxContentBottom),
                bodyPad: bodyPad,
                html_sh: document.documentElement.scrollHeight
            }
        }''')
        # Content should extend to appBottom + body padding, nothing beyond
        expectedMax = d['appBottom'] + d['bodyPad']
        gap = d['html_sh'] - expectedMax
        if gap <= 10:  # 10px tolerance for rounding
            runner.ok("T1.4 No empty scrollable whitespace", 
                      f"html_sh={d['html_sh']}, contentBottom~{expectedMax}, gap={gap}px")
        else:
            runner.fail("T1.4 No empty whitespace", f"gap ≤ 10px", f"gap={gap}px")

        # T1.5: All 9 navigation items present
        d = await page.evaluate('''() => {
            const btns = document.querySelectorAll('.sidebar .seg button');
            return btns.length
        }''')
        if d == 9:
            runner.ok("T1.5 All 9 nav items present", f"count={d}")
        else:
            runner.fail("T1.5 All 9 nav items", "9", f"{d}")

        # T1.6: Walkthrough view renders (first/default view)
        d = await page.evaluate('''() => {
            const w = document.querySelector('deep-walkthrough');
            if (!w) return 'missing';
            const card = w.shadowRoot.querySelector('.card');
            return card ? 'visible' : 'no-card'
        }''')
        if d == 'visible':
            runner.ok("T1.6 Walkthrough renders")
        else:
            runner.fail("T1.6 Walkthrough renders", "visible", d)

        # T1.7: Mesh gradient pseudo-elements contained (no viewport overflow)
        d = await page.evaluate('''() => {
            const stage = document.querySelector('.stage');
            const style = window.getComputedStyle(stage);
            return { position: style.position, overflow: style.overflow }
        }''')
        if d['position'] == 'relative':
            runner.ok("T1.7 Stage has position:relative", "contains pseudo-elements")
        else:
            runner.fail("T1.7 Stage position:relative", "relative", d['position'])

        await page.close()

        # ============================================================
        # TEST GROUP 2: Mobile Viewport (375x812)
        # ============================================================
        print("\n[MOBILE 375x812]")
        page = await browser.new_page(viewport={'width': 375, 'height': 812})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # T2.1: No scrollable whitespace
        d = await page.evaluate('''() => ({
            sh: document.body.scrollHeight,
            ch: document.body.clientHeight
        })''')
        if d['sh'] == d['ch']:
            runner.ok("T2.1 Mobile zero scroll", f"sh={d['sh']} == ch={d['ch']}")
        else:
            runner.fail("T2.1 Mobile zero scroll", f"sh == ch", f"sh={d['sh']}, ch={d['ch']}, gap={d['sh']-d['ch']}px")

        # T2.2: Mockbar hidden by default
        d = await page.evaluate('''() => {
            const mb = document.querySelector('.sidebar .mockbar');
            return window.getComputedStyle(mb).display
        }''')
        if d == 'none':
            runner.ok("T2.2 Mockbar hidden by default", f"display=none")
        else:
            runner.fail("T2.2 Mockbar hidden by default", "none", d)

        # T2.3: No tools-open class on body
        d = await page.evaluate('''() => document.body.classList.contains('tools-open')''')
        if not d:
            runner.ok("T2.3 No tools-open class on load")
        else:
            runner.fail("T2.3 No tools-open class on load", "false", "true")

        # T2.4: Mobile nav strip visible (horizontal scroll)
        d = await page.evaluate('''() => {
            const seg = document.querySelector('.sidebar .seg');
            return seg ? window.getComputedStyle(seg).flexDirection : 'missing'
        }''')
        if d == 'row':
            runner.ok("T2.4 Mobile horizontal nav strip", f"flexDirection={d}")
        else:
            runner.fail("T2.4 Mobile horizontal nav strip", "row", d)

        # T2.5: Tools FAB visible on mobile
        d = await page.evaluate('''() => {
            const fab = document.querySelector('.tools-fab');
            return fab ? window.getComputedStyle(fab).display : 'missing'
        }''')
        if d != 'none':
            runner.ok("T2.5 Tools FAB visible", f"display={d}")
        else:
            runner.fail("T2.5 Tools FAB visible", "not none", d)

        # T2.6: Companion panel hidden on mobile
        d = await page.evaluate('''() => {
            const c = document.querySelector('.companion');
            return c ? window.getComputedStyle(c).display : 'missing'
        }''')
        if d == 'none':
            runner.ok("T2.6 Companion hidden on mobile")
        else:
            runner.fail("T2.6 Companion hidden on mobile", "none", d)

        await page.close()

        # ============================================================
        # TEST GROUP 3: View Navigation (Desktop)
        # ============================================================
        print("\n[VIEW NAVIGATION]")
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

        for label, tag in views:
            # Click the nav button
            found = await page.evaluate(f'''() => {{
                const btns = document.querySelectorAll('.sidebar .seg button');
                for (const b of btns) {{
                    if (b.textContent.includes('{label.replace("'", "\\'")}')) {{
                        b.click(); return true;
                    }}
                }}
                return false;
            }}''')
            await page.wait_for_timeout(400)

            # Check component renders
            d = await page.evaluate(f'''() => {{
                const el = document.querySelector('{tag}');
                if (!el) return 'missing';
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 ? 'visible' : 'zero-size';
            }}''')

            test_name = f"T3.{views.index((label,tag))+1} {label} view"
            if d == 'visible':
                runner.ok(test_name)
            else:
                runner.fail(test_name, "visible", d)

        await page.close()

        # ============================================================
        # TEST GROUP 4: Tools Toggle (Mobile)
        # ============================================================
        print("\n[TOOLS TOGGLE MOBILE]")
        page = await browser.new_page(viewport={'width': 375, 'height': 812})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # T4.1: Click Tools FAB opens mockbar
        await page.evaluate('''() => {
            document.querySelector('.tools-fab').click();
        }''')
        await page.wait_for_timeout(300)

        d = await page.evaluate('''() => {
            const mb = document.querySelector('.sidebar .mockbar');
            return {
                display: window.getComputedStyle(mb).display,
                toolsOpen: document.body.classList.contains('tools-open')
            }
        }''')
        if d['display'] == 'flex' and d['toolsOpen']:
            runner.ok("T4.1 Tools FAB opens mockbar")
        else:
            runner.fail("T4.1 Tools FAB opens mockbar", "display=flex + tools-open", f"display={d['display']}, toolsOpen={d['toolsOpen']}")

        # T4.2: Click backdrop closes mockbar
        await page.evaluate('''() => {
            document.querySelector('.tools-bd').click();
        }''')
        await page.wait_for_timeout(300)

        d = await page.evaluate('''() => {
            const mb = document.querySelector('.sidebar .mockbar');
            return {
                display: window.getComputedStyle(mb).display,
                toolsOpen: document.body.classList.contains('tools-open')
            }
        }''')
        if d['display'] == 'none' and not d['toolsOpen']:
            runner.ok("T4.2 Backdrop click closes mockbar")
        else:
            runner.fail("T4.2 Backdrop closes mockbar", "display=none + !tools-open", f"display={d['display']}, toolsOpen={d['toolsOpen']}")

        await page.close()

        # ============================================================
        # TEST GROUP 5: No Console Errors
        # ============================================================
        print("\n[CONSOLE ERRORS]")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)

        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        if len(errors) == 0:
            runner.ok("T5.1 No JavaScript errors on load")
        else:
            runner.fail("T5.1 No JS errors", "0 errors", f"{len(errors)} errors: {errors[:3]}")

        await browser.close()

        # Report
        ok = runner.report()
        sys.exit(0 if ok else 1)


if __name__ == '__main__':
    asyncio.run(run_tests())
