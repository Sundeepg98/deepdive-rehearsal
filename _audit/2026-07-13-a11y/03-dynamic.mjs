/* DYNAMIC CONTENT: what is actually announced, what steals focus, what floods.
   Same monitor as 01 (already proven falsifiable by control A). */
import { open, axTree, roleOf, nameOf, propOf, toDrill, advanceToJudge, dismissOverlays, SHOTS } from './lib.mjs';
import path from 'path';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const MONITOR = () => {
  const LIVE_ROLE = /^(status|alert|log|timer|marquee|progressbar)$/;
  window.__isLiveRoot = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const al = el.getAttribute && el.getAttribute('aria-live');
    if (al && al !== 'off') return true;
    const r = el.getAttribute && el.getAttribute('role');
    if (r && LIVE_ROLE.test(r)) return true;
    return el.tagName === 'OUTPUT';
  };
  window.__liveAncestor = (node) => {
    let n = node.nodeType === 1 ? node : node.parentNode;
    while (n) {
      if (window.__isLiveRoot(n)) return n;
      n = n.parentNode || n.host || null;
    }
    return null;
  };
  window.__obs = []; window.__mut = [];
  window.__watch = () => {
    window.__mut = [];
    const cb = (recs) => recs.forEach(m => {
      const live = window.__liveAncestor(m.target);
      if (!live) return;                                  // only record ANNOUNCEABLE mutations
      window.__mut.push({
        text: (live.textContent || '').trim().slice(0, 60),
        changed: (m.target.textContent || '').trim().slice(0, 40),
        root: live.tagName.toLowerCase() + (live.id ? '#' + live.id : '') + '.' + String(live.className).split(' ')[0],
        live: live.getAttribute('aria-live'), role: live.getAttribute('role'),
      });
    });
    const opts = { subtree: true, childList: true, characterData: true, attributes: true };
    const attach = (r) => { const o = new MutationObserver(cb); o.observe(r, opts); window.__obs.push(o); };
    attach(document);
    const scan = (r) => r.querySelectorAll('*').forEach(el => { if (el.shadowRoot) { attach(el.shadowRoot); scan(el.shadowRoot); } });
    scan(document);
    return window.__obs.length;
  };
  window.__stop = () => { window.__obs.forEach(o => o.disconnect()); window.__obs = []; return window.__mut; };
  window.__focus = () => {
    let a = document.activeElement, path = [];
    while (a) {
      path.push(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (typeof a.className === 'string' && a.className ? '.' + a.className.split(' ')[0] : ''));
      if (a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; else break;
    }
    return path.join(' >> ');
  };
};

const { browser, page } = await open();
await page.addInitScript(MONITOR);
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1500);
await dismissOverlays(page);

/* ============================================================ */
hr('A. THE SECOND LIVE REGION — what is it, and does it work?');
const lr = await page.evaluate(() => {
  const out = [];
  const scan = (root, p) => root.querySelectorAll('*').forEach(el => {
    const al = el.getAttribute('aria-live');
    if ((al && al !== 'off') || /^(status|alert|log|timer)$/.test(el.getAttribute('role') || '')) {
      out.push({
        path: p, sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className || '').split(' ')[0],
        live: al, role: el.getAttribute('role'), atomic: el.getAttribute('aria-atomic'),
        text: (el.textContent || '').trim().slice(0, 50),
        cls: el.getAttribute('class'),
        outer: el.outerHTML.slice(0, 160),
        w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height,
      });
    }
    if (el.shadowRoot) scan(el.shadowRoot, p + '>' + el.tagName.toLowerCase() + '#shadow');
  });
  scan(document, '');
  return out;
});
lr.forEach(x => {
  log(`\n  ${x.path}>${x.sel}`);
  log(`     aria-live=${x.live} role=${x.role} atomic=${x.atomic} size=${Math.round(x.w)}x${Math.round(x.h)}`);
  log(`     text="${x.text}"`);
  log(`     ${x.outer.replace(/\n\s*/g, ' ')}`);
});

/* does it fire on PANE switch? */
hr('B. PANE SWITCH — is the new pane announced?');
for (const tab of ['drill', 'sys', 'walk']) {
  await page.evaluate(() => window.__watch());
  await page.click(`button[data-tab="${tab}"]`);
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => window.__stop());
  const title = await page.title();
  log(`\n  switch -> "${tab}"`);
  log(`     announcements: ${m.length}` + (m.length ? '  -> ' + JSON.stringify(m.map(x => x.changed).slice(0, 3)) : '   >>> SILENT'));
  if (m.length) log(`     via: ${m[0].root} [aria-live=${m[0].live}]`);
  log(`     document.title = "${title}"`);
}

/* TOPIC switch */
hr('C. TOPIC SWITCH — is the new topic announced? does the title update?');
await page.evaluate(() => window.__watch());
await page.evaluate(() => { const b = document.querySelectorAll('.tn-item')[3]; if (b) b.click(); });
await page.waitForTimeout(900);
let m = await page.evaluate(() => window.__stop());
log(`  announcements: ${m.length}` + (m.length ? ' -> ' + JSON.stringify(m.map(x => x.changed).slice(0, 3)) : '   >>> SILENT'));
log(`  document.title = "${await page.title()}"`);
log(`  h1 now = "${await page.evaluate(() => document.querySelector('h1')?.textContent.trim())}"`);
log(`  html[data-group] = "${await page.evaluate(() => document.documentElement.getAttribute('data-group'))}"`);

/* ============================================================ */
hr('D. FOCUS SURVIVAL — does revealing/grading destroy the keyboard position?');
await toDrill(page);
await page.waitForTimeout(400);

// focus the reveal button the way a keyboard user would, then activate it
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('adv').focus());
log('  focus before reveal : ' + await page.evaluate(() => window.__focus()));
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('adv').click());
await page.waitForTimeout(350);
log('  focus AFTER reveal  : ' + await page.evaluate(() => window.__focus()));
log('  (the #adv button is re-created by an innerHTML rewrite, so the focused node is destroyed)');

await advanceToJudge(page);
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('jg').focus());
log('\n  focus before grade  : ' + await page.evaluate(() => window.__focus()));
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('jg').click());
await page.waitForTimeout(450);
log('  focus AFTER grade   : ' + await page.evaluate(() => window.__focus()));

/* ============================================================ */
hr('E. THE TIMER — aria-live=polite on a 1-second countdown?');
const t = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const el = sr.getElementById('timer');
  return { outer: el.outerHTML.slice(0, 130), display: getComputedStyle(el).display };
});
log('  ' + t.outer);
log('  display (study mode): ' + t.display + '  -> hidden, so absent from the AX tree');

// switch to Mock round to make it live
await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const b = Array.from(sr.querySelectorAll('#modetog button')).find(x => x.getAttribute('data-m') === 'mock');
  if (b) b.click();
});
await page.waitForTimeout(600);
const vis = await page.evaluate(() => {
  const el = document.querySelector('deep-drill').shadowRoot.getElementById('timer');
  return { display: getComputedStyle(el).display, text: el.textContent };
});
log('\n  MOCK MODE -> timer display=' + vis.display + ' text="' + vis.text + '"');

// sample the timer's mutation rate over 4s: every tick inside aria-live=polite is an utterance
await page.evaluate(() => window.__watch());
await page.waitForTimeout(4200);
m = await page.evaluate(() => window.__stop());
const ticks = m.filter(x => /timer/.test(x.root));
log(`  announceable mutations in 4.2s: ${ticks.length}`);
log(`  sample: ${JSON.stringify(ticks.slice(0, 5).map(x => x.changed))}`);
log(`  -> a polite live region firing ~${(ticks.length / 4.2).toFixed(1)}x/sec. ARIA gives role=timer an`);
log('     IMPLICIT aria-live="off" precisely to prevent this; the explicit polite OVERRIDES that.');
log('     Net: during a 22-minute mock round the screen reader is asked to speak the clock ~1320');
log('     times, queued ahead of everything else the user is trying to hear.');

const timerAX = (await axTree(page)).find(n => roleOf(n) === 'timer');
log('\n  timer AX node: ' + JSON.stringify(timerAX ? {
  role: roleOf(timerAX), name: nameOf(timerAX), live: propOf(timerAX, 'live'),
  atomic: propOf(timerAX, 'atomic'), ignored: timerAX.ignored,
} : null));
await page.screenshot({ path: path.join(SHOTS, '03-mock-timer-live.png') });

/* ============================================================ */
hr('F. TOASTS / UNDO — announced?');
const toastInfo = await page.evaluate(() => {
  const t = document.querySelector('.toast, #toast, [class*="toast"]');
  return t ? { sel: t.tagName + '.' + t.className, live: t.getAttribute('aria-live'), role: t.getAttribute('role'), outer: t.outerHTML.slice(0, 140) } : null;
});
log('  toast element: ' + JSON.stringify(toastInfo));

console.log('\nPAGE ERRORS:', page.__errs.length, page.__errs.slice(0, 2));
await browser.close();
