const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../note-repair-model.js');
test('restore identified versions by remote identity and preserve titles, hierarchy, status and unrelated pages',()=>{
 const current=[{id:'new-id',notionPageId:'aa-bb',title:'Lesson',notes:'old<hr><h2>Notion\'dan gelen notlar</h2>loop',parentTopicId:'root',status:'review'},{id:'other',notes:'my note'}];
 const backups=[{createdAt:100,topics:[{id:'old-id',notionPageId:'aabb',notes:'<p>Known original</p>'}]}];
 const plan=M.plan(current,backups),result=M.apply(current,plan,200);
 assert.equal(plan.repairs.length,1);assert.equal(result[0].notes,'<p>Known original</p>');assert.equal(result[0].parentTopicId,'root');assert.equal(result[0].status,'review');assert.equal(result[0].title,'Lesson');assert.equal(result[0]._contentRepairProtected,true);assert.equal(result[1],current[1]);assert.match(current[0].notes,/loop/);
});
test('ambiguous titles alone never authorize overwriting a note',()=>{
 const current=[{id:'a',title:'Lesson',notes:'a<h2>Notion\'dan gelen notlar</h2>b'}];
 const plan=M.plan(current,[{createdAt:1,topics:[{id:'b',title:'Lesson',notes:'wrong page'}]}]);assert.equal(plan.repairs.length,0);assert.deepEqual(plan.unmatched,['a']);
});
test('a concurrent edit aborts the whole repair before any content replacement',()=>{
 const original=[{id:'a',notes:'a<h2>Notion\'dan gelen notlar</h2>b'}],plan=M.plan(original,[{createdAt:1,topics:[{id:'a',notes:'original'}]}]);
 assert.throws(()=>M.apply([{id:'a',notes:'new user edit'}],plan),/İçerik incelemeden sonra değişti/);
});
test('only adjacent identical block sequences are removed; distinct code/examples stay',()=>{
 assert.deepEqual(M.dedupeRuns(['intro','question','intro','question','code A','code B']),['intro','question','code A','code B']);
 assert.deepEqual(M.dedupeRuns(['question','code','question']),['question','code','question']);
});
