import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2500);

const out = await p.evaluate(() => {
  const r = {};
  // shell layout
  const rect = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), sh: e.scrollHeight, ch: e.clientHeight }; };
  r.sidebar = rect('.sidebar');
  r.stage = rect('.stage');
  r.companion = rect('.companion') || rect('#companion') || rect('aside');

  // what overlays exist (id + open state)
  r.overlays = [...document.querySelectorAll('[role="dialog"]')].map(e => ({
    id: e.id, cls: e.className, hidden: e.getAttribute('aria-hidden'), open: e.classList.contains('open')
  }));

  // panes (custom elements)
  r.panes = [...document.querySelectorAll('[id]')].filter(e => e.tagName.startsWith('DEEP-')).map(e => e.tagName);
  r.deepEls = [...document.querySelectorAll('*')].filter(e => e.tagName.startsWith('DEEP-')).map(e => ({ tag: e.tagName, id: e.id, parentId: e.parentElement?.id, hidden: e.hasAttribute('hidden') || e.closest('[hidden]') != null }));

  // nav buttons (view switcher)
  r.nav = [...document.querySelectorAll('.nav button, .seg button')].map(e => ({
    cls: e.className, id: e.id, txt: (e.textContent || '').trim().slice(0, 40),
    dv: e.getAttribute('data-view') || e.dataset.view || null,
    attrs: [...e.attributes].map(a => a.name + '=' + a.value).join(' ').slice(0, 120)
  }));

  // companion ids
  r.cmp = ['cmpView', 'cmpNote', 'cmpMove', 'cmpTopic', 'mCmpView'].map(id => {
    const e = document.getElementById(id);
    return { id, exists: !!e, txt: e ? (e.textContent || '').trim().slice(0, 60) : null };
  });
  // stage head
  const sh = document.querySelector('.stage-head');
  r.stageHead = sh ? { html: sh.innerHTML.slice(0, 300) } : null;
  r.shName = document.querySelector('.sh-name')?.textContent?.trim() || null;

  // topic nav
  const tn = document.getElementById('tncurrent');
  r.tncurrent = tn ? { cw: tn.clientWidth, sw: tn.scrollWidth, txt: tn.textContent.trim(), cs: (({ display, flexDirection, alignItems }) => ({ display, flexDirection, alignItems }))(getComputedStyle(tn.closest('.tn-trigger') || tn)) } : null;

  // crambtn count
  r.crambtns = [...document.querySelectorAll('.crambtn')].map(e => ({ id: e.id, tog: e.classList.contains('cram-tog') }));
  return r;
});
console.log(JSON.stringify(out, null, 1));
await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-desktop/00-boot.png' });
await b.close();
