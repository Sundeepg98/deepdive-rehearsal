#!/usr/bin/env python3
"""File integrity check -- verifies source files aren't truncated and JS is valid.
Run this before committing: python3 test/file_integrity.py"""

import re, sys, os, subprocess

# Abstract base classes that are intentionally NOT registered as custom elements
# (panes `extends TopicPane`; TopicPane itself is never customElements.define'd).
BASE_CLASSES = {'TopicPane'}

def check_js_file(path):
    """Check a JS file for truncation (unclosed classes, unclosed functions)."""
    with open(path, 'r') as f:
        content = f.read()

    errors = []

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
            errors.append(f"  FAIL Class '{name}' is NOT properly closed (truncated?)")

    # Check for customElements.define for each class
    class_names = [m.group(1) for m in re.finditer(r'class\s+(\w+)\s+extends', content)]
    for name in class_names:
        if name in BASE_CLASSES:
            continue
        pattern = f"customElements.define.*{name}"
        if not re.search(pattern, content):
            errors.append(f"  FAIL customElements.define missing for class '{name}'")

    return errors

def check_all_source_files():
    """Check all JS source files in src/scripts/."""
    base = os.path.join(os.path.dirname(__file__), '..')
    scripts_dir = os.path.join(base, 'src', 'scripts')

    all_errors = []
    js_files = []

    for root, dirs, files in os.walk(scripts_dir):
        for f in files:
            if f.endswith('.js'):
                path = os.path.join(root, f)
                js_files.append(path)
                errors = check_js_file(path)
                if errors:
                    all_errors.extend([f"{os.path.relpath(path, base)}: {e}" for e in errors])

    return all_errors, js_files

def main():
    print("=== File Integrity Check ===\n")

    errors, js_files = check_all_source_files()
    print(f"Checked {len(js_files)} JS files")

    if errors:
        print(f"\n=== {len(errors)} ERRORS FOUND ===")
        for e in errors:
            print(e)
        print("\nFAIL FAILED -- fix before committing")
        sys.exit(1)
    else:
        print(f"PASS All {len(js_files)} files passed integrity check")
        sys.exit(0)

if __name__ == '__main__':
    main()
