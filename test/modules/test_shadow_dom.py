"""Test Module: Shadow DOM Deep Testing
Groups: ShadowDOM, WebComponents
Markers: shadow, components, deep
"""

COMPONENTS = [
    ('deep-walkthrough', ['Walkthrough', 'Interview']),
    ('deep-drill', ['Drill', 'Probe']),
    ('deep-whiteboard', ['Whiteboard', 'Design']),
    ('deep-system-map', ['System', 'Map']),
    ('deep-trade-offs', ['Trade', 'Off']),
    ('deep-model-answers', ['Model', 'Answer']),
    ('deep-numbers', ['Number', 'Metric']),
    ('deep-red-flags', ['Red', 'Flag']),
    ('deep-opener', ['Second', 'Open']),
    ('deep-cram', ['Cram', 'Sheet']),
    ('deep-gameplan', ['Game', 'Plan']),
    ('deep-keyboard', ['Keyboard', 'Shortcut']),
    ('deep-mixed-fire', ['Mixed', 'Fire']),
    ('deep-mock-run', ['Mock', 'Run']),
    ('deep-session', ['Session', 'Star']),
    ('deep-scope', ['Scope', 'Slide']),
]

async def _check_component(page, tag, expected_texts):
    result = await page.evaluate(f'''() => {{
        const el = document.querySelector('{tag}');
        if (!el) return {{ exists: false, has_shadow: false, text_len: 0 }};
        const sr = el.shadowRoot;
        if (!sr) return {{ exists: true, has_shadow: false, text_len: 0 }};
        const text = sr.textContent || '';
        return {{ exists: true, has_shadow: true, text_len: text.length }};
    }}''')
    return result

async def test_all_components_exist(page):
    for tag, _ in COMPONENTS:
        exists = await page.evaluate(f'() => !!document.querySelector("{tag}")')
        assert exists, f"{tag} not found in DOM"
test_all_components_exist._group = 'ShadowDOM'
test_all_components_exist._markers = ['shadow', 'components']

async def test_all_components_have_shadow_root(page):
    for tag, _ in COMPONENTS:
        has_sr = await page.evaluate(f'''() => {{
            const el = document.querySelector('{tag}');
            return el && el.shadowRoot !== null;
        }}''')
        assert has_sr, f"{tag} missing shadowRoot"
test_all_components_have_shadow_root._group = 'ShadowDOM'
test_all_components_have_shadow_root._markers = ['shadow', 'components']

async def test_walkthrough_shadow_content(page):
    r = await _check_component(page, 'deep-walkthrough', ['Walkthrough', 'Interview'])
    assert r['has_shadow'] and r['text_len'] > 100

test_walkthrough_shadow_content._group = 'ShadowDOM'
test_walkthrough_shadow_content._markers = ['shadow', 'components']

async def test_drill_shadow_content(page):
    r = await _check_component(page, 'deep-drill', ['Drill', 'Probe'])
    assert r['has_shadow'] and r['text_len'] > 100
test_drill_shadow_content._group = 'ShadowDOM'
test_drill_shadow_content._markers = ['shadow', 'components']

async def test_whiteboard_shadow_content(page):
    r = await _check_component(page, 'deep-whiteboard', ['Whiteboard', 'Design'])
    assert r['has_shadow'] and r['text_len'] > 100
test_whiteboard_shadow_content._group = 'ShadowDOM'
test_whiteboard_shadow_content._markers = ['shadow', 'components']

async def test_system_map_shadow_content(page):
    r = await _check_component(page, 'deep-system-map', ['System', 'Map'])
    assert r['has_shadow'] and r['text_len'] > 100
test_system_map_shadow_content._group = 'ShadowDOM'
test_system_map_shadow_content._markers = ['shadow', 'components']

async def test_tradeoffs_shadow_content(page):
    r = await _check_component(page, 'deep-trade-offs', ['Trade', 'Off'])
    assert r['has_shadow'] and r['text_len'] > 100
test_tradeoffs_shadow_content._group = 'ShadowDOM'
test_tradeoffs_shadow_content._markers = ['shadow', 'components']

async def test_model_answers_shadow_content(page):
    r = await _check_component(page, 'deep-model-answers', ['Model', 'Answer'])
    assert r['has_shadow'] and r['text_len'] > 100
test_model_answers_shadow_content._group = 'ShadowDOM'
test_model_answers_shadow_content._markers = ['shadow', 'components']

async def test_numbers_shadow_content(page):
    r = await _check_component(page, 'deep-numbers', ['Number', 'Metric'])
    assert r['has_shadow'] and r['text_len'] > 100
test_numbers_shadow_content._group = 'ShadowDOM'
test_numbers_shadow_content._markers = ['shadow', 'components']

async def test_redflags_shadow_content(page):
    r = await _check_component(page, 'deep-red-flags', ['Red', 'Flag'])
    assert r['has_shadow'] and r['text_len'] > 100
test_redflags_shadow_content._group = 'ShadowDOM'
test_redflags_shadow_content._markers = ['shadow', 'components']

async def test_opener_shadow_content(page):
    r = await _check_component(page, 'deep-opener', ['Second', 'Open'])
    assert r['has_shadow'] and r['text_len'] > 100
test_opener_shadow_content._group = 'ShadowDOM'
test_opener_shadow_content._markers = ['shadow', 'components']

async def test_components_have_styles(page):
    for tag, _ in COMPONENTS[:8]:
        has_styles = await page.evaluate(f'''() => {{
            const el = document.querySelector('{tag}');
            if (!el || !el.shadowRoot) return false;
            const styled = el.shadowRoot.querySelector('[style], [class], style');
            return !!styled;
        }}''')
        assert has_styles, f"{tag} has no visible styling"
test_components_have_styles._group = 'ShadowDOM'
test_components_have_styles._markers = ['shadow', 'components']

async def test_components_are_in_containers(page):
    """Each component lives inside a .pane or .cram-body or .mock-panel container."""
    for tag, _ in COMPONENTS:
        in_container = await page.evaluate(f'''() => {{
            const el = document.querySelector('{tag}');
            if (!el) return false;
            return el.closest('.pane') !== null ||
                   el.closest('.cram-body') !== null ||
                   el.closest('.mock-panel') !== null;
        }}''')
        assert in_container, f"{tag} not inside any container"
test_components_are_in_containers._group = 'ShadowDOM'
test_components_are_in_containers._markers = ['shadow', 'components']

async def test_components_hidden_by_default(page):
    await page.evaluate('() => {{ if(window.Router) window.Router.navigate("walk"); }}')
    await page.wait_for_timeout(800)
    walk_visible = await page.evaluate('''() => {
        const el = document.querySelector('deep-walkthrough');
        return el && el.closest('.pane') && el.closest('.pane').classList.contains('on');
    }''')
    assert walk_visible, "Walkthrough should be in active pane"
    drill_active = await page.evaluate('''() => {
        const p = document.querySelector('#drill');
        return p && p.classList.contains('on');
    }''')
    assert not drill_active, "Drill should not be active"
test_components_hidden_by_default._group = 'ShadowDOM'
test_components_hidden_by_default._markers = ['shadow', 'components']
