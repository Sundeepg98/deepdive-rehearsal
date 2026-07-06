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
.card{position:relative;background:var(--surf);border:1px solid var(--bd);border-radius:14px;padding:var(--space-22);box-shadow:var(--card-sh)}
.card::before{content:"";position:absolute;left:var(--space-14);right:var(--space-14);top:0;height:var(--space-2);border-radius:2px;background:linear-gradient(90deg,var(--acc),var(--acc2));opacity:.42}
.step-k{display:inline-flex;align-items:center;gap:var(--space-7);font-family:var(--mono);font-size:var(--font-size-micro);font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:var(--acc)}
.step-k::before{content:"";width:var(--space-14);height:var(--space-2);border-radius:2px;background:linear-gradient(90deg,var(--acc),var(--acc2))}
.step-t{font-size:var(--font-size-title);font-weight:720;margin:var(--space-3) 0 var(--space-5);letter-spacing:-.2px}
.step-sub{font-size:var(--font-size-caption);color:var(--mut);margin-bottom:var(--space-6)}
.step-t,.dec-q,.num-h,.debrief .big,.mscript-h,.rec .lvl,.sr-h,.cs-ha-l,.side-id h1,.stage-head .sh-name{font-family:var(--display)}
::selection{background:var(--acc);color:#fff}
/* 3D card lift + cursor spotlight -- desktop pointers only, motion-respecting.
   The EWC top-accent (.card::before) and .step-k tick are untouched; the
   spotlight rides the free .card::after; the "border glow" is a hover box-shadow
   (no continuous animation); entrance stagger stays the global cardStagger. */
@media (hover:hover) and (pointer:fine){
.card{isolation:isolate;transition:transform .3s cubic-bezier(.22,.61,.36,1),box-shadow .3s cubic-bezier(.22,.61,.36,1),border-color .25s ease}
.card::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;opacity:0;transition:opacity .35s ease;background:radial-gradient(340px circle at var(--mouse-x,50%) var(--mouse-y,50%),var(--card-spot,rgba(83,74,183,.12)),transparent 60%)}
.card:hover{transform:perspective(900px) translateY(-3px) rotateX(1.4deg) rotateY(-.8deg);border-color:rgba(83,74,183,.28);box-shadow:var(--card-sh),var(--card-tilt-glow,0 16px 38px -16px rgba(83,74,183,.26))}
.card:hover::after{opacity:1}
}
@media (hover:hover) and (pointer:fine) and (prefers-reduced-motion:reduce){
.card{transition:box-shadow .15s ease,border-color .15s ease}
.card:hover{transform:none}
.card:hover::after{opacity:0}
}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
`);
