const{test}=require('node:test');const assert=require('node:assert/strict');const M=require('../page-recovery-model.js');
test('missing pages use newest backup and exclude existing or explicitly deleted pages',()=>{
  const current=[{id:'existing',title:'Renamed',category:'C',notes:'Latest'}];
  const backups=[{createdAt:2,topics:[{id:'existing',title:'Old',category:'C',notes:'Old'},{id:'missing',title:'Loops',category:'C',notes:'Newer'},{id:'deleted',title:'Deleted',category:'C'}]},{createdAt:1,topics:[{id:'missing',title:'Loops',category:'C',notes:'Older'}]}];
  const found=M.missing(backups,current,p=>p.id==='deleted');assert.equal(found.length,1);assert.equal(found[0].notes,'Newer');
});
test('restoring selected pages preserves existing content and parent/child relationships',()=>{
  const current=[{id:'root',title:'C',category:'C',notes:'Current'}];
  const selected=[{id:'root',title:'C',category:'C',notes:'Outdated'},{id:'child',title:'Loops',category:'C',notes:'Backup',parentTopicId:'root'},{id:'nested',title:'Example',category:'C',notes:'Backup',parentTopicId:'child'}];
  const result=M.restore(current,selected,()=> 'new');assert.equal(result.added,2);assert.equal(result.pages[0].notes,'Current');assert.equal(result.pages[1].parentTopicId,'root');assert.equal(result.pages[2].parentTopicId,'child');
  assert.equal(result.pages[1]._syncPending,false);assert.equal(current.length,1);
  assert.equal(M.restore(result.pages,selected,()=> 'new').added,0);
});
test('orphan children restore as root pages rather than disappearing',()=>{
  const result=M.restore([],[{id:'c',title:'Child',category:'C',parentTopicId:'missing'}],()=> 'new');assert.equal(result.pages[0].parentTopicId,null);
});
