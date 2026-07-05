/* ===== Pomodoro =====
   A 25/5 focus-and-break timer in the sidebar: an SVG ring countdown with
   play / pause / reset. On each phase change the ring flips teal (focus) ->
   amber (break), the label tracks the phase, and an optional short WebAudio
   tone marks the switch (best-effort; silently skipped if no AudioContext).

   A standalone sidebar widget with its own lifecycle -- a repeating focus rhythm
   that cycles forever -- distinct from the mock overlay's own elapsed clock.

   The phase keeps counting while the tab is hidden (a focus timer should track
   real time), so it intentionally opts out of the page-visibility pause.

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var WORK = 25 * 60, BREAK = 5 * 60, R = 15, CIRC = 2 * Math.PI * R;
  var seconds = WORK, running = false, isWork = true, interval = null;
  var ring = null, timeText = null, phaseText = null, playBtn = null, audio = null;

  function fmt(s) {
    var m = Math.floor(s / 60), x = s % 60;
    return m + ':' + (x < 10 ? '0' : '') + x;
  }

  function ensureAudio() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audio) audio = new Ctx();
      if (audio.state === 'suspended' && audio.resume) audio.resume();
    } catch (e) {}
  }

  function cue() {
    /* tiny self-contained phase-change tone -- replaces the old window.showToast */
    try {
      if (!audio) return;
      var osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = isWork ? 660 : 440;
      gain.gain.value = 0.04;
      osc.connect(gain); gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.18);
    } catch (e) {}
  }

  function paint() {
    if (!ring) return;
    var total = isWork ? WORK : BREAK;
    ring.setAttribute('stroke-dashoffset', String(CIRC * (1 - seconds / total)));
    ring.setAttribute('stroke', isWork ? 'var(--teal)' : 'var(--amber)');
    if (timeText) timeText.textContent = fmt(seconds);
    if (phaseText) phaseText.textContent = isWork ? 'Focus' : 'Break';
  }

  function tick() {
    seconds--;
    if (seconds <= 0) {
      isWork = !isWork;
      seconds = isWork ? WORK : BREAK;
      cue();
    }
    paint();
  }

  function setPlayUI() {
    if (!playBtn) return;
    playBtn.textContent = running ? '\u2759\u2759' : '\u25B6';
    playBtn.setAttribute('aria-label', running ? 'Pause focus timer' : 'Start focus timer');
  }

  function toggle() {
    if (running) {
      clearInterval(interval); interval = null; running = false;
    } else {
      ensureAudio();
      interval = setInterval(tick, 1000); running = true;
    }
    setPlayUI();
  }

  function reset() {
    clearInterval(interval); interval = null; running = false;
    isWork = true; seconds = WORK;
    setPlayUI();
    paint();
  }

  function svgCircle(stroke) {
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', '18'); c.setAttribute('cy', '18'); c.setAttribute('r', String(R));
    c.setAttribute('fill', 'none'); c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', '3');
    return c;
  }

  function build() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.getElementById('pomodoro')) return;
    var mockbar = sidebar.querySelector('.mockbar');

    var wrap = document.createElement('div');
    wrap.id = 'pomodoro'; wrap.className = 'pomodoro';

    var head = document.createElement('div');
    head.className = 'pomodoro-h';
    head.textContent = 'Focus timer';

    var row = document.createElement('div');
    row.className = 'pomodoro-row';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.setAttribute('class', 'pomodoro-ring');
    svg.setAttribute('aria-hidden', 'true');
    svg.appendChild(svgCircle('var(--bd)'));
    ring = svgCircle('var(--teal)');
    ring.setAttribute('stroke-linecap', 'round');
    ring.setAttribute('stroke-dasharray', String(CIRC));
    svg.appendChild(ring);

    var meta = document.createElement('div');
    meta.className = 'pomodoro-meta';
    timeText = document.createElement('span');
    timeText.className = 'pomodoro-time';
    timeText.textContent = fmt(WORK);
    phaseText = document.createElement('span');
    phaseText.className = 'pomodoro-phase';
    phaseText.textContent = 'Focus';
    meta.appendChild(timeText); meta.appendChild(phaseText);

    playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'pomodoro-btn pomodoro-play';
    playBtn.addEventListener('click', toggle);

    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'pomodoro-btn pomodoro-reset';
    resetBtn.textContent = '\u21BB';
    resetBtn.setAttribute('aria-label', 'Reset focus timer');
    resetBtn.addEventListener('click', reset);

    row.appendChild(svg); row.appendChild(meta); row.appendChild(playBtn); row.appendChild(resetBtn);
    wrap.appendChild(head); wrap.appendChild(row);
    sidebar.insertBefore(wrap, mockbar || null);

    setPlayUI();
    paint();
  }

  build();
})();
