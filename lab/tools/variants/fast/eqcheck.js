// 提速版核对：同样的种子、按节点数收手，原版和提速版逐局结果必须完全一样（并比较用时）。
// node tools/variants/fast/eqcheck.js [对数=8] [节点=8000] [起始种子=100]
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const [pairs = 8, nodes = 8000, seed = 100] = process.argv.slice(2).map(Number);
const ROOT = path.join(__dirname, '../../..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eq-'));
const run = (tag, ai, env) => {
  const out = path.join(tmp, tag + '.json'), t0 = Date.now();
  const r = spawnSync(process.execPath, ['tools/bfsim.js', '--match', ai + ',' + ai, '--level', 'hard', '--budget', '100000000', '--nodes', 'hard=' + nodes, '--games', String(2 * pairs), '--seed', String(seed), '--fixed', '--jobs', '1', '--quiet', '--json', out], { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8' });
  if (r.status) { console.log(r.stdout, r.stderr); process.exit(1); }
  return { ms: Date.now() - t0, res: JSON.parse(fs.readFileSync(out, 'utf8')).results };
};
const strip = rs => rs.slice().sort((x, y) => x.seed - y.seed || (x.flip ? 1 : 0) - (y.flip ? 1 : 0)).map(r => { const { ms, msMax, samples, ...x } = r; return JSON.stringify(x); });
const SELF = process.env.EQ_SELF, A = run('orig', 'src/bfai.js', {}), B = SELF ? run('orig2', 'src/bfai.js', {}) : run('fast', 'tools/variants/fast/bfai.js', { BFSIM_ENGINE: 'tools/variants/engine_fast.js' });
const a = strip(A.res), b = strip(B.res); let diff = 0;
for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { diff++; if (diff <= 3) console.log('不同：第', i, '局', '\n 原', a[i].slice(0, 300), '\n 快', b[i].slice(0, 300)); }
const nodesA = A.res.reduce((t, r) => t + (r.nodes || 0), 0);
console.log(`${a.length} 局，不同 ${diff} 局；原版 ${A.ms} ms，提速版 ${B.ms} ms，快 ${(A.ms / B.ms).toFixed(3)} 倍；共 ${nodesA} 节点`);
