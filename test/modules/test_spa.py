"""Test Module: SPA Router + View Manager
Groups: Router, Navigation, History, Views
Markers: spa, router, views, critical, fast, slow
"""

# ============================================================
# Router tests
# ============================================================
async def test_router_exists(page):
    """Router module loaded with all API methods."""
    assert await page.evaluate('() => !!window.Router && !!window.Router.navigate && !!window.Router.ROUTES')
test_router_exists._group = 'Router'
test_router_exists._markers = ['spa', 'router', 'critical', 'fast']

async def test_routes_defined(page):
    """All 9 routes defined."""
    routes = await page.evaluate('() => Object.keys(window.Router.ROUTES)')
    assert routes == ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']
test_routes_defined._group = 'Router'
test_routes_defined._markers = ['spa', 'router', 'critical', 'fast']

async def test_default_route(page):
    """Default route is walkthrough."""
    assert await page.evaluate('() => window.Router.current().view') == 'walk'
test_default_route._group = 'Router'
test_default_route._markers = ['spa', 'router', 'critical', 'fast']

async def test_route_metadata(page):
    """Each route has id, title, label, segment."""
    meta = await page.evaluate('''() => {
        const r = {}, routes = window.Router.ROUTES;
        for (const [k, v] of Object.entries(routes)) {
            r[k] = { id: !!v.id, title: !!v.title, label: !!v.label, segment: v.segment !== undefined };
        }
        return r;
    }''')
    for vid, m in meta.items():
        assert m['id'] and m['title'] and m['label'] and m['segment'], f"Route {vid} missing metadata"
test_route_metadata._group = 'Router'
test_route_metadata._markers = ['spa', 'router', 'critical', 'fast']

# ============================================================
# Navigation tests
# ============================================================
async def _nav(page, view_id):
    await page.evaluate(f'() => {{ if (window.Router) window.Router.navigate("{view_id}"); }}')
    await page.wait_for_timeout(1500)

async def test_navigate_to_drill(page):
    """Navigate to drill view."""
    await _nav(page, 'drill')
    assert await page.evaluate('() => window.Router.current().view') == 'drill'
test_navigate_to_drill._group = 'Navigation'
test_navigate_to_drill._markers = ['spa', 'router', 'critical']

async def test_navigate_to_wb(page):
    """Navigate to whiteboard."""
    await _nav(page, 'wb')
    assert await page.evaluate('() => window.Router.current().view') == 'wb'
test_navigate_to_wb._group = 'Navigation'
test_navigate_to_wb._markers = ['spa', 'router', 'critical']

async def test_navigate_all_views(page):
    """Navigate through all 9 views."""
    for vid in ['drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'walk']:
        await _nav(page, vid)
        cv = await page.evaluate('() => window.Router.current().view')
        assert cv == vid, f"Expected {vid}, got {cv}"
test_navigate_all_views._group = 'Navigation'
test_navigate_all_views._markers = ['spa', 'router', 'critical', 'slow']

async def test_hash_updates(page):
    """Hash URL updates on navigation."""
    await _nav(page, 'drill')
    assert await page.evaluate('() => window.location.hash') == '#drill'
test_hash_updates._group = 'Navigation'
test_hash_updates._markers = ['spa', 'router', 'critical']

async def test_title_updates(page):
    """Document title updates per view."""
    await _nav(page, 'drill')
    title = await page.evaluate('() => document.title')
    assert 'Probe Drill' in title, f"Title '{title}' missing 'Probe Drill'"
test_title_updates._group = 'Navigation'
test_title_updates._markers = ['spa', 'router', 'critical']

# ============================================================
# History tests
# ============================================================
async def test_back_button(page):
    """Browser back returns to previous view."""
    await _nav(page, 'drill')
    await _nav(page, 'wb')
    await page.go_back()
    await page.wait_for_timeout(800)
    assert await page.evaluate('() => window.Router.current().view') == 'drill'
test_back_button._group = 'History'
test_back_button._markers = ['spa', 'router']

async def test_forward_button(page):
    """Browser forward goes to next view."""
    await _nav(page, 'drill')
    await _nav(page, 'wb')
    await page.go_back()
    await page.wait_for_timeout(800)
    await page.go_forward()
    await page.wait_for_timeout(800)
    assert await page.evaluate('() => window.Router.current().view') == 'wb'
test_forward_button._group = 'History'
test_forward_button._markers = ['spa', 'router']

async def test_deep_link_hash(page):
    """Direct hash URL opens correct view."""
    await page.goto('file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html#drill')
    await page.wait_for_timeout(2500)
    assert await page.evaluate('() => window.Router.current().view') == 'drill'
test_deep_link_hash._group = 'History'
test_deep_link_hash._markers = ['spa', 'router']

async def test_invalid_hash_fallback(page):
    """Invalid hash falls back to walk."""
    await page.goto('file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html#nonexistent')
    await page.wait_for_timeout(2500)
    assert await page.evaluate('() => window.Router.current().view') == 'walk'
test_invalid_hash_fallback._group = 'History'
test_invalid_hash_fallback._markers = ['spa', 'router']

# ============================================================
# View Manager tests
# ============================================================
async def test_view_manager_exists(page):
    """ViewManager module loaded."""
    assert await page.evaluate('() => !!window.ViewManager')
test_view_manager_exists._group = 'Views'
test_view_manager_exists._markers = ['spa', 'views', 'critical', 'fast']

async def test_single_pane_active(page):
    """Only one pane has .on class."""
    await _nav(page, 'drill')
    count = await page.evaluate('() => document.querySelectorAll(".pane.on").length')
    assert count == 1, f"Expected 1 active pane, got {count}"
test_single_pane_active._group = 'Views'
test_single_pane_active._markers = ['spa', 'views', 'critical']

async def test_correct_pane_visible(page):
    """Active pane matches navigated view."""
    await _nav(page, 'sys')
    active = await page.evaluate('() => document.querySelector(".pane.on")?.id')
    assert active == 'sys', f"Expected 'sys', got '{active}'"
test_correct_pane_visible._group = 'Views'
test_correct_pane_visible._markers = ['spa', 'views', 'critical']

async def test_other_panes_hidden(page):
    """Non-active panes don't have .on class."""
    await _nav(page, 'trade')
    hidden = await page.evaluate('''() =>
        ['walk','drill','wb','sys','model','num','rf','open'].every(
            id => { const p = document.getElementById(id); return p && !p.classList.contains('on'); }
        )
    ''')
    assert hidden
test_other_panes_hidden._group = 'Views'
test_other_panes_hidden._markers = ['spa', 'views', 'critical']

async def test_active_pane_opaque(page):
    """Active pane is fully visible."""
    await _nav(page, 'drill')
    op = await page.evaluate('() => parseFloat(getComputedStyle(document.querySelector(".pane.on")).opacity)')
    assert op == 1.0, f"Expected opacity 1.0, got {op}"
test_active_pane_opaque._group = 'Views'
test_active_pane_opaque._markers = ['spa', 'views', 'fast']

async def test_nav_button_activated(page):
    """Nav button for active view has .on class."""
    await _nav(page, 'drill')
    btn = await page.evaluate('''() => {
        const btns = document.querySelectorAll('.seg button, .sidebar .seg button');
        for (const b of btns) if (b.getAttribute('data-tab') === 'drill') return b.classList.contains('on');
        return false;
    }''')
    assert btn, "Drill nav button not activated"
test_nav_button_activated._group = 'Views'
test_nav_button_activated._markers = ['spa', 'views', 'critical']

async def test_title_matches_view(page):
    """Document title contains view name."""
    await _nav(page, 'wb')
    title = await page.evaluate('() => document.title')
    assert 'Whiteboard' in title, f"Title '{title}' missing 'Whiteboard'"
test_title_matches_view._group = 'Views'
test_title_matches_view._markers = ['spa', 'views']
