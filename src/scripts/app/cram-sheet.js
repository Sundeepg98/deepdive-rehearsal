/* ============ CRAM SHEET ============ */
/* Show/hide wiring for several overlays (cram sheet, game plan, scope-first,
   keyboard shortcuts) plus the light/dark theme toggle and the print buttons.
   Each open/close pair calls the shared ovShow/ovHide (defined in
   mock-run/logic.js) and toggles aria-hidden + the body scroll-lock. */

var cramov = document.getElementById('cramov'); /* SHARED: the keyboard handler in numbers-nalsd.js reads this to see if the cram overlay is open */
let cramKeyBound = false;

function openCram() {
  ovShow(cramov);
  cramov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
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
