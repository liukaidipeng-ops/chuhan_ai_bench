// 军功流向统计：每局双方把军功花在哪个兵种、将军次数、击杀进账、封顶浪费
'use strict';
const fs = require('fs'), path = require('path');
const E = path.join(__dirname, 'engine');
global.XQ = require(path.join(E, 'rules.js'));
const BF = global.BF = require(path.join(E, 'bingfa.js'));
const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' };
for (const file of process.argv.slice(2)) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const g = new BF.Game(); if (data.base) g.reset(data.base);
  const st = { r: { up: {}, upN: 0, spent: 0, checks: 0, kills: 0, capTurns: 0, firstUp: null, def: 0 }, b: { up: {}, upN: 0, spent: 0, checks: 0, kills: 0, capTurns: 0, firstUp: null, def: 0 } };
  for (const e of data.entries) {
    const S = g.S, side = S.turn, m0 = S.merit[side];
    let t = null, lv0 = 0; if (e.k === 'up') { t = S.board[e.at[1]][e.at[0]]; lv0 = t.lv; }
    const r = g.apply(e);
    if (e.k === 'up') { const c = m0 - g.S.merit[side]; const k = N[t.t] + (lv0 + 1); if (t.t === 'a' || t.t === 'e') st[side].def += c; st[side].up[k] = (st[side].up[k] || 0) + c; st[side].spent += c; st[side].upN++; if (st[side].firstUp == null) st[side].firstUp = g.S.cnt[side]; }
    else if (r && !r.free) { if (r.check) st[side].checks++; st[side].kills += (r.kills || []).filter(x => x.s !== side).length; if (g.S.merit[side] >= 30) st[side].capTurns++; }
  }
  console.log(`== ${path.basename(file)}  回合 ${g.S.cnt.r}`);
  for (const s of ['r', 'b']) { const x = st[s]; console.log(`${s === 'r' ? '汉' : '楚'}: 升级${x.upN}次 花${x.spent}功(士相${x.def}) 首升第${x.firstUp}回合 将军${x.checks} 击杀${x.kills} 封顶${x.capTurns}回合 | ${Object.entries(x.up).map(([k, v]) => k + ':' + v).join(' ')}`); }
}
