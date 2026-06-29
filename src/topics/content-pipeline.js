/* topics/content-pipeline.js -- FOUNDATION include wrapper: the topic-1 bundle.
   identity + 9 per-pane data slices + the cross-pane bank, THEN register (which seeds
   the working-set globals as the first topic). Loaded after the drill data globals and
   before the 9 pane classes (see app.js / the appendix load-order invariant). */
<!--@build:include topics/content-pipeline/identity.js-->
<!--@build:include topics/content-pipeline/walk.js-->
<!--@build:include topics/content-pipeline/drill.js-->
<!--@build:include topics/content-pipeline/wb.js-->
<!--@build:include topics/content-pipeline/sys.js-->
<!--@build:include topics/content-pipeline/trade.js-->
<!--@build:include topics/content-pipeline/model.js-->
<!--@build:include topics/content-pipeline/num.js-->
<!--@build:include topics/content-pipeline/rf.js-->
<!--@build:include topics/content-pipeline/open.js-->
<!--@build:include topics/content-pipeline/bank.js-->
<!--@build:include topics/content-pipeline/register.js-->
