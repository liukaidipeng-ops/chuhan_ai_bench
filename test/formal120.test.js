'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {preflight,validate}=require('../tools/formal120');
const config=require('../config/formal120.json');
test('unarmed formal plan rejects historical candidate before simulation',()=>{
  if(config.expectedCandidateSha256===null)assert.throws(preflight,/Full candidate SHA256/);
  else if(require('../tools/verify').hash(require('node:fs').readFileSync(require('node:path').join(__dirname,'../ai/candidate.js')))!==config.expectedCandidateSha256)assert.throws(preflight,/Candidate mismatch/);
  else assert.doesNotThrow(preflight);
});
function fixture(){
  global.XQ=require('../src/rules');const BF=global.BF=require('../src/bingfa');
  return{errors:[],results:[false,true].map(flip=>{
    const g=new BF.Game(),action={k:'mv',from:[0,3],to:[0,4]};assert(g.apply(action));
    const levels=flip?{r:'xhard',b:'hard'}:{r:'hard',b:'xhard'};
    return{seed:610150000,flip,levels,effectiveLevels:{r:{...config.nativeLevels[levels.r]},b:{...config.nativeLevels[levels.b]}},winner:null,reason:'cap',decisions:[{phase:'search',side:'r',level:levels.r,levelConfig:{...config.nativeLevels[levels.r]},startedAt:1,endedAt:2,nodes:20000,actions:[action]}],finalState:BF.cloneState(g.S)};
  })};
}
test('formal evidence validates replay and rejects swapped-level or budget corruption',()=>{
  assert.doesNotThrow(()=>validate(fixture(),610150000));
  const wrongBudget=fixture();wrongBudget.results[1].effectiveLevels.r.budget=600;
  assert.throws(()=>validate(wrongBudget,610150000));
  const wrongSide=fixture();wrongSide.results[1].levels={r:'hard',b:'xhard'};
  assert.throws(()=>validate(wrongSide,610150000));
  const nodeCap=fixture();nodeCap.results[0].decisions[0].levelConfig.nodes=100000;
  assert.throws(()=>validate(nodeCap,610150000));
  const wrongMove=fixture();wrongMove.results[0].decisions[0].actions[0].to=[8,9];
  assert.throws(()=>validate(wrongMove,610150000));
});
