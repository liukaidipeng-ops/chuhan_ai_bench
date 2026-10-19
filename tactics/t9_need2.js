// T9 前提扩到“两回合杀”：每个汉方回合开始假设汉停一手，楚有没有“先将军、汉怎么应都被一步杀”的两步杀，
// 以及这条杀要不要用到升级。只查楚第一手是将军的（逼着走），不查安静的威胁着。
//   node tactics/t9_need2.js g20
'use strict';
const L = require('./lib'), BF = L.BF;
const chk = (S, s) => BF.ai.inCheck(S, s);
// 一步杀（可先升级），先用“将军”筛掉绝大多数走法再判胜负
const fastMates = S => { const me = S.turn, op = me === 'r' ? 'b' : 'r'; return L.actions(S).filter(x => !x.free && chk(x.S, op) && L.winner(x.S) === me); };
const gname = process.argv[2];
const d = L.load(__dirname + '/games/' + gname + '.json');
const g = new BF.Game(); if (d.base) g.reset(d.base);
let turns = 0; const rows = [];
for (let i = 0; i < d.entries.length; i++) {
  const S = g.S;
  if (S.turn === 'r' && (i === 0 || g.ends[i - 1])) {
    turns++;
    const T = BF.cloneState(S); T.turn = 'b'; T.upgraded = false;
    if (!chk(T, 'r') && !fastMates(T).length) {
      const wins = [];
      for (const x of L.actions(T).filter(x => !x.free && chk(x.S, 'r') && !L.winner(x.S))) {
        const rep = L.actions(x.S).filter(y => !y.free);
        if (!rep.length) continue;
        let all = true, upAt2 = 0;
        for (const y of rep) { const m = fastMates(y.S); if (!m.length) { all = false; break; } if (m.every(z => z.up)) upAt2++; }
        if (all) wins.push({ x, upAt2, n: rep.length });
      }
      if (wins.length) {
        const noUp = wins.filter(w => !w.x.up && w.upAt2 === 0);
        rows.push(`  #${i} 军功 汉${S.merit.r} 楚${S.merit.b}：两步杀 ${wins.length} 种，${noUp.length ? '有不用升级的' : '全都要用到升级'}；例 ${L.desc(T, wins[0].x)}（汉应 ${wins[0].n} 种，其中第二步必须升级才杀的 ${wins[0].upAt2}）`);
      }
    }
  }
  g.apply(d.entries[i]);
}
console.log(`${gname}：汉方回合 ${turns}，楚有将军起手的两步杀威胁 ${rows.length}`);
console.log(rows.join('\n'));
