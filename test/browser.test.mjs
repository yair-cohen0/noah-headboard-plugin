// Browser test in headless Chromium (pre-installed Playwright).
// Simulates how Wix feeds a site plugin: JS properties (incl. before the element
// is upgraded) and kebab-case attributes with JSON-stringified objects.
// Run: node test/browser.test.mjs   (screenshots go to $SHOTS_DIR or ./test/shots)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASIC = fs.readFileSync(path.join(ROOT, 'dist/noah-headboard-preview.js'), 'utf8');
const SDK_PATH = path.join(ROOT, 'dist/noah-headboard-preview.sdk.js');
const SHOTS = process.env.SHOTS_DIR || path.join(ROOT, 'test/shots');
fs.mkdirSync(SHOTS, { recursive: true });

const PRODUCT_ID = '021365c7-89a6-4454-ad20-61f9d301b469';
const H = 'ראש מיטה';
const svg = (label, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="292" height="146"><rect width="292" height="146" fill="${color}"/><text x="146" y="85" font-size="36" text-anchor="middle" fill="#fff">${label}</text></svg>`;
const IMAGES = {
  a6123f_afd6978356194337a029218582450284: svg('H130', '#7a5c3e'),
  a6123f_d4142ca3fd4c41bfb0e877547e3222dc: svg('H131', '#3e5c7a'),
  a6123f_27599703fc0f44af85f3846cde2131f9: svg('H120', '#5c7a3e'),
};

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (err) {
    results.push(['FAIL', name, err.message.split('\n')[0]]);
  }
}

const PAGE = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:Arial,sans-serif;margin:0;padding:16px;color:#222}
.layout{display:flex;gap:24px;flex-wrap:wrap}.gallery{flex:1 1 360px;min-height:200px;background:#eee;display:flex;align-items:center;justify-content:center}
.slot{flex:1 1 360px;outline:1px dashed #bbb}</style></head>
<body><div class="layout"><div class="gallery">גלריה</div><div class="slot" id="slot"></div></div></body></html>`;

async function newPage(browser, origin, { failImage } = {}) {
  const context = await browser.newContext({ locale: 'he-IL', viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://static.wixstatic.com/**', (route) => {
    const url = route.request().url();
    const key = Object.keys(IMAGES).find((k) => url.includes(k));
    if (!key || (failImage && url.includes(failImage))) return route.fulfill({ status: 404, body: 'nope' });
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: IMAGES[key] });
  });
  await page.route(origin + '**', (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: PAGE }));
  await page.goto(origin + 'product-page/h44');
  return { page, context, errors };
}

const state = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('noah-headboard-preview');
    const sr = el.shadowRoot;
    const fig = sr.querySelector('figure');
    const img = sr.querySelector('img');
    return {
      hostHidden: el.hidden,
      visible: el.getBoundingClientRect().height > 0,
      dataState: el.dataset.state,
      cardHidden: fig.hidden,
      caption: sr.querySelector('figcaption').textContent,
      src: img.getAttribute('src'),
      alt: img.alt,
      loading: img.getAttribute('loading'),
      loaded: img.complete && img.naturalWidth > 0,
      direction: getComputedStyle(el).direction,
      placeholderShown: !sr.querySelector('.placeholder').hidden,
      placeholderText: sr.querySelector('.placeholder').textContent,
    };
  });

const settle = (page) => page.waitForTimeout(150);
const setChoices = (page, choices) =>
  page.evaluate((c) => {
    document.querySelector('noah-headboard-preview').selectedChoices = c;
  }, choices);
const setAttrChoices = (page, choices) =>
  page.evaluate((c) => {
    document.querySelector('noah-headboard-preview').setAttribute('selected-choices', JSON.stringify(c));
  }, choices);

const browser = await chromium.launch();
try {
  // ---------------- basic bundle, live-site origin ----------------
  const site = await newPage(browser, 'https://noah-test.wixsite.com/');
  const { page } = site;

  await step('properties set BEFORE the script loads are picked up on upgrade', async () => {
    await page.evaluate(({ pid, H }) => {
      const el = document.createElement('noah-headboard-preview');
      el.productId = pid; // own props on the not-yet-upgraded element
      el.selectedChoices = { 'מידה': '160x200', [H]: 'ראש מיטה H130', 'צבע הבד': 'אפור' };
      document.getElementById('slot').appendChild(el);
    }, { pid: PRODUCT_ID, H });
    await page.addScriptTag({ content: BASIC });
    await page.waitForFunction(() => {
      const i = document.querySelector('noah-headboard-preview')?.shadowRoot?.querySelector('img');
      return i && i.complete && i.naturalWidth > 0;
    });
    const s = await state(page);
    assert.equal(s.hostHidden, false);
    assert.equal(s.caption, 'ראש המיטה שבחרתם: H130');
    assert.equal(s.alt, 'תמונה של ראש מיטה H130');
    assert.match(s.src, /a6123f_afd6978356194337a029218582450284/);
    assert.equal(s.loading, 'lazy');
    assert.equal(s.direction, 'rtl');
    assert.ok(s.loaded);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, 'desktop-h130.png') });

  await step('live update via property: H130 -> H120', async () => {
    await setChoices(page, { 'מידה': '160x200', [H]: 'ראש מיטה H120' });
    await settle(page);
    const s = await state(page);
    assert.equal(s.caption, 'ראש המיטה שבחרתם: H120');
    assert.match(s.src, /a6123f_27599703fc0f44af85f3846cde2131f9/);
  });

  await step('"ללא ראש מיטה" hides the plugin (zero height)', async () => {
    await setChoices(page, { 'מידה': '160x200', [H]: 'ללא ראש מיטה' });
    await settle(page);
    const s = await state(page);
    assert.equal(s.hostHidden, true);
    assert.equal(s.visible, false);
    assert.equal(s.dataState, 'none');
  });

  await step('attribute-only update (JSON string, kebab-case) shows H131', async () => {
    await setAttrChoices(page, { 'מידה': '160x200', [H]: 'ראש מיטה H131' });
    await settle(page);
    const s = await state(page);
    assert.equal(s.caption, 'ראש המיטה שבחרתם: H131');
    assert.equal(s.hostHidden, false);
  });

  await step('rapid successive updates: last one wins', async () => {
    await page.evaluate((H) => {
      const el = document.querySelector('noah-headboard-preview');
      el.selectedChoices = { [H]: 'ראש מיטה H130' };
      el.selectedChoices = { [H]: 'ראש מיטה H131' };
      el.selectedChoices = { [H]: 'ראש מיטה H120' };
    }, H);
    await settle(page);
    assert.equal((await state(page)).caption, 'ראש המיטה שבחרתם: H120');
  });

  await step('nothing picked yet -> hidden', async () => {
    await setChoices(page, { 'מידה': '160x200', [H]: '' });
    await settle(page);
    const s = await state(page);
    assert.equal(s.hostHidden, true);
    assert.equal(s.dataState, 'empty');
  });

  await step('product without the headboard option -> hidden', async () => {
    await setChoices(page, { 'מידה': '90x190', 'צבע הבד': 'בז׳' });
    await settle(page);
    const s = await state(page);
    assert.equal(s.hostHidden, true);
    assert.equal(s.dataState, 'irrelevant');
  });

  await step('headboard code missing from the map (H129) -> hidden, no broken image', async () => {
    await setChoices(page, { [H]: 'ראש מיטה H129' });
    await settle(page);
    const s = await state(page);
    assert.equal(s.hostHidden, true);
    assert.equal(s.dataState, 'selected');
  });

  await step('selectedChoices undefined / garbage attribute -> hidden, no exception', async () => {
    await page.evaluate(() => {
      const el = document.querySelector('noah-headboard-preview');
      el.selectedChoices = undefined;
      el.setAttribute('selected-choices', '{not json');
    });
    await settle(page);
    assert.equal((await state(page)).hostHidden, true);
  });

  await step('mobile width (375px): image fits, no horizontal overflow', async () => {
    await page.setViewportSize({ width: 375, height: 800 });
    await setChoices(page, { [H]: 'ראש מיטה H131' });
    await page.waitForFunction(() => {
      const i = document.querySelector('noah-headboard-preview').shadowRoot.querySelector('img');
      return i.complete && i.naturalWidth > 0;
    });
    const dims = await page.evaluate(() => {
      const el = document.querySelector('noah-headboard-preview');
      const img = el.shadowRoot.querySelector('img').getBoundingClientRect();
      return { imgW: img.width, imgH: img.height, docW: document.documentElement.scrollWidth, vw: innerWidth };
    });
    assert.ok(dims.docW <= dims.vw, 'no horizontal scroll');
    assert.ok(dims.imgW > 0 && dims.imgW <= dims.vw);
    assert.ok(Math.abs(dims.imgW / dims.imgH - 2) < 0.05, 'keeps 2:1 aspect ratio');
    await page.screenshot({ path: path.join(SHOTS, 'mobile-h131.png'), fullPage: true });
  });

  await step('no page errors on the live-site run', async () => {
    assert.deepEqual(site.errors, []);
  });
  await site.context.close();

  // ---------------- image load failure ----------------
  const broken = await newPage(browser, 'https://noah-test.wixsite.com/', { failImage: 'a6123f_27599703fc0f44af85f3846cde2131f9' });
  await step('image 404 -> plugin hides itself', async () => {
    await broken.page.addScriptTag({ content: BASIC });
    await broken.page.evaluate(({ H }) => {
      const el = document.createElement('noah-headboard-preview');
      document.getElementById('slot').appendChild(el);
      el.selectedChoices = { [H]: 'ראש מיטה H120' };
    }, { H });
    await broken.page.waitForTimeout(400);
    assert.equal((await state(broken.page)).hostHidden, true);
  });
  await broken.context.close();

  // ---------------- editor heuristic ----------------
  const editor = await newPage(browser, 'https://someone-noah.harmony.wix.com/');
  await step('editor host (*.harmony.wix.com): placeholder shown when nothing is picked', async () => {
    await editor.page.addScriptTag({ content: BASIC });
    await editor.page.evaluate(() => document.getElementById('slot').appendChild(document.createElement('noah-headboard-preview')));
    await editor.page.waitForTimeout(200);
    const s = await state(editor.page);
    assert.equal(s.placeholderShown, true);
    assert.equal(s.hostHidden, false);
    assert.equal(s.placeholderText, 'כאן תוצג תמונת ראש המיטה שהלקוח בוחר');
    await editor.page.screenshot({ path: path.join(SHOTS, 'editor-placeholder.png') });
  });
  await editor.context.close();

  // ---------------- product-data path (mocked fetchProduct) ----------------
  {
    const { build } = await import('esbuild');
    const out = await build({ entryPoints: [path.join(ROOT, 'test/fixtures/mock-product-entry.js')], bundle: true, write: false, format: 'iife' });
    const MOCK = out.outputFiles[0].text;
    const mock = await newPage(browser, 'https://noah-test.wixsite.com/');
    await step('product displayImage is preferred over the config map (H130 -> product image)', async () => {
      await mock.page.addScriptTag({ content: MOCK });
      await mock.page.evaluate(({ pid, H }) => {
        const el = document.createElement('noah-headboard-preview');
        el.setAttribute('product-id', pid);
        document.getElementById('slot').appendChild(el);
        el.selectedChoices = { [H]: 'ראש מיטה H130' };
      }, { pid: PRODUCT_ID, H });
      await mock.page.waitForTimeout(300);
      const s = await state(mock.page);
      assert.equal(s.caption, 'ראש המיטה שבחרתם: H130');
      assert.match(s.src, /a6123f_d4142ca3fd4c41bfb0e877547e3222dc/, 'uses the product swatch image');
    });
    await step('headboard not in the config map but with a product image (H129) is shown, alt from product', async () => {
      await setChoices(mock.page, { [H]: 'ראש מיטה H129' });
      await mock.page.waitForTimeout(200);
      const s = await state(mock.page);
      assert.equal(s.hostHidden, false);
      assert.equal(s.caption, 'ראש המיטה שבחרתם: H129');
      assert.equal(s.alt, 'ראש מיטה H129 מרופד');
    });
    await step('product is fetched once per page (cached)', async () => {
      await setChoices(mock.page, { [H]: 'ראש מיטה H130' });
      await mock.page.waitForTimeout(150);
      assert.equal(await mock.page.evaluate(() => window.__fetchCount), 1);
    });
    await mock.context.close();
  }

  // ---------------- SDK bundle outside Wix (fallback path) ----------------
  if (fs.existsSync(SDK_PATH)) {
    const sdk = await newPage(browser, 'https://noah-test.wixsite.com/');
    await step('SDK bundle outside a Wix runtime: defines the element and falls back to the config map', async () => {
      await sdk.page.addScriptTag({ content: fs.readFileSync(SDK_PATH, 'utf8') });
      await sdk.page.evaluate(({ pid, H }) => {
        const el = document.createElement('noah-headboard-preview');
        document.getElementById('slot').appendChild(el);
        el.productId = pid;
        el.selectedChoices = { [H]: 'ראש מיטה H130' };
      }, { pid: PRODUCT_ID, H });
      await sdk.page.waitForTimeout(1500);
      const s = await state(sdk.page);
      assert.equal(s.caption, 'ראש המיטה שבחרתם: H130');
      assert.match(s.src || '', /a6123f_afd6978356194337a029218582450284/);
      const hasInjector = await sdk.page.evaluate(
        () => typeof document.querySelector('noah-headboard-preview').accessTokenListener === 'function'
      );
      assert.equal(hasInjector, true, 'accessTokenListener exposed for Wix');
    });
    if (sdk.errors.length) results.push(['INFO', 'SDK bundle page errors outside Wix: ' + sdk.errors.join(' | ')]);
    await sdk.context.close();
  } else {
    results.push(['SKIP', 'SDK bundle not built (run APP_ID=... npm run build:sdk)']);
  }
} finally {
  await browser.close();
}

for (const r of results) console.log(r.join('  '));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.filter((r) => r[0] === 'PASS').length} passed, ${failed} failed. Screenshots: ${SHOTS}`);
process.exit(failed ? 1 : 0);
