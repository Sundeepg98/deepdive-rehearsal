/* ============ PROBE DRILL ============ */
/* The drill is a TopicPane (built once, re-rendered in place on topic switch).
   cards / speakLines are the registry-owned working-set globals (declared in
   topic-protocol.js, seeded by publishBanks from the bank); the real probe bank
   lives in topics/content-pipeline/drill.js. The component reads + reassigns the
   working set to filtered subsets. Stats reach session-progress via getStats(). */
var DRILL_TIER_CLASS = { SDE2: 't2', SDE3: 't3', Staff: 'tS', EXTEND: 'tX' };
var DRILL_TIER_NOTES = {};  /* per-topic; renderTopic sets this from the topic data (the 4 notes now live in topics/content-pipeline/drill.js) */
/* cards / speakLines (the reassignable WORKING set) and _allCards / _allSpeak (the
   immutable originals) are declared + owned by topic-protocol.js (foundation) and
   seeded by publishBanks() from topics/content-pipeline/drill.js's bank. SHARED:
   mixed-fire.js reads _allCards to assemble its probe set; drill reads them as before. */
var DRILL_HTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-12)">
      <div class="modetog" id="modetog">
        <button type="button" class="on" data-m="study">Study</button>
        <button type="button" data-m="mock">Mock round</button>
        <button type="button" data-m="quick">Quick 5</button>
      </div>
      <!-- NO aria-live. role="timer" carries an implicit aria-live="off" for exactly this
           reason; the explicit "polite" overrode that safe default and made the clock speak
           EVERY SECOND -- ~1320 utterances over a 22-minute round. This is not merely noise:
           polite announcements share ONE FIFO queue, so the clock was also burying the
           announcement that actually matters (the grade, below) behind a wall of ticks. The
           time stays readable on demand -- role + name are intact, and a screen-reader user
           can query the timer whenever they want. Announcing it is the part that was wrong. -->
      <div class="timer" id="timer" role="timer" aria-label="Mock round time remaining" style="display:none">22:00</div>
    </div>
    <div class="tierrow"><span class="tierlab">Focus by level</span><div class="modetog" id="tiertog"><button class="on" data-tier="all" type="button">All 20</button><button data-tier="SDE2" type="button">SDE2</button><button data-tier="SDE3" type="button">SDE3</button><button data-tier="Staff" type="button">Staff</button></div></div>
    <div class="tiernote" id="tiernote"><b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.</div>
    <div class="dbar"><i id="dfill"></i></div>
    <div class="score-cap">This run</div>
    <div class="score">
      <div class="pill g"><div class="v" id="sGot">0</div><div class="l">Solid</div></div>
      <div class="pill s"><div class="v" id="sShk">0</div><div class="l">Revisit</div></div>
      <div class="pill left"><div class="v" id="sLeft">0</div><div class="l">Left</div></div>
    </div>
    <div class="revset" id="revset" style="display:none"><button type="button" id="revdrill" class="revset-b">&#8635; Drill my <b id="revn">0</b> flagged <span id="revw">probes</span></button><span class="revset-h">your Revisit pile across this session &middot; clears as you nail them</span></div>
    <div id="dwrap"></div>
    <div class="dnav-wrap"><div class="dnav-h">Your drill set <span class="sub">tap a probe to jump &middot; flagged ones are marked</span></div><div class="dnav" id="dnav"></div></div>`;
var DRILL_STYLE = `/* @keyframes pop moved to BASE_SHEET. Five shadow scopes reference it and a name
   defined only here was visible to exactly one -- every reveal outside the drill silently
   no-oped (keyframes are tree-scoped). BASE_SHEET is adopted by this root too, so .speak/.mhp
   and ANS_SHEET's .ans/.fu/.senior resolve it exactly as before; cbump/pulse stay: this is
   their only consumer. */
@keyframes cbump{0%{transform:scale(1)}28%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

.modetog{display:inline-flex;gap:var(--space-4);background:var(--modetog-bg);border:1px solid var(--modetog-bd);border-radius:9px;padding:var(--space-4)}
.modetog button{border:0;background:transparent;color:var(--mut);font:var(--font-weight-bold) 12px -apple-system,sans-serif;padding:var(--space-13) var(--space-14);border-radius:8px;cursor:pointer;transition:color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base),transform var(--duration-fast) var(--ease-base)}
.modetog button.on{background:var(--card);color:var(--acc);font-weight:var(--font-weight-heavy);box-shadow:0 0 0 1px var(--acc-a32),0 4px 12px var(--acc-a20)}
.modetog button:not(.on):hover{background:var(--modetog-hover-bg);color:var(--ink)}
.tierrow{display:flex;align-items:center;gap:var(--space-9);margin:var(--space-2) 0 var(--space-16);flex-wrap:wrap}
.tierlab{font:var(--font-weight-bold) 9.5px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2)}
.tiernote{font:italic var(--font-size-body)/1.55 -apple-system,sans-serif;color:var(--mut);margin:-6px 0 var(--space-18);max-width:62ch}
.tiernote b{color:var(--acc);font-style:normal;font-weight:var(--font-weight-heavy)}
.timer{font:var(--font-weight-heavy) 15px ui-monospace,Menlo,monospace;color:var(--acc);background:var(--accbg);border:1px solid #cfc7f0;border-radius:8px;padding:var(--space-6) var(--space-13)}
.timer.low{color:var(--red);background:var(--redbg);border-color:#e8c5c0;animation:pulse var(--duration-slowest) infinite}
.dbar{height:var(--space-7);background:var(--dbar-bg);border-radius:7px;overflow:hidden;margin-bottom:var(--space-16);box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}
.dbar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--acc),var(--acc2) 60%,#8B7FE8);transition:width var(--duration-slow) var(--ease-glide);position:relative;overflow:hidden;border-radius:7px}
/* .dbar i::after barShimmer (infinite) deleted -- a progress bar that shimmers when
   nothing is loading is lying. The fill width IS the progress. */
/* ===================== THE SCOREBOARD: STATUS OFF THE HUE CHANNEL =====================
   WAS: .pill.g{border-color:var(--teal)} / .pill.s{border-color:var(--amber)}, on a tile whose
   own background was var(--acc-a02) -- the ROOM's wash. Green and amber are ALSO two of the six
   room hues, so the status tiles were painted in the same palette as the wallpaper behind them.
   In messaging-events (teal) the SOLID tile dissolved and REVISIT was the only tile that popped;
   in reliability-observability (orange) REVISIT dissolved instead. Pixel-measured salience across
   all six rooms x both themes at a GOOD score (5 solid / 1 revisit): the loudest tile was Solid
   in 0 of 12. The board did not merely look off -- it read INVERTED. You glanced at a good score
   and your eye was pulled to the failure count.

   Re-picking the two colliding room hues would only MOVE the collision: it would still leave the
   verdict encoded in hue alone, which (a) re-breaks the moment a seventh room or a palette tweak
   lands, and (b) is invisible to red-green colour blindness regardless of room -- green-vs-amber
   is THE classic confusion pair, and this scoreboard is the only feedback the drill gives you.
   styles.css already made exactly this argument once, for .loc-key: "colour alone, across six
   hues, fails; the letters do not." Status is a higher-stakes signal than room identity.

   So the verdict now rides on channels a room tint CANNOT reach:
     FILL vs OUTLINE  the load-bearing one. SOLID is the ONLY tile that ever fills. A filled slab
                      beats an outline against ANY wallpaper because that is an area+luminance
                      contrast, not a hue contrast -- it holds in all six rooms and in greyscale.
     A GLYPH          check / recycle, the same vocabulary as the judge buttons and the revisit
                      drill button below. Survives greyscale and every flavour of CVD.
     HUE              KEPT, but demoted to redundant reinforcement, and pinned to the --st-*
                      status tokens, which no room can move.

   WHAT THE FILL CLAIMS -- AND WHAT IT DELIBERATELY DOES NOT.
   This comment used to say "the pop TRACKS THE SCORE". It did not, and it never had. The fill is
   gated on "got > 0", not on the score being good: pixel-measured, the Solid tile at 1 solid /
   5 revisit is ~11x louder than Revisit -- and it is EXACTLY that loud at 5 solid / 1 revisit
   too. The code was right and the sentence was a lie, which is the more dangerous half: a comment
   asserting a property nothing enforces is how this repo has shipped five checks that could not
   fail. So the claim is now stated as it actually is, argued, and GUARDED (see the bottom).

   Should the emphasis track the ratio instead -- a strong Solid at 5/6, a muted one at 1/6? No.

   1. A RUNNING TALLY CANNOT GRADE A PARTIAL SAMPLE. At probe 2 of 21, "1 solid / 1 revisit" is
      not 50% -- it is a sample of size two. A ratio-driven fill would blaze at 1/1, halve at 1/2,
      and swing on nothing for the first few probes: sampling noise, rendered as performance
      feedback. The component that CAN grade is the one holding the whole sample -- renderDebrief()
      and renderVerdict() -- and they already do it, per probe, in words. A scoreboard that
      editorialises mid-round is inventing a verdict it does not have the evidence for.
   2. IT WOULD MAKE SOLID QUIETEST EXACTLY WHEN REVISIT IS LARGEST. The fill exists to guarantee
      the board can never read INVERTED (that was the whole bug above). Fading Solid as the score
      drops re-opens that door at the bottom end -- amplifying a failure count at the person who
      is already struggling. That is a worse product than the one we started with.
   3. THE FILL IS A HIERARCHY, NOT A GRADE. It says "this is the pile you are growing" -- the goal
      state of the entire drill loop (Left -> Solid). That is true at every score, and it is most
      worth saying at a bad one.
   4. THE RATIO IS ALREADY REPORTED, EXACTLY, BY THE TWO DIGITS SITTING SIDE BY SIDE. Re-encoding
      it in luminance is redundant at best and lossy at worst.

   So the fill's claim is the narrow one it can actually support: THIS PILE IS NON-EMPTY. True,
   monotonic, and incapable of overstating. .pill.g fills only when Solid > 0 -- renderD() already
   toggles .z on a zero count, so :not(.z) IS "you have banked something", with no new state to
   keep in sync. That 0-guard is what stops it celebrating 0/21.
   REVISIT NEVER FILLS. A failure count must not be the loudest object on the board; the revset
   bar directly below already carries the "go drill your flagged pile" call to action.

   AND IT IS NOW ENFORCED, NOT ASSERTED. test/scoreboard_salience.cjs decodes the rendered pixels
   in all 6 rooms x 2 themes x 4 score states and fails if Solid is ever not the loudest tile, or
   if it fills at zero. The previous pass measured exactly this by hand, wrote it in a comment,
   and left it unguarded -- which is precisely how the sentence at the top of this block came to
   say something the code did not do. */
/* audit #22: the scoreboard tiles (Solid/Revisit/Left) are THIS-RUN counters -- got/shk are the
   live working-set counts the debrief's own pct (got / results.length) and the round-end
   announcement both read. On RESUME the cursor is restored but got/shk start at 0 for the fresh
   page-load, so "0 Solid / 0 Revisit" read as LOST while the dock/pip/panel said "3 of 21 graded".
   Seeding the tiles from the record would corrupt that this-run denominator from the other side, so
   the honest fix is to LABEL them: this caption scopes the board to the current run, so 0/0 reads as
   "nothing graded THIS load yet" and the record's larger count is understood as a different number. */
.score-cap{font:var(--font-weight-bold) var(--font-size-nano)/1 -apple-system,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--mut2);margin:0 0 var(--space-6)}
.score{display:flex;gap:var(--space-9);margin-bottom:var(--space-14)}
.pill{flex:1;text-align:center;border:1.5px solid var(--bd);border-radius:12px;padding:var(--space-10);background:var(--card);transition:box-shadow var(--duration-moderate) var(--ease-base),transform var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.pill:hover{box-shadow:0 4px 16px -4px var(--acc-a15);transform:translateY(-2px)}
.pill .v{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:24px;font-weight:var(--font-weight-heavy);line-height:var(--line-height-none);color:var(--ink)}
/* .pill:hover .v scale deleted -- a scoreboard figure must not jump when you point at it. */
.pill .l{display:flex;align-items:center;justify-content:center;gap:var(--space-5);font-size:var(--font-size-nano);font-weight:var(--font-weight-bold);text-transform:uppercase;letter-spacing:.5px;color:var(--mut2);margin-top:var(--space-4)}
.pill .l::before{font-family:var(--mono);font-weight:var(--font-weight-black);line-height:1}
/* NOTE THE DOUBLE BACKSLASH. DRILL_STYLE is a JS TEMPLATE LITERAL, so a lone \\2713 is read by
   the JS parser as an octal escape, not by CSS as a codepoint -- and octal escapes are ILLEGAL
   in template literals. Writing content:"\\2713" single-slashed threw a SyntaxError at parse
   time, which meant customElements.define('deep-drill') never ran and the ENTIRE DRILL PANE
   silently failed to upgrade: no shadow root, no scoreboard, no probes. The build still went
   green (a bundler does not execute it) and the pane just... was not there. Escape the slash. */
.pill.g .l::before{content:"\\2713"}   /* check   -- as on the Solid judge button */
.pill.s .l::before{content:"\\21BB"}   /* recycle -- as on the "Drill my flagged probes" button */
/* SOLID, banked. The one tile that EVER fills -- and never at zero. Not "you are doing well"
   (the board cannot know that mid-round); "this is the pile you are growing, and it has something
   in it". Fill-vs-outline is an area+luminance contrast, so it survives any room tint and
   greyscale -- which is the property hue could not give us. */
.pill.g:not(.z){background:var(--st-ok);border-color:var(--st-ok);box-shadow:0 5px 16px -7px var(--st-ok)}
.pill.g:not(.z) .v,.pill.g:not(.z) .l{color:var(--st-ok-on)}
/* REVISIT. Ink and a glyph; never a fill. Information, not an alarm. */
.pill.s:not(.z){border-color:var(--st-warn-edge)}
.pill.s:not(.z) .v{color:var(--st-warn)}
/* LEFT is a REMAINDER, not a status. It wore var(--acc) -- the room accent -- which is why in
   half the rooms the tile that popped loudest was the one counting what you had not done yet. */
.pill.left .v{color:var(--ink)}
/* THE ZERO STATE IS THE STATE EVERY USER OPENS THE DRILL IN, and it shipped below AA.
   opacity multiplies the INK and the border alike, and .62 dragged both tiles under the floor:
       .l  "Solid"/"Revisit"  --mut2 #67615A  9px/700  -> 2.67:1   (floor 4.5)  FAIL
       .v  "0"                --mut  #6B6862 24px/800  -> 2.55:1   (floor 3.0)  FAIL
   .7 -> .62 was my own regression: at .7 the label ALREADY failed (3.21), but the light "0"
   value still passed at 3.03 and .62 newly broke it (2.63). Raised to .9, hand-computed from
   the composite and confirmed by decoding the painted glyph core:
       .l -> 4.75:1  (floor 4.5)  PASS      .v -> 4.38:1  (floor 3.0)  PASS
   The design intent is untouched: Left is still the loudest tile, and Solid still does not fill
   -- and therefore does not celebrate -- at 0/21. Dimming is a de-emphasis, not a licence to go
   unreadable. (fix-css/00-calibrate.mjs swatches both inks at both opacities against a
   hand-computed reference; fix-css/05-pill-contrast.mjs measures the real tiles in both themes.) */
.pill.z{opacity:.9}
.pill.z .v{color:var(--mut)}
/* FORCED COLORS: KEEP THE FILL, WHICH IS THE ONE CHANNEL THE DESIGN CALLS LOAD-BEARING.
   NO BACKTICKS IN THIS COMMENT -- see the escape warning above: DRILL_STYLE is a JS template
   literal, so a backtick here TERMINATES THE STRING and the rest of the sheet is parsed as JS.
   (Writing forced-color-adjust's default value in backticks did exactly that: "Unexpected
   identifier 'auto'", customElements.define('deep-drill') never ran, and the entire drill pane
   silently failed to upgrade -- the same failure the double-backslash note describes, via a
   different character. The build still went green; a bundler does not execute it.)
   forced-color-adjust defaults to auto, so the UA forces .pill.g:not(.z)'s background to
   Canvas -- and the SOLID tile, the only tile that ever fills, became pixel-identical to the
   others. Measured: Solid-vs-Revisit background distance 551 normally, 0 in forced-colors.
   The redundant encoding (the check/recycle glyphs, the labels, the numbers) is what stops that
   being a catastrophe -- the board stays decodable -- but a sighted high-contrast user lost the
   celebration signal entirely, which is exactly the channel the rework was built on.
   Highlight/HighlightText is a GUARANTEED-CONTRASTING PAIR in every forced-colors theme (it is
   the selection pair), so it survives whatever palette the user runs. forced-color-adjust:none
   opts the tile out of the UA's substitution so the fill lands -- and it INHERITS, which is why
   .v/.l must be given HighlightText explicitly: left alone they would paint the authored
   var(--st-ok-on) (#FFFFFF) literally, and vanish on a light Highlight.
   styles.css already does exactly this for .badge. .pill never got it -- because .pill is in a
   shadow root and that block could not reach it. This is the same bug as HIGH-1, one pane down. */
@media (forced-colors:active){
.pill{border:1px solid CanvasText}
.pill.g:not(.z){background:Highlight;border-color:Highlight;box-shadow:none;forced-color-adjust:none}
.pill.g:not(.z) .v,.pill.g:not(.z) .l{color:HighlightText}
}
.revset{display:flex;align-items:center;gap:var(--space-11);flex-wrap:wrap;margin:var(--space-2) 0 var(--space-18)}
.revset-b{font:var(--font-weight-semibold) 13px -apple-system,system-ui,sans-serif;color:var(--accink);background:var(--accbg);border:1px solid var(--acc);border-radius:8px;padding:var(--space-7) var(--space-13);cursor:pointer;transition:background var(--duration-fast),color var(--duration-fast),transform var(--duration-instant);display:inline-flex;align-items:center;gap:var(--space-6)}
.revset-b:hover{background:var(--acc);color:var(--bg)}
.revset-b:active{transform:translateY(1px)}
.revset-b:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.revset-b b{font-weight:var(--font-weight-heavy)}
.revset-h{font-size:var(--font-size-caption);color:var(--mut);font-style:italic}
.thread{border:1.5px solid var(--bd);border-radius:14px;padding:var(--space-20);background:linear-gradient(135deg,var(--thread-bg) 0%,var(--acc-a02) 100%);box-shadow:var(--surf-sh);transition:box-shadow var(--duration-moderate) var(--ease-base)}
.thread:hover{box-shadow:var(--surf-sh),0 0 30px -8px var(--acc-a06)}
.qrow{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-12);margin-bottom:var(--space-4)}
.qk{font-family:var(--mono);font-size:var(--font-size-micro);font-weight:var(--font-weight-heavy);letter-spacing:.4px;text-transform:uppercase;color:var(--acc)}
.sigtag{font-size:var(--font-size-micro);color:var(--mut2);font-weight:var(--font-weight-bold);margin-top:var(--space-5);letter-spacing:.2px}
.sigtag b{color:var(--acc)}
.tier{display:inline-block;font-size:var(--font-size-micro);font-weight:var(--font-weight-heavy);letter-spacing:.8px;text-transform:uppercase;padding:var(--space-3) var(--space-8);border-radius:5px;border:1px solid;white-space:nowrap}
.tier.t2{color:var(--teal);background:var(--tealbg);border-color:var(--senior-bd)}
.tier.t3{color:var(--accink);background:var(--accbg);border-color:#cfc7f0}
.tier.tS{color:var(--red);background:var(--redbg);border-color:#e8c5c0}
.tier.tX{color:var(--on-slab);background:var(--indigo);border-color:var(--indigo)}
.speak{margin-top:var(--space-11);font-size:var(--font-size-body);max-width:var(--measure);color:var(--speak-fg);background:var(--accbg);border:1px solid #cfc7f0;border-radius:9px;padding:var(--space-12) var(--space-14);animation:pop var(--duration-moderate) var(--ease-base)}
.speak .sl{font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.8px;text-transform:uppercase;color:var(--acc);display:flex;align-items:center;gap:var(--space-6);margin-bottom:var(--space-5)}
.speak .sl::before{content:"\\1F5E3"}
.speak b{color:var(--accink)}
.debrief .big{font-size:var(--font-size-display);font-weight:var(--font-weight-heavy);text-align:center;margin-bottom:var(--space-4)}
.debrief .sumline{text-align:center;color:var(--mut);font-size:var(--font-size-small);margin-bottom:var(--space-18)}
.sigrow{display:flex;align-items:center;gap:var(--space-11);padding:var(--space-11) 0;border-bottom:1px solid var(--sigrow-bd)}
.sigrow:last-of-type{border-bottom:0}
.sigrow .mk{flex:none;width:var(--space-24);height:var(--space-24);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--font-size-small);font-weight:var(--font-weight-heavy);color:var(--on-slab)}
.sigrow.ok .mk{background:var(--teal)} .sigrow.no .mk{background:var(--amber)} .sigrow.miss .mk{background:var(--red)}
.sigrow .nm{font-size:var(--font-size-small);font-weight:var(--font-weight-semibold)}
.sigrow .tr{margin-left:auto}
.verdict{margin-top:var(--space-18);font-size:var(--font-size-body);max-width:var(--measure);color:var(--ans-fg);background:var(--ans-bg);border-left:3px solid var(--acc);border-radius:9px;padding:var(--space-14) var(--space-16)}
.verdict b{color:var(--accink)}
/* :not(.flow-go) -- the W1 hand-off CTA is a BASE_SHEET .flow-go (gradient); this generic
   debrief-button rule (specificity 0,1,1) would otherwise beat it (0,1,0) and flatten it to the
   plain white/acc outline, so the drill strip would look nothing like the wb/mock strips. */
.debrief button:not(.flow-go){margin-top:var(--space-18);display:block;width:100%;border:1.5px solid var(--acc);background:#fff;color:var(--acc);font:var(--font-weight-bold) 13px -apple-system,sans-serif;padding:var(--space-12);border-radius:10px;cursor:pointer}
.debrief .btn-sec{margin-top:var(--space-14);display:block;width:100%;border:1.5px solid var(--teal);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);color:var(--fb-t-fg);font:var(--font-weight-bold) 13px -apple-system,sans-serif;padding:var(--space-12);border-radius:10px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),filter var(--duration-base) var(--ease-base)}
.debrief .btn-sec:hover{transform:translateY(-1px);box-shadow:0 4px 14px -4px rgba(10,133,100,.2);filter:brightness(1.02)}
.debrief .btn-sec:active{transform:translateY(1px) scale(.98)}
.debrief .btn-sec:hover{background:var(--btnsec-hover-bg)}
/* .flow-strip / .flow-go / .flow-rcpt now live in BASE_SHEET (adopted by every terminal scope). */
.btn-sec:active{transform:translateY(1px);filter:brightness(.96)}
.rec{text-align:center;margin-bottom:var(--space-6)}
.rec .lvl{display:inline-block;font-size:var(--font-size-heading);font-weight:var(--font-weight-heavy);letter-spacing:-.3px;padding:var(--space-10) var(--space-24);border-radius:12px;border:2px solid;box-shadow:0 2px 8px -2px var(--acc-a10);transition:transform var(--duration-base) var(--ease-spring),box-shadow var(--duration-moderate) var(--ease-base)}
.rec.sh .lvl{color:#0a5240;background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.08) 100%);border-color:var(--teal);box-shadow:0 2px 8px -2px rgba(10,133,100,.15)}
.rec.h .lvl{color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a06) 100%);border-color:var(--acc);box-shadow:0 2px 8px -2px var(--acc-a15)}
.rec.lh .lvl{color:var(--fb-a-fg);background:linear-gradient(135deg,var(--amberbg) 0%,rgba(176,108,20,.06) 100%);border-color:var(--amber);box-shadow:0 2px 8px -2px rgba(176,108,20,.15)}
.rec.nh .lvl{color:var(--fb-r-fg);background:linear-gradient(135deg,var(--redbg) 0%,rgba(239,68,68,.06) 100%);border-color:var(--red);box-shadow:0 2px 8px -2px rgba(239,68,68,.15)}
.rec .tu{font-size:var(--font-size-caption);color:var(--mut2);margin-top:var(--space-10);font-weight:var(--font-weight-bold)}
.cbump{animation:cbump var(--duration-slow) var(--ease-base)}
.dnav-wrap{margin-top:var(--space-22)}
.dnav-h{font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:var(--space-12);display:flex;align-items:baseline;gap:var(--space-9);flex-wrap:wrap}
.dnav-h .sub{font-size:var(--font-size-micro);font-weight:var(--font-weight-semibold);letter-spacing:.01em;text-transform:none;color:var(--mut2)}
/* ===== THREE COLUMNS DO NOT FIT ON A PHONE (WCAG 1.4.10, loss of content) =====
   repeat(3,1fr) had no breakpoint, so at 320px each probe chip is ~91px -- and after the number
   badge (23px), the gap and the padding, the TITLE gets 33px. "Observability & operability" is one
   66px word; it overflowed its box and .dn-step{overflow:hidden} ate it. Measured: 33px cut at
   320px, 19px at 360px, 9px at 390px, on every probe in the set. The user cannot tell the chips
   apart, which is the entire job of this nav.
   Two columns below 600px and one below 400px give the title real room. overflow-wrap:anywhere is
   the BACKSTOP -- a single word longer than its column can never again silently overflow, whatever
   a future topic decides to call a signal. Media queries inside a shadow sheet evaluate against the
   viewport exactly as they do outside it. */
.dnav{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-8)}
@media (max-width:600px){.dnav{grid-template-columns:repeat(2,1fr)}}
@media (max-width:400px){.dnav{grid-template-columns:1fr}}
.dn-step{display:flex;align-items:center;gap:var(--space-10);text-align:left;padding:var(--space-10) var(--space-12);border-radius:11px;border:1px solid var(--bd);background:linear-gradient(135deg,var(--surf) 0%,var(--acc-a02) 100%);box-shadow:var(--surf-sh);cursor:pointer;transition:transform var(--duration-base) var(--ease-glide),box-shadow var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base);font-family:inherit;min-width:0;position:relative;overflow:hidden}
.dn-step:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 6px 20px -6px var(--acc-a15);border-color:var(--acc-a20);background:linear-gradient(135deg,var(--mix-surf) 0%,var(--acc-a04) 100%)}
.dn-n{flex:none;width:var(--space-22);height:var(--space-22);border-radius:7px;display:grid;place-items:center;font:var(--font-weight-bold) 10.5px -apple-system,sans-serif;background:var(--accbg);color:var(--accink);transition:background var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),transform var(--duration-base) var(--ease-spring)}
.dn-t{font-size:var(--font-size-micro);font-weight:var(--font-weight-semibold);color:var(--ink);line-height:var(--line-height-snug);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.dn-step.on{border-color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a06) 100%);box-shadow:0 0 0 1px var(--acc),0 4px 14px -4px var(--acc-a12);transform:translateY(-1px)}
.dn-step.on .dn-n{background:linear-gradient(135deg,var(--acc),var(--acc2));color:var(--on-slab);box-shadow:0 2px 6px -2px var(--acc-a30)}
.dn-step.flag{border-color:var(--amber);background:linear-gradient(135deg,var(--amberbg) 0%,rgba(176,108,20,.04) 100%)}
.dn-step.flag .dn-n{background:linear-gradient(135deg,var(--amber),#d4902a);color:var(--on-slab)}
.dn-step:active{transform:translateY(0) scale(.99)}
.mhp{margin-top:var(--space-14);border:1px solid var(--bd);border-radius:12px;padding:var(--space-14) var(--space-16);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a02) 100%);animation:pop var(--duration-moderate) var(--ease-base)}
.mhp-h{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--acc)}
.mhp-h .mhp-sub{display:block;margin-top:var(--space-3);font:var(--font-weight-semibold) 11px -apple-system,sans-serif;letter-spacing:0;text-transform:none;color:var(--mut2)}
.mhp-list{display:flex;flex-direction:column;gap:var(--space-7);margin-top:var(--space-10)}
.mhp-i{display:flex;align-items:flex-start;gap:var(--space-10);width:100%;text-align:left;border:1px solid var(--bd);background:var(--card);border-radius:9px;padding:var(--space-9) var(--space-11);cursor:pointer;font:inherit;transition:border-color var(--duration-fast) var(--ease-base),background var(--duration-fast) var(--ease-base)}
.mhp-i:hover{border-color:var(--acc-a30)}
.mhp-box{flex:none;width:var(--space-18);height:var(--space-18);border-radius:5px;border:1.5px solid var(--mut2);display:flex;align-items:center;justify-content:center;font-size:var(--font-size-micro);color:transparent;transition:background var(--duration-fast) var(--ease-base),border-color var(--duration-fast) var(--ease-base),color var(--duration-fast) var(--ease-base)}
.mhp-i.on{border-color:var(--teal);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%)}
.mhp-i.on .mhp-box{background:var(--teal);border-color:var(--teal);color:var(--on-slab)}
.mhp-t{font-size:var(--font-size-body);line-height:var(--line-height-normal);color:var(--ink);font-weight:var(--font-weight-semibold)}
.mhp-cov{margin-top:var(--space-11);font-size:var(--font-size-caption);color:var(--mut);font-weight:var(--font-weight-semibold)}
.mhp-cov b{color:var(--accink);font-weight:var(--font-weight-heavy)}
.judge .got.j-rec,.judge .shk.j-rec,.judge .miss.j-rec{box-shadow:0 0 0 2px var(--acc),0 6px 16px -5px var(--acc-a32)}
.sigdrop{font-size:var(--font-size-micro);color:var(--fb-a-fg);font-weight:var(--font-weight-semibold);margin-top:var(--space-2)}
/* ===================== THE LANDING PADS FOR PROGRAMMATIC FOCUS =====================
   Every re-render of #dwrap destroyed the focused element and dumped focus on <body>.
   _focusNew() now lands focus on the block that JUST APPEARED, so the reader is placed in
   the new content instead of at the top of the document. Those blocks are non-interactive
   containers, so they get tabindex="-1" (focusable, NOT in the tab sequence) at the moment
   we focus them -- never in the markup, so nothing else picks up a stray tab stop.

   The ring: suppressed for the base :focus, restored on :focus-visible. Chrome's
   focus-visible heuristic keys off the LAST INPUT MODALITY, so a .focus() that follows a
   mouse click on "Solid" paints nothing (a sighted mouse user must not see a box appear
   around the question), while the same .focus() following the "3" key paints the ring (a
   sighted keyboard user must see where focus went). The attribute selector is deliberate:
   these rules apply only while the element is a focus target.
   SPECIFICITY, because this sheet LOSES ties: DRILL_STYLE is the shadow root's own <style>
   and adoptedStyleSheets (BASE_SHEET, ANS_SHEET) cascade AFTER it. Neither declares any
   outline or :focus rule today, so (0,2,0) is unopposed -- and :focus-visible at (0,3,0)
   beats the :focus reset regardless. Verified with getComputedStyle, not assumed. */
.thread[tabindex],.ans[tabindex],.fu[tabindex],.senior[tabindex],.debrief[tabindex]{outline:none}
.thread[tabindex]:focus-visible,.ans[tabindex]:focus-visible,.fu[tabindex]:focus-visible,.senior[tabindex]:focus-visible,.debrief[tabindex]:focus-visible{outline:2px solid var(--acc);outline-offset:3px;border-radius:10px}`;

/* Fisher-Yates shuffle of [0..count). SHARED: mixed-fire.js calls it too,
   so it stays a module-level global rather than a component method. */
function dShuffle(count) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}
class DeepDrill extends TopicPane {
  static dataKey = 'drill';
  /* PERF (perf/chunk-proto): NOT deferred -- same rule as the whiteboard. getStats() reports the
     drill's LIVE working set (bankTot the denominator, dDone, items), which renderTopic() assigns,
     and sessStats() -> flowRec() reads drillEl().getStats() cross-component while #drill is HIDDEN:
     it feeds W1's seg recommendation pip and the terminal hand-off strips. Deferred, drill's
     bankTot is stale when flowPip() fires on the initial deeptopicchange (before the queue drains),
     so flowRec() mis-picks and the pip never lands (proven: the pip is absent at the VR rest state,
     present the instant flowPip re-fires with drill drained). Its render is ~5ms and it renders
     synchronously anyway whenever it is the active pane, so this only touches hidden-drill entries;
     the drill-active deferral win is unchanged. (Pure-data reads take the registry-direct path
     instead -- see deep-trade-offs.getDecisions(); getStats() is live state, so it must be eager.) */
  static eagerTopic = true;
  sheets()    { return [BASE_SHEET, ANS_SHEET]; }
  styleText() { return DRILL_STYLE; }
  skeleton()  { return DRILL_HTML; }
  init(root) {
    /* one-time HOST state not reset per-topic (renderTopic/setMode reset the rest) */
    this.timerId = null; this.mockLeft = 0; this.revisit = {};
    this._dwrap = root.getElementById('dwrap'); this._dfill = root.getElementById('dfill');
    this._sGot = root.getElementById('sGot'); this._sShk = root.getElementById('sShk'); this._sLeft = root.getElementById('sLeft');
    this._timerEl = root.getElementById('timer');
    this._modetog = root.getElementById('modetog'); this._tiertog = root.getElementById('tiertog');
    this._tiernote = root.getElementById('tiernote');
    /* The skeleton's own copy is the FALLBACK for a topic that has no note for the active tier.
       A topic's tierNotes may legitimately lack the "all" key -- the hand-coded 8 carry
       {all, SDE2, SDE3, Staff} but the markdown format's worked example shows only the three
       tiers, so every compiled topic authored three. Reading .all unguarded put the literal
       string "undefined" on the drill landing view of all 38. Never render a missing value. */
    this._tiernoteBase = this._tiernote ? this._tiernote.innerHTML : '';
    const self = this;
    /* DELEGATED listeners wired ONCE on the stable shell nodes: dnav contents are
       rebuilt every draw; modetog / tiertog / revdrill live in the invariant skeleton. */
    /* A THIRD focus-destruction site, and not one the audit flagged: renderNav() rebuilds
       #dnav's innerHTML on every render, so jumping to a probe DESTROYS THE VERY BUTTON YOU
       JUST CLICKED and drops focus on <body> -- same root cause as the reveal and the grade,
       different element. You asked to jump to probe 7, so land on probe 7. */
    root.getElementById('dnav').addEventListener('click', function (event) {
      const btn = event.target.closest('.dn-step');
      if (btn) { self.di = +btn.getAttribute('data-i'); self.renderD(true); }
    });
    this._modetog.addEventListener('click', function (event) {
      const btn = event.target.closest('button');
      if (btn) self.setMode(btn.getAttribute('data-m'));
    });
    this._tiertog.addEventListener('click', function (event) {
      const btn = event.target.closest('button');
      if (btn) self.setTier(btn.getAttribute('data-tier'));
    });
    root.getElementById('revdrill').addEventListener('click', function () { self.drillRevset(); });
  }
  renderTopic(d) {
    /* registry already reseeded cards / _allCards via publishBanks before this fires */
    DRILL_TIER_NOTES = d.tierNotes || {};
    this.tierFilter = 'all'; this.revisitMode = false;
    for (let z = 0; z < this._tiertog.children.length; z++) {
      this._tiertog.children[z].classList.toggle('on', this._tiertog.children[z].getAttribute('data-tier') === 'all');
    }
    if (this._tiernote) this._tiernote.innerHTML = DRILL_TIER_NOTES.all || this._tiernoteBase;
    const allBtn = this._tiertog.querySelector('[data-tier="all"]');
    if (allBtn) allBtn.textContent = 'All ' + _allCards.length;
    this.setMode('study');
    /* W2 -- restore the pos.<id> drill probe (study mode's stable base order), so Resume lands on the
       probe they left, not probe 1. Display-only: drawCard shows probe di; no judge fires, and grades
       merge by content-id, so continuing from probe 5 records 5..end without touching the record's
       0..4 (restore-NEVER-regrades). setMode already set di=0 + rendered; re-render at the cursor. */
    var _pd = (typeof posRestore === 'function') ? posRestore('drill', cards.length) : 0;
    if (_pd > 0) { this.di = _pd; this.renderD(false); }
  }
  teardownTopic() {
    this.stopTimer();
    this.di = 0; this.got = 0; this.shk = 0; this.results = [];
    this.revisit = {}; this.revisitMode = false;
  }
  renderNav() {
    const nav = this._root.getElementById('dnav');
    if (!nav) return;
    let html = '';
    for (let k = 0; k < cards.length; k++) {
      const card = cards[k], originalIdx = _allCards.indexOf(card), flagged = this.revisit[originalIdx];
      html += '<button type="button" class="dn-step' + (k === this.di ? ' on' : '') + (flagged ? ' flag' : '') + '" data-i="' + k + '"><span class="dn-n">' + (k + 1) + '</span><span class="dn-t">' + card.signal + '</span></button>';
    }
    nav.innerHTML = html;
  }
  /* ===================== FOCUS AFTER A RE-RENDER =====================
     `this._dwrap.innerHTML = html` deletes the focused element, and the browser's fallback
     for "the focused element no longer exists" is <body>. So every reveal, every grade and
     every jump silently teleported the user to the top of the document -- 44+ times a round.

     WHY WE MOVE FOCUS RATHER THAN RESTORE IT. Restoring is not available: the element that
     had focus is genuinely gone (you graded the card; there is no "Solid" button any more).
     Re-focusing the equivalent NEW control -- the next "Reveal answer" button -- would satisfy
     "focus is not body" while still being useless, because it announces "Reveal answer, button"
     and says nothing about the probe you are now supposed to answer; the reader would have to
     navigate BACKWARD to find the question. So focus goes to the block that JUST APPEARED --
     the new probe, the revealed answer, the follow-up, the debrief. That is what a sighted
     user's eye does, it is what the reader needs to hear, and because these blocks sit BEFORE
     their controls in DOM order, the next control is still exactly one Tab away. Content
     first, action one keystroke later.

     THE FLAG IS OPT-IN, AND THAT IS DELIBERATE. renderD() is on the boot path
     (renderTopic -> setMode('study') -> renderD) and on the topic-switch path, for a pane that
     may not even be visible. A default-on focus move would yank focus into a hidden drill on
     page load -- a worse bug than the one being fixed, and one that would hit everybody, not
     just screen-reader users. So the default is "do not touch focus", and the four call sites
     that are genuinely a user action inside #dwrap opt in explicitly. Anything I have failed
     to enumerate keeps today's behaviour instead of acquiring a new way to misbehave. */
  _focusNew(el) {
    if (!el) return null;
    el.setAttribute('tabindex', '-1');   /* focusable, but NOT a tab stop */
    try { el.focus(); } catch (e) {}
    return el;
  }
  /* ===================== REPAIR IF AND ONLY IF WE BROKE IT =====================
     THE OPT-IN LIST WAS THE BUG. The flag above was wired at the four call sites someone
     enumerated, and the round's fifth exit -- the mock clock running out (startTimer, below) --
     was not one of them: it called renderD() with no argument, renderVerdict() rewrote #dwrap,
     and focus fell to <body> while the reader said nothing. The user cannot even know the round
     is over. An enumeration is only as good as the person enumerating, and this codebase has now
     found that same defect FIVE times, one site at a time.

     So the trigger is no longer a list of sites. It is the CONDITION ITSELF: before a redraw,
     ask whether the element that currently has focus is one this redraw is about to destroy.
     If it is, we broke it, so we repair it -- at every site, including the ones nobody thought of.

     THE THREE DOOMED REGIONS, all of which really do eat focus:
       #dwrap   the card / verdict / debrief. innerHTML is replaced on every draw.
       #dnav    renderNav() rebuilds the probe chips on every draw -- so jumping to a probe
                destroys the very chip you clicked.
       #revset  not destroyed but updRevset() can display:none it, and focus on a hidden
                element is just as gone.

     WHY THIS DOES NOT STEAL FOCUS -- the failure mode the opt-in existed to prevent. renderD() is
     also the BOOT path (renderTopic -> setMode('study')) and the mode/tier-toggle path, for a pane
     that may not even be visible. A default-on focus move would yank the user into a hidden drill.
     This guard cannot: at boot nothing in the drill has focus, so nothing is doomed and nothing
     moves. Ditto the toggles -- they live in the invariant skeleton, survive the redraw, and keep
     focus exactly where the user put it. And the mock clock keeps ticking after you switch panes:
     if it expires while the user is reading the walkthrough, their focus is NOT in a doomed region
     (a .pane is display:none, which blurs it), so we leave them alone and merely announce. Moving
     focus there would be a change of context on no user action -- a worse bug than the one fixed.

     ShadowRoot.activeElement, NOT document.activeElement: the latter returns the HOST
     (<deep-drill>) for anything focused inside this shadow root, so it can neither see which
     element has focus nor tell "inside #dwrap" from "on the mode toggle". Asking the wrong root
     is how a light-DOM guard reads `event.target.tagName` and sees "deep-numbers". */
  _focusDoomed() {
    const el = this._root && this._root.activeElement;
    if (!el) return false;                       /* focus is outside this pane entirely */
    const nav = this._root.getElementById('dnav');
    const rev = this._root.getElementById('revset');
    return !!((this._dwrap && this._dwrap.contains(el)) ||
              (nav && nav.contains(el)) ||
              (rev && rev.contains(el)));
  }
  /* A round ends TWO ways -- you grade the last card, or the clock runs out -- and both must say
     the same thing, so they say it from one place. When these were written apart, one of them
     said nothing at all. */
  _roundEndMsg(lead) {
    return lead + '. Round complete. ' + this.got + ' solid, ' + this.shk + ' to revisit.';
  }
  _say(msg) {
    if (typeof ViewManager !== 'undefined' && ViewManager.announce) ViewManager.announce(msg);
  }
  /* The block that just appeared, per stage. maxStage = 1 + card.f.length, and the k-th
     follow-up appears at stage 2+k -- so at maxStage the LAST follow-up and the senior/speak
     blocks land together, and the follow-up is the one the user actually asked for. */
  _newBlock(stage) {
    if (stage <= 0) return this._dwrap.querySelector('.thread');
    if (stage === 1) return this._dwrap.querySelector('.ans');
    const fus = this._dwrap.querySelectorAll('.fu');
    return fus.length ? fus[fus.length - 1] : this._dwrap.querySelector('.thread');
  }
  renderD(moveFocus) {
    /* W2 -- throttled pos.<id> drill-probe cursor write. Persist di ONLY in the canonical full-bank
       study walk, where di is a true "probe N of NN" bank position. mode==='study' alone is too weak:
       a tier filter (setTier keeps mode 'study', shrinks `cards` to the tier) and a revisit sub-drill
       (drillRevset leaves mode 'study', sets revisitMode) both index a SUBSET, so their di resolves to
       a DIFFERENT probe on restore -- a lie the Resume sub-line would then print. Quick 5 reshuffles,
       mock is timed (both mode!=='study'). Display index only, never a grade: grades persist by
       content-id (judge -> drillgraded -> Progress.snapshot), so this write cannot re-grade.
       COMPLETION RESET: once the walk reaches the debrief (di >= cards.length) there is no resume
       probe, so the cursor resets to 0 -- re-entry lands on the study list at probe 1, exactly the
       pre-cursor behavior that re-entering a FINISHED drill relied on (a completed run is not a
       resume point). A partial walk persists its di and resumes there. */
    if (typeof posSet === 'function' && this.mode === 'study' && this.tierFilter === 'all' && !this.revisitMode) posSet('drill', this.di < cards.length ? this.di : 0);
    /* Resolve the landing decision FIRST -- renderNav() below rewrites #dnav, so a chip that has
       focus is already destroyed (and activeElement already <body>) by the time we could ask. */
    const land = !!moveFocus || this._focusDoomed();
    this._sGot.textContent = this.got; this._sGot.parentNode.classList.toggle('z', this.got === 0);
    this._sShk.textContent = this.shk; this._sShk.parentNode.classList.toggle('z', this.shk === 0);
    this._sLeft.textContent = cards.length - this.di; this._sLeft.parentNode.classList.toggle('z', cards.length - this.di === 0);
    this._dfill.style.width = (this.di / cards.length * 100) + '%';
    this.renderNav();
    if (this.di >= cards.length) {
      if (this.mode === 'mock') { this.renderVerdict(); } else { this.renderDebrief(); }
      /* The debrief IS the payoff of the round, and it was being rendered straight into
         <body>-focus -- i.e. never read at all. Land on it. */
      if (land) this._focusNew(this._dwrap.querySelector('.debrief'));
      this.updRevset();
      return;
    }
    this.drawCard(0, land);
    this.updRevset();
  }
  /* The must-hit points for a probe = the bolded <b> terms already curated into
     its own answer + senior tell. Pure curation of existing content (no new
     copy); parsed via a throwaway element so entities/nested tags resolve to
     clean text. Author-controlled card data, so innerHTML here is safe. */
  _mustHit(card) {
    const tmp = document.createElement('div');
    tmp.innerHTML = (card.a || '') + ' ' + (card.senior || '');
    const bs = tmp.querySelectorAll('b'), seen = {}, out = [];
    for (let i = 0; i < bs.length; i++) {
      const t = (bs[i].textContent || '').trim().replace(/[\s:;,.]+$/, '');
      const key = t.toLowerCase();
      if (t && t.length <= 64 && !seen[key]) { seen[key] = 1; out.push(t); }
    }
    return out;
  }
  /* Live coverage readout + a coverage-derived recommendation on the grade
     buttons -- full coverage points at Solid, a gap points at Revisit. */
  _updCov() {
    const m = this._mhp ? this._mhp.length : 0;
    let n = 0;
    for (const k in this._cov) { if (this._cov[k]) n++; }
    const nEl = this._root.getElementById('mhpN'); if (nEl) nEl.textContent = n;
    const recEl = this._root.getElementById('mhpRec');
    const jg = this._root.getElementById('jg'), js = this._root.getElementById('js'), jm = this._root.getElementById('jm');
    const full = m > 0 && n >= m, none = m > 0 && n === 0, partial = m > 0 && n > 0 && n < m;
    if (jg) jg.classList.toggle('j-rec', full);
    if (js) js.classList.toggle('j-rec', partial);
    if (jm) jm.classList.toggle('j-rec', none);
    if (recEl) recEl.textContent = m === 0 ? '' : (full ? 'all covered \u2014 Solid' : none ? 'none covered \u2014 Missed' : ('dropped ' + (m - n) + ' \u2014 Shaky'));
  }
  drawCard(stage, moveFocus) {
    const self = this;
    /* #adv calls drawCard DIRECTLY (not via renderD), and #adv lives inside #dwrap -- so pressing
       "Reveal answer" destroys the button that was pressed. Same guard, same reason. */
    const land = !!moveFocus || this._focusDoomed();
    const card = cards[this.di], maxStage = 1 + card.f.length;
    /* W2 beat3 -- a JUDGMENT POINT is when the answer is fully revealed and the Missed/Shaky/Solid
       row is on screen (stage >= maxStage). The dock's micro tier renders armed keys ONLY then (the
       judges' amendment: quiet mid-read, armed at the judgment, full targets at the boundary). */
    this._judgeOn = (stage >= maxStage);
    let html = '<div class="card"><div class="thread">' +
      '<div class="qrow"><div><div class="qk">Probe ' + (this.di + 1) + ' / ' + cards.length + '</div>' +
      '<div class="sigtag">signal &middot; <b>' + card.signal + '</b></div></div>' +
      '<span class="tier ' + DRILL_TIER_CLASS[card.tier] + '">' + card.tier + '</span></div>' +
      '<div class="qq">' + card.q + '</div>';
    /* (the old stage===1 'dnr' stamp is gone: its only rule was a light-DOM styles.css line that
       could never reach this shadow root -- a class with no rule in any scope is dead weight) */
    if (stage >= 1) { html += '<div class="ans">' + card.a + '</div>'; }
    for (let k = 0; k < card.f.length; k++) {
      if (stage >= 2 + k) {
        html += '<div class="fu"><div class="lab">Interviewer pushes further</div>' +
          '<div class="fq">' + card.f[k].q + '</div><div class="fa">' + card.f[k].a + '</div></div>';
      }
    }
    if (stage >= maxStage) {
      html += '<div class="senior"><div class="sl">What sounds senior here</div>' + card.senior + '</div>';
      html += '<div class="speak"><div class="sl">Say it out loud like this</div>' + speakLines[this.di] + '</div>';
    }
    html += '</div>';
    if (stage < maxStage) {
      html += '<button type="button" class="push' + (stage >= 1 ? ' more' : '') + '" id="adv" aria-keyshortcuts="Space Enter">' +
        (stage < 1 ? 'Reveal answer' : '&#8627; Interviewer pushes further') + '</button>';
    } else {
      /* grounded scoring: surface this probe's must-hit points as a checklist so
         the Solid/Revisit call reflects actual coverage, not a gut feel */
      this._mhp = this._mustHit(card); this._cov = {};
      if (this._mhp.length) {
        let items = '';
        for (let i = 0; i < this._mhp.length; i++) {
          items += '<button type="button" class="mhp-i" data-i="' + i + '" aria-pressed="false"><span class="mhp-box">&#10003;</span><span class="mhp-t">' + this._mhp[i] + '</span></button>';
        }
        html += '<div class="mhp"><div class="mhp-h">Must-hit points<span class="mhp-sub">tick what you actually said &middot; your score reflects coverage</span></div>' +
          '<div class="mhp-list">' + items + '</div>' +
          '<div class="mhp-cov">Covered <b id="mhpN">0</b> / ' + this._mhp.length + ' &middot; <span id="mhpRec"></span></div></div>';
      }
      html += '<div class="judge"><button type="button" class="miss" id="jm" aria-keyshortcuts="1">&#10007; Missed <span class="hint">[1]</span></button>' +
        '<button type="button" class="shk" id="js" aria-keyshortcuts="2">&#126; Shaky <span class="hint">[2]</span></button>' +
        '<button type="button" class="got" id="jg" aria-keyshortcuts="3">&#10003; Solid <span class="hint">[3]</span></button></div>';
    }
    html += '</div>';
    this._dwrap.innerHTML = html;
    /* Land on what just appeared. On a REVEAL this is the answer / the follow-up -- i.e. the
       exact content the user pressed the button to get. Note we do NOT also fire a live-region
       announcement for a reveal: the answer is long-form prose, and a polite region would recite
       the whole thing with no way to pause, re-read or navigate, on top of the focus utterance.
       A live region is for terse transient status (the score); FOCUS is for content you have to
       read. The drill previously got both of those backwards -- it announced neither and focused
       nothing. */
    if (land) this._focusNew(this._newBlock(stage));
    const advBtn = this._root.getElementById('adv');
    if (advBtn) { advBtn.onclick = function () { self.drawCard(stage + 1, true); }; }
    const missBtn = this._root.getElementById('jm');
    if (missBtn) { missBtn.onclick = function () { self.judge(1); }; }
    const shkBtn = this._root.getElementById('js');
    if (shkBtn) { shkBtn.onclick = function () { self.judge(2); }; }
    const gotBtn = this._root.getElementById('jg');
    if (gotBtn) { gotBtn.onclick = function () { self.judge(3); }; }
    const mhpList = this._dwrap.querySelector('.mhp-list');
    if (mhpList) {
      mhpList.addEventListener('click', function (event) {
        const it = event.target.closest('.mhp-i');
        if (!it) return;
        const i = +it.getAttribute('data-i');
        self._cov[i] = !self._cov[i];
        it.classList.toggle('on', !!self._cov[i]);
        it.setAttribute('aria-pressed', self._cov[i] ? 'true' : 'false');
        self._updCov();
      });
      this._updCov();
    }
    /* Signal the dock (visible-pane read, never a hidden one) so its micro tier can arm/disarm the
       judgment keys as the reveal advances. Cheap: fires only on a draw, and only the dock listens. */
    try { this.dispatchEvent(new CustomEvent('flowjudgment', { bubbles: true })); } catch (e) {}
  }
  /* Is the drill sitting on a revealed probe awaiting a grade? (the dock's micro armed-keys gate)
     `di < cards.length` is the ROOT-CAUSE guard for audit #6: _judgeOn is set true by drawCard at a
     probe's max stage and is NEVER cleared when renderD() falls into renderDebrief() (which does not
     call drawCard), so at the debrief it was left stale-true and atJudgment() lied -- arming a
     phantom grade legend on a terminal with no probe on screen. At the debrief di===cards.length, so
     this is false there, honestly. */
  atJudgment() { return !!this._judgeOn && this.mode !== 'mock' && this.di < cards.length; }
  /* At the study/quick DEBRIEF -- every probe in the working set answered, a TERMINAL, not a probe
     awaiting a grade. nextUp() reads this to classify the debrief as MESO (a re-drill CTA + a live
     `n`) rather than the MICRO tier meant for a probe still on screen. mock has its own verdict
     terminal (renderVerdict), excluded here exactly as atJudgment excludes it. */
  atDebrief() { return this.mode !== 'mock' && this.di >= cards.length; }
  judge(level) {
    /* R5: level is 1 (missed) / 2 (shaky) / 3 (solid). got/shk stay derived --
       solid (3) is a "got", missed + shaky (1,2) are "to revisit" -- so every
       downstream consumer (debrief, weak-drill, session-progress, persistence) is
       untouched; the finer level rides on the result for the richer debrief and a
       missed-first re-drill. A bare boolean is still accepted defensively. */
    if (level === true) level = 3; else if (level === false) level = 2;
    const solid = (level >= 3);
    const card = cards[this.di];
    if (solid) this.got++; else this.shk++;
    const originalIdx = _allCards.indexOf(card);
    if (originalIdx > -1) { if (solid) { delete this.revisit[originalIdx]; } else { this.revisit[originalIdx] = true; } }
    /* grounded coverage: how many must-hit points were ticked, and which dropped */
    const mhp = this._mhp || [], cov = this._cov || {}, dropped = [];
    let covered = 0;
    for (let i = 0; i < mhp.length; i++) { if (cov[i]) covered++; else dropped.push(mhp[i]); }
    this.results.push({ signal: card.signal, tier: card.tier, ok: solid, level: level, card: card, speak: speakLines[this.di], cov: { n: covered, m: mhp.length, dropped: dropped } });
    this.di++;
    this.renderD(true);
    /* ===================== SPEAK THE GRADE =====================
       The scoreboard is the drill's ONLY feedback, and it was mute: grading fired nine DOM
       mutations and not one of them was inside a live region. The user graded a card and the
       reader said nothing -- twenty-two times a round.

       The fix is a call, not a component. ViewManager.announce() has been a correct
       visually-hidden polite region this whole time; it simply had two callers (pane switch,
       topic switch) and the highest-stakes signal in the app was not one of them.

       WHAT IT SAYS: the outcome, then the running score -- what changed, and where you now
       stand. The wording tracks the two vocabularies already on screen, deliberately: the
       OUTCOME is the word on the button the user just pressed (Missed / Shaky / Solid) and the
       SCORE is the words on the scoreboard tiles (solid / revisit / left). `shk` counts shaky
       AND missed, which is exactly what the "Revisit" tile displays, so the spoken score and
       the visible score can never disagree.

       ORDERING, since focus also moves on this same click: focus lands synchronously on the
       new probe (the task), and the announcement is deferred ~30ms into a POLITE region (the
       confirmation). So the reader hears the new probe, then "Solid. 4 solid, 1 revisit, 17
       left." That is the right order -- the user already knows which button they pressed; what
       they do not know is the next question. Polite exists precisely so a confirmation can
       arrive without interrupting. (And the mock clock no longer sits in front of this in the
       polite queue -- see the timer in the skeleton above.) */
    const left = cards.length - this.di;
    const outcome = (level >= 3) ? 'Solid' : (level === 2 ? 'Shaky' : 'Missed');
    const msg = (this.di >= cards.length)
      ? this._roundEndMsg(outcome)                    /* shared with the clock-expiry exit */
      : outcome + '. ' + this.got + ' solid, ' + this.shk + ' revisit, ' + left + ' left.';
    this._say(msg);
    try { this.dispatchEvent(new CustomEvent('drillgraded', { bubbles: true })); } catch (e) {}
    const bumpEl = solid ? this._sGot : this._sShk;
    if (bumpEl) { bumpEl.classList.remove('cbump'); void bumpEl.offsetWidth; bumpEl.classList.add('cbump'); }
  }
  renderDebrief() {
    const self = this;
    /* W2 -- % is over the probes ANSWERED THIS RUN (results.length), not the full bank. Identical on
       a full run (answered === cards.length); the difference shows only on a RESUMED run, where the
       debrief is inherently this-session's coverage detail (its cov/dropped rows come from live
       grading the record does not store) -- so scoring it against the full bank penalized a perfect
       resume (17/22 = 77%). The cumulative picture lives in the record (panel / dock / pip). */
    const pct = Math.round(this.got / Math.max(1, this.results.length) * 100);
    /* W2 -- the coverage label must not imply full-bank mastery on a RESUMED run. `pct` is over the
       probes ANSWERED THIS RUN (results.length). When that IS the whole working set (a full run) the
       label stays the unchanged "signal coverage" -- byte-identical to the old full-bank math, since
       results.length === cards.length there (the structural-equivalence case, gated). When fewer were
       answered (resumed past probe 1, or jumped forward), it reads "of N answered this run", so a
       perfect 17/17 never renders as 17/22. Quick 5 always runs its whole 5, so it keeps its label. */
    const answered = this.results.length;
    const covLabel = (this.mode === 'quick') ? 'of a quick 5'
      : (answered === cards.length) ? 'signal coverage'
      : 'of ' + answered + ' answered this run';
    let nMissed = 0, nShaky = 0, nSolid = 0;
    for (let ri = 0; ri < this.results.length; ri++) { const _l = this.results[ri].level || (this.results[ri].ok ? 3 : 2); if (_l >= 3) nSolid++; else if (_l === 2) nShaky++; else nMissed++; }
    const sumParts = [];
    if (nMissed) sumParts.push(nMissed + ' missed');
    if (nShaky) sumParts.push(nShaky + ' shaky');
    sumParts.push(nSolid + ' solid');
    let rows = '';
    for (let r = 0; r < this.results.length; r++) {
      const entry = this.results[r];
      const drop = (!entry.ok && entry.cov && entry.cov.dropped && entry.cov.dropped.length) ? '<div class="sigdrop">dropped: ' + entry.cov.dropped.join(', ') + '</div>' : '';
      const _lv = entry.level || (entry.ok ? 3 : 2), _cls = _lv >= 3 ? 'ok' : (_lv === 2 ? 'no' : 'miss'), _mk = _lv >= 3 ? '\u2713' : (_lv === 2 ? '\u007e' : '\u2717');
      rows += '<div class="sigrow ' + _cls + '"><div class="mk">' + _mk + '</div>' +
        '<div class="nm">' + entry.signal + drop + '</div><div class="tr"><span class="tier ' + DRILL_TIER_CLASS[entry.tier] + '">' + entry.tier + '</span></div></div>';
    }
    let verdict;
    if (pct >= 80) verdict = 'You\'re carrying the signals a senior loop grades on. The shaky ones are polish, not gaps &mdash; re-run those threads until the <b>senior-signal line</b> comes out unprompted.';
    else if (pct >= 50) verdict = 'Solid core, real gaps. The signals you marked <b>Revisit</b> are exactly what an interviewer probes to separate levels &mdash; drill those threads to the last layer before the real round.';
    else verdict = 'You know the happy path; the depth isn\'t there yet. Work the <b>Walkthrough</b> + <b>See the code</b>, then re-run &mdash; the follow-up chains are where this round is won or lost.';
    const weakBtn = this.shk > 0 ? '<button type="button" id="dweak" class="btn-sec">Drill my ' + this.shk + ' Revisit ' + (this.shk === 1 ? 'probe' : 'probes') + ' \u2192</button>' : '';
    this._dwrap.innerHTML = '<div class="card debrief"><div class="big">' + (this.mode === 'quick' ? 'Quick 5 debrief' : 'Interviewer debrief') + '</div>' +
      '<div class="sumline">' + sumParts.join(' &middot; ') + ' &middot; ' + pct + '% ' + covLabel + '</div>' +
      rows + '<div class="verdict">' + verdict + '</div>' + '<div class="flow-slot" id="dflow"></div>' + weakBtn +
      '<button type="button" id="drestart">' + (this.mode === 'quick' ? 'Another quick 5 &rarr;' : 'Run the full round again') + '</button></div>';
    /* These two buttons live INSIDE #dwrap, so pressing them destroys them. Land on the card
       (or debrief) that replaces them, or focus falls to <body> exactly as before. */
    if (this.shk > 0) { this._root.getElementById('dweak').onclick = function () { self.drillWeak(true); }; }
    this._root.getElementById('drestart').onclick = function () { self.setMode(self.mode, true); };
    /* W1 decision-table rows 2-3: hand the CLEAN debrief forward to the next surface. When shk>0
       (row 2) the #dweak button IS the recommendation, so SELF-dedupe suppresses the strip -- one
       offered next per screen, no button soup. Computed on flowFresh (the W0 freshness law: the
       last grade's snapshot must land before flowRec reads the record) and rendered from flowRec
       (ONE compute -- the same engine the session panel and every other terminal use). */
    if (typeof flowFresh === 'function' && typeof flowRec === 'function') {
      flowFresh(function () {
        var slot = self._root.getElementById('dflow');
        if (!slot) return;
        var rec = flowRec();
        rec.self = (self.shk > 0);   /* #dweak already offers the re-drill (SELF-dedupe) */
        slot.innerHTML = (typeof flowStripHtml === 'function') ? flowStripHtml(rec) : '';
        var btn = slot.querySelector('.flow-go');
        if (btn) btn.onclick = function () { if (typeof flowGo === 'function') flowGo(rec); };
      });
    }
  }
  drillWeak(moveFocus) {
    const weakCards = this.results.filter(function (r) { return !r.ok; }).sort(function (a, b) { return (a.level || (a.ok ? 3 : 2)) - (b.level || (b.ok ? 3 : 2)); });
    if (!weakCards.length) return false;
    cards = weakCards.map(function (r) { return r.card; });
    speakLines = weakCards.map(function (r) { return r.speak; });
    this.di = 0; this.got = 0; this.shk = 0; this.results = []; this.revisitMode = true;
    this.renderD(moveFocus);
    return true;
  }
  /* #revdrill lives in the invariant skeleton, so it is not destroyed -- but updRevset() HIDES
     it the moment revisitMode goes true, and focus on a display:none element is just as gone.
     Same destination either way: the first card of the set the user asked for. */
  drillRevset() {
    const indices = [];
    for (let key in this.revisit) { if (this.revisit.hasOwnProperty(key)) indices.push(+key); }
    if (!indices.length) return;
    indices.sort(function (a, b) { return a - b; });
    cards = indices.map(function (i) { return _allCards[i]; });
    speakLines = indices.map(function (i) { return _allSpeak[i]; });
    this.di = 0; this.got = 0; this.shk = 0; this.results = []; this.revisitMode = true;
    this.stopTimer();
    this.renderD(true);
  }
  updRevset() {
    let count = 0;
    for (let key in this.revisit) { if (this.revisit.hasOwnProperty(key)) count++; }
    const box = this._root.getElementById('revset');
    if (!box) return;
    if (count > 0 && !this.revisitMode && this.di < cards.length) {
      box.style.display = '';
      this._root.getElementById('revn').textContent = count;
      this._root.getElementById('revw').textContent = (count === 1 ? 'probe' : 'probes');
    } else {
      box.style.display = 'none';
    }
  }
  _fmt(s) { const minutes = Math.floor(s / 60), seconds = s % 60; return minutes + ':' + (seconds < 10 ? '0' : '') + seconds; }
  startTimer() {
    const self = this;
    this.mockLeft = 22 * 60;
    this._timerEl.textContent = this._fmt(this.mockLeft);
    this._timerEl.style.display = 'block';
    this._timerEl.classList.remove('low');
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(function () {
      self.mockLeft--;
      self._timerEl.textContent = self._fmt(self.mockLeft);
      if (self.mockLeft <= 60) self._timerEl.classList.add('low');
      /* ===================== THE FIFTH FOCUS-DESTRUCTION SITE =====================
         This line used to read `self.renderD()` -- no argument -- and it is the WORST of the five,
         because it is the only one the user did not trigger. The clock silently ends a 22-minute
         mock round: renderVerdict() replaces #dwrap, the card the user was reading is destroyed,
         focus falls to <body>, and the screen reader says NOTHING. They cannot know the round is
         over. It hits sighted keyboard users too -- Tab restarts from the top of the document.
         The other four exits opted into the focus move; this one, reached by a timer rather than a
         click, was never enumerated. (It is an incompleteness, not a regression: the pre-fix build
         is equally broken here. Nothing guarded it -- the sr-verify script never mentions mockLeft.)

         renderD() is STILL called with no argument, deliberately. _focusDoomed() now repairs focus
         exactly when this redraw destroys it and leaves it alone otherwise, which is what makes
         this safe: the clock keeps running after you switch panes, and forcing renderD(true) here
         would yank a user out of the walkthrough they are reading and into a hidden drill -- a
         change of context on no user action, i.e. a new bug in place of the old one.

         The announcement is NOT conditional on any of that: whichever pane you are on, a round you
         started has just ended, and that is exactly what a live region is for. */
      if (self.mockLeft <= 0) {
        clearInterval(self.timerId); self.timerId = null;
        self.di = cards.length;
        self.renderD();
        self._say(self._roundEndMsg('Time'));
      }
    }, 1000);
  }
  stopTimer() { if (this.timerId) { clearInterval(this.timerId); this.timerId = null; } this._timerEl.style.display = 'none'; }
  basePoolIdx() {
    const indices = [];
    for (let i = 0; i < _allCards.length; i++) {
      if (this.tierFilter === 'all' || _allCards[i].tier === this.tierFilter) indices.push(i);
    }
    return indices;
  }
  /* moveFocus is passed ONLY by the debrief/verdict restart buttons, which live inside #dwrap
     and are destroyed by the re-render. The mode/tier toggles do NOT pass it and must not:
     they sit in the invariant skeleton, so focus on them SURVIVES the #dwrap rewrite and
     stays where the user put it -- and setMode is also the boot path (renderTopic ->
     setMode('study')), where stealing focus into a possibly-hidden pane would be a new bug. */
  setMode(m, moveFocus) {
    this.mode = m;
    const base = this.basePoolIdx();
    if (m === 'quick') {
      const quickIdx = dShuffle(base.length).slice(0, 5).map(function (i) { return base[i]; });
      cards = quickIdx.map(function (i) { return _allCards[i]; });
      speakLines = quickIdx.map(function (i) { return _allSpeak[i]; });
    } else {
      cards = base.map(function (i) { return _allCards[i]; });
      speakLines = base.map(function (i) { return _allSpeak[i]; });
    }
    this.di = 0; this.got = 0; this.shk = 0; this.results = []; this.revisitMode = false;
    const modeBtns = this._modetog.children;
    for (let z = 0; z < modeBtns.length; z++) modeBtns[z].classList.toggle('on', modeBtns[z].getAttribute('data-m') === m);
    if (m === 'mock') this.startTimer(); else this.stopTimer();
    this.renderD(moveFocus);
  }
  recLevel(pct, depthOk) {
    if (pct >= 85 && depthOk) return { c: 'sh', t: 'Strong Hire' };
    if (pct >= 70) return { c: 'h', t: 'Hire' };
    if (pct >= 50) return { c: 'lh', t: 'Lean Hire' };
    return { c: 'nh', t: 'No Hire' };
  }
  renderVerdict() {
    const self = this;
    this.stopTimer();
    const answered = this.results.length, pct = Math.round(this.got / cards.length * 100);
    let depthSolid = 0, depthTotal = 0;
    for (let r = 0; r < this.results.length; r++) {
      if (this.results[r].tier === 'Staff' || this.results[r].tier === 'EXTEND') { depthTotal++; if (this.results[r].ok) depthSolid++; }
    }
    const depthOk = depthTotal > 0 && depthSolid / depthTotal >= 0.66;
    const rec = this.recLevel(pct, depthOk);
    let rows = '';
    for (let r = 0; r < this.results.length; r++) {
      const entry = this.results[r];
      const drop = (!entry.ok && entry.cov && entry.cov.dropped && entry.cov.dropped.length) ? '<div class="sigdrop">dropped: ' + entry.cov.dropped.join(', ') + '</div>' : '';
      const _lv = entry.level || (entry.ok ? 3 : 2), _cls = _lv >= 3 ? 'ok' : (_lv === 2 ? 'no' : 'miss'), _mk = _lv >= 3 ? '\u2713' : (_lv === 2 ? '\u007e' : '\u2717');
      rows += '<div class="sigrow ' + _cls + '"><div class="mk">' + _mk + '</div>' +
        '<div class="nm">' + entry.signal + drop + '</div><div class="tr"><span class="tier ' + DRILL_TIER_CLASS[entry.tier] + '">' + entry.tier + '</span></div></div>';
    }
    let note;
    if (rec.c === 'sh') note = 'Depth held under the Staff / EXTEND probes &mdash; that\'s exactly what tips a packet from Hire to <b>Strong Hire</b>.';
    else if (rec.c === 'h') note = 'Strong coverage. To reach Strong Hire, the <b>Staff-tier</b> threads have to be solid, not just attempted.';
    else if (rec.c === 'lh') note = 'Enough signal for a phone screen, not an onsite. The gap is <b>depth</b> &mdash; drill the multi-layer threads to the end.';
    else note = 'Below bar &mdash; the happy path isn\'t enough. Work Walkthrough + See-the-code, then run the round again.';
    let used = 22 * 60 - this.mockLeft;
    if (used < 0) used = 0;
    this._dwrap.innerHTML = '<div class="card debrief"><div class="rec ' + rec.c + '"><div class="lvl">' + rec.t + '</div>' +
      '<div class="tu">' + this.got + ' / ' + cards.length + ' signals &middot; ' + answered + ' probes reached &middot; ' + this._fmt(used) + ' on the clock</div></div>' +
      '<div style="height:12px"></div>' + rows + '<div class="verdict">' + note + '</div>' +
      '<div class="flow-slot" id="vrflow"></div>' +
      '<button type="button" id="vrestart">Run another round</button></div>';
    this._root.getElementById('vrestart').onclick = function () { self.setMode('mock', true); };
    /* W1 decision-table row 8: the drill-pane timed-mock verdict (the fifth terminal) hands forward
       to the next surface, the same strip logic as the mock overlay's end (rows 6-7). #vrestart
       ("Run another round") re-runs the timed drill -- not a ladder rec -- so there is no SELF
       conflict; the strip is the complementary forward path. flowFresh (freshness law) + flowRec
       (ONE compute). */
    if (typeof flowFresh === 'function' && typeof flowRec === 'function') {
      flowFresh(function () {
        var slot = self._root.getElementById('vrflow');
        if (!slot) return;
        var r = flowRec();
        slot.innerHTML = (typeof flowStripHtml === 'function') ? flowStripHtml(r) : '';
        var b = slot.querySelector('.flow-go');
        if (b) b.onclick = function () { if (typeof flowGo === 'function') flowGo(r); };
      });
    }
  }
  setTier(t) {
    this.tierFilter = t;
    const tn = this._root.getElementById('tiernote');
    /* Same guard as renderTopic: a topic with no note for this tier (and no "all") must fall back
       to the skeleton's copy, never to the string "undefined". */
    if (tn) tn.innerHTML = DRILL_TIER_NOTES[t] || DRILL_TIER_NOTES.all || this._tiernoteBase;
    for (let z = 0; z < this._tiertog.children.length; z++) this._tiertog.children[z].classList.toggle('on', this._tiertog.children[z].getAttribute('data-tier') === t);
    this.setMode(this.mode);
  }
  /* Two different questions, two different answers -- conflating them was a P0.
     dTot / dDone / dGot / dShk / revisit describe THIS RUN over the CURRENT WORKING
     SET (`cards`), which setMode('quick'), setTier(), drillWeak() and drillRevset()
     all deliberately shrink to a subset. They are the DRILL'S OWN view of the run in
     front of the user, and nothing that has to outlive the run may read them.
     Two callers learned that the hard way, and neither reads the working set any more:
       - the persisted topic record -- writing it there truncated a completed
         {done:22,tot:22} to {done:1,tot:3} on the first grade of a 3-probe re-drill;
       - the session-progress panel -- a page load starts `results` empty, so it
         announced "Not started -- 0 of 22 graded" on a finished topic and sent the user
         "Back to the drill ->". It now reads the canonical record (see session-progress.js),
         and takes only bankTot from here -- the one number the record cannot supply
         before a topic has ever been graded.
     The bank-relative fields below answer "which probe of the WHOLE topic did the user
     just grade, and how", so Progress can MERGE the grade into the full-topic record
     instead of overwriting it with the subset on screen.
     `i` is the probe's index in _allCards (cards holds _allCards' own object refs,
     never copies), and `id` is that probe's CONTENT-DERIVED identity.

     WHY BOTH, AND WHY `id` IS THE ONE THAT PERSISTS. `i` is a position and dies the
     moment a card is inserted above it -- it is fine for THIS session's in-memory
     revisit map (the bank cannot change mid-session) and useless as a durable key.
     A stored grade must survive the 38 topics being authored, i.e. survive probes
     being inserted and reordered, so persistence keys on `id` (see card-id.js) and
     progress.js writes nothing positional. bankIds[] is published in bank order so
     the reader can pair id <-> signal without re-deriving anything. */
  getStats() {
    const bankIds = (typeof CardId !== 'undefined') ? CardId.forCards(_allCards) : [];
    return {
      dTot: cards.length, dDone: this.results.length, dGot: this.got, dShk: this.shk,
      revisit: this.results.filter(function (r) { return !r.ok; }).map(function (r) { return r.signal; }),
      bankTot: _allCards.length,
      bankSignals: _allCards.map(function (c) { return c.signal; }),
      bankIds: bankIds,
      graded: this.results.map(function (r) {
        const i = _allCards.indexOf(r.card);
        return { i: i, id: (i >= 0 ? bankIds[i] : null), level: r.level || (r.ok ? 3 : 2) };
      })
    };
  }
  reset() { this.setMode('study'); }
  /* Load a re-drill set from explicit BANK INDICES -- the reload-proof way in.
     drillWeak() reads THIS RUN's `results` and drillRevset() THIS RUN's `revisit` flags, and a
     page load empties BOTH (see the constructor / setMode). That is fine for the debrief, which
     by definition has a run behind it, but not for the session panel: its "Re-drill weak spots"
     recommendation is driven by the PERSISTED record and can therefore fire on a freshly loaded
     page, where drillWeak() would find nothing, silently return false, and leave the user staring
     at the study list they were promised a drill of. Indices, because the record is keyed by the
     probe's position in the bank -- the one identifier that survives a reload. */
  drillBank(indices) {
    const idx = (indices || []).filter(function (i) { return i >= 0 && i < _allCards.length; })
      .sort(function (a, b) { return a - b; });
    if (!idx.length) return false;
    cards = idx.map(function (i) { return _allCards[i]; });
    speakLines = idx.map(function (i) { return _allSpeak[i]; });
    this.di = 0; this.got = 0; this.shk = 0; this.results = []; this.revisitMode = true;
    /* carry the flags in, so re-grading one Solid clears it exactly as it would mid-run */
    this.revisit = {};
    for (let k = 0; k < idx.length; k++) this.revisit[idx[k]] = true;
    this.stopTimer();
    /* Always an explicit user action ("Re-drill weak spots" from the session panel, which also
       switches to this pane), so landing on the first card is right -- and the panel button
       that triggered it is on its way out anyway. */
    this.renderD(true);
    return true;
  }
  /* Re-drill the weak spots. Given the canonical bank indices, use them; otherwise fall back to
     this run's results (the in-run callers, which have one). */
  weak(bankIdx) { return this.drillBank(bankIdx) || this.drillWeak(true); }
}
customElements.define('deep-drill', DeepDrill); 