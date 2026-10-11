/* Shared by the page and the extension worker. Configuration stays on this Mac. */
(function(root) {
  'use strict';
  const keys = ['topics','categories','categoryMetadata','moduleOrder','studyItems'];
  async function request(path, data) {
    const config = root.NOTMONK_OBSIDIAN_LOCAL;
    if (!config?.token) throw new Error('Yerel Obsidian servisi henüz kurulmamış.');
    const response = await fetch('http://127.0.0.1:8771' + path, {
      method:data === undefined ? 'GET' : 'POST',
      headers:{'Authorization':'Bearer ' + config.token, 'Content-Type':'application/json'},
      ...(data === undefined ? {} : {body:JSON.stringify(data)}),
      signal:AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error('Obsidian aktarımı tamamlanamadı (' + response.status + ').');
    return response.json();
  }
  root.ObsidianClient = {keys, request, health:() => request('/health'), sync: data => request('/sync', data)};
})(globalThis);
