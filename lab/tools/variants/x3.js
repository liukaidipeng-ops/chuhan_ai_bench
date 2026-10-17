// 兵仙（xhard）当“霸王”档上场：载入一份独立的电脑，把它的 hard 档改成 xhard 的设置。
// 搜索量按 xhard / hard 的比例放大（网页里是 9 秒对 3 秒、6 万对 2 万节点，都是 3 倍）。
// 用法：BFAI_X3_SRC=要测的电脑.js node tools/bfsim.js --match tools/variants/x3.js,src/bfai.js --level hard --nodes hard=20000
const fs = require('fs'), path = require('path'), Module = require('module');
const file = path.resolve(__dirname, '../..', process.env.BFAI_X3_SRC || 'src/bfai.js');
const m = new Module(file + '#x3', module);
m.filename = file; m.paths = Module._nodeModulePaths(path.dirname(file));
m._compile(fs.readFileSync(file, 'utf8'), file);
const X = m.exports, H = X.LEVELS.hard, XH = X.LEVELS.xhard, k = XH.budget / H.budget;
const L = { ...XH };
// BFAI_X3_SET="depth=9,q=6"：改兵仙档的设置（只改待测这一方）；BFAI_X3_MULT=1.3：搜索量再乘一个数（比如提速版按快多少倍补给它）
for (const kv of (process.env.BFAI_X3_SET || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); L[k] = isNaN(+v) ? v : +v; }
const mult = +(process.env.BFAI_X3_MULT || 1);
for (const key of ['nodes', 'budget']) {
  let v = L[key];
  Object.defineProperty(L, key, { enumerable: true, get: () => v, set: n => { v = n > 0 ? Math.round(n * k * mult) : n; } });
}
X.LEVELS.hard = L;
module.exports = X;
