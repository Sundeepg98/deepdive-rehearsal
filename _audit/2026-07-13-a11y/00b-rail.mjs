import { open } from './lib.mjs';
const { browser, page } = await open();

const r = await page.evaluate(() => {
  const out = { switchTab: typeof window.switchTab, railish: [] };
  // anything that looks like a pane switcher
  document.querySelectorAll('button,a,[role="tab"],[role="button"]').forEach(b => {
    const t = (b.textContent || '').trim();
    if (/walk|drill|white|board|system|trade|model|number|red|flag|opener|visual/i.test(t) && t.length < 40) {
      out.railish.push({
        tag: b.tagName, id: b.id, cls: (b.getAttribute('class') || '').slice(0, 40),
        txt: t.slice(0, 30), role: b.getAttribute('role'),
        aria: b.getAttribute('aria-label'), sel: b.getAttribute('aria-selected'),
        attrs: Array.from(b.attributes).map(a => a.name + '=' + a.value).filter(a => /data-/.test(a)).join(' '),
      });
    }
  });
  return out;
});
console.log('window.switchTab:', r.switchTab);
console.log('\n=== PANE-SWITCHER CANDIDATES (' + r.railish.length + ') ===');
r.railish.forEach(b => console.log(`  <${b.tag}> id=${b.id||'-'} role=${b.role||'-'} aria-selected=${b.sel||'-'} data=[${b.attrs}] :: "${b.txt}" | .${b.cls}`));
await browser.close();
