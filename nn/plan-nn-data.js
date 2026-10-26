// ===== NN 数据生成：plan 阶段（把 nn/jobs/*.json 展开成分片 matrix）=====
// 由 .github/workflows/nn-data-gen.yml 的 plan job 调用；输出到 $GITHUB_OUTPUT：
//   matrix = {"include":[ {tag,index,shard,seed,out,artifact,candidate,engine,positions,depth,q,open,maxRounds,audit,jobs}, ... ]}
//   count  = 分片数
//
// 触发方式：
//  1) push 改动 nn/jobs/**（读 git diff before..sha 里新增/修改的 job 文件）
//  2) workflow_dispatch（inputs.job 指定一个 job 文件路径）
//
// job 文件 schema（nn/jobs/<name>.json；可参照 cloud-handoff 的 20 shard × 1 万）：
//   tag            批次标签（默认文件名）
//   candidate      教师 AI 文件（相对仓库根，如 lab/candidates/release_r15.js）
//   engine         规则引擎目录（默认 lab/src，含 rules.js/bingfa.js）
//   positions      每分片局面数（默认 10000）
//   shards         分片数（默认 20）
//   seed           起始种子（分片 i 用 seed + i*seedStride；handoff：20261026 + shard*10000）
//   seedStride     分片种子步长（默认 10000）
//   depth          教师搜索固定层数（默认 3；固定层数=标签可复现）
//   q              静态搜索深度（默认 4，与产品 hard 档一致）
//   open           开局随机步数（默认 4）
//   maxRounds      回合上限（默认 150）
//   audit          每进程特征索引审计条数（默认 12）
//   jobs           每分片并行进程数（默认 4；4-core runner）
//   outPrefix      分片输出前缀（默认 data/selfplay-<tag>；实际 out = <outPrefix>-shard<NN>）
//   artifactPrefix artifact 前缀（默认 nn-selfplay-<tag>；实际 artifact = <artifactPrefix>-shard<NN>）
//   pad            shard 编号补零位数（默认 2 → 00..19）
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outFile = process.env.GITHUB_OUTPUT;
function setOut(k, v) {
  if (outFile) fs.appendFileSync(outFile, `${k}=${v}\n`);
  else console.log(`${k}=${v}`);
}

function changedJobFiles() {
  const before = process.env.GITHUB_EVENT_BEFORE || '';
  const sha = process.env.GITHUB_SHA || '';
  if (!before || /^0+$/.test(before) || !sha) return [];
  try {
    const out = execSync(`git diff --name-only ${before} ${sha} -- nn/jobs`, { encoding: 'utf8' });
    return out.split('\n').map(s => s.trim()).filter(f => f.endsWith('.json'));
  } catch (e) {
    console.error('[nn-plan] git diff 失败：' + (e.message || e).split('\n')[0]);
    return [];
  }
}

let files = changedJobFiles();
const dispatchJob = (process.env.NN_JOB || '').trim();
if (!files.length && dispatchJob) files = [dispatchJob];
files = [...new Set(files)];
if (!files.length) {
  console.error('[nn-plan] 没有发现 nn/jobs/*.json 变更，也没有 NN_JOB 输入');
  setOut('count', '0');
  process.exit(0);
}

const include = [];
for (const f of files) {
  if (!fs.existsSync(f)) { console.error(`[nn-plan] 跳过不存在的文件 ${f}`); continue; }
  let job;
  try { job = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`[nn-plan] ${f} 不是合法 JSON：${e.message}`); process.exit(1); }
  if (job.disabled) { console.log(`[nn-plan] 跳过 disabled 的 ${f}`); continue; }
  const tag = job.tag || path.basename(f, '.json');
  const shards = Math.max(1, job.shards != null ? +job.shards : 20);
  const stride = job.seedStride != null ? +job.seedStride : 10000;
  const pad = job.pad != null ? +job.pad : 2;
  const base = {
    tag,
    candidate: job.candidate,
    engine: job.engine || 'lab/src',
    positions: job.positions != null ? +job.positions : 10000,
    depth: job.depth != null ? +job.depth : 3,
    q: job.q != null ? +job.q : 4,
    open: job.open != null ? +job.open : 4,
    maxRounds: job.maxRounds != null ? +job.maxRounds : 150,
    audit: job.audit != null ? +job.audit : 12,
    jobs: job.jobs != null ? +job.jobs : 4,
    seed: job.seed != null ? +job.seed : 20261026,
    outPrefix: job.outPrefix || `data/selfplay-${tag}`,
    artifactPrefix: job.artifactPrefix || `nn-selfplay-${tag}`,
  };
  if (!base.candidate) { console.error(`[nn-plan] ${f} 缺 candidate`); process.exit(1); }
  for (let i = 0; i < shards; i++) {
    const shard = pad > 0 ? String(i).padStart(pad, '0') : String(i);
    include.push({ ...base, index: i, shard, seed: base.seed + i * stride, out: `${base.outPrefix}-shard${shard}`, artifact: `${base.artifactPrefix}-shard${shard}` });
  }
  console.log(`[nn-plan] ${f}: tag=${tag} shards=${shards} positions/shard=${base.positions} seed0=${base.seed} stride=${stride} total≈${shards * base.positions} out=${base.outPrefix}-shard<NN> artifact=${base.artifactPrefix}-shard<NN>`);
}
if (!include.length) { setOut('count', '0'); process.exit(0); }
setOut('matrix', JSON.stringify({ include }));
setOut('count', String(include.length));
