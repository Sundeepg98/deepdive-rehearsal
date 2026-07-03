/* topics/notifications/register.js -- registers topic 5 (Notifications). NOT the first
   topic, so register() does NOT publishBanks or seed TOPIC_CMP_NOTES -- topic 1 owns
   boot. The switcher shows this the moment it registers; setTopic('notifications') then
   reseeds the working set and applies this identity. */
TopicRegistry.register({
  id: 'notifications',
  identity: TOPIC_NOTIF_IDENTITY,
  data: {
    walk: TOPIC_NOTIF_WALK, drill: TOPIC_NOTIF_DRILL, wb: TOPIC_NOTIF_WB, sys: TOPIC_NOTIF_SYS,
    trade: TOPIC_NOTIF_TRADE, model: TOPIC_NOTIF_MODEL, num: TOPIC_NOTIF_NUM, rf: TOPIC_NOTIF_RF,
    open: TOPIC_NOTIF_OPEN, bank: TOPIC_NOTIF_BANK
  }
});
