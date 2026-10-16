'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {collectPair,recoverCompletedAttempts,validateGame}=require('../tools/compare600-runner');
const expected={id:'fixture-identity',seed:610159900,level:'xhard',budget:9000,minNodes:60000};
function record(dir,e){
  global.XQ=require('../src/rules');const BF=global.BF=require('../src/bingfa'),g=new BF.Game(),action={k:'mv',from:[0,3],to:[0,4]};assert(g.apply(action));
  const level={budget:9000,minNodes:60000,dyn:2.7},trace={why:'depth',iter:[{depth:1,nodes:60000}],seq:[action]},decision={phase:'search',side:'r',level:'xhard',levelConfig:level,startedAt:1,endedAt:2,nodes:60000,depth:1,thinking:{nodes:60000,depth:1,trace},stopReason:'depth',actions:[action]};
  decision.ai=e.flip?'B':'A';
  const result={seed:e.seed,flip:e.flip,levels:{r:'xhard',b:'xhard'},effectiveLevels:{r:level,b:level},winner:null,reason:'cap',decisions:[decision],finalState:BF.cloneState(g.S)};
  const r={schema:1,experimentId:e.id,seed:e.seed,flip:e.flip,result,journal:`journal-${e.flip?1:0}.jsonl`};
  fs.writeFileSync(path.join(dir,r.journal),[{type:'start'},{type:'decision',decision},{type:'end',result}].map(x=>JSON.stringify({seed:e.seed,flip:e.flip,...x})).join('\n')+'\n');return r;
}
function temp(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'compare600-'));try{return fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('second-side failure preserves first game; retry runs exactly missing side',()=>temp(dir=>{
  const played=[];assert.throws(()=>collectPair(dir,expected,e=>{played.push(e.flip);if(e.flip)throw Error('interruption');return record(dir,e);}),/interruption/);
  const bytes=fs.readFileSync(path.join(dir,'game-0.json'));
  const p=collectPair(dir,expected,e=>{played.push(e.flip);return record(dir,e);});assert.equal(p.complete,true);assert.deepEqual(played,[false,true,true]);assert.deepEqual(fs.readFileSync(path.join(dir,'game-0.json')),bytes);
  collectPair(dir,expected,()=>assert.fail('Successful games must not replay'));
}));
test('trace and stop-reason corruption blocks accepting a completed game',()=>temp(dir=>{
  const r=record(dir,{...expected,flip:false});delete r.result.decisions[0].thinking.trace.why;
  assert.throws(()=>validateGame(r,{...expected,flip:false}));
}));
test('different experiment cannot reuse successful game',()=>temp(dir=>{
  collectPair(dir,expected,e=>record(dir,e));assert.throws(()=>collectPair(dir,{...expected,id:'other'},()=>assert.fail('Must reject before starting')));
}));
test('terminal journal survives interruption before game checkpoint commit',()=>temp(dir=>{
  const a=path.join(dir,'attempt-0-test');fs.mkdirSync(a);const r=record(a,{...expected,flip:false});
  fs.renameSync(path.join(a,r.journal),path.join(a,`game-${expected.seed}-0.jsonl`));fs.writeFileSync(path.join(a,'request.json'),JSON.stringify({experimentId:expected.id}));
  recoverCompletedAttempts(dir,expected);const played=[];collectPair(dir,expected,e=>{played.push(e.flip);return record(dir,e);});assert.deepEqual(played,[true]);
}));
test('single-game selector cannot accidentally schedule extra games',()=>{
  const {parseArgs}=require('../tools/bfsim');assert.equal(parseArgs(['--match','ai/candidate.js,ai/candidate.js','--games','2','--match-one','1','--trace']).matchOne,1);
  assert.throws(()=>parseArgs(['--match','a,b','--games','4','--match-one','1']));assert.throws(()=>parseArgs(['--match','a,b','--games','2','--match-one','2']));
});
