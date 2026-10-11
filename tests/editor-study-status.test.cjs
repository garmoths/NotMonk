const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
const slice=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
function node(){return {value:'',textContent:'',children:[],classList:{contains:()=>false},setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;}};}
async function editor(){
 const elements=new Map();for(const key of ['#edit-id','#title','#category','#notes','#resource','#parent-topic','#save-hint','#editor-status-buttons'])elements.set(key,node());
 for(const [key,value] of [['#edit-id','p'],['#title','Lesson'],['#category','Area']])elements.get(key).value=value;
 const writes=[],stored={topics:[{id:'p',title:'Lesson',category:'Area',status:'todo',notes:'<p>Preserve me.</p>'}],studyItems:{version:2,items:[]}};
 let body='<p>Preserve me.</p>',gate=null,fail=false;
 const ctx=vm.createContext({console,structuredClone,Date,crypto:require('node:crypto').webcrypto,document:{getElementById:()=>node(),createElement:node},navigator:{},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},state:{topics:structuredClone(stored.topics)},dialog:{open:true,dataset:{status:'todo',statusChanged:'false'}},editorState:{dirty:false},editorRevision:0,$:s=>elements.get(s),PageAppearance:{get:()=>({})},RichEditor:{getHTML:()=>body},render(){},normalizeStatus:s=>s,STATUS:{todo:'Yapılacak',in_progress:'Yapılıyor',done:'Yapıldı',review:'Tekrar'},STATUS_KEYS:['todo','in_progress','done','review']});
 for(const file of ['study-list-model.js','study-list.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 const get=async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in stored).map(k=>[k,structuredClone(stored[k])]));
 const set=async value=>{const copy=structuredClone(value);writes.push(copy);if(gate)await gate;if(fail)throw Error('Storage full');Object.assign(stored,copy);};
 ctx.adapter={getPages:()=>ctx.state.topics,get,set,onChange(){},notify(){},areaName:s=>s,openPage(){}};
 await vm.runInContext('StudyList.init(adapter)',ctx);
 writes.length=0;
 ctx.save=ids=>vm.runInContext('StudyList.savePages({topics:state.topics}, changed)',Object.assign(ctx,{changed:ids}));
 vm.runInContext('let autoSaveTimer,saveHintTimer;let editorSaveQueue=Promise.resolve();',ctx);
 vm.runInContext(slice('function markDirty()','async function deleteTopicById'),ctx);
 vm.runInContext('renderEditorStatus()',ctx);
 const click=status=>elements.get('#editor-status-buttons').children[['todo','in_progress','done','review'].indexOf(status)].onclick();
 const finish=()=>vm.runInContext('editorSaveQueue',ctx);
 return {ctx,stored,writes,click,finish,elements,setBody:v=>{body=v;},hold:promise=>{gate=promise;},fail:value=>{fail=value;}};
}
test('clicking Yapıldı immediately persists a matching Bitirdim entry with the note in one write',async()=>{
 const e=await editor();e.click('done');await e.finish();
 assert.equal(e.writes.length,1);assert.equal(e.stored.topics[0].status,'done');assert.equal(e.stored.studyItems.items[0].status,'done');assert.equal(e.stored.studyItems.items[0].pageId,'p');assert.equal(e.stored.topics[0].notes,'<p>Preserve me.</p>');assert.equal(e.ctx.editorState.dirty,false);
});
test('rapid note status changes serialize without restoring the previous status or duplicating the card',async()=>{
 const e=await editor();let release;e.hold(new Promise(resolve=>{release=resolve;}));e.click('in_progress');await new Promise(resolve=>setImmediate(resolve));
 e.click('done');e.hold(null);release();await e.finish();
 assert.equal(e.stored.topics[0].status,'done');assert.equal(e.stored.studyItems.items.length,1);assert.equal(e.stored.studyItems.items[0].status,'done');assert.equal(e.ctx.dialog.dataset.status,'done');
});
test('switching to review and back to todo moves/hides the same study entry and preserves a pending body edit',async()=>{
 const e=await editor();e.setBody('<p>New paragraph.</p>');e.click('review');await e.finish();assert.equal(e.stored.studyItems.items[0].status,'review');
 e.click('todo');await e.finish();assert.equal(e.stored.topics[0].notes,'<p>New paragraph.</p>');assert.equal(e.stored.studyItems.items[0].archived,true);assert.equal(e.stored.studyItems.items.length,1);
});
test('a failed combined write leaves persisted page/list unchanged and the editor ready to retry',async()=>{
 const e=await editor();e.fail(true);e.click('done');await assert.rejects(e.finish(),/Storage full/);
 assert.equal(e.stored.topics[0].status,'todo');assert.equal(e.stored.studyItems.items.length,0);assert.equal(e.ctx.editorState.dirty,true);
 e.fail(false);e.click('done');await e.finish();assert.equal(e.stored.topics[0].status,'done');assert.equal(e.stored.studyItems.items[0].status,'done');
});
