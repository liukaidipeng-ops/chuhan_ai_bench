// 楚“差一次升级就杀”的局面（t9_need 找出的），汉方各种应法分类：
//   挡住：走完楚没有一步杀；其中将军着：楚怎么解（要不要用掉升级）、解完楚还有没有“升级就杀”
//   node tactics/t9_answer.js g20 56
'use strict';
const L = require('./lib'), BF = L.BF;
const [, , gname, n] = process.argv;
const d = L.load(__dirname + '/games/' + gname + '.json');
const S = L.stateAt(d, +n);
const flipNeed = T => { const U = BF.cloneState(T); U.turn = 'b'; U.upgraded = false; return L.mates(U).length; };
const acts = L.actions(S).filter(x => !x.free && !L.winner(x.S));
const real = d.entries[+n];
let safe = 0; const checks = [];
for (const x of acts) {
  if (L.mates(x.S).length) continue;
  safe++;
  if (!BF.ai.inCheck(x.S, 'b')) continue;
  const rep = L.actions(x.S).filter(y => !y.free);
  const noUp = rep.filter(y => !y.up), up = rep.filter(y => y.up);
  // 楚各种解将之后，轮到汉：汉若停一手，楚还有没有一步杀（升级名额已在下一回合恢复，所以看的是威胁是否还在）
  const still = rep.filter(y => !L.winner(y.S) && flipNeed(y.S) > 0).length;
  checks.push(`${L.desc(S, x)}${x.up ? '' : '（不花钱）'}：楚解法 ${rep.length}（不升级 ${noUp.length}），解完楚仍有杀威胁的 ${still}`);
}
console.log(`${gname} 第${n}条前：汉 ${S.merit.r} 功 楚 ${S.merit.b} 功；汉合法行动 ${acts.length}，走完楚没有一步杀的 ${safe}，其中将军 ${checks.length}`);
for (const c of checks) console.log('  ' + c);
const after = L.stateAt(d, +n + 1);
console.log('实走第' + n + '条：', JSON.stringify(real), '之后楚一步杀', after.turn === 'b' ? L.mates(after).length : '(汉还没走完)');
