'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create,cleanEnvironment}=require('../tools/isolated-ai');
test('competitor environments discard every inherited AI override',()=>{
  const e={PATH:'/usr/bin',BFAI_ROOT_RR:'9',BFAI_KD:'poison',BFSIM_TUNE:'poison'};
  assert.deepEqual(cleanEnvironment(e,0),{PATH:'/usr/bin',BFAI_ROOT_RR:'0'});
  assert.deepEqual(cleanEnvironment(e,1),{PATH:'/usr/bin',BFAI_ROOT_RR:'1'});
  assert.equal(e.BFAI_ROOT_RR,'9');
});
test('candidate and control really execute in separate pinned environments',async()=>{
  const old=process.env.BFAI_ROOT_RR;process.env.BFAI_ROOT_RR='9';let a,b;
  try{
    a=await create('ai/candidate.js',1);b=await create('ai/baseline.js',0);
    assert.notEqual(a.identity.pid,b.identity.pid);assert.notEqual(a.identity.pid,process.pid);
    assert.equal(a.identity.rootRR,'1');assert.equal(b.identity.rootRR,'0');assert.equal(process.env.BFAI_ROOT_RR,'9');
    assert.equal(a.identity.sha256,require('../config/compare600.json').candidate.fileSha256);
    assert.equal(b.identity.sha256,require('../config/compare600.json').baseline.fileSha256);
    for(const ai of [a,b]){assert.equal(ai.LEVELS.xhard.budget,9000);assert.equal(ai.LEVELS.xhard.minNodes,60000);}
  }finally{a?.close();b?.close();if(old===undefined)delete process.env.BFAI_ROOT_RR;else process.env.BFAI_ROOT_RR=old;}
});
