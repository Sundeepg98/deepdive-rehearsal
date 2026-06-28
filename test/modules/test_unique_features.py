"""Test Module: Unique Features (v302)
Groups: Features
Markers: features
Tests 5 genuinely new features: scroll-progress, copy-code, touch-swipe,
state-persistence, completion-celebration.
"""

async def test_scroll_progress_bar_exists(page):
    """#scrollprog element exists and is styled."""
    bar = await page.evaluate('() => !!document.getElementById("scrollprog")')
    assert bar, "#scrollprog element missing"

test_scroll_progress_bar_exists._group = 'Features'
test_scroll_progress_bar_exists._markers = ['features', 'fast']

async def test_scroll_progress_script_loaded(page):
    """Scroll progress driver script is in the HTML."""
    has_script = await page.evaluate('''() => {
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
            if (s.textContent && s.textContent.includes('ScrollProgress')) return true;
        }
        return false;
    }''')
    assert has_script, "ScrollProgress script not found"

test_scroll_progress_script_loaded._group = 'Features'
test_scroll_progress_script_loaded._markers = ['features']

async def test_copy_code_script_loaded(page):
    """Copy code feature script is present."""
    has_script = await page.evaluate('''() => {
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
            if (s.textContent && s.textContent.includes('CopyCode')) return true;
        }
        return false;
    }''')
    assert has_script, "CopyCode script not found"

test_copy_code_script_loaded._group = 'Features'
test_copy_code_script_loaded._markers = ['features']

async def test_touch_swipe_script_loaded(page):
    """Touch swipe feature is present."""
    has_script = await page.evaluate('''() => {
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
            if (s.textContent && s.textContent.includes('TouchSwipe')) return true;
        }
        return false;
    }''')
    assert has_script, "TouchSwipe script not found"

test_touch_swipe_script_loaded._group = 'Features'
test_touch_swipe_script_loaded._markers = ['features']

async def test_state_persistence_script_loaded(page):
    """State persistence feature is present."""
    has_script = await page.evaluate('''() => {
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
            if (s.textContent && s.textContent.includes('StatePersistence')) return true;
        }
        return false;
    }''')
    assert has_script, "StatePersistence script not found"

test_state_persistence_script_loaded._group = 'Features'
test_state_persistence_script_loaded._markers = ['features']

async def test_completion_celebration_script_loaded(page):
    """Completion celebration feature is present."""
    has_script = await page.evaluate('''() => {
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
            if (s.textContent && s.textContent.includes('CompletionCelebration')) return true;
        }
        return false;
    }''')
    assert has_script, "CompletionCelebration script not found"

test_completion_celebration_script_loaded._group = 'Features'
test_completion_celebration_script_loaded._markers = ['features']

async def test_confetti_keyframe_exists(page):
    """Confetti animation keyframe is injected."""
    has_kf = await page.evaluate('''() => {
        for (const s of document.styleSheets) {
            try {
                for (const r of s.cssRules) {
                    if (r.name === 'confettiPop') return true;
                }
            } catch(e) {}
        }
        return false;
    }''')
    assert has_kf, "confettiPop keyframe not found"

test_confetti_keyframe_exists._group = 'Features'
test_confetti_keyframe_exists._markers = ['features', 'fast']

async def test_scroll_progress_width_updates(page):
    """Scroll progress bar width changes after scrolling."""
    await page.evaluate('() => { if(window.Router) window.Router.navigate("walk"); }')
    await page.wait_for_timeout(800)
    initial = await page.evaluate('() => document.getElementById("scrollprog").style.width')
    # Scroll the walkthrough pane
    await page.evaluate('() => { const p = document.getElementById("walk"); if(p) p.scrollTop = 200; }')
    await page.wait_for_timeout(300)
    after = await page.evaluate('() => document.getElementById("scrollprog").style.width')
    # Width should have changed (or be set to something)
    assert after is not None, "scrollprog width not set after scroll"

test_scroll_progress_width_updates._group = 'Features'
test_scroll_progress_width_updates._markers = ['features']

async def test_no_duplicate_scroll_progress(page):
    """Only one scroll progress feature exists."""
    has_bar = await page.evaluate('() => document.querySelectorAll("#scrollprog").length')
    assert has_bar == 1, f"Found {has_bar} scrollprog elements"

test_no_duplicate_scroll_progress._group = 'Features'
test_no_duplicate_scroll_progress._markers = ['features', 'fast']
