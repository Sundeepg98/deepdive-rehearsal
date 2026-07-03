/* topics/authz.js -- topic 3 (Tenant Authorization) include wrapper. identity + 9
   per-pane data slices + the cross-pane bank, THEN register. drill.js MUST precede
   bank.js (bank aliases AUTHZ_CARDS / AUTHZ_SPEAK). Loaded after topics 1-2 so topic
   1 stays the boot/default topic; registering here adds it to the switcher. */
<!--@build:include topics/authz/identity.js-->
<!--@build:include topics/authz/walk.js-->
<!--@build:include topics/authz/drill.js-->
<!--@build:include topics/authz/wb.js-->
<!--@build:include topics/authz/sys.js-->
<!--@build:include topics/authz/trade.js-->
<!--@build:include topics/authz/model.js-->
<!--@build:include topics/authz/num.js-->
<!--@build:include topics/authz/rf.js-->
<!--@build:include topics/authz/open.js-->
<!--@build:include topics/authz/bank.js-->
<!--@build:include topics/authz/register.js-->
