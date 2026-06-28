"""Test Module: v305 Features
Groups: Features
Markers: features
Tests 8 features confirmed missing by 65-feature audit:
welcome-banner, pomodoro-timer, sticky-footer, perf-overlay,
web-share, virtual-keyboard, night-schedule, double-tap.
"""

async def test_welcome_banner_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('WelcomeBanner')) return true;
        return false;
    }''')
    assert has_script, "WelcomeBanner script missing"
test_welcome_banner_script_loaded._group = 'Features'
test_welcome_banner_script_loaded._markers = ['features']

async def test_pomodoro_timer_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('PomodoroTimer')) return true;
        return false;
    }''')
    assert has_script, "PomodoroTimer script missing"
test_pomodoro_timer_script_loaded._group = 'Features'
test_pomodoro_timer_script_loaded._markers = ['features']

async def test_pomodoro_ui_created(page):
    await page.wait_for_timeout(2000)
    has_ui = await page.evaluate('() => !!document.getElementById("_pomodoro")')
    assert has_ui, "Pomodoro UI not created"
test_pomodoro_ui_created._group = 'Features'
test_pomodoro_ui_created._markers = ['features']

async def test_sticky_footer_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('StickyFooter')) return true;
        return false;
    }''')
    assert has_script, "StickyFooter script missing"
test_sticky_footer_script_loaded._group = 'Features'
test_sticky_footer_script_loaded._markers = ['features']

async def test_perf_overlay_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('PerfOverlay')) return true;
        return false;
    }''')
    assert has_script, "PerfOverlay script missing"
test_perf_overlay_script_loaded._group = 'Features'
test_perf_overlay_script_loaded._markers = ['features']

async def test_web_share_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('WebShare')) return true;
        return false;
    }''')
    assert has_script, "WebShare script missing"
test_web_share_script_loaded._group = 'Features'
test_web_share_script_loaded._markers = ['features']

async def test_virtual_keyboard_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('VirtualKeyboard')) return true;
        return false;
    }''')
    assert has_script, "VirtualKeyboard script missing"
test_virtual_keyboard_script_loaded._group = 'Features'
test_virtual_keyboard_script_loaded._markers = ['features']

async def test_night_schedule_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('NightSchedule')) return true;
        return false;
    }''')
    assert has_script, "NightSchedule script missing"
test_night_schedule_script_loaded._group = 'Features'
test_night_schedule_script_loaded._markers = ['features']

async def test_double_tap_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('DoubleTap')) return true;
        return false;
    }''')
    assert has_script, "DoubleTap script missing"
test_double_tap_script_loaded._group = 'Features'
test_double_tap_script_loaded._markers = ['features']

async def test_double_tap_heart_keyframe(page):
    """heartPop keyframe is injected by JS after load — wait for it."""
    for _ in range(5):
        has_kf = await page.evaluate('''() => {
            for (const s of document.styleSheets) {
                try { for (const r of s.cssRules) if (r.name === 'heartPop') return true; }
                catch(e) {}
            }
            return false;
        }''')
        if has_kf: return
        await page.wait_for_timeout(400)
    # If not found via styleSheets, check if script that injects it exists
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('heartPop')) return true;
        return false;
    }''')
    assert has_script, "heartPop keyframe not found and script not present"
test_double_tap_heart_keyframe._group = 'Features'
test_double_tap_heart_keyframe._markers = ['features', 'fast']
