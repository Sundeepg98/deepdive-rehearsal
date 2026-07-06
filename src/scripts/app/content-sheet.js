/* ===== shared content stylesheet: the .cs-* "scope / game-plan / cram" family =====
   These three overlays share one content vocabulary (.cs-one / .cs-sec / .cs-ha / ...).
   Defined ONCE as a constructable stylesheet and adopted (alongside BASE_SHEET) by
   each of <deep-scope>, <deep-gameplan>, <deep-cram>, so the shared rules live in a
   single place rather than being copied into every shadow root. The generic `b` rule
   replaces the light-DOM `.cram-body b` frame rule, which cannot cross the shadow
   boundary; `b.cs-ha-l` replicates that frame rule out-ranking the .cs-ha-l label
   color (a <b class=cs-ha-l> renders accink, not acc, in the original cascade).
   Every color is a theme token, so it flips light/dark with no variants. */
var CS_SHEET = new CSSStyleSheet();
CS_SHEET.replaceSync(`
.cs-one{background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border-radius:12px;padding:var(--space-14) var(--space-17);font-size:var(--font-size-small);line-height:var(--line-height-airy);color:var(--ink);box-shadow:0 1px 6px -2px rgba(83,74,183,.06)}
.cs-one b{color:var(--accink);font-weight:var(--font-weight-bold)}
.cs-one-l{display:block;font:var(--font-weight-heavy) 9.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;color:var(--acc);margin-bottom:var(--space-6)}
.cs-sec{margin-top:var(--space-18)}
.cs-st{font:var(--font-weight-heavy) 10.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;color:var(--acc);border-bottom:2px solid var(--accbg);padding-bottom:var(--space-5);margin-bottom:var(--space-10)}
.cs-spine{margin:0;padding-left:var(--space-20)}
.cs-spine li{font-size:var(--font-size-caption);line-height:var(--line-height-airy);margin-bottom:var(--space-6);color:var(--ink)}
.cs-dec{font-size:var(--font-size-caption);line-height:var(--line-height-airy);margin-bottom:var(--space-7);color:var(--ink)}
.cs-dec b{color:var(--accink);font-weight:var(--font-weight-bold)}
.cs-arr{color:var(--mut2);font-weight:var(--font-weight-heavy);margin:0 var(--space-5)}
.cs-num{font-size:var(--font-size-caption);line-height:var(--line-height-airy);margin-bottom:var(--space-6);color:var(--ink)}
.cs-ha{font-size:var(--font-size-caption);line-height:var(--line-height-airy);margin-bottom:var(--space-7);color:var(--ink)}
.cs-ha-l{color:var(--acc);font-weight:var(--font-weight-heavy)}
.cs-num b{color:var(--ink);font-weight:var(--font-weight-bold)}
.cs-dim{color:var(--mut2);font-size:var(--font-size-micro);margin-top:var(--space-8)}
.cs-trap{display:grid;grid-template-columns:1fr auto 1fr;gap:var(--space-8);align-items:baseline;margin-bottom:var(--space-7);padding:var(--space-6) 0}
.cs-bad{text-align:right;color:var(--red);font-size:var(--font-size-caption);line-height:var(--line-height-normal)}
.cs-arr2{color:var(--mut2);font-weight:var(--font-weight-heavy)}
.cs-fix{text-align:left;color:var(--teal);font-weight:var(--font-weight-semibold);font-size:var(--font-size-caption);line-height:var(--line-height-normal)}
.cs-tells{margin:0;padding-left:var(--space-20)}
.cs-tells li{font-size:var(--font-size-caption);line-height:var(--line-height-airy);margin-bottom:var(--space-6);color:var(--ink)}
.cs-30{background:linear-gradient(135deg,var(--cs30-bg) 0%,rgba(83,74,183,.02) 100%);border:1px solid var(--bd);border-radius:11px;padding:var(--space-13) var(--space-15);font-size:var(--font-size-caption);line-height:var(--line-height-airy);color:var(--ink)}
b{color:var(--accink);font-weight:var(--font-weight-bold)}
b.cs-ha-l{color:var(--accink);font-weight:var(--font-weight-bold)}
`);
