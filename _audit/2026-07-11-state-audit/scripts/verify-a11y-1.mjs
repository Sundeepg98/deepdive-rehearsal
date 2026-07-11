/* ADVERSARIAL RE-VERIFICATION of rt-a11y F1 / F2 / F3.
   Independently re-measured; does NOT reuse the original lens's helpers. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-a11y';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

// dismiss any first-run overlay so we land in the app shell
await p.keyboard.press('Escape');
await p.waitForTimeout(600);

console.log('================ F1: HEADINGS ================');

// Deep walk: light DOM + every shadow root. Report tag, text, and whether it is
// actually rendered (a <script>-embedded "<h1>" string must NOT count).
const headingWalk = await p.evaluate(() => {
  const out = [];
  function walk(root, path) {
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (/^H[1-6]$/.test(el.tagName)) {
        const cs = getComputedStyle(el);
        out.push({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 40),
          path,
          display: cs.display,
          rendered: !!el.getClientRects().length
        });
      }
      if (el.getAttribute && el.getAttribute('role') === 'heading') {
        out.push({ tag: 'role=heading:' + el.tagName, text: (el.textContent || '').trim().slice(0, 40), path, rendered: !!el.getClientRects().length });
      }
      if (el.shadowRoot) walk(el.shadowRoot, path + ' >> ' + el.tagName.toLowerCase() + '#shadow');
    }
  }
  walk(document, 'doc');
  return out;
});
console.log('ALL headings (h1-h6 + role=heading) in the LIVE DOM incl. shadow roots:');
console.log(JSON.stringify(headingWalk, null, 1));

// Are the extra <h1>/<h2> that `grep dist/index.html` finds inside <script>?
const scriptHeadings = await p.evaluate(() => {
  let n = 0;
  for (const s of document.querySelectorAll('script')) {
    n += ((s.textContent || '').match(/<h[1-6][ >]/g) || []).length;
  }
  return n;
});
console.log('\n"<hN" occurrences inside <script> text (i.e. NOT DOM headings):', scriptHeadings);

// Per-pane heading census
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
console.log('\nPer-pane heading census (after switching to each pane):');
for (const id of PANES) {
  await p.evaluate(t => window.switchTab(t), id);
  await p.waitForTimeout(350);
  const r = await p.evaluate(paneId => {
    const pane = document.getElementById(paneId);
    if (!pane) return 'PANE MISSING';
    const hs = pane.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]');
    return hs.length ? [...hs].map(h => h.tagName + ':' + h.textContent.trim().slice(0, 30)) : '*** NONE ***';
  }, id);
  console.log('  ' + id.padEnd(6), JSON.stringify(r));
}

// <main> region heading count
const mainH = await p.evaluate(() => document.querySelectorAll('main h1,main h2,main h3,main h4,main h5,main h6,main [role=heading]').length);
console.log('\nHeadings inside <main class="stage">:', mainH);

console.log('\n================ F2: SEG SELECTED STATE ================');
await p.evaluate(() => window.switchTab('walk'));
await p.waitForTimeout(300);
const before = await p.evaluate(() => [...document.querySelectorAll('.seg button')].map(bt => ({
  tab: bt.getAttribute('data-tab'),
  cls_on: bt.classList.contains('on'),
  ariaCurrent: bt.getAttribute('aria-current'),
  ariaSelected: bt.getAttribute('aria-selected'),
  ariaPressed: bt.getAttribute('aria-pressed'),
  role: bt.getAttribute('role')
})));
await p.evaluate(() => window.switchTab('num'));
await p.waitForTimeout(500);
const after = await p.evaluate(() => [...document.querySelectorAll('.seg button')].map(bt => ({
  tab: bt.getAttribute('data-tab'),
  cls_on: bt.classList.contains('on'),
  ariaCurrent: bt.getAttribute('aria-current'),
  ariaSelected: bt.getAttribute('aria-selected'),
  ariaPressed: bt.getAttribute('aria-pressed'),
  role: bt.getAttribute('role')
})));
console.log('BEFORE switchTab("num"):'); console.table ? console.table(before) : console.log(before);
console.log(JSON.stringify(before, null, 0));
console.log('AFTER switchTab("num"):');
console.log(JSON.stringify(after, null, 0));
console.log('seg container attrs:', await p.evaluate(() => {
  const s = document.querySelector('.seg');
  return { role: s.getAttribute('role'), label: s.getAttribute('aria-label'), tag: s.tagName };
}));

// CDP AX tree -- literally what a screen reader consumes
const cdp = await p.context().newCDPSession(p);
await cdp.send('Accessibility.enable');
const { nodes } = await cdp.send('Accessibility.getFullAXTree');
const segNames = ['Walkthrough MECHANICS', 'Probe Drill GRADED', 'Numbers ESTIMATE', 'Red Flags ANTI-PATTERNS'];
console.log('\nCDP AX tree for the seg buttons (with Numbers active):');
for (const n of nodes) {
  const nm = n.name && n.name.value ? n.name.value.replace(/\s+/g, ' ').trim() : '';
  if (n.role && n.role.value === 'button' && segNames.some(s => nm === s)) {
    const props = (n.properties || []).map(pr => pr.name + '=' + JSON.stringify(pr.value.value)).join(' ');
    console.log('  role=button name="' + nm + '" props: ' + props);
  }
}

console.log('\n================ F3: DRILL REVEAL ================');
await p.evaluate(() => window.switchTab('drill'));
await p.waitForTimeout(700);
await p.screenshot({ path: SHOTS + '/f3-drill-before.png' });

const dBefore = await p.evaluate(() => {
  const a = document.querySelector('#drill .ans') || document.querySelector('.ans');
  return {
    ansExists: !!a,
    activeElement: document.activeElement ? document.activeElement.tagName + (document.activeElement.id ? '#' + document.activeElement.id : '') : null,
    docLiveRegions: [...document.querySelectorAll('[aria-live]')].map(e => ({
      sel: e.id ? '#' + e.id : e.className || e.tagName,
      live: e.getAttribute('aria-live'),
      text: (e.textContent || '').trim().slice(0, 40)
    }))
  };
});
console.log('BEFORE Space:', JSON.stringify(dBefore, null, 1));

// press Space the way a user would
await p.click('#drill', { position: { x: 5, y: 5 } }).catch(() => {});
await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
await p.keyboard.press('Space');
await p.waitForTimeout(900);
await p.screenshot({ path: SHOTS + '/f3-drill-after.png' });

const dAfter = await p.evaluate(() => {
  const a = document.querySelector('#drill .ans') || document.querySelector('.ans');
  if (!a) return { ansExists: false };
  // CRITICAL: walk the ANCESTOR chain -- an ancestor live region would rescue this
  const anc = [];
  let cur = a;
  while (cur && cur !== document.documentElement) {
    anc.push({
      sel: cur.id ? '#' + cur.id : (cur.className && typeof cur.className === 'string' ? '.' + cur.className.split(' ')[0] : cur.tagName),
      ariaLive: cur.getAttribute ? cur.getAttribute('aria-live') : null,
      role: cur.getAttribute ? cur.getAttribute('role') : null
    });
    cur = cur.parentElement;
  }
  return {
    ansExists: true,
    height: Math.round(a.getBoundingClientRect().height),
    text: (a.textContent || '').trim().slice(0, 60),
    ariaLive: a.getAttribute('aria-live'),
    role: a.getAttribute('role'),
    tabIndex: a.tabIndex,
    ancestorChain: anc,
    activeElement: document.activeElement ? document.activeElement.tagName + (document.activeElement.id ? '#' + document.activeElement.id : '') : null,
    docLiveRegions: [...document.querySelectorAll('[aria-live]')].map(e => ({
      sel: e.id ? '#' + e.id : (typeof e.className === 'string' ? e.className : e.tagName),
      live: e.getAttribute('aria-live'),
      visible: !!e.getClientRects().length,
      text: (e.textContent || '').trim().slice(0, 40)
    }))
  };
});
console.log('AFTER Space:', JSON.stringify(dAfter, null, 1));

console.log('\nERRORS:', errs.length ? errs : 'none');
await b.close();
