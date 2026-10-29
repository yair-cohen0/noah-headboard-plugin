// REFERENCE ONLY - `wix generate` creates the real builder file with a fresh id.
// After generating, make sure it contains these placements (first = preferred)
// and that `element` points at noah-headboard-preview.tsx. Install `@wix/site-window`
// and `@wix/stores` (`npm i @wix/site-window @wix/stores`) in the CLI project.
import { extensions } from '@wix/astro/builders';

export default extensions.sitePlugin({
  id: '<generated-by-wix-generate>',
  name: 'Noah Headboard Preview',
  marketData: {
    name: 'תמונת ראש מיטה',
    description: 'מציג תמונה גדולה של ראש המיטה שנבחר בעמוד המוצר',
    logoUrl: '{{BASE_URL}}/noah-headboard-preview-logo.svg',
  },
  placements: [
    // New product page (Catalog V3) - next to the gallery
    { appDefinitionId: 'a0c68605-c2e7-4c8d-9ea1-767f9770e087', widgetId: '6a25b678-53ec-4b37-a190-65fcd1ca1a63', slotId: 'product-page-media-1' },
    // New product page - fallback in the details column
    { appDefinitionId: 'a0c68605-c2e7-4c8d-9ea1-767f9770e087', widgetId: '6a25b678-53ec-4b37-a190-65fcd1ca1a63', slotId: 'product-page-details-2' },
    // Old product page (only if the store ever runs the old page)
    { appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd', widgetId: '13a94f09-2766-3c40-4a32-8edb5acdd8bc', slotId: 'product-page-media-1' },
  ],
  installation: { autoAdd: true },
  tagName: 'noah-headboard-preview',
  element: './extensions/site/plugins/noah-headboard-preview/noah-headboard-preview.tsx',
  settings: './extensions/site/plugins/noah-headboard-preview/noah-headboard-preview.panel.tsx',
});
