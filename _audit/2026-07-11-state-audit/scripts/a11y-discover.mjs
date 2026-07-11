import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1500);

const info = await p.evaluate(() => {
  const out = {};
  out.bodyClasses = document.body.className;
  out.htmlDataset = { ...document.documentElement.dataset };
  // Top-level children of body
  out.bodyChildren = [...document.body.children].map(el => ({
    tag: el.tagName.toLowerCase(),
    id: el.id,
    cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 80) : '',
    hidden: el.hasAttribute('hidden'),
    role: el.getAttribute('role'),
    ariaModal: el.getAttribute('aria-modal'),
    display: getComputedStyle(el).display,
  }));
  // All elements that look like overlays/dialogs
  out.dialogish = [...document.querySelectorAll('[role="dialog"], dialog, [class*="overlay"], [class*="modal"], [id*="ov"], [class*="sheet"]')]
    .slice(0, 60)
    .map(el => ({
      tag: el.tagName.toLowerCase(), id: el.id,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60),
      role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
      labelledby: el.getAttribute('aria-labelledby'),
      modal: el.getAttribute('aria-modal'),
      hidden: el.hasAttribute('hidden'),
      display: getComputedStyle(el).display,
    }));
  // Panes
  out.panes = [...document.querySelectorAll('[data-pane], .pane, section[id]')].slice(0, 40).map(el => ({
    tag: el.tagName.toLowerCase(), id: el.id,
    cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60),
    hidden: el.hasAttribute('hidden'),
    display: getComputedStyle(el).display,
  }));
  // Tab buttons
  out.tabs = [...document.querySelectorAll('.seg button')].map(b => ({
    tab: b.dataset.tab, txt: b.textContent.trim().slice(0, 30), cls: b.className,
    role: b.getAttribute('role'), sel: b.getAttribute('aria-selected'),
  }));
  // Headings
  out.headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter(h => h.offsetParent !== null)
    .map(h => ({ lvl: h.tagName, txt: h.textContent.trim().slice(0, 50) }));
  // Landmarks
  out.landmarks = [...document.querySelectorAll('main,nav,header,footer,aside,[role="main"],[role="navigation"],[role="banner"],[role="region"],[role="complementary"]')]
    .map(el => ({ tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), label: el.getAttribute('aria-label'), id: el.id }));
  // aria-live
  out.liveRegions = [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"], output')]
    .map(el => ({ tag: el.tagName.toLowerCase(), id: el.id, cls: (typeof el.className === 'string' ? el.className : '').slice(0, 40), live: el.getAttribute('aria-live'), role: el.getAttribute('role') }));
  // Tools drawer / buttons in sidebar
  out.toolButtons = [...document.querySelectorAll('.mockbar button, .mockcta button')].map(b => ({ id: b.id, txt: b.textContent.trim().slice(0, 30) }));
  return out;
});

console.log(JSON.stringify(info, null, 2));
await b.close();
