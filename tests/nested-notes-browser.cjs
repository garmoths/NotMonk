const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  const page = await browser.newPage();
  await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(pathToFileURL(resolve('index.html')).href);
  await page.evaluate(() => {
    const category = state.categories[0];
    state.selectedCategory = category;
    state.activeTab = 'modules';
    state.topics = [
      { id: 'root', title: 'Root note', category, status: 'todo', notes: '', updatedAt: Date.now() },
      { id: 'child', parentTopicId: 'root', title: 'Child note', category, status: 'todo', notes: '', updatedAt: Date.now() }
    ];
    render();
  });
  await page.evaluate(() => openCategory(state.categories[0]));
  if (await page.locator('#tab-modules').evaluate(element => element.classList.contains('active'))) throw new Error('Areas tab stayed pressed inside an area');
  await page.locator('#tab-modules').click();
  if (await page.evaluate(() => state.selectedCategory !== null)) throw new Error('Areas tab did not return to the first page');
  await page.evaluate(() => openCategory(state.categories[0]));
  const rows = page.locator('#note-tree-list .note-tree-row');
  if (await rows.count() !== 2) throw new Error('Nested page tree did not render');
  if (!(await page.locator('#topic-dialog').evaluate(element => element.classList.contains('inline-document')))) throw new Error('Editor did not open in the right pane');
  if (await page.locator('#topic-dialog').evaluate(element => element.matches(':modal'))) throw new Error('Area editor opened as a popup');
  await rows.nth(0).locator('.note-tree-add-child').click();
  await page.waitForFunction(() => state.topics.some(topic => topic.title === 'Başlıksız' && topic.parentTopicId === 'root'));
  if (await rows.count() !== 3) throw new Error('Child page did not appear immediately below its parent');
  await rows.nth(0).locator('.note-tree-toggle').click();
  if (await rows.count() !== 1) throw new Error('Parent page did not collapse its child pages');
  await rows.nth(0).locator('.note-tree-toggle').click();
  if (await rows.count() !== 3) throw new Error('Parent page did not expand its child pages');
  if (await page.locator('#parent-topic').inputValue() !== 'root') throw new Error('Add child did not preselect parent');
  await page.locator('#title').fill('Grandchild');
  await page.waitForFunction(() => state.topics.some(topic => topic.title === 'Grandchild' && topic.parentTopicId === 'root'));
  const syncResult = await page.evaluate(async () => {
    const category = state.selectedCategory;
    const parent = state.topics.find(topic => topic.id === 'root');
    const child = state.topics.find(topic => topic.title === 'Grandchild');
    parent.notionPageId = null;
    child.notionPageId = null;
    state.notionToken = 'test-token';
    state.areaMapping[category] = { id: 'area-page', type: 'page' };
    const calls = [];
    const original = NotionAPI.syncTopic;
    NotionAPI.syncTopic = async (...args) => {
      const topic = args[2];
      const parentId = args[7];
      calls.push({ title: topic.title, parentId });
      return { notionPageId: topic.id === 'root' ? 'remote-root' : 'remote-child', notionUrl: `https://notion.so/${topic.id}` };
    };
    try { await syncTopicToNotion(child, true); } finally { NotionAPI.syncTopic = original; }
    return { calls, childPageId: child.notionPageId };
  });
  if (syncResult.calls.length !== 2 || syncResult.calls[1].parentId !== 'remote-root' || syncResult.childPageId !== 'remote-child') throw new Error('Child page did not sync below its Notion parent');
  const dedupeResult = await page.evaluate(() => {
    const root = state.topics.find(topic => topic.id === 'root');
    const duplicate = { ...root, id: 'duplicate-root', notionPageId: 'remote-root', notionUrl: 'https://notion.so/remote-root' };
    root.notionPageId = null;
    const child = state.topics.find(topic => topic.title === 'Grandchild');
    child.parentTopicId = duplicate.id;
    state.topics.push(duplicate);
    const removed = reconcileTopicDuplicates();
    return { removed, roots: state.topics.filter(topic => topic.title === 'Root note').length, childParent: child.parentTopicId, rootId: root.id };
  });
  if (dedupeResult.removed !== 1 || dedupeResult.roots !== 1 || dedupeResult.childParent !== dedupeResult.rootId) throw new Error('Duplicate reconciliation failed');
  if (process.env.SCREENSHOT) await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true });
  console.log('PASS: nested tree, indentation and direct child creation');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
