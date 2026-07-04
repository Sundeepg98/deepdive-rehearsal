/* Format a number of seconds as "M:SS". */
function mockFmt(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

/* SHARED overlay helpers (used by every overlay, here and in cram-sheet.js).
   Each overlay element carries a private "_exT" timeout handle used to force
   the close animation to finish even if the animationend event never fires. */
function ovShow(overlay) {
  if (overlay._exT) { clearTimeout(overlay._exT); overlay._exT = null; }
  overlay.classList.remove('closing');
  overlay.classList.add('open');
}
function ovHide(overlay) {
  if (!overlay.classList.contains('open')) { overlay.classList.remove('closing'); return; }
  overlay.classList.add('closing');
  const panel = overlay.querySelector('.mock-panel,.cram-panel') || overlay;
  const finishHide = function () {
    overlay.classList.remove('open', 'closing');
    if (overlay._exT) { clearTimeout(overlay._exT); overlay._exT = null; }
    panel.removeEventListener('animationend', finishHide);
  };
  panel.addEventListener('animationend', finishHide, { once: true });
  overlay._exT = setTimeout(finishHide, 500); /* fallback if animationend never fires */
}

/* Open the mock-interview overlay: reset the clock/beat, randomly pick this
   run's curveball + frame cue + interrupt set, start the timer, bind the
   space/enter shortcuts ( AbortController for clean removal ), then render
   the first beat. Timer uses performance.now() + requestAnimationFrame for
   drift-free timing across a 22-minute mock run. */
function openMock() {
  closeMockClock();
  mockBeat = 0;
  mockSec = 0;
  mockclockEl.textContent = '0:00';
  mockBeats[mockCurveIdx] = curveballPool[Math.floor(Math.random() * curveballPool.length)];
  mockBeats[mockFrameIdx].cue = framePool[Math.floor(Math.random() * framePool.length)];
  mockIntSet = mockInterrupt ? pickInterrupts() : {};
  ovShow(mockov);
  mockov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  /* Drift-free timer: record start timestamp, then each frame compute elapsed */
  mockStartMs = performance.now();
  function tickMock() {
    if (!mockov.classList.contains('open')) return;
    var elapsed = Math.floor((performance.now() - mockStartMs) / 1000);
    if (elapsed !== mockSec) { mockSec = elapsed; mockclockEl.textContent = mockFmt(mockSec); }
    mockClock = requestAnimationFrame(tickMock);
  }
  mockClock = requestAnimationFrame(tickMock);
  /* Bind keyboard shortcuts with AbortController so they can be cleanly removed */
  if (!mockKeyCtrl) mockKeyCtrl = new AbortController();
  document.addEventListener('keydown', function (event) {
    if (!mockov.classList.contains('open')) return;
    if (event.key === ' ') {
      event.preventDefault();
      var revealBtn = mockRoot.getElementById('mbrev');
      if (revealBtn && !revealBtn.disabled) { revealBtn.click(); return; }
      var interruptBtn = mockRoot.getElementById('mbirev');
      if (interruptBtn && !interruptBtn.disabled) { interruptBtn.click(); return; }
      var interruptBtn2 = mockRoot.getElementById('mbirev2');
      if (interruptBtn2 && !interruptBtn2.disabled) interruptBtn2.click();
      return;
    }
    if (event.key === 'Enter' || event.key === 'ArrowRight') {
      event.preventDefault();
      var nextBtn = mockRoot.getElementById('mbnext');
      if (nextBtn) nextBtn.click();
    }
  }, { signal: mockKeyCtrl.signal });
  renderMockBeat();
}

function closeMockClock() {
  if (mockClock) { cancelAnimationFrame(mockClock); mockClock = null; }
}
function closeMock() {
  ovHide(mockov);
  mockov.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  closeMockClock();
  if (mockKeyCtrl) { mockKeyCtrl.abort(); mockKeyCtrl = null; }
}

/* ===== MOCK RUN as a shadow component =====
   The body moves into this shadow; renderMockBeat/renderMockEnd (in mixed-fire.js)
   and openMock's keyboard shortcuts target it via the mockbody global / mockRoot.
   The frame, clock, open/close, and the shared ovShow/ovHide stay light. */
var MOCK_STYLE = `
.mb-prog{font:800 11px -apple-system,sans-serif;letter-spacing:.6px;color:var(--mut2)}
.mb-tag{display:inline-block;margin-left:9px;font-size:10px;font-weight:800;letter-spacing:.6px;color:var(--acc);background:var(--accbg);border-radius:5px;padding:2px 9px;vertical-align:middle}
.mb-cue{font-size:16.5px;font-weight:700;color:var(--ink);line-height:1.42;margin:13px 0 0}
.mb-task{font-size:13px;color:var(--mut);line-height:1.55;margin:10px 0 0;font-style:italic}
.mb-task b{color:var(--accink);font-style:normal}
.mb-model{display:none;margin:16px 0 0;padding:15px 17px;background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border-radius:12px;font-size:13.5px;color:var(--ink);line-height:1.62;box-shadow:0 1px 6px -2px rgba(83,74,183,.1)}
.mb-model.show{display:block;animation:pop .24s ease}
.mb-model b{color:var(--accink);font-weight:700}
.mb-model code{font-size:11px}
.mb-ml{font:800 10px -apple-system,sans-serif;letter-spacing:.6px;color:var(--acc);text-transform:uppercase;margin-bottom:7px}
.mb-act{display:flex;gap:9px;align-items:center;margin:17px 0 0}
.mb-keys{margin-top:13px;font-size:10.5px;color:var(--mut2);text-align:center;letter-spacing:.2px}
.mb-rev,.mb-next{font:700 12.5px -apple-system,sans-serif;padding:9px 16px;border-radius:9px;cursor:pointer;transition:transform .15s ease,box-shadow .2s ease,border-color .2s ease,background .2s ease}
.mb-rev:hover,.mb-next:hover{transform:translateY(-1px);box-shadow:0 4px 12px -3px rgba(83,74,183,.12)}
.mb-rev:active,.mb-next:active{transform:translateY(1px) scale(.98)}
.mb-rev{border:1px solid #cfc7f0;background:var(--accbg);color:var(--accink)}
.mb-rev:disabled{opacity:.5;cursor:default}
.mb-next{border:0;background:var(--acc);color:var(--mb-next-fg);margin-left:auto}
.mb-next:hover{background:var(--accink)}
.mb-end{text-align:center;padding:6px 2px}
.mb-end-h{font:800 19px -apple-system,sans-serif;color:var(--accink)}
.mb-end-t{font-size:13.5px;color:var(--mut);margin:9px auto 0;max-width:420px;line-height:1.56}
.mb-end-time{font-weight:800;color:var(--acc);font-family:ui-monospace,Menlo,monospace}
.mb-score-q{font-size:13px;color:var(--ink);font-weight:600;margin:19px 0 11px}
.mb-score{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.mb-score button{width:40px;height:40px;border-radius:10px;border:1.5px solid var(--bd);background:linear-gradient(135deg,var(--card) 0%,rgba(83,74,183,.02) 100%);color:var(--ink);font:800 14px ui-monospace,monospace;cursor:pointer;transition:transform .15s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease}
.mb-score button:hover{border-color:var(--acc);color:var(--acc);transform:translateY(-2px);box-shadow:0 4px 12px -3px rgba(83,74,183,.15)}
.mb-verdict{display:none;margin:15px auto 0;max-width:430px;padding:14px 17px;border-radius:11px;font-size:13px;line-height:1.55;box-shadow:0 1px 6px -2px rgba(83,74,183,.08)}
.mb-verdict.show{display:block;animation:pop .24s ease}
.mb-verdict b{font-weight:700}
.mb-again{display:flex;gap:9px;justify-content:center;margin-top:19px}
.mb-again button{font:700 12px -apple-system,sans-serif;padding:9px 17px;border-radius:9px;cursor:pointer;border:1.5px solid var(--bd);background:linear-gradient(135deg,var(--card) 0%,rgba(83,74,183,.02) 100%);color:var(--mut);transition:transform .15s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease}
.mb-again button:hover{border-color:var(--acc);color:var(--accink);transform:translateY(-1px);box-shadow:0 4px 12px -3px rgba(83,74,183,.1)}
.mb-again button:active{transform:translateY(1px) scale(.98)}
.mb-again button:hover{border-color:var(--acc);color:var(--acc)}
.mb-again .pri{border:0;background:var(--acc);color:#fff}
.mb-again .pri:hover{background:var(--accink);color:#fff}
.mb-end-int{margin-top:12px;font-size:12px;line-height:1.5;color:var(--amber);background:linear-gradient(135deg,var(--amberbg) 0%,rgba(176,108,20,.04) 100%);border:1px solid #e6c89a;border-radius:10px;padding:10px 14px}
.mb-end-cv{margin-top:12px;font-size:12px;line-height:1.5;color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border:1px solid var(--mb-cv-bd);border-radius:10px;padding:10px 14px}
.mb-end-int b{font-weight:800}
.mb-int{display:none;margin:14px 0 0;padding:14px 17px;background:linear-gradient(135deg,var(--redbg) 0%,rgba(239,68,68,.04) 100%);border:1px solid #e8c5c0;border-left:3px solid var(--red);border-radius:12px;box-shadow:0 1px 6px -2px rgba(239,68,68,.1)}
.mb-int.show{display:block;animation:pop .24s ease}
.mb-int-h{font:800 10px -apple-system,sans-serif;letter-spacing:.5px;color:var(--red);text-transform:uppercase;margin-bottom:7px}
.mb-int-q{font-size:14px;font-weight:700;color:var(--mb-intq-fg);line-height:1.46}
.mb-irev{margin-top:12px;border:1.5px solid var(--mb-irev-bd);background:linear-gradient(135deg,var(--mb-irev-bg) 0%,rgba(239,68,68,.04) 100%);color:var(--red);font:700 11.5px -apple-system,sans-serif;padding:8px 14px;border-radius:9px;cursor:pointer;transition:transform .12s ease,background .15s ease,color .15s ease,border-color .15s ease}
.mb-irev:hover{background:var(--red);color:#fff;border-color:var(--red);transform:translateY(-1px)}
.mb-irev:active{transform:translateY(1px) scale(.98)}
.mb-irev:disabled{opacity:.5;cursor:default;background:var(--mb-irev-bg);color:var(--red);transform:none}
.mb-int-a{display:none;margin-top:12px;padding-top:12px;border-top:1px dashed #e3bdb8;font-size:13px;color:var(--ink);line-height:1.6}
.mb-int2{display:none;margin-top:13px;padding-top:13px;border-top:1px solid #e8c5c0}
.mb-int2.show{display:block;animation:pop .24s ease}
.mb-int-h2{font:800 10px -apple-system,sans-serif;letter-spacing:.5px;color:var(--red);text-transform:uppercase;margin-bottom:7px}
.mb-int-a.show{display:block}
.mb-int-al{font:800 9.5px -apple-system,sans-serif;letter-spacing:.5px;color:var(--teal);text-transform:uppercase;margin-bottom:6px}
.mb-rev{transition:filter .12s ease}
.mb-rev:hover{filter:brightness(.96)}
.mb-rev:active,.mb-next:active,.mb-again:active,.pri:active{transform:translateY(1px);filter:brightness(.96)}`;
class DeepMockRun extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, MOCK_SHEET];
    root.innerHTML = '<style>' + MOCK_STYLE + '</style><div style="display:flex;flex-direction:column;height:100%"><div class="mock-body" id="mockbody" tabindex="0" role="region" aria-label="Mock run content" style="overflow-y:auto;flex:1;min-height:0;padding:18px 20px 24px"></div></div>';
    mockbody = root.getElementById('mockbody');
    mockRoot = root;
  }
}
customElements.define('deep-mock-run', DeepMockRun);
