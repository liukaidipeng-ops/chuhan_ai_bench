'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {validateGame,validateJournal}=require('./compare600-runner'),c=require('../config/compare600.json');
const dir=process.argv[2],p=JSON.parse(fs.readFileSync(path.join(dir,'raw.json')));assert.equal(p.errors.length,0);assert.equal(p.results.length,2);assert.deepEqual(new Set(p.results.map(r=>r.flip)),new Set([false,true]));
for(const r of p.results){const e={id:'candidate-cloud-smoke',seed:610159902,flip:r.flip,level:'xhard',budget:9000,minNodes:60000,aiHashes:{A:c.candidate.fileSha256,B:c.baseline.fileSha256}},record={schema:1,experimentId:e.id,seed:e.seed,flip:r.flip,result:r};validateGame(record,e);validateJournal(path.join(dir,`game-${r.seed}-${r.flip?1:0}.jsonl`),record);assert.equal(new Set(r.decisions.filter(d=>d.aiIdentity).map(d=>d.aiIdentity.pid)).size,2);}
console.log(JSON.stringify({validatedGames:2,formalGames:0,retentionDays:Number(process.env.GITHUB_RETENTION_DAYS),unresolved:p.results.filter(r=>r.reason==='cap').length,sourceCommit:c.publishedInputCommit}));
