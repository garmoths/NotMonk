/* Synthetic Chrome storage for the full-page startup regression fixture.
 * Never reads or writes the browser's real extension/localStorage data. */
(() => {
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) throw new Error('Local test only');
  const mode = new URLSearchParams(location.search).get('case') || 'quota';
  const original = [
    {id:'storage-personal',category:'Test area A',title:'Korunacak eski sayfa',notes:'<p>Sentetik kişisel not.</p>',status:'review',today:true},
    {id:'storage-later',category:'Test area B',title:'Sonraki aşama',notes:'<p>Sentetik ileri aşama notu.</p>',status:'done'}
  ];
  const data = {topics:structuredClone(original),categories:['Test area A','Test area B'],curriculumSetupVersion:1,
    foundationsOutlineVersion:1,preferences:{activeTab:'today',theme:'dark'},areaAliases:{},deletedTopicKeys:[],deletedCategoryKeys:[]};
  if (mode === 'curriculum') delete data.curriculumSetupVersion;
  if (mode === 'outline') delete data.foundationsOutlineVersion;
  const cache = new Map();
  Object.defineProperty(window,'localStorage',{value:{getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,String(v)),removeItem:k=>cache.delete(k)}});
  const runtime = {};
  let writes = 0;
  function callbackError(message, callback) {
    runtime.lastError = {message};
    try {callback();} finally {delete runtime.lastError;}
  }
  window.chrome = {runtime,storage:{onChanged:{addListener(){}},local:{
    get(keys, callback) {
      queueMicrotask(() => {
        if(mode === 'read') return callbackError('Synthetic storage read failure', callback);
        const result={};for(const k of Array.isArray(keys)?keys:[keys]) if(k in data) result[k]=structuredClone(data[k]);callback(result);
      });
    },
    set(value, callback) {
      writes++;
      queueMicrotask(() => {
        const fail=mode==='quota'||mode==='curriculum'&&'curriculumSetupVersion' in value||mode==='outline'&&'foundationsOutlineVersion' in value||mode==='study'&&'studyItems' in value;
        if(fail) return callbackError('QUOTA_BYTES quota exceeded',callback);
        Object.assign(data,structuredClone(value));callback();
      });
    }
  }}};
  window.addEventListener('DOMContentLoaded',()=>{
    const panel=document.createElement('aside');panel.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:10px;background:#fff;color:#111';
    const button=document.createElement('button');button.textContent='Açılışı ve notların korunmasını doğrula';
    const output=document.createElement('output');output.id='storage-fixture-result';
    button.onclick=()=>{
      const preserved=original.every(p=>{const next=data.topics.find(n=>n.id===p.id);return next&&next.notes===p.notes&&next.status===p.status;});
      const cards=document.querySelectorAll('#modules-grid .module-card').length;
      const working=document.querySelector('#tab-today')?.textContent.trim();
      output.textContent=JSON.stringify({mode,preserved,cards,writes,working,topicCount:data.topics.length});
    };
    panel.append(button,output);document.body.append(panel);
  });
})();
