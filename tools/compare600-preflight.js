'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {hash,root}=require('./verify');
function layout(c){
  assert.equal(c.pairs,300);assert.equal(c.games,600);assert.equal(c.blocksSequential,true);assert.equal(c.maxParallel,16);assert.equal(c.runner,'ubuntu-24.04');
  assert.equal(c.level,'xhard');assert.equal(c.budgetMs,9000);assert.equal(c.minNodes,60000);assert.equal(c.dynamicMultiplier,2.7);assert.equal(c.nodeCap,null);
  assert.equal(c.maxRounds,150);assert.equal(c.pairTimeoutSeconds,6000);assert.equal(c.jobTimeoutMinutes,110);
  assert.equal(c.traceRequired,true);assert.equal(c.stopReasonRequired,true);
  const pairs=c.blocks.flatMap(([start,end],block)=>{
    assert(Number.isInteger(start)&&Number.isInteger(end)&&end>start&&end-start<=100);
    return Array.from({length:end-start},(_,n)=>({block,index:start+n,seed:c.seedStart+start+n,games:[{flip:false,red:'candidate',black:'baseline'},{flip:true,red:'baseline',black:'candidate'}]}));
  });
  assert.deepEqual(pairs.map(p=>p.index),Array.from({length:300},(_,i)=>i));assert.equal(new Set(pairs.map(p=>p.seed)).size,300);
  for(const p of pairs)assert(Number.isSafeInteger(p.seed)&&p.seed>=610160000&&p.seed<610160300);
  return pairs;
}
function preflight(c,dir=root){
  const pairs=layout(c),blockers=[];
  const requireTrue=(x,message)=>{if(x!==true)blockers.push(message);};
  requireTrue(c.evidence.reviewed,'Read and hash EXPERIMENT_CARD, GATE_SUMMARY, ZIP and patch');
  requireTrue(c.evidence.frozenFilesVerified,'Independently verify only frozen baseline/candidate/patch identities; known archive manifest defect remains');
  requireTrue(c.evidence.runtimeFrozenIdentityVerified,'Prove actual runtime loads verified frozen sources, not unchecked current files');
  requireTrue(c.evidence.smallRegressionPassed,'Independently verify small-regression evidence');
  requireTrue(c.candidate.equivalenceVerified,'Verify original/public candidate equivalence');
  requireTrue(c.storage.verifiedNoCharges,'Verify account-wide zero-charge storage boundary; public runner pricing is insufficient');
  if(!c.storage.evidenceReference||!c.storage.checkedAt)blockers.push('Missing storage verification evidence/time');
  requireTrue(c.runnerImplementationVerified,'Verify runner full trace/stop-reason export, paired replay and resumable missing-game handling');
  for(const k of ['experimentCardSha256','gateSummarySha256','equivalenceEvidenceSha256','traceSmokeSha256'])if(!/^[a-f0-9]{64}$/.test(c.evidence[k]||''))blockers.push('Missing verified evidence hash: '+k);
  for(const [file,digest] of Object.entries(c.rules))assert.equal(hash(fs.readFileSync(path.join(dir,file))),digest,'Rules mismatch: '+file);
  global.XQ=require(path.join(dir,'src/rules.js'));global.BF=require(path.join(dir,'src/bingfa.js'));
  for(const key of ['baseline','candidate']){
    const a=c[key],file=path.join(dir,a.path);
    if(!/^[a-f0-9]{64}$/.test(a.fileSha256||'')||!fs.existsSync(file)){blockers.push('Unfrozen/missing '+key+' public source');continue;}
    assert.equal(hash(fs.readFileSync(file)),a.fileSha256,key+' hash mismatch');
    const ai=require(file),level=ai.LEVELS[c.level];assert(level);
    assert.equal(level.budget,c.budgetMs);assert.equal(level.minNodes,c.minNodes);assert.equal(level.dyn,c.dynamicMultiplier);assert(!level.nodes);
    assert.equal(ai.apiVersion,1);assert.equal(typeof ai.think,'function');assert('trace' in ai,'AI must expose trace switch');
  }
  return{ready:blockers.length===0,blockers,pairs,configSha256:hash(JSON.stringify(c)),formalLaunchEnabled:c.formalLaunchEnabled};
}
module.exports={layout,preflight};
if(require.main===module){try{
  const c=JSON.parse(fs.readFileSync(path.join(root,'config/compare600.json'))),r=preflight(c);
  console.log(JSON.stringify({...r,pairs:r.pairs.map(p=>({block:p.block,index:p.index,seed:p.seed}))},null,2));
  if(!r.ready)process.exitCode=2;
}catch(e){console.error(e);process.exitCode=1;}}
