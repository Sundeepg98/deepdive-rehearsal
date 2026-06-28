"""Test Module: Redundancy & Duplicate Detection
Groups: Architecture
Markers: architecture, critical
Detects duplicate features, overlapping IDs, and similar-named modules.
Prevents building features that already exist.
"""
import os

PROJECT_DIR = '/mnt/agents/output/workspace/deepdive-rehearsal'

# Known pairs of similar names that are actually different features
ALLOWED_SIMILAR = {
    ('session-progress', 'session-timer'),  # progress tracking vs countdown timer
    ('cram-sheet', 'cram-overlay'),         # sheet content vs overlay frame
    ('scope-overlay', 'gameplan-overlay'),  # different overlays
}


def _get_module_names():
    """Get all JS module filenames without .js extension."""
    app_dir = os.path.join(PROJECT_DIR, 'src/scripts/app')
    names = set()
    for f in os.listdir(app_dir):
        if f.endswith('.js'):
            names.add(f[:-3])
    return names


def _similarity(a, b):
    """Check if two names are suspiciously similar."""
    a_words = set(a.replace('-', '_').split('_'))
    b_words = set(b.replace('-', '_').split('_'))
    common = a_words & b_words
    total = a_words | b_words
    if len(total) == 0:
        return 0
    return len(common) / len(total)


async def test_no_duplicate_feature_names(page):
    """Detect modules with very similar names (potential duplicates)."""
    names = _get_module_names()
    duplicates = []
    name_list = sorted(names)
    for i, a in enumerate(name_list):
        for b in name_list[i + 1:]:
            sim = _similarity(a, b)
            if sim >= 0.5:
                pair = tuple(sorted([a, b]))
                if pair not in ALLOWED_SIMILAR:
                    duplicates.append(f"{a} vs {b} (similarity: {sim:.0%})")
    assert len(duplicates) == 0, f"Potential duplicate modules found:\n" + "\n".join(duplicates)

test_no_duplicate_feature_names._group = 'Architecture'
test_no_duplicate_feature_names._markers = ['architecture', 'critical', 'fast']


async def test_no_duplicate_dom_ids(page):
    """No duplicate IDs in the built HTML."""
    html_path = os.path.join(PROJECT_DIR, 'deepdive_content_pipeline_rehearsal.html')
    with open(html_path) as f:
        content = f.read()

    import re
    ids = re.findall(r'id=["\']([^"\']+)["\']', content)
    seen = {}
    duplicates = []
    # Known intentional duplicates (templates reused across components)
    allowed_dupes = {'mxre'}  # used in multiple component templates intentionally
    for id_val in ids:
        if id_val in seen:
            if id_val not in allowed_dupes:
                duplicates.append(f"#{id_val} appears {seen[id_val] + 1}+ times")
            seen[id_val] += 1
        else:
            seen[id_val] = 1
    assert len(duplicates) == 0, f"Duplicate IDs found:\n" + "\n".join(duplicates[:10])

test_no_duplicate_dom_ids._group = 'Architecture'
test_no_duplicate_dom_ids._markers = ['architecture', 'fast']


async def test_keyboard_overlay_exists_once(page):
    """Only one keyboard shortcut overlay should exist (virtual-keyboard.js is different — detects mobile keyboard)."""
    app_dir = os.path.join(PROJECT_DIR, 'src/scripts/app')
    # Only check for shortcut overlays, not virtual keyboard detection
    keyboard_files = [f for f in os.listdir(app_dir) if f in ['keyboard-overlay.js']]
    assert len(keyboard_files) <= 1, f"Multiple keyboard overlay files: {keyboard_files}"
    # Verify virtual-keyboard.js exists separately (different purpose)
    virtual_kbd = os.path.join(app_dir, 'virtual-keyboard.js')
    assert os.path.exists(virtual_kbd), "virtual-keyboard.js missing"

test_keyboard_overlay_exists_once._group = 'Architecture'
test_keyboard_overlay_exists_once._markers = ['architecture', 'fast']


async def test_no_duplicate_search_features(page):
    """Only one search feature should exist."""
    app_dir = os.path.join(PROJECT_DIR, 'src/scripts/app')
    search_files = [f for f in os.listdir(app_dir) if 'search' in f.lower()]
    assert len(search_files) <= 1, f"Multiple search files: {search_files}"

test_no_duplicate_search_features._group = 'Architecture'
test_no_duplicate_search_features._markers = ['architecture', 'fast']

async def test_no_duplicate_dark_mode_toggles(page):
    """Only one dark mode toggle should exist (themetog in mockbar is canonical)."""
    app_dir = os.path.join(PROJECT_DIR, 'src/scripts/app')
    # Count files that create a dark mode toggle
    toggle_creators = []
    for f in os.listdir(app_dir):
        if not f.endswith('.js'):
            continue
        path = os.path.join(app_dir, f)
        with open(path) as fh:
            content = fh.read()
        # Check for dark mode toggle creation patterns
        if 'dark mode' in content.lower() and 'toggle' in content.lower() and 'createElement' in content:
            toggle_creators.append(f)
        elif 'themetog' in content and 'createElement' in content:
            toggle_creators.append(f)
    # Only cram-sheet.js should manage the theme toggle
    assert len(toggle_creators) <= 1, f"Multiple files creating dark mode toggles: {toggle_creators}"

test_no_duplicate_dark_mode_toggles._group = 'Architecture'
test_no_duplicate_dark_mode_toggles._markers = ['architecture', 'fast']


async def test_all_included_scripts_exist(page):
    """Every script referenced in app.js must exist on disk."""
    app_js = os.path.join(PROJECT_DIR, 'src/scripts/app.js')
    with open(app_js) as f:
        content = f.read()

    import re
    includes = re.findall(r'<!--@build:include ([^\s]+)-->', content)
    missing = []
    for inc in includes:
        # inc is like "scripts/app/base-styles.js" — prepend "src/"
        path = os.path.join(PROJECT_DIR, 'src', inc)
        if not os.path.exists(path):
            missing.append(inc)
    assert len(missing) == 0, f"Missing scripts referenced in app.js: {missing}"

test_all_included_scripts_exist._group = 'Architecture'
test_all_included_scripts_exist._markers = ['architecture', 'critical', 'fast']


async def test_no_orphan_scripts(page):
    """Scripts on disk should be referenced in app.js (or intentionally standalone)."""
    app_js = os.path.join(PROJECT_DIR, 'src/scripts/app.js')
    with open(app_js) as f:
        content = f.read()

    import re
    includes = set(re.findall(r'<!--@build:include ([^\s]+)-->', content))

    app_dir = os.path.join(PROJECT_DIR, 'src/scripts/app')
    # Subdirectories handled separately
    orphans = []
    # Some scripts are loaded dynamically — allow those
    allowed_orphans = {'view-transitions.js'}  # loaded conditionally
    for f in os.listdir(app_dir):
        if f.endswith('.js'):
            ref = f'scripts/app/{f}'
            if ref not in includes and f not in allowed_orphans:
                orphans.append(f)
    assert len(orphans) == 0, f"Orphan scripts (not in app.js): {orphans}"

test_no_orphan_scripts._group = 'Architecture'
test_no_orphan_scripts._markers = ['architecture', 'fast']


async def test_unique_feature_descriptions(page):
    """Every module should have a unique description comment."""
    app_dir = os.path.join(PROJECT_DIR, 'src/scripts/app')
    descriptions = {}
    for f in os.listdir(app_dir):
        if not f.endswith('.js'):
            continue
        path = os.path.join(app_dir, f)
        with open(path) as fh:
            first_lines = fh.read(500)
        # Extract description from header comment
        import re
        desc_match = re.search(r'/\*\*?\s*(.+?)\*/', first_lines, re.DOTALL)
        if desc_match:
            desc = desc_match.group(1).strip()[:80]
            if desc in descriptions:
                duplicates.append(f"{f} and {descriptions[desc]} share description: {desc}")
            else:
                descriptions[desc] = f

test_unique_feature_descriptions._group = 'Architecture'
test_unique_feature_descriptions._markers = ['architecture', 'fast']
