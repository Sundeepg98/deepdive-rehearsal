/* a11y-proof.mjs -- definitive evidence: a11y tree, incomplete-contrast reasons,
   visual-heading metrics, drill reveal focus, keybody overflow, real toast. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const SHOTS = path.join(OUT, 'shots', 'a11y');
const AXE = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');

const b = await chromium.launch();
const boot = async (p) => {
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1300);
  await p.evaluate(() => window.IndexOverlay.close());
  await p.waitForTimeout(600);
};

/* ===== 1. ACCESSIBILITY TREE for the section nav (what a screen reader actually gets) ===== */
console.log('======== 1. A11Y TREE of the 9-section nav (.seg) ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  await p.evaluate(() => window.switchTab('num'));   // put us on "Numbers"
  await p.waitForTimeout(600);
  console.log('Current visual view = Numbers (.on class is on the Numbers button).');
  console.log('What AT sees for the section group (Playwright ariaSnapshot):');
  const snap = await p.locator('.seg').ariaSnapshot();
  console.log(snap);
  // definitive: CDP full AX tree for the seg buttons
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const segNodes = nodes.filter(n => n.name && /Walkthrough|Numbers MECHANICS|Numbers|Probe Drill/.test(n.name.value || '') && n.role && n.role.value === 'button');
  console.log('\nCDP AX nodes for the section buttons (raw properties a screen reader consumes):');
  segNodes.slice(0, 4).forEach(n => {
    const props = (n.properties || []).map(pr => `${pr.name}=${JSON.stringify(pr.value.value)}`).join(' ');
    console.log(`  role=${n.role.value} name="${(n.name.value || '').replace(/\s+/g, ' ')}" props: ${props || '(none)'}`);
  });
  const hasState = JSON.stringify(segNodes).match(/"selected"|"pressed"|"current"/i);
  console.log('\n>>> any selected/pressed/current state in the a11y tree? ' + (hasState ? 'YES' : 'NO -- the active view is INVISIBLE to AT'));

  // contrast: the topic-nav DOES emit aria-current -- show the difference
  const topicNavAria = await p.evaluate(() => {
    const t = document.getElementById('tntrigger'); if (t) t.click();
    return null;
  });
  await p.waitForTimeout(400);
  const menuAria = await p.evaluate(() => {
    const items = [...document.querySelectorAll('#tnmenu [data-topic]')].slice(0, 3);
    return items.map(i => ({ topic: i.dataset.topic, ariaCurrent: i.getAttribute('aria-current') }));
  });
  console.log('For comparison, the TOPIC menu (topic-nav.js:29) DOES set aria-current:', JSON.stringify(menuAria));
  await p.close();
}

/* ===== 2. WHY are 114 nodes "incomplete" for color-contrast? ===== */
console.log('\n======== 2. axe color-contrast INCOMPLETE -- the reasons ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  await p.addScriptTag({ content: AXE });
  const inc = await p.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
    const reasons = {};
    r.incomplete.forEach(v => v.nodes.forEach(n => {
      const msg = (n.any || []).map(a => a.message).join(' | ') || 'unknown';
      reasons[msg] = (reasons[msg] || 0) + 1;
    }));
    const passCount = r.passes.reduce((a, v) => a + v.nodes.length, 0);
    const incCount = r.incomplete.reduce((a, v) => a + v.nodes.length, 0);
    const violCount = r.violations.reduce((a, v) => a + v.nodes.length, 0);
    const sampleTargets = r.incomplete.flatMap(v => v.nodes.slice(0, 25).map(n => n.target.join(' ')));
    return { reasons, passCount, incCount, violCount, sampleTargets };
  });
  console.log(`color-contrast rule on default view: PASS=${inc.passCount} nodes, INCOMPLETE=${inc.incCount} nodes, VIOLATIONS=${inc.violCount} nodes`);
  console.log(`>>> axe could only decide ${inc.passCount}/${inc.passCount + inc.incCount} (${(100 * inc.passCount / (inc.passCount + inc.incCount)).toFixed(0)}%) of text nodes.`);
  console.log('Reasons for "incomplete":');
  Object.entries(inc.reasons).sort((a, b) => b[1] - a[1]).forEach(([m, n]) => console.log(`  ${String(n).padStart(4)}x  ${m.slice(0, 150)}`));
  console.log('Sample undecidable targets:', JSON.stringify(inc.sampleTargets.slice(0, 15)));
  await p.close();
}

/* ===== 3. GROUND-TRUTH contrast by pixel-sampling the rendered screenshot ===== */
console.log('\n======== 3. GROUND-TRUTH contrast (pixel sampling, both themes) ========');
{
  // measure via canvas: rasterize element text color vs the actual painted backdrop pixel
  for (const theme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(URL, { waitUntil: 'load' });
    await p.evaluate(t => { localStorage.clear(); localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); }, theme);
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1300);
    await p.evaluate(() => window.IndexOverlay.close());
    await p.waitForTimeout(800);

    const rows = await p.evaluate(() => {
      const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return ((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)); };
      const parse = s => { const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
      // find the first ancestor with a fully opaque, non-gradient background
      const backdrop = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const c = getComputedStyle(n);
          const bg = parse(c.backgroundColor);
          const alpha = (c.backgroundColor.match(/rgba?\([^)]*,\s*([\d.]+)\)/) || [, '1'])[1];
          if (bg && parseFloat(alpha) >= 0.99 && c.backgroundImage === 'none') return { rgb: bg, from: n.tagName + '.' + (typeof n.className === 'string' ? n.className.split(' ')[0] : '') };
          if (bg && parseFloat(alpha) >= 0.99 && c.backgroundImage !== 'none') return { rgb: bg, from: n.tagName + '(+gradient)', gradient: true };
          n = n.parentElement;
        }
        const c = getComputedStyle(document.body);
        return { rgb: parse(c.backgroundColor) || [255, 255, 255], from: 'body' };
      };
      const SELS = ['.badge', '.locator', 'h1', '.sub', '.kbd-hint', '.seg button.on span:not(.n)', '.seg button:not(.on) span:not(.n)', '.seg button .n', '.cmp-eyebrow', '.cmp-h', '.cmp-note', '.cmp-thesis', '.mb-d', '.mb-t', '.sh-kick', '.sh-name', '.mb-sec', '.inttog-lbl'];
      return SELS.map(s => {
        const el = document.querySelector(s);
        if (!el || el.offsetParent === null) return null;
        const c = getComputedStyle(el);
        const fg = parse(c.color); if (!fg) return null;
        const bd = backdrop(el);
        const size = parseFloat(c.fontSize), weight = parseInt(c.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const r = ratio(fg, bd.rgb);
        return { sel: s, fg: c.color, bg: 'rgb(' + bd.rgb.join(',') + ')', bgFrom: bd.from, gradient: !!bd.gradient, size: size.toFixed(1), weight, large, ratio: +r.toFixed(2), min: large ? 3 : 4.5, pass: r >= (large ? 3 : 4.5) };
      }).filter(Boolean);
    });
    console.log(`\n  --- ${theme.toUpperCase()} theme ---`);
    rows.forEach(r => console.log(`  ${r.pass ? 'PASS' : '**FAIL**'} ${r.ratio.toFixed(2).padStart(5)}:1 (min ${r.min})  ${r.sel.padEnd(32)} ${r.size}px/${r.weight}  fg=${r.fg} bg=${r.bg} [${r.bgFrom}]${r.gradient ? ' GRADIENT-APPROX' : ''}`));
    const fails = rows.filter(r => !r.pass);
    console.log(`  ${theme}: ${fails.length} FAIL / ${rows.length} sampled`);
    await p.screenshot({ path: path.join(SHOTS, `90-contrast-${theme}.png`) });
    await p.close();
  }
}

/* ===== 4. VISUAL headings that are not real headings ===== */
console.log('\n======== 4. Visual headings vs semantic headings ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  await p.click('#cramopen'); await p.waitForTimeout(900);
  const metrics = await p.evaluate(() => {
    const body = getComputedStyle(document.querySelector('.cmp-note') || document.body);
    const bodySize = parseFloat(body.fontSize);
    const probe = (root, sels) => sels.map(s => {
      const el = root.querySelector(s);
      if (!el) return null;
      const c = getComputedStyle(el);
      return { sel: s, tag: el.tagName, role: el.getAttribute('role'), fontSize: c.fontSize, fontWeight: c.fontWeight, textTransform: c.textTransform, letterSpacing: c.letterSpacing, txt: (el.textContent || '').trim().slice(0, 34) };
    }).filter(Boolean);
    const doc = probe(document, ['.sh-name', '.cmp-h', '.cmp-eyebrow', '.mb-sec', '.cmp-topic']);
    const cramShadow = document.querySelector('deep-cram');
    const cram = cramShadow && cramShadow.shadowRoot ? probe(cramShadow.shadowRoot, ['.cs-st', '.cs-one-l']) : [];
    return { bodySize, doc, cram };
  });
  console.log(`  Body-text baseline (.cmp-note): ${metrics.bodySize}px`);
  console.log('  Elements that LOOK like headings but carry no heading semantics:');
  [...metrics.doc, ...metrics.cram].forEach(m => console.log(`    <${m.tag}> role=${m.role}  ${m.sel.padEnd(14)} ${m.fontSize}/${m.fontWeight} transform=${m.textTransform}  "${m.txt}"`));
  const allH = await p.evaluate(() => {
    const acc = [];
    const walk = (n) => { n.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]').forEach(h => acc.push(h.tagName + (h.offsetParent ? '' : '(hidden)') + ':' + h.textContent.trim().slice(0, 25))); n.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); }); };
    walk(document);
    return acc;
  });
  console.log(`  ALL headings in the ENTIRE document (incl. every shadow root, cram overlay open): ${JSON.stringify(allH)}`);
  await p.screenshot({ path: path.join(SHOTS, '91-cram-visual-headings.png') });
  await p.close();
}

/* ===== 5. DRILL reveal: is it announced OR does focus move? ===== */
console.log('\n======== 5. Drill answer reveal -- announced? focus moved? ========');
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await boot(p);
  await p.evaluate(() => window.switchTab('drill'));
  await p.waitForTimeout(900);
  const before = await p.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const ans = r.querySelector('.ans');
    return {
      activeEl: (document.activeElement.tagName + '#' + document.activeElement.id),
      ansVisible: ans ? getComputedStyle(ans).display !== 'none' && !ans.classList.contains('dnr') : null,
      ansClass: ans ? ans.className : null,
      liveRegionsDoc: [...document.querySelectorAll('[aria-live]')].map(e => e.textContent.trim().slice(0, 30)),
    };
  });
  console.log('  BEFORE reveal:', JSON.stringify(before));
  // press Space -- the documented reveal key
  await p.keyboard.press('Space');
  await p.waitForTimeout(700);
  const after = await p.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const ans = r.querySelector('.ans');
    let deep = document.activeElement; let d = 0;
    while (deep.shadowRoot && deep.shadowRoot.activeElement && d++ < 4) deep = deep.shadowRoot.activeElement;
    return {
      activeEl: deep.tagName + '#' + deep.id + '.' + (typeof deep.className === 'string' ? deep.className : ''),
      ansClass: ans ? ans.className : null,
      ansVisible: ans ? ans.offsetParent !== null : null,
      ansAriaLive: ans ? ans.getAttribute('aria-live') : null,
      ansRole: ans ? ans.getAttribute('role') : null,
      ansText: ans ? ans.textContent.trim().slice(0, 55) : null,
      docLiveContents: [...document.querySelectorAll('[aria-live]')].map(e => ({ live: e.getAttribute('aria-live'), txt: e.textContent.trim().slice(0, 40) })),
      shadowLive: [...r.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e => ({ id: e.id, live: e.getAttribute('aria-live'), txt: e.textContent.trim().slice(0, 25) })),
    };
  });
  console.log('  AFTER Space (reveal):', JSON.stringify(after, null, 2));
  console.log(`  >>> answer revealed: ${after.ansVisible}; aria-live on answer: ${after.ansAriaLive}; focus moved to answer: ${after.activeEl.includes('ans')}`);
  console.log(`  >>> any live region announcing it: ${after.docLiveContents.filter(x => x.txt && x.txt.length > 2).map(x => x.txt).join(' / ') || 'NONE'}`);
  await p.screenshot({ path: path.join(SHOTS, '92-drill-reveal.png') });
  await p.close();
}

/* ===== 6. #keybody overflow at realistic viewports ===== */
console.log('\n======== 6. #keybody (Keyboard-shortcuts overlay) scroll reachability ========');
{
  for (const vp of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 700 }]) {
    const p = await b.newPage({ viewport: vp });
    await boot(p);
    await p.click('#keyopen'); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const cmp = (id) => { const el = document.getElementById(id); if (!el) return null; const c = getComputedStyle(el); return { id, tabIndex: el.tabIndex, role: el.getAttribute('role'), label: el.getAttribute('aria-label'), overflowY: c.overflowY, hidden: el.scrollHeight - el.clientHeight, innerFocusables: el.querySelectorAll('button,a[href],input,[tabindex]:not([tabindex="-1"])').length }; };
      return { keybody: cmp('keybody'), cram: cmp('cram'), scopebody: cmp('scopebody'), planbody: cmp('planbody') };
    });
    console.log(`  ${vp.width}x${vp.height}: keybody hiddenPx=${r.keybody.hidden} tabIndex=${r.keybody.tabIndex} role=${r.keybody.role} innerFocusables=${r.keybody.innerFocusables}`);
    if (vp.width === 1280) {
      console.log('    peer overlay bodies (the ones that DID get the fix):');
      ['cram', 'scopebody', 'planbody'].forEach(k => r[k] && console.log(`      #${k}: tabIndex=${r[k].tabIndex} role=${r[k].role} label="${r[k].label}"`));
      await p.screenshot({ path: path.join(SHOTS, '93-keybody-overflow.png') });
      // can a keyboard user scroll it? tab through overlay and see if anything focuses inside keybody
      const tabTargets = [];
      for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(60); tabTargets.push(await p.evaluate(() => { const a = document.activeElement; return (a.id || a.tagName) + (document.getElementById('keybody') && document.getElementById('keybody').contains(a) ? ' [INSIDE keybody]' : ''); })); }
      console.log('    Tab cycle inside the open keyboard overlay:', JSON.stringify(tabTargets));
    }
    await p.close();
  }
}

/* ===== 7. Copy-link feedback (real click) ===== */
console.log('\n======== 7. Copy-link / toast feedback ========');
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  await boot(p);
  await p.click('#copylink');
  await p.waitForTimeout(900);
  const t = await p.evaluate(() => {
    const all = [...document.body.querySelectorAll('*')].filter(e => {
      if (e.offsetParent === null) return false;
      const txt = (e.textContent || '').trim().toLowerCase();
      return /copied|link copied|copied!/.test(txt) && e.children.length === 0;
    });
    return all.map(e => ({ tag: e.tagName, cls: e.className, live: e.getAttribute('aria-live'), role: e.getAttribute('role'), txt: e.textContent.trim().slice(0, 30) }));
  });
  console.log('  visible "copied" feedback elements:', JSON.stringify(t));
  const btnText = await p.evaluate(() => document.getElementById('copylink').textContent.trim().slice(0, 40));
  console.log('  #copylink button text after click:', JSON.stringify(btnText));
  await p.screenshot({ path: path.join(SHOTS, '94-copylink.png'), clip: { x: 0, y: 300, width: 340, height: 300 } });
  await ctx.close();
}

await b.close();
console.log('\nDONE');
