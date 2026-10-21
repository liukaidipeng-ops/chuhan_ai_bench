// 逐条打印对局（中文）：序号、谁、做了什么、吃了谁（剩几血）、走完对方是否被将军、双方军功
//   node tactics/movelog.js g29 [从 到]
'use strict';
const L = require('./lib'), BF = L.BF;
const [, , gname, A = 0, B = 1e9] = process.argv;
const d = L.load(__dirname + '/games/' + gname + '.json');
const g = new BF.Game(); if (d.base) g.reset(d.base);
const side = s => (s === 'r' ? '汉' : '楚');
for (let i = 0; i < d.entries.length; i++) {
  const S = g.S, e = d.entries[i]; let s = JSON.stringify(e);
  if (e.k === 'mv') { const p = L.pa(S, e.from), q = L.pa(S, e.to); s = `${side(p.s)}${L.N[p.t]}${p.lv} ${e.from}→${e.to}${q ? '×' + side(q.s) + L.N[q.t] + q.lv + '(' + q.hp + '血)' : ''}`; }
  else if (e.k === 'up') { const p = L.pa(S, e.at); s = `${side(p.s)}升${L.N[p.t]}${p.lv}→${p.lv + 1}@${e.at}`; }
  else if (e.k === 'sk') { const p = L.pa(S, e.at); s = `${side(p.s)}技能 ${L.N[p.t]}${p.lv}@${e.at}`; }
  else if (e.k === 'art' || e.k === 'ult') s = `${side(S.turn)}${e.k === 'art' ? '主帅兵法' : '终极兵法'} ${JSON.stringify(e.steps || '')}`;
  const turn = S.turn;
  g.apply(e);
  if (i >= +A && i <= +B) console.log(`${i}\t回合${S.cnt[turn] + 1}\t${s}${g.ends[i] && BF.ai.inCheck(g.S, g.S.turn) ? ' 将军' : ''}\t功 汉${g.S.merit.r} 楚${g.S.merit.b}`);
}
