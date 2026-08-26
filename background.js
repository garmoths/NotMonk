// NotMonk Background Service Worker

function setSuggestion() {
  chrome.omnibox.setDefaultSuggestion({
    description: 'NotMonk: <match>Enter</match>\'a basarak öğrenme tablosunu aç'
  });
}

chrome.runtime.onInstalled.addListener(setSuggestion);
chrome.runtime.onStartup.addListener(setSuggestion);
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
