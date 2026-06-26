#!/usr/bin/env python3
"""Quick lint — checks JS syntax, CSS completeness, and build output.
Run: python3 test/lint.py"""

import re, sys, os, subprocess

def main():
    print("=== Quick Lint ===\n")
    errors = []
    base = os.path.join(os.path.dirname(__file__), '..')

    # 1. Check build works
    print("1. Running build.py...")
    result = subprocess.run([sys.executable, 'build.py'], cwd=base, capture_output=True, text=True)
    if result.returncode != 0:
        errors.append("build.py failed")
        print(f"   ❌ Build failed: {result.stderr}")
    else:
        print("   ✅ Build succeeded")

    # 2. Check JS syntax in built HTML
    print("\n2. Checking JS syntax...")
    html_path = os.path.join(base, 'deepdive_content_pipeline_rehearsal.html')
    if os.path.exists(html_path):
        with open(html_path, 'r') as f:
            html = f.read()
        js_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
        if js_match:
            js = js_match.group(1)
            with open('/tmp/_lint.js', 'w') as f:
                f.write(js)
            result = subprocess.run(['node', '--check', '/tmp/_lint.js'], capture_output=True, text=True)
            if result.returncode != 0:
                errors.append("JS syntax error in built HTML")
                print(f"   ❌ JS syntax error: {result.stderr[:200]}")
            else:
                print("   ✅ JS syntax valid")
        else:
            errors.append("No <script> tag in built HTML")
            print("   ❌ No script tag found")
    else:
        errors.append("Built HTML not found")
        print("   ❌ Built HTML missing")

    # 3. Check CSS features
    print("\n3. Checking CSS features...")
    css_part = html[:html.find('<script>')]
    css_checks = {
        'companion styles': '.cmp-inner' in css_part,
        'overlay scroll': 'overflow-y:auto' in css_part,
    }
    for name, present in css_checks.items():
        if not present:
            errors.append(f"Missing CSS: {name}")
            print(f"   ❌ Missing: {name}")
        else:
            print(f"   ✅ {name}")

    # 4. Run file integrity
    print("\n4. Running file integrity check...")
    result = subprocess.run([sys.executable, 'test/file_integrity.py'], cwd=base)
    if result.returncode != 0:
        errors.append("File integrity check failed")

    # Summary
    print(f"\n{'='*40}")
    if errors:
        print(f"❌ {len(errors)} error(s) found")
        sys.exit(1)
    else:
        print("✅ All checks passed")
        sys.exit(0)

if __name__ == '__main__':
    main()
