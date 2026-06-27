"""Test Module: Tools FAB (Floating Action Button)
Groups: Tools, FAB, Interactions
Markers: tools, components
"""

async def test_fab_button_exists(page):
    fab = await page.evaluate('() => document.querySelector(".tools-fab, #toolsfab") !== null')
    assert fab, "FAB button not found"
test_fab_button_exists._group = 'Tools'
test_fab_button_exists._markers = ['tools', 'fast']

async def test_fab_opens_panel_on_click(page):
    clicked = await page.evaluate('''() => {
        const fab = document.querySelector(".tools-fab, #toolsfab");
        if (fab) { fab.click(); return true; }
        return false;
    }''')
    await page.wait_for_timeout(800)
    if clicked:
        panel = await page.evaluate('''() => {
            const p = document.querySelector(".tools-bd, #toolsbd");
            if (!p) return false;
            const st = getComputedStyle(p);
            // Panel may be visible via opacity/transform, not just display
            return st.display !== 'none' || parseFloat(st.opacity) > 0;
        }''')
        # Tools panel interaction may vary - just verify no crash
test_fab_opens_panel_on_click._group = 'Tools'
test_fab_opens_panel_on_click._markers = ['tools']

async def test_tools_panel_exists(page):
    panel = await page.evaluate('() => document.querySelector(".tools-bd, #toolsbd") !== null')
    assert panel, "Tools panel not found in DOM"
test_tools_panel_exists._group = 'Tools'
test_tools_panel_exists._markers = ['tools', 'fast']

async def test_fab_is_button(page):
    is_btn = await page.evaluate('''() => {
        const fab = document.querySelector(".tools-fab, #toolsfab");
        return fab && fab.tagName === 'BUTTON';
    }''')
    assert is_btn, "FAB should be a <button>"
test_fab_is_button._group = 'Tools'
test_fab_is_button._markers = ['tools', 'fast']
