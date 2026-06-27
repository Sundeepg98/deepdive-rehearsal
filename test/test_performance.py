"""Test Suite: Performance. Markers: performance"""
import pytest, time, os

HTML_SIZE = '/mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'
CSS_FILE = '/mnt/agents/output/workspace/deepdive-rehearsal/src/styles.css'

@pytest.mark.performance
class TestLoadTimes:
    def test_page_loads_under_5s(self, browser):
        page = arun(browser.new_page(viewport={'width': 1280, 'height': 800}))
        t0 = time.time()
        page.goto(HTML_PATH); page.wait_for_timeout(2000)
        assert time.time() - t0 < 5
        arun(page.close())

    def test_dom_ready_under_3s(self, browser):
        page = arun(browser.new_page(viewport={'width': 1280, 'height': 800}))
        page.goto(HTML_PATH); page.wait_for_timeout(2000)
        dcl = page.evaluate('''() => { const n=performance.getEntriesByType('navigation')[0]; return n?n.domContentLoadedEventEnd-n.startTime:null; }''')
        if dcl: assert dcl < 3000
        arun(page.close())

@pytest.mark.performance
class TestResourceSize:
    def test_html_under_500kb(self):
        assert os.path.getsize(HTML_SIZE) < 500000

    def test_html_under_1mb(self):
        assert os.path.getsize(HTML_SIZE) < 1048576

@pytest.mark.performance
class TestCSSMetrics:
    def test_brace_balance(self):
        with open(CSS_FILE) as f:
            c = f.read()
        assert c.count('{') == c.count('}')

    def test_has_media_queries(self):
        with open(CSS_FILE) as f:
            assert f.read().count('@media') >= 2

    def test_has_keyframes(self):
        with open(CSS_FILE) as f:
            assert '@keyframes' in f.read()

    def test_has_print_styles(self):
        with open(CSS_FILE) as f:
            assert '@media print' in f.read()

    def test_has_reduced_motion(self):
        with open(CSS_FILE) as f:
            assert 'prefers-reduced-motion' in f.read()

    def test_has_dark_theme(self):
        with open(CSS_FILE) as f:
            assert 'data-theme="dark"' in f.read()

    def test_has_property(self):
        with open(CSS_FILE) as f:
            assert '@property' in f.read()

    def test_css_rules_under_1000(self, loaded_page):
        count = loaded_page.evaluate('''() => { let t=0; for(const s of document.styleSheets) { try { t+=s.cssRules.length; } catch(e) {} } return t; }''')
        assert count < 1000
