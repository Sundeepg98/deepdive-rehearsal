/* ============ GAME-PLAN OVERLAY (web component) ============
   Static content, encapsulated. Frame + open-close wiring (cram-sheet.js openPlan ->
   ovShow) stay light-DOM; content moves into this shadow, styled by BASE_SHEET + the
   shared CS_SHEET (same .cs-* family as scope/cram). No game-plan-specific CSS. */
class DeepGameplan extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, CS_SHEET];
    root.innerHTML = `<div class="cs-one"><span class="cs-one-l">The principle</span>Active recall beats re-reading. Don&rsquo;t just read the answers &mdash; <b>say them out loud, get graded, find your weak signals, and re-drill those.</b> Six short days, ~30&nbsp;minutes each.</div>
      <div class="cs-sec">
        <div class="cs-st">Day 1 &mdash; learn the shape</div>
        <div class="cs-ha">Read the <b>Walkthrough</b> and <b>System Map</b> end to end &mdash; the mechanics, then where this sits in the larger system.</div>
        <div class="cs-ha">Run the <b>Probe Drill</b> in <i>study</i> mode: reveal every answer, don&rsquo;t grade. You&rsquo;re learning the 20 signals and the follow-up chains, not testing yet.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Day 2 &mdash; grade yourself</div>
        <div class="cs-ha">Run the <b>Probe Drill</b> in <i>graded</i> mode, cold. Mark each <b>Solid</b> or <b>Revisit</b> honestly &mdash; no half-credit.</div>
        <div class="cs-ha">Open <b>Session progress</b>: it lists the signals you flagged. Re-drill those until the answer comes <i>without</i> the prompt.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Day 3 &mdash; reconstruct &amp; defend</div>
        <div class="cs-ha"><b>Whiteboard</b> recall: rebuild the whole design from cues alone, no peeking.</div>
        <div class="cs-ha"><b>Trade-offs</b>: for each fork, say the pick-when for <i>both</i> sides &mdash; never defend just one.</div>
        <div class="cs-ha"><b>Model Answers</b>: pick two or three angles and say them out loud, start to finish.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Day 4 &mdash; pressure</div>
        <div class="cs-ha"><b>Mock run</b> on the clock with <i>Interviewer cuts in</i> turned on &mdash; survive the interrupts.</div>
        <div class="cs-ha"><b>Mixed fire</b>: probes, curveballs, and trade-offs in random order &mdash; the register-switching is the hardest part. Retry the ones you fumble.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Day 5 &mdash; sharpen &amp; track</div>
        <div class="cs-ha">Re-run <b>Mixed fire</b> and the weak <b>Probe Drill</b> signals from your session.</div>
        <div class="cs-ha">Save your <b>Session</b> code; paste yesterday&rsquo;s to watch the trend climb.</div>
        <div class="cs-ha">Read the <b>Cram sheet</b> once &mdash; the spine, the decisions, the numbers.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Interview eve &mdash; 20 minutes</div>
        <div class="cs-ha"><b>30-Second</b> opener, out loud, twice.</div>
        <div class="cs-ha">One <b>Mixed fire</b> set &mdash; just to feel sharp.</div>
        <div class="cs-ha"><b>Cram sheet</b>, one pass. Then close the laptop and trust the reps.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">How to use Session progress</div>
        <div class="cs-ha">After any practice it shows where you&rsquo;re weak across all four modes and one <b>Focus next</b> nudge &mdash; let it pick what you drill.</div>
        <div class="cs-ha">Save the code each day; paste past codes to see <b>Drill</b>, <b>Whiteboard</b>, <b>Mock</b>, and <b>Mixed fire</b> all trending over time.</div>
      </div>
      <div class="cs-dim">The tool grades <i>signals</i>, not trivia. When the senior line comes out unprompted, you&rsquo;re ready.</div>`;
  }
}
customElements.define('deep-gameplan', DeepGameplan);
