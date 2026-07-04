/* topics/iac/register.js -- registers topic 8 (Infrastructure as Code) with the TopicRegistry.
   Loaded LAST in the iac bundle, after every TOPIC_IAC_* slice is defined. The registry reseeds
   the working-set globals from data.bank on switch and applies identity. 7-bit ASCII. */
TopicRegistry.register({
  id: 'iac',
  identity: TOPIC_IAC_IDENTITY,
  data: {
    walk:  TOPIC_IAC_WALK,
    drill: TOPIC_IAC_DRILL,
    wb:    TOPIC_IAC_WB,
    sys:   TOPIC_IAC_SYS,
    trade: TOPIC_IAC_TRADE,
    model: TOPIC_IAC_MODEL,
    num:   TOPIC_IAC_NUM,
    rf:    TOPIC_IAC_RF,
    open:  TOPIC_IAC_OPEN,
    bank:  TOPIC_IAC_BANK
  }
});
