// 提速测速：固定一批局面，按节点数让电脑想一步，比两版的用时（单进程、依次跑，结果可比）。
//   node tools/variants/fast/bench.js gen [局数=6] [输出=草稿区 positions.json]   用原版自对打收局面
//   node tools/variants/fast/bench.js run <src 或 tools/variants/fast> [局面文件] [节点=20000] [轮数=1]
//   两版走出的着法和节点数应当逐个相同（打印签名，对一下）
'use strict';
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const ROOT = path.join(__dirname, '../../..');
const [cmd, a1, a2, a3, a4] = process.argv.slice(2);
function load(dir) {
  const d = path.resolve(ROOT, dir);
  global.XQ = require(path.join(d, 'rules.js'));
  global.BF = require(path.join(d, 'bingfa.js'));
  return require(path.join(d, 'bfai.js'));
}
function rng(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
(async () => {
  if (cmd === 'gen') {
    const AI = load('src'), games = +(a1 || 6), out = a2 || 'positions.json', pos = [];
    AI.LEVELS.hard.nodes = 6000; AI.LEVELS.hard.budget = 1e9;
    for (let g0 = 0; g0 < games; g0++) {
      Math.random = rng(9000 + g0);
      const g = new BF.Game();
      for (let ply = 0; ply < 160 && !g.over; ply++) {
        if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); continue; }
        if (ply >= 6 && ply % 3 === 0) pos.push(JSON.stringify(g.S));
        const seq = await AI.think(BF.cloneState(g.S), ply < 6 ? 'mid' : 'hard');
        if (!seq.length) break;
        let ok = true; for (const a of seq) if (!g.apply(a)) { ok = false; break; }
        if (!ok || g.winner) break;
      }
    }
    fs.writeFileSync(out, JSON.stringify(pos));
    console.log(`收了 ${pos.length} 个局面 → ${out}`);
  } else if (cmd === 'run') {
    const AI = load(a1), pos = JSON.parse(fs.readFileSync(a2 || 'positions.json', 'utf8')), nodes = +(a3 || 20000), rounds = +(a4 || 1);
    AI.LEVELS.hard.nodes = nodes; AI.LEVELS.hard.budget = 1e9;
    const h = crypto.createHash('sha256'); let ms = 0, n = 0;
    for (let k = 0; k < rounds; k++) for (let i = 0; i < pos.length; i++) {
      Math.random = rng(1 + i);
      const S = JSON.parse(pos[i]), t0 = process.hrtime.bigint();
      const seq = await AI.think(S, 'hard');
      ms += Number(process.hrtime.bigint() - t0) / 1e6; n += AI.think.last.nodes;
      if (k === 0) h.update(JSON.stringify(seq) + ':' + AI.think.last.nodes + ';');
    }
    console.log(`${a1}: ${pos.length} 个局面 × ${rounds}，${ms.toFixed(0)} ms，${n} 节点，${(n / ms).toFixed(1)} 节点/毫秒，签名 ${h.digest('hex').slice(0, 16)}`);
  } else console.log('用法见文件开头');
})();
