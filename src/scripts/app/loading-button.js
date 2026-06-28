/* ===== LoadingButton =====
   Adds spinner state to buttons during async operations.
   Features:
   - button.setLoading(true/false) API
   - Preserves button text, shows spinner
   - Disables button while loading
   - Auto-restores on completion
   Usage: Auto-initializes, adds setLoading to all buttons.
*/
(function () {
  'use strict';

  function setLoading(isLoading) {
    if (isLoading) {
      this.dataset._origText = this.textContent;
      this.textContent = '';
      this.disabled = true;
      this.style.opacity = '0.7';
      this.style.cursor = 'wait';

      var spinner = document.createElement('span');
      spinner.className = '_btn-spinner';
      spinner.style.cssText = 'display:inline-block;width:14px;height:14px;border:2px solid rgba(83,74,183,.2);border-top-color:var(--acc);border-radius:50%;animation:btnSpin .6s linear infinite';
      this.appendChild(spinner);
    } else {
      var spinner = this.querySelector('._btn-spinner');
      if (spinner) spinner.remove();
      if (this.dataset._origText) this.textContent = this.dataset._origText;
      this.disabled = false;
      this.style.opacity = '';
      this.style.cursor = '';
    }
  }

  // Add setLoading to all existing and future buttons
  HTMLButtonElement.prototype.setLoading = setLoading;

  if (!document.getElementById('_btn-spin-style')) {
    var style = document.createElement('style');
    style.id = '_btn-spin-style';
    style.textContent = '@keyframes btnSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }
})();
