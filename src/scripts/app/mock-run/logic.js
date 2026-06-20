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
   run's curveball + frame cue + interrupt set, start the 1s timer, bind the
   space/enter shortcuts once, then render the first beat. */
function openMock() {
  if (mockClock) { clearInterval(mockClock); mockClock = null; }
  mockBeat = 0;
  mockSec = 0;
  mockclockEl.textContent = '0:00';
  mockBeats[mockCurveIdx] = curveballPool[Math.floor(Math.random() * curveballPool.length)];
  mockBeats[mockFrameIdx].cue = framePool[Math.floor(Math.random() * framePool.length)];
  mockIntSet = mockInterrupt ? pickInterrupts() : {};
  ovShow(mockov);
  mockov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  mockClock = setInterval(function () {
    mockSec++;
    mockclockEl.textContent = mockFmt(mockSec);
  }, 1000);
  if (!mockEscBound) {
    document.addEventListener('keydown', function (event) {
      if (!mockov.classList.contains('open')) return;
      /* space reveals the next available answer button, in priority order */
      if (event.key === ' ') {
        event.preventDefault();
        const revealBtn = document.getElementById('mbrev');
        if (revealBtn && !revealBtn.disabled) { revealBtn.click(); return; }
        const interruptBtn = document.getElementById('mbirev');
        if (interruptBtn && !interruptBtn.disabled) { interruptBtn.click(); return; }
        const interruptBtn2 = document.getElementById('mbirev2');
        if (interruptBtn2 && !interruptBtn2.disabled) interruptBtn2.click();
        return;
      }
      /* enter / right-arrow advances to the next beat */
      if (event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        const nextBtn = document.getElementById('mbnext');
        if (nextBtn) nextBtn.click();
      }
    });
    mockEscBound = true;
  }
  renderMockBeat();
}

function closeMock() {
  ovHide(mockov);
  mockov.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (mockClock) { clearInterval(mockClock); mockClock = null; }
}