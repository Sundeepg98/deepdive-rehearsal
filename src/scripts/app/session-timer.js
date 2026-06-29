/* ===== SessionTimer =====
   A countdown timer for timed mock sessions, shown in the header.
   - Counts down with a status dot that shifts green -> amber -> red
   - Pulses when time is critical; shows "Time!" when it hits zero
   - Driven by the API: SessionTimer.start(minutes) / SessionTimer.stop(), and
     it also listens for a "mockrunstart" event if the app chooses to dispatch
     one. (The mock-run overlay already has its own elapsed clock, so this is
     left opt-in rather than auto-attached -- see the integration notes.)

   Offline-safe: no network, storage, or permission calls. */
(function () {
  'use strict';

  var timerEl = null, interval = null, secondsLeft = 0, totalSeconds = 0;

  var COLORS = {
    teal:  { v: 'var(--teal)',  sh: 'rgba(15,110,86,.35)' },
    amber: { v: 'var(--amber)', sh: 'rgba(154,91,11,.35)' },
    red:   { v: 'var(--red)',   sh: 'rgba(163,45,45,.35)' }
  };

  function formatTime(s) {
    var m = Math.floor(s / 60), sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function tone() {
    var ratio = totalSeconds ? secondsLeft / totalSeconds : 0;
    if (ratio > 0.5) return COLORS.teal;
    if (ratio > 0.2) return COLORS.amber;
    return COLORS.red;
  }

  function create() {
    if (timerEl) return;
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;

    timerEl = document.createElement('div');
    timerEl.id = '_session-timer';
    timerEl.style.cssText = 'display:none;align-items:center;gap:8px;margin-top:10px;padding:5px 12px;background:var(--accbg);border:1px solid rgba(15,110,86,.15);border-radius:10px;font-family:var(--mono,monospace);font-size:14px;font-weight:700;color:var(--teal)';

    var ring = document.createElement('span');
    ring.id = '_timer-ring';
    ring.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--teal);box-shadow:0 0 6px rgba(15,110,86,.3)';

    var text = document.createElement('span');
    text.id = '_timer-text';
    text.textContent = '15:00';

    var stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.textContent = 'x';
    stopBtn.setAttribute('aria-label', 'Stop timer');
    stopBtn.style.cssText = 'width:18px;height:18px;border-radius:50%;border:0;background:rgba(0,0,0,.08);color:var(--mut);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-left:4px';
    stopBtn.addEventListener('click', stop);

    timerEl.appendChild(ring);
    timerEl.appendChild(text);
    timerEl.appendChild(stopBtn);
    hdr.appendChild(timerEl);

    if (!document.getElementById('_timer-keyframes')) {
      var style = document.createElement('style');
      style.id = '_timer-keyframes';
      style.textContent = '@keyframes timerPulse{0%,100%{box-shadow:0 0 6px rgba(163,45,45,.3)}50%{box-shadow:0 0 12px rgba(163,45,45,.5),0 0 20px rgba(163,45,45,.2)}}';
      document.head.appendChild(style);
    }
  }

  function start(minutes) {
    stop();
    create();
    if (!timerEl) return;
    totalSeconds = Math.max(1, Math.round((minutes || 15) * 60));
    secondsLeft = totalSeconds;
    timerEl.style.display = 'flex';
    render();
    interval = setInterval(tick, 1000);
  }

  function tick() {
    secondsLeft--;
    if (secondsLeft <= 0) {
      var txt = timerEl && timerEl.querySelector('#_timer-text');
      if (txt) { txt.textContent = 'Time!'; }
      if (timerEl) timerEl.style.color = 'var(--red)';
      clearInterval(interval); interval = null;
      setTimeout(stop, 2500);
      return;
    }
    render();
  }

  function render() {
    if (!timerEl) return;
    var txt = timerEl.querySelector('#_timer-text');
    var ring = timerEl.querySelector('#_timer-ring');
    if (txt) txt.textContent = formatTime(secondsLeft);
    if (ring) {
      var c = tone();
      ring.style.background = c.v;
      ring.style.boxShadow = '0 0 6px ' + c.sh;
      ring.style.animation = (secondsLeft / totalSeconds < 0.2) ? 'timerPulse 1s ease-in-out infinite' : '';
    }
  }

  function stop() {
    if (interval) { clearInterval(interval); interval = null; }
    if (timerEl) { timerEl.style.display = 'none'; timerEl.style.color = 'var(--teal)'; }
    secondsLeft = 0;
  }

  document.addEventListener('mockrunstart', function (e) {
    var mins = (e && e.detail && e.detail.minutes) ? e.detail.minutes : 15;
    start(mins);
  });

  window.SessionTimer = { start: start, stop: stop };
})();
