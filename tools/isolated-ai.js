'use strict';
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto'),{fork}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function cleanEnvironment(env,rootRR){const out={};for(const [k,v] of Object.entries(env))if(!/^(BFAI_|BFSIM_)/.test(k))out[k]=v;out.BFAI_ROOT_RR=String(rootRR);return out;}
function rng(a){return()=>{let t=a+=1831565813;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
async function create(file,rootRR){
  if(!['ai/candidate.js','ai/baseline.js'].includes(file)||![0,1].includes(rootRR))throw Error('Unapproved isolated AI');
  const child=fork(__filename,['--ai-child'],{env:cleanEnvironment(process.env,rootRR),stdio:['ignore','inherit','inherit','ipc']});
  let next=0;const pending=new Map();
  child.on('message',m=>{const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Error(m.error)):p.resolve(m.value);});
  const fail=e=>{for(const p of pending.values())p.reject(e);pending.clear();};child.on('error',fail);child.on('exit',code=>fail(Error('Isolated AI exited '+code)));
  process.once('exit',()=>child.kill());
  const request=payload=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});child.send({id,...payload},err=>{if(err){pending.delete(id);reject(err);}});});
  try{
    const init=await request({type:'init',file});
    const api={LEVELS:init.levels,apiVersion:init.apiVersion,trace:false,identity:init.identity,rngSeed:0,close:()=>child.disconnect()};
    api.think=async(state,level)=>{const x=await request({type:'think',state,level,levelConfig:api.LEVELS[level],trace:api.trace,seed:api.rngSeed});api.think.last=x.last;return x.actions;};return api;
  }catch(e){child.kill();throw e;}
}
if(process.argv.includes('--ai-child')){
  let ai;
  process.on('disconnect',()=>process.exit(0));
  process.on('message',async m=>{try{
    if(m.type==='init'){
      if(!['ai/candidate.js','ai/baseline.js'].includes(m.file))throw Error('Unapproved source');
      global.XQ=require(path.join(root,'src/rules.js'));global.BF=require(path.join(root,'src/bingfa.js'));
      const file=path.join(root,m.file);ai=require(file);
      process.send({id:m.id,value:{levels:ai.LEVELS,apiVersion:ai.apiVersion,identity:{file:m.file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),rootRR:process.env.BFAI_ROOT_RR,pid:process.pid}}});
    }else if(m.type==='think'){
      if(!ai)throw Error('AI not initialized');ai.LEVELS[m.level]=m.levelConfig;ai.trace=m.trace;Math.random=rng(m.seed);
      const actions=await ai.think(m.state,m.level);process.send({id:m.id,value:{actions,last:ai.think.last}});
    }else throw Error('Unknown request');
  }catch(e){process.send({id:m.id,error:String(e.stack||e)});}});
}
module.exports={create,cleanEnvironment,rng};
