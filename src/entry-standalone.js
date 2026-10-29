// Self-hosted build WITHOUT Wix API calls: images come from config.js only.
// Registered as <noah-headboard-preview> (use this exact tag name in the app dashboard).
import { HEADBOARDS, SETTINGS } from './config.js';
import { createHeadboardPreviewClass } from './headboard-element.js';

const TAG = 'noah-headboard-preview';

const NoahHeadboardPreview = createHeadboardPreviewClass({
  headboards: HEADBOARDS,
  settings: SETTINGS,
  log: (msg, err) => console.warn(msg, err || ''),
});

if (!customElements.get(TAG)) customElements.define(TAG, NoahHeadboardPreview);
