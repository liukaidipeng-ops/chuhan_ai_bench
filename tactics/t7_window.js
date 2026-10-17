// T7：#15 第 71–99 条，汉每一回合“将军 / 不将军”两条线用电脑固定层数打分
//   node tactics/t7_window.js g15 71 99 [层数=3]
// 打分：电脑（当时那份 bfai，噪声 0、对方升级全看）在汉的局面上固定层数搜索，取它给出的候选表（cand），
//   分别找“最好的将军着”和“最好的不将军着”的分数（汉方视角），再看 Ham 实走的是哪一类。只是参考分，不是证明。
'use strict';
const L = require('./lib'), BF = L.BF;
const AI = require('./engine/bfai.js'); AI.trace = true;
const [, , gname, A, B, D] = process.argv;
const d = L.load(__dirname + '/games/' + gname + '.json'), from = +A, to = +B, depth = +(D || 3);
AI.LEVELS.t7 = { ...AI.LEVELS.hard, noise: 0, top: 1, fixedDepth: depth, upAll: true, rootUpAll: true };
let a = 12345; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
const isCheck = (S, act) => { let T = S; if (act.up) { T = BF.ai.upgradeState(S, act.up); if (!T) return false; } const { up, est, ...m } = act; const R = BF.attempt(T, m); return !!(R && BF.ai.inCheck(R.S, 'b')); };
(async () => {
  const g = new BF.Game(); if (d.base) g.reset(d.base);
  for (let i = 0; i < d.entries.length && i <= to; i++) {
    const S = g.S;
    if (i >= from && S.turn === 'r' && (i === 0 || g.ends[i - 1])) {
      const t0 = Date.now();
      await AI.think(BF.cloneState(S), 't7');
      const last = AI.think.last || {}, cand = (last.trace && last.trace.cand) || [];
      let bc = null, bn = null;
      for (const c of cand) { const ch = isCheck(S, c.a); if (ch && (!bc || c.v > bc.v)) bc = c; if (!ch && (!bn || c.v > bn.v)) bn = c; }
      let j = i; const seq = []; while (j < d.entries.length) { seq.push(d.entries[j]); if (d.entries[j].k !== 'up') break; j++; }
      const m = seq[seq.length - 1], up = seq.find(e => e.k === 'up'); const played = up ? { up: up.at, ...m } : m;
      const pc = m.k === 'mv' || m.k === 'sk' ? isCheck(S, played) : false;
      const f = c => c ? `${L.desc(S, { up: c.a.up, a: (({ up, est, ...x }) => x)(c.a) })} ${c.v.toFixed(2)}` : '—';
      console.log(`#${i} 汉${S.merit.r}功 楚${S.merit.b}功 | 最好将军: ${f(bc)} | 最好不将: ${f(bn)} | 实走${pc ? '将军' : '不将'} | ${((Date.now() - t0) / 1000).toFixed(0)}s 候选${cand.length}`);
    }
    g.apply(d.entries[i]);
  }
})();
