// Wix CLI variant (Wix-hosted). Use this as the plugin's element file after
// `wix generate` (extensionType SITE_PLUGIN). Copy ../src/config.js,
// ../src/headboard-core.js and ../src/headboard-element.js next to this file.
// The CLI calls customElements.define() with the builder's tagName - do NOT call it here.
//
// In CLI apps, SDK modules are called directly (no createClient, no token
// injector): the Wix runtime provides the visitor's auth context.
// Required app permission: SCOPE.STORES.PRODUCT_READ ("Read Products").
import { productsV3 } from '@wix/stores';
import { media } from '@wix/sdk';
import { window as wixWindow } from '@wix/site-window';
// @ts-ignore - plain JS module
import { HEADBOARDS, SETTINGS } from './config.js';
// @ts-ignore - plain JS module
import { createHeadboardPreviewClass } from './headboard-element.js';

function toImageUrl(value: unknown): string {
  const source =
    typeof value === 'string'
      ? value
      : (value as { uri?: string; url?: string } | null | undefined)?.uri ||
        (value as { url?: string } | null | undefined)?.url;
  if (!source) return '';
  return source.startsWith('wix:image://') ? media.getImageUrl(source).url : source;
}

const NoahHeadboardPreview = createHeadboardPreviewClass({
  headboards: HEADBOARDS,
  settings: SETTINGS,
  fetchProduct: (productId: string) =>
    productsV3.getProduct(productId, { fields: ['PRODUCT_CHOICES_DISPLAY_IMAGE'] }),
  toImageUrl,
  // Placeholder only inside the editor canvas; nothing on the live site / preview.
  isEditor: async () => (await wixWindow.viewMode()) === 'Editor',
  log: (msg: string, err?: unknown) => console.warn(msg, err ?? ''),
});

export default NoahHeadboardPreview;
