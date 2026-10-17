// 在 GitHub 免费机器上分段跑“新电脑 vs 旧电脑”对打（bfsim --match），跑完合并、算得分。
// 由 .github/workflows/lab-match.yml 调用：往 lab/jobs/ 推一个请求文件就开跑，结果由机器人提交到 lab/results/。
//
// 请求文件 lab/jobs/<名字>.json：
//   { "match": "tools/variants/x3.js,src/bfai.js", "pairs": 300, "seed": 1000, "chunks": 20,
//     "args": "--level hard --nodes hard=20000", "env": { "BFAI_X3_SRC": "src/bfai.js" }, "note": "这组测什么" }
//   pairs：种子数，每个种子换边各下一局（总局数 = 2 × pairs）。按节点数收手时分段跑和一次跑完逐局相同。
//
// node tools/ci_match.js plan <推送前提交> <推送后提交>   → GitHub 输出 matrix / any
// node tools/ci_match.js run <请求文件> <第几段>           → out/<名字>-<段>.json
// node tools/ci_match.js collect <各段目录>                → lab/results/<名字>.txt + .json.gz
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const { execFileSync, spawnSync } = require('child_process');
const LAB = path.join(__dirname, '..'), REPO = path.join(LAB, '..');
const RES = process.env.CI_MATCH_RES || path.join(LAB, 'results');
const nameOf = f => path.basename(f, '.json');
const load = f => JSON.parse(fs.readFileSync(path.resolve(REPO, f), 'utf8'));
const chunksOf = j => Math.max(1, Math.min(60, j.chunks || 20));
const range = (j, c) => { const n = chunksOf(j); return { lo: Math.floor(c * j.pairs / n), hi: Math.floor((c + 1) * j.pairs / n) }; };

function stats(rs) {
  const xs = rs.map(r => (!r.winner ? 0.5 : (r.winner === (r.flip ? 'b' : 'r') ? 1 : 0)));
  const n = xs.length, m = n ? xs.reduce((a, b) => a + b, 0) / n : 0.5;
  // 同一种子两局算一对：对与对之间独立，用对的得分算误差（比逐局算更准，也不会低估）
  const bySeed = new Map;
  rs.forEach((r, i) => { const a = bySeed.get(r.seed) || []; a.push(xs[i]); bySeed.set(r.seed, a); });
  const ps = [...bySeed.values()].filter(a => a.length === 2).map(a => (a[0] + a[1]) / 2);
  const pm = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : m;
  const pv = ps.length > 1 ? ps.reduce((a, b) => a + (b - pm) ** 2, 0) / (ps.length - 1) : 0.25;
  const se = Math.sqrt(pv / Math.max(ps.length, 1));
  const side = s => { const g = rs.filter(r => (r.flip ? 'b' : 'r') === s); return { n: g.length, w: g.filter(r => r.winner === s).length, d: g.filter(r => !r.winner).length }; };
  const pairsBy = k => ps.filter(x => x === k).length;
  return { games: n, score: m, pairs: ps.length, lo: pm - 1.96 * se, hi: pm + 1.96 * se, asR: side('r'), asB: side('b'), pair2: pairsBy(1), pair1: pairsBy(0.5), pair0: pairsBy(0), draws: rs.filter(r => !r.winner).length };
}
const pct = x => (100 * x).toFixed(1) + '%';

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'plan') {
  const [before, after] = rest;
  const spec = before && !/^0+$/.test(before) ? `${before}..${after}` : `${after}~1..${after}`;
  let files = [];
  try { files = execFileSync('git', ['diff', '--name-only', '--no-renames', '--diff-filter=AM', spec, '--', 'lab/jobs/'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(f => f.endsWith('.json')); } catch (e) { console.error(e.message); }
  const include = [];
  for (const f of files) { const j = load(f); for (let c = 0; c < chunksOf(j); c++) { const { lo, hi } = range(j, c); if (hi > lo) include.push({ req: f, name: nameOf(f), chunk: c }); } }
  if (include.length > 256) throw new Error(`一次共 ${include.length} 段，超过 GitHub 一次 256 段的上限`);
  console.log('matrix=' + JSON.stringify({ include }));
  console.log('any=' + (include.length ? 'true' : 'false'));
  console.error(`请求 ${files.length} 个：${files.join(' ')}；共 ${include.length} 段`);
} else if (cmd === 'run') {
  const [req, cs] = rest, j = load(req), c = +cs, { lo, hi } = range(j, c);
  const out = path.join(REPO, 'out', `${nameOf(req)}-${c}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const args = [...(j.args || '').trim().split(/\s+/).filter(Boolean), '--match', j.match, '--fixed', '--seed', String(j.seed + lo), '--games', String(2 * (hi - lo)), '--jobs', String(os.cpus().length), '--quiet', '--json', out];
  console.log(`第 ${c + 1}/${chunksOf(j)} 段：种子 ${j.seed + lo}～${j.seed + hi - 1}（${2 * (hi - lo)} 局），${os.cpus().length} 核\nnode tools/bfsim.js ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [path.join(LAB, 'tools/bfsim.js'), ...args], { cwd: LAB, env: { ...process.env, ...(j.env || {}) }, stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
} else if (cmd === 'collect') {
  const dir = path.resolve(rest[0]), by = {};
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) { const m = f.match(/^(.*)-(\d+)\.json$/); if (m) (by[m[1]] = by[m[1]] || []).push(path.join(dir, f)); }
  fs.mkdirSync(RES, { recursive: true });
  for (const [name, files] of Object.entries(by)) {
    const reqF = `lab/jobs/${name}.json`, j = fs.existsSync(path.join(REPO, reqF)) ? load(reqF) : null;
    const want = j ? [...Array(chunksOf(j)).keys()].filter(c => range(j, c).hi > range(j, c).lo).length : files.length;
    const parts = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
    const results = parts.flatMap(p => p.results).sort((a, b) => a.seed - b.seed || (a.flip ? 1 : 0) - (b.flip ? 1 : 0));
    const errors = parts.flatMap(p => p.errors || []);
    const st = stats(results);
    const nodes = results.reduce((t, r) => t + (r.nodes || 0), 0), moves = results.reduce((t, r) => t + (r.nodeMoves || 0), 0);
    const txt = [
      `# ${name}（GitHub Actions${process.env.GITHUB_RUN_ID ? ' 运行 ' + process.env.GITHUB_RUN_ID : ''}）`,
      `# 请求：${j ? JSON.stringify(j) : '（请求文件不在了）'}`,
      `# 收到 ${files.length}/${want} 段${files.length < want ? '  ✗ 缺段，结果不完整' : ''}；出错 ${errors.length} 局`,
      `新电脑得分 ${pct(st.score)}（${st.games} 局，${st.pairs} 对；95% 区间 ${pct(st.lo)}～${pct(st.hi)}）`,
      `  新电脑执汉 ${st.asR.n} 局 胜 ${st.asR.w} 和 ${st.asR.d}；执楚 ${st.asB.n} 局 胜 ${st.asB.w} 和 ${st.asB.d}`,
      `  每对：两局全胜 ${st.pair2} 对，一胜一负 ${st.pair1} 对，两局全负 ${st.pair0} 对；和棋 ${st.draws} 局`,
      moves ? `  平均每步 ${Math.round(nodes / moves)} 个节点` : '',
    ].filter(Boolean).join('\n') + '\n';
    fs.writeFileSync(path.join(RES, name + '.txt'), txt);
    fs.writeFileSync(path.join(RES, name + '.json.gz'), zlib.gzipSync(JSON.stringify({ request: j, stats: st, results, errors })));
    process.stdout.write(txt);
  }
} else {
  console.error('用法：plan <前> <后> | run <请求> <段> | collect <目录>');
  process.exit(2);
}
