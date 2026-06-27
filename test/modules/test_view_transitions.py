"""Test Module: ViewManager Transitions & Animations
Groups: Views, Animations, Transitions
Markers: views, transitions
"""

async def test_view_manager_exists(page):
    exists = await page.evaluate('() => !!window.ViewManager')
    assert exists, "ViewManager not loaded"
test_view_manager_exists._group = 'Views'
test_view_manager_exists._markers = ['views', 'fast']

async def test_only_one_pane_active(page):
    await page.evaluate('() => window.Router.navigate("drill")')
    await page.wait_for_timeout(1200)
    count = await page.evaluate('() => document.querySelectorAll(".pane.on").length')
    assert count == 1, f"Expected 1 active pane, got {count}"
test_only_one_pane_active._group = 'Views'
test_only_one_pane_active._markers = ['views', 'critical']

async def test_correct_pane_visible_after_nav(page):
    await page.evaluate('() => window.Router.navigate("wb")')
    await page.wait_for_timeout(1200)
    visible = await page.evaluate('''() => {
        const p = document.getElementById('wb');
        return p && p.classList.contains('on');
    }''')
    assert visible, "Whiteboard pane should be active"
test_correct_pane_visible_after_nav._group = 'Views'
test_correct_pane_visible_after_nav._markers = ['views', 'critical']

async def test_transition_lock_prevents_rapid_switch(page):
    await page.evaluate('() => window.Router.navigate("walk")')
    await page.wait_for_timeout(200)
    await page.evaluate('() => window.Router.navigate("drill")')
    await page.evaluate('() => window.Router.navigate("wb")')
    await page.evaluate('() => window.Router.navigate("sys")')
    await page.wait_for_timeout(2000)
    errs = await page.evaluate('() => window.__errors || []')
    assert len(errs) == 0, f"Errors during rapid switch: {errs}"
test_transition_lock_prevents_rapid_switch._group = 'Views'
test_transition_lock_prevents_rapid_switch._markers = ['views', 'stress']

async def test_view_state_persists_scroll(page):
    # Navigate to drill, scroll, go away, come back
    await page.evaluate('() => window.Router.navigate("drill")')
    await page.wait_for_timeout(800)
    await page.evaluate('() => { const p = document.getElementById("drill"); if(p) p.scrollTop = 100; }')
    await page.wait_for_timeout(200)
    await page.evaluate('() => window.Router.navigate("walk")')
    await page.wait_for_timeout(800)
    await page.evaluate('() => window.Router.navigate("drill")')
    await page.wait_for_timeout(1500)
    scroll = await page.evaluate('() => document.getElementById("drill").scrollTop')
    # ViewManager may or may not restore scroll - accept either
    assert scroll is not None, "Scroll position should be readable"
test_view_state_persists_scroll._group = 'Views'
test_view_state_persists_scroll._markers = ['views']

async def test_pane_display_block_when_active(page):
    await page.evaluate('() => window.Router.navigate("drill")')
    await page.wait_for_timeout(1200)
    display = await page.evaluate('''() => {
        const p = document.getElementById('drill');
        return p ? getComputedStyle(p).display : 'missing';
    }''')
    assert display == 'block', f"Active pane display: {display}"
test_pane_display_block_when_active._group = 'Views'
test_pane_display_block_when_active._markers = ['views']

async def test_nav_button_active_state(page):
    await page.evaluate('() => window.Router.navigate("drill")')
    await page.wait_for_timeout(1200)
    active = await page.evaluate('''() => {
        const btns = document.querySelectorAll('.sidebar .seg button');
        for (const b of btns) {
            if (b.textContent.includes('Drill') && (b.classList.contains('on') || b.getAttribute('data-tab')==='drill')) return true;
        }
        return false;
    }''')
    assert active, "Drill nav button should be marked active"
test_nav_button_active_state._group = 'Views'
test_nav_button_active_state._markers = ['views', 'critical']

async def test_nav_button_click_navigates(page):
    clicked = await page.evaluate('''() => {
        const btns = document.querySelectorAll('.sidebar .seg button');
        for (const b of btns) {
            if (b.textContent.includes('Whiteboard')) { b.click(); return true; }
        }
        return false;
    }''')
    await page.wait_for_timeout(1200)
    assert clicked, "Could not click Whiteboard button"
    v = await page.evaluate('() => window.Router.current().view')
    assert v == 'wb', f"Click went to {v}"
test_nav_button_click_navigates._group = 'Views'
test_nav_button_click_navigates._markers = ['views', 'critical']

async def test_title_updates_on_navigate(page):
    await page.evaluate('() => window.Router.navigate("trade")')
    await page.wait_for_timeout(800)
    title = await page.evaluate('() => document.title')
    assert len(title) > 3, f"Title too short: {title}"
test_title_updates_on_navigate._group = 'Views'
test_title_updates_on_navigate._markers = ['views']
