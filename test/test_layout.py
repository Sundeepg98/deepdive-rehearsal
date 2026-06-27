"""Test Suite: Layout & Scroll Integrity. Markers: layout, critical"""
import pytest
from conftest import router_navigate, arun, HTML_PATH

@pytest.mark.layout
@pytest.mark.critical
class TestDesktopLayout:
    def test_no_scrollable_whitespace(self, loaded_page):
        m = loaded_page.evaluate('''() => {
            const app=document.querySelector('.app'), body=document.body;
            return { gap: document.documentElement.scrollHeight - (app?Math.round(app.getBoundingClientRect().bottom):0) - parseFloat(getComputedStyle(body).paddingBottom) };
        }''')
        assert m['gap'] <= 25, f"Scroll gap = {m['gap']}px"

    def test_app_height_in_bounds(self, loaded_page):
        h = loaded_page.evaluate('''() => document.querySelector('.app').offsetHeight''')
        assert 850 <= h <= 1200, f"App height {h}px"

    def test_stage_position_relative(self, loaded_page):
        assert loaded_page.evaluate('''() => getComputedStyle(document.querySelector('.stage')).position''') == 'relative'

    def test_no_body_overflow(self, loaded_page):
        assert loaded_page.evaluate('''() => getComputedStyle(document.body).overflow''') == 'hidden'

    def test_all_nav_items_present(self, loaded_page):
        assert loaded_page.evaluate('''() => document.querySelectorAll('.seg button,.sidebar .seg button').length''') == 9

    def test_companion_visible(self, loaded_page):
        assert loaded_page.evaluate('''() => getComputedStyle(document.querySelector('.companion')).display''') != 'none'

    def test_sidebar_visible(self, loaded_page):
        assert loaded_page.evaluate('''() => getComputedStyle(document.querySelector('.sidebar')).display''') != 'none'

    def test_html_overflow_hidden(self, loaded_page):
        assert loaded_page.evaluate('''() => getComputedStyle(document.documentElement).overflow''') == 'hidden'

@pytest.mark.layout
@pytest.mark.critical
class TestMobileLayout:
    def test_mockbar_hidden_via_transform(self, loaded_mobile_page):
        t = loaded_mobile_page.evaluate('''() => getComputedStyle(document.querySelector('.sidebar .mockbar')).transform''')
        assert 'matrix' in t or '115%' in t, f"Mockbar transform: {t[:40]}"

    def test_tools_fab_visible(self, loaded_mobile_page):
        assert loaded_mobile_page.evaluate('''() => getComputedStyle(document.querySelector('.tools-fab')).display''') != 'none'

    def test_companion_hidden(self, loaded_mobile_page):
        assert loaded_mobile_page.evaluate('''() => getComputedStyle(document.querySelector('.companion')).display''') == 'none'

    def test_horizontal_nav(self, loaded_mobile_page):
        assert loaded_mobile_page.evaluate('''() => getComputedStyle(document.querySelector('.sidebar .seg')).flexDirection''') == 'row'

    def test_mockbar_opens_on_fab_click(self, loaded_mobile_page):
        loaded_mobile_page.evaluate('''() => document.querySelector('.tools-fab').click()''')
        loaded_mobile_page.wait_for_timeout(300)
        assert loaded_mobile_page.evaluate('''() => document.body.classList.contains('tools-open')''')

    def test_mockbar_closes_on_backdrop(self, loaded_mobile_page):
        loaded_mobile_page.evaluate('''() => document.querySelector('.tools-fab').click()''')
        loaded_mobile_page.wait_for_timeout(300)
        loaded_mobile_page.evaluate('''() => document.querySelector('.tools-bd').click()''')
        loaded_mobile_page.wait_for_timeout(300)
        assert not loaded_mobile_page.evaluate('''() => document.body.classList.contains('tools-open')''')

@pytest.mark.layout
class TestResponsiveBreakpoints:
    @pytest.mark.parametrize("w,h,exp", [(768,1024,True),(1024,768,True),(920,800,True)])
    def test_companion_at_tablet(self, browser, w, h, exp):
        page = arun(browser.new_page(viewport={'width': w, 'height': h}))
        page.goto(HTML_PATH); page.wait_for_timeout(2000)
        vis = page.evaluate('''() => getComputedStyle(document.querySelector('.companion')).display''') != 'none'
        assert vis == exp, f"Companion at {w}x{h}: expected {exp}, got {vis}"
        arun(page.close())

    @pytest.mark.parametrize("w,h", [(320,568),(375,667),(414,896)])
    def test_small_mobile(self, browser, w, h):
        page = arun(browser.new_page(viewport={'width': w, 'height': h}))
        page.goto(HTML_PATH); page.wait_for_timeout(2000)
        assert page.evaluate(f'''() => document.querySelector('.stage').offsetWidth''') <= w
        assert page.evaluate('''() => getComputedStyle(document.querySelector('.tools-fab')).display''') != 'none'
        arun(page.close())
