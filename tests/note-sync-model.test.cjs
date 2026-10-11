const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../note-sync-model.js');
test('format round trips never grow notes by concatenating document versions',()=>{
  let local='<p><strong>One lesson</strong></p>',base=local;
  for(let i=0;i<100;i++){
    const remote=i%2?'<p><strong>One lesson</strong></p>':'<p><b>One lesson</b></p>';
    const result=M.resolve(local,remote,base);assert.equal(result.conflict,false);local=result.notes;base=remote;
    assert.ok(local.length<50);assert.ok(!local.includes('gelen notlar'));
  }
});
test('independent edits stay separate and never silently overwrite the local version',()=>{
  assert.deepEqual(M.resolve('Local edit','Remote edit','Original'),{notes:'Local edit',pending:false,conflict:true});
  assert.deepEqual(M.resolve('Local edit','Remote edit'),{notes:'Local edit',pending:false,conflict:true});
});
test('remote-only and local-only edits use the common saved baseline',()=>{
  assert.deepEqual(M.resolve('Original','Remote edit','Original'),{notes:'Remote edit',pending:false,conflict:false});
  assert.deepEqual(M.resolve('Local edit','Original','Original'),{notes:'Local edit',pending:true,conflict:false});
});
test('restored content remains protected from the corrupted remote version including empty restored pages',()=>{
  for(const local of ['Restored note',''])assert.deepEqual(M.resolve(local,'Corrupted remote',undefined,{protectedContent:true}),{notes:local,pending:false,conflict:true});
});
