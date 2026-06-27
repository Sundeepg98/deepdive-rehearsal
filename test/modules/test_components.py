"""Test Module: Web Components & Content
Groups: Rendering, Content, Console
Markers: components, critical, fast, slow
"""

async def _nav(page, view_id):
    await page.evaluate(f'() => {{ if (window.Router) window.Router.navigate("{view_id}"); }}')
    await page.wait_for_timeout(1200)

async def test_walkthrough_renders(page):
    await _nav(page, 'walk')
    r = await page.evaluate('''() => {
        const el = document.querySelector('deep-walkthrough');
        if (!el) return 'missing';
        const rect = el.getBoundingClientRect(), sr = el.shadowRoot;
        return rect.width > 0 && rect.height > 0 ? (sr && sr.textContent.length > 50 ? 'content' : 'empty') : 'zero';
    }''')
    assert r == 'content', f"Walkthrough: got '{r}'"
test_walkthrough_renders._group = 'Rendering'
test_walkthrough_renders._markers = ['components', 'critical']

async def test_drill_renders(page):
    await _nav(page, 'drill')
    r = await page.evaluate('''() => {
        const el = document.querySelector('deep-drill');
        if (!el) return 'missing';
        const rect = el.getBoundingClientRect(), sr = el.shadowRoot;
        return rect.width > 0 && rect.height > 0 ? (sr && sr.textContent.length > 50 ? 'content' : 'empty') : 'zero';
    }''')
    assert r == 'content', f"Drill: got '{r}'"
test_drill_renders._group = 'Rendering'
test_drill_renders._markers = ['components', 'critical']

async def test_shadow_root_exists(page):
    await _nav(page, 'walk')
    assert await page.evaluate('() => { const el = document.querySelector("deep-walkthrough"); return el && el.shadowRoot ? true : false; }')
test_shadow_root_exists._group = 'Rendering'
test_shadow_root_exists._markers = ['components', 'critical', 'fast']

async def test_adopted_stylesheets(page):
    await _nav(page, 'walk')
    assert await page.evaluate('() => { const el = document.querySelector("deep-walkthrough"); return el && el.shadowRoot ? el.shadowRoot.adoptedStyleSheets.length > 0 : false; }')
test_adopted_stylesheets._group = 'Rendering'
test_adopted_stylesheets._markers = ['components', 'critical', 'fast']

async def test_content_pipeline_text(page):
    assert await page.evaluate('() => document.body.textContent.includes("Content Pipeline")')
test_content_pipeline_text._group = 'Content'
test_content_pipeline_text._markers = ['components', 'fast']

async def test_no_placeholder_text(page):
    assert not await page.evaluate('() => document.body.textContent.includes("Lorem ipsum")')
test_no_placeholder_text._group = 'Content'
test_no_placeholder_text._markers = ['components', 'fast']

async def test_no_todo_markers(page):
    assert not await page.evaluate('() => document.body.textContent.includes("TODO") || document.body.textContent.includes("FIXME")')
test_no_todo_markers._group = 'Content'
test_no_todo_markers._markers = ['components', 'fast']

async def test_page_title(page):
    title = await page.evaluate('() => document.title')
    assert len(title) > 5
test_page_title._group = 'Content'
test_page_title._markers = ['components', 'fast']

async def test_no_js_errors(page):
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.evaluate('() => { if (window.Router) window.Router.navigate("drill"); }')
    await page.wait_for_timeout(1000)
    await page.evaluate('() => { if (window.Router) window.Router.navigate("wb"); }')
    await page.wait_for_timeout(1000)
    assert len(errors) == 0, f"JS errors: {errors[:3]}"
test_no_js_errors._group = 'Console'
test_no_js_errors._markers = ['components', 'slow']
