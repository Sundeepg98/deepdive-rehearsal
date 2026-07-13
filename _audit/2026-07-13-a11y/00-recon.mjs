import { open, allElements, axTree, roleOf, nameOf } from './lib.mjs';

const { browser, page } = await open();

console.log('TITLE:', JSON.stringify(await page.title()));
console.log('LANG:', await page.evaluate(() => document.documentElement.lang || '(none)'));
console.log('GROUP:', await page.evaluate(() => document.documentElement.getAttribute('data-group')));
console.log('PAGE ERRORS:', page.__errs.length, page.__errs.slice(0, 3));

// headings in light DOM + shadow
const heads = await page.evaluate(() => {
  const out = [];
  const walk = (root) => {
    root.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').forEach(h => {
      const r = h.getBoundingClientRect();
      out.push({ tag: h.tagName, lvl: h.getAttribute('aria-level') || h.tagName[1], txt: (h.textContent || '').trim().slice(0, 55), vis: !!(r.width || r.height) });
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) walk(el.shadowRoot); });
  };
  walk(document);
  return out;
});
console.log('\n=== HEADINGS (' + heads.length + ') ===');
heads.forEach(h => console.log(`  ${h.tag} lvl=${h.lvl} vis=${h.vis} :: ${h.txt}`));

// panes + tabs
const nav = await page.evaluate(() => {
  const out = { panes: [], tabs: [], topics: 0 };
  document.querySelectorAll('.pane').forEach(p => out.panes.push({ id: p.id, vis: !!(p.getBoundingClientRect().width || p.getBoundingClientRect().height) }));
  document.querySelectorAll('[data-p],[data-pane],.tab,nav button').forEach(b => out.tabs.push({ sel: b.tagName + (b.id ? '#' + b.id : '') + '.' + b.className, dp: b.getAttribute('data-p') || b.getAttribute('data-pane'), txt: (b.textContent || '').trim().slice(0, 24) }));
  out.topics = document.querySelectorAll('[data-topic]').length;
  return out;
});
console.log('\n=== PANES ===', JSON.stringify(nav.panes));
console.log('=== TABS (first 14) ===');
nav.tabs.slice(0, 14).forEach(t => console.log('  ', t.dp, '|', t.txt, '|', t.sel.slice(0, 60)));

// shadow hosts
const hosts = await page.evaluate(() => {
  const h = [];
  document.querySelectorAll('*').forEach(el => { if (el.shadowRoot) h.push(el.tagName.toLowerCase()); });
  return h;
});
console.log('\n=== SHADOW HOSTS ===', hosts.join(', '));

// landmarks from AX tree
const nodes = await axTree(page);
const lm = nodes.filter(n => !n.ignored && ['main', 'navigation', 'banner', 'contentinfo', 'region', 'complementary', 'search', 'form'].includes(roleOf(n)));
console.log('\n=== AX LANDMARKS (' + lm.length + ') ===');
lm.forEach(n => console.log(`  role=${roleOf(n)} name=${JSON.stringify(nameOf(n) || '')}`));

console.log('\n=== AX total nodes:', nodes.length, ' ignored:', nodes.filter(n => n.ignored).length);

// does the drill pane exist / is scoreboard reachable?
const drill = await page.evaluate(() => {
  const dd = document.querySelector('deep-drill');
  if (!dd) return { present: false };
  const sr = dd.shadowRoot;
  if (!sr) return { present: true, shadow: false };
  const score = sr.querySelector('.score');
  return {
    present: true, shadow: true,
    scoreHTML: score ? score.outerHTML.slice(0, 400) : '(no .score)',
    sGot: sr.querySelector('#sGot')?.textContent,
    sShk: sr.querySelector('#sShk')?.textContent,
    sLeft: sr.querySelector('#sLeft')?.textContent,
  };
});
console.log('\n=== DRILL ===');
console.log(JSON.stringify(drill, null, 2));

await browser.close();
