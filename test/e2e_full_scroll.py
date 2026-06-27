#!/usr/bin/env python3
"""
End-to-end full page scroll test using Playwright.
Scrolls through the entire page WITHOUT clicking tools.
Checks every section for empty whitespace.
Run: python3 test/e2e_full_scroll.py
"""

import asyncio, sys, os
from playwright.async_api import async_playwright

HTML_PATH = os.path.join(os.path.dirname(__file__), '..', 'deepdive_content_pipeline_rehearsal.html')

async def run_tests():
    passed = 0
    failed = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # ===== Test 1: Mobile (375x812) - Full scroll without tools =====
        print("\n" + "="*60)
        print("  TEST 1: Mobile (375x812) - Scroll WITHOUT clicking tools")
        print("="*60)
        
        page = await browser.new_page(viewport={'width': 375, 'height': 812})
        await page.goto(f'file://{HTML_PATH}')
        await page.wait_for_timeout(2000)  # Let everything settle
        
        # Get page dimensions
        dims = await page.evaluate('''() => ({
            bodyScrollHeight: document.body.scrollHeight,
            viewportHeight: window.innerHeight,
            stageHeight: document.querySelector('.stage') ? document.querySelector('.stage').scrollHeight : 0,
            sidebarHeight: document.querySelector('.sidebar') ? document.querySelector('.sidebar').scrollHeight : 0,
        })''')
        print(f"  body.scrollHeight: {dims['bodyScrollHeight']}px")
        print(f"  viewport: {dims['viewportHeight']}px")
        print(f"  stage.scrollHeight: {dims['stageHeight']}px")
        
        # Scroll through the page in increments and check content at each point
        total_scroll = dims['bodyScrollHeight'] - dims['viewportHeight']
        steps = 10
        step_size = total_scroll // steps if total_scroll > 0 else 0
        
        empty_sections = []
        for i in range(steps + 1):
            scroll_y = min(i * step_size, total_scroll)
            await page.evaluate(f'window.scrollTo(0, {scroll_y})')
            await page.wait_for_timeout(200)
            
            # Check what's visible at the center of the viewport
            visible = await page.evaluate('''() => {
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                const elements = document.elementsFromPoint(cx, cy);
                return elements.map(e => ({
                    tag: e.tagName,
                    class: e.className.split(' ')[0] || '',
                    text: e.textContent ? e.textContent.slice(0, 50) : '',
                    height: e.getBoundingClientRect().height
                })).slice(0, 3);
            }''')
            
            # Check if the center of viewport is empty (no meaningful content)
            has_content = any(v['height'] > 50 for v in visible)
            scroll_pct = int((scroll_y / total_scroll) * 100) if total_scroll > 0 else 0
            
            status = "✅" if has_content else "❌ EMPTY"
            print(f"  Scroll {scroll_pct}% ({scroll_y}px): {status} - {visible[0]['tag']}.{visible[0]['class'][:20]}")
            
            if not has_content:
                empty_sections.append(scroll_pct)
        
        if empty_sections:
            print(f"\n  ❌ FAIL: Empty sections found at scroll positions: {empty_sections}%")
            failed += 1
        else:
            print(f"\n  ✅ PASS: All scroll positions have content")
            passed += 1
        
        # Check mockbar is NOT visible
        mockbar_check = await page.evaluate('''() => {
            const mb = document.querySelector('.mockbar');
            if (!mb) return 'not found';
            const rect = mb.getBoundingClientRect();
            // Check if mockbar is actually visible in viewport
            const visible = rect.top < window.innerHeight && rect.bottom > 0 && rect.height > 10;
            return {
                visible: visible,
                top: rect.top,
                bottom: rect.bottom,
                height: rect.height,
                transform: getComputedStyle(mb).transform
            };
        }''')
        
        print(f"\n  Mockbar check:")
        print(f"    visible: {mockbar_check['visible']}")
        print(f"    top: {mockbar_check['top']:.0f}, bottom: {mockbar_check['bottom']:.0f}")
        print(f"    height: {mockbar_check['height']:.0f}")
        
        if mockbar_check['visible']:
            print(f"    ❌ FAIL: Mockbar visible without clicking tools!")
            failed += 1
        else:
            print(f"    ✅ PASS: Mockbar correctly hidden")
            passed += 1
        
        # Check for empty space below last content
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await page.wait_for_timeout(300)
        
        last_content = await page.evaluate('''() => {
            const stage = document.querySelector('.stage');
            if (!stage) return {error: 'no stage'};
            const children = Array.from(stage.children);
            // Find the last visible child
            for (let i = children.length - 1; i >= 0; i--) {
                const rect = children[i].getBoundingClientRect();
                if (rect.height > 0 && getComputedStyle(children[i]).display !== 'none') {
                    return {
                        lastChildBottom: rect.bottom + window.scrollY,
                        bodyHeight: document.body.scrollHeight,
                        emptySpace: document.body.scrollHeight - (rect.bottom + window.scrollY),
                        childTag: children[i].tagName,
                        childClass: children[i].className
                    };
                }
            }
            return {error: 'no visible children'};
        }''')
        
        print(f"\n  Empty space check:")
        if 'emptySpace' in last_content:
            print(f"    empty space below last content: {last_content['emptySpace']:.0f}px")
            if last_content['emptySpace'] > 100:
                print(f"    ❌ FAIL: More than 100px empty space")
                failed += 1
            else:
                print(f"    ✅ PASS: Minimal empty space")
                passed += 1
        
        await page.close()
        
        # ===== Test 2: Desktop (1280x800) - Full scroll =====
        print("\n" + "="*60)
        print("  TEST 2: Desktop (1280x800) - Full scroll")
        print("="*60)
        
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(f'file://{HTML_PATH}')
        await page.wait_for_timeout(2000)
        
        dims = await page.evaluate('''() => ({
            bodyScrollHeight: document.body.scrollHeight,
            viewportHeight: window.innerHeight,
        })''')
        print(f"  body.scrollHeight: {dims['bodyScrollHeight']}px")
        print(f"  viewport: {dims['viewportHeight']}px")
        
        total_scroll = dims['bodyScrollHeight'] - dims['viewportHeight']
        
        # Check scroll positions
        empty_sections = []
        for i in range(0, 101, 20):
            scroll_y = int(total_scroll * (i / 100))
            await page.evaluate(f'window.scrollTo(0, {scroll_y})')
            await page.wait_for_timeout(200)
            
            visible = await page.evaluate('''() => {
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                const elements = document.elementsFromPoint(cx, cy);
                return elements.map(e => ({
                    tag: e.tagName,
                    class: e.className.split(' ')[0] || '',
                    height: e.getBoundingClientRect().height
                })).slice(0, 2);
            }''')
            
            has_content = any(v['height'] > 50 for v in visible)
            status = "✅" if has_content else "❌ EMPTY"
            print(f"  Scroll {i}%: {status} - {visible[0]['tag']}.{visible[0]['class'][:20]}")
            
            if not has_content:
                empty_sections.append(i)
        
        if empty_sections:
            print(f"\n  ❌ FAIL: Empty sections at: {empty_sections}%")
            failed += 1
        else:
            print(f"\n  ✅ PASS: All scroll positions have content")
            passed += 1
        
        # Check companion panel is styled
        companion = await page.evaluate('''() => {
            const cmp = document.querySelector('.companion');
            if (!cmp) return {error: 'not found'};
            return {
                display: getComputedStyle(cmp).display,
                hasContent: cmp.textContent.length > 50,
                textLength: cmp.textContent.length
            };
        }''')
        
        print(f"\n  Companion panel:")
        print(f"    display: {companion.get('display', 'N/A')}")
        print(f"    has content: {companion.get('hasContent', False)}")
        
        await page.close()
        await browser.close()
    
    # Summary
    print(f"\n{'='*60}")
    print(f"  Results: {passed} passed, {failed} failed")
    print(f"{'='*60}")
    return failed == 0

if __name__ == '__main__':
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
