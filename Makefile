# Build the single-file deliverable from src/, and verify it.
#   make build        assemble src/ -> deepdive_content_pipeline_rehearsal.html
#   make check        dependency-free integrity check (CI-safe; no browser)
#   make test         alias for check
#   make test-render  functional browser test (needs Playwright; see test/render.cjs)
#   make clean        remove temp build artifacts

.PHONY: build check test test-render clean

build:
	python3 build.py

check:
	python3 test/build_integrity.py

test: check

test-render:
	node test/render.cjs

clean:
	rm -f /tmp/tmp*.html
