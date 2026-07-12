import { chromium } from 'playwright';
const BUILDS = {
  BEFORE: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html',
  AFTER: 'D:/claude-workspace/deepdive-rehearsal/dist/index.html',
};
const br = await chromium.launch();
for (const [build, path] of Object.entries(BUILDS)) {
  const p = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto('file:///' + path);
  await p.waitForTimeout(2000);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.click('#sessopen'); await p.waitForTimeout(1200);

  const r = await p.evaluate(() => {
    const ov = document.querySelector('#sessov');
    const card = ov ? ov.querySelector('.ov-card,.card,div') : null;
    // find the two bottom actions by text
    const all = [...document.querySelectorAll('button,a')];
    const find = re => all.find(e => re.test((e.innerText || '').trim()));
    const pdf = find(/Save this session as a PDF/i);
    const clear = find(/Clear this session/i);
    const box = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), inViewport: b.bottom <= window.innerHeight && b.top >= 0 }; };
    // the scrolling container
    const sc = ov ? [...ov.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 4) : null;
    return {
      vh: window.innerHeight,
      pdfBtn: box(pdf),
      clearBtn: box(clear),
      scroller: sc ? { cls: sc.className.toString().slice(0, 40), clientH: sc.clientHeight, scrollH: sc.scrollHeight, hidden: sc.scrollHeight - sc.clientHeight } : null,
    };
  });
  console.log(build, JSON.stringify(r, null, 1));
  await p.close();
}
await br.close();
