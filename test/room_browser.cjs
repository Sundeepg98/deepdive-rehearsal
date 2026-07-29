/* ROOM BROWSER INVARIANTS (Phase 6). The things a grep cannot see:
   1. THE ROOM IS WIRED AT BOOT -- data-group is on <html> and --topic-ink resolves,
      on the very first paint (applyIdentity does NOT run at boot). A dead --topic-accent
      shipped for months precisely because nothing asserted it at runtime.
   2. THE BLANK-PAGE CLASS OF BUG CANNOT RECUR -- under prefers-reduced-motion the app
      still RENDERS (body opacity 1, real light + shadow text), in both themes.
   3. THE HOME BRAND MARK CLAIMS NO ROOM (W15). This is the deliberate EXCEPTION to (1),
      and it belongs here because this file owns the question "what wears which room".
      index.html hard-codes data-group for first paint and applyIdentity does not run at
      boot, so on the topic-less home route the document accent is a BOOT CONSTANT that
      means nothing. W3 gave the hero its destination's room; the brand mark 130px above
      it was still painting in that boot constant -- architecture-apis magenta -- so the
      first screen had two real room colours and only one of them meant anything.
      On #home the brand mark now wears the BRAND indigo: the neutral that styles.css's
      own comment calls "the app's BRAND indigo ... and the badge colour ... IT DOES NOT
      MOVE", carried by the .ix-panel neutralisation in both themes.
      Asserted WITHOUT hardcoding a hex, so the check states the contract and not the
      current value: the brand mark must match that neutral, and must match NONE of the
      six room inks -- which is the property that actually matters ("no element on the
      first screen accidentally claims a room"), and it holds even if every hex changes.
   Usage: node test/room_browser.cjs <deliverable.html>   (CHROME=<path> for the browser). */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const URL = 'file:///' + path.resolve(HTML).replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const fails = [];

  // 1. room wired at boot
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await B.gotoApp(page, HTML, { hash: '#walk' });   /* was: goto + 600ms */
    const boot = await page.evaluate(() => ({
      group: document.documentElement.getAttribute('data-group'),
      ink: getComputedStyle(document.documentElement).getPropertyValue('--topic-ink').trim(),
      acc: getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(),
    }));
    if (!boot.group) fails.push('data-group is not set on <html> at boot');
    if (!boot.ink) fails.push('--topic-ink is empty at boot');
    if (!boot.acc || boot.acc !== boot.ink) fails.push('--acc (' + boot.acc + ') is not rebound to --topic-ink (' + boot.ink + ')');
    await ctx.close();
  }

  // 2. reduced-motion renders (blank-page guard), both themes
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
    await B.gotoApp(page, HTML, { hash: '#walk' });   /* was: goto + 600ms */
    await B.settle(page);
    const r = await page.evaluate(() => {
      const op = getComputedStyle(document.body).opacity;
      const txt = (document.body.innerText || '').trim().length;
      const wt = document.querySelector('deep-walkthrough');
      const st = wt && wt.shadowRoot ? wt.shadowRoot.querySelector('.step-t') : null;
      return { op, txt, shadow: st ? st.textContent.trim().length : 0 };
    });
    if (r.op !== '1') fails.push('[' + theme + '] reduced-motion body opacity ' + r.op + ' != 1 (blank-page risk)');
    if (r.txt < 200 || r.shadow < 1) fails.push('[' + theme + '] reduced-motion under-rendered (light text ' + r.txt + ', shadow ' + r.shadow + ')');
    await ctx.close();
  }

  // 3. the home brand mark claims no room, both themes
  const ROOMS = ['messaging-events', 'data-storage', 'reliability-observability',
    'platform-infra', 'architecture-apis', 'security-tenancy'];
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
    await B.gotoApp(page, HTML, { hash: '' });
    await B.until(page, () => !!document.querySelector('#home .hm-brand'),
      null, B.ACT_MS, 'home brand mark mounted');
    const r = await page.evaluate((rooms) => {
      const brand = document.querySelector('#home .hm-brand');
      const panel = document.querySelector('#home .ix-panel');
      if (!brand) return { err: 'no #home .hm-brand' };
      if (!panel) return { err: 'no #home .ix-panel to read the brand neutral from' };
      const norm = (s) => (s || '').trim().toLowerCase();
      /* resolve a colour token to what it actually PAINTS, so a hex and an rgb() of the
         same colour compare equal -- the tokens are hexes, computed colour is rgb(). */
      const paint = (value) => {
        const probe = document.createElement('span');
        probe.style.color = value;
        probe.style.display = 'none';
        document.body.appendChild(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return norm(out);
      };
      const rootCs = getComputedStyle(document.documentElement);
      const brandColor = norm(getComputedStyle(brand).color);
      return {
        brandColor,
        /* the documented brand indigo, read LIVE off the neutralisation that carries it */
        neutral: paint(getComputedStyle(panel).getPropertyValue('--acc').trim()),
        bootRoom: paint(rootCs.getPropertyValue('--topic-ink').trim()),
        bootGroup: document.documentElement.getAttribute('data-group'),
        roomInks: rooms.map((g) => [g, paint(rootCs.getPropertyValue('--room-' + g).trim())]),
      };
    }, ROOMS);
    if (r.err) { fails.push('[' + theme + '/home] ' + r.err); await ctx.close(); continue; }
    if (r.brandColor !== r.neutral) {
      fails.push('[' + theme + '/home] .hm-brand is ' + r.brandColor + ', not the brand indigo '
        + r.neutral + ' that the .ix-panel neutralisation carries');
    }
    const claimed = r.roomInks.filter(([, ink]) => ink === r.brandColor).map(([g]) => g);
    if (claimed.length) {
      fails.push('[' + theme + '/home] .hm-brand (' + r.brandColor + ') is room ink for ['
        + claimed.join(', ') + '] -- the brand mark must claim NO room'
        + (claimed.indexOf(r.bootGroup) !== -1
          ? ' (this is the boot constant from index.html, which means nothing on a topic-less route)'
          : ''));
    }
    await ctx.close();
  }

  await browser.close();
  if (fails.length) {
    console.log('ROOM BROWSER: FAIL');
    fails.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
  console.log('ROOM BROWSER: PASS  (data-group + --topic-ink + --acc rebind at boot; reduced-motion '
    + 'renders in both themes; the home brand mark wears the brand indigo and claims no room)');
})();
