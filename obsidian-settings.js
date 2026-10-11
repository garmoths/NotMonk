(function(root) {
  'use strict';
  let adapter, timer, running;
  const $ = s => document.querySelector(s);
  const changed = values => {
    if (!adapter || root.chrome?.storage?.local || !ObsidianClient.keys.some(k => k in values)) return;
    clearTimeout(timer); timer = setTimeout(() => sync(false), 800);
  };
  function display(status = {}) {
    const error = status.state === 'error', busy = status.state === 'syncing';
    const paused = status.state === 'paused';
    $('#obsidian-status-dot').className = 'obsidian-status-dot ' + (error ? 'error' : busy ? 'syncing' : paused ? '' : status.lastSync ? 'connected' : '');
    $('#obsidian-status-text').textContent = busy ? 'Aktarılıyor…' : error ? 'Bağlantı yok' : paused ? 'Duraklatıldı' : 'Obsidian';
    $('#obsidian-status-msg').className = 'obsidian-status-msg' + (error ? ' error' : '');
    const time = status.lastSync ? new Date(status.lastSync).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}) : '';
    $('#obsidian-status-msg').textContent = error ? (status.message || 'Yerel servis kapalı. Notların burada kayıtlı; bağlantı gelince tekrar aktarılacak.') : busy ? 'Notların aktarılıyor…' : paused ? 'Otomatik aktarım kapalı. İstersen “Şimdi aktar”ı kullanabilirsin.' : status.lastSync ? `${status.topics || 0} sayfa · Son aktarım ${time}${status.conflicts ? ` · ${status.conflicts} dosyanın yeni sürümü aktarım kopyalarında.` : ' · Güncel'}` : 'Bağlantı hazır. İlk aktarım bekleniyor.';
    if (status.vault) {
      $('#obsidian-vault').value = status.vault;
      const link = $('#obsidian-open-vault'); link.href = 'obsidian://open?vault=' + encodeURIComponent(status.vaultName || 'NotMonk'); link.classList.remove('hidden');
    }
  }
  async function sync(manual = true) {
    if (running) return running;
    running = (async () => {
      const config = (await adapter.get(['obsidianConfig'])).obsidianConfig || {};
      if (!manual && config.autoSync === false) { display({state:'paused'}); return; }
      display({state:'syncing'});
      try {
        if (root.chrome?.runtime?.sendMessage && root.chrome?.storage?.local) {
          const result = await chrome.runtime.sendMessage({type:'obsidian-sync'});
          if (!result?.ok) throw new Error(result?.message || 'Yerel servis kapalı. Bağlantı gelince yeniden denenecek.');
          display(result.status);
        } else {
          const result = await ObsidianClient.sync(await adapter.get(ObsidianClient.keys));
          const status = {state:'idle',lastSync:Date.now(),...result};
          await adapter.set({obsidianStatus:status}); display(status);
        }
      } catch (error) { display({state:'error',message:error.message}); }
    })().finally(() => { running = null; });
    return running;
  }
  async function open() {
    $('#obsidian-dialog').showModal();
    const saved = await adapter.get(['obsidianConfig','obsidianStatus']);
    $('#obsidian-auto-sync').checked = saved.obsidianConfig?.autoSync !== false;
    display(saved.obsidianStatus || {});
    try { const health = await ObsidianClient.health(); display({...saved.obsidianStatus,...health, state:saved.obsidianConfig?.autoSync === false ? 'paused' : saved.obsidianStatus?.state || 'idle'}); }
    catch { display({...saved.obsidianStatus,state:'error',message:'Yerel servis kapalı. Notların burada kayıtlı; servis açılınca otomatik aktarım devam eder.'}); }
  }
  async function init(value) {
    adapter = value;
    $('#obsidian-toggle-btn').onclick = open;
    $('#close-obsidian-dialog').onclick = () => $('#obsidian-dialog').close();
    $('#quick-sync-btn').onclick = () => sync();
    $('#obsidian-sync-now').onclick = () => sync();
    $('#obsidian-auto-sync').onchange = async event => {
      await adapter.set({obsidianConfig:{autoSync:event.target.checked}});
      if (event.target.checked) await sync(false); else display({state:'paused'});
    };
    const saved = await adapter.get(['obsidianStatus','obsidianConfig']);
    display(saved.obsidianConfig?.autoSync === false ? {...saved.obsidianStatus,state:'paused'} : saved.obsidianStatus);
    if (root.chrome?.storage?.onChanged) chrome.storage.onChanged.addListener((changes,area) => {
      if (area === 'local' && changes.obsidianStatus) display(changes.obsidianStatus.newValue);
    });
    await sync(false);
  }
  root.ObsidianSettings = {init,changed,sync};
})(globalThis);
