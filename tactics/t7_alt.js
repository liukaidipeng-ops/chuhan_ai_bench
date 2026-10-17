// T7：楚解将时花了钱的那些局面——不花钱的解法会不会马上丢子 / 被一步杀
//   对每个局面：实走（升级 + 解将）和每种不升级的解将，各看汉下一手（可先升级）最多能吃掉多少价值、有没有一步杀。
//   价值按击杀奖励表：兵1 士2 相2 马3 炮3 车5（+ 等级）
'use strict';
const L = require('./lib'), BF = L.BF;
const VAL = { p: 1, a: 2, e: 2, n: 3, c: 3, r: 5, k: 99 };
function threat(S) {   // 轮到汉：汉一手最多杀多少价值；有没有一步杀
  let best = 0, mate = false;
  for (const x of L.actions(S)) { if (x.free) continue; if (L.winner(x.S) === 'r') { mate = true; break; } let v = 0; for (const e of x.ev || []) if (e.e === 'kill' && e.s === 'b') v += (VAL[e.t] || 0) + (e.lv || 1) - 1; if (v > best) best = v; }
  return mate ? '杀' : best;
}
const rows = [];
for (const file of process.argv.slice(2)) {
  const d = L.load(file), E = d.entries;
  const g = new BF.Game(); if (d.base) g.reset(d.base);
  for (let i = 0; i < E.length; i++) {
    const side = g.S.turn; const r = g.apply(E[i]);
    if (!r || r.k === 'up' || r.free || side !== 'r' || !r.check || g.result) continue;
    if (!E[i + 1] || E[i + 1].k !== 'up') continue;
    const S = g.S;
    // 实走
    const g2 = new BF.Game(); g2.reset(S); let j = i + 1; while (j < E.length) { g2.apply(E[j]); if (E[j].k !== 'up') break; j++; }
    const played = threat(g2.S), spent = S.merit.b - g2.S.merit.b;
    const alts = BF.ai.gen(S, false).map(e => ({ e, R: BF.attempt(S, e.a) })).filter(x => x.R && !x.R.free).map(x => ({ d: L.desc(S, { a: x.e.a }), t: threat(x.R.S) }));
    const safeAlt = alts.filter(a => a.t !== '杀' && a.t <= (played === '杀' ? 99 : played));
    const line = `${file.split('/').pop()} #${i} 楚花 ${spent} 功；实走后汉威胁 ${played}；不花钱的解法 ${alts.length} 种：${alts.map(a => a.d + '→' + a.t).join('，')}${safeAlt.length ? '  ⇒ 有不花钱且不更差的' : '  ⇒ 不花钱都更差'}`;
    rows.push({ safe: safeAlt.length > 0, spent }); console.log(line);
  }
}
const s = rows.filter(r => r.safe);
console.log(`汇总：楚解将花钱 ${rows.length} 次；其中有“不花钱且不更差”解法的 ${s.length} 次（共 ${s.reduce((a, r) => a + r.spent, 0)} 功），不花钱都更差的 ${rows.length - s.length} 次`);
