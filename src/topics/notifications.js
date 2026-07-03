/* topics/notifications.js -- topic 5 (Notifications) include wrapper. identity + 9
   per-pane data slices + the cross-pane bank, THEN register. drill.js MUST precede
   bank.js (bank aliases NOTIF_CARDS / NOTIF_SPEAK). Loaded after topics 1-4 so topic
   1 stays the boot/default topic; registering here adds it to the switcher. */
<!--@build:include topics/notifications/identity.js-->
<!--@build:include topics/notifications/walk.js-->
<!--@build:include topics/notifications/drill.js-->
<!--@build:include topics/notifications/wb.js-->
<!--@build:include topics/notifications/sys.js-->
<!--@build:include topics/notifications/trade.js-->
<!--@build:include topics/notifications/model.js-->
<!--@build:include topics/notifications/num.js-->
<!--@build:include topics/notifications/rf.js-->
<!--@build:include topics/notifications/open.js-->
<!--@build:include topics/notifications/bank.js-->
<!--@build:include topics/notifications/register.js-->
