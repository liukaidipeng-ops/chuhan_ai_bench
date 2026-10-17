// 每个轮到指定一方的局面：这一方有多少应法（可先升级）走完后对方没有一步杀；实走的那步躲没躲开
//   node tactics/scan_safe_side.js tactics/games/g20.json r [from] [to]
'use strict';
const L = require('./lib');
const d = L.load(process.argv[2]), side = process.argv[3] || 'b', from = +(process.argv[4] || 0), to = +(process.argv[5] || 1e9);
const g = new L.BF.Game(); if (d.base) g.reset(d.base);
const SN = { r: '汉', b: '楚' };
let start = null, startS = null;
for (let i = 0; i < d.entries.length; i++) {
  const S = g.S;
  if (i === 0 || g.ends[i - 1]) { start = i; startS = S; }
  g.apply(d.entries[i]);
  // 本回合结束（轮到对方）时，判实走那条线
  if (g.ends[i] && startS.turn === side && start >= from && start <= to) {
    const acts = L.actions(startS).filter(x => !x.free);
    const safe = acts.filter(x => !L.mates(x.S).length);
    const own = L.mates(startS);
    const playedSafe = !L.mates(g.S).length;
    const merit = startS.merit[side];
    console.log(`#${start}–${i} ${SN[side]}（${merit} 功）行动 ${acts.length}，走完对方没有一步杀的 ${safe.length}；实走${playedSafe ? '躲开' : '躲不开'}${own.length ? `；${SN[side]}自己有一步杀 ${own.length} 种：` + own.slice(0, 3).map(x => L.desc(startS, x)).join(' / ') : ''}`);
    if (safe.length && safe.length <= 12 && !playedSafe) console.log('   躲法：' + safe.map(x => L.desc(startS, x)).join(' / '));
  }
}
