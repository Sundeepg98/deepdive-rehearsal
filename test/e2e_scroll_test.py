#!/usr/bin/env python3
"""End-to-end scroll test using Playwright.
Verifies no empty whitespace below content on mobile and desktop.
Run: python3 test/e2e_scroll_test.py"""

import asyncio, sys, os, re
from playwright.async_api import async_playwright

HTML_PATH = os.path.join(os.path.dirname(__file__), '..', 'deepdive_content_pipeline_rehearsal.html')

async def run_tests():
    results = {'passed': 0, 'failed': 0}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # ===== Test 1: Desktop viewport =====
        print("\n--- Desktop (1280x800) ---")
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(f'file://{HTML_PATH}')
        await page.wait_for_timeout(1000)  # Let animations settle
        
        # Scroll to bottom
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await page.wait_for_timeout(500)
        
        scroll_height = await page.evaluate('document.body.scrollHeight')
        client_height = await page.evaluate('document.documentElement.clientHeight')
        scroll_top = await page.evaluate('window.scrollY')
        
        print(f"  body.scrollHeight: {scroll_height}")
        print(f"  viewport height: {client_height}")
        print(f"  scrollY: {scroll_top}")
        
        # Check if there's content at the bottom or empty space
        bottom_content = await page.evaluate('''() => {
            const rect = document.body.getBoundingClientRect();
            // Check if the bottom 200px of the page has any visible content
            const elements = document.elementsFromPoint(rect.width/2, rect.height - 100);
            return elements.map(e => e.tagName + (e.className ? '.' + e.className.split(' ')[0] : '')).slice(0, 5);
        }''')
        print(f"  Elements at bottom: {bottom_content}")
        
        # The page should not scroll much beyond viewport if content fits
        if scroll_height <= client_height + 100:
            print("  ✅ Desktop: No scrollable whitespace (content fits viewport)")
            results['passed'] += 1
        else:
            extra = scroll_height - client_height
            print(f"  ⚠️ Desktop: {extra}px scrollable below viewport")
            if extra > 200:
                print("  ❌ FAIL: Excessive empty space")
                results['failed'] += 1
            else:
                print("  ✅ PASS: Minor scroll within tolerance")
                results['passed'] += 1
        
        await page.close()
        
        # ===== Test 2: Mobile viewport =====
        print("\n--- Mobile (375x812) ---")
        page = await browser.new_page(viewport={'width': 375, 'height': 812})
        await page.goto(f'file://{HTML_PATH}')
        await page.wait_for_timeout(1000)
        
        scroll_height = await page.evaluate('document.body.scrollHeight')
        client_height = await page.evaluate('document.documentElement.clientHeight')
        
        print(f"  body.scrollHeight: {scroll_height}")
        print(f"  viewport height: {client_height}")
        
        # Scroll to bottom
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await page.wait_for_timeout(500)
        
        scroll_top = await page.evaluate('window.scrollY')
        print(f"  scrollY: {scroll_top}")
        
        # Check what's visible at the bottom
        bottom_content = await page.evaluate('''() => {
            const elements = document.elementsFromPoint(window.innerWidth/2, window.innerHeight - 100);
            return elements.map(e => e.tagName + (e.className ? '.' + e.className.split(' ')[0] : '')).slice(0, 5);
        }''')
        print(f"  Elements at bottom: {bottom_content}")
        
        # Check if mockbar is visible (should NOT be without clicking tools)
        mockbar_visible = await page.evaluate('''() => {
            const mb = document.querySelector('.mockbar');
            if (!mb) return 'not found';
            const rect = mb.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > 0 ? 'VISIBLE' : 'hidden';
        }''')
        print(f"  Mockbar state: {mockbar_visible}")
        
        if mockbar_visible == 'VISIBLE':
            print("  ❌ FAIL: Mockbar visible without clicking tools!")
            results['failed'] += 1
        else:
            print("  ✅ PASS: Mockbar correctly hidden")
            results['passed'] += 1
        
        # Now click Tools button and check mockbar appears
        print("\n  Clicking Tools button...")
        try:
            await page.click('.tools-fab')
            await page.wait_for_timeout(300)
            
            mockbar_after_click = await page.evaluate('''() => {
                const mb = document.querySelector('.mockbar');
                if (!mb) return 'not found';
                const rect = mb.getBoundingClientRect();
                return rect.top < window.innerHeight && rect.bottom > 0 ? 'VISIBLE' : 'hidden';
            }''')
            print(f"  Mockbar after click: {mockbar_after_click}")
            
            if mockbar_after_click == 'VISIBLE':
                print("  ✅ PASS: Mockbar visible after clicking tools")
                results['passed'] += 1
            else:
                print("  ❌ FAIL: Mockbar NOT visible after clicking tools!")
                results['failed'] += 1
        except Exception as e:
            print(f"  ⚠️ Could not click tools-fab: {e}")
        
        # Check for empty whitespace at bottom
        empty_space = await page.evaluate('''() => {
            // Find the last meaningful element
            const allElements = document.querySelectorAll('.stage > *');
            if (allElements.length === 0) return 0;
            const lastEl = allElements[allElements.length - 1];
            const lastRect = lastEl.getBoundingClientRect();
            // Calculate space from last element to bottom of scrollable area
            const bodyHeight = document.body.scrollHeight;
            const lastBottom = lastRect.bottom + window.scrollY;
            return bodyHeight - lastBottom;
        }''')
        print(f"  Empty space below last element: {empty_space}px")
        
        if empty_space > 200:
            print("  ❌ FAIL: Excessive empty space below content")
            results['failed'] += 1
        else:
            print("  ✅ PASS: No excessive empty space")
            results['passed'] += 1
        
        await page.close()
        browser.close()
        
        # ===== Summary =====
        print(f"\n{'='*60}")
        print(f"  Results: {results['passed']} passed, {results['failed']} failed")
        print(f"{'='*60}")
        return results['failed'] == 0

if __name__ == '__main__':
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
