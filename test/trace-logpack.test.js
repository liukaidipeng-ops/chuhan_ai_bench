'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pack,lines,unpack}=require('../tools/trace-logpack');
test('timestamped log transport preserves full bytes and rejects truncation/duplicates',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'logpack-'));try{
    const src=path.join(dir,'src');fs.mkdirSync(src);const data=Buffer.from(Array.from({length:12000},(_,i)=>(i*17)%256));fs.writeFileSync(path.join(src,'trace.bin'),data);
    const rows=lines(pack(src),'test');const log=rows.map(x=>'2026-10-16T00:00:00Z '+x).join('\n');
    assert.equal(unpack(log,'test',path.join(dir,'out')).files,1);assert.deepEqual(fs.readFileSync(path.join(dir,'out/trace.bin')),data);
    assert.throws(()=>unpack(rows.slice(0,-1).join('\n'),'test',path.join(dir,'bad')));
    assert.throws(()=>unpack([...rows,rows[1]].join('\n'),'test',path.join(dir,'bad2')));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
