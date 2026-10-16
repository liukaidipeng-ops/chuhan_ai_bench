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
  if(c.evidence.reviewRoute==='fixed-public-commit'){
    assert.equal(c.publishedInputCommit,'d5154c1471da42c8e8ee5a2359f046595128a6cf');
    const receiptBytes=fs.readFileSync(path.join(dir,'evidence/publication-manifest.json'));
    assert.equal(hash(receiptBytes),c.evidence.publicationManifestSha256);
    const receipt=JSON.parse(receiptBytes);
    for(const key of ['baseline','candidate']){assert.equal(receipt.publishedAiInputs[key].sourceSha256,c[key].sourceSha256);assert.equal(receipt.publishedAiInputs[key].publishedSha256,c[key].fileSha256);}
    const eq=receipt.equivalenceChecks;assert.equal(eq.parserCanonicalReprint.baselineEqual,true);assert.equal(eq.parserCanonicalReprint.candidateEqual,true);assert.equal(eq.fixedPositionBehavior.baselineEqual,true);assert.equal(eq.fixedPositionBehavior.candidateEqual,true);assert.equal(eq.fixedPositionBehavior.allLegal,true);assert.equal(eq.fixedPositionBehavior.fixtureCount,12);
    requireTrue(c.evidence.runtimePublicIdentityVerified,'Verify actual candidate/control process hashes and flags');
    requireTrue(c.evidence.cloudReplayVerified,'Verify real cloud traces and replay');
    assert.equal(c.evidence.archiveManifestFullyVerified,false,'Do not claim uninspected archive was verified');
  }else{
    requireTrue(c.evidence.reviewed,'Read and hash EXPERIMENT_CARD, GATE_SUMMARY, ZIP and patch');
    requireTrue(c.evidence.frozenFilesVerified,'Independently verify frozen baseline/candidate/patch identities');
    requireTrue(c.evidence.runtimeFrozenIdentityVerified,'Verify actual runtime frozen identity');
    requireTrue(c.evidence.smallRegressionPassed,'Verify small regression');
    requireTrue(c.candidate.equivalenceVerified,'Verify original/public candidate equivalence');
  }
  requireTrue(c.storage.verifiedNoCharges,'Verify zero-charge storage transport');
  requireTrue(c.storage.logRoundTripVerified,'Verify complete log transport retrieval');
  assert.equal(c.storage.strategy,'workflow-logs-only');assert.equal(c.storage.cacheEnabled,false);
  if(!c.storage.evidenceReference||!c.storage.checkedAt)blockers.push('Missing storage verification evidence/time');
  requireTrue(c.runnerImplementationVerified,'Verify runner trace, replay and missing-game recovery');
  for(const [k,file] of [['launchGateSha256','evidence/launch-gate-summary.json'],['traceSmokeSha256','evidence/candidate-trace-smoke/summary.json']]){
    if(!/^[a-f0-9]{64}$/.test(c.evidence[k]||''))blockers.push('Missing verified evidence hash: '+k);
    else assert.equal(hash(fs.readFileSync(path.join(dir,file))),c.evidence[k]);
  }
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
