"""Test Module: Gap Features (v304)
Groups: Features
Markers: features
Tests 10 features that were confirmed genuinely missing by deep audit:
scroll-to-top, bookmark, offline, page-visibility, progress-ring,
typing-intro, audio-feedback, zoom-diagrams, animation-speed.
"""

async def test_scroll_to_top_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('ScrollToTop')) return true;
        return false;
    }''')
    assert has_script, "ScrollToTop script missing"
test_scroll_to_top_script_loaded._group = 'Features'
test_scroll_to_top_script_loaded._markers = ['features']

async def test_bookmark_system_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('BookmarkSystem')) return true;
        return false;
    }''')
    assert has_script, "BookmarkSystem script missing"
test_bookmark_system_script_loaded._group = 'Features'
test_bookmark_system_script_loaded._markers = ['features']

async def test_bookmark_stars_created(page):
    await page.wait_for_timeout(2000)
    stars = await page.evaluate('() => document.querySelectorAll("._bookmark-star").length')
    assert stars > 0, f"No bookmark stars found, got {stars}"
test_bookmark_stars_created._group = 'Features'
test_bookmark_stars_created._markers = ['features']

async def test_offline_indicator_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('OfflineIndicator')) return true;
        return false;
    }''')
    assert has_script, "OfflineIndicator script missing"
test_offline_indicator_script_loaded._group = 'Features'
test_offline_indicator_script_loaded._markers = ['features']

async def test_page_visibility_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('PageVisibility')) return true;
        return false;
    }''')
    assert has_script, "PageVisibility script missing"
test_page_visibility_script_loaded._group = 'Features'
test_page_visibility_script_loaded._markers = ['features']

async def test_progress_ring_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('ProgressRing')) return true;
        return false;
    }''')
    assert has_script, "ProgressRing script missing"
test_progress_ring_script_loaded._group = 'Features'
test_progress_ring_script_loaded._markers = ['features']

async def test_progress_ring_svg_created(page):
    await page.evaluate('() => { if(window.Router) window.Router.navigate("walk"); }')
    await page.wait_for_timeout(2500)
    has_ring = await page.evaluate('() => !!document.getElementById("_progress-ring-fill")')
    assert has_ring, "Progress ring SVG not created"
test_progress_ring_svg_created._group = 'Features'
test_progress_ring_svg_created._markers = ['features']

async def test_typing_intro_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('TypingIntro')) return true;
        return false;
    }''')
    assert has_script, "TypingIntro script missing"
test_typing_intro_script_loaded._group = 'Features'
test_typing_intro_script_loaded._markers = ['features']

async def test_audio_feedback_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('AudioFeedback')) return true;
        return false;
    }''')
    assert has_script, "AudioFeedback script missing"
test_audio_feedback_script_loaded._group = 'Features'
test_audio_feedback_script_loaded._markers = ['features']

async def test_zoom_diagrams_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('ZoomDiagrams')) return true;
        return false;
    }''')
    assert has_script, "ZoomDiagrams script missing"
test_zoom_diagrams_script_loaded._group = 'Features'
test_zoom_diagrams_script_loaded._markers = ['features']

async def test_animation_speed_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('AnimationSpeed')) return true;
        return false;
    }''')
    assert has_script, "AnimationSpeed script missing"
test_animation_speed_script_loaded._group = 'Features'
test_animation_speed_script_loaded._markers = ['features']

async def test_animation_speed_controls_exist(page):
    await page.wait_for_timeout(2000)
    has_controls = await page.evaluate('() => !!document.getElementById("_anim-speed")')
    assert has_controls, "Animation speed controls not found"
test_animation_speed_controls_exist._group = 'Features'
test_animation_speed_controls_exist._markers = ['features']
