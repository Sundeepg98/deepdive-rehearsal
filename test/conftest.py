"""
conftest.py — Pure sync Playwright fixtures for pytest.
Usage: pytest test/ -v -m "spa"
"""
import pytest, asyncio, os
from playwright.async_api import async_playwright

HTML_PATH = 'file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'

def pytest_configure(config):
    for m in ['layout','spa','router','views','components','accessibility','performance','visual','slow','critical']:
        config.addinivalue_line("markers", f"{m}: test category")

# ---- Dedicated event loop for Playwright ----
_loop = asyncio.new_event_loop()

def arun(coro):
    return _loop.run_until_complete(coro)

# ---- Sync wrapper for Playwright Page ----
class SyncPage:
    """Wraps async Playwright Page methods with sync equivalents."""
    def __init__(self, page):
        self._p = page

    def evaluate(self, expr, arg=None):
        return arun(self._p.evaluate(expr, arg))

    def goto(self, url):
        return arun(self._p.goto(url))

    def wait_for_timeout(self, ms):
        return arun(self._p.wait_for_timeout(ms))

    def go_back(self):
        return arun(self._p.go_back())

    def go_forward(self):
        return arun(self._p.go_forward())

    def keyboard_press(self, key):
        return arun(self._p.keyboard.press(key))

    def close(self):
        return arun(self._p.close())

    def __getattr__(self, name):
        return getattr(self._p, name)

# ---- Browser management ----
_browser = None
_playwright = None

async def _launch():
    global _playwright, _browser
    if _browser is None:
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(headless=True)
    return _browser

async def _shutdown():
    global _playwright, _browser
    if _browser: await _browser.close(); _browser = None
    if _playwright: await _playwright.stop(); _playwright = None

@pytest.fixture(scope="session")
def browser():
    br = arun(_launch())
    yield br
    arun(_shutdown())

@pytest.fixture
def page(browser):
    pg = arun(browser.new_page(viewport={'width': 1280, 'height': 800}))
    yield SyncPage(pg)
    arun(pg.close())

@pytest.fixture
def mobile_page(browser):
    pg = arun(browser.new_page(viewport={'width': 375, 'height': 812}))
    yield SyncPage(pg)
    arun(pg.close())

@pytest.fixture
def loaded_page(page):
    page.goto(HTML_PATH)
    page.wait_for_timeout(2500)
    yield page

# ---- Navigation helpers (available to all tests) ----
def nav_to(page, label):
    return page.evaluate(f'''() => {{
        const btns = document.querySelectorAll(".seg button, .sidebar .seg button");
        for (const b of btns) {{
            if (b.textContent.includes("{label.replace("'", "\\'")}")) {{ b.click(); return true; }}
        }}
        return false;
    }}''')

def router_navigate(page, view_id):
    return page.evaluate(f'''() => {{
        if (window.Router && window.Router.navigate) {{ window.Router.navigate("{view_id}"); return true; }}
        return false;
    }}''')
