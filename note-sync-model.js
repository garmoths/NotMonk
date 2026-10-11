/* Keep concurrent document versions separate; never concatenate their bodies. */
(function(root){
  'use strict';
  const body=value=>String(value||'').trim();
  function resolve(localNotes,remoteNotes,baseNotes,{protectedContent=false}={}) {
    const local=body(localNotes),remote=body(remoteNotes);
    if(local===remote)return {notes:localNotes||'',pending:false,conflict:false};
    if(protectedContent)return {notes:localNotes||'',pending:false,conflict:true};
    if(baseNotes!==undefined&&baseNotes!==null){
      const base=body(baseNotes);
      if(local===base)return {notes:remoteNotes||'',pending:false,conflict:false};
      if(remote===base)return {notes:localNotes||'',pending:true,conflict:false};
    }
    if(!local&&baseNotes===undefined)return {notes:remoteNotes||'',pending:false,conflict:false};
    // A missing baseline or simultaneous changes require a deliberate choice.
    return {notes:localNotes||'',pending:false,conflict:true};
  }
  const api={resolve};root.NoteSyncModel=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
