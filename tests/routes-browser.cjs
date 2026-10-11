const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
  try {
    const page = await browser.newPage();
    const url = pathToFileURL(resolve('index.html')).href;
    await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(url+'#/test-area-e');
    await page.waitForFunction(() => state.selectedCategory?.startsWith('Test area E'));
    await page.reload();
    await page.waitForFunction(() => state.selectedCategory?.startsWith('Test area E'));
    await page.evaluate(() => openCategory(state.categories.find(c=>c.startsWith('Test area D'))));
    assert.equal(new URL(page.url()).hash,'#/test-area-d');
    await page.goBack();
    await page.waitForFunction(() => state.selectedCategory?.startsWith('Test area E'));
    await page.goForward();
    await page.waitForFunction(() => state.selectedCategory?.startsWith('Test area D'));
    await page.locator('#tab-today').click();
    assert.equal(new URL(page.url()).hash,'#/today');
    await page.reload();
    await page.waitForFunction(() => state.activeTab === 'today');
    await page.locator('#tab-modules').click();
    await page.waitForFunction(() => location.hash === '#/' && state.selectedCategory === null);
    await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(url+'#/missing');
    await page.waitForFunction(() => location.hash === '#/' && state.topics.length > 0);
    const slugs = await page.evaluate(() => {
      state.categories.push('Özel Alan', 'Ozel Alan', 'today');
      return [...categoryRoutes().values()];
    });
    assert.equal(new Set(slugs).size,slugs.length);
    console.log('PASS: direct area route, reload, other area navigation, back/forward, today/home, unknown routes and slug collisions');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
