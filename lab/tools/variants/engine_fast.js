// 提速版引擎（tools/variants/fast/）：给 bfsim 的 BFSIM_ENGINE 用。规则文件也一起换成提速版。
const path = require('path');
module.exports = { enginePath() { global.XQ = require(path.join(__dirname, 'fast/rules.js')); return path.join(__dirname, 'fast/bingfa.js'); } };
