import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.addScriptTag({ content: `
window.__deepText=function(root){let s='';const rec=n=>{if(n.nodeType===3){s+=n.nodeValue+' ';return;}if(n.nodeType!==1)return;if(getComputedStyle(n).display==='none')return;if(n.shadowRoot)n.shadowRoot.childNodes.forEach(rec);n.childNodes.forEach(rec);};rec(root);return s.replace(/\\s+/g,' ').trim();};`});

async function goTopic(i) {
  const open = await p.evaluate(() => !!document.querySelector('.ix-ov.open'));
  if (!open) await p.click('#idxopen');
  await p.waitForTimeout(600);
  const cards = await p.$$('.ix-card');
  const name = await cards[i].evaluate(e => e.querySelector('.ix-c-name').textContent.trim());
  await cards[i].click(); await p.waitForTimeout(900);
  return name;
}

console.log('=== SCOPE overlay body vs selected topic ===');
for (const i of [0, 12, 30]) {
  const name = await goTopic(i);
  await p.click('#scopeopen'); await p.waitForTimeout(1000);
  const body = await p.evaluate(() => window.__deepText(document.querySelector('#scopeov')).slice(0, 150));
  console.log(`\n topic: "${name}"\n scope: "${body}"`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
}

console.log('\n=== OVERLAY CHROME CONSISTENCY (close button side, panel width, vertical anchor) ===');
const OV = [['mockopen','#mockov','mock run'],['mixopen','#mixov','mixed fire'],['cramopen','#cramov','cram sheet'],
            ['sessopen','#sessov','session'],['keyopen','#keyov','keyboard'],['scopeopen','#scopeov','scope'],
            ['planopen','#planov','game plan'],['notesopen','#ntov','notes'],['idxopen','.ix-ov','topic index']];
for (const [openId, sel, nm] of OV) {
  const btn = await p.$('#' + openId); if (!btn) { console.log(` ${nm}: no opener`); continue; }
  await btn.click(); await p.waitForTimeout(800);
  const r = await p.evaluate((s) => {
    const ov = document.querySelector(s); if (!ov) return null;
    const panel = ov.firstElementChild?.classList?.length ? ov.firstElementChild : ov.querySelector('div');
    const pr = panel.getBoundingClientRect();
    const x = ov.querySelector('button[aria-label*="lose" i], .mock-x, .ix-x, .nt-x, .xd-x');
    const xr = x ? x.getBoundingClientRect() : null;
    const cs = getComputedStyle(panel);
    return {
      panelW: Math.round(pr.width), panelTop: Math.round(pr.top), panelH: Math.round(pr.height),
      radius: cs.borderRadius, closeSide: xr ? (xr.left - pr.left < pr.width / 2 ? 'LEFT' : 'RIGHT') : 'none',
      closeX: xr ? Math.round(xr.left) : null,
      titleCase: (ov.querySelector('.mock-title,.cram-title,.ix-title,.nt-title')||{}).textContent?.trim().slice(0,30),
      titleTransform: (()=>{const t=ov.querySelector('.mock-title,.cram-title,.ix-title,.nt-title'); return t?getComputedStyle(t).textTransform:'-';})()
    };
  }, sel);
  if (r) console.log(` ${nm.padEnd(11)} w=${String(r.panelW).padStart(4)}  top=${String(r.panelTop).padStart(3)}  h=${String(r.panelH).padStart(3)}  radius=${r.radius.padEnd(6)}  close=${r.closeSide.padEnd(5)}  title-transform=${r.titleTransform}`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
}
await b.close();
