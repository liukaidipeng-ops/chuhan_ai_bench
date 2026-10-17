// 战术部门验证用的小工具：载入冻结引擎、按对局重放到第 n 条、一步杀（可先升一级）枚举、全部合法行动（可先升一级）
'use strict';
const fs = require('fs'), path = require('path');
const E = path.join(__dirname, 'engine');
global.XQ = require(path.join(E, 'rules.js'));
const BF = global.BF = require(path.join(E, 'bingfa.js'));
const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' };
function load(file) { const d = JSON.parse(fs.readFileSync(file, 'utf8')); const o = d.opts || {}; if ('bs' in o) BF.CFG.beishui.on = !!o.bs; if ('r6' in o) BF.CFG.r6.on = !!o.r6; return d; }
function stateAt(d, n) { const g = new BF.Game(); if (d.base) g.reset(d.base); for (let i = 0; i < n; i++) if (!g.apply(d.entries[i])) throw new Error('重放失败 ' + i); return g.S; }
// 当前一方所有行动：不升级 + 先升任一枚子（每回合最多升一次）
function actions(S) {
  const me = S.turn, st = [{ S, up: null }];
  if (!S.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === me && p.t !== 'k') { const U = BF.ai.upgradeState(S, [f, r]); if (U) st.push({ S: U, up: [f, r] }); } }
  const out = [];
  for (const x of st) for (const e of BF.ai.gen(x.S, false)) { const R = BF.attempt(x.S, e.a); if (!R) continue; out.push({ up: x.up, a: e.a, S: R.S, free: !!R.free, ev: R.ev }); }
  return out;
}
const winner = S => { const ev = BF.evaluate(S); return ev && ev.result ? ev.result.winner : null; };
// 轮到的一方能否一步（可先升级）赢；返回所有赢法
function mates(S) { const me = S.turn; return actions(S).filter(x => !x.free && winner(x.S) === me); }
const pa = (S, at) => at && S.board[at[1]] && S.board[at[1]][at[0]];
function desc(S, x) {
  const T = x.up ? BF.ai.upgradeState(S, x.up) : S, a = x.a; let s = x.up ? `升${N[pa(S, x.up).t]}${pa(S, x.up).lv}@${x.up}+` : '';
  if (a.k === 'mv') { const p = pa(T, a.from), q = pa(T, a.to); s += `${N[p.t]}${p.lv} ${a.from}→${a.to}${q ? '×' + N[q.t] : ''}`; }
  else s += JSON.stringify(a);
  return s;
}
module.exports = { BF, N, load, stateAt, actions, mates, winner, desc, pa };
