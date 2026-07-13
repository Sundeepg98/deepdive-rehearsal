# Thin aliases. NPM IS THE BUILD -- these targets duplicate no logic and cannot drift from it.
#
# They used to. `make build` was the ONLY thing that refreshed the shipped deliverable:
#
#     build:
#         npm run build
#         cp dist/index.html deepdive_content_pipeline_rehearsal.html   <-- lived ONLY here
#
# and `make` is not installed on the Windows box this repo is developed on. So the command
# everybody actually ran, `npm run build`, refreshed dist/index.html and left the deliverable
# STALE -- and the deliverable is what ships, what CI deploys, and what every browser check in
# THE GATE loads. Agents measured yesterday's bytes and blamed their own fixes.
#
# The copy now lives in `npm run build` itself (tools/sync-deliverable.mjs), where it runs no
# matter which entry point you use, and test/build_integrity.py asserts it ran. This file is a
# convenience for anyone who has make; it is not a second way to build, and it never will be
# again.
#
#   npm run build   tokens + visual kit + vite -> dist/index.html AND the deliverable
#   npm run gate    THE GATE: every check (browser checks skip if Playwright is absent)

.PHONY: build check test clean

build:
	npm run build

check:
	npm run gate

test: check

clean:
	rm -rf dist
