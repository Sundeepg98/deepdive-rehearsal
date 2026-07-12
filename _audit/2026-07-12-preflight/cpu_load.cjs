#!/usr/bin/env node
/* Saturate N cores for M seconds, so the probe/gate can be measured on a machine that is BUSY --
 * i.e. approximating a CI runner (2 cores) rather than an idle 8-core dev box. */
const { fork } = require('child_process');
const N = parseInt(process.argv[2] || '8', 10);
const MS = parseInt(process.argv[3] || '60000', 10);
if (process.env.BURN) { const end = Date.now() + MS; let x = 0; while (Date.now() < end) { x += Math.sqrt(Math.random()) * Math.sin(x); } process.exit(0); }
const kids = [];
for (let i = 0; i < N; i++) kids.push(fork(__filename, [String(N), String(MS)], { env: { ...process.env, BURN: '1' }, stdio: 'ignore' }));
console.log(`burning ${N} cores for ${MS}ms (pid ${process.pid})`);
setTimeout(() => { kids.forEach(k => { try { k.kill(); } catch (e) {} }); process.exit(0); }, MS + 2000);
