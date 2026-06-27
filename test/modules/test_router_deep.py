"""Test Module: Router Edge Cases & Deep Features
Groups: Router, DeepLinking, Guards
Markers: router, critical
"""

async def test_router_has_9_routes(page):
    count = await page.evaluate('() => Object.keys(window.Router.ROUTES).length')
    assert count == 9, f"Expected 9 routes, got {count}"
test_router_has_9_routes._group = 'Router'
test_router_has_9_routes._markers = ['router', 'critical', 'fast']

async def test_invalid_route_redirects(page):
    await page.evaluate('() => window.Router.navigate("nonexistent")')
    await page.wait_for_timeout(800)
    v = await page.evaluate('() => window.Router.current().view')
    assert v == 'walk', f"Invalid route should redirect to walk, got {v}"
test_invalid_route_redirects._group = 'Router'
test_invalid_route_redirects._markers = ['router', 'critical']

async def test_navigate_same_view_noop(page):
    await page.evaluate('() => window.Router.navigate("walk")')
    await page.wait_for_timeout(800)
    await page.evaluate('() => window.Router.navigate("walk")')
    await page.wait_for_timeout(400)
    v = await page.evaluate('() => window.Router.current().view')
    assert v == 'walk'
test_navigate_same_view_noop._group = 'Router'
test_navigate_same_view_noop._markers = ['router']

async def test_navigate_sets_hash(page):
    await page.evaluate('() => window.Router.navigate("drill")')
    await page.wait_for_timeout(800)
    h = await page.evaluate('() => location.hash')
    assert '#drill' in h, f"Hash should be #drill, got {h}"
test_navigate_sets_hash._group = 'Router'
test_navigate_sets_hash._markers = ['router', 'critical']

async def test_popstate_restores_view(page):
    await page.evaluate('() => window.Router.navigate("walk")')
    await page.wait_for_timeout(400)
    await page.evaluate('() => window.Router.navigate("drill")')
    await page.wait_for_timeout(800)
    await page.go_back()
    await page.wait_for_timeout(800)
    h = await page.evaluate('() => location.hash')
    assert '#walk' in h, f"Back should restore #walk, got {h}"
test_popstate_restores_view._group = 'Router'
test_popstate_restores_view._markers = ['router']

async def test_deep_link_on_load(page):
    await page.goto('file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html#wb')
    await page.evaluate('() => { window.__DISABLE_TOUR__ = true; }')
    await page.wait_for_timeout(2500)
    v = await page.evaluate('() => window.Router.current().view')
    assert v == 'wb', f"Deep link #wb should show wb, got {v}"
test_deep_link_on_load._group = 'Router'
test_deep_link_on_load._markers = ['router', 'deep']

async def test_router_current_returns_object(page):
    cur = await page.evaluate('() => { const c = window.Router.current(); return typeof c === "object" && c !== null; }')
    assert cur, "Router.current() should return an object"
test_router_current_returns_object._group = 'Router'
test_router_current_returns_object._markers = ['router', 'fast']

async def test_all_routes_have_labels(page):
    labels = await page.evaluate('''() => Object.values(window.Router.ROUTES).map(r => r.label)''')
    assert len(labels) == 9
    for label in labels:
        assert len(label) > 1, f"Route label '{label}' too short"
test_all_routes_have_labels._group = 'Router'
test_all_routes_have_labels._markers = ['router', 'fast']

async def test_all_routes_have_hash(page):
    ids = await page.evaluate('''() => Object.keys(window.Router.ROUTES)''')
    assert len(ids) == 9
    for id_ in ids:
        assert len(id_) > 0, f"Route id '{id_}' too short"
test_all_routes_have_hash._group = 'Router'
test_all_routes_have_hash._markers = ['router', 'fast']

async def test_router_public_api_complete(page):
    api = await page.evaluate('''() => ({
        navigate: typeof window.Router.navigate,
        current: typeof window.Router.current,
        ROUTES: typeof window.Router.ROUTES === 'object'
    })''')
    assert api['navigate'] == 'function'
    assert api['current'] == 'function'
    assert api['ROUTES'] is True
test_router_public_api_complete._group = 'Router'
test_router_public_api_complete._markers = ['router', 'fast']
