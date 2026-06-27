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
code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;background:linear-gradient(180deg,var(--code-inline-bg) 0%,rgba(83,74,183,.04) 100%);padding:1px 5px;border-radius:4px;color:var(--accink);box-shadow:0 1px 2px rgba(0,0,0,.04);transition:background .15s ease}
:host{display:block;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.card{background:var(--surf);border:1px solid var(--bd);border-radius:16px;padding:24px;box-shadow:var(--glow);transition:box-shadow .35s cubic-bezier(.22,.61,.36,1),transform .35s cubic-bezier(.22,.61,.36,1),border-color .25s ease;position:relative;overflow:hidden;transform-style:preserve-3d;will-change:transform;animation:cardIn .4s cubic-bezier(.22,.61,.36,1) backwards}
@keyframes cardIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.card::before{content:"";position:absolute;top:var(--mouse-y,50%);left:var(--mouse-x,50%);width:500px;height:500px;background:radial-gradient(circle,rgba(83,74,183,.1) 0%,rgba(83,74,183,.04) 30%,transparent 65%);transform:translate(-50%,-50%);opacity:0;transition:opacity .5s ease;pointer-events:none;z-index:0}
.card::after{content:"";position:absolute;inset:-1px;border-radius:17px;background:conic-gradient(from 0deg at 50% 50%,transparent 0deg,rgba(83,74,183,.15) 60deg,transparent 120deg);opacity:0;transition:opacity .4s ease;pointer-events:none;z-index:0;animation:borderGlow 4s linear infinite}
@keyframes borderGlow{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.card:hover::before{opacity:1}
.card:hover::after{opacity:1}
.card:hover{box-shadow:var(--glow-hover),0 0 50px -10px rgba(83,74,183,.12);transform:translateY(-3px) rotateX(1.5deg) rotateY(-.8deg);border-color:rgba(83,74,183,.25)}
.step-k{font-family:var(--mono);font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;background:linear-gradient(90deg,var(--acc),var(--acc2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-shadow:0 0 12px rgba(83,74,183,.08)}
.step-t{font-size:19px;font-weight:720;margin:3px 0 5px;letter-spacing:-.2px;background:linear-gradient(90deg,var(--ink),var(--accink));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.step-sub{font-size:12.5px;color:var(--mut);margin-bottom:6px;transition:color .2s ease}
.step-t,.dec-q,.num-h,.debrief .big,.mscript-h,.rec .lvl,.sr-h,.cs-ha-l,.side-id h1,.stage-head .sh-name{font-family:var(--display)}
::selection{background:var(--acc);color:#fff;text-shadow:0 0 8px rgba(255,255,255,.3)}
`);

/* Shared mouse-tracking utility: updates --mouse-x and --mouse-y CSS custom
   properties on .card elements so the radial-gradient spotlight follows the
   cursor. Call once per shadow root that contains cards. */
function initCardSpotlight(root) {
  root.addEventListener('mousemove', function (e) {
    var card = e.target.closest('.card');
    if (!card) return;
    var rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
    card.style.setProperty('--mouse-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
  });
}
