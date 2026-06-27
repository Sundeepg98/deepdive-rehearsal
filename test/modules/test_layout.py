"""Test Module: Desktop & Mobile Layout
Groups: Desktop, Mobile
Markers: layout, critical, fast
"""

async def test_no_scroll_whitespace(page):
    """Verify page has no visible scrollbar and app fits within viewport."""
    await page.wait_for_timeout(1500)
    m = await page.evaluate('''() => {
        const de = document.documentElement, body = document.body, app = document.querySelector('.app');
        // Check 1: overflow hidden is set (scrollbar visually hidden)
        const htmlOverflow = getComputedStyle(de).overflow;
        const bodyOverflow = getComputedStyle(body).overflow;
        // Check 2: app fits within viewport (visible area, not scrollHeight)
        const appH = app ? app.offsetHeight : 0;
        const vpH = de.clientHeight; // viewport height excluding scrollbar
        // Check 3: body padding-bottom should be the only bottom space
        const bodyPad = parseFloat(getComputedStyle(body).paddingBottom) || 0;
        // Check 4: verify no element (other than body padding) extends below app
        const allEl = document.querySelectorAll('body > *');
        let maxBottom = 0;
        allEl.forEach(el => {
            const r = el.getBoundingClientRect();
            maxBottom = Math.max(maxBottom, r.bottom);
        });
        const extra = Math.round(maxBottom - (app ? app.getBoundingClientRect().bottom : 0));
        return { htmlOverflow, bodyOverflow, appH, vpH, bodyPad, extra, maxBottom: Math.round(maxBottom) };
    }''')
    assert m['htmlOverflow'] == 'hidden', f"html overflow is {m['htmlOverflow']}, expected 'hidden'"
    assert m['bodyOverflow'] == 'hidden', f"body overflow is {m['bodyOverflow']}, expected 'hidden'"
    assert m['appH'] <= m['vpH'] + 100, f"App height {m['appH']}px exceeds viewport {m['vpH']}px by >100px"
    assert m['extra'] <= m['bodyPad'] + 20, f"Elements extend {m['extra']}px below app (body padding={m['bodyPad']}px)"
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
