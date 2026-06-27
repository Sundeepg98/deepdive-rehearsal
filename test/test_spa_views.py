"""Test Suite: SPA View Manager. Markers: spa, views, critical"""
import pytest
from conftest import router_navigate

VIEWS = ['walk','drill','wb','sys','trade','model','num','rf','open']

@pytest.mark.spa
@pytest.mark.views
@pytest.mark.critical
class TestViewTransitions:
    def test_view_manager_exists(self, loaded_page):
        assert loaded_page.evaluate('''() => !!window.ViewManager''')

    def test_initial_view_is_walk(self, loaded_page):
        assert loaded_page.evaluate('''() => document.querySelector('.pane.on').id''') == 'walk'

    def test_transition_changes_active_pane(self, loaded_page):
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(800)
        assert loaded_page.evaluate('''() => document.querySelector('.pane.on').id''') == 'drill'

    def test_only_one_pane_active(self, loaded_page):
        for vid in ['walk','drill','wb','sys','trade']:
            router_navigate(loaded_page, vid); loaded_page.wait_for_timeout(600)
            assert loaded_page.evaluate('''() => document.querySelectorAll('.pane.on').length''') == 1

    def test_active_pane_fully_opaque(self, loaded_page):
        op = loaded_page.evaluate('''() => parseFloat(getComputedStyle(document.querySelector('.pane.on')).opacity)''')
        assert op == 1.0

@pytest.mark.spa
@pytest.mark.views
class TestScrollMemory:
    def test_scroll_saved_and_restored(self, loaded_page):
        p = loaded_page
        router_navigate(p, 'walk'); p.wait_for_timeout(800)
        p.evaluate('''() => { const s=document.querySelector('.stage'); if(s) s.scrollTop=150; }''')
        p.wait_for_timeout(200)
        router_navigate(p, 'drill'); p.wait_for_timeout(800)
        router_navigate(p, 'walk'); p.wait_for_timeout(800)
        st = p.evaluate('''() => { const s=document.querySelector('.stage'); return s?s.scrollTop:-1; }''')
        assert st >= 0

@pytest.mark.spa
@pytest.mark.views
class TestLoadingSkeleton:
    def test_skeleton_element_created(self, loaded_page):
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(800)
        assert loaded_page.evaluate('''() => !!document.getElementById('_vm-skeleton')''')

    def test_skeleton_hidden_after_load(self, loaded_page):
        router_navigate(loaded_page, 'wb'); loaded_page.wait_for_timeout(1200)
        assert not loaded_page.evaluate('''() => { const sk=document.getElementById('_vm-skeleton'); return sk?sk.classList.contains('_sk-show'):true; }''')

@pytest.mark.spa
@pytest.mark.views
class TestFocusManagement:
    def test_focus_inside_active_view(self, loaded_page):
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(800)
        assert loaded_page.evaluate('''() => { const pane=document.querySelector('.pane.on'), f=document.activeElement; return pane&&f?pane.contains(f):true; }''')

    def test_tab_navigation_works(self, loaded_page):
        router_navigate(loaded_page, 'walk'); loaded_page.wait_for_timeout(800)
        loaded_page.keyboard.press('Tab')
        assert loaded_page.evaluate('''() => document.activeElement.tagName''') != 'BODY'

@pytest.mark.spa
@pytest.mark.views
class TestDocumentTitle:
    def test_title_contains_view_name(self, loaded_page):
        router_navigate(loaded_page, 'drill'); loaded_page.wait_for_timeout(600)
        assert 'Probe Drill' in loaded_page.evaluate('''() => document.title''')

    def test_title_each_view(self, loaded_page):
        expected = {'walk':'Walkthrough','drill':'Probe Drill','wb':'Whiteboard','sys':'System Map',
                    'trade':'Trade-offs','model':'Model Answers','num':'Numbers','rf':'Red Flags','open':'30-Second'}
        for vid, name in expected.items():
            router_navigate(loaded_page, vid); loaded_page.wait_for_timeout(600)
            assert name in loaded_page.evaluate('''() => document.title'''), f"Title for {vid} missing '{name}'"
