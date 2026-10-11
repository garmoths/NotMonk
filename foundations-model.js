/* Add only the requested first-four-stage page outline; never write lesson bodies. */
(function(root){
  'use strict';
  const VERSION=1;
  const titleKey=value=>String(value||'').replace(/^\s*\d+(?:\.\d+)*[.·]?\s*/,'').normalize('NFKC').toLocaleLowerCase('tr').replace(/[’']/g,"'").replace(/\s+/g,' ').replace(/[?.]+$/,'').trim();
  const planId=number=>'nm-foundation-'+number.replaceAll('.','-');
  function plan(categories,outline){
    if(!Array.isArray(outline)||!outline.length)return [];
    if(!Array.isArray(categories)||categories.length<4)throw Error('İlk dört ana alan bulunamadı.');
    const pages=[],keys=new Set();
    for(const section of outline){
      const stage=Number(section.number.split('.')[0]);
      if(stage<1||stage>4)throw Error('İlk dört aşamanın dışında başlık var.');
      const category=categories[stage-1],children=section.children||[];
      const minutes=children.reduce((sum,p)=>sum+p.estimatedMinutes,0);
      pages.push({id:planId(section.number),outlineKey:'foundations:'+section.number,outlineNumber:section.number,title:section.number+' '+section.title,category,parentTopicId:null,notes:'',summary:'',resource:'',status:'todo',_syncPending:false,priority:children.every(p=>p.priority==='UYGULAMA')?'UYGULAMA':'TEMEL',estimatedMinutes:minutes,learningObjective:section.title+' — alt konuların uygulamalarını tamamlayıp sonuçlarını açıklayabilir.',prerequisiteIds:(section.prerequisiteNumbers||[]).map(planId)});
      for(const child of children)pages.push({id:planId(child.number),outlineKey:'foundations:'+child.number,outlineNumber:child.number,title:child.number+' '+child.title,category,parentTopicId:planId(section.number),notes:'',summary:'',resource:'',status:'todo',_syncPending:false,priority:child.priority,estimatedMinutes:child.estimatedMinutes,learningObjective:child.learningObjective,sourceTopics:child.sourceTopics,prerequisiteIds:(section.prerequisiteNumbers||[]).map(planId)});
    }
    for(const page of pages){
      if(keys.has(page.id))throw Error('Tekrarlanan başlık numarası: '+page.outlineNumber);
      keys.add(page.id);
      if(!page.estimatedMinutes||!['TEMEL','UYGULAMA','İLERİ'].includes(page.priority))throw Error('Başlık planı doğrulanamadı.');
    }
    return pages;
  }
  function migrate(saved,categories,outline,now=Date.now()){
    if(!Array.isArray(outline)||!outline.length)return null;
    if(saved.foundationsOutlineVersion===VERSION)return null;
    const original=Array.isArray(saved.topics)?saved.topics:[],firstFour=new Set(categories.slice(0,4));
    if((saved.categories||[]).length&&!categories.slice(0,4).every(c=>saved.categories.includes(c)))throw Error('Ana aşamalar eşleşmedi; başlık ekleme durduruldu.');
    const candidates=original.filter(p=>firstFour.has(p.category)),used=new Set(),mapping=new Map(),added=[],reused=[],output=[];
    const deleted=new Set(saved.deletedTopicKeys||[]),deletedAreas=new Set(saved.deletedCategoryKeys||[]);
    const allowed=p=>!deleted.has(p.id)&&!deleted.has(p.title.trim().toLowerCase())&&!deletedAreas.has(p.category.trim().toLowerCase());
    const planned=plan(categories,outline);
    for(const page of planned){
      if(!allowed(page)||page.parentTopicId&&!mapping.has(page.parentTopicId))continue;
      const parent=page.parentTopicId?mapping.get(page.parentTopicId):null;
      const matches=candidates.filter(p=>!used.has(p.id)&&allowed(p)&&p.category===page.category&&titleKey(p.title)===titleKey(page.title));
      const match=candidates.find(p=>!used.has(p.id)&&allowed(p)&&p.category===page.category&&(p.outlineKey===page.outlineKey||p.id===page.id))||matches.find(p=>(p.parentTopicId||null)===parent)||(matches.length===1?matches[0]:null);
      if(match){
        used.add(match.id);mapping.set(page.id,match.id);reused.push(match.id);
        output.push({...match,title:page.title,parentTopicId:parent,outlineKey:page.outlineKey,outlineNumber:page.outlineNumber,priority:page.priority,estimatedMinutes:page.estimatedMinutes,learningObjective:page.learningObjective,prerequisiteIds:page.prerequisiteIds});
      }else{
        if(original.some(p=>p.id===page.id))throw Error('Başlık kimliği başka bir sayfada kullanılıyor: '+page.id);
        const created={...page,parentTopicId:parent,updatedAt:now};added.push(created.id);mapping.set(page.id,created.id);output.push(created);
      }
    }
    for(const page of output)page.prerequisiteIds=page.prerequisiteIds.map(id=>mapping.get(id)||id);
    const replacement=new Map(output.filter(p=>used.has(p.id)).map(p=>[p.id,p]));
    const topics=original.map(p=>replacement.get(p.id)||p);
    topics.push(...output.filter(p=>!used.has(p.id)));
    const newRoots=output.filter(p=>added.includes(p.id)&&!p.parentTopicId).map(p=>p.id);
    return {topics,foundationsOutlineVersion:VERSION,collapsedNoteIds:[...new Set([...(saved.collapsedNoteIds||[]),...newRoots])],foundationsOutlineBackup:saved.foundationsOutlineBackup||{createdAt:now,topics:original,collapsedNoteIds:saved.collapsedNoteIds||[],addedIds:added,reusedIds:reused}};
  }
  const api={VERSION,titleKey,plan,migrate};root.FoundationsModel=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
