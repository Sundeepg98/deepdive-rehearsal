"""Test Suite: Web Components & Rendering. Markers: components, critical"""
import pytest

VIEWS = [('Walkthrough','deep-walkthrough','walk'),('Probe Drill','deep-drill','drill'),
         ('Whiteboard','deep-whiteboard','wb'),('System Map','deep-system-map','sys'),
         ('Trade-offs','deep-trade-offs','trade'),('Model Answers','deep-model-answers','model'),
         ('Numbers','deep-numbers','num'),('Red Flags','deep-red-flags','rf'),('30-Second','deep-opener','open')]

@pytest.mark.components
@pytest.mark.critical
class TestViewRendering:
    @pytest.mark.parametrize("label,tag,vid", VIEWS)
    def test_view_renders(self, loaded_page, label, tag, vid):
        router_navigate(loaded_page, vid); loaded_page.wait_for_timeout(1200)
        r = loaded_page.evaluate(f'''() => {{
            const el=document.querySelector('{tag}');
            if(!el) return 'missing';
            const rect=el.getBoundingClientRect(), sr=el.shadowRoot;
            return rect.width>0&&rect.height>0?(sr&&sr.textContent.length>50?'content':'empty'):'zero';
        }}''')
        assert r == 'content', f"{label}: got '{r}'"

    @pytest.mark.parametrize("label,tag,vid", VIEWS)
    def test_view_shadow_root(self, loaded_page, label, tag, vid):
        router_navigate(loaded_page, vid); loaded_page.wait_for_timeout(1200)
        assert loaded_page.evaluate(f'''() => {{ const el=document.querySelector('{tag}'); return el&&el.shadowRoot?true:false; }}''')

    @pytest.mark.parametrize("label,tag,vid", VIEWS)
    def test_view_adopted_stylesheets(self, loaded_page, label, tag, vid):
        router_navigate(loaded_page, vid); loaded_page.wait_for_timeout(1200)
        assert loaded_page.evaluate(f'''() => {{ const el=document.querySelector('{tag}'); return el&&el.shadowRoot?el.shadowRoot.adoptedStyleSheets.length>0:false; }}''')

@pytest.mark.components
class TestComponentContent:
    def test_has_content_pipeline_text(self, loaded_page):
        assert loaded_page.evaluate('''() => document.body.textContent.includes('Content Pipeline')''')

    def test_no_placeholder_text(self, loaded_page):
        assert not loaded_page.evaluate('''() => document.body.textContent.includes('Lorem ipsum')''')

    def test_no_todo_markers(self, loaded_page):
        assert not loaded_page.evaluate('''() => document.body.textContent.includes('TODO')||document.body.textContent.includes('FIXME')''')

    def test_page_title_not_empty(self, loaded_page):
        assert len(loaded_page.evaluate('''() => document.title''')) > 5

    def test_body_has_content(self, loaded_page):
        assert loaded_page.evaluate('''() => document.body.textContent.length''') > 1000

@pytest.mark.components
class TestConsoleErrors:
    def test_no_js_errors_on_load(self, browser):
        page = arun(browser.new_page(viewport={'width': 1280, 'height': 800}))
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(HTML_PATH); page.wait_for_timeout(2500)
        assert len(errors) == 0, f"JS errors: {errors[:3]}"
        arun(page.close())

    def test_no_js_errors_navigating(self, browser):
        page = arun(browser.new_page(viewport={'width': 1280, 'height': 800}))
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(HTML_PATH); page.wait_for_timeout(2000)
        for _,_,vid in VIEWS:
            page.evaluate(f'''() => {{ if(window.Router) window.Router.navigate('{vid}'); }}''')
            page.wait_for_timeout(600)
        assert len(errors) == 0, f"Errors: {errors[:3]}"
        arun(page.close())

@pytest.mark.components
class TestCustomElements:
    def test_walkthrough_defined(self, loaded_page):
        assert loaded_page.evaluate('''() => customElements.get('deep-walkthrough')!==undefined''')

    def test_constructable_stylesheets(self, loaded_page):
        assert loaded_page.evaluate('''() => { try { new CSSStyleSheet(); return true; } catch(e) { return false; } }''')

    def test_all_nine_in_dom(self, loaded_page):
        tags = ['deep-walkthrough','deep-drill','deep-whiteboard','deep-system-map','deep-trade-offs',
                'deep-model-answers','deep-numbers','deep-red-flags','deep-opener']
        for tag in tags:
            assert loaded_page.evaluate(f'''() => !!document.querySelector('{tag}')'''), f"<{tag}> missing"
