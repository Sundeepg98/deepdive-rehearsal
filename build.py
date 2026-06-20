#!/usr/bin/env python3
"""
Tiny inline build for the deep-rehearsal single-file deliverable.

Assembles  src/index.html  +  its included partials  into ONE standalone HTML file
(the shippable deliverable). It resolves markers of the form:

    <!--@build:include RELPATH-->

where RELPATH is relative to src/. Includes are resolved recursively, so a partial
may itself include further partials. The output is a byte-for-byte concatenation of
the sources -- no minification, no transformation -- so a freshly built file is
identical to the hand-authored monolith. That property is what lets us refactor the
source for easy editing while the shipped artifact never changes a byte.

Usage:
    python3 build.py                 # writes ./deepdive_content_pipeline_rehearsal.html
    python3 build.py path/out.html   # writes to a chosen path (used by the verify step)

Zero dependencies (stdlib only). Portable to Node later if desired.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DEFAULT_OUT = os.path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')
INCLUDE = re.compile(rb'<!--@build:include\s+(.+?)\s*-->')


def resolve(buf, stack=()):
    """Recursively replace include markers in `buf` (bytes) with partial contents."""
    if len(stack) > 20:
        raise RuntimeError('include depth exceeded (cycle?): ' + ' -> '.join(stack))

    def repl(m):
        rel = m.group(1).decode().strip()
        path = os.path.normpath(os.path.join(SRC, rel))
        if not (path == SRC or path.startswith(SRC + os.sep)):
            raise RuntimeError('include escapes src/: ' + rel)
        if rel in stack:
            raise RuntimeError('include cycle: ' + ' -> '.join(stack + (rel,)))
        with open(path, 'rb') as fh:
            part = fh.read()
        return resolve(part, stack + (rel,))

    return INCLUDE.sub(repl, buf)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    with open(os.path.join(SRC, 'index.html'), 'rb') as fh:
        index = fh.read()
    result = resolve(index)
    with open(out, 'wb') as fh:
        fh.write(result)
    top = len(INCLUDE.findall(index))
    left = len(INCLUDE.findall(result))
    print('built %s  (%d bytes; %d top-level include(s) resolved; %d unresolved)'
          % (out, len(result), top, left))


if __name__ == '__main__':
    main()
