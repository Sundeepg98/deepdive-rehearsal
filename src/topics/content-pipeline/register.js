/* topics/content-pipeline/register.js -- FOUNDATION.
   Registers topic 1. As the FIRST topic, register() calls publishBanks (seeding the
   cross-pane working-set globals from bank) and sets TOPIC_CMP_NOTES from identity --
   so mock-run/mixed-fire and the companion work at boot with zero behaviour change. */
TopicRegistry.register({
  id: 'content-pipeline',
  identity: TOPIC_CP_IDENTITY,
  data: {
    walk: TOPIC_CP_WALK, drill: TOPIC_CP_DRILL, wb: TOPIC_CP_WB, sys: TOPIC_CP_SYS,
    trade: TOPIC_CP_TRADE, model: TOPIC_CP_MODEL, num: TOPIC_CP_NUM, rf: TOPIC_CP_RF,
    open: TOPIC_CP_OPEN, bank: TOPIC_CP_BANK
  }
});
