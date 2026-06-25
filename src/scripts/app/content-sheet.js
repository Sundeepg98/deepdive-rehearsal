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
.cs-one{background:var(--accbg);border-radius:11px;padding:13px 15px;font-size:13px;line-height:1.55;color:var(--ink)}
.cs-one b{color:var(--accink);font-weight:700}
.cs-one-l{display:block;font:800 9.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;color:var(--acc);margin-bottom:5px}
.cs-sec{margin-top:17px}
.cs-st{font:800 10.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;color:var(--acc);border-bottom:1.5px solid var(--accbg);padding-bottom:4px;margin-bottom:9px}
.cs-spine{margin:0;padding-left:19px}
.cs-spine li{font-size:12.2px;line-height:1.5;margin-bottom:5px;color:var(--ink)}
.cs-dec{font-size:12.2px;line-height:1.5;margin-bottom:6px;color:var(--ink)}
.cs-dec b{color:var(--accink)}
.cs-arr{color:var(--mut2);font-weight:800;margin:0 5px}
.cs-num{font-size:12.2px;line-height:1.5;margin-bottom:5px;color:var(--ink)}
.cs-ha{font-size:12px;line-height:1.5;margin-bottom:6px;color:var(--ink)}
.cs-ha-l{color:var(--acc);font-weight:800}
.cs-num b{color:var(--ink);font-weight:700}
.cs-dim{color:var(--mut2);font-size:11.5px;margin-top:7px}
.cs-trap{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:baseline;margin-bottom:6px}
.cs-bad{text-align:right;color:var(--red);font-size:11.7px;line-height:1.4}
.cs-arr2{color:var(--mut2);font-weight:800}
.cs-fix{text-align:left;color:var(--teal);font-weight:600;font-size:11.7px;line-height:1.4}
.cs-tells{margin:0;padding-left:19px}
.cs-tells li{font-size:12.2px;line-height:1.5;margin-bottom:5px;color:var(--ink)}
.cs-30{background:var(--cs30-bg);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;font-size:12.3px;line-height:1.58;color:var(--ink)}
b{color:var(--accink);font-weight:700}
b.cs-ha-l{color:var(--accink);font-weight:700}
`);
