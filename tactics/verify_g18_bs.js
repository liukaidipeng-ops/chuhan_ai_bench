// #18 第 67 条楚背水：实走（两只象各一步）和同一只象走两步的对比
//   node tactics/verify_g18_bs.js
'use strict';
const L=require('./lib');
const d=L.load(require('path').join(__dirname,'games/g18.json'));
const S=L.stateAt(d,67); const e=d.entries[67]; console.log(JSON.stringify(e));
const BF=L.BF;
for (const steps of [e.steps,[{from:[2,9],to:[4,7]},{from:[2,9],to:[4,7]}],[{from:[6,9],to:[4,7]},{from:[6,9],to:[4,7]}]]) {
  const a=Object.assign({},e,{steps}); const R=BF.attempt(S,a);
  if(!R){console.log(JSON.stringify(steps),'不合法');continue;}
  const fr=[];for(let r=0;r<10;r++)for(let f=0;f<9;f++){const p=R.S.board[r][f];if(p&&p.bz!=null)fr.push(`${L.N[p.t]}${p.lv}@${f},${r} bz=${p.bz}`)}
  console.log(JSON.stringify(steps.map(s=>s.from+'→'+s.to)),'ev',R.ev.filter(x=>['kill','hit','repel'].includes(x.e)).map(x=>x.e).join(','),'frozen',fr.join(' '));
}
console.log('S 4,7', JSON.stringify(S.board[7][4]), '2,9',JSON.stringify(S.board[9][2]),'6,9',JSON.stringify(S.board[9][6]));
for (const steps of [e.steps,[{from:[2,9],to:[4,7]},{from:[2,9],to:[4,7]}]]) {
  const R=BF.attempt(S,Object.assign({},e,{steps}));
  const el=[];for(let r=0;r<10;r++)for(let f=0;f<9;f++){const p=R.S.board[r][f];if(p&&p.s==='b'&&p.t==='e')el.push(`相${p.lv}@${f},${r} hp${p.hp}${p.bz!=null?' 冻'+p.bz:''}`)}
  console.log(JSON.stringify(steps.map(s=>s.from+'→'+s.to)), el.join(' '), 'cnt.b',R.S.cnt.b);
}
