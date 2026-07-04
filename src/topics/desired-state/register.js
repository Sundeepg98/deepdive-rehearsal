/* topics/desired-state/register.js -- registers topic 7 (Desired State) with the TopicRegistry.
   Loaded LAST in the desired-state bundle, after every TOPIC_DS_* slice is defined. The registry
   wires identity + the nine data panes; switching to this topic reseeds the working-set globals
   from TOPIC_DS_BANK (which aliases the LOCAL DS_CARDS / DS_SPEAK) so topic 1 is never clobbered. */
TopicRegistry.register({
  id: 'desired-state',
  identity: TOPIC_DS_IDENTITY,
  data: {
    walk:  TOPIC_DS_WALK,
    drill: TOPIC_DS_DRILL,
    wb:    TOPIC_DS_WB,
    sys:   TOPIC_DS_SYS,
    trade: TOPIC_DS_TRADE,
    model: TOPIC_DS_MODEL,
    num:   TOPIC_DS_NUM,
    rf:    TOPIC_DS_RF,
    open:  TOPIC_DS_OPEN,
    bank:  TOPIC_DS_BANK
  }
});
