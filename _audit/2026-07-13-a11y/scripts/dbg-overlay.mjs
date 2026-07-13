import { launch, phone, installDeep, PHONES } from './lib.mjs';
const b = await launch();
const p = await phone(b, PHONES.p390);
await installDeep(p);
const d = await p.evaluate(() => {
  const ov = document.querySelector('#_index-overlay');
  const inp = document.querySelector('#_index-overlay .ix-filter');
  const cs = getComputedStyle(ov);
  const r = ov.getBoundingClientRect();
  const ri = inp.getBoundingClientRect();
  const hitAtInput = window.__deepFromPoint(ri.left + ri.width / 2, ri.top + ri.height / 2);
  return {
    overlay: {
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      pointerEvents: cs.pointerEvents, transform: cs.transform, zIndex: cs.zIndex,
      position: cs.position,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      classList: [...ov.classList], hidden: ov.hidden, ariaHidden: ov.getAttribute('aria-hidden'),
      checkVisibility: ov.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true }),
    },
    filterInput: {
      rect: { x: Math.round(ri.x), y: Math.round(ri.y), w: Math.round(ri.width), h: Math.round(ri.height) },
      ownOpacity: getComputedStyle(inp).opacity,
      checkVisibility: inp.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true }),
      elementFromPointReturns: hitAtInput ? hitAtInput.tagName + '.' + (hitAtInput.className || '') : null,
    },
  };
});
console.log(JSON.stringify(d, null, 1));
await b.close();
