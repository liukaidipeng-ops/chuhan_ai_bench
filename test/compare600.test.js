'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const c=require('../config/compare600.json'),{layout,preflight}=require('../tools/compare600-preflight');
test('300 unique swapped pairs in three bounded sequential blocks',()=>{
  const p=layout(c);assert.equal(p.length,300);assert.equal(p[0].seed,610160000);assert.equal(p.at(-1).seed,610160299);
  for(let b=0;b<3;b++)assert.equal(p.filter(x=>x.block===b).length,100);
  for(const x of p)assert.deepEqual(x.games,[{flip:false,red:'candidate',black:'baseline'},{flip:true,red:'baseline',black:'candidate'}]);
});
test('duplicate blocks, old seeds and changed budget rejected',()=>{
  for(const change of [{blocks:[[0,100],[0,100],[200,300]]},{seedStart:610150000},{budgetMs:600},{maxParallel:20},{nodeCap:100000}])assert.throws(()=>layout({...c,...change}));
});
test('missing evidence, candidate and storage fail closed',()=>{
  const blocked=JSON.parse(JSON.stringify(c));blocked.evidence.runtimePublicIdentityVerified=false;blocked.storage.verifiedNoCharges=false;blocked.formalLaunchEnabled=false;const r=preflight(blocked);assert.equal(r.ready,false);assert(r.blockers.some(x=>x.includes('storage')));assert(r.blockers.some(x=>x.includes('candidate')));assert.equal(r.formalLaunchEnabled,false);
});
