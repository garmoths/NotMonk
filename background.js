// NotMonk Background Service Worker

function setSuggestion() {
  chrome.omnibox.setDefaultSuggestion({
    description: 'NotMonk: <match>Enter</match>\'a basarak öğrenme tablosunu aç'
  });
}

try { importScripts('obsidian-local-config.local.js'); } catch { /* The installer supplies local configuration. */ }
importScripts('obsidian-client.js');
const getLocal = keys => chrome.storage.local.get(keys);
let exportRunning = null, exportAgain = false;
async function exportToObsidian(manual = false) {
  if (exportRunning) { exportAgain = true; return exportRunning; }
  exportRunning = (async () => {
    let result;
    do {
      exportAgain = false;
      const saved = await getLocal([...ObsidianClient.keys, 'obsidianConfig']);
      if (!manual && saved.obsidianConfig?.autoSync === false) return {ok:true,status:{state:'paused'}};
      await chrome.storage.local.set({obsidianStatus:{state:'syncing'}});
      try {
        const data = await ObsidianClient.sync(saved);
        const status = {...data,state:'idle',lastSync:Date.now()};
        await chrome.storage.local.set({obsidianStatus:status});
        result = {ok:true,status};
      } catch {
        const message = 'Yerel servis kapalı. Notların burada kayıtlı; bağlantı gelince tekrar aktarılacak.';
        await chrome.storage.local.set({obsidianStatus:{state:'error',message}});
        return {ok:false,message};
      }
    } while (exportAgain);
    return result;
  })().finally(() => { exportRunning = null; });
  return exportRunning;
}
function startLocalExport() {
  setSuggestion();
  chrome.alarms.create('obsidian-retry', {periodInMinutes:1});
  return exportToObsidian();
}
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove(['notionConfig','umbrellaPageId','areaMapping','_notionHeartbeatAt']);
  chrome.alarms.clear('notion-heartbeat');
  startLocalExport();
});
chrome.runtime.onStartup.addListener(startLocalExport);
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'obsidian-retry') return exportToObsidian(); });
chrome.storage.onChanged.addListener((changes,area) => {
  if (area === 'local' && [...ObsidianClient.keys,'obsidianConfig'].some(key => key in changes)) return exportToObsidian();
});
chrome.runtime.onMessage.addListener((message,_sender,respond) => {
  if (message.type !== 'obsidian-sync') return;
  exportToObsidian(true).then(respond, () => respond({ok:false,message:'Aktarım tamamlanamadı.'}));
  return true;
});
setSuggestion();

chrome.omnibox.onInputStarted.addListener(() => {
  setSuggestion();
});

chrome.omnibox.onInputChanged.addListener((_text, suggest) => {
  suggest([
    {
      content: 'open',
      description: 'NotMonk — Öğrenme tablosunu aç'
    }
  ]);
});

chrome.omnibox.onInputEntered.addListener((_text, disposition) => {
  const url = chrome.runtime.getURL('index.html') + '#/areas';

  if (disposition === 'currentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { url });
      } else {
        chrome.tabs.create({ url });
      }
    });
  } else if (disposition === 'newBackgroundTab') {
    chrome.tabs.create({ url, active: false });
  } else {
    chrome.tabs.create({ url, active: true });
  }
});

// Klavye kısayolu (Alt+N veya Option+N) ile her yerden açma
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open_notmonk') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  }
});
