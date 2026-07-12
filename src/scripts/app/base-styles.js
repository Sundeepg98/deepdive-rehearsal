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
code{font-family:ui-monospace,Menlo,monospace;font-size:var(--font-size-micro);background:var(--code-inline-bg);padding:var(--space-1) var(--space-5);border-radius:4px;color:var(--accink)}
:host{display:block;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.card{position:relative;background:var(--surf);border:1px solid var(--card-bd);border-radius:14px;padding:var(--space-22);box-shadow:var(--card-sh)}
.card::before{content:"";position:absolute;left:var(--space-14);right:var(--space-14);top:0;height:var(--space-2);border-radius:2px;background:var(--topic-edge);opacity:1}
.step-k{display:inline-flex;align-items:center;gap:var(--space-7);font-family:var(--mono);font-size:var(--font-size-micro);font-weight:var(--font-weight-heavy);letter-spacing:.4px;text-transform:uppercase;color:var(--acc)}
.step-k::before{content:"";width:var(--space-14);height:var(--space-2);border-radius:2px;background:linear-gradient(90deg,var(--acc),var(--acc2))}
.step-t{font-size:var(--font-size-title);font-weight:var(--font-weight-bold);margin:var(--space-3) 0 var(--space-5);letter-spacing:-.2px;text-wrap:balance}
.step-sub{font-size:var(--font-size-caption);color:var(--mut);margin-bottom:var(--space-6)}
.step-t,.dec-q,.num-h,.debrief .big,.mscript-h,.rec .lvl,.sr-h,.cs-ha-l,.side-id h1,.stage-head .sh-name{font-family:var(--display)}
::selection{background:var(--acc);color:#fff}
/* Card hover: a quiet tint of the border to the room's edge. The 3D perspective-tilt
   + cursor-tracking radial spotlight (.card::after) -- a landing-page trick, and noise
   in a 40-minute study session -- are DELETED, along with card-spotlight.js (dropped
   from app.js) and the --card-spot / --card-tilt-glow tokens. The BOX stays (surface,
   border, top room-edge); only its chrome went. Feedback, never ambience. */
@media (hover:hover) and (pointer:fine){
.card{transition:border-color var(--duration-base) var(--ease-base)}
.card:hover{border-color:var(--topic-edge)}
}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
/* PRINT PAGE-BREAK CONTROL. This used to live in styles.css, where it reached NOTHING:
   .card / .thread / .dec / .rf / details.model are all inside a shadow root, and a
   light-DOM rule cannot cross that boundary. The shipped "Print Q&A" tool has therefore
   never had page-break control -- a card could split across a page at any point. BASE_SHEET
   is adopted by all 17 shadow hosts, so one rule here reaches every printable surface. */
@media print{.card,.thread,.dec,.rf,.piv,details.model[open]{break-inside:avoid}.card{box-shadow:none;border:1px solid #ddd}}
`);
