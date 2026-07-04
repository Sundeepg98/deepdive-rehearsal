/* topics/iac.js -- topic 8 (Infrastructure as Code) include wrapper. identity + 9
   per-pane data slices + the cross-pane bank, THEN register. drill.js MUST precede
   bank.js (bank aliases IAC_CARDS / IAC_SPEAK). Loaded after topics 1-7 so topic 1
   stays the boot/default topic; registering here adds it to the switcher. */
<!--@build:include topics/iac/identity.js-->
<!--@build:include topics/iac/walk.js-->
<!--@build:include topics/iac/drill.js-->
<!--@build:include topics/iac/wb.js-->
<!--@build:include topics/iac/sys.js-->
<!--@build:include topics/iac/trade.js-->
<!--@build:include topics/iac/model.js-->
<!--@build:include topics/iac/num.js-->
<!--@build:include topics/iac/rf.js-->
<!--@build:include topics/iac/open.js-->
<!--@build:include topics/iac/bank.js-->
<!--@build:include topics/iac/register.js-->
