// Isolated localhost test only; contains no personal data.
const marker='notmonk-single-status-fixture';
document.querySelector('#seed').onclick=()=>{
 if(!['localhost','127.0.0.1'].includes(location.hostname)||localStorage.getItem('topics')!==null){document.querySelector('#result').textContent='Durduruldu: bu test alanı boş değil.';return;}
 const pages=[{id:'status-parent',title:'Durum testi',category:'Test area A',status:'todo',notes:'<p>Bu sentetik içerik korunmalı.</p>'},{id:'status-child',parentTopicId:'status-parent',title:'Alt sayfa testi',category:'Test area A',status:'todo',notes:'<p>Sentetik alt sayfa.</p>'}];
 const data={topics:pages,categories:['Test area A','Test area B'],curriculumSetupVersion:1,foundationsOutlineVersion:1,preferences:{roadmapVersion:17,activeTab:'modules'},recoveryApplied:'local-recovery',studyItems:{version:1,items:[{id:'custom-task',source:'custom',title:'Serbest çalışma',status:'review'}]},obsidianConfig:{autoSync:false}};
 for(const [k,v] of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));localStorage.setItem(marker,'owned');document.querySelector('#result').textContent='Hazır: 2 sentetik not ve 1 serbest madde.';
};
document.querySelector('#verify').onclick=()=>{
 if(localStorage.getItem(marker)!=='owned')return;
 const pages=JSON.parse(localStorage.getItem('topics')||'[]'),study=JSON.parse(localStorage.getItem('studyItems')||'{}'),parent=pages.find(p=>p.id==='status-parent'),item=study.items?.find(i=>i.pageId==='status-parent'),custom=study.items?.find(i=>i.id==='custom-task');
 const expected={in_progress:'working',done:'done',review:'review'};
 const okay=parent?.notes==='<p>Bu sentetik içerik korunmalı.</p>'&&pages.find(p=>p.id==='status-child')?.notes==='<p>Sentetik alt sayfa.</p>'&&custom?.status==='review'&&((parent.status==='todo'&&(!item||item.archived))||(expected[parent.status]===item?.status&&!item.archived));
 document.querySelector('#result').textContent=okay?`PASS: not ${parent.status}; liste ${item?.status||'boş'}; içerikler ve serbest madde korundu.`:'FAIL';
};
