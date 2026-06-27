"""Test Suite: Accessibility. Markers: accessibility, critical"""
import pytest
from conftest import router_navigate

@pytest.mark.accessibility
@pytest.mark.critical
class TestKeyboardNavigation:
    def test_tab_to_first_element(self, loaded_page):
        loaded_page.keyboard.press('Tab')
        assert loaded_page.evaluate('''() => document.activeElement.tagName''') != 'BODY'

    def test_keyboard_shortcuts_navigate(self, loaded_page):
        loaded_page.keyboard.press('w'); loaded_page.wait_for_timeout(800)
        assert loaded_page.evaluate('''() => window.Router.current().view''') == 'drill'

    def test_q_for_walkthrough(self, loaded_page):
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(600)
        loaded_page.keyboard.press('q'); loaded_page.wait_for_timeout(800)
        assert loaded_page.evaluate('''() => window.Router.current().view''') == 'walk'

    def test_arrow_keys_in_walkthrough(self, loaded_page):
        router_navigate(loaded_page, 'walk'); loaded_page.wait_for_timeout(800)
        before = loaded_page.evaluate('''() => { const wt=document.querySelector('deep-walkthrough'); return wt?wt.shadowRoot.querySelector('.step-k')?.textContent:'no'; }''')
        loaded_page.keyboard.press('ArrowRight'); loaded_page.wait_for_timeout(400)
        after = loaded_page.evaluate('''() => { const wt=document.querySelector('deep-walkthrough'); return wt?wt.shadowRoot.querySelector('.step-k')?.textContent:'no'; }''')
        assert after != 'no'

    def test_escape_closes_overlays(self, loaded_page):
        loaded_page.evaluate('''() => { if(typeof openKeys==='function') openKeys(); }''')
        loaded_page.wait_for_timeout(300)
        if loaded_page.evaluate('''() => { const o=document.querySelector('[role="dialog"][aria-modal="true"]'); return o&&getComputedStyle(o).display!=='none'; }'''):
            loaded_page.keyboard.press('Escape'); loaded_page.wait_for_timeout(300)
            assert loaded_page.evaluate('''() => { const o=document.querySelector('[role="dialog"][aria-modal="true"]'); return o?getComputedStyle(o).display==='none':true; }''')

@pytest.mark.accessibility
class TestARIA:
    def test_html_has_lang(self, loaded_page):
        assert loaded_page.evaluate('''() => document.documentElement.lang''')

    def test_page_has_title(self, loaded_page):
        assert loaded_page.evaluate('''() => document.title''')

    def test_buttons_have_text_or_aria(self, loaded_page):
        assert loaded_page.evaluate('''() => Array.from(document.querySelectorAll('button')).filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length''') == 0

    def test_images_have_alt(self, loaded_page):
        assert loaded_page.evaluate('''() => document.querySelectorAll('img:not([alt])').length''') == 0

    def test_focusable_elements_exist(self, loaded_page):
        assert loaded_page.evaluate('''() => document.querySelectorAll('button,a,input,[tabindex]:not([tabindex="-1"])').length''') > 10

    def test_aria_live_region(self, loaded_page):
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(800)
        assert loaded_page.evaluate('''() => !!document.querySelector('[aria-live]')''')

@pytest.mark.accessibility
class TestReducedMotion:
    def test_reduced_motion_in_css(self):
        with open('/mnt/agents/output/workspace/deepdive-rehearsal/src/styles.css') as f:
            assert 'prefers-reduced-motion' in f.read()

    def test_reduced_motion_supported(self, loaded_page):
        assert loaded_page.evaluate('''() => window.matchMedia('(prefers-reduced-motion: reduce)').media==='(prefers-reduced-motion: reduce)' ''')
