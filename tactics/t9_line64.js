// T9 正例候选：#14 第 64 条前（轮到楚）。楚 车2 3,4→3,2×炮 将军 → 汉只能先升级才解得了将 → 之后楚还有没有躲得开汉一步杀的走法；
//   和楚实走（升士 3,9 + 炮 4,3→3,3 将）的结果比。
'use strict';
const L = require('./lib'), BF = L.BF;
const d = L.load(__dirname + '/games/g14.json');
const S = L.stateAt(d, 64);
const VAL = { p: 1, a: 2, e: 2, n: 3, c: 3, r: 5, k: 99 };
const pick = (S, f) => L.actions(S).filter(x => !x.free && f(x));
for (const up of [null, [3, 9], [5, 9], [6, 9]]) {
  const c = pick(S, x => JSON.stringify(x.up) === JSON.stringify(up) && x.a.from && x.a.from[0] === 3 && x.a.from[1] === 4 && x.a.to[0] === 3 && x.a.to[1] === 2)[0];
  if (!c) { console.log('没找到', up); continue; }
  const T = c.S;
  const esc = L.actions(T).filter(y => !y.free);
  console.log(`== 楚 ${L.desc(S, c)}：楚剩 ${T.merit.b} 功；汉解将 ${esc.length} 种`);
  for (const y of esc) {
    const U = y.S;
    const acts = L.actions(U).filter(z => !z.free);
    const safe = acts.filter(z => !L.mates(z.S).length);
    console.log(`   汉 ${L.desc(T, y)}（汉剩 ${U.merit.r} 功，本回合升级已用）→ 楚 ${acts.length} 种走法里躲得开汉一步杀的 ${safe.length} 种${safe.length ? '，例：' + safe.slice(0, 5).map(z => L.desc(U, z)).join('、') : ''}`);
  }
}
