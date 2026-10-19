// 轮到楚的局面：楚每种行动之后，汉有没有一步杀、或“将军起手、楚怎么应都被一步杀”的两步杀（都可先升级）
//   node tactics/t6_defend2.js g27 107
'use strict';
const L = require('./lib'), BF = L.BF;
const chk = (S, s) => BF.ai.inCheck(S, s);
const fastMates = S => { const me = S.turn, op = me === 'r' ? 'b' : 'r'; return L.actions(S).filter(x => !x.free && chk(x.S, op) && L.winner(x.S) === me); };
function threat(T) {   // 轮到汉：1 = 一步杀，2 = 将军起手两步杀，0 = 都没有；顺带返回例子
  const m = fastMates(T); if (m.length) return [1, L.desc(T, m[0])];
  for (const x of L.actions(T).filter(x => !x.free && chk(x.S, 'b'))) {
    const rep = L.actions(x.S).filter(y => !y.free);
    if (rep.length && rep.every(y => fastMates(y.S).length)) return [2, L.desc(T, x)];
  }
  return [0, ''];
}
const [, , gname, n] = process.argv;
const d = L.load(__dirname + '/games/' + gname + '.json');
const S = L.stateAt(d, +n);
const acts = L.actions(S).filter(x => !x.free && !L.winner(x.S));
const rows = acts.map(x => ({ x, t: threat(x.S) }));
const safe = rows.filter(r => r.t[0] === 0);
console.log(`${gname} 第${n}条前（轮到楚，汉 ${S.merit.r} 功 楚 ${S.merit.b} 功）：楚行动 ${acts.length}，走完汉没有一步杀也没有将军起手两步杀的 ${safe.length}`);
for (const r of safe) console.log('  安全：' + L.desc(S, r.x));
for (const r of rows.filter(r => r.t[0])) console.log(`  输：${L.desc(S, r.x)} → 汉${r.t[0] === 1 ? '一步杀' : '两步杀'} ${r.t[1]}`);
