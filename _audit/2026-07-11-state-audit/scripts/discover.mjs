import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

const info = await p.evaluate(() => {
  const out = {};
  out.segButtons = [...document.querySelectorAll('.seg button')].map(bn => ({
    tab: bn.dataset.tab, hidden: bn.hasAttribute('hidden'), on: bn.classList.contains('on'), text: bn.textContent.trim().slice(0, 30)
  }));
  out.panes = [...document.querySelectorAll('.pane')].map(x => ({
    id: x.id, cls: x.className, tag: x.tagName,
    children: [...x.children].map(c => c.tagName.toLowerCase()).slice(0, 6)
  }));
  // custom elements w/ shadow roots
  out.shadowHosts = [...document.querySelectorAll('*')].filter(e => e.shadowRoot).map(e => ({
    tag: e.tagName.toLowerCase(), id: e.id, cls: e.className
  }));
  // topic nav
  const tn = document.getElementById('tnmenu');
  out.topicMenuItems = tn ? [...tn.querySelectorAll('*')].slice(0, 5).map(e => ({ tag: e.tagName, cls: e.className, ds: JSON.stringify(e.dataset), t: e.textContent.trim().slice(0, 40) })) : null;
  out.topicNavHidden = document.getElementById('topicnav')?.hasAttribute('hidden');
  // globals that may let us switch topic/pane programmatically
  out.globals = Object.keys(window).filter(k => /topic|pane|tab|app|deep|ddr|nav|state|store/i.test(k)).slice(0, 60);
  out.bodyClass = document.body.className;
  out.htmlTheme = document.documentElement.dataset.theme;
  // localStorage keys
  out.lsKeys = Object.keys(localStorage);
  // fixed bars
  const seg = document.querySelector('.sidebar .seg');
  const cta = document.querySelector('.sidebar .mockcta');
  const mb = document.querySelector('.sidebar .mockbar');
  const app = document.querySelector('.app');
  const gcs = e => e ? getComputedStyle(e) : null;
  const r = e => e ? e.getBoundingClientRect() : null;
  out.bars = {
    seg: { rect: r(seg), pos: gcs(seg)?.position, h: r(seg)?.height },
    mockcta: { rect: r(cta), pos: gcs(cta)?.position, h: r(cta)?.height },
    mockbar: { rect: r(mb), pos: gcs(mb)?.position, display: gcs(mb)?.display, transform: gcs(mb)?.transform, visibility: gcs(mb)?.visibility },
    appPad: { top: gcs(app)?.paddingTop, bottom: gcs(app)?.paddingBottom }
  };
  return out;
});
console.log(JSON.stringify(info, null, 2));
await b.close();
