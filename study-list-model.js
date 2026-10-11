/* Page progress comes only from the note; independent work keeps its own status. */
(function (root) {
  'use strict';
  const statuses = ['working', 'review', 'done'];
  const status = value => value === 'review' ? 'review' : value === 'done' ? 'done' : 'working';
  function normalize(raw) {
    const seen = new Set();
    const items = Array.isArray(raw?.items) ? raw.items.filter(i => {
      if (!i || typeof i.id !== 'string' || seen.has(i.id)) return false;
      seen.add(i.id); return true;
    }).map(i => ({ ...i, title: String(i.title || 'Başlıksız'), notes: String(i.notes || ''), pageId: typeof i.pageId === 'string' ? i.pageId : null, source: i.source === 'custom' || !i.pageId ? 'custom' : 'page', status: status(i.status), archived: Boolean(i.archived) })) : [];
    return {version:2,items};
  }
  function migrate(raw, pages, id) {
    const data = normalize(raw);
    if (raw?.version >= 1) return reconcile(data,pages);
    for (const p of pages) if (p.today && !data.items.some(i => i.pageId === p.id)) {
      data.items.push({id:id(),pageId:p.id,source:'page',title:p.title,notes:'',status:status(p.status),archived:false});
    }
    return reconcile(data,pages);
  }
  function linked(data, pageId) { return data.items.find(i => i.pageId === pageId && i.source === 'page'); }
  function contains(data, pageId) { const i=linked(data,pageId); return Boolean(i && !i.archived); }
  function addPage(data, page, initial = 'working', id) {
    const found = linked(data,page.id);
    if (found) { found.archived=false; return found; }
    const item={id:id(),pageId:page.id,source:'page',title:page.title,notes:'',status:status(initial),archived:false};
    data.items.push(item); return item;
  }
  const pageStatus = value => value === 'done' ? 'done' : value === 'review' ? 'review' : ['in_progress','learning'].includes(value) ? 'working' : null;
  const noteStatus = value => value === 'done' ? 'done' : value === 'review' ? 'review' : 'in_progress';
  function reconcile(raw, pages, changedIds = []) {
    const data = normalize(raw), changed = new Set(changedIds);
    for (const page of pages) {
      const progress = pageStatus(page.status);
      let item = linked(data,page.id);
      if (!progress) { if (item) item.archived = true; continue; }
      if (!item) {
        item = {id:`page:${page.id}`, pageId:page.id, source:'page', title:page.title, notes:'', status:progress, archived:false};
        // Imported IDs can collide with a custom item; never overwrite that item.
        while (data.items.some(i => i.id === item.id)) item.id += ':page';
        data.items.push(item);
      }
      item.status = progress;
      item.title = page.title;
      item.archived = false;
    }
    return data;
  }
  function active(data, pages, query='') {
    const byId = new Map(pages.map(p=>[p.id,p]));
    return reconcile(data,pages).items.filter(i=>!i.archived).map(i=> {
      const page=byId.get(i.pageId);
      return {...i,title:i.source === 'page' ? page?.title || i.title : i.title,category:page?.category || '',missingPage:Boolean(i.pageId && !page)};
    }).filter(i => `${i.title} ${i.notes} ${i.category}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
  }
  const api={statuses,status,pageStatus,noteStatus,normalize,migrate,linked,contains,addPage,reconcile,active};
  root.StudyListModel=api;
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
