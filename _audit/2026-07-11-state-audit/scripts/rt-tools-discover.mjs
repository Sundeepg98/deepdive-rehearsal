import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();

for (const vp of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(800);

  const info = await p.evaluate(() => {
    const vis = el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), display: cs.display, visibility: cs.visibility, opacity: cs.opacity, transform: cs.transform.slice(0, 40), pointerEvents: cs.pointerEvents };
    };
    // every button with an id in the sidebar chrome
    const triggers = [...document.querySelectorAll('.mockcta button, .mockbar button, .topic-nav button, .cmp-reopen, .cmp-fold')].map(el => ({
      id: el.id || '(no id)', cls: el.className, text: (el.textContent || '').trim().slice(0, 60), ...vis(el)
    }));
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].map(el => ({
      id: el.id, cls: el.className, ariaModal: el.getAttribute('aria-modal'), ariaHidden: el.getAttribute('aria-hidden'), ...vis(el)
    }));
    const mockbar = document.querySelector('.mockbar');
    return {
      triggers, dialogs,
      mockbar: mockbar ? vis(mockbar) : null,
      toolsbd: document.getElementById('toolsbd') ? vis(document.getElementById('toolsbd')) : null,
      bodyOverflow: document.body.style.overflow,
      bodyClass: document.body.className,
      docScrollH: document.documentElement.scrollHeight,
      innerH: window.innerHeight,
      globals: ['SearchOverlay', 'IndexOverlay', 'NotesOverlay', 'CrossDrill', 'Router', 'Store', 'TopicRegistry', 'Bookmarks', 'PrintQA', 'TourGuide', 'Pomodoro', 'FocusMode', 'TextZoom', 'Density'].filter(g => typeof window[g] !== 'undefined'),
    };
  });

  console.log('\n########## ' + vp.name + ' (' + vp.width + 'x' + vp.height + ') ##########');
  console.log('bodyOverflow=' + JSON.stringify(info.bodyOverflow) + ' bodyClass=' + JSON.stringify(info.bodyClass));
  console.log('mockbar:', JSON.stringify(info.mockbar));
  console.log('toolsbd:', JSON.stringify(info.toolsbd));
  console.log('globals present:', info.globals.join(', '));
  console.log('\n--- TRIGGERS (' + info.triggers.length + ') ---');
  for (const t of info.triggers) console.log(`  #${t.id.padEnd(12)} [${String(t.w).padStart(4)}x${String(t.h).padStart(3)} @${t.x},${t.y}] disp=${t.display} vis=${t.visibility} op=${t.opacity} :: ${t.text}`);
  console.log('\n--- DIALOGS (' + info.dialogs.length + ') ---');
  for (const d of info.dialogs) console.log(`  #${(d.id || '?').padEnd(10)} modal=${d.ariaModal} hidden=${d.ariaHidden} [${d.w}x${d.h}] disp=${d.display} cls=${d.cls}`);
  if (errs.length) console.log('\n--- LOAD ERRORS ---\n' + errs.join('\n'));
  else console.log('\n--- no load-time console errors ---');
  await p.close();
}
await b.close();
