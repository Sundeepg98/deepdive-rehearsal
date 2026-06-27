"""Test Module: Error Handling & Recovery
Groups: Error, Recovery, Resilience
Markers: error, resilience
Tests graceful degradation when JS fails, missing elements, edge cases.
"""

async def test_no_js_errors_on_load(page):
    errs = await page.evaluate('() => window.__errors || []')
    assert len(errs) == 0, f"JS errors on load: {errs}"
test_no_js_errors_on_load._group = 'Error'
test_no_js_errors_on_load._markers = ['error', 'critical', 'fast']

async def test_body_opacity_animates_in(page):
    opacity = await page.evaluate('() => parseFloat(getComputedStyle(document.body).opacity)')
    assert opacity > 0.5, f"Body opacity too low: {opacity}"
test_body_opacity_animates_in._group = 'Error'
test_body_opacity_animates_in._markers = ['error', 'fast']

async def test_app_container_exists(page):
    app = await page.evaluate('() => document.querySelector(".app") !== null')
    assert app, ".app container not found"
test_app_container_exists._group = 'Error'
test_app_container_exists._markers = ['error', 'critical', 'fast']

async def test_header_exists(page):
    hdr = await page.evaluate('() => document.querySelector(".hdr, header, .header") !== null')
    assert hdr, "Header not found"
test_header_exists._group = 'Error'
test_header_exists._markers = ['error', 'fast']

async def test_all_panes_exist(page):
    panes = await page.evaluate('() => document.querySelectorAll(".pane").length')
    assert panes >= 9, f"Expected >=9 panes, got {panes}"
test_all_panes_exist._group = 'Error'
test_all_panes_exist._markers = ['error', 'critical', 'fast']

async def test_no_console_errors_after_nav(page):
    await page.evaluate('() => window.__testErrors = []')
    for view in ['drill', 'wb', 'sys', 'trade']:
        await page.evaluate(f'() => {{ if(window.Router) window.Router.navigate("{view}"); }}')
        await page.wait_for_timeout(600)
    errs = await page.evaluate('() => window.__testErrors || []')
    assert len(errs) == 0, f"Errors after nav: {errs}"
test_no_console_errors_after_nav._group = 'Error'
test_no_console_errors_after_nav._markers = ['error']

async def test_stage_has_scrollbar_style(page):
    has_scroll = await page.evaluate('''() => {
        const s = document.querySelector('.stage');
        return s && getComputedStyle(s).overflowY !== 'visible';
    }''')
    assert has_scroll, "Stage should have scrollable overflow"
test_stage_has_scrollbar_style._group = 'Error'
test_stage_has_scrollbar_style._markers = ['error', 'fast']
