// NotMonk Omnibox Service Worker

function setSuggestion() {
  chrome.omnibox.setDefaultSuggestion({
    description: 'NotMonk: <match>Enter</match>\'a basarak öğrenme tablosunu aç'
  });
}

// Service worker başladığında ve omnibox'a girildiğinde default suggestion'ı ayarla
chrome.runtime.onInstalled.addListener(setSuggestion);
chrome.runtime.onStartup.addListener(setSuggestion);
setSuggestion();

chrome.omnibox.onInputStarted.addListener(() => {
  setSuggestion();
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  suggest([
    {
      content: 'open',
      description: 'NotMonk — Öğrenme tablosunu aç'
    }
  ]);
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
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
