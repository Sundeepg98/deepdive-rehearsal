/* ============ NUMBERS / NALSD ============ */
/* Format an integer with thousands separators (NaN-safe). */
function fmtN(x) { if (!isFinite(x)) x = 0; return Math.round(x).toLocaleString('en-US'); }

/* Format a terabyte quantity, scaling up to PB and trimming precision as it grows. */
function fmtTB(tb) {
  if (!isFinite(tb)) tb = 0;
  if (tb >= 1000) return (tb / 1000).toFixed(tb >= 10000 ? 0 : 1) + ' PB';
  if (tb >= 10) return tb.toFixed(0) + ' TB';
  return tb.toFixed(2) + ' TB';
}

/* Read a positive number from an input by id, defaulting to 0. */
function nval(id) { const v = +document.getElementById(id).value; return isFinite(v) && v > 0 ? v : 0; }

/* Back-of-envelope capacity model: derive throughput, concurrency, connection,
   storage and cost figures from the four inputs, flagging the rows that breach
   a known ceiling (Lambda's 1,000 default, a ~100-connection Postgres pool). */
function calcNumbers() {
  const perDay = nval('n_obj'), sizeMB = nval('n_size'), procS = nval('n_proc'), peakR = nval('n_peak');
  const avg = perDay / 86400, peak = avg * peakR, conc = peak * procS, conn = conc;
  const stDay = perDay * sizeMB / 1e6, stYr = stDay * 365, puts = perDay, putCost = puts / 1000 * 0.005;
  const rows=[
    {k:'Average throughput', v:fmtN(avg),u:'/s', n:'objects/day \u00F7 86,400 seconds', over:false},
    {k:'Peak throughput', v:fmtN(peak),u:'/s', n:'average \u00D7 '+fmtN(peakR)+' peak ratio', over:false},
    {k:'Lambda concurrency at peak', v:fmtN(conc),u:'', n:conc>1000?'exceeds the 1,000 default \u2014 RDS Proxy, or buffer through SQS':'peak/s \u00D7 processing time \u2014 within the 1,000 default', over:conc>1000},
    {k:'DB connections at peak', v:fmtN(conn),u:'', n:conn>100?'far past a Postgres pool (~100) \u2014 needs RDS Proxy or a queue':'\u2248 one connection per invocation \u2014 a pool can hold this', over:conn>100},
    {k:'Storage written / day', v:fmtTB(stDay).split(' ')[0],u:fmtTB(stDay).split(' ')[1], n:fmtTB(stYr)+' per year of raw objects', over:false},
    {k:'S3 PUTs / day', v:fmtN(puts),u:'', n:'\u2248 $'+putCost.toFixed(2)+'/day in PUT requests alone', over:false}
  ];
  let html = '';
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    html += '<div class="nrow' + (row.over ? ' over' : '') + '"><div class="nrow-k">' + row.k + '</div><div class="nrow-v">' + row.v + '<span class="nv-u">' + (row.u || '') + '</span></div><div class="nrow-n">' + row.n + '</div></div>';
  }
  document.getElementById('nout').innerHTML = html;
}
['n_obj', 'n_size', 'n_proc', 'n_peak'].forEach(function (id) { document.getElementById(id).addEventListener('input', calcNumbers); });
calcNumbers();

/* ============ TABS + RAIL + KEYBOARD ============ */
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
    /* arrows step through the walkthrough */
    if (event.key === 'ArrowLeft' && wi > 0) { wi--; renderW(); }
    if (event.key === 'ArrowRight' && wi < steps.length - 1) { wi++; renderW(); }
  } else if (current === 'drill') {
    /* space/enter advances; 1 and 2 self-grade the current card */
    const advBtn = document.getElementById('adv');
    if ((event.key === ' ' || event.key === 'Enter') && advBtn) { event.preventDefault(); advBtn.click(); }
    if (key === '1') { const jgBtn = document.getElementById('jg'); if (jgBtn) jgBtn.click(); }
    if (key === '2') { const jsBtn = document.getElementById('js'); if (jsBtn) jsBtn.click(); }
  }
});
/* Modal focus management: dialogs are aria-modal, so trap Tab inside the open
   overlay and restore focus to the trigger when it closes. The overlay set is
   derived from the DOM — every [role=dialog][aria-modal] is auto-covered, so a
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
   outside it (or on any sheet button other than the toggles) closes it. */
(function () {
  const toolsFab = document.getElementById('toolsfab');
  const mockbar = document.querySelector('.mockbar');
  if (toolsFab) {
    toolsFab.addEventListener('click', function (event) { event.stopPropagation(); document.body.classList.toggle('tools-open'); });
  }
  document.addEventListener('click', function (event) {
    if (!document.body.classList.contains('tools-open')) return;
    if (mockbar && mockbar.contains(event.target)) return;
    if (toolsFab && toolsFab.contains(event.target)) return;
    document.body.classList.remove('tools-open');
  });
  if (mockbar) {
    mockbar.addEventListener('click', function (event) {
      const btn = event.target.closest && event.target.closest('button');
      if (!btn) return;
      if (btn.id === 'inttog' || btn.id === 'themetog') return;
      document.body.classList.remove('tools-open');
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
    walk:['Walkthrough','The dispatch flow, one step at a time — the mechanics you narrate before anyone cuts in.','Say the fork out loud — “one read, two sinks.” That single-read line is what they remember.'],
    drill:['Probe Drill','Twenty graded follow-ups — the ones that separate a passing SDE2 from a Staff signal.','Commit to an answer before you reveal — saying it beats reading it. That’s the rep.'],
    wb:['Whiteboard','Rebuild the whole pipeline from memory — nine cues, nothing in front of you.','Draw the boxes from memory first, then check — recall is the test, not recognition.'],
    sys:['System Map','Zoom out to the six stages — and the exact points an interviewer pivots.','Lead with the flow, not the boxes — “upload lands, dispatch routes, sinks fan out.”'],
    trade:['Trade-offs','The decisions they drill — each with the switch condition that picks a side.','Always say “pick when” — name the condition that flips the choice, not just the options.'],
    model:['Model Answers','Full spoken scripts — the beats, in order, the way you’d actually say them.','Steal the frame, not the words — headline first, then the one risk you’d name.'],
    num:['Numbers','Back-of-envelope the load — and know which number trips which ceiling.','Lead with the peak, not the average — ~1,157/s is the number that sets the ceiling.'],
    rf:['Red Flags','What sinks the round — the anti-patterns, and what to say instead.','Name what the interviewer hears, not just the mistake — that’s the senior tell.'],
    open:['30-Second','The opener and the close — matched to the altitude the question is asked at.','Match the altitude — open at the contract, not the code, and land on the one risk.']
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

/* v80: mobile nav strip — fade the scroll edges and keep the active view in view */
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

