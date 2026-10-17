// #14 第 70 条前（轮到楚）：楚每种应法之后，汉有没有一步杀（可先升级）
'use strict';
const L = require('./lib');
const d = L.load(__dirname + '/games/g14.json');
const S = L.stateAt(d, 70);
const acts = L.actions(S).filter(x => !x.free);
let safe = [];
for (const x of acts) { const m = L.mates(x.S); if (!m.length) safe.push(L.desc(S, x)); else if (x.a.to && x.a.to[0] === 2 && x.a.to[1] === 9) console.log('实走类:', L.desc(S, x), '→ 汉杀法', m.map(y => L.desc(x.S, y)).join(' / ')); }
console.log('楚合法行动', acts.length, '；之后汉无一步杀的', safe.length);
console.log(safe.slice(0, 40).join('\n'));
