const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function api(fetch) {
  const context = vm.createContext({ fetch, AbortSignal, console, setTimeout, crypto: require('node:crypto').webcrypto });
  vm.runInContext(fs.readFileSync('notion.js', 'utf8'), context);
  return context.NotionAPI;
}
const response = (data, status = 200) => ({ ok: status < 300, status, json: async () => data });
test('access loss does not mean deletion', async () => {
  assert.equal(await api(async () => response({}, 404)).isPageInTrash('token', 'id'), false);
});
test('failed reads reject instead of returning empty notes', async () => {
  await assert.rejects(api(async () => response({}, 500)).fetchPageBlocksHTML('token', 'id'));
});
test('all content pages are read', async () => {
  let n = 0;
  const a = api(async () => response({ results: [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: String(++n) }] } }], has_more: n === 1, next_cursor: 'next' }));
  assert.equal(await a.fetchPageBlocksHTML('token', 'id'), '<p>1</p><p>2</p>');
});
test('empty notes preserve existing Notion content', async () => {
  const calls = [];
  const a = api(async (url, options) => {
    calls.push([url, options.method]);
    return response(options.method === 'DELETE' ? {} : { results: [{ id: 'old', type: 'paragraph' }, { id: 'child', type: 'child_page' }] });
  });
  await a.updatePageBlocks('token', 'id', '');
  assert.equal(calls.length, 1);
  assert.equal(calls.some(([, method]) => method === 'DELETE'), false);
});
test('failed append never deletes existing content', async () => {
  const methods = [];
  const a = api(async (url, options) => {
    methods.push(options.method);
    return options.method === 'PATCH' ? response({}, 400) : response({ results: [{ id: 'old', type: 'paragraph' }] });
  });
  await assert.rejects(a.updatePageBlocks('token', 'id', 'new'));
  assert.equal(methods.includes('DELETE'), false);
});
test('push merges local and remote note bodies before replacing blocks', async () => {
  const payloads = [];
  const a = api(async (url, options = {}) => {
    if ((options.method || 'GET') === 'GET') {
      return response({ results: [{ id: 'old', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Notion metni' }] } }] });
    }
    if (options.method === 'PATCH' && url.endsWith('/children')) payloads.push(JSON.parse(options.body));
    return response({});
  });
  a.buildChildrenBlocks = notes => [{ paragraph: { rich_text: [{ text: { content: notes } }] } }];
  await a.updatePageBlocks('token', 'id', '<p>NotMonk metni</p>');
  const text = JSON.stringify(payloads);
  assert.match(text, /Notion metni/);
  assert.match(text, /NotMonk metni/);
});
test('long text and more than 100 paragraphs are not truncated', () => {
  const a = api();
  const blocks = a.buildChildrenBlocks('a'.repeat(5000));
  assert.equal(blocks[0].paragraph.rich_text.map(t => t.text.content).join('').length, 5000);
  assert.equal(a.buildChildrenBlocks(Array(120).fill('paragraph').join('\n\n')).length, 120);
});
test('database schema excludes nonexistent properties and clears URLs', () => {
  const props = api().buildProperties({ title: 'Hello', status: 'todo', resource: '' }, { Title: { type: 'title' }, Resource: { type: 'url' } });
  assert.deepEqual(Object.keys(props).sort(), ['Resource', 'Title']);
  assert.equal(props.Resource.url, null);
});
test('workspace hierarchy preserves nested note parent', () => {
  const a = api();
  const items = [
    { id: 'umbrella', object: 'page', parent: { type: 'workspace' }, properties: { title: { type: 'title', title: [{ plain_text: 'NotMonk' }] } } },
    { id: 'area', object: 'page', parent: { type: 'page_id', page_id: 'umbrella' }, properties: { title: { type: 'title', title: [{ plain_text: 'Java' }] } } },
    { id: 'parent', object: 'page', parent: { type: 'page_id', page_id: 'area' }, properties: { title: { type: 'title', title: [{ plain_text: 'Collections' }] } } },
    { id: 'child', object: 'page', parent: { type: 'page_id', page_id: 'parent' }, properties: { title: { type: 'title', title: [{ plain_text: 'ArrayList' }] } } }
  ];
  const result = a.classifyWorkspaceHierarchy(items);
  const parent = result.topics.find(topic => topic.title === 'Collections');
  const child = result.topics.find(topic => topic.title === 'ArrayList');
  assert.equal(child.category, 'Java');
  assert.equal(child.parentTopicId, parent.id);
  assert.equal(child.notionParentPageId, 'parent');
});
test('new nested note is created below its Notion parent page', async () => {
  let payload;
  const a = api(async (url, options) => {
    payload = JSON.parse(options.body);
    return response({ id: 'child-page', url: 'https://notion.so/child-page' });
  });
  await a.syncTopic('token', 'database', { title: 'Child', category: 'Java', notes: '', status: 'todo' }, {}, {}, null, true, 'parent-page', 'page');
  assert.equal(payload.parent.type, 'page_id');
  assert.equal(payload.parent.page_id.replaceAll('-', ''), 'parentpage');
});
test('existing note uses the move endpoint when its parent changes', async () => {
  const calls = [];
  const a = api(async (url, options = {}) => {
    calls.push([url, options]);
    if (url.endsWith('/pages/topic')) return response({ id: 'topic', parent: { type: 'page_id', page_id: 'old-parent' }, url: 'https://notion.so/topic', last_edited_time: new Date().toISOString() });
    if (url.endsWith('/move')) return response({ id: 'topic' });
    if (url.includes('/blocks/topic/children')) return response({ results: [] });
    return response({ id: 'topic', url: 'https://notion.so/topic', last_edited_time: new Date().toISOString() });
  });
  await a.syncTopic('token', null, { notionPageId: 'topic', title: 'Moved', notes: '', status: 'todo' }, {}, {}, null, false, 'new-parent', 'page');
  const move = calls.find(([url]) => url.endsWith('/move'));
  assert.ok(move);
  assert.equal(move[1].method, 'POST');
  assert.equal(move[1].headers['Notion-Version'], '2025-09-03');
});
