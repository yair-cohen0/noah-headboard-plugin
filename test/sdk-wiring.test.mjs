// Verifies (offline, fetch mocked) that the SDK call used by the SDK/CLI builds
// sends GET .../stores/v3/products/{id} with fields=PRODUCT_CHOICES_DISPLAY_IMAGE,
// and that a wix:image:// displayImage converts to a browser URL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, media } from '@wix/sdk';
import { getProduct } from '@wix/auto_sdk_stores_products-v-3';
import { choiceImagesFromProduct, normalizeText } from '../src/headboard-core.js';
import { SETTINGS } from '../src/config.js';

const PRODUCT_ID = '021365c7-89a6-4454-ad20-61f9d301b469';

test('getProduct request shape + displayImage conversion', async () => {
  const calls = [];
  const fakeResponse = {
    product: {
      id: PRODUCT_ID,
      name: 'H44',
      options: [
        {
          id: 'opt1',
          name: 'ראש מיטה',
          optionRenderType: 'SWATCH_CHOICES',
          choicesSettings: {
            choices: [
              { choiceId: 'a', name: 'ללא ראש מיטה', choiceType: 'CHOICE_TEXT' },
              {
                choiceId: 'b',
                name: 'ראש מיטה H130',
                choiceType: 'CHOICE_TEXT',
                displayImage: {
                  id: 'a6123f_afd6978356194337a029218582450284~mv2.jpg',
                  url: 'https://static.wixstatic.com/media/a6123f_afd6978356194337a029218582450284~mv2.jpg',
                  height: 146,
                  width: 292,
                },
              },
            ],
          },
        },
      ],
    },
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init && init.method });
    return new Response(JSON.stringify(fakeResponse), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const client = createClient({
      auth: { getAuthHeaders: async () => ({ headers: { Authorization: 'test-token' } }) },
      modules: { productsV3: { getProduct } },
    });
    const product = await client.productsV3.getProduct(PRODUCT_ID, { fields: ['PRODUCT_CHOICES_DISPLAY_IMAGE'] });
    assert.equal(calls.length, 1);
    console.log('request:', calls[0].method || 'GET', calls[0].url);
    assert.match(calls[0].url, /\/stores\/v3\/products\/021365c7-89a6-4454-ad20-61f9d301b469/);
    assert.match(calls[0].url, /fields=PRODUCT_CHOICES_DISPLAY_IMAGE/);

    const raw = product.options[0].choicesSettings.choices[1].displayImage;
    console.log('SDK displayImage value:', JSON.stringify(raw));
    const toUrl = (v) => {
      const s = typeof v === 'string' ? v : v && (v.uri || v.url);
      if (!s) return '';
      return s.startsWith('wix:image://') ? media.getImageUrl(s).url : s;
    };
    const map = choiceImagesFromProduct(product, SETTINGS, toUrl);
    const hit = map.get(normalizeText('ראש מיטה H130'));
    console.log('resolved URL:', hit && hit.url);
    assert.ok(hit && /^https:\/\/static\.wixstatic\.com\/media\/a6123f_afd6978356194337a029218582450284~mv2\.jpg/.test(hit.url));
  } finally {
    globalThis.fetch = realFetch;
  }
});
