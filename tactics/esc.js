// 单个局面：轮到的一方哪些行动（可先升级）走完后对方没有一步杀；再列实走 k 条之后对方的一步杀
//   node tactics/esc.js tactics/games/g20.json 56 [k=1]
'use strict';
const L=require('./lib');
const [file,n]=[process.argv[2],+process.argv[3]];
const d=L.load(file); const S=L.stateAt(d,n);
const acts=L.actions(S).filter(x=>!x.free);
const safe=acts.filter(x=>!L.mates(x.S).length);
const g=new Map(); for(const x of safe){const k=x.up?('升'+L.N[L.pa(S,x.up).t]+'@'+x.up):'不升';g.set(k,(g.get(k)||[]).concat(L.desc(S,x)))}
console.log("躲法合计", safe.length, "/", acts.length); for(const [k,v] of g) console.log(k, v.length, v.join(' | '));
// 对方一步杀（实走后）
const T=L.stateAt(d, n+ +(process.argv[4]||1)); console.log('实走后对方杀法:', L.mates(T).map(x=>L.desc(T,x)).join(' | '));
