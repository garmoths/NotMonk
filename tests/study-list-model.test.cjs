const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../study-list-model.js');
let counter=0;const id=()=>`id-${++counter}`;
test('legacy selections migrate once without touching note content or status',()=>{
  const pages=[{id:'a',title:'C',status:'todo',today:true,notes:'Private note'},{id:'b',title:'Pointer',status:'review',today:true},{id:'c',title:'Other',today:false}];
  const before=JSON.stringify(pages),d=M.migrate(null,pages,id);
  assert.equal(d.items.length,2);assert.equal(d.items[0].status,'working');assert.equal(d.items[1].status,'review');
  assert.equal(JSON.stringify(pages),before);
  d.items[0].archived=true;
  assert.equal(M.migrate(d,pages,id).items.length,2);
  assert.equal(M.contains(M.migrate(d,pages,id),'a'),false);
});
test('page selection is idempotent and restoring a selection preserves its progress',()=>{
  const d=M.normalize(),p={id:'a',title:'C'};
  const first=M.addPage(d,p,'review',id);M.addPage(d,p,'working',id);
  assert.equal(d.items.length,1);assert.equal(first.status,'review');
  first.archived=true;M.addPage(d,p,'working',id);
  assert.equal(first.archived,false);assert.equal(first.status,'review');
});
test('custom work can link a page without losing its own title or becoming a page selection',()=>{
  const d=M.normalize({items:[{id:'x',source:'custom',title:'Solve pointer questions',pageId:'a',status:'working'}]});
  const list=M.active(d,[{id:'a',title:'Pointers',category:'C'}]);
  assert.equal(list[0].title,'Solve pointer questions');assert.equal(list[0].category,'C');assert.equal(M.contains(d,'a'),false);
  M.addPage(d,{id:'a',title:'Pointers'},'working',id);
  assert.equal(d.items.length,2);assert.equal(M.contains(d,'a'),true);
});
test('page titles follow renames; missing pages leave study progress recoverable',()=>{
  const d=M.normalize({items:[{id:'x',pageId:'a',title:'Old title',status:'done'}]});
  assert.equal(M.active(d,[{id:'a',title:'Renamed',category:'C',status:'done'}])[0].title,'Renamed');
  const orphan=M.active(d,[])[0];assert.equal(orphan.title,'Old title');assert.equal(orphan.status,'done');assert.equal(orphan.missingPage,true);
});
test('archiving never destroys a note or item, and archived results stay out of search',()=>{
  const d=M.normalize({items:[{id:'a',title:'One',archived:true},{id:'b',title:'İşaretçi',notes:'Bellek',status:'review'}]});
  assert.equal(M.active(d,[]).length,1);assert.equal(d.items.length,2);
  assert.equal(M.active(d,[],'işaret').length,1);assert.equal(M.active(d,[],'bellek').length,1);
});
test('malformed data and old learning/todo statuses normalize safely',()=>{
  const d=M.normalize({items:[null,{id:'a',title:null,status:'learning'},{id:'a',title:'duplicate'},{id:'b',status:'todo'}]});
  assert.equal(d.items.length,2);assert.equal(d.items[0].status,'working');assert.equal(d.items[1].status,'working');
  assert.equal(M.normalize(null).items.length,0);
});

test('every started/reviewed/completed note appears without a star or separate membership flag',()=>{
  const pages=[{id:'a',title:'Untouched',status:'todo'},{id:'b',title:'Working',status:'in_progress'},{id:'c',title:'Review',status:'review'},{id:'d',title:'Finished',status:'done'}];
  const result=M.active(M.normalize(),pages);
  assert.deepEqual(result.map(i=>[i.pageId,i.status]),[['b','working'],['c','review'],['d','done']]);
});
test('the note overrides stale study status and an old archive flag without changing note text',()=>{
  const page={id:'a',title:'C lesson',status:'done',notes:'Keep this body'};
  const raw={version:1,items:[{id:'old',pageId:'a',source:'page',status:'working',archived:true,notes:'Keep this work note'}]};
  const before=JSON.stringify(page),projected=M.reconcile(raw,[page]);
  assert.equal(projected.items.length,1);assert.equal(projected.items[0].status,'done');assert.equal(projected.items[0].archived,false);assert.equal(projected.items[0].notes,'Keep this work note');assert.equal(JSON.stringify(page),before);
  page.status='review';assert.equal(M.active(projected,[page])[0].status,'review');
  page.status='todo';assert.equal(M.active(projected,[page]).length,0);assert.equal(M.reconcile(projected,[page]).items.length,1);
});
test('a custom task linked to the same note retains independent progress',()=>{
  const raw={items:[{id:'custom',source:'custom',pageId:'a',title:'Solve 10 questions',status:'review'}]};
  const projected=M.active(raw,[{id:'a',title:'Pointers',status:'done'}]);
  assert.deepEqual(projected.map(i=>[i.source,i.status]),[['custom','review'],['page','done']]);
});
