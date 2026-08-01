/* ===== THE SHARED BROWSER SERVER =============================================================
 *
 * One Chromium, launched once, reused by every check that can honestly share it. Prints a single
 * JSON line describing itself and then stays up until its stdin closes -- which happens when the
 * gate that spawned it exits, so it cannot outlive its owner and leak a browser onto the box.
 *
 * ===== WHY CDP AND NOT launchServer/connect =====
 * The first version used chromium.launchServer() + chromium.connect(). It worked for a single
 * check and HUNG THE GATE, and the mechanism is worth writing down because it is not obvious.
 *
 * A connected Playwright client keeps an open WebSocket, and an open socket keeps Node's event
 * loop alive. The shim could not let a check's browser.close() through, because over connect()
 * that closes the browser ON THE SERVER -- for every check queued behind it. So close() was
 * overridden to drop only the check's own contexts... which left the connection open, and the
 * check's process never exited. MEASURED: `room_browser` completed all of its work and then hung
 * until killed at 100s (exit 124), while `seg_state` exited cleanly at 0. The difference is that
 * seg_state routes its exit through B.finish(), which calls process.exit() and force-exits past
 * the live handle. Three gate checks -- room_browser, topic_contract, cold_open -- rely on
 * natural exit, so the shared browser would have hung the gate on the first one it reached.
 *
 * connectOverCDP does not have the problem, because Playwright does not OWN a browser it reached
 * over CDP: browser.close() terminates the connection and leaves the browser running. The checks
 * keep their unmodified close() semantics, their processes exit naturally, and the server
 * survives -- no override, no hang, and nothing depending on Playwright internals.
 *
 * ===== IT PUBLISHES ITS OWN LAUNCH TERMS =====
 * A browser's command-line args are PROCESS-level: --force-color-profile and --disable-lcd-text
 * change how text is rasterised for every page in the process. visual_regression launches with
 * both, and its baselines were captured under them; handing it a page from a server started
 * without them would turn 16 baselines red for a reason that has nothing to do with the app.
 * That is not hypothetical -- the same class of mistake (the headless shell vs the full binary)
 * already cost this repo a full gate run.
 *
 * So the terms are published here and COMPARED at every intercepted launch in _gate_runtime.cjs,
 * and sharing is refused wherever it would be a lie. The exemption list is MECHANICAL rather than
 * hand-maintained: a check that adds a flag is exempted the day it is written, by nobody.
 */
'use strict';
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

/* The transport flag is deliberately NOT part of the published terms, and the distinction is the
   point: it changes how the browser is REACHED, not how it renders. Every arg that can affect a
   pixel lives in B.LAUNCH_ARGS and is published verbatim. */
const PORT = Number(process.env.GATE_BROWSER_PORT || 9411);

(async () => {
  const opts = B.launchOpts();
  let browser;
  try {
    browser = await chromium.launch(Object.assign({}, opts, {
      args: (opts.args || []).concat(['--remote-debugging-port=' + PORT]),
    }));
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: String((e && e.message) || e) }) + '\n');
    process.exit(1);
  }

  process.stdout.write(JSON.stringify({
    cdp: 'http://127.0.0.1:' + PORT,
    /* The comparison keys. Stringified here, compared verbatim there, so the two can never
       disagree about what "the same launch" means. */
    args: JSON.stringify(opts.args || []),
    executablePath: opts.executablePath || '',
    pid: process.pid,
  }) + '\n');

  let closing = false;
  const bye = async () => {
    if (closing) return;
    closing = true;
    try { await browser.close(); } catch (e) { /* already gone */ }
    process.exit(0);
  };
  /* stdin EOF is the owner's death certificate: check_all.py holds the pipe, so this fires on a
     clean exit, a crash, and a kill alike. Signals are belt and braces. The PID watchdog is a
     third layer, and it is not paranoia -- MEASURED: when this environment killed the gate
     process outright, neither EOF nor a signal arrived, and the server plus five Chromium
     processes were still running on the box afterwards. A leaked browser poisons the next run's
     measurements and sits in the operator's process list. */
  process.stdin.on('end', bye);
  process.stdin.on('close', bye);
  process.on('SIGTERM', bye);
  process.on('SIGINT', bye);
  process.stdin.resume();

  const parent = Number(process.env.GATE_OWNER_PID || 0);
  if (parent) {
    setInterval(() => {
      try { process.kill(parent, 0); } catch (e) { bye(); }
    }, 5000).unref();
  }
})();
