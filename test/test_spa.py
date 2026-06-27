"""
Test Suite: SPA Router + View Manager
Markers: spa, router, views, critical

Run selectively:
  pytest test/test_spa.py -v -k "Router"       # Router tests only
  pytest test/test_spa.py -v -k "Navigation"   # Navigation tests
  pytest test/test_spa.py -v -k "test_history" # History tests
  pytest test/test_spa.py -v -k "Views"        # View manager tests
  pytest test/test_spa.py -v -k "not slow"     # Fast tests
  pytest test/test_spa.py::TestRouter::test_navigate_to_drill -v  # Single test
"""

import pytest
from conftest import navigate_to, get_current_view, HTML_PATH


# ============================================================
# TestRouter — Router basics and configuration
# ============================================================
@pytest.mark.spa
@pytest.mark.router
@pytest.mark.critical
class TestRouter:

    async def test_router_exists(self, app):
        """Router module loaded with all API methods."""
        assert await app.evaluate('() => !!window.Router && !!window.Router.navigate')

    async def test_routes_defined(self, app):
        """All 9 routes defined in ROUTES."""
        routes = await app.evaluate('() => Object.keys(window.Router.ROUTES)')
        assert routes == ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']

    async def test_default_route(self, app):
        """Default route is walkthrough."""
        assert await get_current_view(app) == 'walk'

    async def test_route_has_metadata(self, app):
        """Each route has id, title, label, segment."""
        meta = await app.evaluate('''() => {
            const r = {}, routes = window.Router.ROUTES;
            for (const [k, v] of Object.entries(routes)) {
                r[k] = { id: !!v.id, title: !!v.title, label: !!v.label, segment: v.segment !== undefined };
            }
            return r;
        }''')
        for vid, m in meta.items():
            assert m['id'] and m['title'] and m['label'] and m['segment'], f"Route {vid} missing metadata"


# ============================================================
# TestNavigation — Navigating between views
# ============================================================
@pytest.mark.spa
@pytest.mark.router
@pytest.mark.critical
class TestNavigation:

    async def test_navigate_to_drill(self, app):
        """Navigate to drill view."""
        await navigate_to(app, 'drill')
        assert await get_current_view(app) == 'drill'

    async def test_navigate_to_whiteboard(self, app):
        """Navigate to whiteboard view."""
        await navigate_to(app, 'wb')
        assert await get_current_view(app) == 'wb'

    async def test_navigate_all_views(self, app):
        """Navigate through all 9 views."""
        for vid in ['drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'walk']:
            await navigate_to(app, vid)
            assert await get_current_view(app) == vid

    async def test_navigate_updates_hash(self, app):
        """Hash URL updates on navigation."""
        await navigate_to(app, 'drill')
        assert await app.evaluate('() => window.location.hash') == '#drill'

    async def test_navigate_updates_title(self, app):
        """Document title updates per view."""
        await navigate_to(app, 'drill')
        title = await app.evaluate('() => document.title')
        assert 'Probe Drill' in title


# ============================================================
# TestHistory — Browser back/forward button support
# ============================================================
@pytest.mark.spa
@pytest.mark.router
class TestHistory:

    async def test_back_button(self, app):
        """Browser back returns to previous view."""
        await navigate_to(app, 'drill')
        await navigate_to(app, 'wb')
        await app.go_back()
        await app.wait_for_timeout(600)
        assert await get_current_view(app) == 'drill'

    async def test_forward_button(self, app):
        """Browser forward goes to next view."""
        await navigate_to(app, 'drill')
        await navigate_to(app, 'wb')
        await app.go_back()
        await app.wait_for_timeout(600)
        await app.go_forward()
        await app.wait_for_timeout(600)
        assert await get_current_view(app) == 'wb'

    async def test_history_chain(self, app):
        """Chain of navigations walkable via back."""
        for v in ['drill', 'wb', 'sys']:
            await navigate_to(app, v)
        for expected in ['wb', 'drill', 'walk']:
            await app.go_back()
            await app.wait_for_timeout(600)
            assert await get_current_view(app) == expected


# ============================================================
# TestDeepLinking — Direct hash URLs
# ============================================================
@pytest.mark.spa
@pytest.mark.router
class TestDeepLinking:

    async def test_hash_opens_view(self, browser):
        """Opening with #drill shows drill view."""
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH + '#drill')
        await page.wait_for_timeout(2500)
        assert await get_current_view(page) == 'drill'
        await page.close()

    @pytest.mark.parametrize("vid", ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'])
    async def test_hash_each_view(self, browser, vid):
        """Each view opens from direct hash."""
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH + '#' + vid)
        await page.wait_for_timeout(2500)
        assert await get_current_view(page) == vid
        await page.close()

    async def test_invalid_hash_fallback(self, browser):
        """Invalid hash falls back to walk."""
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto(HTML_PATH + '#nonexistent')
        await page.wait_for_timeout(2500)
        assert await get_current_view(page) == 'walk'
        await page.close()


# ============================================================
# TestViews — View Manager transitions and state
# ============================================================
@pytest.mark.spa
@pytest.mark.views
@pytest.mark.critical
class TestViews:

    async def test_view_manager_exists(self, app):
        """ViewManager module loaded."""
        assert await app.evaluate('() => !!window.ViewManager')

    async def test_initial_view_walk(self, app):
        """Initial active view is walkthrough."""
        vid = await app.evaluate('() => document.querySelector(".pane.on")?.id')
        assert vid == 'walk'

    async def test_single_pane_active(self, app):
        """Only one pane has .on class."""
        await navigate_to(app, 'drill')
        count = await app.evaluate('() => document.querySelectorAll(".pane.on").length')
        assert count == 1

    async def test_correct_pane_visible(self, app):
        """Active pane is the navigated view."""
        await navigate_to(app, 'sys')
        active = await app.evaluate('''() => document.querySelector(".pane.on")?.id''')
        assert active == 'sys'

    async def test_other_panes_hidden(self, app):
        """Non-active panes don't have .on class."""
        await navigate_to(app, 'trade')
        hidden = await app.evaluate('''() =>
            ['walk','drill','wb','sys','model','num','rf','open'].every(
                id => { const p = document.getElementById(id); return p && !p.classList.contains('on'); }
            )
        ''')
        assert hidden

    async def test_active_pane_opaque(self, app):
        """Active pane is fully visible."""
        await navigate_to(app, 'drill')
        opacity = await app.evaluate('() => parseFloat(getComputedStyle(document.querySelector(".pane.on")).opacity)')
        assert opacity == 1.0

    async def test_nav_button_activated(self, app):
        """Nav button for active view has .on class."""
        await navigate_to(app, 'drill')
        btn_on = await app.evaluate('''() => {
            const btns = document.querySelectorAll('.seg button, .sidebar .seg button');
            for (const b of btns) if (b.getAttribute('data-tab') === 'drill') return b.classList.contains('on');
            return false;
        }''')
        assert btn_on

    async def test_title_matches_view(self, app):
        """Document title contains view name."""
        await navigate_to(app, 'wb')
        title = await app.evaluate('() => document.title')
        assert 'Whiteboard' in title


# ============================================================
# TestKeyboard — Keyboard shortcuts
# ============================================================
@pytest.mark.spa
@pytest.mark.accessibility
class TestKeyboard:

    async def test_tab_moves_focus(self, app):
        """Tab key moves focus from body."""
        await app.keyboard.press('Tab')
        focused = await app.evaluate('() => document.activeElement.tagName')
        assert focused != 'BODY'

    async def test_q_navigates_to_walk(self, app):
        """'q' key navigates to walkthrough."""
        await navigate_to(app, 'drill')
        await app.keyboard.press('q')
        await app.wait_for_timeout(800)
        assert await get_current_view(app) == 'walk'

    async def test_w_navigates_to_drill(self, app):
        """'w' key navigates to probe drill."""
        await navigate_to(app, 'walk')
        await app.keyboard.press('w')
        await app.wait_for_timeout(800)
        assert await get_current_view(app) == 'drill'
