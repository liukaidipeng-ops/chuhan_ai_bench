// T6 估值特征的“草稿定义”在 #13–#27 实战里的表现：每个回合开始时，对一方算 F（见下），
// 再看之后 K 个回合内这一方有没有用四级兵将军 / 将死。只读统计，给 Balance 定特征用。
//   F(side) = 有一枚 side 的三级兵（或冷却好的四级兵），side 军功 ≥ 它升四级的价（四级兵不需要），
//             且它神速营（八方向 1～2 格、可越子、落空格）能落到“对方帅将周围一格（含斜）”的空格上
//   node tactics/t6_feature.js 10 g13 g14 ...
'use strict';
const L = require('./lib'), BF = L.BF;
const K = +process.argv[2];
const games = process.argv.slice(3);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function king(S, s) { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === s && p.t === 'k') return [f, r]; } return null; }
function F(S, s) {
  const op = s === 'r' ? 'b' : 'r', k = king(S, op); if (!k) return false;
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
    const p = S.board[r][f]; if (!p || p.s !== s || p.t !== 'p' || p.lv < 3) continue;
    if (p.lv === 3) { const c = BF.ai.upgradeCost ? BF.ai.upgradeCost(p) : null; const cost = c != null ? c : Math.max(1, 8 - (p.xp || 0)); if (S.merit[s] < cost) continue; }
    for (const [df, dr] of DIRS) for (const n of [1, 2]) {
      const tf = f + df * n, tr = r + dr * n; if (tf < 0 || tf > 8 || tr < 0 || tr > 9 || S.board[tr][tf]) continue;
      if (Math.max(Math.abs(tf - k[0]), Math.abs(tr - k[1])) === 1) return true;
    }
  }
  return false;
}
const tot = { r: { on: 0, hit: 0, off: 0, hitOff: 0 }, b: { on: 0, hit: 0, off: 0, hitOff: 0 } };
for (const gname of games) {
  const d = L.load(__dirname + '/games/' + gname + '.json');
  const g = new BF.Game(); if (d.base) g.reset(d.base);
  const starts = [], ev = [];   // 每个回合开始：[条号, 轮到谁, F(r), F(b)]；每条走完：这一条是不是四级兵将军
  for (let i = 0; i < d.entries.length; i++) {
    const S = g.S, e = d.entries[i];
    if (i === 0 || g.ends[i - 1]) starts.push({ i, turn: S.turn, fr: F(S, 'r'), fb: F(S, 'b') });
    let pchk = null;
    if (e.k === 'mv') { const p = L.pa(S, e.from); if (p && p.t === 'p') pchk = p.s; }
    g.apply(e);
    if (pchk) { const q = L.pa(g.S, e.to); const op = pchk === 'r' ? 'b' : 'r'; if (q && q.lv === 4 && BF.ai.inCheck(g.S, op)) ev.push({ i, s: pchk }); }
  }
  starts.forEach((st, j) => {
    const end = j + 2 * K < starts.length ? starts[j + 2 * K].i : 1e9;
    for (const s of ['r', 'b']) {
      const on = s === 'r' ? st.fr : st.fb, hit = ev.some(x => x.s === s && x.i >= st.i && x.i < end);
      if (on) { tot[s].on++; if (hit) tot[s].hit++; } else { tot[s].off++; if (hit) tot[s].hitOff++; }
    }
  });
}
for (const s of ['r', 'b']) { const t = tot[s]; console.log(`${s === 'r' ? '汉' : '楚'}：F 为真 ${t.on} 个半回合，其后 ${K} 回合内四级兵将军 ${t.hit}（${(100 * t.hit / Math.max(1, t.on)).toFixed(1)}%）；F 为假 ${t.off}，其后 ${t.hitOff}（${(100 * t.hitOff / Math.max(1, t.off)).toFixed(1)}%）`); }
