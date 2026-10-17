// 列出第 n 条行动前、轮到的一方的全部一步杀（可先升级）：node tactics/verify_mates.js g14 71
'use strict';
const L = require('./lib');
const d = L.load(__dirname + '/games/' + process.argv[2] + '.json'), n = +process.argv[3];
const S = L.stateAt(d, n), m = L.mates(S);
console.log(`${process.argv[2]} 第 ${n} 条前，轮到${S.turn === 'r' ? '汉' : '楚'}，一步杀 ${m.length} 种：`);
for (const x of m) console.log('  ' + L.desc(S, x));
