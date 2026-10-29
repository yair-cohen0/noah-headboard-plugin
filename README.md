# Noah headboard preview: Wix Stores product-page site plugin

On a bed-base product page, when a shopper picks a headboard in the **"ראש מיטה"** option,
this plugin shows a larger picture of that headboard next to the gallery, captioned
**"ראש המיטה שבחרתם: H130"**. It shows nothing before a pick, for **"ללא ראש מיטה"**, or on
products without that option. It is Hebrew-only, RTL and responsive. The image is lazy-loaded
and has Hebrew alt text.

It is a vanilla web component (`<noah-headboard-preview>`, shadow DOM, no framework).

## Files

| Path | What it is |
|---|---|
| `src/config.js` | **The file you edit.** The headboard code → image map, plus the Hebrew texts. |
| `src/headboard-core.js` | Pure logic. It parses `selectedChoices`, finds the headboard choice, extracts the code and reads choice images from a Catalog V3 product. |
| `src/headboard-element.js` | The custom element class factory: rendering, live updates and the editor placeholder. |
| `src/entry-standalone.js` | Self-hosted entry. It needs no Wix API calls and gets images from `config.js` only. |
| `src/entry-standalone-sdk.js` | Self-hosted entry that reads each choice's `displayImage` from the product through the Wix SDK. `config.js` is the fallback. |
| `cli/noah-headboard-preview.tsx` | Element file for the **Wix CLI** (Wix-hosted) variant. |
| `cli/noah-headboard-preview.extension.reference.ts` | Reference placements and tag name for the CLI builder file. |
| `dist/noah-headboard-preview.js` | Prebuilt self-hosted bundle, ~17 KB and readable. It is the script to host. |
| `build.mjs` | Builds `dist/`. `npm run build`, or `APP_ID=<id> npm run build:sdk` for the SDK bundle. |
| `test/` | Unit tests (`node:test`), a mocked SDK-wiring test and a headless-Chromium test. |

## How Wix feeds the plugin (product page plugin API)

* Wix sets the plugin API values **as JS properties** with the same names: `productId`,
  `selectedVariantId`, `selectedChoices`, `quantity` and `customText`. Each value is **also
  set as a kebab-case attribute** (`product-id`, `selected-choices`, ...). Non-primitive
  values become JSON strings in attributes. A property can be set **before** the script
  upgrades the element. The element handles all three cases.
* `selectedChoices` = `{ "<option name>": "<choice name>", ... }`, for example
  `{"מידה":"160x200","ראש מיטה":"ראש מיטה H130"}`. A product without the option has no
  key. This is safe because the plugin ignores products without the option.
* Sources:
  * [Product page slots and API](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/site-extensions/site-plugins/supported-wix-app-pages/wix-stores/wix-stores-product-page)
  * [Self-managed site plugin (custom element)](https://dev.wix.com/docs/build-apps/develop-your-app/develop-a-self-managed-app/supported-extensions/site-extensions/site-widgets-and-plugins/add-site-plugin-extensions-with-custom-elements)

## Adding a headboard (H129, H119, H107, H84, H82, H79, H87 ...)

1. In each bed base, add the choice to the "ראש מיטה" option. Name it **"ראש מיטה H129"**,
   keeping the code letters and digits in the name. Give it a picture swatch.
2. If you use the **CLI or SDK build**, step 1 is all you need. The plugin reads the swatch
   picture from the product.
3. If you use the **basic build**, also add one line to `src/config.js`:
   `H129: { image: 'https://static.wixstatic.com/media/....jpg', width: 1200, height: 600 },`
   Then run `npm run build` and re-upload `dist/noah-headboard-preview.js`. You can also edit
   the same block at the top of the dist file directly.

The 18 bases need no per-product setup. Any product whose option is called "ראש מיטה" works.

## Install: option A, Wix CLI app (recommended, Wix-hosted, no public repo)

Run this on a computer that can reach wix.com. It needs Node.js 24.22.1 or newer, Git, and
the owner's Wix login. [Quick start](https://dev.wix.com/docs/build-apps/develop-your-app/develop-an-app-with-the-cli/get-started/quick-start-a-wix-cli-app).

1. Create the app with `npm create @wix/new@latest app` → **Create a new Wix App**. Name it
   for example "Noah Headboard Preview". This creates a private app in the owner's account.
2. In the project, generate the plugin with
   `npx wix generate`. Pick **Site Plugin** → **Wix Stores** →
   **New product page** → `product-page-media-1`. Or run it non-interactively:
   `npx wix schema generate --type SITE_PLUGIN` shows the exact `slotId` values to pass to
   `npx wix generate --params '{...}'`.
3. Replace the generated element `.tsx` with `cli/noah-headboard-preview.tsx`. Copy
   `src/config.js`, `src/headboard-core.js` and `src/headboard-element.js` into the same
   folder. In the generated `*.extension.ts`, set `tagName: 'noah-headboard-preview'` and
   add the placements from `cli/noah-headboard-preview.extension.reference.ts`.
4. Run `npm i @wix/stores @wix/sdk @wix/site-window`.
5. In the app dashboard, go to **Permissions** → **Add Permissions** and add **Read Products**
   (`SCOPE.STORES.PRODUCT_READ`).
6. Test with `wix dev`. Pick a **development site**, not the live store. Open the
   product page in the editor, click the **Plugin** icon, add the plugin and preview.
7. Release with `wix build` and `wix release`. Then go to **app dashboard → Distribute →
   Install on Site** → Noah's site → **Agree & Add**.
8. In the Harmony editor, open **Store Pages → Product Page**. If the plugin was not auto-added
   to `product-page-media-1`, add it with the **Plugin** icon. Then publish the site.

## Install: option B, self-managed custom element (any static HTTPS host)

1. Host `dist/noah-headboard-preview.js` at a stable HTTPS URL. The host must serve the file
   with a JavaScript MIME type and allow cross-origin loading.
2. In [Custom Apps](https://manage.wix.com/account/custom-apps), create an app, then go to
   **Extensions → Create Extension → Site Plugin → + Create → Custom Element**:
   * **Plugin name**: תמונת ראש מיטה
   * **Tag name**: `noah-headboard-preview` (exact)
   * **Script URL**: the hosted URL
   * **Which Wix app does it extend?**: Wix Stores
   * **Slots**, in priority order: new product page `product-page-media-1`
     (`fba51e0c-08ae-4c26-8276-b4256927b374`), then `product-page-details-2`
     (`6b5db632-c35f-4cf9-93d8-bfb36e241d29`) as a fallback.
   * **Add automatically**: yes. **Settings action button**: not needed, because the plugin
     has no settings panel. The form has no size fields: the plugin takes the slot's width
     and its own content height.
3. Save, then **Distribute → Install on Site**. Add the plugin in the editor if needed, then
   publish.
4. *(Optional SDK variant)* Build with `APP_ID=<your app id> npm run build:sdk` and host
   `dist/noah-headboard-preview.sdk.js` instead (~94 KB). Add the **Read Products**
   permission to the app. Pictures then come from the product's choice swatches.

## Styling knobs

These are CSS custom properties with defaults in `STYLE` in `src/headboard-element.js`:

* `--noah-hp-max-width` (560px)
* `--noah-hp-pad-start` / `--noah-hp-pad-end` (0). Use these if `product-page-media-1`
  overlaps the gallery thumbnails on desktop, which the Wix docs warn about.
* `--noah-hp-radius` (8px)
* `--noah-hp-caption-size` / `--noah-hp-caption-size-mobile` (15px / 14px)

Harmony has no site code, so the way to change these is to edit the defaults in `STYLE` and
rebuild. Text follows the page's font and colour.

## Tests

```bash
npm install
npm run build
APP_ID=00000000-0000-0000-0000-000000000000 npm run build:sdk   # dummy id, test only; do not host it
npm test
```

`npm test` runs three suites:

* The core unit tests.
* An offline SDK-wiring test. It checks that `getProduct` sends
  `fields=PRODUCT_CHOICES_DISPLAY_IMAGE` and that a `wix:image://` value converts to a
  static.wixstatic.com URL.
* A headless-Chromium test. It covers props set before the upgrade, attribute-only updates,
  live changes, "ללא", irrelevant products, an unknown code, an image 404, the editor
  placeholder, mobile width, the product-image path and the SDK bundle fallback.

## Gotchas

* **Do not set attributes in the constructor.** `document.createElement` throws "The result
  must not have attributes" if you do. A test caught this, and the element now sets
  `hidden` in `connectedCallback`.
* **Swatch photos are small (292×146).** Shown at slot width, they are upscaled and look
  soft. Upload headboard photos at least 1200 px wide, either as the swatch or in
  `config.js`.
* **Editor detection.** The CLI build uses `viewMode()` and shows the placeholder only when
  it is `"Editor"`. The self-hosted build guesses from the host name
  (`*.editor|studio|harmony.wix.com`). If that guess misses, the plugin is invisible in the
  editor until a choice is made, but it still works on the live site.
* **Choice names must contain the code** (H130 ...) for the caption and the `config.js`
  lookup. The SDK/CLI builds match the product image by the full choice name.
* **The hidden plugin takes no height**, but the slot may add its own spacing.
