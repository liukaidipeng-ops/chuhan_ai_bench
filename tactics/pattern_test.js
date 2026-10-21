// lab/tools/patterns.js 自测：在 Ham 的实战对局里，每回合开始时对双方调一次，数每个模式亮了几个回合、第一次亮在第几条，量每次调用耗时
//   node tactics/pattern_test.js g13 g14 ...
'use strict';
const L = require('./lib'), BF = L.BF;
const P = require('../lab/tools/patterns.js');
const names = Object.keys(P), tot = {}; let calls = 0, ns = 0n;
for (const gname of process.argv.slice(2)) {
  const d = L.load(__dirname + '/games/' + gname + '.json');
  const g = new BF.Game(); if (d.base) g.reset(d.base);
  const lit = {}, first = {};
  for (let i = 0; i < d.entries.length; i++) {
    if (i === 0 || g.ends[i - 1]) for (const n of names) for (const s of ['r', 'b']) {
      const before = JSON.stringify(g.S.board);
      const t0 = process.hrtime.bigint(); const v = P[n](g.S, s); ns += process.hrtime.bigint() - t0; calls++;
      if (JSON.stringify(g.S.board) !== before) throw new Error(n + ' 改了局面');
      if (v) { const k = n + ':' + s; lit[k] = (lit[k] || 0) + 1; if (first[k] == null) first[k] = i; }
    }
    g.apply(d.entries[i]);
  }
  for (const k in lit) tot[k] = (tot[k] || 0) + 1;
  console.log(gname, Object.keys(lit).sort().map(k => `${k}×${lit[k]}(首#${first[k]})`).join('  '));
}
console.log('出现过的局数：', Object.entries(tot).sort().map(([k, v]) => `${k} ${v}`).join('，'));
console.log(`每次调用平均 ${(Number(ns) / calls / 1000).toFixed(1)} 微秒（${calls} 次）`);
