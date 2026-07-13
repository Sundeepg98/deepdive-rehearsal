/* Shared harness for the screen-reader-semantics audit.
   Ground truth = Chromium's FULL accessibility tree via CDP (Accessibility.getFullAXTree).
   That tree is what Chromium hands to the platform a11y API (UIA/IAccessible2/AX), i.e. it is
   literally what NVDA/JAWS/VoiceOver consume. It pierces shadow DOM, which we NEED because the
   drill scoreboard lives inside <deep-drill>'s shadow root. */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

export const APP = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
export const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/shots/semantics';

export async function open(opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, ...opts });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForTimeout(1800); // let boot.js / custom elements upgrade
  page.__errs = errs;
  return { browser, ctx, page };
}

/* On a FRESH profile the topic-index modal auto-opens and intercepts pointer events.
   Dismiss it so we can reach the app. (Its own focus behaviour is audited separately.) */
export async function dismissOverlays(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="dialog"]')).filter(d => {
        const r = d.getBoundingClientRect();
        return (r.width || r.height) && getComputedStyle(d).visibility !== 'hidden';
      }).map(d => d.id)
    );
    if (!open.length) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }
}

export async function toDrill(page) {
  await dismissOverlays(page);
  await page.click('button[data-tab="drill"]');
  await page.waitForTimeout(700);
}

/* Click #adv until the judge row (#jg) appears. Returns the labels clicked. */
export async function advanceToJudge(page) {
  const clicked = [];
  for (let i = 0; i < 10; i++) {
    const has = await page.evaluate(() => !!document.querySelector('deep-drill').shadowRoot.getElementById('jg'));
    if (has) return clicked;
    const t = await page.evaluate(() => {
      const b = document.querySelector('deep-drill').shadowRoot.getElementById('adv');
      if (!b) return null;
      const t = b.textContent.trim();
      b.click();
      return t;
    });
    if (!t) break;
    clicked.push(t);
    await page.waitForTimeout(220);
  }
  return clicked;
}

/* ---- CDP accessibility tree (one cached session per page) ---- */
const _sessions = new WeakMap();
export async function cdpFor(page) {
  if (_sessions.has(page)) return _sessions.get(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  await cdp.send('DOM.enable');
  _sessions.set(page, cdp);
  return cdp;
}

export async function axTree(page) {
  const cdp = await cdpFor(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  return nodes;
}

/* AX subtree for an element identified by a JS expression (pierces open shadow roots).
   This is the real Chromium AX tree -- the same structure handed to the platform a11y
   API that NVDA/JAWS/VoiceOver read. */
export async function axFor(page, expression) {
  const cdp = await cdpFor(page);
  const { result } = await cdp.send('Runtime.evaluate', { expression, returnByValue: false });
  if (!result || !result.objectId) throw new Error('expression did not yield an element: ' + expression);
  const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId });
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
    backendNodeId: node.backendNodeId, fetchRelatives: false,
  });
  await cdp.send('Runtime.releaseObject', { objectId: result.objectId }).catch(() => {});
  return nodes;
}

/* Pretty-print an AX node list as an indented tree rooted at the deepest common root. */
export function axPrint(nodes, { showIgnored = true } = {}) {
  const byId = new Map(nodes.map(n => [n.nodeId, n]));
  const childOf = new Set();
  nodes.forEach(n => (n.childIds || []).forEach(c => childOf.add(c)));
  const roots = nodes.filter(n => !childOf.has(n.nodeId));
  const lines = [];
  const walk = (n, d) => {
    if (!n) return;
    if (!showIgnored && n.ignored) return;
    const r = val(n.role) || '?';
    const nm = val(n.name);
    const v = val(n.value);
    const live = propOf(n, 'live');
    const bits = [];
    if (nm !== undefined && nm !== '') bits.push('name=' + JSON.stringify(nm));
    if (v !== undefined && v !== '') bits.push('value=' + JSON.stringify(v));
    if (live && live !== 'off') bits.push('LIVE=' + live);
    if (n.ignored) {
      const rs = (n.ignoredReasons || []).map(x => x.name).join(',');
      bits.push('IGNORED' + (rs ? '(' + rs + ')' : ''));
    }
    lines.push('  '.repeat(d) + '- ' + r + (bits.length ? '  ' + bits.join(' ') : ''));
    (n.childIds || []).forEach(c => walk(byId.get(c), d + 1));
  };
  roots.forEach(r => walk(r, 0));
  return lines.join('\n');
}

export const val = (p) => (p && p.value !== undefined ? p.value : undefined);
export const roleOf = (n) => val(n.role);
export const nameOf = (n) => val(n.name);
export const propOf = (n, k) => {
  const p = (n.properties || []).find(x => x.name === k);
  return p ? val(p) : undefined;
};

/* Find AX nodes whose accessible name matches, ignoring ignored nodes by default. */
export function findByName(nodes, re, { includeIgnored = false } = {}) {
  return nodes.filter(n => {
    if (!includeIgnored && n.ignored) return false;
    const nm = nameOf(n);
    return typeof nm === 'string' && re.test(nm);
  });
}

/* Resolve an AX node -> DOM info (tag, id, class) so findings carry real selectors. */
export async function domFor(page, nodes, axNode) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { node } = await cdp.send('DOM.describeNode', { backendNodeId: axNode.backendDOMNodeId });
    const attrs = {};
    for (let i = 0; i < (node.attributes || []).length; i += 2) attrs[node.attributes[i]] = node.attributes[i + 1];
    return { tag: node.nodeName.toLowerCase(), attrs };
  } catch { return null; }
  finally { await cdp.detach().catch(() => {}); }
}

/* Every element in the LIVE DOM, piercing shadow roots. Returns serialisable records. */
export async function allElements(page) {
  return page.evaluate(() => {
    const out = [];
    const sel = (el) => {
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      const c = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (c.length) s += '.' + c.join('.');
      return s;
    };
    const walk = (root, hostPath) => {
      const els = root.querySelectorAll('*');
      for (const el of els) {
        out.push({
          sel: sel(el),
          host: hostPath,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          cls: el.getAttribute('class') || '',
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          ariaLabelledby: el.getAttribute('aria-labelledby'),
          ariaLive: el.getAttribute('aria-live'),
          ariaHidden: el.getAttribute('aria-hidden'),
          alt: el.getAttribute('alt'),
          title: el.getAttribute('title'),
          tabindex: el.getAttribute('tabindex'),
          onclick: !!el.getAttribute('onclick'),
          text: (el.textContent || '').trim().slice(0, 60),
          visible: !!(el.getBoundingClientRect().width || el.getBoundingClientRect().height),
        });
        if (el.shadowRoot) walk(el.shadowRoot, (hostPath ? hostPath + ' >> ' : '') + sel(el));
      }
    };
    walk(document, '');
    return out;
  });
}

/* PAINTED-PIXEL check (the negative-control primitive that the blank-page audit lacked). */
export async function paintedPixels(page) {
  const buf = await page.screenshot({ type: 'png' });
  // count non-uniform pixels via canvas in-page
  const b64 = buf.toString('base64');
  return page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const first = [d[0], d[1], d[2]];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] !== first[0] || d[i + 1] !== first[1] || d[i + 2] !== first[2]) n++;
    }
    return n;
  }, b64);
}

export async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false });
}
