# CI/CD Setup Instructions

## GitHub Actions Workflow

To enable auto-build and auto-deploy to GitHub Pages, create this file in your repo:
`.github/workflows/ci.yml`

```yaml
name: CI — Build, Lint & File Integrity

on:
  push:
    branches: [ visual-enhancements, master ]
  pull_request:
    branches: [ master ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run build.py
        run: python3 build.py

      - name: Check JS syntax
        run: |
          python3 -c "
          import re
          with open('deepdive_content_pipeline_rehearsal.html') as f:
              html = f.read()
          js = re.search(r'<script>(.*?)</script>', html, re.DOTALL).group(1)
          with open('/tmp/built.js', 'w') as f:
              f.write(js)
          "
          node --check /tmp/built.js

      - name: Run file integrity check
        run: python3 test/file_integrity.py

      - name: Run lint
        run: python3 test/lint.py

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: built-html
          path: deepdive_content_pipeline_rehearsal.html

  deploy-gh-pages:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/visual-enhancements'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Build and deploy
        run: |
          python3 build.py
          mkdir -p docs
          cp deepdive_content_pipeline_rehearsal.html docs/index.html
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs/
          git commit -m "Auto-deploy: built from ${GITHUB_SHA:0:7}" || exit 0
          git push origin HEAD:gh-pages --force
```

## What This Does

1. **On every push** to `visual-enhancements` or `master`:
   - Runs `build.py` to synthesize the HTML
   - Validates JS syntax with Node.js
   - Runs file integrity check (31 JS files checked for truncation)
   - Runs full lint (build + syntax + CSS features + integrity)
   - Uploads built HTML as artifact

2. **On push to `visual-enhancements`**:
   - Auto-deploys built HTML to `gh-pages` branch
   - GitHub Pages serves from `gh-pages`

## Local Development

Before committing, always run:
```bash
python3 test/lint.py
```

This catches:
- Truncated JS files (the bug that broke everything)
- JS syntax errors
- Missing CSS features
- Build failures
