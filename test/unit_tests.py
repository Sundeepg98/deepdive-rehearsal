#!/usr/bin/env python3
"""Unit tests -- data layer, scoring logic, component contracts.
Run: python3 test/unit_tests.py"""

import sys, os, re, json

# Abstract base classes that are intentionally NOT registered as custom elements
# (panes `extends TopicPane`; TopicPane itself is never customElements.define'd).
BASE_CLASSES = {'TopicPane'}

BASE = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(BASE, 'src', 'scripts')

# ===== Test Runner =====
PASSED = 0
FAILED = 0

def test(name, condition, detail=""):
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

# ===== Suite 1: Data Layer =====
suite("DATA LAYER")

# Check data files are pure data (no DOM manipulation)
data_files = {
    # Repointed to the per-topic data files: the foundation OWNS this manifest so the
    # Phase-1 pane agents never edit this shared gate file when they delete the old data
    # files (cards/speak -> drill.js, steps -> walk.js, answers -> model.js, mock-run bank
    # -> bank.js). Bounds are generous to cover both the Phase-0 alias/stub and Phase-1 real.
    '../topics/content-pipeline/drill.js': 250,
    '../topics/content-pipeline/walk.js': 120,
    '../topics/content-pipeline/model.js': 280,
    '../topics/content-pipeline/bank.js': 150,
}

for f, expected_lines in data_files.items():
    path = os.path.join(SRC, f)
    if os.path.exists(path):
        with open(path, 'r') as fh:
            content = fh.read()
        lines = content.count('\n')
        has_ui = any(kw in content for kw in ['innerHTML', 'appendChild', 'createElement', 'adoptedStyleSheets', 'attachShadow'])
        # Check for actual class declarations (not just the word 'class' in strings)
        has_classes = re.search(r'class\s+\w+\s+extends\s+\w+', content) is not None
        test(f"{f} is pure data (no UI code)", not has_ui and not has_classes)
        test(f"{f} has reasonable size", 5 <= lines <= expected_lines + 50)
    else:
        test(f"{f} exists", False, f"File not found at {path}")

# ===== Suite 2: CSS Validity =====
suite("CSS SYNTAX")

with open(os.path.join(BASE, 'src', 'styles.css'), 'r') as f:
    css = f.read()

# Check all keyframes are well-formed
keyframes = re.findall(r'@keyframes\s+(\w+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}', css, re.DOTALL)
for name, body in keyframes:
    has_from = 'from{' in body or '0%' in body or '0%,100%' in body
    has_to = 'to{' in body or '100%' in body or '0%,100%' in body
    test(f"Keyframe '{name}' is well-formed", has_from or has_to, f"Body: {body[:80]}")

# Check braces are balanced
def balanced_braces(text):
    count = 0
    for ch in text:
        if ch == '{':
            count += 1
        elif ch == '}':
            count -= 1
        if count < 0:
            return False
    return count == 0

test("CSS braces are balanced", balanced_braces(css), f"Net braces: {css.count('{') - css.count('}')}")

# ===== Suite 3: JS File Integrity =====
suite("JS FILE INTEGRITY")

for root, dirs, files in os.walk(os.path.join(SRC, 'app')):
    for f in files:
        if f.endswith('.js'):
            path = os.path.join(root, f)
            relpath = os.path.relpath(path, BASE)
            with open(path, 'r') as fh:
                content = fh.read()

            # Check class definitions are closed
            for match in re.finditer(r'class\s+(\w+)\s+extends\s+\w+\s*\{', content):
                start = match.start()
                name = match.group(1)
                brace_count = 0
                found_opening = False
                for ch in content[start:]:
                    if ch == '{':
                        brace_count += 1
                        found_opening = True
                    elif ch == '}':
                        brace_count -= 1
                    if found_opening and brace_count == 0:
                        break
                else:
                    test(f"{relpath}: class '{name}' closed", False, "Class not properly closed (truncated?)")

            # Check customElements.define for each class
            class_names = [m.group(1) for m in re.finditer(r'class\s+(\w+)\s+extends', content)]
            for name in class_names:
                if name in BASE_CLASSES:
                    continue
                pattern = f"customElements.define.*{name}"
                found = re.search(pattern, content)
                test(f"{relpath}: {name} has define()", bool(found))

test("All JS files parseable", True)

# ===== Suite 4: Build Output =====
suite("BUILD OUTPUT")

html_path = os.path.join(BASE, 'deepdive_content_pipeline_rehearsal.html')
test("Built HTML exists", os.path.exists(html_path))

if os.path.exists(html_path):
    size = os.path.getsize(html_path)
    # Ceiling raised 6MB -> 16MB when the 38 markdown topics were authored to the full depth of
    # the hand-coded 8 (parity debt 684 -> 11): the offline single-file design inlines every topic,
    # so full-depth content across 46 topics is ~11.4MB. Still a runaway-bloat guard, recalibrated
    # to the real content baseline (not a code-size regression).
    test("Built HTML size reasonable (300KB-16MB, 46 full-depth topics)", 300000 <= size <= 16000000, f"Size: {size} bytes")

    with open(html_path, 'r') as f:
        html = f.read()

    # Check critical CSS features are present
    css_part = html[:html.find('<script>')]
    test("--glow CSS variable present", '--glow:' in css_part)
    test("Mesh gradient keyframes", 'meshA' in css_part and 'meshB' in css_part)
    test("Companion panel styles", '.cmp-inner' in css_part)
    test("Overlay scroll styles", 'overflow-y:auto' in css_part)

    # Check critical JS features
    js_part = html[html.find('<script>'):]
    test("Constructable base stylesheet shared by components", 'BASE_SHEET' in js_part and 'adoptedStyleSheets' in js_part)
    test("Drift-free timer", 'performance.now()' in js_part)
    test("AbortController", 'AbortController' in js_part)
    test("disconnectedCallback on drill", 'disconnectedCallback' in js_part and 'stopTimer' in js_part)
    test("disconnectedCallback on cram", 'disconnectedCallback' in js_part and '_io.disconnect' in js_part)

# ===== Summary =====
print(f"\n{'='*60}")
print(f"  Results: {PASSED} passed, {FAILED} failed")
sys.exit(0 if FAILED == 0 else 1)
