# Build the single-file deliverable from src/, and enforce the standard.
#   make build   npm build (tokens+visual-kit+vite) -> copy dist/index.html to deliverable
#   make check   THE GATE: ascii_guard + syntax_check + build_integrity
#                + render + entity_leak (browser checks auto-skip in CI)
#   make test    alias for check
#   make clean   remove temp build artifacts

.PHONY: build check test clean

build:
	npm run build
	cp dist/index.html deepdive_content_pipeline_rehearsal.html

check:
	python3 test/check_all.py

test: check

clean:
	rm -f /tmp/tmp*.html
