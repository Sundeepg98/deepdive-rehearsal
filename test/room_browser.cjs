/* ROOM BROWSER INVARIANTS (Phase 6). The things a grep cannot see:
   1. THE ROOM IS WIRED AT BOOT -- data-group is on <html> and --topic-ink resolves,
      on the very first paint (applyIdentity does NOT run at boot). A dead --topic-accent
      shipped for months precisely because nothing asserted it at runtime.
   2. THE BLANK-PAGE CLASS OF BUG CANNOT RECUR -- under prefers-reduced-motion the app
      still RENDERS (body opacity 1, real light + shadow text), in both themes.
   3. THE HOME BRAND MARK CLAIMS NO ROOM (W15). This is the deliberate EXCEPTION to (1),
      and it belongs here because this file owns the question "what wears which room".
      index.html used to hard-code data-group for first paint, and applyIdentity runs only
      on switches, so on the topic-less home route the document accent was a BOOT CONSTANT
      that meant nothing. W3 gave the hero its destination's room; the brand mark 130px
      above it was still painting in that boot constant -- architecture-apis magenta -- so
      the first screen had two real room colours and only one of them meant anything.
      (The constant is gone as of W-ADDRESSES cycle 2 -- scripts/boot.js derives the room
      from the record and the route -- but the brand's contract is unchanged and arm 1
      above is what proves the derivation still answers on a topic route.)
   4. A FOCUSED TOPIC CARD WEARS ITS OWN SECTION'S ROOM, not the door's. The library shows
      six rooms at once and its rest state said so; :hover and :focus-visible both took
      --acc, one value for the whole document, so touching a card collapsed six rooms into
      one. Pressed on three real cards through the keyboard path, and the three rings must
      be three DIFFERENT colours or the arm cannot tell the two states apart.
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
    await B.until(page, () => !!document.querySelector('.hm-rail .hm-brand'),
      null, B.ACT_MS, 'home brand mark mounted');
    const r = await page.evaluate((rooms) => {
      const brand = document.querySelector('.hm-rail .hm-brand');
      const panel = document.querySelector('#home .ix-panel');
      if (!brand) return { err: 'no .hm-rail .hm-brand (the home brand mark)' };
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

  /* 4. A TOPIC CARD'S RING IS ITS OWN SECTION'S ROOM, NOT THE DOOR'S.
     The library shows all six rooms at once and its REST state already says so -- each
     .ix-group section carries an inline --rm and the card borders mix 25% of it. The two ACTIVE
     states did not read it: :hover and :focus-visible both took --acc, which is ONE value for
     the whole document. So the moment you touched a card, six rooms collapsed into one, on the
     surface whose entire argument is that they are all visible.
     PRESSED RATHER THAN INSPECTED: three real cards in three DIFFERENT sections are focused
     through the keyboard path (.focus(), which is what :focus-visible answers for a scripted
     focus on a button), and each ring's computed outline colour must equal ITS section's --rm.
     The arm requires the three to be three DIFFERENT colours, so a build where every section
     resolved to the same value could not pass by accident -- which is the exact failure it
     exists to catch. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.until(page, () => [...document.querySelectorAll('.ix-group')]
      .filter((s) => s.getClientRects().length).length >= 3,
      null, B.ACT_MS, 'the home library with at least three RENDERED room sections');
    await B.settle(page);
    /* the RENDERED sections only. The home renders the library TWICE -- the desktop companion
       column (.hm-lib) and the phone's <details class="hm-libm"> mirror inside #home -- and at
       1400px it is the mirror that is hidden. Its cards cannot take focus at all, so picking
       blind measures an unfocusable element and reports the initial black outline as the app's
       ring, which is what the first draft of this arm did. */
    const groups = await page.evaluate(() => [...document.querySelectorAll('.ix-group')]
      .filter((s) => s.getClientRects().length && s.querySelector('.ix-card')
        && s.querySelector('.ix-card').getClientRects().length)
      .map((s) => s.getAttribute('data-group')));
    if (groups.length < 3) {
      fails.push('[rings] only ' + groups.length + ' rendered room section(s) with a visible card '
        + 'in the home library -- the arm needs three to tell one room from six');
    }
    const rings = [];
    for (const g of groups.slice(0, 3)) {
      const sel = '.hm-lib .ix-group[data-group="' + g + '"] .ix-card';
      /* A REAL KEYBOARD FOCUS, not a scripted one. :focus-visible is a heuristic about HOW focus
         arrived; el.focus() from script is not guaranteed to satisfy it, and an arm that reads the
         rest-state outline would report the initial black and call the ring wrong for the wrong
         reason. Focus the card, step off it, step back with the keyboard: the second Tab is a
         genuine keyboard interaction landing on the card. */
      await page.locator(sel).first().focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      rings.push(await page.evaluate((s) => {
        const norm = (v) => (v || '').trim().toLowerCase();
        const paint = (value) => {
          const probe = document.createElement('span');
          probe.style.color = value; probe.style.display = 'none';
          document.body.appendChild(probe);
          const out = getComputedStyle(probe).color;
          probe.remove();
          return norm(out);
        };
        const card = document.querySelector(s);
        const sec = card.closest('.ix-group');
        const cs = getComputedStyle(card);
        return {
          group: sec.getAttribute('data-group'),
          rm: paint(getComputedStyle(sec).getPropertyValue('--rm').trim()),
          ring: norm(cs.outlineColor),
          style: cs.outlineStyle,
          acc: paint(getComputedStyle(document.documentElement).getPropertyValue('--acc').trim()),
          focused: document.activeElement === card && card.matches(':focus-visible'),
        };
      }, sel));
    }
    for (const r of rings) {
      if (r.err) { fails.push('[rings] ' + r.err); continue; }
      if (!r.focused) {
        fails.push('[rings] the ' + r.group + ' card is not :focus-visible after a keyboard step '
          + 'onto it, so no ring was drawn and the colour below is the initial value, not the app\'s '
          + '(outline-style ' + r.style + ')');
      }
      if (r.ring !== r.rm) {
        fails.push('[rings] a focused card in ' + r.group + ' draws its ring in ' + r.ring
          + ' while its own section is ' + r.rm + (r.ring === r.acc
            ? ' -- that is --acc, the DOOR\'s room, worn by a card in another room' : ''));
      }
    }
    const distinct = new Set(rings.filter((r) => !r.err).map((r) => r.ring));
    if (rings.length >= 3 && distinct.size < 3) {
      fails.push('[rings] the three sections drew only ' + distinct.size + ' distinct ring colour(s) ('
        + [...distinct].join(', ') + ') -- with fewer than three the arm cannot tell "each card wears '
        + 'its own room" from "every card wears one room", which is the defect it exists for');
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
    + 'renders in both themes; the home brand mark wears the brand indigo and claims no room; and '
    + 'a focused topic card wears ITS OWN section\'s room -- three sections, three rings, three '
    + 'distinct colours)');
})();
