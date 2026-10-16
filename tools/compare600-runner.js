'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {root,hash,verify}=require('./verify'),{preflight}=require('./compare600-preflight'),{replay}=require('./replay');
const atomic=(file,value)=>{fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
function identity(c){return hash(JSON.stringify({schema:1,config:c,files:verify().files,runner:hash(fs.readFileSync(__filename)),simulator:hash(fs.readFileSync(path.join(root,'tools/bfsim.js')))}));}
function validateGame(record,expected){
  assert.equal(record.schema,1);assert.equal(record.experimentId,expected.id);assert.equal(record.seed,expected.seed);assert.equal(record.flip,expected.flip);
  const r=record.result;assert.equal(r.seed,expected.seed);assert.equal(r.flip,expected.flip);assert.equal(typeof r.reason,'string');
  assert.deepEqual(r.levels,{r:expected.level,b:expected.level});
  for(const side of ['r','b']){const lv=r.effectiveLevels[side];assert.equal(lv.budget,expected.budget);assert.equal(lv.minNodes,expected.minNodes);assert.equal(lv.dyn,2.7);assert(!lv.nodes);}
  for(const d of r.decisions){
    assert(Number.isFinite(d.startedAt)&&Number.isFinite(d.endedAt)&&d.endedAt>=d.startedAt);
    if(d.phase==='forced-pass'){assert.equal(d.stopReason,'forced-pass');continue;}
    assert.equal(d.phase,'search');assert.equal(d.ai,d.side===(expected.flip?'b':'r')?'A':'B');assert.equal(d.level,expected.level);assert.equal(d.levelConfig.budget,expected.budget);assert.equal(d.levelConfig.minNodes,expected.minNodes);assert(!d.levelConfig.nodes);
    assert(d.thinking&&d.thinking.trace);assert.equal(typeof d.thinking.trace.why,'string');assert(d.thinking.trace.why.length>0);assert.equal(d.stopReason,d.thinking.trace.why);
    assert.equal(d.nodes,d.thinking.nodes);assert.equal(d.depth,d.thinking.depth);assert.deepEqual(d.actions,d.thinking.trace.seq);
    if(!['only-art','no-move'].includes(d.stopReason))assert(Array.isArray(d.thinking.trace.iter),'Complete iteration trace missing');
  }
  replay(r);return true;
}
function validateJournal(file,record){
  const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows[0].type,'start');assert.equal(rows.at(-1).type,'end');
  for(const row of rows){assert.equal(row.seed,record.seed);assert.equal(row.flip,record.flip);}
  assert.deepEqual(rows.at(-1).result,record.result);
  assert.deepEqual(rows.filter(x=>x.type==='decision').map(x=>x.decision),record.result.decisions);
}
function collectPair(dir,expected,play){
  fs.mkdirSync(dir,{recursive:true});
  const records=[];
  // Each valid game is committed separately. A failing second side never removes first-side evidence.
  for(const flip of [false,true]){
    const e={...expected,flip},file=path.join(dir,`game-${flip?1:0}.json`);
    let record;
    if(fs.existsSync(file)){record=JSON.parse(fs.readFileSync(file));validateGame(record,e);}
    else{record=play(e);validateGame(record,e);atomic(file,record);}
    assert.equal(typeof record.journal,'string','Missing complete journal');assert(!path.isAbsolute(record.journal)&&!record.journal.split(/[\\/]/).includes('..'));validateJournal(path.join(dir,record.journal),record);
    records.push(record);
  }
  assert.equal(records[0].experimentId,records[1].experimentId);assert.equal(records[0].seed,records[1].seed);
  const pair={schema:1,experimentId:expected.id,seed:expected.seed,complete:true,games:records.map(r=>({flip:r.flip,winner:r.result.winner,reason:r.result.reason,unresolved:['cap','stuck','probe'].includes(r.result.reason)}))};
  atomic(path.join(dir,'pair.json'),pair);return pair;
}
function launchGame(c,e,dir){
  const attempt=fs.mkdtempSync(path.join(dir,`attempt-${e.flip?1:0}-`)),raw=path.join(attempt,'raw.json');
  const args=['tools/bfsim.js','--match',[c.candidate.path,c.baseline.path].join(','),'--match-levels',`${c.level},${c.level}`,'--games','2','--match-one',e.flip?'1':'0','--seed',String(e.seed),'--open','0','--jobs','1','--max-rounds',String(c.maxRounds),'--fixed','--trace','--quiet','--journal',attempt,'--json',raw];
  atomic(path.join(attempt,'request.json'),{experimentId:e.id,seed:e.seed,flip:e.flip,args,startedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA||null,run:process.env.GITHUB_RUN_ID||null,node:process.version});
  const out=fs.openSync(path.join(attempt,'simulator.log'),'w');
  // Linux timeout kills the entire simulator/worker process group, with a five-second kill grace.
  const start=Date.now(),run=cp.spawnSync('timeout',['--signal=TERM','--kill-after=5s',`${Math.max(1,Math.floor(e.remainingMs/1000))}s`,process.execPath,...args],{cwd:root,stdio:['ignore',out,out]});fs.closeSync(out);
  atomic(path.join(attempt,'status.json'),{status:run.status,error:run.error?.message||null,signal:run.signal,elapsedMs:Date.now()-start,reason:[124,137].includes(run.status)?'wall-timeout':run.status===0?'finished':'simulator-error'});
  // Recover a terminal game already journaled before a wrapper/infrastructure interruption.
  const journal=path.join(attempt,`game-${e.seed}-${e.flip?1:0}.jsonl`);
  let result;
  if(fs.existsSync(raw)){const p=JSON.parse(fs.readFileSync(raw));assert.equal(p.errors.length,0);assert.equal(p.results.length,1);result=p.results[0];}
  else if(fs.existsSync(journal)){
    const rows=fs.readFileSync(journal,'utf8').trim().split('\n').map(JSON.parse);result=rows.find(x=>x.type==='end')?.result;
  }
  assert(result,`No complete game; retained ${path.basename(attempt)} (exit ${run.status})`);
  const record={schema:1,experimentId:e.id,seed:e.seed,flip:e.flip,result,journal:path.relative(dir,journal),attempt:path.relative(dir,attempt)};
  validateGame(record,e);validateJournal(journal,record);return record;
}
function recoverCompletedAttempts(dir,expected){
  if(!fs.existsSync(dir))return;
  for(const flip of [false,true]){
    const target=path.join(dir,`game-${flip?1:0}.json`);if(fs.existsSync(target))continue;
    for(const name of fs.readdirSync(dir).filter(n=>n.startsWith(`attempt-${flip?1:0}-`)).sort()){
      const attempt=path.join(dir,name),journal=path.join(attempt,`game-${expected.seed}-${flip?1:0}.jsonl`);if(!fs.existsSync(journal))continue;
      const request=JSON.parse(fs.readFileSync(path.join(attempt,'request.json')));assert.equal(request.experimentId,expected.id,'Attempt identity mismatch');
      const lines=fs.readFileSync(journal,'utf8').trim().split('\n');
      const rows=lines.map((s,i)=>{try{return JSON.parse(s);}catch(e){if(i===lines.length-1)return null;throw e;}}).filter(Boolean),end=rows.find(x=>x.type==='end');
      if(!end)continue;
      const record={schema:1,experimentId:expected.id,seed:expected.seed,flip,result:end.result,journal:path.relative(dir,journal),attempt:name};
      validateGame(record,{...expected,flip});validateJournal(journal,record);atomic(target,record);break;
    }
  }
}
function run(index,out){
  const c=JSON.parse(fs.readFileSync(path.join(root,'config/compare600.json'))),gate=preflight(c);assert(gate.ready,gate.blockers.join('; '));assert.equal(c.formalLaunchEnabled,true);
  assert(Number.isInteger(index)&&index>=0&&index<300);const id=identity(c),seed=c.seedStart+index,dir=path.resolve(out,`pair-${seed}`),e={id,seed,level:c.level,budget:c.budgetMs,minNodes:c.minNodes};
  fs.mkdirSync(dir,{recursive:true});
  // An operator must confirm any previous process has terminated; exclusive lock prevents concurrent duplicate starts.
  const lock=path.join(dir,'active.lock'),fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,run:process.env.GITHUB_RUN_ID||null,at:new Date().toISOString()}));fs.closeSync(fd);
  try{
    const meta=path.join(dir,'metadata.json');
    if(fs.existsSync(meta))assert.equal(JSON.parse(fs.readFileSync(meta)).experimentId,id);
    else atomic(meta,{schema:1,experimentId:id,index,seed,config:c,configSha256:hash(fs.readFileSync(path.join(root,'config/compare600.json'))),manifest:verify(),runnerSha256:hash(fs.readFileSync(__filename)),simulatorSha256:hash(fs.readFileSync(path.join(root,'tools/bfsim.js'))),commit:process.env.GITHUB_SHA||null,run:process.env.GITHUB_RUN_ID||null,runtime:{node:process.version,platform:process.platform,cpu:require('node:os').cpus()[0]?.model}});
    recoverCompletedAttempts(dir,e);const deadline=Date.now()+c.pairTimeoutSeconds*1000;
    return collectPair(dir,e,g=>{const remainingMs=deadline-Date.now();assert(remainingMs>0,'Pair deadline exhausted');return launchGame(c,{...g,remainingMs},dir);});
  }finally{fs.unlinkSync(lock);}
}
module.exports={identity,validateGame,validateJournal,collectPair,recoverCompletedAttempts,run};
if(require.main===module){try{console.log(JSON.stringify(run(Number(process.argv[2]),process.argv[3]||'results/compare600')));}catch(e){console.error(e);process.exitCode=1;}}
