'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validatePlan,gate,summarize}=require('../tools/recovery120');
const commit='c14e3b3bb869738709a490ec9717d75fb1b23860';
function plan(){return{approved:true,evidenceVerified:true,oldRunId:38722944424,oldCommit:commit,maxParallel:16,completedIndices:[0],remainingIndices:Array.from({length:59},(_,i)=>i+1),preservedEvidence:[{index:0,run:'38722944424',commit,files:{'raw.json':'a'.repeat(64)}}]};}
test('migration rejects duplicate, missing and unapproved work',()=>{
  assert.doesNotThrow(()=>validatePlan(plan()));
  const a=plan();a.approved=false;assert.throws(()=>validatePlan(a));
  const b=plan();b.remainingIndices[0]=0;assert.throws(()=>validatePlan(b));
  const c=plan();c.remainingIndices.pop();assert.throws(()=>validatePlan(c));
});
test('gate blocks active old run and successes completed after snapshot',async()=>{
  const fake=(status,jobs)=>async url=>({ok:true,json:async()=>url.includes('/jobs?')?{total_count:jobs.length,jobs}:{status,head_sha:commit}});
  await assert.rejects(()=>gate(plan(),fake('in_progress',[])),/not terminal/);
  const j=[{name:'pair (0)',status:'completed',conclusion:'success'}];
  assert.equal((await gate(plan(),fake('completed',j))).length,59);
  j.push({name:'pair (1)',status:'completed',conclusion:'success'});
  await assert.rejects(()=>gate(plan(),fake('completed',j)),/Refresh/);
});
test('color split excludes truncated games from draws',()=>{
  const s=summarize({remainingIndices:[],records:[{games:[{flip:false,winner:'r',truncated:false},{flip:true,winner:null,truncated:true}]}]});
  assert.equal(s.byLevelAndColor.hard.r.win,1);assert.equal(s.byLevelAndColor.xhard.b.loss,1);assert.equal(s.byLevelAndColor.hard.b.unresolved,1);assert.equal(s.byLevelAndColor.hard.b.draw,0);
});
