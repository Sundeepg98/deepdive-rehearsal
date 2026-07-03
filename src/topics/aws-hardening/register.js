/* topics/aws-hardening/register.js -- registers topic 4 (AWS Hardening). NOT the first
   topic, so register() does NOT publishBanks or seed TOPIC_CMP_NOTES -- topic 1 owns
   boot. The switcher shows this the moment it registers; setTopic('aws-hardening') then
   reseeds the working set and applies this identity. */
TopicRegistry.register({
  id: 'aws-hardening',
  identity: TOPIC_AWSHARD_IDENTITY,
  data: {
    walk: TOPIC_AWSHARD_WALK, drill: TOPIC_AWSHARD_DRILL, wb: TOPIC_AWSHARD_WB, sys: TOPIC_AWSHARD_SYS,
    trade: TOPIC_AWSHARD_TRADE, model: TOPIC_AWSHARD_MODEL, num: TOPIC_AWSHARD_NUM, rf: TOPIC_AWSHARD_RF,
    open: TOPIC_AWSHARD_OPEN, bank: TOPIC_AWSHARD_BANK
  }
});
