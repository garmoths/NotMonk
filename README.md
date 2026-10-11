# NotMonk

NotMonk is a Chrome and Brave extension for managing local notes, nested pages, study progress and diagrams.

## Installation

Clone or download this repository. Open `chrome://extensions` or `brave://extensions`, enable developer mode, and load this folder as an unpacked extension.

Open the extension from its toolbar icon, with Alt+N (Option+N on macOS), or by typing `nm` in the address bar followed by a space and Enter.

## Privacy

Fresh installations have no areas, topics, page titles, outlines or note content. Create your own areas and pages in the app. Existing notes are read from the browser's local storage and retained when the extension is updated.

Notes, custom area names, study progress and diagrams stay in `chrome.storage.local`. Exports, backups, local configuration, credentials and personal assets are excluded from Git. Tests use synthetic data.

## Features

- Nested pages and rich text notes, including code blocks and images.
- Custom areas, ordering, themes and diagram boards.
- A study list driven by each note's status.
- Autosave and recovery from local backups.
- Optional one-way Markdown export to a local Obsidian vault.

## Local Obsidian export

Run the local installer with the path to your vault:

```sh
python3 scripts/install_obsidian_bridge.py --vault "$HOME/Documents/NotMonk"
```

Reload the extension and use its Obsidian settings to enable automatic export or export manually. The service listens only on `127.0.0.1:8771`. Its access key and vault path are stored in ignored local files. Existing Obsidian edits are preserved; conflicting NotMonk updates are exported as separate copies.

## Verification

```sh
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p '*_test.py'
```
