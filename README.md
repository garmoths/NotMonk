# NotMonk

A browser extension for tracking what you are learning. Add topics, take notes, set a status, and filter by category.

Works on Chrome and Brave.

---

![Dark theme](assets/screenshot-dark.png)

![Pink theme](assets/screenshot-pink.png)

---

## Installation

Chrome and Brave do not yet support installing this from the Web Store. Load it manually:

1. Download or clone this repository
2. Open `chrome://extensions` in your browser
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the repository folder
5. The NotMonk icon appears in your toolbar

To update after pulling new changes, go back to `chrome://extensions` and click the refresh icon on the NotMonk card.

---

## Opening NotMonk

**Toolbar icon** — Click the NotMonk icon in the browser toolbar. The app opens as a popup. Click the expand button in the top-right corner of the popup to open it as a full tab.

**Address bar shortcut** — Type `nm` in the address bar, press `Space` or `Tab`, then press `Enter`. NotMonk opens immediately in a new tab.

**Keyboard shortcut** — Press `Option + N` (Mac) or `Alt + N` (Windows) anywhere in the browser to instantly open NotMonk.

---

## Basic usage

**Adding a topic** — Click **Konu ekle** or press `N`. Fill in the title, choose a category, optionally add a resource URL and notes, then save.

**Changing status** — Each row has three status buttons: Başlamadım, Öğreniyorum, Öğrendim. Click any of them directly in the table without opening the editor.

**Notes** — Open a topic by clicking its row or the Düzenle button. The right panel is a free-form text area for notes.

**Filtering** — Use the search box to filter by title or note content. Use the Alan and Durum dropdowns to narrow by category or status.

**Drag to reorder** — Grab the handle on the left side of any row and drag it to a new position.

**Categories** — Inside the topic editor, click **Alanları yönet** to add or remove categories. A category can only be deleted when no topics are assigned to it.

---

## Themes

Click the **Görünüm** button in the top-right corner to switch between the dark and pink themes.

---

## Data

All data is stored locally in your browser using `chrome.storage.local`. Nothing is sent to any server. Clearing the extension's storage will delete your topics.

---

## License

MIT
