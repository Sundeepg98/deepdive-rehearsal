/* ===== SearchOverlay =====
   Global search across all module content.
   Trigger: Cmd+K (or Ctrl+K) to open.
   Features:
   - Fuzzy search across all 9 module titles and keywords
   - Keyboard navigation (ArrowUp/ArrowDown, Enter)
   - Highlighted results with jump-to navigation
   - Smooth open/close animations
   - Click outside or Escape to close

   Usage:
     SearchOverlay.open();   // Programmatically open
     SearchOverlay.close();  // Close overlay
*/
(function () {
  'use strict';

  var overlayEl = null;
  var inputEl = null;
  var resultsEl = null;
  var isOpen = false;
  var selectedIndex = -1;
  var allResults = [];

  // Search index: module data
  var MODULES = [
    { id: 'walk', label: 'Walkthrough', keywords: 'mechanics structure flow interview', desc: 'Step-by-step interview flow' },
    { id: 'drill', label: 'Probe Drill', keywords: 'graded scoring rubric practice', desc: 'Graded practice with scoring rubric' },
    { id: 'wb', label: 'Whiteboard', keywords: 'design reconstruct architecture system', desc: 'Reconstruct the design from scratch' },
    { id: 'sys', label: 'System Map', keywords: 'map diagram components services', desc: 'Visual system architecture map' },
    { id: 'trade', label: 'Trade-offs', keywords: 'tradeoff comparison decision pros cons', desc: 'Compare design alternatives' },
    { id: 'model', label: 'Model Answers', keywords: 'answer example sample solution', desc: 'Reference model answers' },
    { id: 'num', label: 'Numbers', keywords: 'metrics math estimation calculation', desc: 'Back-of-envelope calculations' },
    { id: 'rf', label: 'Red Flags', keywords: 'red flag warning mistake error', desc: 'Common mistakes to avoid' },
    { id: 'open', label: '30-Second', keywords: 'opener elevator pitch summary', desc: '30-second elevator pitch' }
  ];

  function createElements() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = '_search-overlay';
    overlayEl.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.35);backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease;display:none;align-items:flex-start;justify-content:center;padding-top:15vh';

    var box = document.createElement('div');
    box.style.cssText = 'width:560px;max-width:90vw;background:linear-gradient(180deg,#fff 0%,#FAF9F5 100%);border-radius:16px;box-shadow:0 24px 80px -16px rgba(0,0,0,.25),0 0 0 1px rgba(83,74,183,.08);overflow:hidden;transform:scale(.95) translateY(10px);transition:transform .3s cubic-bezier(.22,.61,.36,1)';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #E8E4DC';

    var icon = document.createElement('span');
    icon.textContent = '\u2318';
    icon.style.cssText = 'font-size:16px;color:var(--mut);opacity:.6';

    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'Search modules, topics, keywords...';
    inputEl.style.cssText = 'flex:1;border:0;outline:0;font-size:15px;background:transparent;color:var(--ink);font-family:inherit';
    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onInputKey);

    var shortcut = document.createElement('kbd');
    shortcut.textContent = 'ESC';
    shortcut.style.cssText = 'font-size:10px;font-family:monospace;background:#F0ECE4;border:1px solid #DDD7CD;border-radius:4px;padding:2px 6px;color:var(--mut)';

    header.appendChild(icon);
    header.appendChild(inputEl);
    header.appendChild(shortcut);

    resultsEl = document.createElement('div');
    resultsEl.style.cssText = 'max-height:320px;overflow-y:auto;padding:6px';

    box.appendChild(header);
    box.appendChild(resultsEl);
    overlayEl.appendChild(box);
    document.body.appendChild(overlayEl);

    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) close();
    });
  }

  function onInput() {
    var q = inputEl.value.trim().toLowerCase();
    if (q.length < 1) {
      renderResults([]);
      return;
    }
    var results = MODULES.filter(function (m) {
      return m.label.toLowerCase().includes(q) ||
             m.keywords.toLowerCase().includes(q) ||
             m.desc.toLowerCase().includes(q);
    }).map(function (m) {
      return { type: 'module', data: m };
    });
    renderResults(results);
  }

  function renderResults(results) {
    allResults = results;
    selectedIndex = results.length > 0 ? 0 : -1;
    resultsEl.innerHTML = '';

    if (results.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:24px;text-align:center;color:var(--mut);font-size:13px';
      empty.textContent = inputEl.value.trim() ? 'No results found' : 'Type to search across all modules...';
      resultsEl.appendChild(empty);
      return;
    }

    results.forEach(function (r, i) {
      var item = document.createElement('button');
      item.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;padding:10px 14px;border:0;border-radius:10px;background:' + (i === 0 ? 'rgba(83,74,183,.06)' : 'transparent') + ';cursor:pointer;transition:background .15s ease;margin-bottom:2px';
      item.innerHTML = '<span style="font-size:13.5px;font-weight:650;color:var(--ink)">' + r.data.label + '</span><span style="font-size:11px;color:var(--mut);margin-top:2px">' + r.data.desc + '</span>';
      item.addEventListener('mouseenter', function () { selectIndex(i); });
      item.addEventListener('click', function () { navigateTo(r.data.id); });
      resultsEl.appendChild(item);
    });
  }

  function selectIndex(i) {
    selectedIndex = i;
    var items = resultsEl.querySelectorAll('button');
    items.forEach(function (el, idx) {
      el.style.background = idx === i ? 'rgba(83,74,183,.08)' : 'transparent';
    });
  }

  function onInputKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectIndex(Math.min(selectedIndex + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectIndex(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (allResults[selectedIndex]) navigateTo(allResults[selectedIndex].data.id);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  function navigateTo(viewId) {
    close();
    if (window.Router) window.Router.navigate(viewId);
  }

  function open() {
    if (isOpen) return;
    createElements();
    isOpen = true;
    overlayEl.style.display = 'flex';
    requestAnimationFrame(function () {
      overlayEl.style.opacity = '1';
      overlayEl.firstElementChild.style.transform = 'scale(1) translateY(0)';
    });
    inputEl.value = '';
    inputEl.focus();
    renderResults([]);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlayEl.style.opacity = '0';
    overlayEl.firstElementChild.style.transform = 'scale(.95) translateY(10px)';
    setTimeout(function () {
      overlayEl.style.display = 'none';
    }, 250);
  }

  // Global keyboard shortcut
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      open();
    }
    if (e.key === 'Escape' && isOpen) {
      close();
    }
  });

  window.SearchOverlay = { open: open, close: close };
})();
