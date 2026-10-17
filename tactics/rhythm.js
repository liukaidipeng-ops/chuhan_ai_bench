// 节奏曲线（Ham 10-17：节奏像 MOBA / CSGO / 球赛，失去自己的节奏就容易输）
//   每个完整回合结束时记：子力差（汉 − 楚，按击杀奖励价 兵1 士相2 马炮3 车5，每高一级 +1，不算帅将）、军功差、这回合谁将军。
//   输出每局：领先换手次数、汉从第几回合起再没落后、最大领先；以及逐回合曲线（--curve）。
'use strict';
const L = require('./lib'), BF = L.BF;
const VAL = { p: 1, a: 2, e: 2, n: 3, c: 3, r: 5, k: 0 };
const curve = process.argv.includes('--curve');
for (const file of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const d = L.load(file); const g = new BF.Game(); if (d.base) g.reset(d.base);
  const pts = []; let chk = { r: 0, b: 0 };
  const mat = S => { let v = 0; for (const row of S.board) for (const p of row) if (p) v += (p.s === 'r' ? 1 : -1) * (VAL[p.t] + p.lv - 1); return v; };
  for (const e of d.entries) {
    const side = g.S.turn, r = g.apply(e); if (!r) break;
    if (r.k !== 'up' && !r.free && r.check) chk[side]++;
    if (r.k !== 'up' && !r.free && side === 'b') { pts.push({ rd: g.S.cnt.b, m: mat(g.S), g: g.S.merit.r - g.S.merit.b, ck: chk }); chk = { r: 0, b: 0 }; }
  }
  const sgn = x => x > 0 ? 1 : x < 0 ? -1 : 0;
  let flips = 0, last = 0, since = null;
  for (const p of pts) { const s = sgn(p.m); if (s && last && s !== last) flips++; if (s) last = s; }
  for (let k = pts.length - 1; k >= 0; k--) { if (pts[k].m <= 0) { since = k + 1 < pts.length ? pts[k + 1].rd : null; break; } if (k === 0) since = pts[0].rd; }
  const mx = Math.max(...pts.map(p => p.m)), mn = Math.min(...pts.map(p => p.m));
  console.log(`${file.split('/').pop()} 共 ${pts.length} 回合 | 子力领先换手 ${flips} 次 | 汉从第 ${since} 回合起一直领先 | 子力差最大 汉+${mx} / 楚+${-mn} | 终局军功差 ${pts[pts.length - 1].g}`);
  if (curve) console.log('  ' + pts.map(p => `${p.rd}:${p.m >= 0 ? '+' : ''}${p.m}`).join(' '));
}
