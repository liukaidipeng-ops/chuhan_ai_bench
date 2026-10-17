// K2-2 换局面：T1 的防守题改成“轮到楚、汉有 10 功正威胁升车吃炮”。
//   判卷：楚走完后，汉任一行动（可先升级）吃子的价值 − 楚下一手能回吃的最大价值 ≤ 0（两手净得子不为正），且汉没有一步杀。
//   node tactics/build_t1_defend_v2.js
'use strict';
const fs = require('fs');
const L = require('./lib'), BF = L.BF;
BF.CFG.beishui.on = true; BF.CFG.r6.on = true;
const VAL = { p: 1, a: 2, e: 2, n: 3, c: 3, r: 5, k: 99 };
let ID = 200;
const pc = (s, t, lv) => ({ s, t, id: ID++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0 });
const g = new BF.Game(); const S = g.S;
S.board = S.board.map(row => row.map(() => null));
// T1 的核心：汉一级车 (0,3) 捉楚炮 (0,7)，炮有一级马 (1,9) 保护（一级保护子打不死升了级的车）；补双方马、士、帅将、楚车，让楚有像样的选择
for (const [f, r, s, t] of [[0, 3, 'r', 'r'], [4, 0, 'r', 'k'], [4, 1, 'r', 'a'], [6, 2, 'r', 'n'], [2, 3, 'r', 'p'],
  [0, 7, 'b', 'c'], [1, 9, 'b', 'n'], [8, 9, 'b', 'r'], [4, 9, 'b', 'k'], [3, 9, 'b', 'a'], [6, 6, 'b', 'p']]) S.board[r][f] = pc(s, t, 1);
S.turn = 'b'; S.merit = { r: 10, b: 0 }; S.cnt = { r: 20, b: 19 }; S.used.art = { r: 1, b: 1 }; S.used.ult = { r: 1, b: 1 };
const killV = x => (x.ev || []).filter(e => e.e === 'kill' && e.s === x.S.turn).reduce((a, e) => a + (VAL[e.t] || 0) + (e.lv || 1) - 1, 0);
function hanNet(T) {   // 轮到汉：两手净得子最大值；有一步杀返回 99
  let best = 0;
  for (const x of L.actions(T)) {
    if (x.free) continue;
    if (L.winner(x.S) === 'r') return 99;
    const gain = killV(x); if (gain <= 0) continue;
    let back = 0; for (const y of L.actions(x.S)) if (!y.free) back = Math.max(back, killV(y));
    best = Math.max(best, gain - back);
  }
  return best;
}
const base = hanNet((() => { const T = BF.cloneState ? BF.cloneState(S) : S; T.turn = 'r'; return T; })());
const res = L.actions(S).filter(x => !x.free).map(x => ({ x, net: hanNet(x.S) }));
const good = res.filter(r => r.net <= 0), bad = res.filter(r => r.net > 0);
console.log(`楚不走（假设让汉先走）汉的净得子 ${base}`);
console.log(`楚行动 ${res.length}；走完汉两手净得子 ≤0 的 ${good.length} 种，>0 的 ${bad.length} 种`);
console.log('过：' + good.map(r => L.desc(S, r.x)).join('、'));
console.log('不过（例）：' + bad.slice(0, 12).map(r => L.desc(S, r.x) + '→' + r.net).join('、'));
fs.writeFileSync(__dirname + '/positions/T1-defend.json', JSON.stringify({ src: '手册 T1 复刻 v2（轮到楚，汉威胁升车吃炮）', opts: { bs: 1, r6: 1 }, level: 7, side: 'b', judge: '走完后汉任一行动（可先升级）吃子价值 − 楚下一手最大回吃价值 ≤ 0，且汉没有一步杀；价值 兵1 士相2 马炮3 车5，每高一级+1', good: good.map(r => ({ up: r.x.up, ...r.x.a })), S }));
