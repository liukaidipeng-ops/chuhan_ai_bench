// 战术部门：对局重放 + 军功流向记录
//   node tactics/replay.js tactics/games/g14.json [--json out.json]
// 用 tactics/engine/ 里冻结的引擎（chuhan_gpt main 1d89ddb，bfai cf0833，和手册 v0.2 同一份）逐条重放导出的 entries，
// 每条行动打印：序号、回合、哪方、做了什么、击杀 / 打伤、双方军功、局面分（电脑思考记录里的 v，楚方视角）。
'use strict';
const fs = require('fs'), path = require('path');
const E = path.join(__dirname, 'engine');
global.XQ = require(path.join(E, 'rules.js'));
const BF = global.BF = require(path.join(E, 'bingfa.js'));

const file = process.argv[2], ji = process.argv.indexOf('--json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const o = data.opts || {};
if (BF.CFG.beishui && 'bs' in o) BF.CFG.beishui.on = !!o.bs;
if (BF.CFG.r6 && 'r6' in o) BF.CFG.r6.on = !!o.r6;

const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' }, SIDE = { r: '汉', b: '楚' };
const g = new BF.Game(); if (data.base) g.reset(data.base);
const pa = (S, at) => at && S.board[at[1]] && S.board[at[1]][at[0]];
const nm = p => p ? N[p.t] + p.lv : '?';
const rows = [];
let turnNo = 0, turnStart = 0;
const think = data.think || {};
for (let i = 0; i < data.entries.length; i++) {
  const e = data.entries[i], S = g.S, side = S.turn;
  if (i === 0 || g.ends[i - 1]) turnStart = i;
  let d;
  if (e.k === 'up') { const p = pa(S, e.at); d = `升${nm(p)}@${e.at}`; }
  else if (e.k === 'mv') { const p = pa(S, e.from), q = pa(S, e.to); d = `${nm(p)} ${e.from}→${e.to}${q ? ' ×' + nm(q) : ''}`; }
  else if (e.k === 'sk') { const p = pa(S, e.at); d = `技能${e.sk || ''} ${nm(p)}@${e.at}${e.to ? '→' + e.to : ''}`; }
  else if (e.k === 'art') d = e.steps ? '背水[' + e.steps.map(m => `${m.from}→${m.to}`).join(' ') + ']' : '召回' + (e.t ? N[e.t] : '') + (e.up ? '并升级' : '') + (e.to ? '@' + e.to : '');
  else if (e.k === 'ult') d = '终极兵法' + (e.name || '');
  else d = JSON.stringify(e);
  const r = g.apply(e);
  if (!r) { console.log(`#${i} 重放失败: ${JSON.stringify(e)}`); process.exit(2); }
  const ev = (r.ev || []).filter(x => x.e === 'kill' || x.e === 'hit' || x.e === 'repel').map(x => `${x.e}:${SIDE[x.s] || ''}${N[x.t] || ''}${x.lv || ''}`);
  const T = g.S;
  const ends = r.k !== 'up' && !r.free;
  if (ends) turnNo++;
  const tk = ends && side === 'b' ? think[String(turnStart)] || think[String(i)] : null;
  const v = tk && tk.iter && tk.iter.length ? tk.iter[tk.iter.length - 1].v : null;
  const row = { i, turn: turnNo, side: SIDE[side], act: d, ev, merit: { r: T.merit.r, b: T.merit.b }, check: !!r.check, v };
  rows.push(row);
  console.log(`${String(i).padStart(3)} T${String(turnNo).padStart(3)} ${SIDE[side]} ${d}${ev.length ? ' [' + ev.join(' ') + ']' : ''}${r.check ? ' 将' : ''} | 功 汉${T.merit.r} 楚${T.merit.b}${v != null ? ' | 楚估' + v.toFixed(2) : ''}`);
}
console.log('结果', JSON.stringify(g.result), '导出结果', JSON.stringify(data.result));
if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify({ file: path.basename(file), ver: data.ver, rows, result: g.result }, null, 1));
