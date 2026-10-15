'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const config=require('../config/formal120.json'),{validate}=require('./formal120');
const root=process.argv[2], games=[],missing=[],errors=[];
for(let i=0;i<60;i++){
  const seed=config.seedStart+i,dir=path.join(root,`pair-${seed}`);
  try{
    const meta=JSON.parse(fs.readFileSync(path.join(dir,'metadata.json')));
    assert.equal(meta.candidateSha256,config.expectedCandidateSha256);
    assert.equal(meta.commit,process.env.GITHUB_SHA);
    const raw=JSON.parse(fs.readFileSync(path.join(dir,'raw.json')));validate(raw,seed);
    const s=JSON.parse(fs.readFileSync(path.join(dir,'summary.json')));assert(s.verified);assert.equal(s.mode,'pair');
    games.push(...s.games);
  }catch(e){missing.push(seed);errors.push({seed,error:e.message});}
}
const resolved=games.filter(g=>!g.truncated),scores=resolved.map(g=>g.hardScore);
const summary={plannedGames:120,verifiedGames:games.length,complete:games.length===120,missingPairs:missing,errors,truncated:games.filter(g=>g.truncated).length,resolvedGames:resolved.length,hardScore:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,games,note:'Timeout, cap, stuck and probe are unresolved, not draws. Same candidate; A=hard, B=xhard. No automatic additional games or retries.'};
fs.writeFileSync('formal120-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
if(!summary.complete)process.exitCode=1;
