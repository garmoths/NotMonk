const PageRecovery = (()=>{
  let api;
  const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  async function open(){
    const saved=await api.get('safetyBackups');
    const candidates=PageRecoveryModel.missing(saved.safetyBackups,api.getPages(),api.isDeleted);
    const d=el('dialog'),form=el('form'),head=el('header'),h=el('h2','Önceki kayıtlardan sayfa kurtar'),close=el('button','✕'),body=el('div'),footer=el('footer'),cancel=el('button','Vazgeç'),submit=el('button','Seçilen sayfaları geri ekle'),error=el('p');
    d.className='study-item-dialog';h.id='page-recovery-title';d.setAttribute('aria-labelledby',h.id);
    close.type=cancel.type='button';close.className='study-icon-btn';close.setAttribute('aria-label','Pencereyi kapat');close.onclick=cancel.onclick=()=>d.close();
    cancel.className='secondary';submit.className='primary';submit.type='submit';submit.disabled=!candidates.length;error.className='study-item-error';error.setAttribute('role','alert');body.className='study-item-dialog-body';
    body.append(el('p',candidates.length?`${candidates.length} eksik sayfa bulundu. Geri eklemek istediklerini seç. Mevcut notların değiştirilmez.`:'Yerel yedeklerde geri eklenebilecek eksik sayfa bulunamadı.'));
    const list=el('div');list.className='study-page-picker';
    for(const p of candidates){
      const row=el('label'),check=el('input'),text=el('span');check.type='checkbox';check.name='page';check.value=String(candidates.indexOf(p));row.className='study-pick-row';
      text.append(el('strong',p.title),el('small',`${api.areaName(p.category)} · ${new Date(p.backupAt).toLocaleDateString('tr-TR')}`));row.append(check,text);list.append(row);
    }
    body.append(list);head.append(h,close);footer.append(cancel,submit);form.append(head,body,footer,error);d.append(form);
    form.onsubmit=async e=>{
      e.preventDefault();const selected=new FormData(form).getAll('page').map(i=>candidates[Number(i)]);if(!selected.length){error.textContent='Geri eklenecek en az bir sayfa seç.';return;}
      submit.disabled=true;
      try{const n=await api.restore(selected);d.close();api.notify(`${n} sayfa geri eklendi.`);}catch(e){error.textContent=e.message||'Kurtarma kaydedilemedi.';submit.disabled=false;}
    };
    d.onclose=()=>d.remove();document.body.append(d);d.showModal();
  }
  function init(adapter){api=adapter;document.getElementById('recover-pages-btn').onclick=()=>open().catch(e=>api.notify(e.message,'error'));}
  return {init};
})();
