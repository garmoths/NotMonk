const StudyList = (() => {
  'use strict';
  const M=StudyListModel, KEY='studyItems';
  const labels={working:'Çalışıyorum',review:'Tekrar edeceğim',done:'Bitirdim'};
  let api, root, data=M.normalize(), ready=false, query='', queue=Promise.resolve(), dragged=null, showArchive=false;
  const el=(tag,cls,text) => {const e=document.createElement(tag); if(cls)e.className=cls; if(text!==undefined)e.textContent=text; return e;};
  const button=(text,action,cls='secondary') => {const b=el('button',cls,text);b.type='button';b.onclick=()=>run(action);return b;};
  const pages=()=>api.getPages();
  function run(action) {return Promise.resolve().then(action).catch(e=>{console.error(e);api.notify(e.message || 'Çalışma listesi kaydedilemedi. Tekrar dene.','error');});}
  function change(edit) {
    const result=queue.then(async()=>{
      const write=async()=>{
        const saved=await api.get(KEY), next=M.reconcile(saved[KEY],pages());
        edit(next); await api.set({[KEY]:next}); data=next;
      };
      if(navigator.locks) await navigator.locks.request('notmonk-study-items',write); else await write();
      api.onChange();
    });
    queue=result.catch(()=>{});return result;
  }
  function savePages(value, changedIds = []) {
    const result = queue.then(async () => {
      const write = async () => {
        const saved = await api.get(['topics',KEY]);
        const before = new Map((saved.topics || []).map(p => [p.id,p.status]));
        const changed = [...changedIds, ...value.topics.filter(p => before.get(p.id) !== p.status).map(p => p.id)];
        const next = M.reconcile(saved[KEY], value.topics, changed);
        await api.set({...value,[KEY]:next});
        data = next;
      };
      if (navigator.locks) await navigator.locks.request('notmonk-study-items',write); else await write();
    });
    queue = result.catch(() => {});
    return result;
  }
  function makeDialog(title, submitText, onSubmit) {
    const d=el('dialog','study-item-dialog'),form=el('form'),head=el('header'),h=el('h2','',title),body=el('div','study-item-dialog-body'),foot=el('footer'),error=el('p','study-item-error');
    h.id=`study-title-${crypto.randomUUID()}`;d.setAttribute('aria-labelledby',h.id);error.setAttribute('role','alert');
    head.append(h,button('✕',()=>d.close(),'study-icon-btn'));
    head.lastChild.setAttribute('aria-label','Pencereyi kapat');
    const submit=el('button','primary',submitText);submit.type='submit';
    foot.append(button('Vazgeç',()=>d.close()),submit);form.append(head,body,foot,error);d.append(form);
    form.onsubmit=async e=>{
      e.preventDefault();if(submit.disabled)return;submit.disabled=true;
      try {await onSubmit(new FormData(form));d.close();}catch(e){error.textContent=e.message || 'Kaydedilemedi. Tekrar dene.';}finally{submit.disabled=false;}
    };
    d.onclose=()=>d.remove();document.body.append(d);d.showModal();
    return {d,body,form,submit};
  }
  function field(label,node) {const l=el('label','study-field');l.append(el('span','',label),node);return l;}
  function input(name,value='',type='text') {const i=el('input');i.name=name;i.type=type;i.value=value;return i;}
  function statusSelect(name,current) {const s=el('select');s.name=name;for(const k of M.statuses)s.add(new Option(labels[k],k));s.value=current;return s;}
  function itemDialog(item=null, initial='working') {
    const {body}=makeDialog(item?'Çalışma maddesini düzenle':'Çalışma maddesi ekle',item?'Kaydet':'Listeye ekle',async f=>{
      const title=String(f.get('title')).trim();if(!title)throw new Error('Kısa bir başlık yaz.');
      const pageId=item?.source === 'page' ? item.pageId : String(f.get('page')||'') || null;
      if(pageId&&!pages().some(p=>p.id===pageId))throw new Error('Bağlı sayfa bulunamadı. Yeniden seç.');
      await change(d=>{
        if(item){const target=d.items.find(i=>i.id===item.id);if(!target)throw new Error('Bu madde başka bir sekmede değişmiş.');Object.assign(target,{title,source:pageId && item.source === 'page' ? 'page' : 'custom',notes:String(f.get('notes')).trim(),pageId,status:item.source === 'page' ? item.status : M.status(f.get('status'))});}
        else d.items.push({id:crypto.randomUUID(),source:'custom',title,notes:String(f.get('notes')).trim(),pageId,status:M.status(f.get('status')),archived:false});
      });
    });
    const title=input('title',item?.title||'');title.required=true;title.maxLength=300;title.placeholder='Örn. pointer soruları çöz';
    const notes=el('textarea');notes.name='notes';notes.rows=4;notes.maxLength=4000;notes.value=item?.notes||'';notes.placeholder='Nerede kaldın? Bir sonraki adımın ne?';
    const select=el('select');select.name='page';select.add(new Option('Bağımsız çalışma maddesi',''));
    for(const p of pages())select.add(new Option(`${p.title} · ${api.areaName(p.category)}`,p.id));
    select.value=item?.pageId || '';
    title.readOnly=item?.source === 'page';
    select.onchange=()=>{ if(item?.source === 'page'){title.readOnly=Boolean(select.value);if(select.value)title.value=pages().find(p=>p.id===select.value)?.title || title.value;} };
    // A linked page's name follows that page; independent items keep their own name.
    body.append(field('Başlık',title));
    if (item?.source === 'page') body.append(el('p','study-help','Durumu değiştirmek için ilgili notu aç.'));
    else body.append(field('Durum',statusSelect('status',item?.status||initial)));
    if (item?.source !== 'page') body.append(field('İlgili sayfa (isteğe bağlı)',select));
    body.append(field('Kaldığım yer / çalışma notum',notes));
    title.focus();
  }
  function pagePicker() {
    const {d,body,submit}=makeDialog('Çalışacağın sayfaları seç','Tamam',async()=>{});
    submit.textContent='Tamam';
    const search=input('search','','search');search.placeholder='Sayfa veya alan ara…';search.setAttribute('aria-label','Çalışma sayfalarında ara');
    const list=el('div','study-page-picker'),count=el('p','study-help');body.append(search,count,list);
    function draw() {
      const q=search.value.toLocaleLowerCase('tr'),selected=M.active(data,pages()).filter(i=>i.source==='page').length;
      count.textContent=`${selected} sayfa listemde`;
      list.replaceChildren();
      const available=pages().filter(p=>`${p.title} ${p.category}`.toLocaleLowerCase('tr').includes(q));
      if(!available.length)list.append(el('p','study-help','Eşleşen sayfa yok. Çalışma alanında bir sayfa oluşturabilir veya serbest madde ekleyebilirsin.'));
      for(const p of available){
        const row=el('label','study-pick-row'),check=input('selected','','checkbox');check.checked=M.contains(data,p.id);
        const text=el('span'),name=el('strong','',p.title),area=el('small','',api.areaName(p.category));text.append(name,area);row.append(check,text);
        check.onchange=()=>{check.disabled=true;run(async()=>{await togglePage(p);draw();}).finally(()=>{check.disabled=false;});};list.append(row);
      }
    }
    search.oninput=draw;draw();search.focus();
  }
  async function togglePage(page) {
    if (M.pageStatus(page.status) && M.contains(M.reconcile(data,pages()),page.id)) {
      await api.setPageStatus(page,'todo');
    } else {
      await api.setPageStatus(page, M.pageStatus(page.status) ? page.status : 'in_progress');
    }
  }
  async function ensurePage(page) { await api.setPageStatus(page, M.pageStatus(page.status) ? page.status : 'in_progress'); }
  async function setStatus(id,status) {
    const item=M.reconcile(data,pages()).items.find(i=>i.id===id);
    if(item?.source==='page'){const page=pages().find(p=>p.id===item.pageId);if(page)await api.setPageStatus(page,M.noteStatus(status));}
    else await change(d=>{const i=d.items.find(i=>i.id===id);if(i)i.status=M.status(status);});
  }
  async function archive(id,value=true) {await change(d=>{const i=d.items.find(i=>i.id===id);if(i)i.archived=value;});}
  function card(item) {
    const c=el('article','kanban-card study-work-card');c.dataset.id=item.id;c.draggable=item.source !== 'page';
    c.ondragstart=e=>{dragged=item.id;e.dataTransfer.setData('text/x-notmonk-study-item',item.id);e.dataTransfer.effectAllowed='move';c.classList.add('dragging');};
    c.ondragend=()=>{dragged=null;c.classList.remove('dragging');root.querySelectorAll('.drag-over').forEach(e=>e.classList.remove('drag-over'));};
    c.append(el('span','study-item-kind',item.pageId?(item.missingPage?'Bağlı sayfa bulunamadı':`${item.source === 'custom' ? 'Serbest çalışma · ' : ''}${api.areaName(item.category)}`):'Serbest çalışma'));
    const title=el('h3','study-work-title',item.title);c.append(title);
    if(item.notes)c.append(el('p','study-work-note',item.notes));
    const controls=el('div','study-work-controls');
    if (item.source === 'page') {
      controls.append(el('span','study-page-status',labels[item.status]));
    } else {
      const select=statusSelect('status',item.status);
      select.setAttribute('aria-label',`${item.title}: çalışma durumu`);
      select.onchange=()=>{select.disabled=true;run(()=>setStatus(item.id,select.value)).finally(()=>{select.disabled=false;});};
      controls.append(select);
    }
    const actions=el('div','study-work-actions');
    if(item.pageId&&!item.missingPage)actions.append(button('Sayfayı aç',()=>api.openPage(pages().find(p=>p.id===item.pageId))));
    actions.append(button(item.source === 'page' ? 'Çalışma notu' : 'Düzenle',()=>itemDialog(item)));
    if (item.source !== 'page') actions.append(button('Listeden çıkar',()=>archive(item.id),'study-text-btn'));
    c.append(controls,actions);return c;
  }
  function renderBoard(board) {
    const all=M.active(data,pages(),query);
    for(const status of M.statuses){
      const group=all.filter(i=>i.status===status),col=el('section',`kanban-column study-column status-${status}`),head=el('header','kanban-column-header'),title=el('div','kanban-column-title-wrap');
      title.append(el('span','study-column-mark',status==='working'?'↗':status==='review'?'↻':'✓'),el('h2','kanban-column-title',labels[status]),el('span','kanban-column-count',String(group.length)));
      const add=button('＋',()=>itemDialog(null,status),'kanban-column-add');add.setAttribute('aria-label',`${labels[status]} sütununa madde ekle`);head.append(title,add);
      const cards=el('div','kanban-cards');cards.dataset.studyStatus=status;
      cards.ondragover=e=>{if(!dragged)return;e.preventDefault();e.dataTransfer.dropEffect='move';cards.classList.add('drag-over');};
      cards.ondragleave=e=>{if(!cards.contains(e.relatedTarget))cards.classList.remove('drag-over');};
      cards.ondrop=e=>{e.preventDefault();cards.classList.remove('drag-over');const id=e.dataTransfer.getData('text/x-notmonk-study-item')||dragged;const item=data.items.find(i=>i.id===id);if(item && item.source !== 'page')run(()=>setStatus(id,status));};
      if(group.length)for(const i of group)cards.append(card(i));
      else cards.append(el('p','kanban-empty',query?'Aramana uyan madde yok':status==='working'?'Bir notu Yapılıyor olarak işaretle veya serbest madde ekle.':status==='review'?'Tekrar edeceğin notta Tekrar durumunu seç.':'Bitirdiklerin burada kalır.'));
      col.append(head,cards);board.append(col);
    }
  }
  function render() {
    if(!ready)return;
    const focused=document.activeElement,wasSearch=focused?.id==='study-list-search',selection=wasSearch?focused.selectionStart:null;
    root.replaceChildren();
    const intro=el('div','study-list-intro');intro.append(el('p','','Notta seçtiğin durum burada görünür. İstersen serbest çalışma maddesi de ekleyebilirsin.'));
    const tools=el('div','study-list-tools');tools.append(button('＋ Çalışma maddesi',()=>itemDialog(), 'primary'));intro.append(tools);
    const bar=el('div','study-list-bar'),search=input('search',query,'search');search.id='study-list-search';search.placeholder='Çalışmalarımda ara…';search.setAttribute('aria-label','Çalışmalarımda ara');search.oninput=()=>{query=search.value;render();};
    const all=M.active(data,pages()),summary=el('span','study-list-summary',`${all.length} çalışma · ${all.filter(i=>i.status==='working').length} çalışıyorum · ${all.filter(i=>i.status==='review').length} tekrar · ${all.filter(i=>i.status==='done').length} bitirdim`);
    bar.append(search,summary);const board=el('div','kanban-board study-work-board');renderBoard(board);root.append(intro,bar,board);
    const archived=data.items.filter(i=>i.archived && (i.source !== 'page' || !pages().some(p=>p.id===i.pageId)));
    if(archived.length){
      const details=el('details','study-archive');details.open=showArchive;details.ontoggle=()=>{if(details.isConnected)showArchive=details.open;};details.append(el('summary','',`Listeden çıkardıklarım (${archived.length})`));
      for(const i of archived){const row=el('div','study-archive-row'),p=pages().find(p=>p.id===i.pageId);row.append(el('span','',p?.title||i.title),button('Geri ekle',()=>archive(i.id,false)));details.append(row);}root.append(details);
    }
    root.append(el('p','study-local-note','Sayfaların durumunu notun içinden değiştir. Çalışma listen Obsidian’a da aktarılır.'));
    if(wasSearch){search.focus();if(selection!==null)search.setSelectionRange(selection,selection);}
  }
  async function init(adapter) {
    api=adapter;root=document.getElementById('study-list');
    const saved=await api.get(KEY);data=M.migrate(saved[KEY],pages(),()=>crypto.randomUUID());
    if(saved[KEY]?.version!==2 || JSON.stringify(saved[KEY]) !== JSON.stringify(data)) {
      try {
        const update = {[KEY]:data};
        if (saved[KEY]?.version !== 2) update.studyStatusMigrationBackup = {createdAt:Date.now(),studyItems:saved[KEY] || null,pageStatuses:pages().map(p=>({id:p.id,status:p.status}))};
        await api.set(update);
      }
      catch(error) {
        console.error('Çalışma listesi başlangıç kaydı yazılamadı:',error);
        if(api.onStorageError)api.onStorageError(error);
        else api.notify('Çalışma listesi kaydedilemedi. Mevcut seçimlerin açıldı.','error');
      }
    }
    ready=true;
    const refresh=()=>run(async()=>{const saved=await api.get(KEY);data=M.reconcile(saved[KEY],pages());api.onChange();});
    if(globalThis.chrome?.storage?.onChanged)chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[KEY])refresh();});
    else window.addEventListener('storage',e=>{if(e.key===KEY)refresh();});
  }
  return {init,render,togglePage,ensurePage,pagePicker,itemDialog,savePages,isReady:()=>ready,containsPage:id=>ready?M.contains(M.reconcile(data,pages()),id):null,count:()=>M.active(data,api?.getPages()||[]).length};
})();
