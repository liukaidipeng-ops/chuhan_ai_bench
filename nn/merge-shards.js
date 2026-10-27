// ===== 合并多个独立分片的 .pos.bin（云端 20 shard 用）=====
// 每个 shard 由独立 make-selfplay 运行产出（各自 game 号从 0 开始），合并时把 game 号重映射为
//   game = shardIndex * 100000 + 原 game 号
// 并同步重写 games.jsonl 的 g 字段；输出 <out>.pos.bin + <out>.games.jsonl + <out>.meta.json（汇总）。
// features.py --build 按 (game, ply) 排序，因此合并后的训练集可复现。
//
// 用法：node merge-shards.js --out data/selfplay-200k --in "data/shard-*.pos.bin"
//   或：node merge-shards.js --out data/selfplay-200k --files a.pos.bin,b.pos.bin,...
'use strict';
const fs = require('fs');
const path = require('path');
const F = require('./features.js');

const args = { out: path.join(__dirname, 'data', 'selfplay-200k'), files: null, pattern: null, games: null };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k === '--out') args.out = path.resolve(process.argv[++i]);
  else if (k === '--files') args.files = process.argv[++i].split(',').map(x => path.resolve(x.trim()));
  else if (k === '--in') args.pattern = process.argv[++i];
  else if (k === '--games') args.games = process.argv[++i].split(',').map(x => path.resolve(x.trim()));
  else throw new Error('未知参数 ' + k);
}
let files = args.files;
if (!files) {
  const dir = path.dirname(args.out), base = path.basename(args.out);
  // 自动匹配 <out>-shard<NN>.pos.bin；也支持 --in 通配（如 "data/selfplay-200k-shard*.pos.bin"）
  if (args.pattern) {
    const pb = path.basename(args.pattern);
    const reP = new RegExp('^' + pb.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    const pdir = path.dirname(args.pattern);
    files = fs.readdirSync(path.resolve(pdir)).filter(f => reP.test(f)).sort().map(f => path.join(path.resolve(pdir), f));
  } else {
    const re = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:-shard\\d+)?\\.pos\\.bin$');
    files = fs.readdirSync(dir).filter(f => re.test(f)).sort().map(f => path.join(dir, f));
  }
}
// 防重跑误把上一轮输出本体当分片（<out>.pos.bin 也在同目录）
files = files.filter(f => path.resolve(f) !== path.resolve(args.out + '.pos.bin'));
if (!files.length) throw new Error('没找到分片 .pos.bin');
console.log(`合并 ${files.length} 个分片：`);
const outFd = fs.openSync(args.out + '.pos.bin', 'w');
fs.writeSync(outFd, F.fileHeaderBytes(0, 0, 0));
let recCount = 0, gameCount = 0;
const gameLines = [];
for (let si = 0; si < files.length; si++) {
  const f = files[si];
  const buf = fs.readFileSync(f);
  // 分片号优先从文件名解析（-shard<NN>），保持 game = 分片号*100000 + 局号；缺片时不会错位
  const mShard = path.basename(f).match(/-shard(\d+)\.pos\.bin$/);
  const offBase = (mShard ? Number(mShard[1]) : si) * 100000;
  // 注意：body 是去掉头后的缓冲，偏移必须从 0 开始（原版从 HEADER_BYTES 起读会整体偏移 24 字节导致错位）
  const body = Buffer.from(buf.subarray(F.HEADER_BYTES));
  let off = 0;
  let localRecs = 0;
  while (off + F.PREFIX_BYTES <= body.length) {
    const n = body[off + 9];
    body.writeUInt32LE(offBase + body.readUInt32LE(off), off);
    off += F.PREFIX_BYTES + F.PIECE_BYTES * n;
    localRecs++;
  }
  fs.writeSync(outFd, body);
  recCount += localRecs;
  // games.jsonl（可选）：重映射 g
  const gf = args.games ? args.games[si] : f.replace(/\.pos\.bin$/, '.games.jsonl');
  let gCount = 0;
  if (fs.existsSync(gf)) {
    for (const line of fs.readFileSync(gf, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const o = JSON.parse(line); o.g = offBase + o.g; gameLines.push(JSON.stringify(o)); gCount++; } catch (e) { }
    }
  }
  gameCount += gCount;
  console.log(`  ${path.basename(f)}: ${localRecs} 局面, ${gCount} 局（game += ${offBase}）`);
}
fs.writeSync(outFd, F.fileHeaderBytes(recCount, gameCount, Math.floor(Date.now() / 1000)), 0, F.HEADER_BYTES, 0);
fs.closeSync(outFd);
fs.writeFileSync(args.out + '.games.jsonl', gameLines.join('\n') + (gameLines.length ? '\n' : ''));
fs.writeFileSync(args.out + '.meta.json', JSON.stringify({
  mergedFrom: files.map(f => path.basename(f)), positions: recCount, games: gameCount,
  createdAt: new Date().toISOString(), featVersion: F.FEAT_VERSION, dim: F.DIM,
}, null, 1));
console.log(`完成：${recCount} 局面 / ${gameCount} 局 → ${args.out}.pos.bin（${(fs.statSync(args.out + '.pos.bin').size / 1024 / 1024).toFixed(1)} MB）`);
