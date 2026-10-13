'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
function verify(){const manifest=JSON.parse(fs.readFileSync(path.join(root,'config/manifest.json')));for(const [file,digest]of Object.entries(manifest.files)){if(hash(fs.readFileSync(path.join(root,file)))!==digest)throw Error('Frozen file changed: '+file);}return manifest;}
module.exports={verify,hash,root};if(require.main===module){const m=verify();console.log('Verified '+Object.keys(m.files).length+' frozen files');}
