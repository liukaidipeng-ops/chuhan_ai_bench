'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {hash,verify,root}=require('./verify'),{validate}=require('./formal120');
const config=require('../config/formal120.json');
const OLD_RUN=38722944424,OLD_COMMIT='c14e3b3bb869738709a490ec9717d75fb1b23860';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name==='metadata.json'?[path.join(dir,e.name)]:[]);}
function inventory(dirs){
  const manifest=verify(), configHash=hash(fs.readFileSync(path.join(root,'config/formal120.json'))), records=[],seen=new Set();
  for(const file of dirs.flatMap(walk)){
    const dir=path.dirname(file),m=JSON.parse(fs.readFileSync(file));
    if(m.mode==='smoke')continue;
    assert.equal(m.mode,'pair');assert(Number.isInteger(m.index)&&m.index>=0&&m.index<60);
    assert.equal(m.seed,config.seedStart+m.index);assert(!seen.has(m.index),'Duplicate pair evidence: '+m.index);seen.add(m.index);
    assert.equal(m.candidateSha256,config.expectedCandidateSha256);
    assert.equal(m.manifest.candidateSourceSha256,config.expectedSourceSha256);
    assert.equal(m.configSha256,configHash);
    assert.deepEqual(m.manifest.files,manifest.files,'Frozen engine/AI/simulator hashes changed');
    assert.equal(m.manifestSha256,hash(fs.readFileSync(path.join(root,'config/manifest.json'))));
    assert.equal(m.attempt,'1','Do not merge rerun attempts');
    if(String(m.run)===String(OLD_RUN))assert.equal(m.commit,OLD_COMMIT);
    else assert.match(m.commit,/^[a-f0-9]{40}$/);
    const payload=JSON.parse(fs.readFileSync(path.join(dir,'raw.json')));validate(payload,m.seed);
    const a=payload.args;
    assert.deepEqual(a.match,['ai/candidate.js','ai/candidate.js']);assert.deepEqual(a.matchLevels,['hard','xhard']);
    assert.equal(a.games,2);assert.equal(a.open,0);assert.equal(a.jobs,1);assert.equal(a.maxRounds,150);assert.equal(a.nodes,0);assert.equal(a.budget,null);assert.equal(a.fixed,true);
    const status=JSON.parse(fs.readFileSync(path.join(dir,'status.json')));
    assert.equal(status.code,0);assert.equal(status.timeout,false);
    const files={};
    for(const name of ['metadata.json','raw.json','status.json','summary.json','command.json','simulator.log',`game-${m.seed}-0.jsonl`,`game-${m.seed}-1.jsonl`])files[name]=hash(fs.readFileSync(path.join(dir,name)));
    for(const flip of [false,true]){
      const events=fs.readFileSync(path.join(dir,`game-${m.seed}-${flip?1:0}.jsonl`),'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(events[0].type,'start');assert.equal(events.at(-1).type,'end');
      for(const e of events){assert.equal(e.seed,m.seed);assert.equal(e.flip,flip);}
      const result=payload.results.find(r=>r.flip===flip);
      assert.deepEqual(events.at(-1).result,result);
      assert.deepEqual(events.filter(e=>e.type==='decision').map(e=>e.decision),result.decisions);
    }
    records.push({index:m.index,seed:m.seed,run:m.run,commit:m.commit,files,games:payload.results.map(r=>({flip:r.flip,winner:r.winner,reason:r.reason,truncated:['cap','stuck','probe'].includes(r.reason)}))});
  }
  records.sort((a,b)=>a.index-b.index);
  const completedIndices=records.map(r=>r.index),remainingIndices=Array.from({length:60},(_,i)=>i).filter(i=>!seen.has(i));
  return{schema:1,createdAt:new Date().toISOString(),oldRunId:OLD_RUN,oldCommit:OLD_COMMIT,evidenceVerified:true,configSha256:configHash,completedIndices,remainingIndices,records};
}
function validatePlan(p){
  assert.equal(p.approved,true,'Explicit migration approval missing');assert.equal(p.evidenceVerified,true,'Successful evidence has not been verified');
  assert.equal(p.oldRunId,OLD_RUN);assert.equal(p.oldCommit,OLD_COMMIT);assert.equal(p.maxParallel,16);
  for(const a of [p.completedIndices,p.remainingIndices]){assert(Array.isArray(a));assert(a.every(i=>Number.isInteger(i)&&i>=0&&i<60));assert.equal(new Set(a).size,a.length);}
  assert.equal(new Set([...p.completedIndices,...p.remainingIndices]).size,60);assert.equal(p.completedIndices.length+p.remainingIndices.length,60);
  assert.deepEqual(p.preservedEvidence.map(x=>x.index).sort((a,b)=>a-b),[...p.completedIndices].sort((a,b)=>a-b));
  for(const e of p.preservedEvidence){assert.equal(String(e.run),String(OLD_RUN));assert.equal(e.commit,OLD_COMMIT);assert.match(e.files?.['raw.json']||'',/^[a-f0-9]{64}$/);}
}
async function gate(p,fetcher=fetch){
  validatePlan(p);
  const base=`https://api.github.com/repos/liukaidipeng-ops/chuhan_ai_bench/actions/runs/${OLD_RUN}`;
  const get=async url=>{const r=await fetcher(url,{headers:{Accept:'application/vnd.github+json'}});assert(r.ok,`Read-only GitHub check failed: ${r.status}`);return r.json();};
  const run=await get(base);assert.equal(run.status,'completed','Old run is not terminal; duplication risk');assert.equal(run.head_sha,OLD_COMMIT);
  const data=await get(base+'/jobs?per_page=100');assert(data.total_count<=100,'Unexpected job pagination');
  assert(data.jobs.every(j=>j.status==='completed'),'Some old jobs are still active');
  const successful=data.jobs.filter(j=>/^pair \(\d+\)$/.test(j.name)&&j.conclusion==='success').map(j=>Number(j.name.match(/\d+/)[0])).sort((a,b)=>a-b);
  assert.deepEqual(successful,[...p.completedIndices].sort((a,b)=>a-b),'Refresh successful evidence after cancellation settles');
  return p.remainingIndices;
}
function summarize(x){
  const byLevelAndColor={hard:{r:{win:0,loss:0,draw:0,unresolved:0},b:{win:0,loss:0,draw:0,unresolved:0}},xhard:{r:{win:0,loss:0,draw:0,unresolved:0},b:{win:0,loss:0,draw:0,unresolved:0}}};
  for(const r of x.records)for(const g of r.games)for(const level of ['hard','xhard']){
    const side=level==='hard'?(g.flip?'b':'r'):(g.flip?'r':'b'),k=g.truncated?'unresolved':g.winner===null?'draw':g.winner===side?'win':'loss';byLevelAndColor[level][side][k]++;
  }
  return{plannedGames:120,verifiedGames:2*x.records.length,complete:x.records.length===60,missingPairs:x.remainingIndices,byLevelAndColor,records:x.records};
}
module.exports={inventory,validatePlan,gate,summarize};
if(require.main===module)(async()=>{
  const [mode,...args]=process.argv.slice(2);
  if(mode==='gate'){
    const p=JSON.parse(fs.readFileSync(args[0])),pairs=await gate(p);
    assert(pairs.length>0,'No unfinished pairs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT,'pairs='+JSON.stringify(pairs)+'\n');
  }else if(mode==='inventory'||mode==='summary'){
    const out=args.shift(),x=inventory(args);fs.writeFileSync(out,JSON.stringify(mode==='summary'?summarize(x):x,null,2)+'\n');console.log(JSON.stringify({verifiedPairs:x.records.length,remainingIndices:x.remainingIndices}));
  }else throw Error('Use inventory OUTPUT DIR..., summary OUTPUT DIR..., or gate PLAN');
})().catch(e=>{console.error(e);process.exitCode=1;});
