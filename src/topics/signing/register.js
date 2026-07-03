/* topics/signing/register.js -- registers topic 2 (Package Signing). NOT the first
   topic, so register() does NOT publishBanks or seed TOPIC_CMP_NOTES -- topic 1 owns
   boot. The switcher shows this the moment it registers; setTopic('signing') then
   reseeds the working set and applies this identity. */
TopicRegistry.register({
  id: 'signing',
  identity: TOPIC_SIGN_IDENTITY,
  data: {
    walk: TOPIC_SIGN_WALK, drill: TOPIC_SIGN_DRILL, wb: TOPIC_SIGN_WB, sys: TOPIC_SIGN_SYS,
    trade: TOPIC_SIGN_TRADE, model: TOPIC_SIGN_MODEL, num: TOPIC_SIGN_NUM, rf: TOPIC_SIGN_RF,
    open: TOPIC_SIGN_OPEN, bank: TOPIC_SIGN_BANK
  }
});
