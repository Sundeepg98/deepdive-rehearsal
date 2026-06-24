/* ===== shared base styles for web components =====
   Foundational rules every componentized pane needs inside its shadow root,
   because global CSS does not cross the shadow boundary: the box-sizing reset,
   font smoothing, the card surface, the step heading classes, and the display
   font for headings. Defined ONCE as a constructable stylesheet and adopted by
   each component via adoptedStyleSheets, so there is no per-component duplication.
   Everything here is theme-independent or uses custom properties that already
   flip between light and dark, so this sheet needs no dark-mode variants. */
var BASE_SHEET = new CSSStyleSheet();
BASE_SHEET.replaceSync(`
*{margin:0;padding:0;box-sizing:border-box}
:host{display:block;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.card{background:var(--surf);border:1px solid var(--bd);border-radius:14px;padding:22px;box-shadow:var(--card-sh)}
.step-k{font-family:var(--mono);font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:var(--acc)}
.step-t{font-size:19px;font-weight:720;margin:3px 0 5px;letter-spacing:-.2px}
.step-sub{font-size:12.5px;color:var(--mut);margin-bottom:6px}
.step-t,.dec-q,.num-h,.debrief .big,.mscript-h,.rec .lvl,.sr-h,.cs-ha-l,.side-id h1,.stage-head .sh-name{font-family:var(--display)}
`);
