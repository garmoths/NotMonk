const fixtureMarker='notmonk-startup-fixture',output=document.querySelector('#result');
function seed(failure){
 if(!['localhost','127.0.0.1'].includes(location.hostname)||(localStorage.getItem('topics')!==null&&localStorage.getItem(fixtureMarker)!=='owned')){output.textContent='Durduruldu: test alanı boş değil.';return;}
 const pages=[{id:'startup-personal',category:'Test area A',title:'Eski kişisel sayfam',notes:'<p>Korunacak sentetik not.</p>',status:'review'},{id:failure?'nm-foundation-1-1':'startup-later',category:'Test area B',title:'Sonraki aşamadaki sayfam',notes:'<p>Sonraki aşama korunmalı.</p>',status:'done'}];
 const fields={topics:pages,categories:['Test area A'],curriculumSetupVersion:1,preferences:{roadmapVersion:17,activeTab:'today',selectedCategory:null},moduleOrder:['Test area A','Test area B'],studyItems:{version:1,items:[]},deletedTopicKeys:[],deletedCategoryKeys:[],areaAliases:{},collapsedNoteIds:[]};
 for(const key of ['foundationsOutlineVersion','foundationsOutlineBackup','notmonk_preferences'])localStorage.removeItem(key);
 for(const [k,v] of Object.entries(fields))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem(fixtureMarker,'owned');localStorage.setItem('startupFixtureOriginal',JSON.stringify(pages));output.textContent=failure?'Hazır: başlık kimliği çakışması.':'Hazır: eksik alan listesi ve boş çalışma görünümü.';
}
document.querySelector('#stale').onclick=()=>seed(false);document.querySelector('#failure').onclick=()=>seed(true);
document.querySelector('#verify').onclick=()=>{
 const before=JSON.parse(localStorage.getItem('startupFixtureOriginal')||'[]'),pages=JSON.parse(localStorage.getItem('topics')||'[]');
 output.textContent=before.length===2&&before.every(old=>{const p=pages.find(p=>p.id===old.id);return p&&p.notes===old.notes&&p.status===old.status&&p.category===old.category;})?'PASS: mevcut notlar, durumları ve sonraki aşama korundu.':'FAIL';
};
