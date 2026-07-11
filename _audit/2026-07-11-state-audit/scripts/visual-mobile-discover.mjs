import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

const info = await p.evaluate(() => {
  const out = {};
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), x: +r.x.toFixed(1), y: +r.y.toFixed(1),
      pos: cs.position, z: cs.zIndex, display: cs.display, bg: cs.backgroundColor,
      fs: cs.fontSize, lh: cs.lineHeight, pad: cs.padding, transform: cs.transform }; };

  out.viewport = { w: innerWidth, h: innerHeight };
  out.app = R(document.querySelector('.app'));
  out.appPad = (() => { const cs = getComputedStyle(document.querySelector('.app')); return { top: cs.paddingTop, bottom: cs.paddingBottom }; })();
  out.seg = R(document.querySelector('.sidebar .seg'));
  out.segScroll = (() => { const s = document.querySelector('.sidebar .seg'); return s ? { scrollW: s.scrollWidth, clientW: s.clientWidth } : null; })();
  out.sideId = R(document.querySelector('.side-id'));
  out.mockcta = R(document.querySelector('.sidebar .mockcta'));
  out.mockbtn = R(document.querySelector('.mockbtn'));
  out.toolsfab = R(document.querySelector('.tools-fab'));
  out.inttog = R(document.querySelector('.inttog'));
  out.mockbar = R(document.querySelector('.sidebar .mockbar'));
  out.stage = R(document.querySelector('.stage'));
  out.stageHead = R(document.querySelector('.stage-head'));
  out.mcomp = R(document.querySelector('.mcomp'));
  out.companion = R(document.querySelector('.companion'));
  out.cmpReopen = R(document.querySelector('.cmp-reopen'));
  out.topicnav = R(document.querySelector('.topic-nav'));

  // seg buttons
  out.segButtons = [...document.querySelectorAll('.sidebar .seg button')].filter(x => !x.hidden).map(x => {
    const r = x.getBoundingClientRect(); return { t: x.textContent.trim(), w: +r.width.toFixed(1), h: +r.height.toFixed(1), x: +r.x.toFixed(1) };
  });

  // pane ids
  out.panes = [...document.querySelectorAll('.pane')].map(x => ({ id: x.id, on: x.classList.contains('on') }));

  // all fixed elements
  out.fixed = [...document.querySelectorAll('body *')].filter(el => getComputedStyle(el).position === 'fixed')
    .map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0,2).join('.') : ''),
        h: +r.height.toFixed(1), y: +r.y.toFixed(1), z: cs.zIndex, vis: cs.visibility, disp: cs.display }; })
    .filter(f => f.disp !== 'none');

  // ids of buttons that open things
  out.buttons = [...document.querySelectorAll('button[id]')].map(x => x.id);
  out.overlays = [...document.querySelectorAll('[role="dialog"]')].map(x => x.id);
  out.docHeight = document.documentElement.scrollHeight;
  return out;
});
console.log(JSON.stringify(info, null, 2));
await b.close();
