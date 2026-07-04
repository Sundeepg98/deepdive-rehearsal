/* topics/eav/register.js -- topic 6 registration. Runs LAST in the eav bundle, after all
   TOPIC_EAV_* data objects are defined. Registers the switchable topic with the shared
   TopicRegistry; identity drives applyIdentity() and data drives the working-set reseed on
   setTopic('eav'). */
TopicRegistry.register({
  id: 'eav',
  identity: TOPIC_EAV_IDENTITY,
  data: {
    walk: TOPIC_EAV_WALK,
    drill: TOPIC_EAV_DRILL,
    wb: TOPIC_EAV_WB,
    sys: TOPIC_EAV_SYS,
    trade: TOPIC_EAV_TRADE,
    model: TOPIC_EAV_MODEL,
    num: TOPIC_EAV_NUM,
    rf: TOPIC_EAV_RF,
    open: TOPIC_EAV_OPEN,
    bank: TOPIC_EAV_BANK
  }
});
