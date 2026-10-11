// Generate the real app HTML with a synthetic Chrome storage adapter.
// Run: node tests/make-extension-storage-fixture.cjs
// Then serve the repo and open scratch/extension-storage-fixture.local.html?case=quota#/areas.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<head>','<head><base href="../">');
html=html.replace('<script src="curriculum-areas.js"></script>','<script src="tests/extension-storage-mock.js"></script><script src="curriculum-areas.js"></script>');
html=html.replace('src="study-list.js"','src="study-list.js?v=storage-startup"');
fs.mkdirSync(path.join(root,'scratch'),{recursive:true});
fs.writeFileSync(path.join(root,'scratch/extension-storage-fixture.local.html'),html);
