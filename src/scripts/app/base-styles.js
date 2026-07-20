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
.step-sub{font-size:var(--font-size-body);max-width:var(--measure);color:var(--mut);margin-bottom:var(--space-6)}
.step-t,.dec-q,.num-h,.debrief .big,.mscript-h,.rec .lvl,.sr-h,.cs-ha-l,.side-id h1,.stage-head .sh-name{font-family:var(--display)}
::selection{background:var(--acc);color:var(--on-slab)}
/* Card hover: a quiet tint of the border to the room's edge. The 3D perspective-tilt
   + cursor-tracking radial spotlight (.card::after) -- a landing-page trick, and noise
   in a 40-minute study session -- are DELETED, along with card-spotlight.js (dropped
   from app.js) and the --card-spot / --card-tilt-glow tokens. The BOX stays (surface,
   border, top room-edge); only its chrome went. Feedback, never ambience. */
@media (hover:hover) and (pointer:fine){
.card{transition:border-color var(--duration-base) var(--ease-base)}
.card:hover{border-color:var(--topic-edge)}
}
/* ===== THE REVEAL PRIMITIVE -- @keyframes pop -- DEFINED ONCE, IN THE SHEET EVERY SHADOW HOST ADOPTS.
   Keyframes names are TREE-SCOPED: animation-name inside a shadow root resolves only against
   keyframes defined in that same shadow scope (its own style element or an adopted sheet) -- a
   document-level definition does not serve shadow content. ELEVEN rules across FIVE shadow scopes
   reference pop -- the drill (.speak/.mhp + ANS_SHEET's .ans/.fu/.senior), mixed-fire (that same
   ANS_SHEET family + the mock beat boxes), mock-run (.mb-model/.mb-verdict/.mb-int/.mb-int2 .show),
   the whiteboard (.wb-ans.show) and the opener (.op-a.show) -- but the only in-scope definition
   lived in DRILL_STYLE. So outside the drill, EVERY reveal in the app SILENTLY NO-OPED: computed
   style reported "pop 250ms", element.getAnimations() returned [], zero animationstart events
   fired, and the answer just APPEARED (measured 2026-07-18 on the shipped build: whiteboard and
   mixed-fire reveals dead, drill alive -- the same one-scope-works trap as the print/tap-floor/
   contrast blocks below, wearing keyframes instead of selectors). Defined HERE, the name resolves
   in every scope that references it today or ever will; the reduced-motion rule directly below
   compresses it to .01ms in the same scopes, so suppression travels with the definition. */
@keyframes pop{from{opacity:0;transform:translateY(7px) scale(.99)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
/* PRINT PAGE-BREAK CONTROL. This used to live in styles.css, where it reached NOTHING:
   .card / .thread / .dec / .rf / details.model are all inside a shadow root, and a
   light-DOM rule cannot cross that boundary. The shipped "Print Q&A" tool has therefore
   never had page-break control -- a card could split across a page at any point. BASE_SHEET
   is adopted by all 17 shadow hosts, so one rule here reaches every printable surface. */
@media print{.card,.thread,.dec,.rf,.piv,details.model[open]{break-inside:avoid}.card{box-shadow:none;border:1px solid #ddd}
/* NO BACKTICKS ANYWHERE IN THIS SHEET, INCLUDING IN COMMENTS. BASE_SHEET is a JS template literal,
   so one backtick TERMINATES THE STRING and the rest of the CSS is parsed as JavaScript. Quoting
   ".nav button" in backticks here did exactly that: "missing ) after argument list", BASE_SHEET
   never defined, and NOT ONE of the 17 shadow hosts got a stylesheet. The build stayed green -- a
   bundler does not execute it -- and the app booted to nothing. (DRILL_STYLE carries the same
   warning for backslashes, one aisle over. Same class of trap, different character.)

   The walkthrough's Prev/Next pair. styles.css tried to hide ".nav button" on print and could not
   reach it (0 light / 21 shadow), so every printed walkthrough has carried a dead pair of buttons
   for the app's whole life -- the same hole the break-inside rules above were moved here to plug.
   Found by test/shadow_css_guard.mjs, not by a human noticing it on a printout. */
.nav button{display:none}}
/* MOBILE TAP FLOOR -- THE SHADOW HALF. styles.css carries the same floor for the light DOM and
   CANNOT reach in here: the drill's mode switch (Study / Mock round / Quick 5), its level filter
   (SDE2/SDE3/Staff) and #adv ("Reveal answer") are all inside a shadow root, and every one of
   them measured under 44px at 390px -- the segments at 43px, one pixel short. A rule in
   styles.css aimed at them matches zero nodes, which is exactly how this repo has shipped dead
   pane-internal CSS before. BASE_SHEET is adopted by all 17 shadow hosts, so this reaches them. */
@media (max-width:919px){button,summary,[role="button"]{min-height:44px}}
/* HIGH-CONTRAST + FORCED-COLORS -- THE SHADOW HALF. THE SAME BUG, A THIRD TIME.
   styles.css aimed @media(prefers-contrast:more) and @media(forced-colors:active) at
   .card/.dec/.rf/.piv/.thread/.dgm-s FROM THE LIGHT DOM. Measured on the walkthrough:

       .card 0 light / 10 shadow    .dec 0/7    .rf 0/9    .piv 0/7    .thread 0/1    .dgm-s 0/7

   ALL 41 of them live inside a shadow root, so BOTH rules matched ZERO nodes and the shipped
   high-contrast "support" never executed once. It was not subtly wrong; it was dead code that
   read as done. The print rule and the tap floor directly above are in BASE_SHEET for EXACTLY
   this reason and say so in as many words -- these two were simply never given the same
   treatment. BASE_SHEET is adopted by all 17 shadow hosts, so a rule here reaches every one.

   PROVEN, not asserted: with contrast:'more' emulated, .card border-top-width now moves
   1px -> 2px. It did not move before. (fix-css/01-shadow-boundary.mjs, which also runs the
   light-DOM half of the same block as a negative control, so a dead EMULATION cannot be
   mistaken for a dead rule.)

   !important ON THE COLOURS, deliberately. BASE_SHEET is adopted, so it cascades AFTER each
   component's own <style> and wins TIES -- but specificity still beats order, and the three
   real .sub nodes are all more specific than a bare .sub (0,1,0):
       details.model>summary .sub (0,3,0)   .arc-h .sub (0,2,0)   .dnav-h .sub (0,2,0)
   That SECOND deadness is why the old .sub rule failed even in the light DOM, and the audit
   named it: "dead by specificity". BASE_SHEET cannot know every component's selector
   specificity, and hardcoding today's three here would rot on the next component. A
   user-preference override, inside a media query that only fires under that preference, is
   precisely where !important belongs. The border-widths need no !important: they beat their
   component rules on order alone. */
/* Only classes that GENUINELY live in a shadow root belong here. .cmp-note / .cmp-thesis are
   the companion rail: 2 and 1 light-DOM matches, 0 in shadow -- they stay in styles.css, where
   they already work. Putting them here as well would be the identical dead-code sin, pointed the
   other way, and the guard would (rightly) not catch it. */
@media (prefers-contrast:more){
.card,.dec,.rf,.piv,.thread{border-width:2px}
/* DO NOT LET THE HIGH-CONTRAST RULE MAKE A BORDER THINNER. .dec carries border-top:3px solid
   var(--acc) and .rf carries border-left:3px solid var(--red) -- accent edges, and the only thing
   that tells a trade-off card apart from a red-flag card at a glance. A blanket border-width:2px
   sets ALL FOUR sides, so it QUIETLY SHAVED THOSE 3px ACCENTS DOWN TO 2px: measured .dec 3px ->
   2px. Under a preference for MORE contrast, that is backwards.
   The rule inherited this flaw from styles.css, where it was invisible because it never ran. The
   moment it started running, the latent bug became a live one -- which is the whole argument for
   verifying a rule's EFFECT and not just its presence. Restore the accents; only the 1px hairline
   (the genuinely weak boundary, --bd on --surf) is what wanted thickening. */
.dec{border-top-width:3px}
.rf{border-left-width:3px}
.sub,.step-sub,.dgm-s{color:var(--ink)!important}
}
/* FORCED COLORS -- AND THE SAME TRAP THE BLOCK ABOVE SPENT NINE LINES WARNING ABOUT.
   This block used to carry the argument: "the shorthand is RIGHT here: every colour collapses to
   the system palette, so an accent HUE carries no information any more and a uniform CanvasText
   box is the strongest thing the surface can be."

   THAT CONFLATES HUE WITH WIDTH, and it is why the accents shipped flattened. forced-colors
   recolours a border; it does not erase its WIDTH or its SIDE. The premise is true -- the hue is
   gone -- and the conclusion does not follow from it: the border property is a SHORTHAND, so it
   reset all four sides and quietly shaved .dec's 3px top and .rf's 3px left down to 2px. (And no,
   that word is not quoted in backticks: this comment lives INSIDE the BASE_SHEET template literal,
   where a backtick terminates the string and the rest of the CSS is parsed as JavaScript. I wrote
   it with them first. The build went green -- a bundler does not execute the string -- and the app
   booted to a blank page with zero styled shadow hosts, exactly as the warning 60 lines up says it
   will. The trap is real and it is cheap to fall into.) Measured, in every
   room and both themes: THREE distinct border signatures (.card 1/1/1/1, .dec 3/1/1/1 thick-top,
   .rf 1/1/1/3 thick-left) collapsed to ONE -- every surface became an identical 2/2/2/2 box.

   And the width is exactly what was carrying the distinction once the hue went. A trade-off card
   and a red-flag card are the same rectangle in high contrast; the thick edge, and which SIDE it
   is on, is the only thing left that tells them apart. (.rf still has its red-flag glyph to fall
   back on. .dec has no such marker -- it had nothing but the edge.) Under a preference for MORE
   contrast, deleting a distinction is backwards, which is the identical argument the
   prefers-contrast block makes directly above; it simply was not carried across.

   So: keep the 2px frame (the genuinely weak 1px hairline is what wanted thickening) and put the
   two accents back on top of it. Restoring 3 signatures, not merely 2 -- .card/.piv/.thread stay
   a uniform 2px box, .dec is thick-TOP, .rf is thick-LEFT.

   THESE TWO LINES MUST LIVE HERE, IN BASE_SHEET, AND NOWHERE ELSE. Put them in a component's own
   <style> (trade-offs.js / red-flags.js, where .dec and .rf are actually declared) and they are a
   NO-OP: adoptedStyleSheets cascade AFTER a shadow root's own <style>, so this sheet's shorthand
   would simply overwrite them again. Same specificity, later sheet, later wins. It is the
   shadow-boundary bug wearing its other face -- not "the rule cannot reach the node", but "the
   rule reaches it and then loses". */
@media (forced-colors:active){
.card,.dec,.rf,.piv,.thread{border:2px solid CanvasText;background:Canvas;color:CanvasText}
.dec{border-top-width:3px}
.rf{border-left-width:3px}
}
/* W1 forward hand-off strip (flowStripHtml) -- a terminal's next-surface CTA + receipt. Shared
   here because five terminal shadow scopes render it (drill/wb/mock/mixed/session all adopt
   BASE_SHEET); a per-component copy would rot and could mount before it was defined. NO transform
   on the strip itself -- the hit surface never moves (the binding click-surface invariant); the
   button lifts on hover only, and the * reduced-motion rule above compresses it to instant. */
.flow-strip{margin-top:var(--space-16);border:1.5px solid;border-radius:12px;padding:var(--space-14) var(--space-16);box-shadow:0 2px 8px -3px var(--acc-a08)}
.flow-strip .flow-k{font:var(--font-weight-heavy) 9.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;margin:0 0 var(--space-6)}
.flow-strip .flow-t{font-size:var(--font-size-small);line-height:var(--line-height-loose);font-weight:var(--font-weight-semibold);margin:0 0 var(--space-11)}
.flow-strip .flow-t b{font-weight:var(--font-weight-heavy)}
.flow-act{display:flex;align-items:center;gap:var(--space-12);flex-wrap:wrap}
.flow-go{margin:0;width:auto;border:none;border-radius:9px;padding:var(--space-10) var(--space-16);font:var(--font-weight-bold) 12px -apple-system,sans-serif;cursor:pointer;color:var(--on-slab);background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 4px 14px -4px var(--acc-a25);transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),filter var(--duration-base) var(--ease-base)}
.flow-go:hover{filter:brightness(1.1);box-shadow:0 6px 20px -4px var(--acc-a30)}
.flow-go:active{transform:translateY(1px) scale(.98);filter:brightness(.95)}
/* #20 -- the shadow half of the focus ring. document button:focus-visible (styles.css) cannot cross
   the shadow boundary, so Tab landed the ~1px UA outline on this saturated accent-gradient button.
   The app's 2px var(--acc) ring, OUTWARD (offset 2px) -- matching the sibling .revset-b in the same
   drill scope. Outward, not the -2px inset .mock-body uses, because an inset accent ring would paint
   accent-on-accent over this button's own gradient (invisible); outward it lands on the pane bg. */
.flow-go:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.flow-rcpt{font-size:var(--font-size-micro);color:var(--mut2);font-weight:var(--font-weight-semibold);letter-spacing:.2px}
`);
