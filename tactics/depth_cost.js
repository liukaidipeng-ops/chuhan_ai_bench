// 线上 r1（lab/candidates/release_r1.js 的副本 tactics/engine-r1.js）固定算 d 层时，每步要多少节点、多少毫秒
//   node tactics/depth_cost.js 3,4,5,6   （局面取 #21–#27 每局 30% / 50% / 70% 处）
'use strict';
const L = require('./lib'), BF = L.BF;
const AI = require('./engine-r1.js');
const ds = (process.argv[2] || '3,4,5').split(',').map(Number);
const pos = [];
for (const g of ['g21', 'g22', 'g24', 'g25', 'g27']) {
  const d = L.load(__dirname + '/games/' + g + '.json');
  for (const fr of [0.3, 0.5, 0.7]) {
    const g2 = new BF.Game(); let n = Math.floor(d.entries.length * fr);
    for (let i = 0; i < n; i++) g2.apply(d.entries[i]);
    while (n < d.entries.length && !(n === 0 || g2.ends[n - 1])) g2.apply(d.entries[n++]);   // 推到一个回合开头
    pos.push({ name: `${g}#${n}`, S: BF.cloneState(g2.S) });
  }
}
(async () => {
  for (const d of ds) {
    AI.LEVELS.hard.fixedDepth = d;
    const rows = [];
    for (const p of pos) { await AI.think(BF.cloneState(p.S), 'hard'); const t = AI.think.last; rows.push({ n: p.name, ms: t.ms, nodes: t.nodes, depth: t.depth }); }
    const ms = rows.map(r => r.ms).sort((a, b) => a - b), nd = rows.map(r => r.nodes).sort((a, b) => a - b);
    const med = a => a[Math.floor(a.length / 2)];
    console.log(`固定 ${d} 层：${rows.length} 个局面，耗时中位 ${med(ms)} ms、最长 ${ms[ms.length - 1]} ms；节点中位 ${med(nd)}、最多 ${nd[nd.length - 1]}`);
    console.log('   ' + rows.map(r => `${r.n}:${r.ms}ms/${r.nodes}`).join(' '));
  }
})();
