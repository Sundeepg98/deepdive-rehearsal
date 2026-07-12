#!/usr/bin/env node
/*
 * CRAM / SCOPE DISTINCTNESS GATE.
 *
 * THE BUG THIS EXISTS TO PREVENT (regression guard, 2026-07-12):
 * <deep-cram> and <deep-scope> baked topic 1's (Content Pipeline's) body into their shadow
 * roots as a literal template string and never subscribed to `deeptopicchange`. Meanwhile
 * applyIdentity() DID rename the overlay header per topic. Net effect: 45 of 46 topics served
 * a BYTE-IDENTICAL Content Pipeline cram sheet (3,836 chars) under a correctly-renamed header.
 * The cram sheet is the night-before-the-interview artifact, so this was actively harmful --
 * and it was invisible to every existing check, because the DATA was fine. Only the RENDER
 * was wrong.
 *
 * SO THIS MEASURES THE RENDER, NOT THE DATA.
 * It drives the real app: switches topic through TopicRegistry, opens the real overlay, and
 * reads the text that actually landed in the Shadow DOM. A derivation function that returns
 * the right string but never reaches the screen fails here, as it should.
 *
 * THE CONTRACT (any violation = FAIL):
 *   1. DISTINCT -- no two topics may render the same cram body. Same for scope. This is the
 *      exact property that was violated; a hash collision between any pair is the failure.
 *   2. NON-EMPTY -- every body must clear a length floor. Without this, "all 46 bodies are
 *      distinct" is trivially satisfiable by rendering nothing, and a previous a11y audit in
 *      this repo certified a COMPLETELY BLANK PAGE as passing. Distinctness alone is a trap.
 *   3. NO CROSS-TOPIC BLEED -- no topic's body may equal topic 1's. (Implied by 1, asserted
 *      separately so the failure message names the actual historical bug.)
 *
 * Usage:
 *   node test/cram_scope_distinct.cjs [path/to/build.html]
 *   CHROME=/path/to/chrome node test/cram_scope_distinct.cjs
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv.slice(2).find((a) => !a.startsWith('--'))
  || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

// A real cram sheet is dense (the 8 hand-coded ones run 3-5k chars). A body under this is
// not a summary of anything -- it is a render that failed. Deliberately well below the
// smallest real one so it flags BLANKNESS, not brevity.
//
// THE FLOOR MUST MEASURE CONTENT, NOT CSS (hardened 2026-07-12, verification pass).
// <deep-cram>'s shadow root is `<style>...</style>` + the derived body, and shadowRoot
// .textContent includes the STYLE ELEMENT'S CSS TEXT -- 345 chars of it. Measured against a
// raw textContent, a floor of 300 is therefore INERT for cram: a body with ZERO derived
// content still measures 345 and sails past it. The floor exists precisely because "a
// previous a11y audit in this repo certified a COMPLETELY BLANK PAGE as passing"; a floor
// that its own <style> tag satisfies would have repeated that exact mistake. norm() below
// now skips STYLE nodes, so this floor is measured against derived content ONLY.
const MIN_BODY = 300;

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage();
  const perr = [];
  page.on('pageerror', (e) => perr.push('pageerror: ' + e.message));
  await B.gotoApp(page, HTML);   /* was: goto + 300ms */

  const rep = await page.evaluate(async () => {
    if (typeof TopicRegistry === 'undefined') return { fatal: 'TopicRegistry undefined' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // close the first-run topic-index screen, so the overlays open over the normal app
    const ix = document.querySelector('.ix-x'); if (ix) ix.click();
    await sleep(200);
    const ids = TopicRegistry.ids();
    // Read the DERIVED CONTENT only. Skipping STYLE keeps 345 chars of inlined CSS out of
    // both the length floor and the distinctness hash -- see the MIN_BODY note above.
    const norm = (el) => {
      if (!el || !el.shadowRoot) return '';
      let t = '';
      el.shadowRoot.childNodes.forEach((n) => { if (n.nodeName !== 'STYLE') t += (n.textContent || ''); });
      return t.replace(/\s+/g, ' ').trim();
    };

    // DETERMINISTIC topic switch. setTopic() routes the `deeptopicchange` dispatch through
    // ViewTransitions.run() -> document.startViewTransition(), which fires the callback in a
    // LATER frame. A fixed sleep therefore races the re-render and can read the PREVIOUS
    // topic's body -- which would make this gate flaky in exactly the direction that hides the
    // bug it exists to catch. So wait on the event itself, not on a stopwatch.
    const switchTo = async (id) => {
      const cur = TopicRegistry.current();
      if (cur && cur.id === id) return;                    // already current: no event will fire
      await new Promise((res) => {
        let done = false;
        const on = () => { if (done) return; done = true; window.removeEventListener('deeptopicchange', on); res(); };
        window.addEventListener('deeptopicchange', on);
        if (!TopicRegistry.setTopic(id)) { on(); return; } // unknown id -> never hang
        setTimeout(on, 3000);                              // safety net
      });
      // the overlay's listener ran synchronously inside that dispatch; let paint settle
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    };

    // Drive the REAL overlays: open once, then switch topics underneath them. This is the
    // live re-render path a user actually exercises, and the one that was broken.
    const collect = async (hostSel, openId, closeId) => {
      const host = document.querySelector(hostSel);
      if (!host) return { err: hostSel + ' not in the DOM' };
      const out = {};
      document.getElementById(openId).click();
      await sleep(150);                       // lazy IntersectionObserver render
      for (const id of ids) {
        await switchTo(id);
        out[id] = norm(host);
      }
      document.getElementById(closeId).click();
      await sleep(60);
      return { out };
    };

    const cram = await collect('deep-cram', 'cramopen', 'cramx');
    if (cram.err) return { fatal: cram.err };
    const scope = await collect('deep-scope', 'scopeopen', 'scopex');
    if (scope.err) return { fatal: scope.err };

    return { ids, cram: cram.out, scope: scope.out };
  });

  await browser.close();
  if (rep.fatal) { console.log('CRAM/SCOPE DISTINCT: FAIL (' + rep.fatal + ')'); process.exit(1); }
  if (perr.length) { console.log('CRAM/SCOPE DISTINCT: FAIL (page errors: ' + perr.join('; ') + ')'); process.exit(1); }

  const h = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 10);
  const problems = [];
  const summary = {};

  ['cram', 'scope'].forEach((kind) => {
    const bodies = rep[kind];
    const byHash = {};
    let min = Infinity, max = 0;

    rep.ids.forEach((id) => {
      const body = bodies[id] || '';
      min = Math.min(min, body.length);
      max = Math.max(max, body.length);
      // (2) NON-EMPTY -- distinctness is worthless if the bodies are blank.
      if (body.length < MIN_BODY) {
        problems.push(kind + ': ' + id + ' renders only ' + body.length + ' chars (floor ' + MIN_BODY + ') -- blank/near-blank body');
      }
      // (4) NO EMPTY STATE. deriveCram/deriveScope fall back to an explicit "Nothing authored
      // yet" card when a topic has no usable slices ("empty beats WRONG"). That fallback is the
      // right RUNTIME behaviour, but it must never be reachable in the shipped build -- and it
      // slips through both checks above: it is ~535 chars (clears the floor) and, so long as
      // only ONE topic hits it, it is distinct from every other body. So a topic silently
      // degrading to an empty cram sheet would leave this gate GREEN. Assert it outright.
      if (/Nothing authored yet/.test(body)) {
        problems.push(kind + ': ' + id + ' renders the EMPTY STATE ("Nothing authored yet") -- its source slices are '
          + 'missing, so it has no ' + kind + ' sheet at all. Empty beats wrong, but neither is shippable.');
      }
      (byHash[h(body)] = byHash[h(body)] || []).push(id);
    });

    // (1) DISTINCT -- the exact property the bug violated.
    Object.keys(byHash).forEach((hash) => {
      const group = byHash[hash];
      if (group.length > 1) {
        problems.push(kind + ': ' + group.length + ' topics render an IDENTICAL body (' + bodies[group[0]].length
          + ' chars, sha1 ' + hash + '): ' + group.slice(0, 6).join(', ') + (group.length > 6 ? ', +' + (group.length - 6) + ' more' : ''));
      }
    });

    // (3) NO CROSS-TOPIC BLEED -- name the historical bug explicitly.
    const t1 = bodies['content-pipeline'];
    if (t1) {
      const bleed = rep.ids.filter((id) => id !== 'content-pipeline' && bodies[id] === t1);
      if (bleed.length) {
        problems.push(kind + ': ' + bleed.length + " topic(s) serve CONTENT PIPELINE's body under their own header -- "
          + 'the original bug, exactly: ' + bleed.slice(0, 6).join(', '));
      }
    }

    summary[kind] = { distinct: Object.keys(byHash).length, total: rep.ids.length, min, max };
  });

  const pad = (s, w) => String(s).padEnd(w);
  console.log('');
  console.log('  ' + pad('overlay', 10) + pad('distinct bodies', 18) + pad('shortest', 11) + 'longest');
  console.log('  ' + '-'.repeat(50));
  ['cram', 'scope'].forEach((k) => {
    const s = summary[k];
    console.log('  ' + pad(k, 10) + pad(s.distinct + '/' + s.total, 18) + pad(s.min, 11) + s.max);
  });
  console.log('');

  if (problems.length) {
    console.log('CRAM/SCOPE DISTINCT: FAIL');
    problems.slice(0, 20).forEach((p) => console.log('    - ' + p));
    if (problems.length > 20) console.log('    ... and ' + (problems.length - 20) + ' more');
    // The LAST line is what THE GATE prints in its summary row (check_all.py:last_line).
    console.log('\nCRAM/SCOPE DISTINCT: FAIL  (' + problems.length + ' violation(s); cram '
      + summary.cram.distinct + '/' + summary.cram.total + ' distinct, scope '
      + summary.scope.distinct + '/' + summary.scope.total + ' distinct)');
    process.exit(1);
  }

  console.log('CRAM/SCOPE DISTINCT: PASS  (' + rep.ids.length + ' topics: '
    + summary.cram.distinct + '/' + summary.cram.total + ' distinct cram bodies, '
    + summary.scope.distinct + '/' + summary.scope.total + ' distinct scope bodies; '
    + 'shortest ' + Math.min(summary.cram.min, summary.scope.min) + ' chars)');
  process.exit(0);
})();
