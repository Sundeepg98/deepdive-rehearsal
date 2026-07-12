import { chromium } from 'playwright';

const TARGET = process.argv[2] || 'D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200)); });

await p.goto('file:///' + TARGET);
await p.waitForTimeout(2500);

const info = await p.evaluate(() => {
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.01; };
  const tabs = [...document.querySelectorAll('[data-tab]')].map(t => ({ tab: t.dataset.tab, txt: t.textContent.trim().slice(0, 24), vis: vis(t) }));
  const root = document.documentElement;
  return {
    title: document.title,
    url: location.hash,
    rootTheme: root.getAttribute('data-theme'),
    rootClass: root.className.slice(0, 120),
    bodyClass: document.body.className.slice(0, 120),
    tabs,
    // visible text nodes (the blank-page tripwire)
    visibleTextNodes: (() => {
      let n = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const t = w.currentNode; if (t.nodeValue.trim() && t.parentElement && vis(t.parentElement)) n++; }
      return n;
    })(),
    bodyText: document.body.innerText.trim().length,
    // topic pickers
    topicEls: document.querySelectorAll('[data-topic]').length,
    groupEls: document.querySelectorAll('[data-group]').length,
    firstTopics: [...document.querySelectorAll('[data-topic]')].slice(0, 5).map(e => e.getAttribute('data-topic')),
    // key chrome
    has: {
      themetog: !!document.querySelector('#themetog'),
      toolsfab: !!document.querySelector('#toolsfab'),
      idxopen: !!document.querySelector('#idxopen'),
      homeBtn: !!document.querySelector('#homeBtn'),
      sessov: !!document.querySelector('#sessov'),
    },
    // what is actually on screen
    topAreaText: document.body.innerText.trim().slice(0, 400),
    // the topic-accent claim
    topicAccent: getComputedStyle(root).getPropertyValue('--topic-accent').trim() || '(unset on :root)',
  };
});

console.log(JSON.stringify({ target: TARGET, errs: errs.slice(0, 8), info }, null, 2));
await b.close();
