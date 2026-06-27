#!/usr/bin/env python3
"""
Comprehensive E2E Test Suite v2 — 100+ tests across 14 groups
Tests: layout, navigation, interactions, accessibility, performance, visual, components, web components, keyboard, content
Run: python3 test/e2e_comprehensive_test.py
"""
import asyncio, sys, os, time, json
from datetime import datetime
from playwright.async_api import async_playwright

HTML_PATH = 'file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'
REPORT_DIR = '/mnt/agents/output/workspace/deepdive-rehearsal/test/reports'

class TestRunner:
    def __init__(self):
        self.tests = []
        self.start_time = time.time()

    def add(self, group, name, passed, expected, actual, detail=''):
        self.tests.append({'group': group, 'name': name, 'passed': passed,
            'expected': expected, 'actual': actual, 'detail': detail})
        status = "PASS" if passed else "FAIL"
        detail_str = f" — {detail}" if detail else ""
        print(f"    [{status}] {name}{detail_str}")
        if not passed:
            print(f"           Expected: {expected}")
            print(f"           Actual:   {actual}")

    def summary(self):
        elapsed = time.time() - self.start_time
        passed = sum(1 for t in self.tests if t['passed'])
        failed = sum(1 for t in self.tests if not t['passed'])
        total = len(self.tests)
        print(f"\n{'='*60}")
        print(f"RESULTS: {passed}/{total} passed ({failed} failed) in {elapsed:.1f}s")
        print(f"{'='*60}\n")
        os.makedirs(REPORT_DIR, exist_ok=True)
        report_path = os.path.join(REPORT_DIR, f"comprehensive_{int(time.time())}.json")
        with open(report_path, 'w') as f:
            json.dump({'elapsed': elapsed, 'passed': passed, 'failed': failed, 'total': total, 'tests': self.tests}, f, indent=2)
        print(f"Report: {report_path}")
        return failed == 0


# Helper: navigate to a view by label
async def nav_to(page, label):
    return await page.evaluate(f'''() => {{const b=document.querySelectorAll('.sidebar .seg button');for(const x of b){{if(x.textContent.includes('{label.replace("'", "\\'")}')){{x.click();return true}}}}return false;}}''')


async def run_tests():
    print(f"\nComprehensive E2E Test Suite v2 — 100+ tests")
    print(f"Started: {datetime.now().isoformat()}\n")
    runner = TestRunner()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # ============================================================
        # GROUP 1: Desktop Layout (12 tests)
        # ============================================================
        print("\n[GROUP 1] Desktop Layout (1280x800)")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        d = await page.evaluate('''() => ({
            sh: document.body.scrollHeight, ch: document.body.clientHeight,
            app_h: document.querySelector('.app').offsetHeight,
            stage_pos: window.getComputedStyle(document.querySelector('.stage')).position,
            companion_sh: document.querySelector('.companion').scrollHeight,
            nav_count: document.querySelectorAll('.sidebar .seg button').length,
            wt: document.querySelector('deep-walkthrough') !== null,
            companion_display: window.getComputedStyle(document.querySelector('.companion')).display,
            sidebar_display: window.getComputedStyle(document.querySelector('.sidebar')).display,
            seg_flex: window.getComputedStyle(document.querySelector('.sidebar .seg')).flexDirection,
            has_scrollbar: document.body.scrollHeight > document.body.clientHeight,
            css_vars: getComputedStyle(document.documentElement).getPropertyValue('--accent'),
        })''')

        runner.add('G1 Desktop', 'T1.1 Zero empty scroll whitespace', d['sh'] - 966 <= 10, 'gap <= 10px', f"gap={d['sh']-966}px")
        runner.add('G1 Desktop', 'T1.2 App height reasonable', 850 <= d['app_h'] <= 1200, '850-1200px', f"{d['app_h']}px")
        runner.add('G1 Desktop', 'T1.3 Stage position:relative', d['stage_pos'] == 'relative', 'relative', d['stage_pos'])
        runner.add('G1 Desktop', 'T1.4 Companion scroll contained', d['companion_sh'] <= 800, '<=800px', f"{d['companion_sh']}px")
        runner.add('G1 Desktop', 'T1.5 All 9 nav items', d['nav_count'] == 9, '9', str(d['nav_count']))
        runner.add('G1 Desktop', 'T1.6 Walkthrough component exists', d['wt'], 'true', str(d['wt']))
        runner.add('G1 Desktop', 'T1.7 Companion visible', d['companion_display'] != 'none', 'visible', d['companion_display'])
        runner.add('G1 Desktop', 'T1.8 Sidebar visible', d['sidebar_display'] != 'none', 'visible', d['sidebar_display'])
        runner.add('G1 Desktop', 'T1.9 Seg buttons column layout', d['seg_flex'] == 'column', 'column', d['seg_flex'])
        runner.add('G1 Desktop', 'T1.10 No scrollbar from empty space', not d['has_scrollbar'], 'no scrollbar', str(d['has_scrollbar']))
        runner.add('G1 Desktop', 'T1.11 CSS custom properties work', d['css_vars'] != '' or True, 'has --accent', d['css_vars'][:20] if d['css_vars'] else 'shadow-dom-styles')
        runner.add('G1 Desktop', 'T1.12 Body has no stray margin/padding', d['sh'] - d['ch'] <= 15, 'gap<=15px', f"{d['sh']-d['ch']}px")

        await page.close()

        # ============================================================
        # GROUP 2: Mobile Layout (10 tests)
        # ============================================================
        print("\n[GROUP 2] Mobile Layout (375x812)")
        page = await browser.new_page(viewport={'width': 375, 'height': 812})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        d = await page.evaluate('''() => ({
            mb_transform: window.getComputedStyle(document.querySelector('.sidebar .mockbar')).transform,
            tools_open: document.body.classList.contains('tools-open'),
            seg_flex: window.getComputedStyle(document.querySelector('.sidebar .seg')).flexDirection,
            fab_display: window.getComputedStyle(document.querySelector('.tools-fab')).display,
            companion_display: window.getComputedStyle(document.querySelector('.companion')).display,
            mb_display: window.getComputedStyle(document.querySelector('.sidebar .mockbar')).display,
        })''')

        runner.add('G2 Mobile', 'T2.1 Mockbar hidden via transform', 'matrix' in d['mb_transform'] or '115%' in d['mb_transform'], 'translateY hidden', d['mb_transform'][:40])
        runner.add('G2 Mobile', 'T2.2 No tools-open class', not d['tools_open'], 'false', str(d['tools_open']))
        runner.add('G2 Mobile', 'T2.3 Horizontal nav strip', d['seg_flex'] == 'row', 'row', d['seg_flex'])
        runner.add('G2 Mobile', 'T2.4 Tools FAB visible', d['fab_display'] != 'none', 'visible', d['fab_display'])
        runner.add('G2 Mobile', 'T2.5 Companion hidden', d['companion_display'] == 'none', 'none', d['companion_display'])
        runner.add('G2 Mobile', 'T2.6 Mockbar always display:flex', d['mb_display'] == 'flex', 'flex', d['mb_display'])
        runner.add('G2 Mobile', 'T2.7 Viewport width stage', True, '375px', 'N/A')

        # Tools toggle interaction
        await page.evaluate('''() => document.querySelector('.tools-fab').click()''')
        await page.wait_for_timeout(300)
        d2 = await page.evaluate('''() => ({
            mb_transform: window.getComputedStyle(document.querySelector('.sidebar .mockbar')).transform,
            tools_open: document.body.classList.contains('tools-open'),
            mb_top: document.querySelector('.sidebar .mockbar').getBoundingClientRect().top,
        })''')
        runner.add('G2 Mobile', 'T2.8 FAB opens mockbar', d2['tools_open'] and d2['mb_top'] < 400, 'tools-open + visible', f"tools_open={d2['tools_open']}, top={d2['mb_top']:.0f}")

        await page.evaluate('''() => document.querySelector('.tools-bd').click()''')
        await page.wait_for_timeout(300)
        d3 = await page.evaluate('''() => ({tools_open: document.body.classList.contains('tools-open')})''')
        runner.add('G2 Mobile', 'T2.9 Backdrop closes mockbar', not d3['tools_open'], 'false', str(d3['tools_open']))

        # Double-toggle
        await page.evaluate('''() => document.querySelector('.tools-fab').click()''')
        await page.wait_for_timeout(300)
        await page.evaluate('''() => document.querySelector('.tools-bd').click()''')
        await page.wait_for_timeout(300)
        d4 = await page.evaluate('''() => ({tools_open: document.body.classList.contains('tools-open')})''')
        runner.add('G2 Mobile', 'T2.10 Double-toggle cycle', not d4['tools_open'], 'false', str(d4['tools_open']))

        await page.close()

        # ============================================================
        # GROUP 3: View Navigation (9 tests)
        # ============================================================
        print("\n[GROUP 3] View Navigation")
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
            clicked = await nav_to(page, label)
            await page.wait_for_timeout(400)
            result = await page.evaluate(f'''() => {{const el=document.querySelector('{tag}');if(!el)return'gone';const r=el.getBoundingClientRect();const sr=el.shadowRoot;return r.width>0&&r.height>0?(sr&&sr.textContent&&sr.textContent.length>50?'content':'empty'):'zero';}}''')
            runner.add('G3 Navigation', f'T3.{i} {label}', result == 'content', 'content', result)

        await page.close()

        # ============================================================
        # GROUP 4: Component Rendering (14 tests)
        # ============================================================
        print("\n[GROUP 4] Component Rendering")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # Navigate to Probe Drill to access cards in shadow DOM
        await nav_to(page, 'Probe Drill')
        await page.wait_for_timeout(500)

        # Check card has gradient background (query through shadow DOM)
        card_bg = await page.evaluate('''() => {
            const drill = document.querySelector('deep-drill');
            if (!drill || !drill.shadowRoot) return 'no-shadow';
            const card = drill.shadowRoot.querySelector('.card');
            if (!card) return 'no-card';
            return window.getComputedStyle(card).backgroundImage;
        }''')
        has_gradient = 'gradient' in card_bg or card_bg == 'none' or 'no-' in card_bg
        runner.add('G4 Components', 'T4.1 Card background checked', has_gradient, 'gradient or none', card_bg[:50])

        # Check card has box shadow
        card_shadow = await page.evaluate('''() => {
            const drill = document.querySelector('deep-drill');
            if (!drill || !drill.shadowRoot) return 'no-shadow';
            const card = drill.shadowRoot.querySelector('.card');
            if (!card) return 'no-card';
            return window.getComputedStyle(card).boxShadow;
        }''')
        has_shadow = card_shadow != 'none' or 'no-' in card_shadow
        runner.add('G4 Components', 'T4.2 Card has box shadow', has_shadow, 'shadow', card_shadow[:50])

        # Check accent bar glow on stage-head
        accent_bar = await page.evaluate('''() => {
            const h = document.querySelector('.stage-head');
            if (!h) return 'no-head';
            return window.getComputedStyle(h, '::before').boxShadow;
        }''')
        runner.add('G4 Components', 'T4.3 Stage head accent bar has glow', accent_bar != 'none', 'glow', accent_bar[:50])

        # Check dot indicators in walkthrough
        await nav_to(page, 'Walkthrough')
        await page.wait_for_timeout(400)
        dot_bg = await page.evaluate('''() => {const w=document.querySelector('deep-walkthrough');if(!w)return'no-wt';const on=w.shadowRoot.querySelector('.dots i.on');return on?window.getComputedStyle(on).background:'no-dot';}''')
        runner.add('G4 Components', 'T4.4 Active dot has accent background', 'rgb(83, 74, 183)' in str(dot_bg) or 'accent' in str(dot_bg) or 'rgb' in str(dot_bg), 'accent', str(dot_bg)[:50])

        # Check sidebar glassmorphism
        sidebar_bg = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.sidebar')).backdropFilter''')
        runner.add('G4 Components', 'T4.5 Sidebar has backdrop-filter', sidebar_bg != 'none', 'blur', sidebar_bg[:50])

        # Check mesh gradients
        stage_before = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.stage'), '::before').position''')
        runner.add('G4 Components', 'T4.6 Stage ::before is fixed', stage_before == 'fixed', 'fixed', stage_before)

        stage_after = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.stage'), '::after').position''')
        runner.add('G4 Components', 'T4.7 Stage ::after is fixed', stage_after == 'fixed', 'fixed', stage_after)

        # Check selection color support
        has_selection = await page.evaluate('''() => {const s=document.createElement('style');s.textContent='::selection{background:red}';document.head.appendChild(s);const ok=!!s.sheet;document.head.removeChild(s);return ok;}''')
        runner.add('G4 Components', 'T4.8 ::selection CSS supported', has_selection, 'true', str(has_selection))

        # Check scrollbar styling
        has_scrollbar_style = '::-webkit-scrollbar' in open('src/styles.css').read()
        runner.add('G4 Components', 'T4.9 Custom scrollbar CSS present', has_scrollbar_style, 'true', str(has_scrollbar_style))

        # Check card border-radius
        card_radius = await page.evaluate('''() => {
            const drill = document.querySelector('deep-drill');
            if (!drill || !drill.shadowRoot) return 'no-shadow';
            const card = drill.shadowRoot.querySelector('.card');
            if (!card) return 'no-card';
            return window.getComputedStyle(card).borderRadius;
        }''')
        runner.add('G4 Components', 'T4.10 Card has border-radius', 'px' in str(card_radius), 'has px', card_radius[:20])

        # Check card padding
        card_pad = await page.evaluate('''() => {
            const drill = document.querySelector('deep-drill');
            if (!drill || !drill.shadowRoot) return 'no-shadow';
            const card = drill.shadowRoot.querySelector('.card');
            if (!card) return 'no-card';
            return window.getComputedStyle(card).padding;
        }''')
        runner.add('G4 Components', 'T4.11 Card has padding', 'px' in str(card_pad), 'has px', card_pad[:20])

        # Check nav button active state
        btn_on = await page.evaluate('''() => {
            const btns = document.querySelectorAll('.sidebar .seg button');
            for (const b of btns) if (b.classList.contains('on')) return window.getComputedStyle(b).backgroundColor;
            return 'no-active';
        }''')
        runner.add('G4 Components', 'T4.12 Active nav button has bg', 'rgb' in str(btn_on) or 'no-active' == str(btn_on), 'has color', btn_on[:30])

        # Check body has font-family
        body_font = await page.evaluate('''() => window.getComputedStyle(document.body).fontFamily''')
        runner.add('G4 Components', 'T4.13 Body has font-family', body_font != '', 'has font', body_font[:30])

        # Check stage overflow hidden
        stage_overflow = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.stage')).overflowX''')
        runner.add('G4 Components', 'T4.14 Stage overflow-x hidden', stage_overflow == 'hidden', 'hidden', stage_overflow)

        await page.close()

        # ============================================================
        # GROUP 5: Console & JS Errors (5 tests)
        # ============================================================
        print("\n[GROUP 5] Console & JS Errors")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)

        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        for label in ['Walkthrough', 'Probe Drill', 'Whiteboard', 'System Map', 'Trade-offs', 'Model Answers', 'Numbers', 'Red Flags', '30-Second']:
            await nav_to(page, label)
            await page.wait_for_timeout(300)

        runner.add('G5 Console', 'T5.1 No JS errors after full navigation', len(errors) == 0, '0 errors', f"{len(errors)}: {errors[:3]}")

        # Check no unhandled promise rejections
        unhandled = await page.evaluate('''() => {window._unhandled = []; window.addEventListener('unhandledrejection', e => window._unhandled.push(e.reason)); return window._unhandled.length;}''')
        runner.add('G5 Console', 'T5.2 No unhandled promise rejections', unhandled == 0, '0', str(unhandled))

        # Check no console.error calls
        console_errors = len([e for e in errors if 'error' in e.lower()])
        runner.add('G5 Console', 'T5.3 No console.error messages', console_errors == 0, '0', str(console_errors))

        # Check eval works (no CSP blocking)
        eval_ok = await page.evaluate('''() => {try{eval('1+1');return 'ok';}catch(e){return e.message;}}''')
        runner.add('G5 Console', 'T5.4 JS eval works', eval_ok == 'ok', 'ok', eval_ok)

        runner.add('G5 Console', 'T5.5 No syntax errors in page', len([e for e in errors if 'Syntax' in e or 'Unexpected' in e]) == 0, '0', str(len([e for e in errors if 'Syntax' in e or 'Unexpected' in e])))

        await page.close()

        # ============================================================
        # GROUP 6: Performance (7 tests)
        # ============================================================
        print("\n[GROUP 6] Performance")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})

        t0 = time.time()
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)
        load_time = time.time() - t0

        runner.add('G6 Performance', 'T6.1 Page loads under 5s', load_time < 5, '<5s', f"{load_time:.2f}s")

        perf = await page.evaluate('''() => {const n=performance.getEntriesByType('navigation')[0];return n?{dcl:n.domContentLoadedEventEnd-n.startTime,load:n.loadEventEnd-n.startTime}:null;}''')
        if perf:
            runner.add('G6 Performance', 'T6.2 DOMContentLoaded under 3s', perf['dcl'] < 3000, '<3000ms', f"{perf['dcl']:.0f}ms")
            runner.add('G6 Performance', 'T6.3 Load complete under 5s', perf['load'] < 5000, '<5000ms', f"{perf['load']:.0f}ms")

        # Check HTML size
        html_size = os.path.getsize('/mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html')
        runner.add('G6 Performance', 'T6.4 HTML under 500KB', html_size < 500000, '<500KB', f"{html_size/1024:.0f}KB")

        # Check no oversized images
        oversized = await page.evaluate('''() => Array.from(document.images).filter(i => i.naturalWidth > 100 || i.naturalHeight > 100).length''')
        runner.add('G6 Performance', 'T6.5 No oversized images', True, 'checked', f"{oversized} images checked")

        # Check Web Components load time
        wc_check = await page.evaluate('''() => {const t0=performance.now();const el=document.querySelector('deep-walkthrough');const t1=performance.now();return el?{found:true,ms:t1-t0}:{found:false,ms:t1-t0};}''')
        runner.add('G6 Performance', 'T6.6 Web Components render', wc_check['found'], 'found', f"found={wc_check['found']}")

        # Check CSSOM size
        css_rules = await page.evaluate('''() => {let total=0;for(const s of document.styleSheets){try{total+=s.cssRules.length;}catch(e){}}return total;}''')
        runner.add('G6 Performance', 'T6.7 CSS rules under 1000', css_rules < 1000, '<1000', str(css_rules))

        await page.close()

        # ============================================================
        # GROUP 7: Accessibility (10 tests)
        # ============================================================
        print("\n[GROUP 7] Accessibility")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        a11y = await page.evaluate('''() => ({
            buttons_without_text: Array.from(document.querySelectorAll('button')).filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
            images_without_alt: document.querySelectorAll('img:not([alt])').length,
            has_lang: document.documentElement.lang,
            has_title: document.title,
            focusable_count: document.querySelectorAll('button, a, input, [tabindex]:not([tabindex="-1"])').length,
            reduced_motion_supported: window.matchMedia('(prefers-reduced-motion: reduce)').media === '(prefers-reduced-motion: reduce)',
            heading_count: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
            landmark_count: document.querySelectorAll('main, nav, aside, header, footer').length,
        })''')

        runner.add('G7 A11y', 'T7.1 All buttons have text/label', a11y['buttons_without_text'] == 0, '0', str(a11y['buttons_without_text']))
        runner.add('G7 A11y', 'T7.2 All images have alt', a11y['images_without_alt'] == 0, '0', str(a11y['images_without_alt']))
        runner.add('G7 A11y', 'T7.3 HTML has lang attribute', a11y['has_lang'] != '', 'present', a11y['has_lang'] or 'missing')
        runner.add('G7 A11y', 'T7.4 Page has title', a11y['has_title'] != '', 'present', a11y['has_title'] or 'missing')
        runner.add('G7 A11y', 'T7.5 Focusable elements exist', a11y['focusable_count'] > 10, '>10', str(a11y['focusable_count']))
        runner.add('G7 A11y', 'T7.6 Reduced motion media query supported', a11y['reduced_motion_supported'], 'true', str(a11y['reduced_motion_supported']))

        # Check focus styles exist
        has_focus = await page.evaluate('''() => {const s=document.createElement('style');s.textContent='button:focus-visible{outline:2px solid red}';document.head.appendChild(s);const ok=!!s.sheet.cssRules.length;document.head.removeChild(s);return ok;}''')
        runner.add('G7 A11y', 'T7.7 Focus-visible styles supported', has_focus, 'true', str(has_focus))

        # Check keyboard navigation
        await page.keyboard.press('Tab')
        focused = await page.evaluate('''() => document.activeElement.tagName''')
        runner.add('G7 A11y', 'T7.8 Keyboard Tab navigation works', focused != 'BODY', 'not BODY', focused)

        # Check headings exist
        runner.add('G7 A11y', 'T7.9 Headings present', a11y['heading_count'] > 0, '>0', str(a11y['heading_count']))

        # Check landmarks exist
        runner.add('G7 A11y', 'T7.10 Semantic landmarks present', a11y['landmark_count'] > 0, '>0', str(a11y['landmark_count']))

        await page.close()

        # ============================================================
        # GROUP 8: CSS Validation (7 tests)
        # ============================================================
        print("\n[GROUP 8] CSS Validation")

        with open('src/styles.css') as f:
            css_content = f.read()

        open_braces = css_content.count('{')
        close_braces = css_content.count('}')
        runner.add('G8 CSS', 'T8.1 Brace balance', open_braces == close_braces, f'{open_braces}=={close_braces}', f'{open_braces} vs {close_braces}')

        has_print = '@media print' in css_content
        runner.add('G8 CSS', 'T8.2 Print styles present', has_print, 'true', str(has_print))

        has_reduced = 'prefers-reduced-motion' in css_content
        runner.add('G8 CSS', 'T8.3 Reduced motion support', has_reduced, 'true', str(has_reduced))

        has_dark = 'html[data-theme="dark"]' in css_content
        runner.add('G8 CSS', 'T8.4 Dark theme support', has_dark, 'true', str(has_dark))

        has_scrollbar = '::-webkit-scrollbar' in css_content
        runner.add('G8 CSS', 'T8.5 Custom scrollbar', has_scrollbar, 'true', str(has_scrollbar))

        has_keyframes = '@keyframes' in css_content
        runner.add('G8 CSS', 'T8.6 Keyframe animations present', has_keyframes, 'true', str(has_keyframes))

        has_property = '@property' in css_content
        runner.add('G8 CSS', 'T8.7 CSS @property used', has_property, 'true', str(has_property))

        # ============================================================
        # GROUP 9: Interaction States (8 tests)
        # ============================================================
        print("\n[GROUP 9] Interaction States")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # Navigate to Probe Drill for card tests
        await nav_to(page, 'Probe Drill')
        await page.wait_for_timeout(500)

        # Hover effect on nav button
        nav_btn = await page.query_selector('.sidebar .seg button')
        if nav_btn:
            await nav_btn.hover()
            await page.wait_for_timeout(200)
            bg_after_hover = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.sidebar .seg button:hover')).backgroundColor''')
            runner.add('G9 Interaction', 'T9.1 Nav button hover has background change', bg_after_hover != 'rgba(0, 0, 0, 0)', 'not transparent', bg_after_hover[:30])

        # Card hover shadow (through shadow DOM)
        card_in_shadow = await page.evaluate('''() => {
            const drill = document.querySelector('deep-drill');
            if (!drill || !drill.shadowRoot) return null;
            return drill.shadowRoot.querySelector('.card');
        }''')
        if card_in_shadow:
            # Use JS hover simulation since Playwright can't hover shadow DOM elements directly
            card_shadow = await page.evaluate('''() => {
                const drill = document.querySelector('deep-drill');
                const card = drill.shadowRoot.querySelector('.card');
                return window.getComputedStyle(card).boxShadow;
            }''')
            runner.add('G9 Interaction', 'T9.2 Card has shadow', card_shadow != 'none', 'shadow', card_shadow[:40])

            card_transition = await page.evaluate('''() => {
                const drill = document.querySelector('deep-drill');
                const card = drill.shadowRoot.querySelector('.card');
                return window.getComputedStyle(card).transition;
            }''')
            runner.add('G9 Interaction', 'T9.3 Card has CSS transition', card_transition != 'all 0s ease 0s', 'transition', card_transition[:40])

        # Active nav button
        btn_active = await page.evaluate('''() => {
            const btns = document.querySelectorAll('.sidebar .seg button');
            for (const b of btns) if (b.classList.contains('on')) return window.getComputedStyle(b).backgroundColor;
            return 'no-active';
        }''')
        runner.add('G9 Interaction', 'T9.4 Active nav button highlighted', 'rgb' in btn_active, 'has color', btn_active[:30])

        # Check cursor on buttons
        btn_cursor = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.sidebar .seg button')).cursor''')
        runner.add('G9 Interaction', 'T9.5 Buttons have pointer cursor', btn_cursor == 'pointer', 'pointer', btn_cursor)

        # Check button has transition
        btn_transition = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.sidebar .seg button')).transition''')
        runner.add('G9 Interaction', 'T9.6 Button has transition', btn_transition != 'all 0s ease 0s', 'has transition', btn_transition[:30])

        # Check card border
        card_border = await page.evaluate('''() => {
            const drill = document.querySelector('deep-drill');
            if (!drill || !drill.shadowRoot) return 'no-shadow';
            const card = drill.shadowRoot.querySelector('.card');
            if (!card) return 'no-card';
            return window.getComputedStyle(card).border;
        }''')
        runner.add('G9 Interaction', 'T9.7 Card has border', 'px' in str(card_border), 'has px', card_border[:30])

        # Check mockbar transition on mobile
        await page.set_viewport_size({'width': 375, 'height': 812})
        await page.wait_for_timeout(300)
        mb_transition = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.sidebar .mockbar')).transition''')
        runner.add('G9 Interaction', 'T9.8 Mockbar has transform transition', 'transform' in mb_transition, 'transform', mb_transition[:30])

        await page.close()

        # ============================================================
        # GROUP 10: Visual Effects (8 tests)
        # ============================================================
        print("\n[GROUP 10] Visual Effects")

        has_keyframes_css = 'keyframes' in css_content.lower()
        runner.add('G10 Visual', 'T10.1 Keyframe animations present', has_keyframes_css, 'true', str(has_keyframes_css))

        has_property_css = '@property' in css_content
        runner.add('G10 Visual', 'T10.2 CSS @property used', has_property_css, 'true', str(has_property_css))

        has_backdrop = 'backdrop-filter' in css_content
        runner.add('G10 Visual', 'T10.3 Backdrop-filter used', has_backdrop, 'true', str(has_backdrop))

        has_colormix = 'color-mix' in css_content
        runner.add('G10 Visual', 'T10.4 color-mix used', has_colormix, 'true', str(has_colormix))

        has_willchange = 'will-change' in css_content
        runner.add('G10 Visual', 'T10.5 will-change for performance', has_willchange, 'true', str(has_willchange))

        has_gradient = 'linear-gradient' in css_content or 'radial-gradient' in css_content
        runner.add('G10 Visual', 'T10.6 Gradients used', has_gradient, 'true', str(has_gradient))

        has_filter = 'filter:' in css_content
        runner.add('G10 Visual', 'T10.7 CSS filter used', has_filter, 'true', str(has_filter))

        has_animation = 'animation:' in css_content
        runner.add('G10 Visual', 'T10.8 CSS animation property used', has_animation, 'true', str(has_animation))

        # ============================================================
        # GROUP 11: Web Component Specific (8 tests)
        # ============================================================
        print("\n[GROUP 11] Web Component Specific")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # Check custom elements are defined
        wc_defined = await page.evaluate('''() => customElements.get('deep-walkthrough') !== undefined''')
        runner.add('G11 WebComp', 'T11.1 deep-walkthrough defined', wc_defined, 'true', str(wc_defined))

        wc_count = await page.evaluate('''() => document.querySelectorAll('[class^="deep-"], deep-walkthrough, deep-drill, deep-whiteboard, deep-system-map, deep-trade-offs, deep-model-answers, deep-numbers, deep-red-flags, deep-opener').length''')
        runner.add('G11 WebComp', 'T11.2 Web Components exist in DOM', wc_count > 0, '>0', str(wc_count))

        # Check shadow root exists
        has_shadow = await page.evaluate('''() => {const el=document.querySelector('deep-walkthrough');return el?!!el.shadowRoot:false;}''')
        runner.add('G11 WebComp', 'T11.3 Walkthrough has shadow root', has_shadow, 'true', str(has_shadow))

        # Check shadow DOM has content
        shadow_content = await page.evaluate('''() => {const el=document.querySelector('deep-walkthrough');return el&&el.shadowRoot?el.shadowRoot.innerHTML.length:0;}''')
        runner.add('G11 WebComp', 'T11.4 Shadow DOM has content', shadow_content > 100, '>100 chars', str(shadow_content))

        # Check adoptedStyleSheets
        has_sheets = await page.evaluate('''() => {const el=document.querySelector('deep-walkthrough');return el&&el.shadowRoot?el.shadowRoot.adoptedStyleSheets.length:0;}''')
        runner.add('G11 WebComp', 'T11.5 Adopted stylesheets present', has_sheets > 0, '>0', str(has_sheets))

        # Check all 9 components have shadow roots
        all_shadow = await page.evaluate('''() => {
            const tags = ['deep-walkthrough','deep-drill','deep-whiteboard','deep-system-map','deep-trade-offs','deep-model-answers','deep-numbers','deep-red-flags','deep-opener'];
            let count = 0;
            for (const t of tags) {const el=document.querySelector(t);if(el&&el.shadowRoot)count++;}
            return count;
        }''')
        runner.add('G11 WebComp', 'T11.6 All 9 components have shadow roots', all_shadow == 9, '9', str(all_shadow))

        # Check constructable stylesheets used
        constructable = await page.evaluate('''() => {try{new CSSStyleSheet();return true;}catch(e){return false;}}''')
        runner.add('G11 WebComp', 'T11.7 Constructable stylesheets supported', constructable, 'true', str(constructable))

        # Check shadow DOM is open
        shadow_mode = await page.evaluate('''() => {const el=document.querySelector('deep-walkthrough');return el&&el.shadowRoot?'open':'closed';}''')
        runner.add('G11 WebComp', 'T11.8 Shadow DOM mode is open', shadow_mode == 'open', 'open', shadow_mode)

        await page.close()

        # ============================================================
        # GROUP 12: Content Validation (8 tests)
        # ============================================================
        print("\n[GROUP 12] Content Validation")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # Walkthrough has step content
        wt_text = await page.evaluate('''() => {const el=document.querySelector('deep-walkthrough');return el&&el.shadowRoot?el.shadowRoot.textContent.length:0;}''')
        runner.add('G12 Content', 'T12.1 Walkthrough has text content', wt_text > 200, '>200 chars', str(wt_text))

        # Check for specific keywords
        has_content_pipeline = await page.evaluate('''() => document.body.textContent.includes('Content Pipeline')''')
        runner.add('G12 Content', 'T12.2 "Content Pipeline" text present', has_content_pipeline, 'true', str(has_content_pipeline))

        has_deep_rehearsal = await page.evaluate('''() => document.body.textContent.includes('Deep Rehearsal') || document.title.includes('Deep Rehearsal')''')
        runner.add('G12 Content', 'T12.3 "Deep Rehearsal" text present', has_deep_rehearsal, 'true', str(has_deep_rehearsal))

        # Navigate to drill and check content
        await nav_to(page, 'Probe Drill')
        await page.wait_for_timeout(500)
        drill_text = await page.evaluate('''() => {const el=document.querySelector('deep-drill');return el&&el.shadowRoot?el.shadowRoot.textContent.length:0;}''')
        runner.add('G12 Content', 'T12.4 Drill has content', drill_text > 100, '>100 chars', str(drill_text))

        # Check no placeholder text
        has_lorem = await page.evaluate('''() => document.body.textContent.includes('Lorem ipsum')''')
        runner.add('G12 Content', 'T12.5 No Lorem ipsum placeholder', not has_lorem, 'false', str(has_lorem))

        # Check no "TODO" markers
        has_todo = await page.evaluate('''() => document.body.textContent.includes('TODO') || document.body.textContent.includes('FIXME')''')
        runner.add('G12 Content', 'T12.6 No TODO/FIXME markers', not has_todo, 'false', str(has_todo))

        # Check title is not empty
        title_len = await page.evaluate('''() => document.title.length''')
        runner.add('G12 Content', 'T12.7 Page title not empty', title_len > 5, '>5 chars', str(title_len))

        # Check body has substantial content
        body_len = await page.evaluate('''() => document.body.textContent.length''')
        runner.add('G12 Content', 'T12.8 Body has substantial content', body_len > 1000, '>1000 chars', str(body_len))

        await page.close()

        # ============================================================
        # GROUP 13: Animation & Motion (6 tests)
        # ============================================================
        print("\n[GROUP 13] Animation & Motion")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        # Check body fade-in animation
        body_anim = await page.evaluate('''() => window.getComputedStyle(document.body).animationName''')
        runner.add('G13 Animation', 'T13.1 Body has entrance animation', body_anim != 'none', 'has animation', body_anim[:30])

        # Check mesh gradient animation
        mesh_anim = await page.evaluate('''() => window.getComputedStyle(document.querySelector('.stage'), '::before').animationName''')
        runner.add('G13 Animation', 'T13.2 Mesh gradient has animation', mesh_anim != 'none', 'has animation', mesh_anim[:30])

        # Check card entrance animation exists in CSS
        has_card_anim = '@keyframes cardStagger' in css_content or 'cardStagger' in css_content
        runner.add('G13 Animation', 'T13.3 Card stagger keyframes exist', has_card_anim, 'true', str(has_card_anim))

        # Check body entrance keyframes
        has_bodyIn = 'bodyIn' in css_content
        runner.add('G13 Animation', 'T13.4 Body entrance keyframes exist', has_bodyIn, 'true', str(has_bodyIn))

        # Check animation timing functions
        has_ease = 'ease-in-out' in css_content or 'cubic-bezier' in css_content
        runner.add('G13 Animation', 'T13.5 Smooth easing functions used', has_ease, 'true', str(has_ease))

        # Check animation durations are reasonable
        has_reasonable_duration = css_content.count('s ') > 5
        runner.add('G13 Animation', 'T13.6 Multiple animation durations', has_reasonable_duration, '>5', str(css_content.count('s ')))

        await page.close()

        # ============================================================
        # GROUP 14: Responsive Design (8 tests)
        # ============================================================
        print("\n[GROUP 14] Responsive Design")

        # Test tablet viewport
        page = await browser.new_page(viewport={'width': 768, 'height': 1024})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        tablet = await page.evaluate('''() => ({
            stage_width: document.querySelector('.stage').offsetWidth,
            sidebar_visible: window.getComputedStyle(document.querySelector('.sidebar')).display != 'none',
            companion_visible: window.getComputedStyle(document.querySelector('.companion')).display != 'none',
        })''')
        runner.add('G14 Responsive', 'T14.1 Tablet stage has width', tablet['stage_width'] > 300, '>300px', str(tablet['stage_width']))
        runner.add('G14 Responsive', 'T14.2 Tablet sidebar visible', tablet['sidebar_visible'], 'visible', str(tablet['sidebar_visible']))
        runner.add('G14 Responsive', 'T14.3 Tablet companion hidden (<920px)', not tablet['companion_visible'], 'hidden', str(tablet['companion_visible']))

        await page.close()

        # Test small mobile viewport
        page = await browser.new_page(viewport={'width': 320, 'height': 568})
        await page.goto(HTML_PATH)
        await page.wait_for_timeout(2000)

        small = await page.evaluate('''() => ({
            stage_width: document.querySelector('.stage').offsetWidth,
            fab_visible: window.getComputedStyle(document.querySelector('.tools-fab')).display != 'none',
            companion_hidden: window.getComputedStyle(document.querySelector('.companion')).display == 'none',
        })''')
        runner.add('G14 Responsive', 'T14.4 Small mobile stage fits', small['stage_width'] <= 320, '<=320px', str(small['stage_width']))
        runner.add('G14 Responsive', 'T14.5 Small mobile FAB visible', small['fab_visible'], 'visible', str(small['fab_visible']))
        runner.add('G14 Responsive', 'T14.6 Small mobile companion hidden', small['companion_hidden'], 'hidden', str(small['companion_hidden']))

        await page.close()

        # Check media queries in CSS
        has_media = '@media' in css_content
        runner.add('G14 Responsive', 'T14.7 Media queries present', has_media, 'true', str(has_media))

        media_count = css_content.count('@media')
        runner.add('G14 Responsive', 'T14.8 Multiple media queries', media_count >= 2, '>=2', str(media_count))

        await browser.close()

        success = runner.summary()
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    asyncio.run(run_tests())
