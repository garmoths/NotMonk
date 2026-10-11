const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
const slice=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));

async function boot(mode='normal') {
  const elements=new Map(),warnings=[],writes=[];
  const element=()=>({style:{},classList:{contains:()=>false},append(){},setAttribute(){},before(child){elements.set('#'+child.id,child);},replaceChildren(child){this.error=child;}});
  for(const selector of ['.workspace','#modules-grid'])elements.set(selector,element());
  let rendered=false;
  const ctx=vm.createContext({console:{error:(...args)=>warnings.push(args)},crypto:require('node:crypto').webcrypto,
    setInterval(){},setTimeout(){},clearTimeout(){},queueMicrotask,structuredClone,
    document:{getElementById:()=>element(),createElement:element,addEventListener(){}},
    localStorage:{getItem:()=>null,setItem(){}},
    $:selector=>elements.get(selector),collapsedNoteIds:new Set(),
    state:{topics:[],categories:[],theme:'dark'},starterTopics:[],ROADMAP_VERSION:17,RECOVERY_SNAPSHOT_ID:'test',NOTMONK_RECOVERY_SNAPSHOT:[],
    isTopicDeleted:()=>false,isCategoryDeleted:()=>false,reconcileTopicDuplicates(){},normalizeStatus:s=>s,
    render(){},showToast(){},openForm(){},displayAreaName:s=>s,renderStats(){},checkNotionStatusBackground(){},syncUnmappedCategoriesToNotion(){},
    bindEvents(){},bindCategoryEvents(){},bindNotionEvents(){},bindEnhancements(){},bindListEnhancements(){},bindTopicPickerEvents(){},applyTheme(){},
    PageRecovery:{init(){}},RoadmapBoard:{async init(){}},
    applyPageRoute:async()=>{rendered=true;},addEventListener(){}});
  ctx.window=ctx;
  for(const path of ['roadmap.js','curriculum-areas.js','foundations-outline.js','foundations-model.js','note-sync-model.js','study-list-model.js','study-list.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx);
  const original=[{id:'old',category:'Test area A',title:'Personal page',notes:'<p>Keep this note.</p>',status:'review',today:true},{id:'later',category:'Test area B',title:'Later page',notes:'Later note',status:'done'}];
  const stored={topics:structuredClone(original),categories:['Test area A','Test area B'],curriculumSetupVersion:1,foundationsOutlineVersion:1};
  if(mode==='curriculum')delete stored.curriculumSetupVersion;
  if(mode==='outline')delete stored.foundationsOutlineVersion;
  ctx.DEFAULT_CATEGORIES=[...ctx.NOTMONK_CATEGORIES];
  const runtime={};
  const fail=callback=>{runtime.lastError={message:'QUOTA_BYTES quota exceeded'};try{callback();}finally{delete runtime.lastError;}};
  ctx.chrome={runtime,storage:{onChanged:{addListener(){}},local:{
    get(keys,callback){queueMicrotask(()=>{
      if(mode==='read')return fail(callback);
      const result={};for(const key of Array.isArray(keys)?keys:[keys])if(key in stored)result[key]=structuredClone(stored[key]);callback(result);
    });},
    set(value,callback){writes.push(value);queueMicrotask(()=>{
      if(mode==='quota'||mode==='curriculum'&&'curriculumSetupVersion' in value||mode==='outline'&&'foundationsOutlineVersion' in value||mode==='study'&&'studyItems' in value)return fail(callback);
      Object.assign(stored,structuredClone(value));callback();
    });}
  }}};
  vm.runInContext(slice('const storageGet =','function mergeCurriculumNotes'),ctx);
  vm.runInContext(slice('function topicSnapshotFingerprint','async function archiveCurrentSafetySnapshot'),ctx);
  vm.runInContext(slice('async function init()','// ── Events'),ctx);
  let failure;
  try{await vm.runInContext('init()',ctx);}catch(error){failure=error;vm.runInContext('showStartupFailure',ctx)(error);}
  const studyCount=vm.runInContext('StudyList.count()',ctx);
  return {stored,original,writes,rendered,warnings,failure,elements,state:ctx.state,studyCount};
}

for(const mode of ['quota','study'])test(`${mode} startup write failure still opens existing notes and study selections`,async()=>{
  const result=await boot(mode);
  assert.equal(result.failure,undefined);assert.equal(result.rendered,true);assert.equal(result.studyCount,2);
  for(const old of result.original){
    for(const pages of [result.stored.topics,result.state.topics]){
      const next=pages.find(p=>p.id===old.id);assert.equal(next.notes,old.notes);assert.equal(next.status,old.status);
    }
  }
  if(mode==='curriculum')assert.equal(result.stored.curriculumSetupVersion,undefined);
  if(mode==='outline')assert.equal(result.stored.foundationsOutlineVersion,undefined);
  assert.ok(result.elements.has('#startup-warning'));
});
test('failed initial read does not seed or overwrite storage and displays an error',async()=>{
  const result=await boot('read');assert.ok(result.failure);assert.equal(result.writes.length,0);assert.equal(result.rendered,false);
  assert.ok(result.elements.get('#modules-grid').error);
});
test('healthy Chrome startup opens notes without warning or empty recovery writes',async()=>{
  const result=await boot();assert.equal(result.failure,undefined);assert.equal(result.rendered,true);assert.equal(result.studyCount,2);
  assert.equal(result.elements.has('#startup-warning'),false);assert.ok(!result.writes.some(value=>'recoveryApplied' in value));
});
