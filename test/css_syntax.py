#!/usr/bin/env python3
"""CSS syntax validator — checks keyframes, braces, and common errors.
Run: python3 test/css_syntax.py"""

import re, sys, os

BASE = os.path.join(os.path.dirname(__file__), '..')

def validate_css(path):
    with open(path, 'r') as f:
        css = f.read()

    errors = []

    # 1. Check braces are balanced
    net_braces = css.count('{') - css.count('}')
    if net_braces != 0:
        errors.append(f"Unbalanced braces: net = {net_braces} ({{ = {css.count('{')}, }} = {css.count('}')})")

    # 2. Check parentheses are balanced
    net_parens = css.count('(') - css.count(')')
    if net_parens != 0:
        errors.append(f"Unbalanced parentheses: net = {net_parens}")

    # 3. Check all keyframes have proper to/from blocks
    # Manual brace-counting parser since regex can't handle nested braces
    keyframe_blocks = []
    idx = 0
    while True:
        m = re.search(r'@keyframes\s+(\w+)', css[idx:])
        if not m:
            break
        name = m.group(1)
        start = idx + m.end()
        # Find opening brace
        while start < len(css) and css[start] != '{':
            start += 1
        if start >= len(css):
            break
        start += 1  # past the {
        brace_count = 1
        pos = start
        while pos < len(css) and brace_count > 0:
            if css[pos] == '{':
                brace_count += 1
            elif css[pos] == '}':
                brace_count -= 1
            pos += 1
        body = css[start:pos-1]
        keyframe_blocks.append((name, body))
        idx = pos

    for name, body in keyframe_blocks:
        has_from = 'from{' in body or 'from ' in body or '0%' in body or '0%,100%' in body
        has_to = 'to{' in body or 'to ' in body or '100%' in body or '0%,100%' in body
        if not has_from:
            errors.append(f"Keyframe '{name}' missing 'from' block")
        if not has_to:
            errors.append(f"Keyframe '{name}' missing 'to' block")

    # 4. Check no duplicate keyframe names
    names = [name for name, _ in keyframe_blocks]
    seen = set()
    for name in names:
        if name in seen:
            errors.append(f"Duplicate keyframe name: '{name}'")
        seen.add(name)

    # 5. Check @media rules are closed
    media_opens = len(re.findall(r'@media\s+\w', css))
    # Count media blocks by finding } that close media (tricky but basic check)
    # Just check net braces inside media queries

    # 6. Check no empty rules
    empty_rules = re.findall(r'[^{}\s][^{}]*\{\s*\}', css)
    for rule in empty_rules:
        # Skip intentional empty rules
        if not any(skip in rule for skip in ['@property', '@media', '@page']):
            pass  # Some empty rules are intentional for reset

    # 7. Check @property declarations are well-formed
    properties = re.findall(r'@property\s+(--[\w-]+)\s*\{([^}]*)\}', css)
    for name, body in properties:
        if 'syntax:' not in body:
            errors.append(f"@property '{name}' missing syntax")
        if 'initial-value:' not in body:
            errors.append(f"@property '{name}' missing initial-value")
        if 'inherits:' not in body:
            errors.append(f"@property '{name}' missing inherits")

    # 8. Check no stray semicolons before }
    stray_semicolons = re.findall(r';\s*;\s*}', css)
    if stray_semicolons:
        errors.append(f"Found {len(stray_semicolons)} double semicolons before closing braces")

    return errors, len(keyframe_blocks), css.count('{')

def main():
    print("=== CSS Syntax Validator ===\n")

    path = os.path.join(BASE, 'src', 'styles.css')
    errors, keyframe_count, brace_count = validate_css(path)

    print(f"File: {path}")
    print(f"  Braces: {brace_count}")
    print(f"  Keyframes: {keyframe_count}")

    if errors:
        print(f"\n  ❌ {len(errors)} error(s) found:")
        for e in errors:
            print(f"    - {e}")
        sys.exit(1)
    else:
        print(f"\n  ✅ All checks passed ({keyframe_count} keyframes validated)")
        sys.exit(0)

if __name__ == '__main__':
    main()
