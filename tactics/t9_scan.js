// T9：找“对方不升级就解不了的将军”——轮到 side 的局面里，哪些将军着让对方所有不升级的解法都没有（只能先升级才解得了将）
//   node tactics/t9_scan.js g14 b 50 69   （对局、找哪一方的将军、条目范围）
'use strict';
const L = require('./lib'), BF = L.BF;
const [, , gname, who, A, B] = process.argv;
const d = L.load(__dirname + '/games/' + gname + '.json');
const g = new BF.Game(); if (d.base) g.reset(d.base);
const opp = who === 'r' ? 'b' : 'r';
let found = 0;
for (let i = 0; i < d.entries.length && i <= +B; i++) {
  const S = g.S;
  if (i >= +A && S.turn === who && (i === 0 || g.ends[i - 1])) {
    const acts = L.actions(S).filter(x => !x.free && BF.ai.inCheck(x.S, opp) && !L.winner(x.S));
    const out = [];
    for (const x of acts) {
      const T = x.S;
      const noUp = BF.ai.gen(T, false).filter(e => { const R = BF.attempt(T, e.a); return R && !R.free; }).length;
      const all = L.actions(T).filter(y => !y.free).length;
      if (noUp === 0 && all > 0) out.push(`${L.desc(S, x)}（对方只能升级解将：${all} 种，对方 ${T.merit[opp]} 功）`);
    }
    console.log(`#${i} 将军着 ${acts.length} 种，逼对方升级才能解的 ${out.length} 种${out.length ? '：' + out.slice(0, 6).join('；') : ''}`);
    found += out.length;
  }
  g.apply(d.entries[i]);
}
console.log('合计', found);
