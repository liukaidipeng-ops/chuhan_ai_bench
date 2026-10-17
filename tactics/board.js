// 打印第 n 条行动之后的局面（n 省略 = 终局）：node tactics/board.js tactics/games/g14.json [n]
//   大写 = 汉，小写 = 楚；后面的数字是等级，* 表示残血。坐标 (f,r)：f 从左到右 0..8，r 从汉底线 0 到楚底线 9。
'use strict';
const fs = require('fs'), path = require('path');
const E = path.join(__dirname, 'engine');
global.XQ = require(path.join(E, 'rules.js'));
const BF = global.BF = require(path.join(E, 'bingfa.js'));
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const n = process.argv[3] != null ? +process.argv[3] : data.entries.length;
const o = data.opts || {};
if (BF.CFG.beishui && 'bs' in o) BF.CFG.beishui.on = !!o.bs;
if (BF.CFG.r6 && 'r6' in o) BF.CFG.r6.on = !!o.r6;
const g = new BF.Game(); if (data.base) g.reset(data.base);
for (let i = 0; i < n; i++) g.apply(data.entries[i]);
const S = g.S, C = { r: 'R', n: 'N', e: 'E', a: 'A', k: 'K', c: 'C', p: 'P' };
for (let r = 9; r >= 0; r--) {
  let line = r + ' ';
  for (let f = 0; f < 9; f++) {
    const p = S.board[r][f];
    if (!p) { line += ' .  '; continue; }
    const c = p.s === 'r' ? C[p.t] : C[p.t].toLowerCase();
    line += ' ' + c + (p.t === 'k' ? ' ' : p.lv) + (p.hp < (BF.hpOf ? BF.hpOf(p.t, p.lv) : p.hp) ? '*' : ' ');
  }
  console.log(line);
}
console.log('   ' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(x => ' ' + x + '  ').join(''));
console.log(`轮到 ${S.turn === 'r' ? '汉' : '楚'}，军功 汉${S.merit.r} 楚${S.merit.b}，回合 汉${S.cnt.r} 楚${S.cnt.b}，兵法已用 汉${S.used.art.r} 楚${S.used.art.b}，终极已用 汉${S.used.ult.r} 楚${S.used.ult.b}`);
