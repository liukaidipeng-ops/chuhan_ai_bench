# nn/ —— NN 自对弈数据生成（隔离目录，云端用）

本目录是 NN 试点云端数据管线的唯一入口；**不碰对打管线**：

- workflow：`.github/workflows/nn-data-gen.yml`，触发路径 `nn/jobs/**`，并发组 `nn-data-gen`
- 只读复用：`lab/src/{rules,bingfa}.js`、教师 **`lab/candidates/release_r15main.js`**（= 部署档 r15，100936B，sha256 `F4753726…3B6F47`；与 NN 本机 50k 数据的教师一致。注意不要用 lab 的 `release_r15.js`（93378B，r13b 基底）；r16 只差极窄 T5 局面，教师仍用 r15main）
- 云端只生成数据；训练/对打在本地

## 文件（与 `ai-work/nn/cloud-handoff.md` 对齐）

| 文件 | 说明 |
|---|---|
| `make-selfplay.js` | 自对弈生成器（教师固定 depth，多进程分片；输出 pos.bin/games.jsonl/meta.json/audit.jsonl） |
| `features.js` | 特征/二进制格式权威定义（dim=20511, featVersion=1, 头 24B + 记录 56B 前缀 + 5B×棋子） |
| `merge-shards.js` | 合并多个分片成单份正本（game 号重映射 shardIdx*100000+g）；**适配改动**：支持 `--in <glob>`、并排除输出文件自身（防重跑误匹配） |
| `plan-nn-data.js` | plan job：读 push 改动的 `nn/jobs/*.json`（或 dispatch 输入）展开分片 matrix |

## job 文件 schema（`nn/jobs/<name>.json`）

```json
{
  "tag": "200k",
  "candidate": "lab/candidates/release_r15main.js",
  "engine": "lab/src",
  "positions": 10000,
  "shards": 20,
  "seed": 20261026,
  "seedStride": 10000,
  "depth": 3,
  "q": 4,
  "open": 4,
  "maxRounds": 150,
  "audit": 12,
  "jobs": 4,
  "outPrefix": "data/selfplay-200k",
  "artifactPrefix": "nn-selfplay-200k",
  "pad": 2,
  "note": "20 shard × 1 万局面；seed=20261026+shard*10000；4-core runner --jobs 4"
}
```

- 分片 shard=0..19（两位补零）：`out = data/selfplay-200k-shard<NN>`，artifact = `nn-selfplay-200k-shard<NN>`。
- 各分片 seed 不重叠：`seed + shard*seedStride`；教师 `--depth 3 --q 4` 固定层数（标签可复现）。
- 每 shard 预计 30–50 分钟（4-core，~200–320 局面/分钟）；`max-parallel: 8` → 墙钟约 1.5–3 小时。

## 冒烟（首次接入）

1. 推 `nn/jobs/selfplay-smoke.json`（`shards:1, positions:1000, seed:20261026`）→ 等 1 个 shard 跑完；
2. 下载 artifact `nn-selfplay-smoke-shard00`（1 天保留）→ 解压 → 校验：
   - `.pos.bin` 存在且 >100KB；`.meta.json` 的 `errors == 0`、`positions`≥1000；`.games.jsonl` 行数 ≥10；
3. 本地 `node nn/merge-shards.js --out /tmp/smoke --in "<dir>/*.pos.bin"` 验证合并/头格式可用；
4. 再推正式 `nn/jobs/selfplay-200k.json`。

## 收尾（ops）

```bash
# 全部 artifact 下载解压到同一目录（每个含 selfplay-200k-shard<NN>.* 四个文件）后：
node nn/merge-shards.js --out data/selfplay-200k
# 或显式：--in "data/selfplay-200k-shard*.pos.bin"
# 产物：data/selfplay-200k.pos.bin（≈35MB/20 万局面）、.games.jsonl、.meta.json → 交 NN 训练
```

## 注意

- 2.5 修正：`merge-shards.js` 加了“排除输出文件自身”和 `--in <glob>` 支持（原版 --in 未生效；手写脚本 bug，已在 nn/ 内修好，不动 lab/src）。
- 不要提交 `data/` 下产物（云端走 artifact；本地目录仅供临时解压）。
- 不改 `lab/src`、不改候选、不跑对打/验收。
- 与 lab 对打同账号共享 GitHub 并发（20）；lab run 进行时本 workflow 会排队（不冲突）。
