/* Copy link (O2): copies a shareable deep-link to the current topic + view.
   Tries the async clipboard API, then falls back to a hidden-textarea
   execCommand -- which still works under file://, where the async clipboard
   API is frequently unavailable. Brief in-button feedback, no storage. */
(function () {
  var btn = document.getElementById('copylink');
  if (!btn) return;
  var label = btn.querySelector('.mb-t'), orig = label ? label.textContent : 'Copy link', tmr = null;
  function flash(msg) {
    if (!label) return;
    label.textContent = msg;
    if (tmr) clearTimeout(tmr);
    tmr = setTimeout(function () { label.textContent = orig; tmr = null; }, 1400);
  }
  function fallback(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, ta.value.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      flash(ok ? 'Copied' : 'Copy failed');
    } catch (e) { flash('Copy failed'); }
  }
  btn.addEventListener('click', function () {
    var text = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash('Copied'); }, function () { fallback(text); });
    } else { fallback(text); }
  });
})();
