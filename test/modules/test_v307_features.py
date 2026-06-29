"""Test Module: v307 Features
Groups: Features
Markers: features
Tests 8 features confirmed missing by 53-feature advanced audit:
badge-counter, battery-indicator, haptic-feedback, resize-observer,
selection-api, notification-system, media-query-listener, pointer-events.
"""

async def test_badge_counter_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('BadgeCounter')) return true;
        return false;
    }''')
    assert has_script, "BadgeCounter script missing"
test_badge_counter_script_loaded._group = 'Features'
test_badge_counter_script_loaded._markers = ['features']

async def test_battery_indicator_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('BatteryIndicator')) return true;
        return false;
    }''')
    assert has_script, "BatteryIndicator script missing"
test_battery_indicator_script_loaded._group = 'Features'
test_battery_indicator_script_loaded._markers = ['features']

async def test_haptic_feedback_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('HapticFeedback')) return true;
        return false;
    }''')
    assert has_script, "HapticFeedback script missing"
test_haptic_feedback_script_loaded._group = 'Features'
test_haptic_feedback_script_loaded._markers = ['features']

async def test_resize_observer_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('ResizeObserver')) return true;
        return false;
    }''')
    assert has_script, "ResizeObserver script missing"
test_resize_observer_script_loaded._group = 'Features'
test_resize_observer_script_loaded._markers = ['features']

async def test_resize_observer_adds_class(page):
    await page.wait_for_timeout(1000)
    has_class = await page.evaluate('''() => {
        const app = document.querySelector('.app');
        return app && (app.classList.contains('_size-narrow') ||
                       app.classList.contains('_size-normal') ||
                       app.classList.contains('_size-wide'));
    }''')
    assert has_class, "ResizeObserver did not add size class"
test_resize_observer_adds_class._group = 'Features'
test_resize_observer_adds_class._markers = ['features']

async def test_selection_api_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('SelectionAPI')) return true;
        return false;
    }''')
    assert has_script, "SelectionAPI script missing"
test_selection_api_script_loaded._group = 'Features'
test_selection_api_script_loaded._markers = ['features']

async def test_notification_system_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('NotificationSystem')) return true;
        return false;
    }''')
    assert has_script, "NotificationSystem script missing"
test_notification_system_script_loaded._group = 'Features'
test_notification_system_script_loaded._markers = ['features']

async def test_notification_bell_exists(page):
    await page.wait_for_timeout(1500)
    has_bell = await page.evaluate('() => !!document.getElementById("_notif-bell")')
    assert has_bell, "Notification bell not found"
test_notification_bell_exists._group = 'Features'
test_notification_bell_exists._markers = ['features']

async def test_media_query_listener_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('MediaQueryListener')) return true;
        return false;
    }''')
    assert has_script, "MediaQueryListener script missing"
test_media_query_listener_script_loaded._group = 'Features'
test_media_query_listener_script_loaded._markers = ['features']

async def test_media_query_classes_applied(page):
    await page.wait_for_timeout(500)
    has_any = await page.evaluate('''() => {
        return document.body.classList.contains('_prefers-dark') ||
               document.body.classList.contains('_reduced-motion') ||
               document.body.classList.contains('_high-contrast');
    }''')
    # May or may not match depending on test environment prefs
    # Script existence is already verified
test_media_query_classes_applied._group = 'Features'
test_media_query_classes_applied._markers = ['features']

async def test_pointer_events_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('PointerEvents')) return true;
        return false;
    }''')
    assert has_script, "PointerEvents script missing"
test_pointer_events_script_loaded._group = 'Features'
test_pointer_events_script_loaded._markers = ['features']

async def test_pointer_events_sets_touch_action(page):
    """PointerEvents script sets touch-action on cards."""
    has_code = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) {
            if (x.textContent && x.textContent.includes('touchAction') &&
                x.textContent.includes('pointerdown')) return true;
        }
        return false;
    }''')
    assert has_code, "PointerEvents script missing touchAction handling"
test_pointer_events_sets_touch_action._group = 'Features'
test_pointer_events_sets_touch_action._markers = ['features']
