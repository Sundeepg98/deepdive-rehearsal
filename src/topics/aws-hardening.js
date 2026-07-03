/* topics/aws-hardening.js -- topic 4 (AWS Hardening) include wrapper. identity + 9
   per-pane data slices + the cross-pane bank, THEN register. drill.js MUST precede
   bank.js (bank aliases AWSHARD_CARDS / AWSHARD_SPEAK). Loaded after topics 1-3 so topic
   1 stays the boot/default topic; registering here adds it to the switcher. */
<!--@build:include topics/aws-hardening/identity.js-->
<!--@build:include topics/aws-hardening/walk.js-->
<!--@build:include topics/aws-hardening/drill.js-->
<!--@build:include topics/aws-hardening/wb.js-->
<!--@build:include topics/aws-hardening/sys.js-->
<!--@build:include topics/aws-hardening/trade.js-->
<!--@build:include topics/aws-hardening/model.js-->
<!--@build:include topics/aws-hardening/num.js-->
<!--@build:include topics/aws-hardening/rf.js-->
<!--@build:include topics/aws-hardening/open.js-->
<!--@build:include topics/aws-hardening/bank.js-->
<!--@build:include topics/aws-hardening/register.js-->
