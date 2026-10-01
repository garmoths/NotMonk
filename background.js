// NotMonk Background Service Worker

function setSuggestion() {
  chrome.omnibox.setDefaultSuggestion({
    description: 'NotMonk: <match>Enter</match>\'a basarak öğrenme tablosunu aç'
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  setSuggestion();
  // Hata 2+13: Popup kapalıyken de sync devam etsin — her 30 saniyede bir heartbeat
  chrome.alarms.create('notionHeartbeat', { periodInMinutes: 0.5 });
  console.log('[NotMonk] Notion heartbeat alarmı kuruldu (30s)');
});

chrome.runtime.onStartup.addListener(() => {
  setSuggestion();
  // Uygulama yeniden başladığında alarmı yeniden kur
  chrome.alarms.create('notionHeartbeat', { periodInMinutes: 0.5 });
});

setSuggestion();

// Hata 2+13: Alarm tetiklendiğinde popup'a sync sinyali gönder
// Storage'a timestamp yaz → popup chrome.storage.onChanged ile yakalar
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'notionHeartbeat') return;

  // Notion config'in varlığını kontrol et
  const stored = await chrome.storage.local.get(['notionConfig']);
  if (!stored.notionConfig?.token) return;

  // Popup'a sync sinyali gönder — storage değişikliği popup'ın onChanged listener'ını tetikler
  await chrome.storage.local.set({ _notionHeartbeatAt: Date.now() });
});

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
  const url = chrome.runtime.getURL('index.html');

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
