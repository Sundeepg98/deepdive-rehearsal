/* TOOLS / OVERLAYS / INTERACTIONS error sweep.
   Opens every overlay, exercises drill grading, search, keyboard shortcuts,
   theme, topic switching, export/import, whiteboard, mock run, mixed fire. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/errsweep-tools-results.json';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });

let ctx = { step: '(boot)' };
const errors = [];
const requests = [];
const failed = [];
const log = [];

const push = (kind, msg, stack) => errors.push({ kind, msg, stack: (stack || '').split('\n').slice(0, 5).join(' | '), step: ctx.step });

p.on('console', m => { if (m.type() === 'error') push('console', m.text()); });
p.on('pageerror', e => push('pageerror', e.message, e.stack));
p.on('request', r => requests.push({ url: r.url().slice(0, 160), type: r.resourceType(), step: ctx.step }));
p.on('requestfailed', r => failed.push({ url: r.url().slice(0, 160), err: r.failure()?.errorText, step: ctx.step }));
p.on('dialog', async d => { log.push(`DIALOG[${ctx.step}] ${d.type()}: ${d.message().slice(0, 80)}`); await d.dismiss(); });

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1800);

const step = async (name, fn) => {
  ctx.step = name;
  const before = errors.length;
  try { await fn(); } catch (e) { push('script', 'STEP THREW: ' + e.message.split('\n')[0]); }
  await p.waitForTimeout(250);
  const n = errors.length - before;
  log.push(`${n ? 'ERR(' + n + ')' : 'ok  '}  ${name}`);
  console.log(`${n ? 'ERR(' + n + ')' : 'ok  '}  ${name}`);
};

const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(200); };
const shot = n => p.screenshot({ path: `${SHOTS}/${n}.png` });

// ---------- OVERLAYS: open each via its button, screenshot, close ----------
const overlayBtns = [
  ['mockopen', 'mock-run'],
  ['mixopen', 'mixed-fire'],
  ['cramopen', 'cram-sheet'],
  ['sessopen', 'session-progress'],
  ['keyopen', 'keyboard'],
  ['scopeopen', 'scope'],
  ['planopen', 'game-plan'],
  ['idxopen', 'topic-index'],
  ['searchopen', 'search'],
  ['notesopen', 'notes'],
];

for (const [id, name] of overlayBtns) {
  await step(`open overlay: ${name} (#${id})`, async () => {
    // tools may live behind the Tools FAB on some widths; try direct click first
    const el = p.locator('#' + id);
    await el.click({ timeout: 5000, force: true });
    await p.waitForTimeout(700);
    await shot('overlay-' + name);
  });
  await step(`close overlay: ${name}`, esc);
}

// printqa opens a print view -- exercise but expect no window.print in headless
await step('print Q&A (#printqa)', async () => {
  await p.locator('#printqa').click({ force: true, timeout: 5000 });
  await p.waitForTimeout(600);
});
await esc();

// ---------- DRILL: grading path ----------
await step('drill: switch pane', async () => {
  await p.locator('[data-tab="drill"]').first().click();
  await p.waitForTimeout(500);
  await shot('drill-initial');
});
await step('drill: grade via keyboard 1/2/3 + space (x6)', async () => {
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press(['1', '2', '3'][i % 3]);
    await p.waitForTimeout(180);
    await p.keyboard.press(' ');
    await p.waitForTimeout(180);
  }
  await shot('drill-after-grading');
});
await step('drill: click the in-shadow grade buttons', async () => {
  const r = await p.evaluate(() => {
    const dd = document.querySelector('#drill deep-drill');
    if (!dd || !dd.shadowRoot) return 'no drill shadow';
    const ids = ['jm', 'js', 'jg', 'adv'];
    const found = ids.filter(i => dd.shadowRoot.getElementById(i));
    ids.forEach(i => { const b = dd.shadowRoot.getElementById(i); if (b) b.click(); });
    return 'clicked: ' + found.join(',');
  });
  log.push('   drill buttons -> ' + r);
});

// ---------- WHITEBOARD ----------
await step('whiteboard: open + interact', async () => {
  await p.locator('[data-tab="wb"]').first().click();
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const wb = document.querySelector('#wb deep-whiteboard');
    if (!wb || !wb.shadowRoot) return 'no wb shadow';
    const btns = [...wb.shadowRoot.querySelectorAll('button')];
    btns.slice(0, 12).forEach(b => b.click());
    return 'clicked ' + Math.min(btns.length, 12) + '/' + btns.length + ' wb buttons';
  });
  log.push('   wb -> ' + r);
  await p.waitForTimeout(400);
  await shot('whiteboard-after-clicks');
});

// ---------- SEARCH ----------
await step('search: open with "/" and type', async () => {
  await p.keyboard.press('/');
  await p.waitForTimeout(500);
  await p.keyboard.type('cache', { delay: 40 });
  await p.waitForTimeout(600);
  await shot('search-typed');
});
await step('search: arrow + enter (jump to result)', async () => {
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(150);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(700);
  await shot('search-jumped');
});
await step('search: reopen + empty query + escape', async () => {
  await p.keyboard.press('/');
  await p.waitForTimeout(400);
  await p.keyboard.type('zzzzqqqnomatch', { delay: 20 });
  await p.waitForTimeout(500);
  await shot('search-nomatch');
  await esc();
});

// ---------- KEYBOARD SHORTCUTS ----------
await step('keys: pane jumps q w e r t y u i o v', async () => {
  for (const k of ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'v']) {
    await p.keyboard.press(k);
    await p.waitForTimeout(220);
  }
});
await step('keys: d (density cycle) x3', async () => {
  for (let i = 0; i < 3; i++) { await p.keyboard.press('d'); await p.waitForTimeout(200); }
});
await step('keys: [ and ] (topic step) x4', async () => {
  for (const k of [']', ']', '[', '[']) { await p.keyboard.press(k); await p.waitForTimeout(400); }
});
await step('keys: ? (keyboard overlay)', async () => {
  await p.keyboard.press('?');
  await p.waitForTimeout(400);
  await esc();
});
await step('keys: \\ (index overlay)', async () => {
  await p.keyboard.press('\\');
  await p.waitForTimeout(500);
  await esc();
});
await step('keys: g (guided tour) + advance 5 + escape', async () => {
  await p.keyboard.press('g');
  await p.waitForTimeout(700);
  await shot('tour-started');
  for (let i = 0; i < 5; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
  await esc();
  await esc();
});
await step('keys: walk arrows L/R x6', async () => {
  await p.locator('[data-tab="walk"]').first().click();
  await p.waitForTimeout(300);
  for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(160); }
  for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(160); }
});

// ---------- THEME ----------
await step('theme toggle x3', async () => {
  for (let i = 0; i < 3; i++) {
    await p.locator('#themetog').click({ force: true });
    await p.waitForTimeout(350);
  }
  await shot('theme-toggled');
});

// ---------- TOPIC NAV UI ----------
await step('topic nav: next/prev buttons', async () => {
  for (let i = 0; i < 3; i++) { await p.locator('#tnnext').click({ force: true }); await p.waitForTimeout(450); }
  for (let i = 0; i < 2; i++) { await p.locator('#tnprev').click({ force: true }); await p.waitForTimeout(450); }
});
await step('topic nav: dropdown trigger', async () => {
  await p.locator('#tntrigger').click({ force: true });
  await p.waitForTimeout(500);
  await shot('topicnav-dropdown');
  await esc();
});
await step('home button (topic index)', async () => {
  await p.locator('#homeBtn').click({ force: true });
  await p.waitForTimeout(600);
  await esc();
});
await step('star / bookmark topic', async () => {
  await p.locator('#starbtn').click({ force: true });
  await p.waitForTimeout(300);
  await p.locator('#starbtn').click({ force: true });
  await p.waitForTimeout(300);
});
await step('copy link', async () => {
  await p.locator('#copylink').click({ force: true });
  await p.waitForTimeout(400);
});
await step('focus mode toggle x2', async () => {
  await p.locator('#_focus-toggle').click({ force: true });
  await p.waitForTimeout(400);
  await p.locator('#_focus-toggle').click({ force: true });
  await p.waitForTimeout(400);
});
await step('interviewer-cuts-in toggle (#inttog) x2', async () => {
  await p.locator('#inttog').click({ force: true });
  await p.waitForTimeout(400);
  await p.locator('#inttog').click({ force: true });
  await p.waitForTimeout(400);
});

// ---------- MOCK RUN: drive it ----------
await step('mock run: open + advance 10 beats', async () => {
  await p.locator('#mockopen').click({ force: true });
  await p.waitForTimeout(800);
  await shot('mockrun-open');
  for (let i = 0; i < 10; i++) {
    const done = await p.evaluate(() => {
      const mr = document.querySelector('deep-mock-run');
      const sr = mr && mr.shadowRoot;
      if (!sr) return 'no shadow';
      const btns = [...sr.querySelectorAll('button')].filter(b => b.offsetParent !== null);
      const next = btns.find(b => /next|advance|continue|start|begin|→|›/i.test(b.textContent || ''));
      if (next) { next.click(); return 'clicked:' + next.textContent.trim().slice(0, 20); }
      if (btns[0]) { btns[0].click(); return 'clicked first:' + btns[0].textContent.trim().slice(0, 20); }
      return 'no buttons';
    });
    await p.waitForTimeout(280);
    if (i === 0) log.push('   mock -> ' + done);
  }
  await shot('mockrun-advanced');
});
await step('mock run: close', esc);

// ---------- MIXED FIRE ----------
await step('mixed fire: open + answer 8', async () => {
  await p.locator('#mixopen').click({ force: true });
  await p.waitForTimeout(800);
  await shot('mixedfire-open');
  for (let i = 0; i < 8; i++) {
    await p.evaluate(() => {
      const mf = document.querySelector('deep-mixed-fire');
      const sr = mf && mf.shadowRoot;
      if (!sr) return;
      const btns = [...sr.querySelectorAll('button')].filter(b => b.offsetParent !== null && !/close|×/i.test(b.textContent));
      if (btns.length) btns[Math.floor(Math.random() * btns.length)].click();
    });
    await p.waitForTimeout(280);
  }
  await shot('mixedfire-advanced');
});
await step('mixed fire: close', esc);

// ---------- SESSION PROGRESS (rich overlay) ----------
await step('session progress: open + click through its controls', async () => {
  await p.locator('#sessopen').click({ force: true });
  await p.waitForTimeout(900);
  await shot('session-open');
  const r = await p.evaluate(() => {
    const s = document.querySelector('deep-session');
    const sr = s && s.shadowRoot;
    if (!sr) return 'no shadow';
    const btns = [...sr.querySelectorAll('button')].filter(b => b.offsetParent !== null && !/close|×/i.test(b.textContent || ''));
    btns.slice(0, 10).forEach(b => b.click());
    return 'clicked ' + Math.min(btns.length, 10) + '/' + btns.length;
  });
  log.push('   session -> ' + r);
  await p.waitForTimeout(500);
  await shot('session-clicked');
});
await step('session progress: close', esc);

// ---------- CRAM ----------
await step('cram sheet: open + interact', async () => {
  await p.locator('#cramopen').click({ force: true });
  await p.waitForTimeout(800);
  await shot('cram-open');
  await p.evaluate(() => {
    const c = document.querySelector('deep-cram');
    const sr = c && c.shadowRoot;
    if (!sr) return;
    [...sr.querySelectorAll('button')].filter(b => !/close|×|print/i.test(b.textContent || '')).slice(0, 8).forEach(b => b.click());
  });
  await p.waitForTimeout(400);
});
await step('cram sheet: close', esc);

// ---------- EXPORT / IMPORT ----------
await step('export backup (download)', async () => {
  await p.locator('#idxopen').click({ force: true });
  await p.waitForTimeout(700);
  const has = await p.locator('[data-io="export"]').count();
  log.push('   export btn count: ' + has);
  if (has) {
    const dl = p.waitForEvent('download', { timeout: 6000 }).catch(() => null);
    await p.locator('[data-io="export"]').first().click({ force: true });
    const d = await dl;
    log.push('   download: ' + (d ? d.suggestedFilename() : 'NONE'));
    if (d) {
      const path = `${SHOTS}/../../scripts/errsweep-backup.json`;
      await d.saveAs(path);
      log.push('   saved to ' + path);
    }
  }
  await shot('index-export');
});
await step('import backup (round-trip the exported file)', async () => {
  const fp = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/errsweep-backup.json';
  const cnt = await p.locator('[data-io="import"]').count();
  log.push('   import input count: ' + cnt);
  if (cnt) {
    // dialog handler dismisses the confirm -> no reload, we just want the parse path
    await p.locator('[data-io="import"]').first().setInputFiles(fp);
    await p.waitForTimeout(900);
  }
});
await step('import: malformed file -> alert path', async () => {
  const bad = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/errsweep-bad.json';
  const cnt = await p.locator('[data-io="import"]').count();
  if (cnt) {
    await p.locator('[data-io="import"]').first().setInputFiles(bad);
    await p.waitForTimeout(800);
  }
});
await esc();

// ---------- SCROLL / MISC ----------
await step('scroll to top button', async () => {
  await p.evaluate(() => window.scrollTo(0, 2000));
  await p.waitForTimeout(400);
  const c = await p.locator('#scrolltop').count();
  if (c) await p.locator('#scrolltop').click({ force: true });
  await p.waitForTimeout(400);
});
await step('tools FAB', async () => {
  await p.locator('#toolsfab').click({ force: true });
  await p.waitForTimeout(500);
  await shot('toolsfab');
  await esc();
});

// ---------- HASH / DEEP LINK ----------
await step('deep link: #caching/num then #saga/wb then back/forward', async () => {
  await p.evaluate(() => { location.hash = '#caching/num'; });
  await p.waitForTimeout(700);
  await p.evaluate(() => { location.hash = '#saga/wb'; });
  await p.waitForTimeout(700);
  await p.goBack(); await p.waitForTimeout(600);
  await p.goForward(); await p.waitForTimeout(600);
});
await step('deep link: garbage hash #not-a-topic/not-a-view', async () => {
  await p.evaluate(() => { location.hash = '#not-a-topic/not-a-view'; });
  await p.waitForTimeout(700);
});

await p.waitForTimeout(1200);

const res = { errorCount: errors.length, errors, requestCount: requests.length, requests, failed, log };
writeFileSync(OUT, JSON.stringify(res, null, 1));

console.log('\n================ SUMMARY ================');
console.log('ERRORS:', errors.length);
const agg = {};
for (const e of errors) { const k = e.kind + ' :: ' + e.msg.slice(0, 150); (agg[k] ||= []).push(e.step); }
for (const [k, where] of Object.entries(agg)) {
  console.log(`\n[${where.length}x] ${k}`);
  console.log('   steps:', [...new Set(where)].slice(0, 6).join(' | '));
  const ex = errors.find(e => (e.kind + ' :: ' + e.msg.slice(0, 150)) === k);
  if (ex && ex.stack) console.log('   stack:', ex.stack.slice(0, 240));
}
console.log('\nREQUESTS:', requests.length);
console.log(JSON.stringify(requests.map(r => `${r.type} ${r.url}`), null, 1));
console.log('FAILED:', failed.length, JSON.stringify(failed, null, 1));
console.log('\n--- LOG ---');
console.log(log.join('\n'));

await b.close();
