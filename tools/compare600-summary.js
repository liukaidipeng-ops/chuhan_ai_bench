'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const c=require('../config/compare600.json'),{identity,validateGame,validateJournal}=require('./compare600-runner');
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):e.name==='metadata.json'?[path.join(p,e.name)]:[]);}
function summarize(dirs){
 const id=identity(c),seen=new Set(),pairs=[],missing=[],errors=[],bySide={candidate:{r:{win:0,loss:0,draw:0,unresolved:0},b:{win:0,loss:0,draw:0,unresolved:0}},baseline:{r:{win:0,loss:0,draw:0,unresolved:0},b:{win:0,loss:0,draw:0,unresolved:0}}};
 for(const file of dirs.flatMap(walk)){
  const m=JSON.parse(fs.readFileSync(file));assert.equal(m.experimentId,id);assert(!seen.has(m.seed),'Duplicate pair directory');seen.add(m.seed);assert(m.seed>=c.seedStart&&m.seed<c.seedStart+300);const dir=path.dirname(file),games=[];
  for(const flip of [false,true]){const target=path.join(dir,`game-${flip?1:0}.json`);if(!fs.existsSync(target)){missing.push({seed:m.seed,flip});continue;}
   try{const r=JSON.parse(fs.readFileSync(target));validateGame(r,{id,seed:m.seed,flip,level:c.level,budget:c.budgetMs,minNodes:c.minNodes,aiHashes:{A:c.candidate.fileSha256,B:c.baseline.fileSha256}});validateJournal(path.join(dir,r.journal),r);const unresolved=['cap','stuck','probe'].includes(r.result.reason),score=unresolved?null:r.result.winner===null?.5:r.result.winner===(flip?'b':'r')?1:0;games.push({flip,winner:r.result.winner,reason:r.result.reason,unresolved,candidateScore:score});
    for(const who of ['candidate','baseline']){const side=who==='candidate'?(flip?'b':'r'):(flip?'r':'b'),v=bySide[who][side];v[unresolved?'unresolved':r.result.winner===null?'draw':r.result.winner===side?'win':'loss']++;}
   }catch(e){errors.push({seed:m.seed,flip,error:e.message});}
  }
  pairs.push({seed:m.seed,games,complete:games.length===2,resolved:games.length===2&&games.every(g=>!g.unresolved)});
 }
 for(let i=0;i<300;i++)if(!seen.has(c.seedStart+i))for(const flip of [false,true])missing.push({seed:c.seedStart+i,flip});
 const eligible=pairs.filter(p=>p.resolved),scores=eligible.map(p=>p.games.reduce((s,g)=>s+g.candidateScore,0)/2),n=scores.length,mean=n?scores.reduce((a,b)=>a+b,0)/n:null;
 const variance=n>1?scores.reduce((s,x)=>s+(x-mean)**2,0)/(n-1):null,half=n>1?1.96*Math.sqrt(variance/n):null;
 return{plannedPairs:300,plannedGames:600,verifiedGames:pairs.reduce((s,p)=>s+p.games.length,0),completePairs:pairs.filter(p=>p.complete).length,fullyResolvedPairs:n,missing,errors,bySide,pairedCandidateScore:mean,pairedNormalApprox95CI:half===null?null:[Math.max(0,mean-half),Math.min(1,mean+half)],note:'Fixed 300-pair endpoint. CI is approximate and only for fully resolved pairs; report unresolved and missing counts, do not treat them as draws or pool previous experiments.',pairs};
}
module.exports={summarize};
if(require.main===module){try{const [out,...dirs]=process.argv.slice(2),x=summarize(dirs);fs.writeFileSync(out,JSON.stringify(x,null,2)+'\n');console.log(JSON.stringify({completePairs:x.completePairs,verifiedGames:x.verifiedGames,errors:x.errors.length,missing:x.missing.length}));if(x.errors.length||x.missing.length)process.exitCode=2;}catch(e){console.error(e);process.exitCode=1;}}
