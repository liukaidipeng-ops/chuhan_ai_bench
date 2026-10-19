// t9_need2 找到的“楚两步杀（将军起手）”局面：汉方哪些行动能挡住（走完楚既没有一步杀，也没有将军起手的两步杀），
// 挡住的行动里将军 / 送子各几种。  node tactics/t9_answer2.js g16 35
'use strict';
const L = require('./lib'), BF = L.BF;
const chk = (S, s) => BF.ai.inCheck(S, s);
const fastMates = S => { const me = S.turn, op = me === 'r' ? 'b' : 'r'; return L.actions(S).filter(x => !x.free && chk(x.S, op) && L.winner(x.S) === me); };
function threat(T) {   // 轮到楚：有没有一步杀或将军起手的两步杀
  if (fastMates(T).length) return 1;
  for (const x of L.actions(T).filter(x => !x.free && chk(x.S, 'r'))) {
    const rep = L.actions(x.S).filter(y => !y.free);
    if (rep.length && rep.every(y => fastMates(y.S).length)) return 2;
  }
  return 0;
}
const [, , gname, n] = process.argv;
const d = L.load(__dirname + '/games/' + gname + '.json');
const S = L.stateAt(d, +n);
const acts = L.actions(S).filter(x => !x.free && !L.winner(x.S));
const ok = [];
for (const x of acts) if (!threat(x.S)) ok.push(x);
const kinds = x => { const t = []; if (x.up) t.push('升' + L.N[L.pa(S, x.up).t]); if (chk(x.S, 'b')) t.push('将军'); const q = L.pa(S, x.a.to); if (q && q.s === 'b') t.push('吃' + L.N[q.t]); return t.join('+') || '走子'; };
const cnt = {}; for (const x of ok) { const k = kinds(x); cnt[k] = (cnt[k] || 0) + 1; }
console.log(`${gname} 第${n}条前：汉 ${S.merit.r} 功 楚 ${S.merit.b} 功；汉行动 ${acts.length}，挡得住楚的一步杀和将军起手两步杀的 ${ok.length}`);
console.log('  按类型：' + Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('，'));
console.log('  将军类：' + ok.filter(x => chk(x.S, 'b')).map(x => L.desc(S, x)).join('；'));
let i = +n; while (i < d.entries.length && !(L.stateAt(d, i + 1).turn === 'b')) i++;
const A = L.stateAt(d, i + 1);
console.log(`  实走第${n}–${i}条：${d.entries.slice(+n, i + 1).map(e => JSON.stringify(e)).join(' ')}，之后楚威胁 ${threat(A)}`);
