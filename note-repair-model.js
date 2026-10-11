/* Build a reversible content repair from identified, pre-corruption snapshots. */
(function(root){
  'use strict';
  const separator=/<(?:h2|h3)\b[^>]*>\s*(?:Notion[’']dan gelen notlar|NotMonk[’']tan gelen notlar|Kurtarılan önceki notlar|Kurtarma öncesindeki güncel sürüm|Güncellenen ders notu)\s*<\/(?:h2|h3)>/gi;
  const cleanId=value=>String(value||'').replaceAll('-','').toLowerCase();
  function variants(html){return String(html||'').split(separator).map(s=>s.replace(/(?:<hr\s*\/?\s*>\s*)+$/i,'').trim()).filter(Boolean);}
  function dedupeRuns(blocks,key=String){
    const result=[...blocks];
    for(let i=0;i<result.length;i++){
      for(let size=1;size<=Math.floor((result.length-i)/2);size++){
        if(Array.from({length:size},(_,j)=>key(result[i+j])===key(result[i+size+j])).every(Boolean)){
          result.splice(i+size,size);i--;break;
        }
      }
    }
    return result;
  }
  function plan(current,backups,cleanVersion=html=>variants(html).sort((a,b)=>b.length-a.length)[0]||'',{includeProtected=false}={}){
    const repairs=[],unmatched=[];
    const snapshots=(backups||[]).slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    for(const page of current){
      if(variants(page.notes).length<2&&!(includeProtected&&page._contentRepairProtected))continue;
      let reference,snapshot;
      for(const backup of snapshots){
        const entries=backup.topics||[];
        const sameId=entries.filter(p=>p.id===page.id);
        const sameRemote=page.notionPageId?entries.filter(p=>p.notionPageId&&cleanId(p.notionPageId)===cleanId(page.notionPageId)):[];
        const matches=sameId.length?sameId:sameRemote;
        if(matches.length===1&&String(matches[0].notes||'').trim()){reference=matches[0];snapshot=backup;break;}
      }
      if(!reference){unmatched.push(page.id);continue;}
      const notes=cleanVersion(reference.notes);
      if(!notes.trim()){unmatched.push(page.id);continue;}
      repairs.push({id:page.id,title:page.title,expectedNotes:page.notes,notes,snapshotAt:snapshot.createdAt});
    }
    return {repairs,unmatched};
  }
  function apply(current,plan,now=Date.now()){
    const byId=new Map(plan.repairs.map(r=>[r.id,r]));
    for(const r of plan.repairs){const page=current.find(p=>p.id===r.id);if(!page||page.notes!==r.expectedNotes)throw Error('İçerik incelemeden sonra değişti: '+r.title);}
    return current.map(page=>{
      const r=byId.get(page.id);if(!r)return page;
      const repaired={...page,notes:r.notes,updatedAt:now,_syncPending:false,_contentRepairProtected:true,contentRestoredFromSnapshot:r.snapshotAt};
      delete repaired._lastSyncedNotes;delete repaired._noteSyncConflict;return repaired;
    });
  }
  const api={variants,dedupeRuns,plan,apply};root.NoteRepairModel=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
