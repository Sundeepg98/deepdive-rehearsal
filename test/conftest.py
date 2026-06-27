"""
conftest.py — Clean async fixtures for modular Playwright E2E tests.
Uses pytest-asyncio 1.4.x with asyncio_mode=auto.

SELECTIVE RUNNING:
  pytest test/test_spa.py -v -k "Router"              # Router tests
  pytest test/test_spa.py -v -k "test_navigate"       # Navigation tests
  pytest test/test_spa.py -v -k "Views"               # View manager tests
  pytest test/test_spa.py -v -k "not slow"            # Exclude slow
  pytest test/test_spa.py::TestRouter::test_navigate_to_drill -v  # Single test
  pytest test/ -v -m "critical"                       # Critical tests
  pytest test/ -v -m "fast"                           # Fast tests
  pytest test/ --co                                   # Count only
  pytest test/ -x                                     # Stop on first fail
"""

import pytest
import pytest_asyncio
from playwright.async_api import async_playwright

HTML_PATH = 'file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'


# ============================================================
# Fixtures
# ============================================================
@pytest_asyncio.fixture(loop_scope="session")
async def browser():
    pw = await async_playwright().start()
    bw = await pw.chromium.launch(headless=True)
    yield bw
    await bw.close()
    await pw.stop()


@pytest_asyncio.fixture(loop_scope="function")
async def page(browser):
    pg = await browser.new_page(viewport={'width': 1280, 'height': 800})
    yield pg
    await pg.close()


@pytest_asyncio.fixture(loop_scope="function")
async def mobile_page(browser):
    pg = await browser.new_page(viewport={'width': 375, 'height': 812})
    yield pg
    await pg.close()


@pytest_asyncio.fixture(loop_scope="function")
async def app(page):
    await page.goto(HTML_PATH)
    await page.wait_for_timeout(2500)
    yield page


@pytest_asyncio.fixture(loop_scope="function")
async def app_mobile(mobile_page):
    await mobile_page.goto(HTML_PATH)
    await mobile_page.wait_for_timeout(2500)
    yield mobile_page


# ============================================================
# Helpers
# ============================================================
async def navigate_to(page, view_id):
    await page.evaluate(f'''() => {{ if (window.Router) window.Router.navigate("{view_id}"); }}''')
    await page.wait_for_timeout(800)


async def get_current_view(page):
    return await page.evaluate('''() => window.Router ? window.Router.current().view : 'no-router' ''')
