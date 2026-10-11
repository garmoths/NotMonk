/* Only missing pages are recoverable here; existing notes are never overwritten. */
(function(root){
  'use strict';
  const key=p=>`${String(p.category||'').trim().toLocaleLowerCase('tr')}\u0000${String(p.title||'').trim().toLocaleLowerCase('tr')}`;
  function missing(backups,current,isDeleted=()=>false){
    const ids=new Set(current.map(p=>p.id)),names=new Set(current.map(key)),result=[];
    for(const backup of Array.isArray(backups)?backups:[])for(const p of Array.isArray(backup?.topics)?backup.topics:[]){
      if(!p?.title||!p.category||isDeleted(p)||ids.has(p.id)||names.has(key(p)))continue;
      result.push({...p,backupAt:backup.createdAt});ids.add(p.id);names.add(key(p));
    }
    return result;
  }
  function restore(current,selected,id){
    const next=[...current],added=[],mapping=new Map(current.map(p=>[p.id,p.id]));
    for(const p of selected){
      const existing=next.find(t=>t.id===p.id||key(t)===key(p));
      if(existing){mapping.set(p.id,existing.id);continue;}
      const {backupAt,...page}=p;
      const recovered={...page,id:typeof p.id==='string'?p.id:id(),_syncPending:false};
      next.push(recovered);added.push(recovered);mapping.set(p.id,recovered.id);
    }
    for(const p of added)p.parentTopicId=mapping.get(p.parentTopicId)||null;
    return {pages:next,added:added.length};
  }
  const api={missing,restore};root.PageRecoveryModel=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
