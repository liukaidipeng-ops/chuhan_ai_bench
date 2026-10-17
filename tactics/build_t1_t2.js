// 手册 v0.2 的 T1、T2 照文字摆成局面，逐条验证，写成考题局面（tactics/positions/）
//   node tactics/build_t1_t2.js
// 手册没留下验证脚本和证据 JSON（docs/tactics-manual 分支里没有），所以这里按手册第 4、5 节的坐标重新摆；
// 手册没写的子（帅将、士）只为局面合法，摆法写在下面。
'use strict';
const fs = require('fs');
const L = require('./lib'), BF = L.BF;
BF.CFG.beishui.on = true; BF.CFG.r6.on = true;

let ID = 100;
const pc = (s, t, lv) => ({ s, t, id: ID++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0 });
function make(turn, merit, pieces, usedAll) {
  const g = new BF.Game(); const S = g.S;
  S.board = S.board.map(row => row.map(() => null));
  for (const [f, r, s, t, lv] of pieces) S.board[r][f] = pc(s, t, lv || 1);
  S.turn = turn; S.merit = { r: merit.r, b: merit.b }; S.cnt = { r: 20, b: 20 };   // 回合数取 20：已过开局，兵法照常开放与否看兵力
  if (usedAll) { S.used.art = { r: 1, b: 1 }; S.used.ult = { r: 1, b: 1 }; }   // 主帅兵法、终极兵法都设为已用，免得干扰（十级表题目规则第 1 条）
  return S;
}
const save = (name, S, meta) => fs.writeFileSync(`${__dirname}/positions/${name}.json`, JSON.stringify({ src: '手册 v0.2 复刻', opts: { bs: 1, r6: 1 }, ...meta, S }, null, 0));
const kills = x => (x.ev || []).filter(e => e.e === 'kill' && e.s === x.S.turn).length;   // 走完轮到对方，x.S.turn 是被杀的一方
const out = [];
const ok = (c, msg) => { out.push((c ? '✓ ' : '✗ ') + msg); if (!c) process.exitCode = 1; };

// ---------- T1 升级回血护送吃子 ----------
// 手册：汉一级车 (0,3)、楚炮 (0,7)、楚一级车 (0,9) 保护炮；汉 ≥10 功。补：汉帅 (4,0)、汉士 (4,1) 挡住帅将照面，楚将 (4,9)。
const T1 = make('r', { r: 10, b: 0 }, [[0, 3, 'r', 'r'], [0, 7, 'b', 'c'], [0, 9, 'b', 'r'], [4, 0, 'r', 'k'], [4, 1, 'r', 'a'], [4, 9, 'b', 'k']], true);
save('T1-use', T1, { level: 7, side: 'r', answer: { up: [0, 3], k: 'mv', from: [0, 3], to: [0, 7] } });
{
  const acts = L.actions(T1);
  const best = acts.find(x => x.up && x.up[0] === 0 && x.up[1] === 3 && x.a.to && x.a.to[0] === 0 && x.a.to[1] === 7);
  ok(!!best, 'T1 会用：升车(0,3)+吃炮(0,7) 合法');
  // 楚回吃：车(0,9)→(0,7)
  const back = L.actions(best.S).filter(x => !x.up && x.a.from && x.a.from[0] === 0 && x.a.from[1] === 9 && x.a.to[0] === 0 && x.a.to[1] === 7);
  ok(back.length === 1 && kills(back[0]) === 0 && back[0].S.board[7][0] && back[0].S.board[7][0].s === 'r', 'T1：升级后吃炮，楚回吃只打伤、汉车留在 (0,7)');
  const plain = acts.find(x => !x.up && x.a.to && x.a.to[0] === 0 && x.a.to[1] === 7);
  const back2 = L.actions(plain.S).filter(x => !x.up && x.a.from && x.a.from[0] === 0 && x.a.from[1] === 9 && x.a.to[0] === 0 && x.a.to[1] === 7);
  ok(back2.length === 1 && kills(back2[0]) === 1, 'T1 错误示范：不升级直接吃炮，楚回吃杀死汉车');
  // 会防（楚）：汉已升车吃炮，楚别走无效回吃
  save('T1-defend', best.S, { level: 7, side: 'b', avoid: { k: 'mv', from: [0, 9], to: [0, 7] } });
  ok(best.S.turn === 'b', 'T1 会防局面：轮到楚，别走车(0,9)→(0,7)（只打伤、被弹回，白丢一手）');
}

// ---------- T2 移兵破环 / 升象践踏 ----------
// 手册：楚三级象 (4,7)、楚 6 功；汉过河兵 (6,5)；环上汉马 (5,4)、车 (6,4)、炮 (7,4)、兵 (7,5)。
// 补：汉帅 (4,0)、汉士 (3,0)、汉中路兵 (4,3)（隔开帅将，手册说“中路兵只用于保证局面合法”），楚将 (4,9)；汉 0 功（手册 12.8 节：汉方本局军功设为 0）。
const ring = [[4, 3, 'r', 'p'], [6, 5, 'r', 'p'], [5, 4, 'r', 'n'], [6, 4, 'r', 'r'], [7, 4, 'r', 'c'], [7, 5, 'r', 'p'], [4, 0, 'r', 'k'], [3, 0, 'r', 'a'], [4, 9, 'b', 'k'], [4, 7, 'b', 'e', 3]];
const T2u = make('b', { r: 0, b: 6 }, ring, true);
save('T2-use', T2u, { level: 8, side: 'b', answer: { up: [4, 7], k: 'mv', from: [4, 7], to: [6, 5] } });
{
  const acts = L.actions(T2u);
  const best = acts.filter(x => !x.free).map(x => ({ x, k: kills(x) })).sort((a, b) => b.k - a.k);
  const top = best[0];
  ok(top.k === 5 && top.x.up && top.x.up[0] === 4 && top.x.a.to[0] === 6 && top.x.a.to[1] === 5, `T2 会用：最大击杀 ${top.k}，走法 ${L.desc(T2u, top.x)}`);
  ok(best.filter(b => b.k >= 3).length === 1, `T2 会用：击杀 ≥3 的走法只有 ${best.filter(b => b.k >= 3).length} 种`);
}
// 会防（汉）：前一手，轮到汉；楚象三级、6 功
const T2d = make('r', { r: 0, b: 6 }, ring, true);
{
  const acts = L.actions(T2d).filter(x => !x.free);
  const res = acts.map(x => ({ x, maxK: Math.max(0, ...L.actions(x.S).filter(y => !y.free).map(kills)) }));
  const good = res.filter(r => r.maxK <= 1), bad = res.filter(r => r.maxK >= 3);
  ok(res.some(r => r.x.a.from && r.x.a.from[0] === 6 && r.x.a.from[1] === 5 && r.x.a.to[0] === 6 && r.x.a.to[1] === 6 && r.maxK === 0), 'T2 会防：兵(6,5)→(6,6) 之后楚当手最大击杀 0（手册的识破）');
  out.push(`  T2 会防：汉合法行动 ${res.length}；之后楚最大击杀 ≤1 的 ${good.length} 种，≥3 的 ${bad.length} 种（例 ${bad.slice(0, 3).map(r => L.desc(T2d, r.x)).join('、')}）`);
  save('T2-defend', T2d, { level: 8, side: 'r', judge: '走完后楚（可先升级）当手最大击杀 ≤1', good: good.map(r => ({ up: r.x.up, ...r.x.a })) });
}
console.log(out.join('\n'));
