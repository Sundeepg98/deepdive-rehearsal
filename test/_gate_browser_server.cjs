/* ===== THE SHARED BROWSER SERVER =============================================================
 *
 * One Chromium, launched once, reused by every check that can honestly share it. Prints a single
 * JSON line describing itself and then stays up until its stdin closes -- which happens when the
 * gate that spawned it exits, including when it is killed, so this cannot outlive its owner and
 * leak a browser onto the box.
 *
 * IT PUBLISHES ITS OWN LAUNCH TERMS, and that is the point rather than a convenience. A browser's
 * command-line args are PROCESS-level: --force-color-profile and --disable-lcd-text change how
 * text is rasterised for every page in the process. visual_regression launches with both, and
 * its baselines were captured under them; handing it a page from a server started without them
 * would turn 16 baselines red for a reason that has nothing to do with the app. That is not a
 * hypothetical -- the same class of mistake (the headless shell vs the full binary) already cost
 * this repo a full gate run, and the comment above visual_regression's launch says so.
 *
 * So the terms are published here and COMPARED at every intercepted launch in _gate_runtime.cjs.
 * A check whose launch options do not match this server's gets a real, cold browser. The
 * exemption list is therefore MECHANICAL -- derived from what a check actually asks for -- rather
 * than a hand-maintained list that drifts the first time someone adds a flag.
 */
'use strict';
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

(async () => {
  const opts = B.launchOpts();
  let server;
  try {
    server = await chromium.launchServer(opts);
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: String((e && e.message) || e) }) + '\n');
    process.exit(1);
  }

  process.stdout.write(JSON.stringify({
    ws: server.wsEndpoint(),
    /* The comparison keys. Stringified here, compared verbatim there, so the two can never
       disagree about what "the same launch" means. */
    args: JSON.stringify(opts.args || []),
    executablePath: opts.executablePath || '',
    pid: process.pid,
  }) + '\n');

  const bye = async () => { try { await server.close(); } catch (e) {} process.exit(0); };
  /* stdin EOF is the owner's death certificate: check_all.py holds the pipe, so this fires on a
     clean exit, a crash, and a kill alike. Signals are belt and braces. */
  process.stdin.on('end', bye);
  process.stdin.on('close', bye);
  process.on('SIGTERM', bye);
  process.on('SIGINT', bye);
  process.stdin.resume();
})();
