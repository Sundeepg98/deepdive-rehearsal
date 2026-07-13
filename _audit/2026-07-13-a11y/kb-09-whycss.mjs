/* kb-09: my injected pin CSS has no effect. Print it, and read the computed outline WHILE focused
   with the pin active. One of these is true and I need to know which:
     - the <style> never landed
     - a declaration is malformed and the parser dropped it
     - the cascade beats me (unlikely: id + !important) */
import { open, inject } from './kb-lib.mjs';

const PIN = ['outline-style', 'outline-width', 'outline-color', 'outline-offset', 'box-shadow',
  'background-color', 'background-image', 'border-color', 'border-width', 'color', 'transform', 'opacity', 'filter'];
const SEL = '#searchopen';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
await page.waitForTimeout(250);

const css = await page.evaluate(([sel, props]) => {
  const e = document.querySelector(sel), s = getComputedStyle(e);
  return `${sel}:focus,${sel}:focus-visible{${props.map(p => `${p}:${s.getPropertyValue(p)}!important`).join(';')}}`;
}, [SEL, PIN]);
console.log('--- GENERATED CSS ---\n' + css + '\n');

await page.addStyleTag({ content: css });

/* did the rule land, and did the parser keep its declarations? */
const audit = await page.evaluate(() => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) {
      if (r.selectorText && r.selectorText.includes('searchopen')) {
        out.push({ sel: r.selectorText, cssText: r.cssText.slice(0, 300), n: r.style.length, outlineStyle: r.style.getPropertyValue('outline-style'), prio: r.style.getPropertyPriority('outline-style') });
      }
    }
  }
  return out;
});
console.log('--- RULES MATCHING #searchopen NOW IN THE DOCUMENT ---');
audit.forEach(r => console.log(`  ${r.sel}\n     decls=${r.n} outline-style="${r.outlineStyle}" priority="${r.prio}"\n     ${r.cssText}\n`));

const live = await page.evaluate(() => {
  const e = document.querySelector('#searchopen');
  e.focus();
  const s = getComputedStyle(e);
  return { focusVisible: e.matches(':focus-visible'), outline: s.outline, outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow.slice(0, 60) };
});
console.log('--- COMPUTED WHILE FOCUSED, WITH PIN ACTIVE ---');
console.log(' ', JSON.stringify(live, null, 1));
console.log(live.outlineStyle === 'none' ? '\n=> pin WORKS on the computed style (so a nonzero pixel signal must come from elsewhere)'
  : '\n=> pin LOST the cascade — the outline still computes as ' + live.outlineStyle);

await browser.close();
