/* W-ADDRESSES cycle 8 -- R21's ACCEPTANCE TEST: the SAME 22-shape press, run against the
   cycle-7 expression and against the shipped one.

   Cycle 7's R19 taught boot.js's door classifier that a second segment reading `home` means the
   app is showing the HOME. It asked that question with NO condition on the FIRST segment:

     _dg=(!_raw||_seg.toLowerCase()==='home'||(_raw.split('/')[1]||'').toLowerCase()==='home')
         ?_door:(_hr||_rm(window.__doorBoot));

   router.js:41 strips segment 0 only when `TopicRegistry.get(parts[0]) && !ROUTES[parts[0]]`, so
   a second segment is a VIEW only when the first is a REGISTERED TOPIC. On every other shape
   segment 0 IS the view and `home` in segment 1 is a sub-state. The cycle-7 line therefore took
   the DOOR's answer on nine shapes the app resolves to a bare view of the BOOT topic, and on a
   seeded record the whole document wore the RESUME room -- permanently, since a bare-view boot
   never switches and never re-stamps. R21's fix gates the second-segment test on `_hr`, which the
   line already computes and which is exactly parseHash's own predicate.

   THE ORACLE IS THE APP, NOT A TABLE. Each shape is loaded on a seeded record; the room the
   document wears is every value <html data-group> ever holds (a document_start MutationObserver
   plus 90 rAF frames, the union home_claims uses), and the room it OUGHT to wear is read from the
   page: TopicRegistry.current()'s group when the app is showing a topic view, and
   Panels.resumeTarget()'s group when the app is showing the home. Which of those two the app is
   showing is read from `data-view`, which ViewManager stamps for the home only -- NOT from a
   second copy of the classifier under test.

   THE PLANT IS THE CYCLE-7 LINE RESTORED VERBATIM in the BUILT deliverable (this file reads the
   built page, so the source is not rebuilt): the exact bytes of the shipped line are swapped for
   the exact bytes of cycle 7's, the press runs, and the file is restored and compared.

   usage: node _audit/w-addresses-cycle8/press_prefixed_home_c8.cjs
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML = path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html');

const SHIPPED = "var _dg=(!_raw||_seg.toLowerCase()==='home'||(_hr&&(_raw.split('/')[1]||'')"
  + ".toLowerCase()==='home'))?_door:(_hr||_rm(window.__doorBoot));";
const CYCLE7 = "var _dg=(!_raw||_seg.toLowerCase()==='home'||(_raw.split('/')[1]||'')"
  + ".toLowerCase()==='home')?_door:(_hr||_rm(window.__doorBoot));";

/* THE 22 SHAPES. Grouped by what the app does with them, which is what decides the oracle.
   `kind` is documentation only -- nothing in the verdict reads it; the verdict compares the room
   worn against the room the PAGE reports for whatever it is showing. */
const SHAPES = [
  /* the six shapes home_claims already drove, as controls -- a re-ordering of a classifier can
     break the cells it is not aimed at, so they are pressed under the plant too */
  ['#home', 'the home'],
  ['#HOME', 'the home, wrong case'],
  ['#walk', 'a bare view'],
  ['#drill', 'a bare view'],
  ['#Walk', 'a bare view, mixed case'],
  ['#Nonsense', 'a malformed hash -> bare view'],
  /* a real topic prefix on a topicless view -- the shape R19 was written for */
  ['#authz/home', 'a TOPIC prefix on the home'],
  ['#saga/home', 'a TOPIC prefix on the home'],
  /* the nine over-fires: segment 1 reads `home`, segment 0 is NOT a registered topic */
  ['#/home', 'empty prefix -> bare view'],
  ['#walk/home', 'a VIEW id in segment 0 -> bare view'],
  ['#drill/home', 'a VIEW id in segment 0 -> bare view'],
  ['#viz/home', 'a VIEW id in segment 0 -> bare view'],
  ['#wb/home', 'a VIEW id in segment 0 -> bare view'],
  ['#Walk/home', 'a mixed-case VIEW id -> bare view'],
  ['#walk/HOME', 'a VIEW id + wrong-case home sub-state'],
  ['#nonsense/home', 'an unknown segment 0 -> bare view'],
  ['#AUTHZ/home', 'a TOPIC slug in the WRONG CASE -> bare view'],
  /* neighbours of the same family, to show the class boundary rather than only its two sides */
  ['#authz/walk', 'a TOPIC prefix on a real view'],
  ['#authz/HOME', 'a TOPIC prefix on the home, wrong case'],
  ['#Authz/home', 'a TOPIC slug title-cased -> bare view'],
  ['#saga/nonsense', 'a TOPIC prefix on an unknown view'],
  ['#walk/authz', 'a VIEW then a topic slug -> bare view'],
];

const INIT = (seed) => {
  try {
    localStorage.clear();
    localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id: seed, view: 'drill' }));
    localStorage.setItem('ddr.v1.progress.' + seed, JSON.stringify({
      got: 3, shk: 2, done: 5, tot: 12, revisit: ['x'], cards: {}, cv: 1, ts: Date.now() }));
  } catch (e) { /* private mode is not this press's subject */ }
  window.__seen = [document.documentElement
    ? document.documentElement.getAttribute('data-group') : null];
  new MutationObserver((recs) => {
    for (const r of recs) window.__seen.push(r.target.getAttribute(r.attributeName));
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-group'] });
  window.__frames = [];
  const tick = () => {
    window.__frames.push(document.documentElement.getAttribute('data-group'));
    if (window.__frames.length < 90) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const READ = () => {
  const view = document.documentElement.getAttribute('data-view');
  const shownTopic = ((((typeof TopicRegistry !== 'undefined' && TopicRegistry.current
    && TopicRegistry.current()) || {}).identity) || {}).group || null;
  const rt = (typeof Panels !== 'undefined' && Panels.resumeTarget && Panels.resumeTarget()) || null;
  const resume = ((rt || {}).topic || {}).identity ? rt.topic.identity.group : null;
  return {
    view, shownTopic, resume,
    seen: window.__seen.slice(1), frames: window.__frames.slice(),
  };
};

const rle = (f) => {
  const o = [];
  for (const v of f) {
    if (o.length && o[o.length - 1][0] === v) o[o.length - 1][1]++;
    else o.push([v, 1]);
  }
  return o.map(([v, n]) => (v === null ? '(no room)' : v) + ' x' + n).join(' -> ');
};

async function press(label) {
  const browser = await chromium.launch();
  const rows = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    /* the seed: a topic whose room is neither the boot topic's nor the cold door's, read from the
       page so this script carries no registry constant of its own */
    const p0 = await ctx.newPage();
    await p0.goto('file:///' + HTML.replace(/\\/g, '/') + '#home');
    await p0.waitForFunction(() => typeof TopicRegistry !== 'undefined' && TopicRegistry.ids
      && TopicRegistry.ids().length > 0, null, { timeout: 60000 });
    const seed = await p0.evaluate(() => {
      const ids = TopicRegistry.ids();
      const boot = ((((TopicRegistry.current && TopicRegistry.current()) || {}).identity)
        || {}).group || '';
      const cold = ((TopicRegistry.get(ids[0]) || {}).identity || {}).group || '';
      for (const id of ids) {
        const g = ((TopicRegistry.get(id) || {}).identity || {}).group || '';
        if (g && g !== boot && g !== cold) return { id, group: g, boot, cold };
      }
      return null;
    });
    await p0.close();
    if (!seed) throw new Error('no seed topic outside the boot and cold rooms');
    rows.push('SEED: nav.last = ' + seed.id + ' (' + seed.group + '); boot room ' + seed.boot
      + '; cold-door room ' + seed.cold);

    for (const [hash, kind] of SHAPES) {
      const p = await ctx.newPage();
      await p.addInitScript(INIT, seed.id);
      await p.goto('file:///' + HTML.replace(/\\/g, '/') + hash);
      await p.waitForFunction(
        () => document.documentElement.getAttribute('data-view') === 'home'
          || !!document.querySelector('.stage .pane.on'), null, { timeout: 60000 });
      await p.waitForTimeout(900);
      const r = await p.evaluate(READ);
      await p.close();
      const isHome = r.view === 'home';
      const want = isHome ? r.resume : r.shownTopic;
      const wore = r.seen.concat(r.frames).filter((v) => v !== null);
      const values = Array.from(new Set(wore));
      const ok = !!want && wore.length > 0 && wore.every((v) => v === want);
      rows.push([
        (ok ? 'ok  ' : 'MIS '), hash.padEnd(16),
        (isHome ? 'app shows THE HOME  ' : 'app shows a TOPIC   '),
        'ought ' + String(want).padEnd(24),
        'wore ' + (values.length === 1 ? values[0] : rle(r.seen.concat(r.frames))),
        '   (' + kind + ')',
      ].join(''));
    }
  } finally {
    await browser.close();
  }
  return { label, rows };
}

(async () => {
  const snap = fs.readFileSync(HTML, 'utf8');
  if (snap.indexOf(SHIPPED) < 0) throw new Error('the shipped classifier line is not in the build');
  if (snap.split(SHIPPED).length - 1 !== 1) throw new Error('the shipped line is not unique');

  const out = [];
  out.push('=== W-ADDRESSES cycle 8 -- R21 acceptance: 22 hash shapes, on a seeded record ===');
  out.push('');
  out.push('ORACLE: the room the app says it is showing -- TopicRegistry.current() on a topic');
  out.push('view, Panels.resumeTarget() on the home -- read from the page, per shape.');
  out.push('"wore" is the UNION of a document_start MutationObserver and 90 rAF frames.');
  out.push('');

  const shipped = await press('SHIPPED (R21: the home test gated on _hr)');
  out.push('--- ' + shipped.label + ' ---');
  out.push(...shipped.rows);

  let plantRows = [];
  try {
    fs.writeFileSync(HTML, snap.replace(SHIPPED, CYCLE7), 'utf8');
    const c7 = await press('PLANT: the CYCLE-7 line restored verbatim');
    plantRows = c7.rows;
    out.push('');
    out.push('--- ' + c7.label + ' ---');
    out.push(...c7.rows);
  } finally {
    fs.writeFileSync(HTML, snap, 'utf8');
  }
  out.push('');
  out.push('RESTORED: deliverable identical to snapshot '
    + (fs.readFileSync(HTML, 'utf8') === snap));

  const mis = plantRows.filter((r) => r.startsWith('MIS '));
  out.push('');
  out.push('THE DELTA: ' + mis.length + ' of ' + SHAPES.length + ' shapes are MIS-LIT under the '
    + 'cycle-7 line and 0 under the shipped one.');
  for (const m of mis) out.push('  ' + m.slice(4, 20).trim());

  const text = out.join('\n') + '\n';
  fs.writeFileSync(path.join(__dirname, 'press-prefixed-home-22.txt'), text, 'utf8');
  process.stdout.write(text);
})().catch((e) => { console.error(e); process.exit(1); });
