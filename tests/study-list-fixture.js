// Synthetic content only; never loaded by the application.
document.querySelector('#seed').onclick=()=>{
  if(!['localhost','127.0.0.1'].includes(location.hostname)||localStorage.getItem('topics')!==null){document.querySelector('#result').textContent='Durduruldu: test alanı boş değil.';return;}
  const c='Test area E';
  const pages=[
    {id:'page-c',title:'Test parent page',category:c,status:'todo',today:true,notes:'<p>Sentetik C notu; korunmalı.</p>',updatedAt:Date.now()},
    {id:'page-child',title:'Döngüler',category:c,parentTopicId:'page-c',status:'todo',today:false,notes:'<p>Sentetik alt sayfa.</p>',updatedAt:Date.now()},
    {id:'page-pointer',title:'Pointer temelleri',category:c,status:'review',today:true,notes:'<p>Sentetik adres notu.</p>',updatedAt:Date.now()},
    {id:'page-java',title:'Java sınıfları',category:'Test area D',status:'done',today:true,notes:'<p>Sentetik Java notu.</p>',updatedAt:Date.now()}
  ];
  localStorage.setItem('fixtureOriginalPages',JSON.stringify(pages));
  localStorage.setItem('safetyBackups',JSON.stringify([{createdAt:Date.now()-1000,topics:[...pages,{id:'recover-example',title:'Kurtarılacak örnek sayfa',category:c,parentTopicId:'page-c',status:'todo',notes:'<p>Sentetik yedek içerik.</p>'}]}]));
  localStorage.setItem('topics',JSON.stringify(pages));localStorage.setItem('categories',JSON.stringify([c,'Test area D']));
  localStorage.setItem('preferences',JSON.stringify({roadmapVersion:15,activeTab:'today',areaViewMode:'board'}));
  document.querySelector('#result').textContent='Hazır: 4 sayfa, 1 alt sayfa. Açılışta hiçbir sayfa silinmemeli.';
};

document.querySelector('#verify').onclick=()=>{
  const before=JSON.parse(localStorage.getItem('fixtureOriginalPages')||'null')||[
    {id:'page-c',notes:'<p>Sentetik C notu; korunmalı.</p>',status:'todo'},
    {id:'page-child',notes:'<p>Sentetik alt sayfa.</p>',status:'todo',parentTopicId:'page-c'},
    {id:'page-pointer',notes:'<p>Sentetik adres notu.</p>',status:'review'},
    {id:'page-java',notes:'<p>Sentetik Java notu.</p>',status:'done'}
  ],after=JSON.parse(localStorage.getItem('topics')||'[]');
  const pass=before.length===4&&before.every(original=>{const current=after.find(p=>p.id===original.id);return current&&current.notes===original.notes&&current.status===original.status&&current.parentTopicId===original.parentTopicId;});
  document.querySelector('#result').textContent=pass?'PASS: 4 sayfanın içeriği, durumu ve alt sayfa ilişkisi korunuyor.':'FAIL: Sayfa verisinde beklenmeyen değişiklik var.';
};
