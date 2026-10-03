const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const memory = {};
    globalThis.__recoveryStorage = memory;
    globalThis.chrome = {
      runtime: { lastError: null },
      storage: { local: {
        get(keys, callback) {
          const result = {};
          for (const key of keys) if (key in memory) result[key] = memory[key];
          callback(result);
        },
        set(values, callback) { Object.assign(memory, values); callback?.(); }
      } }
    };
  });
  await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.waitForFunction(() => globalThis.__recoveryStorage?.recoveryApplied === 'brave-2026-09-18-1850');
  const result = await page.evaluate(() => ({
    storedTopics: __recoveryStorage.topics,
    stateTopics: state.topics,
    snapshot: NOTMONK_RECOVERY_SNAPSHOT
  }));
  const snapshotChars = result.snapshot.reduce((sum, topic) => sum + (topic.notes || '').length, 0);
  if (result.snapshot.length !== 74 || snapshotChars < 139000) throw new Error('Recovery snapshot is incomplete');
  if (!result.storedTopics?.length || result.storedTopics.length !== result.stateTopics.length) throw new Error('Recovered topics were not persisted');
  for (const backup of result.snapshot) {
    if (!(backup.notes || '').trim()) continue;
    const candidates = result.stateTopics.filter(topic => topic.title === backup.title && topic.category === backup.category);
    if (!candidates.some(topic => (topic.notes || '').includes(backup.notes))) throw new Error(`Backup note was not retained: ${backup.title}`);
  }
  console.log(`PASS: recovered ${result.snapshot.length} topics and ${snapshotChars} note characters without dropping current notes`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
