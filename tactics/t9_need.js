// T9 的前提“对方差一次升级就能杀”在实战里有多常见：每个汉方回合开始时，假设汉停一手（轮到楚），
// 楚有没有一步杀、这些杀是不是全都要先升级。 node tactics/t9_need.js g13 g14 ...
'use strict';
const L = require('./lib'), BF = L.BF;
for (const gname of process.argv.slice(2)) {
  const d = L.load(__dirname + '/games/' + gname + '.json');
  const g = new BF.Game(); if (d.base) g.reset(d.base);
  const rows = []; let turns = 0;
  for (let i = 0; i < d.entries.length; i++) {
    const S = g.S;
    if (S.turn === 'r' && (i === 0 || g.ends[i - 1])) {
      turns++;
      const T = BF.cloneState(S); T.turn = 'b'; T.upgraded = false;
      if (!BF.ai.inCheck(T, 'r')) {   // 楚已被将军的局面不算
        const m = L.mates(T);
        if (m.length) {
          const plain = m.filter(x => !x.up);
          rows.push({ i, need: plain.length === 0, n: m.length, mb: S.merit.b, mr: S.merit.r, ex: L.desc(T, m[0]) });
        }
      }
    }
    g.apply(d.entries[i]);
  }
  const need = rows.filter(r => r.need);
  console.log(`${gname}：汉方回合 ${turns}，楚有一步杀威胁 ${rows.length}，其中只能先升级才杀得了 ${need.length}`);
  for (const r of need) console.log(`  #${r.i} 军功 汉${r.mr} 楚${r.mb}，杀法 ${r.n} 种，例 ${r.ex}`);
}
