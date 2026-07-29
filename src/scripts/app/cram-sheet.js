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
   still empty for another frame or two while the observer fires. Building the strip in that gap
   indexed an empty shadow root and rendered nothing -- silently, on the first open of every
   session, which is the only open most users get. MEASURED: 0 chips, a 16.7px empty strip.
   So: retry on animation frames until the sections exist, with a hard cap so a sheet that
   genuinely has none (or a future render failure) costs a few frames and then stops, rather than
   spinning. rAF, not setTimeout -- it is the same clock the render is waiting on. */
function buildCramJump(tries) {
  const strip = document.getElementById('cramjump');
  const body = document.getElementById('cram');
  if (!strip || !body) return;
  const secs = cramSections();
  if (!secs.length && (tries || 0) < 30) {
    requestAnimationFrame(function () { buildCramJump((tries || 0) + 1); });
    return;
  }
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
