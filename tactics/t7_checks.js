// T7 连将吸功：每次汉将军之后，楚怎么解——花没花军功、有没有不花钱的解法
//   node tactics/t7_checks.js tactics/games/g15.json
// 输出每次将军一行：序号、汉的将军着、楚的应法（升级花了几功）、楚不升级能走的解将着数、楚当时军功；末尾汇总。
'use strict';
const L = require('./lib'), BF = L.BF;
const tot = { checks: 0, spent: 0, forcedSpend: 0, voluntary: 0, free: 0, mated: 0, swing: 0 };
for (const file of process.argv.slice(2)) {
  const d = L.load(file);
  const g = new BF.Game(); if (d.base) g.reset(d.base);
  const E = d.entries;
  console.log('== ' + file.split('/').pop());
  for (let i = 0; i < E.length; i++) {
    const before = g.S, side = before.turn;
    const r = g.apply(E[i]);
    if (!r || r.k === 'up' || r.free || side !== 'r' || !r.check || g.result) continue;
    // 楚被将军：看楚这一回合的行动（可能先升级）
    const S = g.S, mB = S.merit.b;
    const noUp = BF.ai.gen(S, false).filter(e => { const R = BF.attempt(S, e.a); return R && !R.free; }).length;
    let j = i + 1, spent = 0, what = [];
    while (j < E.length) { const e = E[j]; if (e.k === 'up') { const p = S.board[e.at[1]][e.at[0]]; what.push('升' + L.N[p.t] + p.lv); } else { what.push(e.k === 'mv' ? '走' : e.k); break; } j++; }
    // 实际花费：按回放后的军功差算（升级前后）
    const g2 = new BF.Game(); g2.reset(S); let m0 = S.merit.b;
    for (let k = i + 1; k <= j && k < E.length; k++) { const e = E[k]; const before2 = g2.S.merit.b; g2.apply(e); if (e.k === 'up') spent += before2 - g2.S.merit.b; }
    tot.checks++;
    if (spent) { tot.spent += spent; if (noUp) tot.voluntary++; else tot.forcedSpend++; } else tot.free++;
    tot.swing += 1 + spent;
    console.log(`#${i} 汉将军 → 楚 ${what.join('+')}${spent ? `（花 ${spent} 功）` : ''}；楚当时 ${mB} 功，不升级的解将着 ${noUp} 种${spent && !noUp ? ' ← 被迫花钱' : spent ? ' ← 有不花钱的解法' : ''}`);
  }
}
console.log(`汇总：汉将军 ${tot.checks} 次；楚解将时花钱 ${tot.forcedSpend + tot.voluntary} 次（被迫 ${tot.forcedSpend}，有别的解法也花 ${tot.voluntary}），不花钱 ${tot.free} 次；楚花掉 ${tot.spent} 功；汉收将军奖励 ${tot.checks} 功；合计军功差 ${tot.swing}`);
