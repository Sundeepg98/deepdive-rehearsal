/* ===== GATE RUNTIME SHIM: browser-lifecycle TRACING and BROWSER SHARING ======================
 *
 * Loaded into every check process via NODE_OPTIONS=--require. Two independent features, each off
 * unless its env var is set, and NEITHER may change what a check asserts.
 *
 *   GATE_TRACE_DIR   -- record the browser lifecycle (Phase 1, the profile).
 *   GATE_BROWSER_CDP -- redirect chromium.launch() to a shared browser (Phase 2).
 *
 * WHY A PRELOAD AND NOT 41 EDITS. Every browser check in the gate has exactly one launch site and
 * spells it the same way: `chromium.launch(B.launchOpts())`. Editing all of them would put a
 * large diff through the exact files whose assertions must not move -- this wave's first hard
 * rule -- and would leave 41 copies of a policy to drift out of step. One interception point
 * cannot drift, and it is removed from the run by unsetting one variable.
 *
 * ===== THE SAFETY PROPERTY: SHARING IS OPT-OUT BY MEASUREMENT, NOT BY LIST =====
 * A browser's command-line args are PROCESS-level. visual_regression launches with
 * --force-color-profile=srgb and --disable-lcd-text because subpixel rasterisation is the largest
 * source of pixel jitter, and its baselines were captured under those flags. Serving it a page
 * from a server that lacks them would turn its baselines red for a reason with nothing to do with
 * the app -- the same shape of mistake (headless shell vs full binary) that already cost this repo
 * a full gate run.
 *
 * So this does NOT carry a hand-written exemption list. It compares what the check ASKED FOR
 * against what the server WAS STARTED WITH, and shares only on an exact match. Anything else --
 * different args, a different executable, any launch option the shared path does not model --
 * gets a real cold browser, silently and correctly. A future check that adds a flag is exempted
 * the moment it is written, by nobody.
 *
 * ===== AND THE SERVER MUST SURVIVE ITS CLIENTS, WITHOUT HANGING THEM =====
 * Every check calls browser.close(). Over chromium.connect() that would tear down the shared
 * browser for every check queued behind -- so the first version overrode close() to drop only the
 * check's own contexts. That override left the WebSocket open, an open socket keeps Node's event
 * loop alive, and any check that exits NATURALLY (rather than through B.finish()'s process.exit())
 * then hung forever. Measured: room_browser finished its work and was killed at 100s (exit 124),
 * while seg_state, which force-exits, was fine. Three gate checks exit naturally.
 * connectOverCDP removes the dilemma: Playwright does not own a browser it reached over CDP, so
 * close() terminates the connection and leaves the browser up. No override, no hang.
 */
'use strict';

const TRACE_DIR = process.env.GATE_TRACE_DIR;
const SHARE_CDP = process.env.GATE_BROWSER_CDP;

if (TRACE_DIR || SHARE_CDP) {
  const Module = require('module');

  /* ---- tracing ---------------------------------------------------------------------------- */
  let emit = () => {};
  if (TRACE_DIR) {
    const fs = require('fs');
    const path = require('path');
    const CHECK = process.env.GATE_CHECK || 'unknown';
    const FILE = path.join(TRACE_DIR, CHECK + '.jsonl');
    /* Node's own start, not this file's load: the interpreter boot and the require() of playwright
       are part of the cost, and a shared browser does NOT remove them -- every check is still its
       own process. A profile that hid them would overstate what Phase 2 can win. */
    const T0 = Date.now() - Math.round(process.uptime() * 1000);
    emit = (ev) => {
      try {
        ev.check = CHECK;
        ev.pid = process.pid;
        ev.t_ms = Date.now() - T0;
        fs.appendFileSync(FILE, JSON.stringify(ev) + '\n');
      } catch (e) { /* an instrument may never break a check */ }
    };
  }

  /* Wrap one async factory, recording how long it blocked. */
  const time = (obj, method, kind) => {
    if (!obj || typeof obj[method] !== 'function' || obj[method].__gateWrapped) return;
    const orig = obj[method];
    const wrapped = async function (...args) {
      const t = Date.now();
      try {
        const out = await orig.apply(this, args);
        emit({ ev: kind, ms: Date.now() - t });
        /* A Browser hands out contexts and a context hands out pages; hook each as it appears, so
           the census counts what was really created rather than what the source looked like.
           browser.newPage() is deliberately NOT hooked: Playwright implements it as newContext()
           then context.newPage(), both of which these hooks already see, so wrapping it too would
           book one page as two and inflate the census this exists to settle. */
        if (kind === 'launch' || kind === 'connect' || kind === 'connectOverCDP' ||
            kind === 'launchPersistentContext') time(out, 'newContext', 'newContext');
        if (kind === 'newContext') time(out, 'newPage', 'newPage');
        return out;
      } catch (e) {
        emit({ ev: kind, ms: Date.now() - t, error: String(e && e.message).slice(0, 200) });
        throw e;
      }
    };
    wrapped.__gateWrapped = true;
    try { obj[method] = wrapped; } catch (e) { /* frozen export: skip, never throw */ }
  };

  /* ---- sharing ---------------------------------------------------------------------------- */
  /* The check asked for these launch options. May it have the shared browser?
     Conservative by construction: the shared path models exactly the two options _boot.cjs's
     launchOpts() produces. ANY other key means the check wants something this server was not
     started with, and the honest answer to "can I model that?" is no. */
  const SHARE_ARGS = process.env.GATE_BROWSER_ARGS || '';
  const SHARE_EXE = process.env.GATE_BROWSER_EXE || '';
  const MODELLED = ['args', 'executablePath'];
  const shareable = (opts) => {
    const o = opts || {};
    for (const k of Object.keys(o)) if (!MODELLED.includes(k)) return 'opt:' + k;
    if (JSON.stringify(o.args || []) !== SHARE_ARGS) return 'args';
    if ((o.executablePath || '') !== SHARE_EXE) return 'executablePath';
    return null;
  };

  const shareLaunch = (chromium) => {
    if (chromium.launch.__gateShared) return;
    const coldLaunch = chromium.launch.bind(chromium);
    const shared = async function (opts) {
      const why = shareable(opts);
      if (why) {                       /* not compatible -- give it the browser it asked for */
        const t = Date.now();
        const b = await coldLaunch(opts);
        emit({ ev: 'launch', ms: Date.now() - t, path: 'cold', reason: why });
        time(b, 'newContext', 'newContext');
        return b;
      }
      /* connectOverCDP, NOT connect(), and close() is deliberately left ALONE.
         Playwright does not own a browser it reached over CDP, so a check's browser.close()
         terminates the connection and leaves the shared browser running -- which is exactly the
         semantics needed, with no override.
         The first version used connect() and DID override close() (it had to: over connect(),
         close() would tear down the browser for every check queued behind). That left the socket
         open, an open socket keeps Node's event loop alive, and any check that exits naturally
         instead of through B.finish()'s process.exit() HUNG FOREVER. Measured: room_browser
         finished its work and was killed at 100s; seg_state, which force-exits, was fine. Three
         gate checks exit naturally, so the shared browser would have hung the gate. */
      const t = Date.now();
      const b = await chromium.connectOverCDP(SHARE_CDP);
      emit({ ev: 'connect', ms: Date.now() - t, path: 'shared' });
      time(b, 'newContext', 'newContext');
      return b;
    };
    shared.__gateShared = true;
    try { chromium.launch = shared; } catch (e) { /* frozen: fall back to cold, never throw */ }
  };

  /* ---- install ---------------------------------------------------------------------------- */
  const hook = (pw) => {
    try {
      if (SHARE_CDP && pw && pw.chromium) {
        shareLaunch(pw.chromium);
      } else if (pw) {
        for (const engine of ['chromium', 'firefox', 'webkit']) {
          const bt = pw[engine];
          if (!bt) continue;
          time(bt, 'launch', 'launch');
          time(bt, 'connect', 'connect');
          time(bt, 'connectOverCDP', 'connectOverCDP');
          time(bt, 'launchPersistentContext', 'launchPersistentContext');
        }
      }
    } catch (e) { /* ditto */ }
    return pw;
  };

  /* `import { chromium } from 'playwright'` in the two .mjs checks still resolves through the CJS
     loader (playwright is a CommonJS package), so one hook covers both module systems. */
  const origLoad = Module._load;
  Module._load = function (request) {
    const m = origLoad.apply(this, arguments);
    if (request === 'playwright' || request === 'playwright-core') hook(m);
    return m;
  };

  /* AN ESM ENTRY POINT CANNOT BE HOOKED LAZILY, and finding that out late would have been
     expensive. `import { chromium } from 'playwright'` does NOT route through Module._load, so
     the gate's two .mjs checks (visual_pane_smoke, shadow_css_guard) sailed past the hook above:
     measured, their first profile run recorded a node_start and an exit and nothing in between,
     while both demonstrably drive a browser. Unmeasured is the mild half. The sharp half is that
     a shim which silently fails to hook is a shim that reports "shared" for a check still paying
     full price -- or, worse in the other direction, would look identical to one that shared when
     it must not. Node resolves a CJS dependency of an ESM module through the CJS loader and
     caches it, so requiring playwright HERE and patching the cached exports reaches the same
     object the import will be handed. Only .mjs entries pay the eager require. */
  if (/\.mjs$/i.test(process.argv[1] || '')) {
    try { hook(require('playwright')); } catch (e) { /* no playwright in this process: fine */ }
  }

  emit({ ev: 'node_start', argv: process.argv.slice(1, 3) });
  process.on('exit', (code) => emit({ ev: 'exit', code, uptime_ms: Math.round(process.uptime() * 1000) }));
}
