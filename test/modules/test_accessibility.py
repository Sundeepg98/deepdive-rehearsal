"""Test Module: Accessibility
Groups: Keyboard, ARIA
Markers: accessibility, critical, fast
"""

async def _nav(page, view_id):
    await page.evaluate(f'() => {{ if (window.Router) window.Router.navigate("{view_id}"); }}')
    await page.wait_for_timeout(1200)

async def test_tab_moves_focus(page):
    await page.keyboard.press('Tab')
    f = await page.evaluate('() => document.activeElement.tagName')
    assert f != 'BODY', f"Tab didn't move focus, still on {f}"
test_tab_moves_focus._group = 'Keyboard'
test_tab_moves_focus._markers = ['accessibility', 'critical']

async def test_q_navigates_walk(page):
    await _nav(page, 'drill')
    await page.keyboard.press('q')
    await page.wait_for_timeout(800)
    assert await page.evaluate('() => window.Router.current().view') == 'walk'
test_q_navigates_walk._group = 'Keyboard'
test_q_navigates_walk._markers = ['accessibility', 'critical']

async def test_w_navigates_drill(page):
    await _nav(page, 'walk')
    await page.keyboard.press('w')
    await page.wait_for_timeout(800)
    assert await page.evaluate('() => window.Router.current().view') == 'drill'
test_w_navigates_drill._group = 'Keyboard'
test_w_navigates_drill._markers = ['accessibility', 'critical']

async def test_html_has_lang(page):
    assert await page.evaluate('() => document.documentElement.lang')
test_html_has_lang._group = 'ARIA'
test_html_has_lang._markers = ['accessibility', 'fast']

async def test_page_has_title(page):
    assert await page.evaluate('() => document.title')
test_page_has_title._group = 'ARIA'
test_page_has_title._markers = ['accessibility', 'fast']

async def test_buttons_have_text(page):
    count = await page.evaluate('() => Array.from(document.querySelectorAll("button")).filter(b => !b.textContent.trim() && !b.getAttribute("aria-label")).length')
    assert count == 0, f"{count} buttons without text/label"
test_buttons_have_text._group = 'ARIA'
test_buttons_have_text._markers = ['accessibility', 'fast']

async def test_reduced_motion_css(page):
    with open('/mnt/agents/output/workspace/deepdive-rehearsal/src/styles.css') as f:
        assert 'prefers-reduced-motion' in f.read()
test_reduced_motion_css._group = 'ARIA'
test_reduced_motion_css._markers = ['accessibility', 'fast']
