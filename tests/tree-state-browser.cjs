const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
  try {
    for (const extensionStorage of [false, true]) {
      const context = await browser.newContext();
      if (extensionStorage) await context.addInitScript(() => {
        globalThis.chrome = { runtime: {}, storage: { local: {
          get(keys, callback) {
            const result = {};
            for (const key of Array.isArray(keys) ? keys : [keys]) {
              const value = localStorage.getItem(key);
              if (value !== null) result[key] = JSON.parse(value);
            }
            setTimeout(() => callback(result), 0);
          },
          set(values, callback) {
            Object.entries(values).forEach(([key,value]) => localStorage.setItem(key, JSON.stringify(value)));
            setTimeout(callback, 0);
          }
        }, onChanged: { addListener() {} } } };
      });
      let page = await context.newPage();
      const url = pathToFileURL(resolve('index.html')).href;
      await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(url);
      await page.waitForFunction(() => state.topics.length > 0);
      await page.evaluate(async () => {
        const category = state.categories[0];
        state.topics = [
          {id:'root',title:'Root',category,status:'todo',notes:''},
          {id:'child',title:'Child',parentTopicId:'root',category,status:'todo',notes:''},
          {id:'grandchild',title:'Grandchild',parentTopicId:'child',category,status:'todo',notes:''}
        ];
        await save();
        openCategory(category);
      });
      const rows = () => page.locator('#note-tree-list .note-tree-row');
      await rows().nth(1).locator('.note-tree-toggle').click();
      await rows().nth(0).locator('.note-tree-toggle').click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('collapsedNoteIds')).length === 2);
      await page.reload();
      await page.waitForFunction(() => state.topics.length > 0);
      await page.evaluate(() => openCategory(state.categories[0]));
      assert.equal(await rows().count(), 1);
      assert.equal(await rows().first().locator('.note-tree-toggle').getAttribute('aria-expanded'), 'false');
      await rows().first().locator('.note-tree-toggle').click();
      assert.equal(await rows().count(), 2);
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('collapsedNoteIds')).length === 1);
      await page.close();
      page = await context.newPage();
      await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(url);
      await page.waitForFunction(() => state.topics.length > 0);
      await page.evaluate(() => openCategory(state.categories[0]));
      assert.equal(await rows().count(), 2);
      await page.evaluate(async () => {
        await createTreePage(state.topics.find(t=>t.id==='child'));
      });
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('collapsedNoteIds')).length === 0);
      await page.reload();
      await page.waitForFunction(() => state.topics.length > 0);
      await page.evaluate(() => openCategory(state.categories[0]));
      assert.equal(await rows().count(), 4);
      await context.close();
    }
    console.log('PASS: collapse/expand survives reload and reopening; nested state and child creation; local and extension storage');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
