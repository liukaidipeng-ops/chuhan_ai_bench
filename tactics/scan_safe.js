// 每个轮到楚的局面：楚有多少应法能躲开汉的一步杀（可先升级）；看杀局从哪一步起已经躲不开
//   node tactics/scan_safe.js tactics/games/g14.json 50
'use strict';
const L = require('./lib');
const d = L.load(process.argv[2]), from = +(process.argv[3] || 0), to = +(process.argv[4] || 1e9);
const g = new L.BF.Game(); if (d.base) g.reset(d.base);
for (let i = 0; i < d.entries.length; i++) {
  const S = g.S;
  if (i >= from && i <= to && S.turn === 'b' && (i === 0 || g.ends[i - 1])) {
    const acts = L.actions(S).filter(x => !x.free);
    const safe = acts.filter(x => !L.mates(x.S).length);
    const mt = L.mates(S);   // 楚自己有没有一步杀
    const played = d.entries[i];
    console.log(`#${i} 楚行动 ${acts.length}，躲得开汉一步杀的 ${safe.length}${mt.length ? '，楚自己有一步杀!' : ''}`);
  }
  g.apply(d.entries[i]);
}
