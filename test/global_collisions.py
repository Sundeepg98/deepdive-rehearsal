#!/usr/bin/env python3
"""Global-collision guard.

The build concatenates every @build:include'd module into a single <script>, so a
top-level declaration in one module shares one global scope with every other. Two
modules declaring the same top-level name is a latent bug: for const/let/class the
second is a SyntaxError that breaks the page; for var/function it silently overrides,
so the wrong definition can win with no error at all.

Today the codebase avoids this only by disciplined unique prefixing. This check makes
that discipline enforceable: it walks the transitive include set from src/index.html,
collects each module's leaked top-level globals, and fails if any name is declared in
more than one module -- so a newly added, generically-named module that clashes is
caught at build time instead of shipping a silent override.

A module leaks nothing if its whole body is an IIFE ( (function(){...})() ); a
`var X = (function(){...})()` module leaks only X; a bare module leaks every
column-0 declaration. (This mirrors the E1a encapsulation: IIFE-scoped modules are
correctly seen as leaking nothing.)
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
INCLUDE = re.compile(r'<!--@build:include\s+(.+?)\s*-->')


def included_js_files():
    """Transitive closure of @build:include starting at index.html; .js files only."""
    files, seen = [], set()

    def walk(rel):
        path = os.path.normpath(os.path.join(SRC, rel))
        if path in seen:
            return
        seen.add(path)
        try:
            content = open(path, encoding='utf-8').read()
        except (OSError, UnicodeDecodeError):
            return
        if path.endswith('.js'):
            # scripts/visuals/ is the GENERATED VisualKit vendor IIFE (three.js
            # inside, single window global, own verify harness). Its minified
            # internals false-positive this regex scan (TSL exports float/vec4/
            # mat3 read as module globals). Same exemption class as IIFE-scoped
            # modules per the E1a note above.
            if 'scripts/visuals/' not in path.replace(os.sep, '/'):
                files.append(path)
        for m in INCLUDE.finditer(content):
            walk(m.group(1))

    index = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    for m in INCLUDE.finditer(index):
        walk(m.group(1))
    return files


def first_code(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    for line in text.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('//'):
            continue
        return stripped
    return ''


def leaked_globals(path):
    text = open(path, encoding='utf-8').read()
    fc = first_code(text)
    # whole body wrapped in an IIFE -> leaks nothing
    if re.match(r'^[!;+(]*\(\s*(?:async\s+)?function', fc):
        return []
    # `var X = (function(){...})()` -> only X escapes
    m = re.match(r'^(?:var|let|const)\s+(\w+)\s*=\s*[!(]*\(?\s*(?:async\s+)?function', fc)
    if m:
        return [m.group(1)]
    # bare module -> every column-0 declaration is a global
    return re.findall(r'(?m)^(?:const|let|var|function|class|async function)\s+(\w+)', text)


def main():
    owners = {}
    for path in included_js_files():
        for name in leaked_globals(path):
            owners.setdefault(name, []).append(os.path.relpath(path, SRC))
    collisions = {n: ps for n, ps in owners.items() if len(ps) > 1}
    if collisions:
        print('GLOBAL COLLISIONS: FAIL')
        for name, paths in sorted(collisions.items()):
            print('  "%s" declared top-level in %d modules: %s'
                  % (name, len(paths), ', '.join(paths)))
        print('  Fix: rename one, or IIFE-scope the module. All modules concatenate into')
        print('  one <script>; top-level const/let/class collisions throw SyntaxError,')
        print('  var/function collisions silently override.')
        return 1
    print('GLOBAL COLLISIONS: PASS  (%d top-level globals, each declared in exactly one module)'
          % len(owners))
    return 0


if __name__ == '__main__':
    sys.exit(main())
