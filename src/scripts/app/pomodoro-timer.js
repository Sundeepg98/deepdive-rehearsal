/* ===== PomodoroTimer =====
   Focus timer for interview practice sessions.
   25-min work / 5-min break cycle.
   Features:
   - Display in sidebar with play/pause/reset
   - Visual ring countdown
   - Audio notification on complete
   - Persisted in sessionStorage
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var WORK = 25 * 60, BREAK = 5 * 60;
  var seconds = WORK, isRunning = false, isWork = true, interval = null;
  var ring = null, timeText = null, playBtn = null;

  function fmt(s) {
    var m = Math.floor(s / 60), sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function create() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    var wrap = document.createElement('div');
    wrap.id = '_pomodoro';
    wrap.style.cssText = 'padding:10px 11px;margin-top:4px;border-top:1px solid var(--bd)';

    var label = document.createElement('div');
    label.textContent = 'Focus Timer';
    label.style.cssText = 'font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--mut);margin-bottom:8px';

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '36'); svg.setAttribute('height', '36');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.style.cssText = 'transform:rotate(-90deg);flex:none';

    var circ = 2 * Math.PI * 15;
    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', '18'); bg.setAttribute('cy', '18'); bg.setAttribute('r', '15');
    bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#E8E4DC');
    bg.setAttribute('stroke-width', '3');

    ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', '18'); ring.setAttribute('cy', '18'); ring.setAttribute('r', '15');
    ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', 'var(--teal)');
    ring.setAttribute('stroke-width', '3'); ring.setAttribute('stroke-linecap', 'round');
    ring.setAttribute('stroke-dasharray', circ);
    ring.style.cssText = 'transition:stroke-dashoffset .5s ease';

    svg.appendChild(bg); svg.appendChild(ring);

    timeText = document.createElement('span');
    timeText.textContent = fmt(WORK);
    timeText.style.cssText = 'font-size:14px;font-weight:700;font-family:var(--mono);color:var(--ink);flex:1';

    playBtn = document.createElement('button');
    playBtn.textContent = '\u25B6';
    playBtn.setAttribute('aria-label', 'Start timer');
    playBtn.style.cssText = 'width:28px;height:28px;border-radius:50%;border:0;background:var(--teal);color:#fff;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background .2s ease';
    playBtn.addEventListener('click', toggle);

    var resetBtn = document.createElement('button');
    resetBtn.textContent = '\u21BB';
    resetBtn.setAttribute('aria-label', 'Reset timer');
    resetBtn.style.cssText = 'width:24px;height:24px;border-radius:50%;border:0;background:var(--bd);color:var(--mut);font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0';
    resetBtn.addEventListener('click', reset);

    row.appendChild(svg); row.appendChild(timeText);
    row.appendChild(playBtn); row.appendChild(resetBtn);
    wrap.appendChild(label); wrap.appendChild(row);
    sidebar.appendChild(wrap);

    updateRing();
  }

  function updateRing() {
    if (!ring) return;
    var total = isWork ? WORK : BREAK;
    var circ = 2 * Math.PI * 15;
    ring.setAttribute('stroke-dashoffset', circ * (1 - seconds / total));
    ring.setAttribute('stroke', isWork ? 'var(--teal)' : 'var(--amber)');
  }

  function tick() {
    seconds--;
    if (seconds <= 0) {
      isWork = !isWork;
      seconds = isWork ? WORK : BREAK;
      if (window.showToast) window.showToast((isWork ? 'Break over! Focus time.' : 'Focus done! Take a break.'), 'success');
    }
    if (timeText) timeText.textContent = fmt(seconds);
    updateRing();
  }

  function toggle() {
    if (isRunning) {
      clearInterval(interval); isRunning = false;
      playBtn.textContent = '\u25B6';
    } else {
      interval = setInterval(tick, 1000); isRunning = true;
      playBtn.textContent = '\u2759\u2759';
    }
  }

  function reset() {
    clearInterval(interval); isRunning = false;
    isWork = true; seconds = WORK;
    if (timeText) timeText.textContent = fmt(WORK);
    if (playBtn) playBtn.textContent = '\u25B6';
    updateRing();
  }

  setTimeout(create, 1700);
})();
