/* W-ADDRESSES cycle 10 -- is the gauge legend inside any captured baseline frame, on THIS build?
   Cycle 9 measured this for the five-swatch/long-label key. Cycle 10 shortened the labels, which
   moves the key's box, so the answer is re-measured rather than cited. */
const { chromium } = require('playwright');
const path = require('path');
const B = require(path.join('D:\\claude-workspace\\_worktrees\\deepdive-rehearsal\\w-addresses',
  'test', '_boot.cjs'));
const HTML = process.argv[2];
const COLD = process.argv.indexOf('--cold') > 0;

const SEED = () => {
  TopicRegistry.ids().slice(0, 12).forEach((id) => {
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    cards.forEach((c, i) => { map[keys[i]] = (i % 7 === 0) ? 2 : 3; });
    const shk = Object.keys(map).filter((k) => map[k] < 3).length;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: cards.length - shk, shk: shk, done: cards.length, tot: cards.length,
      revisit: ['idempotency', 'backpressure'], cards: map, cv: 1, ts: Date.now() }));
  });
};

const READ = () => {
  const k = document.querySelector('.hm-alt .hm-key');
  if (!k) return null;
  const r = k.getBoundingClientRect();
  const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
  const inFrame = r.top >= 0 && r.bottom <= window.innerHeight;
  const stack = (cx >= 0 && cy >= 0 && cy < window.innerHeight)
    ? document.elementsFromPoint(cx, cy).slice(0, 3).map((e) => e.tagName.toLowerCase()
      + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string'
        ? '.' + e.className.trim().replace(/\s+/g, '.') : '')).join(' > ')
    : '(centre outside the viewport)';
  return {
    box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
      h: Math.round(r.height) },
    vh: window.innerHeight,
    below: Math.max(0, Math.round(r.top - window.innerHeight)),
    inFrame,
    stack,
  };
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  for (const [w, h, name] of [[1280, 800, 'home-light / home-dark'],
    [390, 844, 'm-home-light / m-home-dark']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h },
      hasTouch: w < 500, isMobile: w < 500 });
    const p = await ctx.newPage();
    await B.gotoApp(p, HTML, { hash: '#home' });
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    if (!COLD) await p.evaluate(SEED);
    await B.gotoApp(p, HTML, { hash: '#home' });
    await B.until(p, () => !!document.querySelector('#home .hm-alt'), null, B.ACT_MS, 'home');
    await B.settle(p);
    const r = await p.evaluate(READ);
    console.log(w + 'x' + h + '  (' + name + ')' + (COLD ? '  COLD -- no progress record, which is what the VR recipe captures' : '  seeded weakTopics'));
    if (!r) { console.log('   NO .hm-alt .hm-key on this record -- the gauge panel does not render'); await ctx.close(); continue; }
    console.log('   key box ' + JSON.stringify(r.box) + '  viewport height ' + r.vh);
    console.log('   inside the captured frame: ' + r.inFrame
      + (r.below ? '  -- ' + r.below + 'px BELOW it' : ''));
    console.log('   elementsFromPoint at its centre: ' + r.stack);
    await ctx.close();
  }
  await browser.close();
})();
