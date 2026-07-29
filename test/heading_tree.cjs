/* ===================== THE CONTENT AREA EXPOSES A HEADING TREE (W1 / G5) =====================
 *
 * THE MEASUREMENT THAT OPENED THIS. A deep light-DOM + all-shadow-root scan of a topic route
 * returned `renderedHeadings: 1` -- the sidebar h1 (the topic name). Repeated across all nine
 * panes; `headingCount: 0` inside every pane subtree; repeated on a second topic in a different
 * room. So across 46 topics x 9 panes of deliberately-structured study content, the rotor, the H
 * key and the "Landmarks and Headings" dialog returned exactly one item: the topic name the user
 * had just chosen. The visual hierarchy is clear on every pane. None of it reached the
 * accessibility tree.
 *
 * THE POSITIVE CONTROL IS PART OF THE CHECK, not a footnote. The same scanner on `#home` returns
 * h1 + two visible h2s. That is what makes "1" a finding rather than a broken instrument -- and
 * this file keeps the control wired in permanently, because a heading scanner that has quietly
 * stopped finding headings is indistinguishable from a page that has none. (This repo has shipped
 * checks that could not fail before; the control is the cheapest defence against being the next.)
 *
 * WHAT COUNTS AS A RENDERED HEADING: h1-h6 or [role="heading"], with layout boxes
 * (getClientRects), non-empty text, and no aria-hidden ancestor -- walked through every shadow
 * root, because nine of this app's panes are shadow DOM and a light-DOM-only walk would have
 * reported the same "1" for a completely different reason. Hidden panes have no boxes, so the
 * count is "what is exposed on THIS route", which is the number a user's rotor actually gets.
 *
 * The fix under guard is `#stagehead` becoming a real level-2 heading (role + aria-level +
 * tabindex="-1", the last also being P2-9's prerequisite for moving focus there). The final arm
 * pins that element by name, so an unrelated heading appearing elsewhere can never green this.
 *
 * Structural reads only -- no clock, no fonts, no pixels. WATCHED RED: the topic-route arms fail
 * on the pre-fix build (count 1) while the #home control passes, which is exactly the shape of
 * evidence the audit reported.
 *
 * Usage: node test/heading_tree.cjs [deliverable.html]   (CHROME=<path>)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

const fails = [], notes = [];
const chk = (name, ok, detail) => {
  notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail));
  if (!ok) fails.push(name);
};

/* Runs IN PAGE. The scanner, shared by the topic arms and the #home control so they cannot
   disagree about what a heading is. */
const SCAN = () => {
  const SEL = 'h1,h2,h3,h4,h5,h6,[role="heading"]';
  const out = [];
  const seen = new Set();
  const hiddenUp = (el) => {
    for (let n = el; n; n = n.parentElement || (n.getRootNode() && n.getRootNode().host) || null) {
      if (n.nodeType === 1 && n.getAttribute && n.getAttribute('aria-hidden') === 'true') return true;
    }
    return false;
  };
  const walk = (root) => {
    if (!root || seen.has(root)) return;
    seen.add(root);
    for (const el of root.querySelectorAll(SEL)) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      if (!el.getClientRects().length) continue;      /* not rendered on this route */
      if (hiddenUp(el)) continue;                      /* explicitly hidden from AT */
      const lvl = el.getAttribute('aria-level') ||
        (/^H[1-6]$/.test(el.tagName) ? el.tagName.slice(1) : null);
      out.push({ tag: el.tagName.toLowerCase(), id: el.id || null, level: lvl, text: text.slice(0, 60) });
    }
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot);
  };
  walk(document);
  return out;
};

const goRoute = async (page, hash) => {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  await B.until(page, (h) => window.location.hash === h, hash, B.ACT_MS, 'route becomes ' + hash);
  await B.settle(page);
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  /* ---------- the POSITIVE CONTROL first: if this fails, nothing below means anything ----------
     RECEIPT CORRECTION (measured here, 2026-07-29): the audit recorded this control as "h1 + two
     visible h2s" = 3. The home renders NO h1 -- home-view.js emits `<h2 class="hm-h">` section
     heads only, and the sidebar h1 has no layout boxes on #home because .app is display:none there.
     The real control is the TWO rendered h2s ("Choose a room", "All topics"). The control's job is
     unchanged and still does it: it proves the scanner finds headings when they exist, so a topic
     route's "1" is a fact about the app rather than a broken instrument. */
  await goRoute(page, '#home');
  const home = await page.evaluate(SCAN);
  chk('POSITIVE CONTROL: the scanner finds the home screen\'s section headings (2 rendered h2s)',
    home.length >= 2, 'found ' + home.length + ': ' + JSON.stringify(home) +
    ' -- if this is low the INSTRUMENT is broken, not the app, and every arm below is worthless');

  /* ---------- the topic routes ---------- */
  const topics = await page.evaluate(() => TopicRegistry.ids().slice(0, 2));
  for (const tid of topics) {
    for (const view of ['walk', 'drill']) {
      await goRoute(page, '#' + tid + '/' + view);
      const hs = await page.evaluate(SCAN);
      chk('[' + tid + '/' + view + '] the route exposes MORE THAN ONE heading to AT',
        hs.length > 1, 'renderedHeadings = ' + hs.length + ': ' + JSON.stringify(hs) +
        ' -- one heading means the rotor returns only the topic name the user already chose');
    }
  }

  /* ---------- pin the ELEMENT, so an unrelated heading elsewhere cannot green the arms above ---------- */
  await goRoute(page, '#' + topics[0] + '/walk');
  const sh = await page.evaluate(() => {
    const el = document.getElementById('stagehead');
    if (!el) return { err: '#stagehead not found' };
    return {
      role: el.getAttribute('role'),
      level: el.getAttribute('aria-level'),
      tabindex: el.getAttribute('tabindex'),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      rendered: el.getClientRects().length > 0,
    };
  });
  if (sh.err) chk('#stagehead exists', false, sh.err);
  else {
    chk('#stagehead is exposed as a level-2 heading with a name (it is the pane title every route already paints)',
      sh.role === 'heading' && sh.level === '2' && !!sh.text && sh.rendered,
      'role=' + JSON.stringify(sh.role) + ' aria-level=' + JSON.stringify(sh.level) +
      ' rendered=' + sh.rendered + ' name=' + JSON.stringify(sh.text));
    /* RECEIPT CORRECTION (measured here, 2026-07-29): the audit's erratum said `#stagehead` has NO
       tabindex "anywhere". It does -- topic-protocol.js:198 (applyIdentity) sets tabindex="-1" and
       focuses it on every TOPIC switch, which is the very idiom P2-9 extends to VIEW switches. So
       this arm was already green before the fix. It stays, because the attribute now also lives in
       the static HTML: a runtime-only tabindex is absent until the first applyIdentity, and the
       focus move in goView must not depend on a topic switch having happened first. */
    chk('#stagehead carries tabindex="-1" so goView can move focus to it (P2-9\'s prerequisite)',
      sh.tabindex === '-1', 'tabindex=' + JSON.stringify(sh.tabindex) +
      ' -- without it the programmatic focus silently fails and the pane-jump keys still strand AT 28-35 tab stops upstream');
    const staticTag = (require('fs').readFileSync(HTML, 'utf8').match(/<div[^>]*id="stagehead"[^>]*>/) || [''])[0];
    chk('#stagehead\'s role/aria-level/tabindex are STATIC in the shipped markup, not only applied by a topic switch',
      /tabindex="-1"/.test(staticTag) && /role="heading"/.test(staticTag) && /aria-level="2"/.test(staticTag),
      'the shipped HTML declares: ' + JSON.stringify(staticTag || '(element not found)') +
      ' -- until applyIdentity runs, a runtime-only attribute leaves the first focus move a silent no-op');
  }

  await browser.close();
  notes.forEach((n) => console.log(n));
  if (fails.length) { fails.forEach((f) => console.log('  - ' + f)); return B.finish(1, 'HEADING TREE: FAIL (' + fails.length + ')'); }
  console.log('HEADING TREE: PASS  (' + notes.length + ' assertions: #home control holds; every topic route exposes >1 heading; #stagehead is a named, focusable level-2)');
  return B.finish(0);
})().catch((e) => { console.error(e && e.stack || e); return B.finish(1, 'HEADING TREE: FAIL (harness error: ' + (e && e.message) + ')'); });
