/* topics/signing.js -- topic 2 (Package Signing) include wrapper. identity + 9
   per-pane data slices + the cross-pane bank, THEN register. drill.js MUST precede
   bank.js (bank aliases SIGN_CARDS / SIGN_SPEAK). Loaded after topic 1's bundle so
   topic 1 stays the boot/default topic; registering here makes the switcher appear. */
<!--@build:include topics/signing/identity.js-->
<!--@build:include topics/signing/walk.js-->
<!--@build:include topics/signing/drill.js-->
<!--@build:include topics/signing/wb.js-->
<!--@build:include topics/signing/sys.js-->
<!--@build:include topics/signing/trade.js-->
<!--@build:include topics/signing/model.js-->
<!--@build:include topics/signing/num.js-->
<!--@build:include topics/signing/rf.js-->
<!--@build:include topics/signing/open.js-->
<!--@build:include topics/signing/bank.js-->
<!--@build:include topics/signing/register.js-->
