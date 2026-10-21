// 战术部门：对打器局面计数用的模式（给 bfsim 的钩子调；每回合开始时对双方各调一次）
//   导出 { 名字: (S, side) => true/false }。只读 S、不用随机数；用全局 BF（bingfa.js）的 BF.ai 接口。
//   side 是“做这件事的一方”：T6 是 side 能贴脸，宫角士是 side 在压对方宫角，沉底是 side 的车在对方底线能吃子。
//   定义和实战统计见 docs/tactics/T6_估值特征规格_v0.1.md、docs/tactics/局面计数_模式定义_v0.1.md
'use strict';
const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const other = s => (s === 'r' ? 'b' : 'r');
function king(S, s) { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === s && p.t === 'k') return [f, r]; } return null; }
const cheb = (a, b, f, r) => Math.max(Math.abs(a - f), Math.abs(b - r));
// 对方九宫的四个角（士站在这里时，就是“宫角士”）
const CORNERS = { r: [[3, 0], [5, 0], [3, 2], [5, 2]], b: [[3, 7], [5, 7], [3, 9], [5, 9]] };
const upAtk = p => BF.ai.atk({ ...p, lv: p.lv + 1 });
const canUp = (S, p) => { const c = BF.ai.upCost(p); return c != null && S.merit[p.s] >= c; };

// T6：side 有三级兵且军功够升四级（或四级兵神速营冷却好了），神速营 1～2 格能落到紧挨对方帅将的空格（和 bfai.js 的 t6() 同一定义）
function T6(S, side) {
  const ek = king(S, other(side)); if (!ek) return false;
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
    const p = S.board[r][f]; if (!p || p.s !== side || p.t !== 'p' || cheb(f, r, ek[0], ek[1]) > 3) continue;
    if (!(p.lv === 4 ? S.cnt[side] >= (p.c_shensu || 0) : p.lv === 3 && canUp(S, p))) continue;
    for (const [df, dr] of D8) for (let k = 1; k <= 2; k++) {
      const tf = f + df * k, tr = r + dr * k;
      if (tf < 0 || tf > 8 || tr < 0 || tr > 9 || S.board[tr][tf]) continue;
      if (cheb(tf, tr, ek[0], ek[1]) === 1) return true;
    }
  }
  return false;
}
// T6 宽松版：side 有三级以上的兵离对方帅将 3 格以内（不管钱、不管落点）——量 T6 这类局面的“盘子”有多大
function T6near(S, side) {
  const ek = king(S, other(side)); if (!ek) return false;
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === side && p.t === 'p' && p.lv >= 3 && cheb(f, r, ek[0], ek[1]) <= 3) return true; }
  return false;
}
// side 的子能走到对方宫角士的格子上：kill = 现在一刀打得死；up = 现在打不死、但这枚子升一级后打得死且 side 钱够
function cornerHit(S, side, mode) {
  const op = other(side);
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
    const p = S.board[r][f]; if (!p || p.s !== side || p.t === 'k') continue;
    for (const m of BF.ai.moveTargets(S, f, r)) {
      const q = S.board[m.to[1]][m.to[0]];
      if (!q || q.s !== op || q.t !== 'a' || !CORNERS[op].some(([cf, cr]) => cf === m.to[0] && cr === m.to[1])) continue;
      const a = BF.ai.atk(p);
      if (mode === 'kill' ? a >= q.hp : a < q.hp && p.lv < 4 && upAtk(p) >= q.hp && canUp(S, p)) return true;
    }
  }
  return false;
}
// 沉底：side 的车在对方底线，并且现在一刀就能吃掉对方一枚子（不算帅将）
function chendi(S, side) {
  const op = other(side), base = side === 'r' ? 9 : 0;
  for (let f = 0; f < 9; f++) {
    const p = S.board[base][f]; if (!p || p.s !== side || p.t !== 'r') continue;
    for (const m of BF.ai.moveTargets(S, f, base)) { const q = S.board[m.to[1]][m.to[0]]; if (q && q.s === op && q.t !== 'k' && BF.ai.atk(p) >= q.hp) return true; }
  }
  return false;
}
module.exports = {
  T6,
  T6near,
  gongjiao_kill: (S, side) => cornerHit(S, side, 'kill'),
  gongjiao_up: (S, side) => cornerHit(S, side, 'up'),
  chendi,
};
