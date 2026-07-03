/* topics/notifications/num.js -- topic 5 PARAMETRIC pane. compute(vals, fmt) is
   DOM-method-free (arithmetic + string building). The ceiling this pane reveals is NOT
   the send rate -- it's the POLL READ LOAD: every active user hitting the unread index
   on every interval is a fixed cost, cheap at 60s and a wall at 1s, which is what pushes
   poll -> push. n-strings use \uXXXX. Offline-safe; 7-bit ASCII. */
var TOPIC_NOTIF_NUM = {
  lead: "The estimation for notifications isn&rsquo;t the send rate &mdash; it&rsquo;s the <b>read load of polling</b>. The number that decides your architecture is how much work every user&rsquo;s poll costs, and how fast that grows when you chase &lsquo;real-time.&rsquo;",
  tell: "The headline is that <b>polling is a fixed read load</b> &mdash; every active user hitting the unread index on every interval, mostly finding nothing. It&rsquo;s cheap at a minute and a wall at a second, and that curve is exactly what pushes you from poll to push.",
  inputs: [
    { id: 'n_users', label: 'Active users', value: 1000000, min: 0, step: 1000 },
    { id: 'n_notifs', label: 'Notifications/day', value: 5000000, min: 0, step: 1000 },
    { id: 'n_poll', label: 'Poll interval (sec)', value: 60, min: 1 },
    { id: 'n_fanout', label: 'Avg channels per notification', value: 2, min: 1 }
  ],
  compute: function (vals, fmt) {
    var users = vals.n_users, notifs = vals.n_notifs, poll = vals.n_poll, fanout = vals.n_fanout;
    return [
      { k: 'Poll read load', v: fmt.n(Math.round(users / poll)), u: 'reads/s', n: 'every active user hitting the unread index every ' + poll + 's \u2014 a fixed load, mostly finding nothing new', over: true },
      { k: 'If you go real-time (1s)', v: fmt.n(users), u: 'reads/s', n: 'the same users at a 1-second interval \u2014 ' + poll + '\u00D7 the poll load, still mostly empty. The wall that pushes poll toward push.', over: users > 100000 },
      { k: 'Fan-out deliveries/day', v: fmt.n(notifs * fanout), u: '/day', n: 'one event becomes ' + fanout + ' channel deliveries \u2014 the fan-out multiplier on every downstream cost and retry', over: false },
      { k: 'Peak channel-send rate', v: fmt.n(Math.round(notifs * fanout / 86400 * 10)), u: 'sends/s', n: 'assuming a 10\u00D7 burst over average \u2014 what workers and providers must absorb during a rollout', over: false },
      { k: 'In-app storage / month', v: fmt.n(Math.round(notifs * 30 * 100 / 1e9)), u: 'GB', n: 'at ~100 bytes/row \u2014 a million notifications is ~100 MB; the partial index keeps the badge a seek regardless', over: false },
      { k: 'Push connections if you switch', v: fmt.n(users), u: 'conns', n: 'a WebSocket per active user to maintain \u2014 the cost polling avoids, and why poll is the default for a badge', over: false }
    ];
  }
};
