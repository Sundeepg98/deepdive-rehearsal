/* topics/eav.js -- topic 6 (Attribute Store / EAV) include wrapper. identity + 9
   per-pane data slices + the cross-pane bank, THEN register. drill.js MUST precede
   bank.js (bank aliases EAV_CARDS / EAV_SPEAK). Loaded after topics 1-5 so topic 1
   stays the boot/default topic; registering here adds it to the switcher. */
<!--@build:include topics/eav/identity.js-->
<!--@build:include topics/eav/walk.js-->
<!--@build:include topics/eav/drill.js-->
<!--@build:include topics/eav/wb.js-->
<!--@build:include topics/eav/sys.js-->
<!--@build:include topics/eav/trade.js-->
<!--@build:include topics/eav/model.js-->
<!--@build:include topics/eav/num.js-->
<!--@build:include topics/eav/rf.js-->
<!--@build:include topics/eav/open.js-->
<!--@build:include topics/eav/bank.js-->
<!--@build:include topics/eav/register.js-->
