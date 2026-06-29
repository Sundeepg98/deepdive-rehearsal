/* ============ NUMBERS / NALSD pane ============ */
/* The back-of-envelope capacity calculator: four assumptions in, derived
   throughput / concurrency / connection / storage / cost figures out, each row
   flagged when it breaches a known ceiling (Lambda's 1,000 default, a ~100-conn
   Postgres pool). A self-contained shadow component; the tab / rail / keyboard
   nav that used to share this file stays global below. */
var NUM_STYLE = `.numlead{font-size:15px;line-height:1.5;color:var(--ink);margin:2px 2px 18px}
.numlead b{color:var(--accink);font-weight:700}
.num-h{font:800 10px -apple-system,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--mut2);margin-bottom:12px}
.ninp{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ninp label{display:flex;flex-direction:column;gap:6px;font:700 11px -apple-system,sans-serif;color:var(--mut);letter-spacing:.2px}
.ninp input{font:700 15px ui-monospace,Menlo,monospace;color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border:1.5px solid var(--ninp-bd);border-radius:9px;padding:10px 12px;width:100%;-moz-appearance:textfield;transition:border-color .2s ease,box-shadow .2s ease,transform .15s ease}
.ninp input::-webkit-outer-spin-button,.ninp input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.ninp input:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px rgba(83,74,183,.12),0 2px 8px -2px rgba(83,74,183,.1);transform:translateY(-1px)}
.ninp input:hover:not(:focus){border-color:rgba(83,74,183,.3)}
.nrow{display:grid;grid-template-columns:1fr auto;grid-template-areas:"k v" "n n";gap:3px 12px;padding:12px 0;border-bottom:1px solid var(--bd);transition:padding .2s ease}
.nrow:last-child{border-bottom:0}
.nrow:hover{padding-left:4px}
.nrow-k{grid-area:k;font-size:13px;font-weight:700;color:var(--ink);align-self:center}
.nrow-v{grid-area:v;font:800 17px ui-monospace,Menlo,monospace;color:var(--acc);align-self:center;white-space:nowrap;transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
.nrow:hover .nrow-v{transform:scale(1.05)}
.nrow-n{grid-area:n;font-size:11.5px;color:var(--mut2);line-height:1.45}
.nrow.over .nrow-v{color:var(--red);text-shadow:0 0 20px rgba(239,68,68,.1)}
.nrow.over .nrow-n{color:var(--red);font-weight:600}
.nrow.over{background:linear-gradient(90deg,transparent 0%,rgba(239,68,68,.02) 100%)}
.num-tell{margin-top:15px;font-size:12px;color:var(--teal);font-weight:700;line-height:1.55;padding:14px 17px;background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);border-radius:11px;box-shadow:0 1px 6px -2px rgba(10,133,100,.08)}
.nprog{height:5px;background:var(--dbar-bg);border-radius:5px;overflow:hidden;margin:12px 0}
.nprog i{display:block;height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2));border-radius:5px;transition:width .5s cubic-bezier(.22,.61,.36,1)}
.num-tell b{color:var(--dec-tell-b-fg);font-weight:700}
.nv-u{display:inline-block;width:30px;text-align:left;padding-left:8px;box-sizing:border-box;font-size:13px;font-weight:600;color:var(--mut)}`;
var NUM_HTML = `<div class="numlead">The estimation an interviewer makes you do at the whiteboard. State your assumptions and the <b>ceilings fall out of the arithmetic</b> &mdash; adjust any input and the math recomputes.</div>
    <div class="card">
      <div class="num-h">Assumptions</div>
      <div class="ninp">
        <label>Objects / day<input id="n_obj" type="number" value="10000000" min="0"></label>
        <label>Avg size (MB)<input id="n_size" type="number" value="2" min="0" step="0.1"></label>
        <label>Processing (sec)<input id="n_proc" type="number" value="2" min="0" step="0.1"></label>
        <label>Peak : average<input id="n_peak" type="number" value="10" min="1"></label>
      </div>
    </div>
    <div class="card" style="margin-top:13px">
      <div class="num-h">What falls out</div>
      <div id="nout"></div>
    </div>
    <div class="num-tell">The number you say isn't the point &mdash; the <b>ceiling</b> it reveals is. Concurrency past 1,000 says &lsquo;buffer through SQS&rsquo;; connections past the pool say &lsquo;RDS Proxy.&rsquo;</div>`;
class DeepNumbers extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    root.innerHTML = '<style>' + NUM_STYLE + '</style>' + NUM_HTML;
    this._root = root;
    this._out = root.getElementById('nout');
    const self = this;
    ['n_obj', 'n_size', 'n_proc', 'n_peak'].forEach(function (id) {
      root.getElementById(id).addEventListener('input', function () { self._calc(); });
    });
    this._calc();
  }
  _fmtN(x) { if (!isFinite(x)) x = 0; return Math.round(x).toLocaleString('en-US'); }
  _fmtTB(tb) {
    if (!isFinite(tb)) tb = 0;
    if (tb >= 1000) return (tb / 1000).toFixed(tb >= 10000 ? 0 : 1) + ' PB';
    if (tb >= 10) return tb.toFixed(0) + ' TB';
    return tb.toFixed(2) + ' TB';
  }
  _nval(id) { const v = +this._root.getElementById(id).value; return isFinite(v) && v > 0 ? v : 0; }
  _calc() {
    const perDay = this._nval('n_obj'), sizeMB = this._nval('n_size'), procS = this._nval('n_proc'), peakR = this._nval('n_peak');
    const avg = perDay / 86400, peak = avg * peakR, conc = peak * procS, conn = conc;
    const stDay = perDay * sizeMB / 1e6, stYr = stDay * 365, puts = perDay, putCost = puts / 1000 * 0.005;
    const rows = [
      { k: 'Average throughput', v: this._fmtN(avg), u: '/s', n: 'objects/day \u00F7 86,400 seconds', over: false },
      { k: 'Peak throughput', v: this._fmtN(peak), u: '/s', n: 'average \u00D7 ' + this._fmtN(peakR) + ' peak ratio', over: false },
      { k: 'Lambda concurrency at peak', v: this._fmtN(conc), u: '', n: conc > 1000 ? 'exceeds the 1,000 default \u2014 RDS Proxy, or buffer through SQS' : 'peak/s \u00D7 processing time \u2014 within the 1,000 default', over: conc > 1000 },
      { k: 'DB connections at peak', v: this._fmtN(conn), u: '', n: conn > 100 ? 'far past a Postgres pool (~100) \u2014 needs RDS Proxy or a queue' : '\u2248 one connection per invocation \u2014 a pool can hold this', over: conn > 100 },
      { k: 'Storage written / day', v: this._fmtTB(stDay).split(' ')[0], u: this._fmtTB(stDay).split(' ')[1], n: this._fmtTB(stYr) + ' per year of raw objects', over: false },
      { k: 'S3 PUTs / day', v: this._fmtN(puts), u: '', n: '\u2248 $' + putCost.toFixed(2) + '/day in PUT requests alone', over: false }
    ];
    let html = '';
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      html += '<div class="nrow' + (row.over ? ' over' : '') + '"><div class="nrow-k">' + row.k + '</div><div class="nrow-v">' + row.v + '<span class="nv-u">' + (row.u || '') + '</span></div><div class="nrow-n">' + row.n + '</div></div>';
    }
    this._out.innerHTML = html;
  }
}
customElements.define('deep-numbers', DeepNumbers);

/* ============ TABS + RAIL + KEYBOARD ============ */
const segBtns = document.querySelectorAll('.seg button');
const panes = document.querySelectorAll('.pane');
const railEl = document.getElementById('rail');
const railPos = { walk: 25, drill: 50, wb: 75, sys: 100 };
var current = 'walk';
/* Activate a pane: toggle the segmented-control buttons and the panes, slide the
   progress rail to this tab's mark, and record it as the current pane. */
function switchTab(t) {
  for (let i = 0; i < segBtns.length; i++) segBtns[i].classList.toggle('on', segBtns[i].getAttribute('data-tab') === t);
  for (let i = 0; i < panes.length; i++) panes[i].classList.toggle('on', panes[i].id === t);
  railEl.style.width = railPos[t] + '%';
  current = t;
}
for (let i = 0; i < segBtns.length; i++) {
  segBtns[i].onclick = function () { switchTab(this.getAttribute('data-tab')); };
}
/* Global keyboard shortcuts. Ignored while typing in a field, and suppressed
   whenever any overlay is open (the overlay's own handlers take over). */
document.addEventListener('keydown', function (event) {
  const activeTag = (event.target.tagName || '').toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea') return;
  if (mockov.classList.contains('open') || cramov.classList.contains('open') || sessov.classList.contains('open') || document.getElementById('mixov').classList.contains('open') || document.getElementById('planov').classList.contains('open') || document.getElementById('scopeov').classList.contains('open') || document.getElementById('keyov').classList.contains('open')) return;
  if (event.key === '?') { event.preventDefault(); openKeys(); return; }
  const key = event.key.toLowerCase();
  /* q..o jump straight to a pane (the QWERTY row mirrors the tab order) */
  const tabKeys = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open' };
  if (tabKeys[key]) { switchTab(tabKeys[key]); return; }
  if (current === 'walk') {
    /* arrows step through the walkthrough (bounds handled inside prev/next) */
    const w = document.querySelector('#walk deep-walkthrough');
    if (w) {
      if (event.key === 'ArrowLeft') w.prev();
      if (event.key === 'ArrowRight') w.next();
    }
  } else if (current === 'drill') {
    /* space/enter advances; 1 and 2 self-grade -- the controls live in the
       drill's shadow now, so reach through it rather than the document */
    const dd = document.querySelector('#drill deep-drill');
    if (dd) {
      const r = dd.shadowRoot;
      const advBtn = r.getElementById('adv');
      if ((event.key === ' ' || event.key === 'Enter') && advBtn) { event.preventDefault(); advBtn.click(); }
      if (key === '1') { const jgBtn = r.getElementById('jg'); if (jgBtn) jgBtn.click(); }
      if (key === '2') { const jsBtn = r.getElementById('js'); if (jsBtn) jsBtn.click(); }
    }
  }
});
/* Modal focus management: dialogs are aria-modal, so trap Tab inside the open
   overlay and restore focus to the trigger when it closes. The overlay set is
   derived from the DOM &mdash; every [role=dialog][aria-modal] is auto-covered, so a
   newly added overlay can never be forgotten (the old keyov/mixov bug class). */
(function () {
  const overlays = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"][aria-modal="true"]'));
  let returnFocusTo = null;
  /* the tabbable, visible elements inside an overlay */
  function getFocusable(overlay) {
    const nodes = overlay.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(nodes, function (el) { return !el.disabled && el.offsetParent !== null; });
  }
  /* whichever overlay is currently open, or null */
  function openOverlay() { for (let i = 0; i < overlays.length; i++) if (overlays[i].classList.contains('open')) return overlays[i]; return null; }
  /* watch each overlay's class: on open, remember the trigger and move focus in; on close, restore it */
  overlays.forEach(function (overlay) {
    overlay.__open = overlay.classList.contains('open');
    new MutationObserver(function () {
      const isOpen = overlay.classList.contains('open');
      if (isOpen && !overlay.__open) {
        overlay.__open = true;
        returnFocusTo = document.activeElement;
        setTimeout(function () { const focusable = getFocusable(overlay); if (focusable.length) focusable[0].focus(); }, 0);
      } else if (!isOpen && overlay.__open) {
        overlay.__open = false;
        if (returnFocusTo && returnFocusTo.focus) { try { returnFocusTo.focus(); } catch (e) {} }
        returnFocusTo = null;
      }
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  });
  /* Tab / Shift-Tab cycle within the open overlay */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    const overlay = openOverlay();
    if (!overlay) return;
    const focusable = getFocusable(overlay);
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1], active = document.activeElement;
    if (!overlay.contains(active)) { event.preventDefault(); first.focus(); return; }
    if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  }, true);
  /* unified Escape: close whichever overlay is open via its own close button */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const overlay = openOverlay();
    if (!overlay) return;
    const closeBtn = overlay.querySelector('.mock-x,.cram-x');
    if (closeBtn) closeBtn.click();
  });
})();

/* ===== shell: mobile tools sheet (v75) ===== */
/* The floating "tools" button toggles the mock-bar sheet on mobile; a click
   outside it (or on any sheet button other than the toggles) closes it.
   CSS handles visibility via transform:translateY(115%) -> transform:none
   with a .26s ease transition. No display manipulation needed. */
(function () {
  const toolsFab = document.getElementById('toolsfab');
  const mockbar = document.querySelector('.mockbar');
  
  function openMockbar() {
    document.body.classList.add('tools-open');
  }
  
  function closeMockbar() {
    document.body.classList.remove('tools-open');
  }
  
  if (toolsFab) {
    toolsFab.addEventListener('click', function (event) {
      event.stopPropagation();
      if (document.body.classList.contains('tools-open')) {
        closeMockbar();
      } else {
        openMockbar();
      }
    });
  }
  
  document.addEventListener('click', function (event) {
    if (!document.body.classList.contains('tools-open')) return;
    if (mockbar && mockbar.contains(event.target)) return;
    if (toolsFab && toolsFab.contains(event.target)) return;
    closeMockbar();
  });
  
  if (mockbar) {
    mockbar.addEventListener('click', function (event) {
      const btn = event.target.closest && event.target.closest('button');
      if (!btn) return;
      if (btn.id === 'inttog' || btn.id === 'themetog') return;
      closeMockbar();
    });
  }
})();


/* ===== v76: reset scroll to top on view switch ===== */
(function () {
  const navButtons = document.querySelectorAll('.sidebar .seg button');
  for (let i = 0; i < navButtons.length; i++) {
    navButtons[i].addEventListener('click', function () { window.scrollTo(0, 0); });
  }
})();


/* ===== v77: stage header sync ===== */
(function(){
  var cmpNotes={
    walk:['Walkthrough','The dispatch flow, one step at a time \u2014 the mechanics you narrate before anyone cuts in.','Say the fork out loud \u2014 \u201Cone read, two sinks.\u201D That single-read line is what they remember.'],
    drill:['Probe Drill','Twenty graded follow-ups \u2014 the ones that separate a passing SDE2 from a Staff signal.','Commit to an answer before you reveal \u2014 saying it beats reading it. That\u2019s the rep.'],
    wb:['Whiteboard','Rebuild the whole pipeline from memory \u2014 nine cues, nothing in front of you.','Draw the boxes from memory first, then check \u2014 recall is the test, not recognition.'],
    sys:['System Map','Zoom out to the six stages \u2014 and the exact points an interviewer pivots.','Lead with the flow, not the boxes \u2014 \u201Cupload lands, dispatch routes, sinks fan out.\u201D'],
    trade:['Trade-offs','The decisions they drill \u2014 each with the switch condition that picks a side.','Always say \u201Cpick when\u201D \u2014 name the condition that flips the choice, not just the options.'],
    model:['Model Answers','Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.','Steal the frame, not the words \u2014 headline first, then the one risk you\u2019d name.'],
    num:['Numbers','Back-of-envelope the load \u2014 and know which number trips which ceiling.','Lead with the peak, not the average \u2014 ~1,157/s is the number that sets the ceiling.'],
    rf:['Red Flags','What sinks the round \u2014 the anti-patterns, and what to say instead.','Name what the interviewer hears, not just the mistake \u2014 that\u2019s the senior tell.'],
    open:['30-Second','The opener and the close \u2014 matched to the altitude the question is asked at.','Match the altitude \u2014 open at the contract, not the code, and land on the one risk.']
  };
  /* Mirror the active tab's label into the stage header and the desktop +
     mobile "companion" panels (view name, note, and pivot move from cmpNotes). */
  function upd() {
    const activeBtn = document.querySelector('.sidebar .seg button.on');
    const stageHead = document.getElementById('stagehead');
    if (!activeBtn || !stageHead) return;
    const nameSpan = activeBtn.querySelector('span:not(.n)'), kickSpan = activeBtn.querySelector('.n');
    stageHead.textContent = '';
    const kickEl = document.createElement('div'); kickEl.className = 'sh-kick'; kickEl.textContent = kickSpan ? kickSpan.textContent : '';
    const nameEl = document.createElement('div'); nameEl.className = 'sh-name'; nameEl.textContent = nameSpan ? nameSpan.textContent : '';
    stageHead.appendChild(kickEl); stageHead.appendChild(nameEl);
    stageHead.classList.remove('headin'); void stageHead.offsetWidth; stageHead.classList.add('headin');
    const tab = activeBtn.getAttribute('data-tab');
    const deskView = document.getElementById('cmpView'), deskNote = document.getElementById('cmpNote'), deskMove = document.getElementById('cmpMove');
    const mobileView = document.getElementById('mCmpView'), mobileNote = document.getElementById('mCmpNote'), mobileMove = document.getElementById('mCmpMove');
    if (cmpNotes[tab]) {
      if (deskView) deskView.textContent = cmpNotes[tab][0];
      if (deskNote) deskNote.textContent = cmpNotes[tab][1];
      if (deskMove) deskMove.textContent = cmpNotes[tab][2];
      if (mobileView) mobileView.textContent = cmpNotes[tab][0];
      if (mobileNote) mobileNote.textContent = cmpNotes[tab][1];
      if (mobileMove) mobileMove.textContent = cmpNotes[tab][2];
    }
  }
  const navButtons = document.querySelectorAll('.sidebar .seg button');
  for (let i = 0; i < navButtons.length; i++) navButtons[i].addEventListener('click', function () { upd(); });
  upd();
})();

/* v80: mobile nav strip &mdash; fade the scroll edges and keep the active view in view */
(function () {
  const strip = document.querySelector('.sidebar .seg');
  if (!strip) return;
  /* show a fade hint on whichever edge still has strip to scroll toward */
  function updateFades() {
    const scrolledLeft = strip.scrollLeft > 4;
    const scrolledRight = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4;
    strip.style.setProperty('--fl', scrolledLeft ? '24px' : '0px');
    strip.style.setProperty('--fr', scrolledRight ? '24px' : '0px');
  }
  /* on mobile, scroll the active button back into view if it's clipped */
  function ensureActiveVisible() {
    if (!window.matchMedia('(max-width:919px)').matches) return;
    const activeBtn = strip.querySelector('button.on');
    if (!activeBtn) return;
    const stripRect = strip.getBoundingClientRect(), btnRect = activeBtn.getBoundingClientRect();
    if (btnRect.left < stripRect.left + 10 || btnRect.right > stripRect.right - 10) {
      activeBtn.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }
  }
  strip.addEventListener('scroll', updateFades, { passive: true });
  window.addEventListener('resize', function () { updateFades(); });
  const buttons = strip.querySelectorAll('button');
  for (let i = 0; i < buttons.length; i++) buttons[i].addEventListener('click', function () { setTimeout(function () { updateFades(); ensureActiveVisible(); }, 30); });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(updateFades); }
  updateFades();
})();

