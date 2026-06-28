/* ===== ProgressRing =====
   SVG circular progress ring showing session completion.
   Shows in sidebar, updates as user navigates through modules.
   Usage: Auto-initializes.
*/
(function () {
  'use strict';

  var TOTAL = 9;

  function create() {
    var progressDiv = document.getElementById('_progress-tracker');
    if (!progressDiv) return;
    if (progressDiv.querySelector('._ring-wrap')) return;

    var wrap = document.createElement('div');
    wrap.className = '_ring-wrap';
    wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:8px';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '32');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.style.cssText = 'transform:rotate(-90deg);flex:none';

    var r = 13, c = 16;
    var circ = 2 * Math.PI * r;

    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', c); bg.setAttribute('cy', c); bg.setAttribute('r', r);
    bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#E8E4DC');
    bg.setAttribute('stroke-width', '3');

    var fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fill.setAttribute('cx', c); fill.setAttribute('cy', c); fill.setAttribute('r', r);
    fill.setAttribute('fill', 'none'); fill.setAttribute('stroke', 'var(--acc)');
    fill.setAttribute('stroke-width', '3');
    fill.setAttribute('stroke-linecap', 'round');
    fill.setAttribute('stroke-dasharray', circ);
    fill.setAttribute('stroke-dashoffset', circ);
    fill.id = '_progress-ring-fill';
    fill.style.cssText = 'transition:stroke-dashoffset .5s cubic-bezier(.22,.61,.36,1)';

    svg.appendChild(bg);
    svg.appendChild(fill);

    var pct = document.createElement('span');
    pct.id = '_progress-ring-pct';
    pct.textContent = '0%';
    pct.style.cssText = 'font-size:12px;font-weight:700;color:var(--acc);font-family:var(--mono)';

    wrap.appendChild(svg);
    wrap.appendChild(pct);
    progressDiv.appendChild(wrap);

    update(1);
  }

  function update(visited) {
    var fill = document.getElementById('_progress-ring-fill');
    var pct = document.getElementById('_progress-ring-pct');
    if (!fill) return;
    var circ = 2 * Math.PI * 13;
    var p = Math.min(visited / TOTAL, 1);
    fill.setAttribute('stroke-dashoffset', circ * (1 - p));
    if (pct) pct.textContent = Math.round(p * 100) + '%';
  }

  var visited = new Set();
  document.addEventListener('routechange', function (e) {
    var v = e.detail && e.detail.view ? e.detail.view : '';
    if (v) visited.add(v);
    create();
    update(visited.size);
  });

  setTimeout(create, 1500);
})();
