// T9 候选（Ham 10-17：弃子争节奏）：实战里汉丢兵 / 士 / 相的每一回合，楚是不是先升级再吃、花了多少；
//   汉这枚子上一手是不是刚走过去（主动送）；双方这一来一回的军功进出（过河、将军、哀兵、击杀、升级）。
//   node tactics/t9_sac.js tactics/games/g1*.json
'use strict';
const L = require('./lib'), BF = L.BF;
const tot = { n: 0, sent: 0, bUp: 0, bCost: 0 };
for (const file of process.argv.slice(2)) {
  const d = L.load(file), E = d.entries;
  const g = new BF.Game(); if (d.base) g.reset(d.base);
  let hanTo = null, hanMer = [], bUp = null;
  console.log('== ' + file.split('/').pop());
  for (let i = 0; i < E.length; i++) {
    const S0 = g.S, side = S0.turn, e = E[i];
    const pre = e.k === 'up' ? { ...S0.board[e.at[1]][e.at[0]] } : null, m0 = S0.merit.b;
    const r = g.apply(e); if (!r) break;
    if (r.k === 'up') { if (side === 'b') bUp = { t: pre.t, lv: pre.lv, cost: m0 - g.S.merit.b }; continue; }
    if (r.free) continue;
    if (side === 'r') { hanTo = e.to ? e.to.join(',') : null; hanMer = (r.ev || []).filter(x => x.e === 'merit' && x.s === 'r').map(x => x.why + '+' + x.n); bUp = null; continue; }
    for (const k of (r.kills || []).filter(x => x.s === 'r' && ['p', 'a', 'e'].includes(x.t))) {
      const sent = k.at && k.at.join(',') === hanTo;
      tot.n++; if (sent) tot.sent++; if (bUp) { tot.bUp++; tot.bCost += bUp.cost; }
      const mb = (r.ev || []).filter(x => x.e === 'merit').map(x => (x.s === 'r' ? '汉' : '楚') + x.why + '+' + x.n);
      console.log(`#${i} 楚吃汉${L.N[k.t]}${k.lv}@${k.at}${sent ? '（汉上一手刚走过去' + (hanMer.length ? '，' + hanMer.join(' ') : '') + '）' : ''}${bUp ? ` 楚先升${L.N[bUp.t]}${bUp.lv} 花${bUp.cost}` : ''} | ${mb.join(' ')} | 之后 汉${g.S.merit.r} 楚${g.S.merit.b}`);
    }
    bUp = null;
  }
}
console.log(`汇总：汉丢兵士相 ${tot.n} 次；其中汉上一手刚走过去的 ${tot.sent} 次；楚先升级再吃的 ${tot.bUp} 次（花 ${tot.bCost} 功）`);
