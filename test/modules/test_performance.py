"""Test Module: Performance
Groups: Size, CSS
Markers: performance, fast
"""

import os

CSS_FILE = '/mnt/agents/output/workspace/deepdive-rehearsal/src/styles.css'
HTML_FILE = '/mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html'

async def test_html_under_500kb(page):
    assert os.path.getsize(HTML_FILE) < 500000
test_html_under_500kb._group = 'Size'
test_html_under_500kb._markers = ['performance', 'fast']

async def test_html_under_1mb(page):
    assert os.path.getsize(HTML_FILE) < 1048576
test_html_under_1mb._group = 'Size'
test_html_under_1mb._markers = ['performance', 'fast']

async def test_brace_balance(page):
    with open(CSS_FILE) as f:
        c = f.read()
    assert c.count('{') == c.count('}'), f"Unbalanced: {c.count('{')} open vs {c.count('}')} close"
test_brace_balance._group = 'CSS'
test_brace_balance._markers = ['performance', 'fast']

async def test_has_keyframes(page):
    with open(CSS_FILE) as f:
        assert '@keyframes' in f.read()
test_has_keyframes._group = 'CSS'
test_has_keyframes._markers = ['performance', 'fast']

async def test_has_media_queries(page):
    with open(CSS_FILE) as f:
        assert f.read().count('@media') >= 2
test_has_media_queries._group = 'CSS'
test_has_media_queries._markers = ['performance', 'fast']

async def test_has_print_styles(page):
    with open(CSS_FILE) as f:
        assert '@media print' in f.read()
test_has_print_styles._group = 'CSS'
test_has_print_styles._markers = ['performance', 'fast']

async def test_has_reduced_motion(page):
    with open(CSS_FILE) as f:
        assert 'prefers-reduced-motion' in f.read()
test_has_reduced_motion._group = 'CSS'
test_has_reduced_motion._markers = ['performance', 'fast']

async def test_has_dark_theme(page):
    with open(CSS_FILE) as f:
        assert 'data-theme="dark"' in f.read()
test_has_dark_theme._group = 'CSS'
test_has_dark_theme._markers = ['performance', 'fast']

async def test_load_under_5s(page):
    import time
    t0 = time.time()
    await page.goto('file:///mnt/agents/output/workspace/deepdive-rehearsal/deepdive_content_pipeline_rehearsal.html')
    await page.wait_for_timeout(2000)
    assert time.time() - t0 < 5
test_load_under_5s._group = 'Size'
test_load_under_5s._markers = ['performance', 'slow']
