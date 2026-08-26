// nm + Boşluk + Enter → NotMonk yeni sekmede açılır

chrome.omnibox.setDefaultSuggestion({
  description: 'NotMonk — Öğrenme tablonu aç'
});

chrome.omnibox.onInputChanged.addListener((_text, suggest) => {
  suggest([{ content: 'open', description: 'NotMonk — Öğrenme tablonu aç' }]);
});

chrome.omnibox.onInputEntered.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
