'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {verify,hash,root}=require('./verify');
const config=require('../config/formal120.json');
function preflight(){
  if(Object.keys(process.env).some(k=>/^(BFAI_|BFSIM_)/.test(k)))throw Error('Unset AI overrides');
  const manifest=verify(), digest=hash(fs.readFileSync(path.join(root,'ai/candidate.js')));
  assert.match(config.expectedCandidateSha256||'',/^[a-f0-9]{64}$/,'Full candidate SHA256 must be supplied');
  assert(config.expectedCandidateSha256.startsWith(config.requiredCandidatePrefix),'Wrong candidate identity');
  assert.equal(digest,config.expectedCandidateSha256,'Candidate mismatch');
  global.XQ=require('../src/rules');global.BF=require('../src/bingfa');
  const ai=require('../ai/candidate');
  for(const [level,expected] of Object.entries(config.nativeLevels)){
    assert.equal(ai.LEVELS[level].budget,expected.budget);
    assert.equal(ai.LEVELS[level].minNodes,expected.minNodes);
    assert(!ai.LEVELS[level].nodes,'Native time search must not carry a node cap');
  }
  assert.equal(config.games,120);assert.equal(config.pairs,60);
  assert.deepEqual(config.levels,['hard','xhard']);
  return {manifest,config,candidateSha256:digest,configSha256:hash(fs.readFileSync(path.join(root,'config/formal120.json'))),manifestSha256:hash(fs.readFileSync(path.join(root,'config/manifest.json'))),commit:process.env.GITHUB_SHA||cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),runtime:{node:process.version,platform:process.platform,cpu:require('node:os').cpus()[0]?.model},run:process.env.GITHUB_RUN_ID||null,attempt:process.env.GITHUB_RUN_ATTEMPT||null};
}
function validate(payload,seed){
  assert.equal(payload.errors.length,0);assert.equal(payload.results.length,2);
  assert.deepEqual(new Set(payload.results.map(r=>r.flip)),new Set([false,true]));
  for(const r of payload.results){
    assert.equal(r.seed,seed);
    assert.deepEqual(r.levels,r.flip?{r:'xhard',b:'hard'}:{r:'hard',b:'xhard'});
    for(const side of ['r','b'])for(const [k,v] of Object.entries(config.nativeLevels[r.levels[side]]))assert.equal(r.effectiveLevels[side][k],v);
    assert(r.decisions.some(d=>d.phase==='search'));
    for(const d of r.decisions.filter(d=>d.phase==='search')){
      assert.equal(d.level,r.levels[d.side]);assert.equal(d.levelConfig.budget,config.nativeLevels[d.level].budget);
      assert.equal(d.levelConfig.minNodes,config.nativeLevels[d.level].minNodes);
      assert(!d.levelConfig.nodes);assert(d.endedAt>=d.startedAt);assert(Number.isFinite(d.nodes));
    }
    require('./replay').replay(r);
  }
}
async function run(mode,index){
  const metadata=preflight();
  if(mode==='preflight'){console.log(JSON.stringify(metadata));return;}
  assert(['smoke','pair'].includes(mode));
  if(mode==='pair')assert(Number.isInteger(index)&&index>=0&&index<60);
  const seed=mode==='smoke'?config.smokeSeed:config.seedStart+index;
  const dir=path.join(root,'results',mode==='smoke'?'smoke':`pair-${seed}`);
  assert(!fs.existsSync(dir),'Refusing to overwrite or repeat existing pair');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'metadata.json'),JSON.stringify({...metadata,mode,seed,index,startedAt:new Date().toISOString()},null,2));
  const raw=path.join(dir,'raw.json');
  const args=['tools/bfsim.js','--match','ai/candidate.js,ai/candidate.js','--match-levels','hard,xhard','--games','2','--seed',String(seed),'--open','0','--jobs','1','--max-rounds',String(mode==='smoke'?1:config.maxRounds),'--fixed','--quiet','--journal',dir,'--json',raw];
  fs.writeFileSync(path.join(dir,'command.json'),JSON.stringify([process.execPath,...args]));
  const log=fs.openSync(path.join(dir,'simulator.log'),'w');
  const child=cp.spawn(process.execPath,args,{cwd:root,detached:true,stdio:['ignore',log,log]});
  let timeout=false;
  const timer=setTimeout(()=>{timeout=true;try{process.kill(-child.pid,'SIGKILL');}catch{}},1000*(mode==='smoke'?300:config.pairTimeoutSeconds));
  let outcome;
  try{outcome=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});}
  finally{clearTimeout(timer);fs.closeSync(log);}
  const journalGames=[false,true].map(flip=>{
    const p=path.join(dir,`game-${seed}-${flip?1:0}.jsonl`);
    const events=fs.existsSync(p)?fs.readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
    const end=events.find(e=>e.type==='end');
    return{flip,started:events.length>0,completed:!!end,reason:end?.result.reason||(timeout?'wall-timeout':'incomplete'),truncated:!end||['cap','stuck','probe'].includes(end.result.reason)};
  });
  fs.writeFileSync(path.join(dir,'status.json'),JSON.stringify({seed,...outcome,timeout,games:journalGames,endedAt:new Date().toISOString()},null,2));
  assert(!timeout,'Pair timed out; partial journals preserved');assert.equal(outcome.code,0);
  const payload=JSON.parse(fs.readFileSync(raw));validate(payload,seed);
  const games=payload.results.map(r=>({seed,flip:r.flip,winner:r.winner,reason:r.reason,truncated:['cap','stuck','probe'].includes(r.reason),hardScore:['cap','stuck','probe'].includes(r.reason)?null:r.winner===null?.5:r.winner===(r.flip?'b':'r')?1:0}));
  fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify({mode,games,verified:true},null,2));
  console.log(JSON.stringify({seed,mode,games}));
}
module.exports={preflight,validate};
if(require.main===module)run(process.argv[2],Number(process.argv[3])).catch(e=>{console.error(e);process.exitCode=1;});
