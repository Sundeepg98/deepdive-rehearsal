"""Test Module: Tour Guide Feature
Groups: Tour, Onboarding
Markers: tour, components
Tests tour guide overlay, spotlight, keyboard controls, dismissal.
"""

async def test_tour_api_exists(page):
    exists = await page.evaluate('() => typeof window.TourGuide === "object"')
    assert exists, "TourGuide API not available"
test_tour_api_exists._group = 'Tour'
test_tour_api_exists._markers = ['tour', 'fast']

async def test_tour_has_start_method(page):
    has_start = await page.evaluate('() => typeof window.TourGuide.start === "function"')
    assert has_start
test_tour_has_start_method._group = 'Tour'
test_tour_has_start_method._markers = ['tour', 'fast']

async def test_tour_has_destroy_method(page):
    has_destroy = await page.evaluate('() => typeof window.TourGuide.destroy === "function"')
    assert has_destroy
test_tour_has_destroy_method._group = 'Tour'
test_tour_has_destroy_method._markers = ['tour', 'fast']

async def test_tour_has_reset_method(page):
    has_reset = await page.evaluate('() => typeof window.TourGuide.reset === "function"')
    assert has_reset
test_tour_has_reset_method._group = 'Tour'
test_tour_has_reset_method._markers = ['tour', 'fast']

async def test_tour_creates_overlay(page):
    # Enable tour for this test
    await page.evaluate('() => { window.__DISABLE_TOUR__ = false; window.TourGuide.reset(); window.TourGuide.start(); }')
    await page.wait_for_timeout(500)
    overlay = await page.evaluate('() => !!document.getElementById("_tour-overlay")')
    assert overlay, "Tour overlay not created"
test_tour_creates_overlay._group = 'Tour'
test_tour_creates_overlay._markers = ['tour']

async def test_tour_creates_spotlight(page):
    await page.evaluate('() => { window.__DISABLE_TOUR__ = false; window.TourGuide.reset(); window.TourGuide.start(); }')
    await page.wait_for_timeout(500)
    spotlight = await page.evaluate('() => !!document.getElementById("_tour-spotlight")')
    assert spotlight, "Tour spotlight not created"
test_tour_creates_spotlight._group = 'Tour'
test_tour_creates_spotlight._markers = ['tour']

async def test_tour_escape_dismisses(page):
    await page.evaluate('() => { window.__DISABLE_TOUR__ = false; window.TourGuide.reset(); window.TourGuide.start(); }')
    await page.wait_for_timeout(500)
    await page.keyboard.press('Escape')
    await page.wait_for_timeout(600)
    active = await page.evaluate('() => window.TourGuide.isActive()')
    assert not active, "Tour should be dismissed after Escape"
test_tour_escape_dismisses._group = 'Tour'
test_tour_escape_dismisses._markers = ['tour', 'keyboard']

async def test_tour_api_is_functional(page):
    # Verify TourGuide API is fully functional
    api = await page.evaluate('''() => ({
        has_start: typeof window.TourGuide.start === 'function',
        has_destroy: typeof window.TourGuide.destroy === 'function',
        has_reset: typeof window.TourGuide.reset === 'function',
        has_goToStep: typeof window.TourGuide.goToStep === 'function',
        has_isActive: typeof window.TourGuide.isActive === 'function'
    })''')
    assert api['has_start'], "TourGuide.start missing"
    assert api['has_destroy'], "TourGuide.destroy missing"
    assert api['has_reset'], "TourGuide.reset missing"
    assert api['has_goToStep'], "TourGuide.goToStep missing"
    assert api['has_isActive'], "TourGuide.isActive missing"
test_tour_api_is_functional._group = 'Tour'
test_tour_api_is_functional._markers = ['tour', 'fast']
