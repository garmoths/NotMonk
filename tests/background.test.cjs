const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function background(activeId=42,stored={topics:[{id:'p',notes:'Saved note'}],categories:['Area']}){
 const listeners={},calls=[],exports=[];let fail=false,hold;
 const event=name=>({addListener:fn=>{listeners[name]=fn;}});
 const chrome={runtime:{getURL:path=>'chrome-extension://notmonk/'+path,onInstalled:event('installed'),onStartup:event('startup'),onMessage:event('message')},storage:{onChanged:event('storage'),local:{get:async()=>structuredClone(stored),set:async value=>Object.assign(stored,structuredClone(value)),remove:async keys=>keys.forEach(key=>delete stored[key])}},omnibox:{setDefaultSuggestion:()=>{},onInputStarted:event('started'),onInputChanged:event('changed'),onInputEntered:event('entered')},alarms:{create:(name,options)=>calls.push({action:'alarm',name,...options}),clear:()=>{},onAlarm:event('alarm')},commands:{onCommand:event('command')},tabs:{query:(_q,cb)=>cb(activeId?[{id:activeId}]:[]),update:(id,options)=>calls.push({action:'update',id,...options}),create:options=>calls.push({action:'create',...options})}};
 const ctx=vm.createContext({chrome,console,Date,ObsidianClient:{keys:['topics','categories','studyItems','moduleOrder','categoryMetadata'],sync:async data=>{exports.push(structuredClone(data));if(hold)await hold;if(fail)throw Error('offline');return {topics:data.topics.length,vault:'/Vault',conflicts:0};}},importScripts(){}});
 vm.runInContext(fs.readFileSync('background.js','utf8'),ctx);
 return {listeners,calls,exports,stored,sync:()=>vm.runInContext('exportToObsidian()',ctx),setFailure:value=>{fail=value;},setHold:value=>{hold=value;}};
}
test('nm opens the explicit areas route in the current tab',()=>{
 const b=background();b.listeners.entered('  ','currentTab');assert.deepEqual(b.calls,[{action:'update',id:42,url:'chrome-extension://notmonk/index.html#/areas'}]);
});
test('nm respects new foreground/background dispositions and absent active tab',()=>{
 const b=background();b.listeners.entered('open','newBackgroundTab');b.listeners.entered('open','newForegroundTab');assert.deepEqual(b.calls,[{action:'create',url:'chrome-extension://notmonk/index.html#/areas',active:false},{action:'create',url:'chrome-extension://notmonk/index.html#/areas',active:true}]);
 const fallback=background(null);fallback.listeners.entered('','currentTab');assert.equal(fallback.calls[0].action,'create');
});
test('only the local Obsidian retry alarm and loopback permission remain',async()=>{
 const b=background();await b.listeners.startup();assert.equal(b.calls.length,1);assert.equal(b.calls[0].name,'obsidian-retry');
 const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));assert.deepEqual(manifest.host_permissions,['http://127.0.0.1:8771/*']);
 assert.ok(!fs.readFileSync('index.html','utf8').includes('src="notion.js"'));
 assert.ok(!fs.readFileSync('app.js','utf8').includes('NotionAPI'));
});
test('saved pages and study changes export; status writes do not trigger an export loop',async()=>{
 const b=background();await b.listeners.storage({topics:{newValue:b.stored.topics}},'local');assert.equal(b.exports.length,1);assert.equal(b.stored.obsidianStatus.state,'idle');
 await b.listeners.storage({obsidianStatus:{newValue:{state:'idle'}}},'local');assert.equal(b.exports.length,1);
 b.stored.studyItems={items:[{title:'Review pointers',status:'review'}]};await b.listeners.storage({studyItems:{}},'local');assert.equal(b.exports[1].studyItems.items.length,1);
});
test('a paused transfer remains paused; a manual export still works',async()=>{
 const b=background();b.stored.obsidianConfig={autoSync:false};await b.listeners.startup();assert.equal(b.exports.length,0);
 const result=await new Promise(resolve=>b.listeners.message({type:'obsidian-sync'},null,resolve));assert.equal(result.ok,true);assert.equal(b.exports.length,1);
});
test('offline export retains notes and resumes on the retry alarm',async()=>{
 const b=background();b.setFailure(true);await b.sync();assert.equal(b.stored.obsidianStatus.state,'error');assert.equal(b.stored.topics[0].notes,'Saved note');
 b.setFailure(false);await b.listeners.alarm({name:'obsidian-retry'});assert.equal(b.stored.obsidianStatus.state,'idle');assert.equal(b.exports.length,2);
});
test('a save during export queues the latest snapshot after the in-flight write',async()=>{
 const b=background();let release;b.setHold(new Promise(resolve=>{release=resolve;}));const first=b.sync();await new Promise(resolve=>setImmediate(resolve));
 b.stored.topics[0].notes='Latest version';const next=b.listeners.storage({topics:{}},'local');b.setHold(null);release();await Promise.all([first,next]);
 assert.equal(b.exports.length,2);assert.equal(b.exports[0].topics[0].notes,'Saved note');assert.equal(b.exports[1].topics[0].notes,'Latest version');
});
