#!/usr/bin/env python3
"""STATIC LAYOUT ASSERTIONS -- a regex over the CSS/HTML SOURCE. IT CANNOT SEE A PIXEL.

This file was called `visual_regression.py` for most of its life, and the name was a lie that
cost real coverage. It imports `re, sys, os` and nothing else: no browser, no screenshot, no image
decoder. It can assert that the string `display:none` appears inside the `.mock-ov` block; it
cannot observe that anything was actually PAINTED. A DOM reorder that moved the pane switcher
sailed through it GREEN, and an agent had to write a private pixel differ to prove paint-neutrality
(0 of 284,160 px desktop, 0 of 329,160 px mobile) because THE GATE COULD NOT. It was the tenth
check in this repo that structurally could not fail -- not because its assertions were wrong, but
because its NAME promised a capability its imports made impossible.

The assertions below are still worth having. They are cheap, they need no browser, and they reach
places a screenshot cannot -- :hover rules, keyframe bodies, z-index tokens, duplicate IDs. They
are just not VISUAL REGRESSION, so they no longer claim to be.

THE REAL PIXEL CHECK IS `test/visual_regression.cjs`: it renders the app in Chromium, brings it to
a proven rest state across all 18 shadow/light roots, and diffs the decoded pixels against
committed baselines. If you are about to add an assertion here that is really about what the screen
LOOKS like, it belongs there instead.

Run: python3 test/layout_static.py"""

import re, sys, os

BASE = os.path.join(os.path.dirname(__file__), '..')

def load_built_html():
    path = os.path.join(BASE, 'deepdive_content_pipeline_rehearsal.html')
    with open(path, 'r') as f:
        return f.read()

def load_css():
    path = os.path.join(BASE, 'src', 'styles.css')
    with open(path, 'r') as f:
        return f.read()

def extract_css_value(css, selector, property):
    """Extract a CSS property value for a given selector."""
    # Find the selector block
    pattern = re.escape(selector) + r'\s*\{([^}]*)\}'
    match = re.search(pattern, css)
    if match:
        block = match.group(1)
        prop_match = re.search(re.escape(property) + r'\s*:\s*([^;]+)', block)
        if prop_match:
            return prop_match.group(1).strip()
    return None

PASSED = 0
FAILED = 0

def check(name, condition, detail=""):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  PASS {name}")
    else:
        FAILED += 1
        print(f"  FAIL {name}")
        if detail:
            print(f"     -> {detail}")

def suite(name):
    print(f"\n{'-'*60}")
    print(f"  {name}")
    print(f"{'-'*60}")

html = load_built_html()
css = load_css()
css_in_html = html[:html.find('<script>')]
html_only = html[:html.find('<script>')]  # Only HTML, not JS

# ===== Suite 1: Mobile Tools Bar Hidden =====
suite("MOBILE TOOLS BAR")

# Extract mobile media query section
mobile_section = ""
in_mobile = False
for line in css.split('\n'):
    if '@media(max-width:919px)' in line:
        in_mobile = True
    elif '@media' in line and 'min-width' in line:
        in_mobile = False
    if in_mobile:
        mobile_section += line + '\n'

# This codebase reveals the off-canvas mobile tools sheet via a transform
# toggle (translateY off-screen -> transform:none), not a display toggle.
has_mb_transform = 'translateY' in mobile_section and '.sidebar .mockbar' in mobile_section
has_mb_fixed = 'position:fixed' in mobile_section and '.sidebar .mockbar' in mobile_section
has_mb_toolsopen = 'body.tools-open .sidebar .mockbar' in mobile_section

check("Mobile .mockbar hidden via translateY when closed", has_mb_transform)
check("Mobile .mockbar has position:fixed", has_mb_fixed)
check("tools-open selector exists", has_mb_toolsopen)

# Verify the tools-open block reveals the sheet (transform:none)
if has_mb_toolsopen:
    tidx = mobile_section.find('body.tools-open .sidebar .mockbar')
    block_end = mobile_section.find('}', tidx)
    tools_block = mobile_section[tidx:block_end+1] if block_end > 0 else ""
    check("tools-open removes transform", 'transform:none' in tools_block or 'transform: none' in tools_block)

# ===== Suite 2: Overlays Hidden by Default =====
suite("OVERLAY VISIBILITY")

overlays = ['.mock-ov', '.cram-ov']
for ov in overlays:
    val = extract_css_value(css_in_html, ov, 'display')
    check(f"{ov} has display:none by default", val == 'none', f"Found: {val}")

    # Check .open state
    open_val = extract_css_value(css_in_html, ov + '.open', 'display')
    check(f"{ov}.open changes display", open_val is not None and open_val != 'none', f"Found: {open_val}")

# Check no overlay content is visible inline
for ov_class in ['mock-ov', 'cram-ov']:
    # Find the element in HTML
    pattern = f'class="[^"]*{ov_class}[^"]*"'
    matches = re.findall(pattern, html)
    for match in matches:
        # Check it has aria-hidden="true"
        idx = html.find(match)
        nearby = html[idx:idx+200]
        has_aria_hidden = 'aria-hidden="true"' in nearby
        check(f"{ov_class} has aria-hidden=true", has_aria_hidden)

# ===== Suite 3: No Duplicate Button IDs =====
suite("BUTTON ID UNIQUENESS")

# Only check IDs in HTML (not in JS code)
button_ids = re.findall(r'id="([^"]+)"', html_only)
id_counts = {}
for bid in button_ids:
    id_counts[bid] = id_counts.get(bid, 0) + 1

duplicates = {k: v for k, v in id_counts.items() if v > 1}
for bid, count in duplicates.items():
    check(f"HTML button ID '{bid}' is unique", False, f"Found {count} times")

if not duplicates:
    check("All HTML button IDs are unique", True, f"Checked {len(button_ids)} IDs")

# ===== Suite 4: CSS Keyframe Validity =====
suite("CSS KEYFRAME INTEGRITY")

keyframes_in_html = re.findall(r'@keyframes\s+(\w+)', css_in_html)
for name in keyframes_in_html:
    # Extract the keyframe body
    pattern = r'@keyframes\s+' + re.escape(name) + r'\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}'
    match = re.search(pattern, css_in_html)
    if match:
        body = match.group(1)
        # Check for malformed content
        has_to = 'to{' in body or 'to ' in body or '100%' in body
        has_from = 'from{' in body or 'from ' in body or '0%' in body or '0%,100%' in body
        check(f"Keyframe '{name}' is well-formed", has_to or has_from, f"Body: {body[:50]}")

# ===== Suite 5: Z-Index Sanity =====
suite("Z-INDEX SANITY")

# z-index is now tokenized (var(--z-NAME)); resolve tokens so values parse correctly
z_tokens = {m.group(1): int(m.group(2)) for m in re.finditer(r'--z-([a-z0-9-]+):\s*(-?\d+)', css_in_html)}
def resolve_z(v):
    v = (v or '').strip()
    m = re.match(r'var\(\s*--z-([a-z0-9-]+)\s*\)', v)
    if m:
        return z_tokens.get(m.group(1))
    try:
        return int(v)
    except (ValueError, TypeError):
        return None

z_index_map = {}
for match in re.finditer(r'z-index:\s*(var\(--z-[a-z0-9-]+\)|-?\d+)', css_in_html):
    val = resolve_z(match.group(1))
    if val is not None:
        z_index_map[val] = z_index_map.get(val, 0) + 1

# Check overlays have highest z-index
overlay_z = extract_css_value(css_in_html, '.mock-ov', 'z-index')
if overlay_z and z_index_map:
    rz = resolve_z(overlay_z)
    if rz is not None:
        check(f"Overlay z-index ({overlay_z} = {rz}) is highest", rz >= max(z_index_map.keys()))

# ===== Summary =====
# The gate reports a check by its LAST LINE. Say what this actually proved -- and, just as
# importantly, what it did not, so nobody reads a green here as "the app looks right".
print(f"\n{'='*60}")
if FAILED:
    print(f"LAYOUT STATIC: FAIL ({FAILED} failed, {PASSED} passed)")
else:
    print(f"LAYOUT STATIC: PASS  ({PASSED} source assertions; NO PIXELS INSPECTED -- "
          f"test/visual_regression.cjs is the check that looks at the screen)")
sys.exit(0 if FAILED == 0 else 1)
