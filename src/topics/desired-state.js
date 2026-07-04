/* topics/desired-state.js -- topic 7 (Desired State) include wrapper. identity + 9
   per-pane data slices + the cross-pane bank, THEN register. drill.js MUST precede
   bank.js (bank aliases DS_CARDS / DS_SPEAK). Loaded after topics 1-6 so topic 1
   stays the boot/default topic; registering here adds it to the switcher. */
<!--@build:include topics/desired-state/identity.js-->
<!--@build:include topics/desired-state/walk.js-->
<!--@build:include topics/desired-state/drill.js-->
<!--@build:include topics/desired-state/wb.js-->
<!--@build:include topics/desired-state/sys.js-->
<!--@build:include topics/desired-state/trade.js-->
<!--@build:include topics/desired-state/model.js-->
<!--@build:include topics/desired-state/num.js-->
<!--@build:include topics/desired-state/rf.js-->
<!--@build:include topics/desired-state/open.js-->
<!--@build:include topics/desired-state/bank.js-->
<!--@build:include topics/desired-state/register.js-->
