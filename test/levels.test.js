'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {parseArgs,matchLevels}=require('../tools/bfsim');
test('native budgets are default; explicit overrides must be positive',()=>{
  assert.equal(parseArgs([]).budget,null);
  assert.equal(parseArgs(['--budget','3000']).budget,3000);
  for(const x of ['0','-1','NaN']) assert.throws(()=>parseArgs(['--budget',x]));
});
test('A hard and B xhard follow competitors when swapping sides',()=>{
  const o=parseArgs(['--match','ai/candidate.js,ai/candidate.js','--match-levels','hard,xhard']);
  assert.deepEqual(matchLevels(o,false),{red:'hard',black:'xhard'});
  assert.deepEqual(matchLevels(o,true),{red:'xhard',black:'hard'});
  assert.equal(o.nodes,0);
  assert.throws(()=>parseArgs(['--match-levels','hard,xhard']));
  assert.throws(()=>parseArgs(['--match','a,b','--match-levels','hard,xhard','--red','hard']));
});
