// K3：#14 第 67 条前（轮到楚）——列出走完后汉没有一步杀（可先升级）的应法，看电脑实走的在不在里面
'use strict';
const fs = require('fs');
const L = require('./lib');
const d = L.load(__dirname + '/games/g14.json'), n = +(process.argv[2] || 67);
const S = L.stateAt(d, n);
const acts = L.actions(S).filter(x => !x.free);
const safe = acts.filter(x => !L.mates(x.S).length);
console.log(`g14 第 ${n} 条前，轮到楚，楚 ${S.merit.b} 功；行动 ${acts.length}，躲得开汉一步杀 ${safe.length}：`);
for (const x of safe) console.log('  ' + L.desc(S, x));
const played = d.entries.slice(n, n + 2);
console.log('电脑实走：', JSON.stringify(played));
fs.writeFileSync(__dirname + '/positions/T6-defend-g14-' + n + '.json', JSON.stringify({ src: 'g14 第' + n + '条前', opts: d.opts, level: 6, side: 'b', judge: '走完后汉（可先升级）没有一步杀', good: safe.map(x => ({ up: x.up, ...x.a })), S }));
