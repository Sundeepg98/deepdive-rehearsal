/* topics/authz/register.js -- registers topic 3 (Tenant Authorization). NOT the first
   topic, so register() does NOT publishBanks or seed TOPIC_CMP_NOTES -- topic 1 owns
   boot. The switcher shows this the moment it registers; setTopic('authz') then
   reseeds the working set and applies this identity. */
TopicRegistry.register({
  id: 'authz',
  identity: TOPIC_AUTHZ_IDENTITY,
  data: {
    walk: TOPIC_AUTHZ_WALK, drill: TOPIC_AUTHZ_DRILL, wb: TOPIC_AUTHZ_WB, sys: TOPIC_AUTHZ_SYS,
    trade: TOPIC_AUTHZ_TRADE, model: TOPIC_AUTHZ_MODEL, num: TOPIC_AUTHZ_NUM, rf: TOPIC_AUTHZ_RF,
    open: TOPIC_AUTHZ_OPEN, bank: TOPIC_AUTHZ_BANK
  }
});
