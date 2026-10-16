'use strict';
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function pack(dir){
  const entries=[];
  function walk(at){for(const e of fs.readdirSync(at,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(at,e.name);assert(!e.isSymbolicLink(),'No symlinks in evidence');if(e.isDirectory())walk(p);else if(e.isFile()){const b=fs.readFileSync(p);entries.push({path:path.relative(dir,p).split(path.sep).join('/'),sha256:hash(b),bytes:b.length,data:b.toString('base64')});}}}
  walk(dir);return z.gzipSync(Buffer.from(JSON.stringify({schema:1,entries})),{level:9});
}
function lines(bytes,id){assert(/^[a-zA-Z0-9_-]+$/.test(id));const encoded=bytes.toString('base64'),parts=encoded.match(/.{1,4096}/g)||[];return[`CHUHAN_TRACE_V1 BEGIN ${JSON.stringify({id,sha256:hash(bytes),bytes:bytes.length,chunks:parts.length})}`,...parts.map((p,i)=>`CHUHAN_TRACE_V1 DATA ${id} ${i} ${p}`),`CHUHAN_TRACE_V1 END ${id} ${hash(bytes)}`];}
function unpack(log,id,out){
  const all=log.split('\n').map(s=>s.slice(s.indexOf('CHUHAN_TRACE_V1 '))).filter(s=>s.startsWith('CHUHAN_TRACE_V1 '));
  const heads=all.filter(s=>s.startsWith('CHUHAN_TRACE_V1 BEGIN ')).map(s=>JSON.parse(s.slice(22))).filter(x=>x.id===id);assert.equal(heads.length,1,'Missing/duplicate archive header');const h=heads[0],chunks=new Map();
  for(const line of all){const m=line.match(/^CHUHAN_TRACE_V1 DATA (\S+) (\d+) ([A-Za-z0-9+/=]+)$/);if(m&&m[1]===id){assert(!chunks.has(+m[2]),'Duplicate chunk');chunks.set(+m[2],m[3]);}}
  assert.equal(chunks.size,h.chunks);const text=Array.from({length:h.chunks},(_,i)=>{assert(chunks.has(i),'Missing chunk');return chunks.get(i);}).join(''),bytes=Buffer.from(text,'base64');
  assert.equal(bytes.length,h.bytes);assert.equal(hash(bytes),h.sha256);assert(all.includes(`CHUHAN_TRACE_V1 END ${id} ${h.sha256}`));
  const payload=JSON.parse(z.gunzipSync(bytes,{maxOutputLength:512*1024*1024}));assert.equal(payload.schema,1);const seen=new Set();
  for(const e of payload.entries){assert(e.path&&!path.isAbsolute(e.path)&&!e.path.split(/[\\/]/).includes('..'));assert(!seen.has(e.path));seen.add(e.path);const b=Buffer.from(e.data,'base64');assert.equal(b.length,e.bytes);assert.equal(hash(b),e.sha256);const target=path.join(out,e.path);assert(!fs.existsSync(target),'Never overwrite preserved evidence');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b);}
  return{id,sha256:h.sha256,files:payload.entries.length,bytes:bytes.length};
}
module.exports={pack,lines,unpack};
if(require.main===module){try{const [mode,a,b,c]=process.argv.slice(2);if(mode==='encode'){assert(Number(process.env.GITHUB_RETENTION_DAYS||0)>=7,'Logs must retain at least 7 days');console.log(lines(pack(a),b).join('\n'));}else if(mode==='decode')console.log(JSON.stringify(unpack(fs.readFileSync(a,'utf8'),b,c)));else throw Error('encode DIR ID | decode LOG ID DEST');}catch(e){console.error(e);process.exitCode=1;}}
