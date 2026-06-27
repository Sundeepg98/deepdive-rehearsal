/* ===== SessionTimer =====
   A visual countdown timer for mock interview sessions.
   Displays in the header area when a mock run is active.
   Features:
   - Countdown with visual ring
   - Color changes as time runs low (green → amber → red)
   - Pulse animation when time is critical
   - Auto-dismiss when done
*/
(function () {
  'use strict';

  var timerEl = null;
  var interval = null;
  var secondsLeft = 0;
  var totalSeconds = 0;

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function getColor() {
    var ratio = secondsLeft / totalSeconds;
    if (ratio > 0.5) return 'var(--teal)';
    if (ratio > 0.2) return 'var(--amber)';
    return 'var(--red)';
  }

  function create() {
    if (timerEl) return;
    var hdr = document.querySelector('.hdr');
    if (!hdr) return;

    timerEl = document.createElement('div');
    timerEl.id = '_session-timer';
    timerEl.style.cssText = 'display:none;align-items:center;gap:8px;margin-left:auto;padding:5px 12px;background:linear-gradient(135deg,rgba(15,110,86,.08) 0%,rgba(15,110,86,.03) 100%);border:1px solid rgba(15,110,86,.15);border-radius:10px;font-family:var(--mono);font-size:14px;font-weight:700;color:var(--teal);animation:timerIn .3s ease';

    var ring = document.createElement('span');
    ring.id = '_timer-ring';
    ring.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--teal);box-shadow:0 0 6px rgba(15,110,86,.3)';

    var text = document.createElement('span');
    text.id = '_timer-text';
    text.textContent = '15:00';

    var stopBtn = document.createElement('button');
    stopBtn.innerHTML = '&times;';
    stopBtn.setAttribute('aria-label', 'Stop timer');
    stopBtn.style.cssText = 'width:18px;height:18px;border-radius:50%;border:0;background:rgba(0,0,0,.08);color:var(--mut);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-left:4px';
    stopBtn.addEventListener('click', stop);

    timerEl.appendChild(ring);
    timerEl.appendChild(text);
    timerEl.appendChild(stopBtn);
    hdr.style.display = 'flex';
    hdr.style.alignItems = 'center';
    hdr.appendChild(timerEl);

    if (!document.getElementById('_timer-keyframes')) {
      var style = document.createElement('style');
      style.id = '_timer-keyframes';
      style.textContent = '@keyframes timerIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}' +
        '@keyframes timerPulse{0%,100%{box-shadow:0 0 6px rgba(163,45,45,.3)}50%{box-shadow:0 0 12px rgba(163,45,45,.5),0 0 20px rgba(163,45,45,.2)}}';
      document.head.appendChild(style);
    }
  }

  function start(minutes) {
    stop();
    create();
    totalSeconds = minutes * 60;
    secondsLeft = totalSeconds;
    timerEl.style.display = 'flex';
    update();
    interval = setInterval(update, 1000);
  }

  function update() {
    secondsLeft--;
    if (secondsLeft <= 0) {
      stop();
      if (window.showToast) window.showToast('Time is up!', 'error');
      return;
    }
    var text = timerEl.querySelector('#_timer-text');
    var ring = timerEl.querySelector('#_timer-ring');
    if (text) text.textContent = formatTime(secondsLeft);
    if (ring) {
      var color = getColor();
      ring.style.background = color;
      ring.style.boxShadow = '0 0 6px ' + color.replace(')', ',.3)').replace('var(', 'rgba(').replace('--teal)', '15,110,86,0.3)').replace('--amber)', '154,91,11,0.3)').replace('--red)', '163,45,45,0.3)');
      if (secondsLeft / totalSeconds < 0.2) {
        ring.style.animation = 'timerPulse 1s ease-in-out infinite';
      }
    }
  }

  function stop() {
    if (interval) { clearInterval(interval); interval = null; }
    if (timerEl) timerEl.style.display = 'none';
    secondsLeft = 0;
  }

  // Auto-start timer when mock run opens
  document.addEventListener('mockrunstart', function () { start(15); });

  window.SessionTimer = { start: start, stop: stop };
})();
