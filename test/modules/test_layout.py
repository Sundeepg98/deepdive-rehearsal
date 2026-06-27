"""Test Module: Desktop & Mobile Layout
Groups: Desktop, Mobile
Markers: layout, critical, fast
"""

async def test_no_scroll_whitespace(page):
    m = await page.evaluate('''() => {
        const app = document.querySelector('.app'), body = document.body;
        return { gap: document.documentElement.scrollHeight - (app ? Math.round(app.getBoundingClientRect().bottom) : 0) - parseFloat(getComputedStyle(body).paddingBottom) };
    }''')
    assert m['gap'] <= 25, f"Scroll gap = {m['gap']}px"
test_no_scroll_whitespace._group = 'Desktop'
test_no_scroll_whitespace._markers = ['layout', 'critical']

async def test_app_height_bounds(page):
    h = await page.evaluate('() => document.querySelector(".app").offsetHeight')
    assert 850 <= h <= 1200, f"App height {h}px"
test_app_height_bounds._group = 'Desktop'
test_app_height_bounds._markers = ['layout', 'critical', 'fast']

async def test_stage_position_relative(page):
    pos = await page.evaluate('() => getComputedStyle(document.querySelector(".stage")).position')
    assert pos == 'relative'
test_stage_position_relative._group = 'Desktop'
test_stage_position_relative._markers = ['layout', 'critical', 'fast']

async def test_body_overflow_hidden(page):
    ov = await page.evaluate('() => getComputedStyle(document.body).overflow')
    assert ov == 'hidden'
test_body_overflow_hidden._group = 'Desktop'
test_body_overflow_hidden._markers = ['layout', 'critical', 'fast']

async def test_html_overflow_hidden(page):
    ov = await page.evaluate('() => getComputedStyle(document.documentElement).overflow')
    assert ov == 'hidden'
test_html_overflow_hidden._group = 'Desktop'
test_html_overflow_hidden._markers = ['layout', 'critical', 'fast']

async def test_nine_nav_items(page):
    count = await page.evaluate('() => document.querySelectorAll(".seg button, .sidebar .seg button").length')
    assert count == 9
test_nine_nav_items._group = 'Desktop'
test_nine_nav_items._markers = ['layout', 'critical', 'fast']

async def test_companion_visible(page):
    d = await page.evaluate('() => getComputedStyle(document.querySelector(".companion")).display')
    assert d != 'none'
test_companion_visible._group = 'Desktop'
test_companion_visible._markers = ['layout', 'critical', 'fast']

async def test_sidebar_visible(page):
    d = await page.evaluate('() => getComputedStyle(document.querySelector(".sidebar")).display')
    assert d != 'none'
test_sidebar_visible._group = 'Desktop'
test_sidebar_visible._markers = ['layout', 'critical', 'fast']
