// Independent discovery: shadow-host structure + topic registry, my own instrument.
const { chromium } = require('playwright');
const path = process.argv[2];
const url = 'file:///' + path.replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  // Topic registry
  const topics = await page.evaluate(() => {
    if (typeof TopicRegistry === 'undefined') return { err: 'no TopicRegistry' };
    const api = Object.keys(TopicRegistry);
    let ids = [];
    try { ids = TopicRegistry.ids ? TopicRegistry.ids() : []; } catch(e) {}
    const out = ids.map(id => {
      let t = null; try { t = TopicRegistry.get(id); } catch(e){}
      return { id, group: t && (t.group || t.groupId || t.room || null), title: t && t.title };
    });
    let boot = null; try { boot = TopicRegistry.bootId(); } catch(e){}
    return { api, boot, count: ids.length, topics: out };
  });
  console.log('=== TOPICS ===');
  console.log(JSON.stringify(topics, null, 1));

  // Navigate to walk pane, discover shadow roots
  await page.evaluate(() => { window.location.hash = '#walk'; });
  await page.waitForTimeout(1200);
  const shadows = await page.evaluate(() => {
    const hosts = [];
    const walk = (root) => {
      const els = root.querySelectorAll('*');
      for (const el of els) {
        if (el.shadowRoot) {
          const sample = [...el.shadowRoot.querySelectorAll('*')].slice(0, 400);
          const classes = new Set();
          sample.forEach(s => s.classList && s.classList.forEach(c => classes.add(c)));
          hosts.push({
            host: el.tagName.toLowerCase() + (el.id ? '#'+el.id : '') + (el.className && typeof el.className==='string' ? '.'+el.className.split(' ').join('.') : ''),
            count: el.shadowRoot.querySelectorAll('*').length,
            classes: [...classes].sort()
          });
          walk(el.shadowRoot);
        }
      }
    };
    walk(document);
    return hosts;
  });
  console.log('=== SHADOW HOSTS (on #walk) ===');
  shadows.forEach(h => {
    console.log('\nHOST', h.host, '(', h.count, 'els)');
    console.log('  classes:', h.classes.join(' '));
  });
  console.log('=== PAGE ERRORS ===', errs.slice(0,5));
  await browser.close();
})();
