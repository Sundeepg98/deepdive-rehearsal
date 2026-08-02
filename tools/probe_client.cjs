/* ===== THE PROBE CLIENT -- a require()-able shim and a CLI ======================================
 *
 * Talks to tools/probe_server.cjs, which holds ONE warm Chromium so a probe costs a localhost round
 * trip instead of a browser launch plus an 11.7 MiB parse. Zero dependencies: node's own http.
 *
 * ===== THE CONTAMINATION DISCIPLINE (the same rule the server enforces) ==========================
 *
 * A warm browser is a SHARED MUTABLE WORLD -- that is both the speedup and the hazard. A probe that
 * runs against a page some earlier probe touched is measuring the earlier probe, and it is wrong at
 * speed, which is worse than being slow.
 *
 *   ASSERTIVE measurements -- geometry, contrast, fold membership, anything a verdict rests on --
 *   MUST run behind a reload, in a world nothing has touched. That is what withFreshPage() is for,
 *   and it is the default entry point.
 *
 *   EVAL-AGAINST-HELD-STATE is for EXPLORATION ONLY and is OPT-IN: probe(expr, {mode:'explore'}).
 *   Use it while you are still working out WHAT to measure. Once you know, measure it fresh.
 *
 * The server does not take your word for any of this. probe() defaults to mode "assert", which the
 * server REFUSES (throwing ProbeError with status 409) against a world that is no longer pristine --
 * including a world dirtied by an earlier probe of your own that mutated the DOM while believing it
 * was reading. Every response carries {world_id, since_reload_ms, probes_since_reload, pristine,
 * mutations} so a verifier can audit, afterwards, exactly what each measurement trusted.
 *
 * ===== MIGRATING AN EXISTING PROBE SCRIPT (this is the one line) =================================
 *
 *   BEFORE
 *     const browser = await chromium.launch(B.launchOpts());
 *     const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
 *     await B.gotoApp(page, HTML);
 *     const v = await page.evaluate(() => document.querySelector('#homerail').getBoundingClientRect().width);
 *     await browser.close();
 *
 *   AFTER
 *     const v = await withFreshPage((p) => p.eval('document.querySelector("#homerail").getBoundingClientRect().width'));
 *
 * The expression is a STRING here rather than a closure, because it crosses a wire. Everything else
 * -- the launch flags, the readiness predicate, the at-rest settle -- is identical to what the gate
 * does, because the server requires those primitives from test/_boot.cjs rather than copying them.
 *
 * ADOPTION IS OPT-IN. Nothing in test/ calls this. See tools/PROBE_SERVER.md.
 *
 * ===== CLI ======================================================================================
 *   node tools/probe_client.cjs --status
 *   node tools/probe_client.cjs --eval 'document.title'
 *   node tools/probe_client.cjs --eval 'x' --explore          # opt in to the held world
 *   node tools/probe_client.cjs --reload --viewport 390x844
 *   node tools/probe_client.cjs --goto '#walk'
 *   node tools/probe_client.cjs --screenshot out.png --viewport 1280x800
 *   node tools/probe_client.cjs --shutdown
 * stdout is the VALUE (JSON); the audit stamp goes to stderr, so a pipe stays clean and the
 * provenance is still on the record. --raw puts the whole envelope on stdout instead.
 */
'use strict';

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const cfg = {
  host: '127.0.0.1',
  port: Number(process.env.PROBE_PORT || 9377),
  timeout_ms: Number(process.env.PROBE_TIMEOUT_MS || 180000),
};

function configure(o) { Object.assign(cfg, o || {}); return Object.assign({}, cfg); }

/* A typed error, so a caller can tell "your expression threw" from "you asked to measure a dirty
   world" from "the server is not running" WITHOUT string-matching a message. */
class ProbeError extends Error {
  constructor(msg, status, payload) {
    super(msg);
    this.name = 'ProbeError';
    this.status = status || 0;
    this.payload = payload || null;
    this.contaminated = !!(payload && payload.error === 'CONTAMINATED_WORLD');
  }
}

function request(route, body, method) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body || {}), 'utf8');
    const req = http.request({
      host: cfg.host, port: cfg.port, path: route, method: method || 'POST',
      headers: { 'content-type': 'application/json', 'content-length': data.length },
      timeout: cfg.timeout_ms,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const s = Buffer.concat(chunks).toString('utf8');
        let j = null;
        try { j = JSON.parse(s); } catch (e) {
          return reject(new ProbeError('probe server returned non-JSON (' + res.statusCode + '): ' + s.slice(0, 200), res.statusCode, null));
        }
        if (res.statusCode >= 400 || j.ok === false) {
          return reject(new ProbeError(j.error || ('HTTP ' + res.statusCode), res.statusCode, j));
        }
        resolve(j);
      });
    });
    req.on('timeout', () => { req.destroy(new Error('timed out after ' + cfg.timeout_ms + 'ms')); });
    req.on('error', (e) => {
      if (e && (e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET')) {
        return reject(new ProbeError(
          'no probe server on ' + cfg.host + ':' + cfg.port + '. Start one:\n'
          + '  node tools/probe_server.cjs --port ' + cfg.port + '\n'
          + '(or call ensureUp() to autostart one that exits when idle)', 0, null));
      }
      reject(new ProbeError(String(e && e.message || e), 0, null));
    });
    req.end(data);
  });
}

/* ---------- the API --------------------------------------------------------------------------- */

/* THE DEFAULT IS THE STRICT ONE. mode:'assert' means "I am about to believe this number", and the
   server will refuse it unless the world is pristine. Pass {mode:'explore'} to measure a held
   world -- which is fast, sometimes exactly what you want, and always on the record. */
async function probe(expr, opts) {
  const o = opts || {};
  const r = await request('/eval', { expr: expr, mode: o.mode || 'assert', arg: o.arg });
  return o.raw ? r : r.value;
}

/* Statements rather than an expression -- for a probe that needs locals, a loop, or an await. */
async function probeBody(src, opts) {
  const o = opts || {};
  const r = await request('/eval', { body: src, mode: o.mode || 'assert', arg: o.arg });
  return o.raw ? r : r.value;
}

/* A GENUINELY FRESH WORLD: new browser context (so localStorage, sessionStorage and cookies all
   reset -- this app persists theme, stars and notes), fresh navigation, app ready, then AT REST.
   Pass {viewport:'390x844'} to have the app BOOT at that size rather than be resized into it. */
async function reload(opts) {
  const o = opts || {};
  return request('/reload', {
    viewport: o.viewport, url: o.url, keep_context: o.keep_context, settle_scope: o.settle_scope,
  });
}

async function goto(p, opts) {
  const o = opts || {};
  return request('/goto', { path: p, viewport: o.viewport, settle_scope: o.settle_scope });
}

/* THE ONE-LINE MIGRATION and the recommended default. Reloads, then hands `fn` a handle whose
   .eval() runs in assert mode against the world that reload just made. Everything a verdict rests
   on should go through here. */
async function withFreshPage(fn, opts) {
  const world = await reload(opts);
  const handle = {
    world: world,
    eval: (expr, o) => probe(expr, o),
    body: (src, o) => probeBody(src, o),
    screenshot: (p, o) => screenshot(p, o),
    /* Re-freshen mid-sequence, e.g. between two measurements that must not see each other. */
    reload: (o) => reload(o),
  };
  return fn(handle);
}

/* A screenshot at a DIFFERENT viewport reloads into it first (server-side), because a screenshot
   after a resize is a picture of a world that booted somewhere else. */
async function screenshot(p, opts) {
  const o = opts || {};
  return request('/screenshot', {
    path: path.resolve(p), viewport: o.viewport, selector: o.selector, full_page: !!o.full_page,
  });
}

/* Resize WITHOUT reloading. Deliberately dirties the world server-side, so the next assert-mode
   probe is refused. Use reload({viewport}) for anything you intend to believe. */
async function viewport(w, h) { return request('/viewport', { w: w, h: h }); }

async function status() { return request('/status', {}, 'GET'); }
async function shutdown() { return request('/shutdown', {}); }

async function isUp() {
  try { await status(); return true; } catch (e) { return false; }
}

/* OPT-IN AUTOSTART. Spawns a detached server and waits for it to answer.
   The idle timeout is NOT optional here: a server nobody remembers starting is a server nobody
   remembers stopping, and an orphaned Chromium poisons the next run's measurements and sits in the
   operator's process list. An autostarted one dies by itself -- the server's idle TTL is ON BY
   DEFAULT (20 minutes), so nothing has to be passed for that to hold; {idle_ttl_min} or
   {idle_exit_ms} override it, and 0 disables it.

   NOTE, and it is the reason to think before calling this: ensureUp ADOPTS a server that is already
   answering on this port. Two agents on the default port share one browser and one world -- see the
   world-token note in tools/PROBE_SERVER_COLDVERIFY.md. Give each agent its own port. */
async function ensureUp(opts) {
  const o = opts || {};
  if (await isUp()) return { started: false, port: cfg.port };
  const args = [path.resolve(__dirname, 'probe_server.cjs'), '--port', String(cfg.port), '--quiet'];
  if (o.idle_exit_ms !== undefined) args.push('--idle-exit-ms', String(o.idle_exit_ms));
  else if (o.idle_ttl_min !== undefined) args.push('--idle-ttl', String(o.idle_ttl_min));
  if (o.html) args.push('--html', o.html);
  if (o.url) args.push('--url', o.url);
  if (o.viewport) args.push('--viewport', o.viewport);
  const child = spawn(process.execPath, args, { detached: true, stdio: 'ignore' });
  child.unref();
  const deadline = Date.now() + (o.wait_ms || 120000);
  for (;;) {
    if (await isUp()) return { started: true, port: cfg.port, pid: child.pid };
    if (Date.now() > deadline) throw new ProbeError('autostarted probe server never answered on port ' + cfg.port, 0, null);
    await new Promise((r) => setTimeout(r, 250));
  }
}

module.exports = {
  probe, probeBody, reload, goto, withFreshPage, screenshot, viewport,
  status, shutdown, isUp, ensureUp, configure, ProbeError,
};

/* ---------- CLI ------------------------------------------------------------------------------- */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    let k, v;
    if (eq > 0) { k = a.slice(2, eq); v = a.slice(eq + 1); }
    else {
      k = a.slice(2);
      const nxt = argv[i + 1];
      if (nxt !== undefined && !nxt.startsWith('--')) { v = nxt; i++; } else { v = true; }
    }
    out[k.replace(/-/g, '_')] = v;
  }
  return out;
}

const CLI_HELP = [
  'tools/probe_client.cjs -- probe the warm browser held by tools/probe_server.cjs',
  '',
  '  --status                 server state (url, uptime, probes_served, pristine)',
  '  --eval EXPR              evaluate an expression (assert mode: needs a pristine world)',
  '  --body SRC               evaluate statements (use `return`)',
  '  --explore                opt in to measuring the HELD world (exploration only)',
  '  --fresh                  reload first, then eval -- the assertive path',
  '  --reload                 new context, load, wait for the app, wait for rest',
  '  --goto PATH              navigate (a path, a url, or #hash)',
  '  --viewport WxH           with --reload/--screenshot: BOOT at this size',
  '  --screenshot PATH        write a PNG (add --full-page, --selector SEL)',
  '  --shutdown               stop the server and its browser',
  '  --ensure-up              autostart a server if none is listening (exits when idle)',
  '  --port N                 default 9377 (or $PROBE_PORT)',
  '  --raw                    print the whole envelope, not just the value',
  '',
  'stdout = value, stderr = audit stamp. Discipline: tools/PROBE_SERVER.md',
  '',
].join('\n');

async function cli() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help || a.h || Object.keys(a).length === 1) { process.stdout.write(CLI_HELP); return 0; }
  if (a.port) cfg.port = Number(a.port);
  const mode = a.explore ? 'explore' : 'assert';
  let out;

  if (a.ensure_up) out = await ensureUp({ html: typeof a.html === 'string' ? a.html : undefined });
  else if (a.shutdown) out = await shutdown();
  else if (a.status) out = await status();
  else if (a.screenshot) out = await screenshot(String(a.screenshot), { viewport: a.viewport, selector: a.selector, full_page: !!a.full_page });
  else if (a.goto) out = await goto(String(a.goto), { viewport: a.viewport });
  else if (a.eval || a.body) {
    if (a.fresh) await reload({ viewport: a.viewport });
    const src = String(a.eval || a.body);
    out = a.body ? await probeBody(src, { mode: mode, raw: true }) : await probe(src, { mode: mode, raw: true });
  } else if (a.reload) out = await reload({ viewport: a.viewport });
  else { process.stdout.write(CLI_HELP); return 0; }

  if (a.raw || !('value' in out)) {
    process.stdout.write(JSON.stringify(out, null, 1) + '\n');
  } else {
    process.stdout.write(JSON.stringify(out.value, null, 1) + '\n');
    /* PROVENANCE ON STDERR: a piped probe stays clean, and the reader still learns whether the
       number came from a fresh world or from one that had already served 40 probes. */
    process.stderr.write('[probe] world=' + out.world_id + ' probes_since_reload=' + out.probes_since_reload
      + ' since_reload_ms=' + out.since_reload_ms + ' pristine=' + out.pristine
      + ' mode=' + out.mode + ' ms=' + out.ms + (out.mutations ? ' MUTATED=' + out.mutations : '') + '\n');
  }
  return 0;
}

if (require.main === module) {
  cli().then((c) => process.exit(c || 0)).catch((e) => {
    process.stderr.write('probe-client: ' + (e && e.message || e) + '\n');
    if (e && e.contaminated) {
      process.stderr.write('  -> this is the contamination guard, working as designed.\n'
        + '     Add --fresh to reload first (the assertive path), or --explore to measure the held world anyway.\n');
    }
    process.exit(1);
  });
}
