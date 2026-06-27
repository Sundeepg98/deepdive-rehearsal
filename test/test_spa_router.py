"""Test Suite: SPA Router. Markers: spa, router, critical"""
import pytest
from conftest import router_navigate, arun, HTML_PATH

@pytest.mark.spa
@pytest.mark.router
@pytest.mark.critical
class TestRouterBasics:
    def test_router_exists(self, loaded_page):
        r = loaded_page.evaluate('''() => ({
            e:!!window.Router, n:!!(window.Router&&window.Router.navigate),
            r:!!(window.Router&&window.Router.replace), s:!!(window.Router&&window.Router.subscribe),
            c:!!(window.Router&&window.Router.current), R:!!(window.Router&&window.Router.ROUTES)
        })''')
        assert r['e'] and r['n'] and r['r'] and r['s'] and r['c'] and r['R']

    def test_default_route_is_walk(self, loaded_page):
        assert loaded_page.evaluate('''() => window.Router.current().view''') == 'walk'

    def test_hash_reflects_current_view(self, loaded_page):
        assert loaded_page.evaluate('''() => window.location.hash''') in ['#walk', '']

    def test_all_routes_defined(self, loaded_page):
        routes = loaded_page.evaluate('''() => Object.keys(window.Router.ROUTES)''')
        assert routes == ['walk','drill','wb','sys','trade','model','num','rf','open']

    def test_each_route_has_metadata(self, loaded_page):
        meta = loaded_page.evaluate('''() => {
            const r={}; for(const[k,v]of Object.entries(window.Router.ROUTES)) r[k]={id:!!v.id,t:!!v.title,l:!!v.label,s:v.segment!==undefined};
            return r;
        }''')
        for k,v in meta.items():
            assert v['id'] and v['t'] and v['l'] and v['s'], f"Route {k} missing metadata"

@pytest.mark.spa
@pytest.mark.router
@pytest.mark.critical
class TestRouterNavigation:
    def test_navigate_to_drill(self, loaded_page):
        router_navigate(loaded_page, 'drill')
        loaded_page.wait_for_timeout(800)
        assert loaded_page.evaluate('''() => window.Router.current().view''') == 'drill'

    def test_navigate_all_views(self, loaded_page):
        for vid in ['walk','drill','wb','sys','trade','model','num','rf','open']:
            router_navigate(loaded_page, vid)
            loaded_page.wait_for_timeout(600)
            assert loaded_page.evaluate('''() => window.Router.current().view''') == vid

    def test_navigate_updates_hash(self, loaded_page):
        router_navigate(loaded_page, 'drill')
        loaded_page.wait_for_timeout(600)
        assert loaded_page.evaluate('''() => window.location.hash''') == '#drill'

    def test_navigate_updates_title(self, loaded_page):
        router_navigate(loaded_page, 'drill')
        loaded_page.wait_for_timeout(600)
        assert 'Probe Drill' in loaded_page.evaluate('''() => document.title''')

    def test_navigate_activates_nav_button(self, loaded_page):
        router_navigate(loaded_page, 'wb')
        loaded_page.wait_for_timeout(600)
        assert loaded_page.evaluate('''() => { const btns=document.querySelectorAll('.seg button,.sidebar .seg button'); for(const b of btns) if(b.getAttribute('data-tab')==='wb') return b.classList.contains('on'); return false; }''')

    def test_navigate_shows_correct_pane(self, loaded_page):
        router_navigate(loaded_page, 'sys')
        loaded_page.wait_for_timeout(600)
        assert loaded_page.evaluate('''() => { const p=document.getElementById('sys'); return p&&p.classList.contains('on')&&getComputedStyle(p).display!=='none'; }''')

    def test_navigate_hides_other_panes(self, loaded_page):
        router_navigate(loaded_page, 'trade')
        loaded_page.wait_for_timeout(600)
        assert loaded_page.evaluate('''() => ['walk','drill','wb','sys','model','num','rf','open'].every(id => { const p=document.getElementById(id); return p&&!p.classList.contains('on'); })''')

@pytest.mark.spa
@pytest.mark.router
@pytest.mark.critical
class TestRouterHistory:
    def test_back_button_works(self, loaded_page):
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(600)
        router_navigate(loaded_page, 'wb'); loaded_page.wait_for_timeout(600)
        loaded_page.go_back(); loaded_page.wait_for_timeout(600)
        assert loaded_page.evaluate('''() => window.Router.current().view''') == 'drill'

    def test_forward_button_works(self, loaded_page):
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(600)
        router_navigate(loaded_page, 'wb'); loaded_page.wait_for_timeout(600)
        loaded_page.go_back(); loaded_page.wait_for_timeout(600)
        loaded_page.go_forward(); loaded_page.wait_for_timeout(600)
        assert loaded_page.evaluate('''() => window.Router.current().view''') == 'wb'

    def test_history_chain(self, loaded_page):
        for v in ['drill','wb','sys','trade']:
            router_navigate(loaded_page, v); loaded_page.wait_for_timeout(600)
        for expected in ['sys','wb','drill']:
            loaded_page.go_back(); loaded_page.wait_for_timeout(600)
            assert loaded_page.evaluate('''() => window.Router.current().view''') == expected

@pytest.mark.spa
@pytest.mark.router
class TestRouterDeepLinking:
    def test_direct_hash_navigation(self, browser):
        page = arun(browser.new_page(viewport={'width': 1280, 'height': 800}))
        page.goto(HTML_PATH + '#drill'); page.wait_for_timeout(2500)
        assert page.evaluate('''() => window.Router.current().view''') == 'drill'
        arun(page.close())

    def test_direct_hash_each_view(self, browser):
        for vid in ['walk','drill','wb','sys','trade','model','num','rf','open']:
            page = arun(browser.new_page(viewport={'width': 1280, 'height': 800}))
            page.goto(HTML_PATH + '#' + vid); page.wait_for_timeout(2500)
            assert page.evaluate('''() => window.Router.current().view''') == vid
            arun(page.close())

    def test_invalid_hash_fallback(self, browser):
        page = arun(browser.new_page(viewport={'width': 1280, 'height': 800}))
        page.goto(HTML_PATH + '#nonexistent'); page.wait_for_timeout(2500)
        assert page.evaluate('''() => window.Router.current().view''') == 'walk'
        arun(page.close())

@pytest.mark.spa
@pytest.mark.router
class TestRouterEvents:
    def test_routechange_event_fires(self, loaded_page):
        loaded_page.evaluate('''() => { window._rcc=0; window.addEventListener('routechange',()=>window._rcc++); }''')
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(600)
        assert loaded_page.evaluate('''() => window._rcc''') >= 1

    def test_subscribe_callback_fires(self, loaded_page):
        loaded_page.evaluate('''() => { window._sub=null; window.Router.subscribe(r=>window._sub=r.view); }''')
        router_navigate(loaded_page, 'wb'); loaded_page.wait_for_timeout(600)
        assert loaded_page.evaluate('''() => window._sub''') == 'wb'
