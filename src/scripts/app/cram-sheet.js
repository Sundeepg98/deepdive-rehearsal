/* ============ CRAM SHEET ============ */
/* Show/hide wiring for several overlays (cram sheet, game plan, scope-first,
   keyboard shortcuts) plus the light/dark theme toggle and the print buttons.
   Each open/close pair calls the shared ovShow/ovHide (defined in
   mock-run/logic.js) and toggles aria-hidden + the body scroll-lock. */

var cramov = document.getElementById('cramov'); /* SHARED: the keyboard handler in shell.js reads this to see if the cram overlay is open */
let cramKeyBound = false;

/* ===================== THE CRAM SHEET'S JUMP STRIP (W2 / audit P2-5, mobile half) =====================
   The sheet is 7 screens on the FLAGSHIP and 11.5 on the longest topic, and its controls were
   exhaustively `x` and Print -- `querySelector('nav,[class*=toc],[class*=jump]')` returned null.
   On the one viewport whose premise is "a glanceable last look on the way in", the only way to
   find a section was to scroll past every other one.

   IT READS THE SHEET, IT DOES NOT DESCRIBE IT. The chips are built from the titles <deep-cram>
   actually rendered, so a corpus that authors different sections per topic (it does -- deriveCram
   emits a section only when its slice has content) can never drift out of sync with its own index.
   A hardcoded section list would have been wrong on the first topic that omitted one.

   SHADOW BOUNDARY: the sections live inside <deep-cram>'s root, so offsetTop is meaningless across
   it -- the scroll is computed from the two live rects instead, which is boundary-agnostic and also
   survives the sheet being re-derived on a topic switch. */
function cramSections() {
  const host = cramov.querySelector('deep-cram');
  if (!host || !host.shadowRoot) return [];
  const out = [];
  const secs = host.shadowRoot.querySelectorAll('.cs-sec');
  for (let i = 0; i < secs.length; i++) {
    const t = secs[i].querySelector('.cs-st');
    const label = t ? (t.textContent || '').trim() : '';
    if (label) out.push({ el: secs[i], label: label });
  }
  return out;
}
/* <deep-cram> renders LAZILY, and not on the open path: _maybeRender() runs at connectedCallback
   (when .cram-ov is not open yet, so it arms an IntersectionObserver instead) and on
   deeptopicchange. So the first openCram() adds `.open` SYNCHRONOUSLY and the sheet's body is
   still empty when the strip is built. Indexing that gap rendered nothing -- silently, on the
   first open of every session, which is the only open most users get.

   THE rAF RETRY THAT USED TO LIVE HERE COULD NOT WIN, AND NOT BECAUSE THE MACHINE WAS SLOW.
   It re-ran on animation frames "because it is the same clock the render is waiting on" -- but it
   is the same clock running EARLIER IN THE STEP. <deep-cram> renders from an IntersectionObserver
   callback (cram-overlay.js), and in the HTML rendering steps animation-frame callbacks run BEFORE
   intersection observations are delivered. So every retry sampled the shadow root in the frame
   just ahead of the render that would have filled it, and the strip was structurally guaranteed to
   paint ONE FRAME after the sections it indexes. Measured, and it is exactly one frame in BOTH
   engines: sections 7 / chips 0, then chips 7 on the very next frame -- Chromium included. What
   differs is only what a frame COSTS while a 7-section, 7619px sheet renders synchronously under a
   backdrop-filter over a 12MB document: ~30ms in Chromium, ~140ms in WebKit 26.5. That is the
   whole engine split. WebKit measured 0 chips for ~860ms from the tap, then the strip growing
   16.4 -> 61px and shoving the first section 41.7px DOWN THE PAGE, under a reader who by the
   sheet's own premise started reading immediately.

   SO WATCH THE RENDER INSTEAD OF RACING IT. A MutationObserver on the shadow root delivers as a
   MICROTASK at the end of the task that mutated it -- i.e. inside _renderNow()'s own task, before
   that frame paints -- so the chips and the sections land in the SAME frame. No empty strip, no
   late shift, and no dependence on frame cadence, which is the property that made this engine-
   specific in the first place.

   WHY NOT BUILD FROM deriveCram()'s OUTPUT, the other fix the audit offered: because it would be
   the one thing this strip was designed not to be. The chips are the titles <deep-cram> ACTUALLY
   RENDERED (see cramSections above) -- there is no second list, so an index cannot drift from a
   corpus that authors different sections per topic. Deriving them separately buys the same timing
   by construction and pays for it with exactly that drift risk, plus a second derive of the
   heaviest content in the app. The observer keeps "it reads the sheet, it does not describe it"
   intact and fixes the mechanism anyway, so there is nothing to trade. */
let cramJumpWatch = null;
function stopCramJumpWatch() {
  if (cramJumpWatch) { cramJumpWatch.disconnect(); cramJumpWatch = null; }
}
function buildCramJump(tries) {
  const strip = document.getElementById('cramjump');
  const body = document.getElementById('cram');
  if (!strip || !body) return;
  const secs = cramSections();
  if (secs.length) { stopCramJumpWatch(); renderCramJump(secs); return; }
  const host = cramov.querySelector('deep-cram');
  const root = host && host.shadowRoot;
  if (!root) {
    /* No shadow root means the element has not been UPGRADED yet -- there is nothing to observe,
       so acquiring it is the one thing still on a frame clock. Bounded exactly as before, and on
       giving up it clears the strip rather than leaving stale chips, which is the same terminal
       state the old retry reached. */
    if ((tries || 0) < 30) { requestAnimationFrame(function () { buildCramJump((tries || 0) + 1); }); return; }
    renderCramJump(secs);
    return;
  }
  if (cramJumpWatch) return;                 /* already watching this open */
  cramJumpWatch = new MutationObserver(function () {
    const rendered = cramSections();
    /* An empty root means the render has not landed yet -- keep watching. Once anything is in
       there the sheet has rendered, so index it if it carried sections and clear if it genuinely
       carried none; either way stop watching. A sheet with no sections costs one mutation and
       stops, where the old loop cost 30 frames. */
    if (!rendered.length && !root.firstElementChild) return;
    stopCramJumpWatch();
    renderCramJump(rendered);
  });
  cramJumpWatch.observe(root, { childList: true, subtree: true });
}
function renderCramJump(secs) {
  const strip = document.getElementById('cramjump');
  const body = document.getElementById('cram');
  if (!strip || !body) return;
  /* Fewer than two sections is not an index, it is decoration -- render nothing rather than a
     one-chip strip that costs a row and answers no question. */
  if (secs.length < 2) { strip.textContent = ''; return; }
  /* textContent, not an innerHTML concat. The labels are text ALREADY DECODED out of the rendered
     sheet, so re-inserting them as markup would re-encode every "&" and "<" the corpus contains --
     which is precisely the class test/entity_leak.cjs exists to catch (a "->" chip arriving on
     screen as "&rarr;"). Building the node puts the string back exactly as it was read. */
  strip.textContent = '';
  for (let i = 0; i < secs.length; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-i', String(i));
    b.textContent = secs[i].label;
    strip.appendChild(b);
  }
  strip.onclick = function (event) {
    const btn = event.target.closest('button');
    if (!btn) return;
    const s = secs[+btn.getAttribute('data-i')];
    if (!s) return;
    /* delta between the two live rects == exactly how far the body must scroll, whatever the
       panel's own padding is and whichever side of the shadow boundary each element sits on */
    body.scrollTop += (s.el.getBoundingClientRect().top - body.getBoundingClientRect().top);
    const on = strip.querySelector('button.on');
    if (on) on.classList.remove('on');
    btn.classList.add('on');
  };
}
function openCram() {
  ovShow(cramov);
  cramov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  /* AFTER ovShow, never before: <deep-cram> renders lazily and gates on `.cram-ov.open`, so a
     strip built one line earlier would index an empty shadow root and silently render nothing. */
  buildCramJump();
  /* bind the "p = print" shortcut once, the first time the sheet opens */
  if (!cramKeyBound) {
    document.addEventListener('keydown', function (event) {
      if (!cramov.classList.contains('open')) return;
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        document.body.classList.remove('print-session');
        try { window.print(); } catch (_) {}
      }
    });
    cramKeyBound = true;
  }
}
function closeCram() {
  ovHide(cramov);
  cramov.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  /* A sheet closed before it ever rendered would otherwise leave the watcher attached to a shadow
     root nobody is looking at; the next open re-arms it. */
  stopCramJumpWatch();
}
document.getElementById('cramopen').onclick = openCram;
document.getElementById('cramx').onclick = closeCram;

function openPlan() {
  const planOverlay = document.getElementById('planov');
  ovShow(planOverlay);
  planOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closePlan() {
  const planOverlay = document.getElementById('planov');
  ovHide(planOverlay);
  planOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function openScope() {
  const scopeOverlay = document.getElementById('scopeov');
  ovShow(scopeOverlay);
  scopeOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeScope() {
  const scopeOverlay = document.getElementById('scopeov');
  ovHide(scopeOverlay);
  scopeOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function openKeys() {
  const keyOverlay = document.getElementById('keyov');
  ovShow(keyOverlay);
  keyOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeKeys() {
  const keyOverlay = document.getElementById('keyov');
  ovHide(keyOverlay);
  keyOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
document.getElementById('planopen').onclick = openPlan;
document.getElementById('scopeopen').onclick = openScope;
document.getElementById('scopex').onclick = closeScope;
document.getElementById('keyopen').onclick = openKeys;
document.getElementById('keyx').onclick = closeKeys;
document.getElementById('planx').onclick = closePlan;

/* light/dark theme toggle: syncThemeButton() reflects the current data-theme
   onto the toggle's pressed state, its on/off label, and the theme-color meta. */
(function () {
  const docEl = document.documentElement;
  const toggleBtn = document.getElementById('themetog');
  function syncThemeButton() {
    const isDark = docEl.dataset.theme === 'dark';
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      const stateLabel = toggleBtn.querySelector('.tt-state');
      if (stateLabel) stateLabel.textContent = isDark ? 'on' : 'off';
    }
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) themeColorMeta.setAttribute('content', isDark ? '#15141A' : '#FAF9F5');
  }
  syncThemeButton();
  if (toggleBtn) {
    toggleBtn.onclick = function () {
      docEl.dataset.theme = docEl.dataset.theme === 'dark' ? 'light' : 'dark';
      syncThemeButton();
      if (typeof Store !== 'undefined' && Store.set) Store.set('theme', docEl.dataset.theme);
    };
  }
})();

document.getElementById('cramprint').onclick = function () {
  document.body.classList.remove('print-session');
  try { window.print(); } catch (e) {}
};
window.addEventListener('afterprint', function () {
  document.body.classList.remove('print-session');
});
