#!/usr/bin/env python3
"""Visual regression tests — structure-based checks for layout issues.
These catch common visual bugs by inspecting the built HTML + CSS.
Run: python3 test/visual_regression.py"""

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
        print(f"  ✅ {name}")
    else:
        FAILED += 1
        print(f"  ❌ {name}")
        if detail:
            print(f"     → {detail}")

def suite(name):
    print(f"\n{'─'*60}")
    print(f"  {name}")
    print(f"{'─'*60}")

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

# Check mockbar transform — use broader search since CSS may span lines
has_mb_transform = 'translateY(115%)' in mobile_section and '.sidebar .mockbar' in mobile_section
has_mb_visibility = 'visibility:hidden' in mobile_section and '.sidebar .mockbar' in mobile_section
has_mb_fixed = 'position:fixed' in mobile_section and '.sidebar .mockbar' in mobile_section
has_mb_toolsopen = 'body.tools-open .sidebar .mockbar' in mobile_section

check("Mobile .mockbar has transform:translateY(115%)", has_mb_transform)
check("Mobile .mockbar has visibility:hidden", has_mb_visibility)
check("Mobile .mockbar has position:fixed", has_mb_fixed)
check("tools-open selector exists", has_mb_toolsopen)

# Verify the tools-open block has the right properties
if has_mb_toolsopen:
    # Find the tools-open block
    tidx = mobile_section.find('body.tools-open .sidebar .mockbar')
    block_end = mobile_section.find('}', tidx)
    tools_block = mobile_section[tidx:block_end+1] if block_end > 0 else ""
    check("tools-open removes translateY", 'transform:none' in tools_block or 'transform: none' in tools_block)
    check("tools-open sets visibility:visible", 'visibility:visible' in tools_block or 'visibility: visible' in tools_block)

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

# ===== Suite 5: Mobile Spacing =====
suite("MOBILE SPACING")

# Check dot has right margin from text
dot_gutter = extract_css_value(css, '.sidebar .seg button.on', 'padding-right')
check("Active tab has right padding for dot", dot_gutter is not None and '28' in dot_gutter, f"Found: {dot_gutter}")

# Check dot position
dot_right = extract_css_value(css, '.sidebar .seg button.on::after', 'right')
check("Dot indicator has right position", dot_right is not None and '12' in dot_right, f"Found: {dot_right}")

# ===== Suite 6: Z-Index Sanity =====
suite("Z-INDEX SANITY")

z_index_map = {}
for match in re.finditer(r'z-index:\s*(\d+)', css_in_html):
    val = int(match.group(1))
    if val not in z_index_map:
        z_index_map[val] = 0
    z_index_map[val] += 1

# Check overlays have highest z-index
overlay_z = extract_css_value(css_in_html, '.mock-ov', 'z-index')
if overlay_z:
    check(f"Overlay z-index ({overlay_z}) is highest", int(overlay_z) >= max(z_index_map.keys()))

# ===== Summary =====
print(f"\n{'='*60}")
print(f"  Results: {PASSED} passed, {FAILED} failed")
print(f"{'='*60}")
sys.exit(0 if FAILED == 0 else 1)
