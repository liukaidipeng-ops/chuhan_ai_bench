'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {verify,hash,root}=require('./verify');
const params={level:'hard',nodes:'hard=100000',open:10,openNodes:60000,maxRounds:12,jobs:2,fixed:true};
const runtime={node:process.version,platform:process.platform,arch:process.arch,cpuModel:require('node:os').cpus()[0]?.model||'unknown'};
const ai=['ai/candidate.js','ai/baseline.js'],opening='ai/opening.js';
function identity(){const manifest=verify();return hash(JSON.stringify({schema:1,files:manifest.files,params,ai,opening,profile:'smoke',runtime}));}
function validatePair(x,id,seed){
 if(x.schema!==1||x.experimentId!==id||x.profile!=='smoke'||x.seed!==seed)throw Error('Experiment mismatch');
 const p=x.payload,a=p?.args,rs=p?.results;
 if(!a||!Array.isArray(rs)||rs.length!==2||!Array.isArray(p.errors)||p.errors.length)throw Error('Incomplete/error pair');
 if(JSON.stringify(a.match)!==JSON.stringify(ai)||a.openAI!==opening||Object.entries(params).some(([k,v])=>a[k]!==v))throw Error('Parameter mismatch');
 if(rs.some(r=>r.seed!==seed||typeof r.flip!=='boolean'||!['r','b',null].includes(r.winner)||typeof r.reason!=='string')||new Set(rs.map(r=>r.flip)).size!==2)throw Error('Duplicate/missing side');
 const [a0,b0]=rs;
 if(!Array.isArray(a0.openSeq)||!Array.isArray(b0.openSeq)||JSON.stringify(a0.openSeq)!==JSON.stringify(b0.openSeq))throw Error('Different/missing actual opening');
 return true;
}
function score(r){if(['cap','stuck','probe'].includes(r.reason))return null;return r.winner===null?.5:r.winner===(r.flip?'b':'r')?1:0;}
function distribution(values){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);const q=p=>a.length?a[Math.min(a.length-1,Math.ceil(p*a.length)-1)]:null;return{count:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:a.at(-1)??null};}
function summarize(records){const rs=records.flatMap(x=>x.payload.results),xs=rs.map(score),valid=xs.filter(x=>x!==null);const decisions=rs.flatMap(r=>r.decisions||[]),timing={};for(const name of ['opening','A','B']){const ds=decisions.filter(d=>d.ai===name);timing[name]={milliseconds:distribution(ds.map(d=>d.ms)),nodes:distribution(ds.map(d=>d.nodes)),depth:distribution(ds.map(d=>d.depth))};}return{timing,requestedNodes:{search:100000,opening:60000},mechanismEvidence:'Each result retains act/up/kills/hits/jumaCounter/meritBy plus side and replayable decisions; no new combination mechanics implemented',profile:'smoke',qualification:false,games:rs.length,pairs:records.length,redWins:rs.filter(x=>x.winner==='r').length,blackWins:rs.filter(x=>x.winner==='b').length,unresolved:xs.filter(x=>x===null).length,candidateScore:valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null,note:'Capped smoke games never count as formal qualification or draws'};}
function parse(argv){const out={seeds:[500006],out:'results'};for(let i=0;i<argv.length;i++){if(argv[i]==='--seeds')out.seeds=argv[++i]?.split(',').map(Number);else if(argv[i]==='--out')out.out=argv[++i];else throw Error('Unknown option');}if(!out.seeds?.length||out.seeds.length>3||new Set(out.seeds).size!==out.seeds.length||out.seeds.some(n=>!Number.isSafeInteger(n)||n<500000||n>500299))throw Error('Use 1-3 unique seeds in 500000..500299');if(!out.out)throw Error('Missing output directory');return out;}
function main(argv){if(Object.keys(process.env).some(k=>/^(BFAI_|BFSIM_)/.test(k)))throw Error('Unset BFAI_/BFSIM_ overrides for a frozen run');const o=parse(argv),id=identity(),dir=path.resolve(o.out);fs.mkdirSync(dir,{recursive:true});const records=[];
 for(const seed of o.seeds){const target=path.join(dir,'pair-'+seed+'.json');
  if(fs.existsSync(target)){const existing=JSON.parse(fs.readFileSync(target));validatePair(existing,id,seed);records.push(existing);console.log('Resume: verified and skipped '+seed);continue;}
  const raw=path.join(dir,'raw-'+seed+'.json'),start=Date.now();
  const args=['tools/bfsim.js','--match',ai.join(','),'--games','2','--seed',String(seed),'--level',params.level,'--nodes',params.nodes,'--open',String(params.open),'--open-ai',opening,'--open-nodes',String(params.openNodes),'--max-rounds',String(params.maxRounds),'--jobs',String(params.jobs),'--fixed','--quiet','--json',raw];
  const run=cp.spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:1024*1024});
  fs.writeFileSync(path.join(dir,'pair-'+seed+'.log'),(run.stdout||'')+(run.stderr||''));
  if(run.status!==0||run.error){fs.writeFileSync(path.join(dir,'error-'+seed+'.json'),JSON.stringify({seed,status:run.status,message:run.error?.message||'simulator failure'}));throw Error('Pair failed; completed earlier pairs remain saved');}
  const record={runtime,schema:1,experimentId:id,profile:'smoke',seed,elapsedSeconds:(Date.now()-start)/1000,payload:JSON.parse(fs.readFileSync(raw))};
  validatePair(record,id,seed);const temp=target+'.tmp';fs.writeFileSync(temp,JSON.stringify(record,null,2)+'\n');fs.renameSync(temp,target);fs.unlinkSync(raw);records.push(record);console.log('Saved pair '+seed);
 }
 for(const record of records)for(const r of record.payload.results)require('./replay').replay(r);
 const summary=summarize(records);fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));return summary;
}
module.exports={distribution,params,identity,validatePair,score,summarize,parse,main};if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
