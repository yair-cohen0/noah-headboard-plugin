// Self-hosted build WITH Wix API calls: reads each headboard choice's picture
// (displayImage) from the product (Catalog V3); config.js is the fallback.
// Needs: the app ID baked in at build time (APP_ID env var) and the app's
// "Read Products" permission (SCOPE.STORES.PRODUCT_READ).
// Docs: https://dev.wix.com/docs/build-apps/develop-your-app/develop-a-self-managed-app/supported-extensions/site-extensions/site-widgets-and-plugins/authenticate-custom-elements-using-the-wix-client
import { createClient, media } from '@wix/sdk';
import { site } from '@wix/site';
import { getProduct } from '@wix/auto_sdk_stores_products-v-3'; // = productsV3.getProduct in @wix/stores
import { HEADBOARDS, SETTINGS } from './config.js';
import { createHeadboardPreviewClass, looksLikeEditor } from './headboard-element.js';

// Only getProduct is bundled, which keeps the file ~95 KB instead of ~450 KB.
const productsV3 = { getProduct };

const TAG = 'noah-headboard-preview';
// Replaced at build time (esbuild --define). See build.mjs.
const APP_ID = __NOAH_APP_ID__;

const wixClient = createClient({
  auth: site.auth(),
  host: site.host({ applicationId: APP_ID }),
  modules: { productsV3 },
});

function toImageUrl(value) {
  const source = typeof value === 'string' ? value : value && (value.uri || value.url);
  if (!source) return '';
  return source.startsWith('wix:image://') ? media.getImageUrl(source).url : source;
}

const Base = createHeadboardPreviewClass({
  headboards: HEADBOARDS,
  settings: SETTINGS,
  fetchProduct: (productId) =>
    wixClient.productsV3.getProduct(productId, { fields: ['PRODUCT_CHOICES_DISPLAY_IMAGE'] }),
  toImageUrl,
  isEditor: () => looksLikeEditor(window),
  log: (msg, err) => console.warn(msg, err || ''),
});

class NoahHeadboardPreviewSdk extends Base {
  constructor() {
    super();
    // Wix calls this to inject an access token into the client.
    this.accessTokenListener = wixClient.auth.getAccessTokenInjector();
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, NoahHeadboardPreviewSdk);
