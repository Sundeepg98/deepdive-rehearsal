# Build the single-file deliverable from src/, and enforce the standard.
#   make build   assemble src/ -> deepdive_content_pipeline_rehearsal.html
#   make check   THE GATE: ascii_guard + syntax_check + build_integrity
#                + render + entity_leak (browser checks auto-skip in CI)
#   make test    alias for check
#   make clean   remove temp build artifacts

.PHONY: build check test clean

build:
	python3 build.py

check:
	python3 test/check_all.py

test: check

clean:
	rm -f /tmp/tmp*.html
