// Test-only entry: same element, but fetchProduct returns a fake Catalog V3 product,
// to exercise the "image from the product's choice displayImage" path.
import { HEADBOARDS, SETTINGS } from '../../src/config.js';
import { createHeadboardPreviewClass } from '../../src/headboard-element.js';

window.__fetchCount = 0;
const product = {
  options: [
    { name: 'מידה', choicesSettings: { choices: [{ name: '160x200' }] } },
    {
      name: 'ראש מיטה',
      choicesSettings: {
        choices: [
          { name: 'ללא ראש מיטה' },
          { name: 'ראש מיטה H130', displayImage: 'https://static.wixstatic.com/media/a6123f_d4142ca3fd4c41bfb0e877547e3222dc~mv2.jpg' },
          { name: 'ראש מיטה H129', displayImage: { url: 'https://static.wixstatic.com/media/a6123f_27599703fc0f44af85f3846cde2131f9~mv2.jpg', altText: 'ראש מיטה H129 מרופד' } },
        ],
      },
    },
  ],
};
const El = createHeadboardPreviewClass({
  headboards: HEADBOARDS,
  settings: SETTINGS,
  fetchProduct: async () => {
    window.__fetchCount++;
    await new Promise((r) => setTimeout(r, 50));
    return product;
  },
  isEditor: () => false,
});
customElements.define('noah-headboard-preview', El);
