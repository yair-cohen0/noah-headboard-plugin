// The custom element (vanilla web component, shadow DOM, RTL).
// createHeadboardPreviewClass(deps) returns a class; the entry files decide
// whether/how it is registered (self-hosted: customElements.define;
// Wix CLI: export default, Wix defines it).

import {
  resolveSelection,
  configImageFor,
  choiceImagesFromProduct,
  plainImageUrl,
  normalizeText,
  fillTemplate,
} from './headboard-core.js';

const PLUGIN_PROPS = ['productId', 'selectedVariantId', 'selectedChoices', 'quantity', 'customText'];
const OBSERVED_ATTRIBUTES = ['product-id', 'selected-choices', 'selected-variant-id'];

const STYLE = `
:host {
  display: block;
  direction: rtl;
  text-align: start;
  box-sizing: border-box;
  width: 100%;
  padding-inline-start: var(--noah-hp-pad-start, 0px);
  padding-inline-end: var(--noah-hp-pad-end, 0px);
}
:host([hidden]) { display: none !important; }
*, *::before, *::after { box-sizing: border-box; }
.card {
  margin: 0;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: var(--noah-hp-max-width, 560px);
}
.frame {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: var(--noah-hp-radius, 8px);
  background: rgba(127, 127, 127, 0.08);
}
.frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.frame.loaded img { opacity: 1; }
figcaption {
  font: inherit;
  font-size: var(--noah-hp-caption-size, 15px);
  line-height: 1.4;
  color: inherit;
}
.placeholder {
  border: 1px dashed currentColor;
  border-radius: 8px;
  padding: 16px;
  opacity: 0.6;
  font-size: 14px;
  text-align: center;
}
@media (max-width: 750px) {
  .card { max-width: 100%; padding: 8px 0; }
  figcaption { font-size: var(--noah-hp-caption-size-mobile, 14px); }
}
@media (prefers-reduced-motion: reduce) {
  .frame img { transition: none; }
}
`;

/** Heuristic editor detection for the self-hosted build (no Wix SDK). */
export function looksLikeEditor(win) {
  try {
    const host = String((win && win.location && win.location.hostname) || '');
    return /(^|\.)editor\.wix\.com$|\.(editor|studio|harmony)\.wix\.com$/i.test(host);
  } catch {
    return false;
  }
}

/**
 * @param {object} deps
 * @param {object} deps.headboards        code -> { image, width, height, alt }
 * @param {object} deps.settings          see config.js SETTINGS
 * @param {(productId: string) => Promise<object>} [deps.fetchProduct]  Catalog V3 product with
 *        PRODUCT_CHOICES_DISPLAY_IMAGE (optional; without it only the config map is used)
 * @param {(value: any) => string} [deps.toImageUrl]  SDK image value -> browser URL
 * @param {() => boolean | Promise<boolean>} [deps.isEditor]  editor/preview detection
 * @param {(msg: string, err?: any) => void} [deps.log]
 */
export function createHeadboardPreviewClass(deps) {
  const headboards = deps.headboards || {};
  const settings = deps.settings;
  const fetchProduct = deps.fetchProduct || null;
  const toImageUrl = deps.toImageUrl || plainImageUrl;
  const isEditor = deps.isEditor || (() => looksLikeEditor(typeof window !== 'undefined' ? window : undefined));
  const log = deps.log || (() => {});

  // productId -> Promise<Map>, shared by all instances on the page
  const productImageCache = new Map();
  function productImages(productId) {
    if (!fetchProduct || !productId) return Promise.resolve(new Map());
    if (!productImageCache.has(productId)) {
      const p = Promise.resolve()
        .then(() => fetchProduct(productId))
        .then((res) => {
          const product = res && res.product ? res.product : res; // V3 SDK returns the product itself
          return choiceImagesFromProduct(product, settings, toImageUrl);
        })
        .catch((err) => {
          log('noah-headboard-preview: product lookup failed, using config map only', err);
          return new Map();
        });
      productImageCache.set(productId, p);
    }
    return productImageCache.get(productId);
  }

  class NoahHeadboardPreview extends HTMLElement {
    static get observedAttributes() {
      return OBSERVED_ATTRIBUTES;
    }

    constructor() {
      super();
      this._props = {};
      this._renderQueued = false;
      this._renderToken = 0;
      this._editor = false;
      this._currentUrl = '';
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${STYLE}</style>
        <figure class="card" part="card" hidden>
          <div class="frame" part="frame"><img part="image" alt="" loading="lazy" decoding="async"></div>
          <figcaption part="caption" aria-live="polite"></figcaption>
        </figure>
        <div class="placeholder" part="placeholder" hidden></div>`;
      this._card = root.querySelector('.card');
      this._frame = root.querySelector('.frame');
      this._img = root.querySelector('img');
      this._caption = root.querySelector('figcaption');
      this._placeholder = root.querySelector('.placeholder');
      this._img.addEventListener('load', () => this._frame.classList.add('loaded'));
      this._img.addEventListener('error', () => this._onImageError());
      // NOTE: no attributes may be set in the constructor (custom element spec);
      // the initial hidden state is applied in connectedCallback.
    }

    connectedCallback() {
      if (this.dataset.state === undefined) this.hidden = true; // nothing to show until data arrives
      // Wix can set a property before this element's code loads (the element is
      // upgraded later). Re-route any such own property through its setter.
      for (const name of PLUGIN_PROPS) {
        if (Object.prototype.hasOwnProperty.call(this, name)) {
          const value = this[name];
          delete this[name];
          this[name] = value;
        }
      }
      Promise.resolve()
        .then(() => isEditor())
        .then((v) => {
          this._editor = Boolean(v);
          this._queueRender();
        })
        .catch(() => this._queueRender());
      this._queueRender();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === 'selected-choices') this._choicesSource = 'attr';
      this._queueRender();
    }

    // ---- plugin API properties (set by Wix as JS properties) ----
    get productId() { return this._props.productId ?? this.getAttribute('product-id') ?? undefined; }
    set productId(v) { this._props.productId = v; this._queueRender(); }

    get selectedVariantId() { return this._props.selectedVariantId ?? this.getAttribute('selected-variant-id') ?? undefined; }
    set selectedVariantId(v) { this._props.selectedVariantId = v; }

    get selectedChoices() {
      if (this._props.selectedChoices !== undefined) return this._props.selectedChoices;
      return this.getAttribute('selected-choices') ?? undefined;
    }
    set selectedChoices(v) {
      this._props.selectedChoices = v;
      this._choicesSource = 'prop';
      this._queueRender();
    }

    get quantity() { return this._props.quantity; }
    set quantity(v) { this._props.quantity = v; }

    get customText() { return this._props.customText; }
    set customText(v) { this._props.customText = v; }

    // ---- rendering ----
    _queueRender() {
      if (this._renderQueued) return;
      this._renderQueued = true;
      queueMicrotask(() => {
        this._renderQueued = false;
        this._render();
      });
    }

    /** Wix sets both the property and the attribute; the most recently set one wins. */
    _currentChoices() {
      const attr = this.getAttribute('selected-choices');
      const prop = this._props.selectedChoices;
      if (prop === undefined) return attr;
      if (attr === null) return prop;
      return this._choicesSource === 'attr' ? attr : prop;
    }

    _render() {
      const token = ++this._renderToken;
      const selection = resolveSelection(this._currentChoices(), settings);
      this.dataset.state = selection.state;

      if (selection.state !== 'selected') {
        this._hideCard();
        if (this._editor) this._showPlaceholder();
        else this.hidden = true;
        return;
      }

      const label = selection.code || selection.choiceText;
      const fromConfig = configImageFor(selection.code, headboards);

      const apply = (fromProduct) => {
        if (token !== this._renderToken) return; // a newer selection arrived meanwhile
        const primary = settings.preferConfigImages ? fromConfig || fromProduct : fromProduct || fromConfig;
        const fallback = primary === fromProduct ? fromConfig : fromProduct;
        if (!primary) {
          this._hideCard();
          if (this._editor) this._showPlaceholder();
          else this.hidden = true;
          return;
        }
        this._fallback = fallback && fallback.url !== primary.url ? fallback : null;
        this._show(primary, label);
      };

      const productId = this.productId;
      if (fetchProduct && productId) {
        // Show the config image right away (if any); upgrade when product data arrives.
        if (fromConfig && !settings.preferConfigImages) apply(null);
        else this._hideCard(); // never leave the previous headboard on screen while waiting
        productImages(productId).then((map) => {
          const key = normalizeText(selection.choiceText);
          apply(map.get(key) || null);
        });
      } else {
        apply(null);
      }
    }

    _show(image, label) {
      this._placeholder.hidden = true;
      const alt = image.alt || fillTemplate(settings.alt, label);
      if (image.width && image.height) {
        this._frame.style.aspectRatio = `${image.width} / ${image.height}`;
        this._img.width = image.width;
        this._img.height = image.height;
      } else {
        this._frame.style.aspectRatio = settings.defaultAspectRatio;
        this._img.removeAttribute('width');
        this._img.removeAttribute('height');
      }
      this._img.alt = alt;
      this._caption.textContent = fillTemplate(settings.caption, label);
      if (this._currentUrl !== image.url) {
        this._currentUrl = image.url;
        this._frame.classList.remove('loaded');
        this._img.src = image.url;
      }
      this._card.hidden = false;
      this.hidden = false;
    }

    _onImageError() {
      if (this._fallback) {
        const next = this._fallback;
        this._fallback = null;
        this._currentUrl = next.url;
        this._img.src = next.url;
        return;
      }
      log('noah-headboard-preview: image failed to load ' + this._currentUrl);
      this._hideCard();
      if (!this._editor) this.hidden = true;
    }

    _hideCard() {
      this._card.hidden = true;
    }

    _showPlaceholder() {
      this._placeholder.textContent = settings.editorPlaceholder;
      this._placeholder.hidden = false;
      this.hidden = false;
    }
  }

  return NoahHeadboardPreview;
}
