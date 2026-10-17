# tactics/：战术部门的局面、重放和验证脚本

- `engine/`：冻结引擎，取自 `chuhan_gpt` main `1d89ddb`（10-17 核对：和 main `1cb7c65` 三个文件散列完全相同）（rules `33428c80…`、bingfa `0fba4faa…`、bfai `cf0833b2…`）。
- `games/`：Ham 上传的实战对局（`chuhan_gpt` 工单 #13–#17 解码后的导出 JSON）。
- `replay.js` 逐条重放；`merit_flow.js` 军功流向；`board.js` 打印局面；`lib.js` 枚举工具；
  `verify_mates.js` 一步杀枚举；`verify_g14_trap.js`；`scan_safe.js` 楚方躲杀扫描。
- `out/` 输出；`positions/` 考题局面。
