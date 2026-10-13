'use strict';
const assert=require('node:assert/strict');
function replay(result){
 global.XQ=require('../src/rules');const BF=global.BF=require('../src/bingfa');const g=new BF.Game();
 assert(Array.isArray(result.decisions)&&result.decisions.length>0,'Missing replay');
 for(const d of result.decisions){assert.equal(d.side,g.turn,'Wrong mover');assert(d.actions?.length,'Empty decision');for(const a of d.actions)assert(g.apply(a),'Illegal action in replay');}
 assert.deepEqual(BF.cloneState(g.S),result.finalState,'Replay final state differs');
 assert.equal(g.result?.winner??null,result.winner);return true;
}
module.exports={replay};if(require.main===module){const x=JSON.parse(require('node:fs').readFileSync(process.argv[2]));for(const r of x.payload.results)replay(r);console.log('Pair replay verified');}
