const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Obsidian startup keeps separate local page identities and does not run the retired remote deduplicator',()=>{
 const source=fs.readFileSync('app.js','utf8');const init=source.slice(source.indexOf('async function init()'),source.indexOf('// ── Events'));
 assert.ok(!init.includes('reconcileTopicDuplicates'));
 assert.ok(!source.includes('findMatchingLocalTopic'));
 assert.ok(!source.includes('NotionAPI'));
});
