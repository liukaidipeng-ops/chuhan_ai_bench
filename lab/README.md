# AI 增强实验室（Claude Code 负责，2026-10-17 起）

目标：新“兵仙”（xhard）对线上“霸王”（hard，`src/bfai.js` = 线上 cf0833）胜率 ≥ 70%。
- 开发阶段：按搜索量收手（兵仙 = 霸王的 3 倍节点，`--nodes hard=20000`），结果可复现。
- 最终验收：按网页真实时间（9 秒对 3 秒），600 局。

## 目录
- `src/`：线上引擎和电脑（`rules.js`、`bingfa.js`、`bfai.js`），从 `chuhan_gpt` main 复制，不改。
- `candidates/`：待测电脑。
- `tools/bfsim.js`：对打模拟器；`tools/variants/x3.js`：把某份电脑的霸王档换成兵仙设置（`BFAI_X3_SRC` 指定文件）。
- `tools/ci_match.js` + `.github/workflows/lab-match.yml`：往 `lab/jobs/` 推请求文件，GitHub 分段跑，结果提交到 `lab/results/`。

## 本机跑
```
cd lab
BFAI_X3_SRC=candidates/某.js node tools/bfsim.js --match tools/variants/x3.js,src/bfai.js --level hard --nodes hard=20000 --games 40 --fixed
```
