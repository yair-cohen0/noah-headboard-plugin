/* Noah headboard preview - Wix Stores product page site plugin. Tag: <noah-headboard-preview>. Edit src/config.js and rebuild, or edit the HEADBOARDS block below. */
(() => {
  // src/config.js
  var HEADBOARDS = {
    H130: {
      image: "https://static.wixstatic.com/media/a6123f_afd6978356194337a029218582450284~mv2.jpg",
      width: 292,
      height: 146
    },
    H131: {
      image: "https://static.wixstatic.com/media/a6123f_d4142ca3fd4c41bfb0e877547e3222dc~mv2.jpg",
      width: 292,
      height: 146
    },
    H120: {
      image: "https://static.wixstatic.com/media/a6123f_27599703fc0f44af85f3846cde2131f9~mv2.jpg",
      width: 292,
      height: 146
    }
    // Coming soon - fill in the image URL when the photo is uploaded:
    // H129: { image: '' },
    // H119: { image: '' },
    // H107: { image: '' },
    // H84:  { image: '' },
    // H82:  { image: '' },
    // H79:  { image: '' },
    // H87:  { image: '' },
  };
  var SETTINGS = {
    // Names of the product option (or modifier) that holds the headboard choice.
    // Matching ignores case, extra spaces and RTL control characters.
    optionNames: ["ראש מיטה"],
    // A choice whose name contains one of these words means "no headboard".
    noneChoiceWords: ["ללא"],
    // How the headboard code is extracted from the choice name
    // ("ראש מיטה H130" -> "H130"). Letters + digits, e.g. H130, H84, HB12.
    codePattern: /(?:^|[^A-Za-z0-9])([A-Za-z]{1,3})\s*-?\s*(\d{2,4})(?![0-9])/,
    // Customer-facing texts (Hebrew). {code} is replaced by e.g. "H130".
    caption: "ראש המיטה שבחרתם: {code}",
    alt: "תמונה של ראש מיטה {code}",
    // Shown only inside the Wix editor, so the plugin can be found and selected.
    editorPlaceholder: "כאן תוצג תמונת ראש המיטה שהלקוח בוחר",
    // true = the map above wins over the product's own swatch image.
    preferConfigImages: false,
    // Default aspect ratio used to reserve space before the image loads,
    // when width/height are unknown.
    defaultAspectRatio: "2 / 1"
  };

  // src/headboard-core.js
  var BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/g;
  function normalizeText(value) {
    if (value === null || value === void 0) return "";
    return String(value).normalize("NFC").replace(BIDI_CONTROLS, "").replace(/\s+/g, " ").trim().toLowerCase();
  }
  function parseSelectedChoices(raw) {
    var _a, _b, _c, _d, _e, _f, _g;
    let value = raw;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return {};
      try {
        value = JSON.parse(trimmed);
      } catch {
        return {};
      }
    }
    if (!value || typeof value !== "object") return {};
    if (Array.isArray(value)) {
      const out = {};
      for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const key = (_d = (_c = (_b = (_a = entry.option) != null ? _a : entry.optionName) != null ? _b : entry.name) != null ? _c : entry.key) != null ? _d : entry.title;
        const choice = (_g = (_f = (_e = entry.choice) != null ? _e : entry.selection) != null ? _f : entry.value) != null ? _g : entry.description;
        if (key !== void 0) out[String(key)] = choice;
      }
      return out;
    }
    return value;
  }
  function choiceToText(choice) {
    var _a, _b, _c, _d, _e;
    if (choice === null || choice === void 0) return "";
    if (typeof choice === "string" || typeof choice === "number") return String(choice);
    if (typeof choice === "object") {
      const candidate = (_e = (_d = (_c = (_b = (_a = choice.name) != null ? _a : choice.description) != null ? _b : choice.value) != null ? _c : choice.title) != null ? _d : choice.key) != null ? _e : choice.label;
      return candidate === void 0 || candidate === null ? "" : String(candidate);
    }
    return "";
  }
  function findHeadboardChoice(selectedChoices, optionNames) {
    const wanted = optionNames.map(normalizeText).filter(Boolean);
    const entries = Object.entries(selectedChoices || {});
    for (const pass of [0, 1]) {
      for (const [key, choice] of entries) {
        const k = normalizeText(key);
        const hit = pass === 0 ? wanted.includes(k) : wanted.some((w) => k.includes(w));
        if (hit) return { found: true, text: choiceToText(choice).trim() };
      }
    }
    return { found: false, text: "" };
  }
  function extractCode(choiceText, codePattern) {
    const text = String(choiceText || "").replace(BIDI_CONTROLS, "");
    const match = text.match(codePattern);
    if (!match) return "";
    if (match.length >= 3 && match[2] !== void 0) return (match[1] + match[2]).toUpperCase();
    return String(match[1] || match[0]).replace(/[\s-]/g, "").toUpperCase();
  }
  function resolveSelection(selectedChoicesRaw, settings) {
    const selectedChoices = parseSelectedChoices(selectedChoicesRaw);
    const { found, text } = findHeadboardChoice(selectedChoices, settings.optionNames);
    if (!found) return { state: "irrelevant" };
    if (!text) return { state: "empty" };
    const normalized = normalizeText(text);
    if (settings.noneChoiceWords.some((w) => normalized.includes(normalizeText(w)))) {
      return { state: "none", choiceText: text };
    }
    return { state: "selected", code: extractCode(text, settings.codePattern), choiceText: text };
  }
  function configImageFor(code, headboards) {
    var _a;
    if (!code || !headboards) return null;
    const entry = (_a = headboards[code]) != null ? _a : headboards[code.toUpperCase()];
    if (!entry) return null;
    const url = typeof entry === "string" ? entry : entry.image;
    if (!url) return null;
    return {
      url,
      width: typeof entry === "object" ? entry.width : void 0,
      height: typeof entry === "object" ? entry.height : void 0,
      alt: typeof entry === "object" ? entry.alt : void 0
    };
  }
  function choiceImagesFromProduct(product, settings, toUrl) {
    const out = /* @__PURE__ */ new Map();
    if (!product || typeof product !== "object") return out;
    const wanted = settings.optionNames.map(normalizeText);
    const groups = [...product.options || [], ...product.modifiers || []];
    for (const group of groups) {
      const name = normalizeText(group && group.name);
      if (!name || !wanted.some((w) => name === w || name.includes(w))) continue;
      const choices = group.choicesSettings && group.choicesSettings.choices || group.optionSettings && group.optionSettings.choicesSettings && group.optionSettings.choicesSettings.choices || group.modifierSettings && group.modifierSettings.choicesSettings && group.modifierSettings.choicesSettings.choices || [];
      for (const choice of choices) {
        if (!choice) continue;
        let url = "";
        try {
          url = toUrl(choice.displayImage) || "";
        } catch {
          url = "";
        }
        if (!url) continue;
        const alt = typeof choice.displayImage === "object" ? choice.displayImage.altText : void 0;
        for (const label of [choice.name, choice.key, choice.choiceId]) {
          if (label) out.set(normalizeText(label), { url, alt });
        }
      }
    }
    return out;
  }
  function plainImageUrl(value) {
    const source = typeof value === "string" ? value : value && (value.url || value.uri);
    return typeof source === "string" && /^https?:\/\//i.test(source) ? source : "";
  }
  function fillTemplate(template, code) {
    return String(template).split("{code}").join(code);
  }

  // src/headboard-element.js
  var PLUGIN_PROPS = ["productId", "selectedVariantId", "selectedChoices", "quantity", "customText"];
  var OBSERVED_ATTRIBUTES = ["product-id", "selected-choices", "selected-variant-id"];
  var STYLE = `
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
  function looksLikeEditor(win) {
    try {
      const host = String(win && win.location && win.location.hostname || "");
      return /(^|\.)editor\.wix\.com$|\.(editor|studio|harmony)\.wix\.com$/i.test(host);
    } catch {
      return false;
    }
  }
  function createHeadboardPreviewClass(deps) {
    const headboards = deps.headboards || {};
    const settings = deps.settings;
    const fetchProduct = deps.fetchProduct || null;
    const toImageUrl = deps.toImageUrl || plainImageUrl;
    const isEditor = deps.isEditor || (() => looksLikeEditor(typeof window !== "undefined" ? window : void 0));
    const log = deps.log || (() => {
    });
    const productImageCache = /* @__PURE__ */ new Map();
    function productImages(productId) {
      if (!fetchProduct || !productId) return Promise.resolve(/* @__PURE__ */ new Map());
      if (!productImageCache.has(productId)) {
        const p = Promise.resolve().then(() => fetchProduct(productId)).then((res) => {
          const product = res && res.product ? res.product : res;
          return choiceImagesFromProduct(product, settings, toImageUrl);
        }).catch((err) => {
          log("noah-headboard-preview: product lookup failed, using config map only", err);
          return /* @__PURE__ */ new Map();
        });
        productImageCache.set(productId, p);
      }
      return productImageCache.get(productId);
    }
    class NoahHeadboardPreview2 extends HTMLElement {
      static get observedAttributes() {
        return OBSERVED_ATTRIBUTES;
      }
      constructor() {
        super();
        this._props = {};
        this._renderQueued = false;
        this._renderToken = 0;
        this._editor = false;
        this._currentUrl = "";
        const root = this.attachShadow({ mode: "open" });
        root.innerHTML = `<style>${STYLE}</style>
        <figure class="card" part="card" hidden>
          <div class="frame" part="frame"><img part="image" alt="" loading="lazy" decoding="async"></div>
          <figcaption part="caption" aria-live="polite"></figcaption>
        </figure>
        <div class="placeholder" part="placeholder" hidden></div>`;
        this._card = root.querySelector(".card");
        this._frame = root.querySelector(".frame");
        this._img = root.querySelector("img");
        this._caption = root.querySelector("figcaption");
        this._placeholder = root.querySelector(".placeholder");
        this._img.addEventListener("load", () => this._frame.classList.add("loaded"));
        this._img.addEventListener("error", () => this._onImageError());
      }
      connectedCallback() {
        if (this.dataset.state === void 0) this.hidden = true;
        for (const name of PLUGIN_PROPS) {
          if (Object.prototype.hasOwnProperty.call(this, name)) {
            const value = this[name];
            delete this[name];
            this[name] = value;
          }
        }
        Promise.resolve().then(() => isEditor()).then((v) => {
          this._editor = Boolean(v);
          this._queueRender();
        }).catch(() => this._queueRender());
        this._queueRender();
      }
      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "selected-choices") this._choicesSource = "attr";
        this._queueRender();
      }
      // ---- plugin API properties (set by Wix as JS properties) ----
      get productId() {
        var _a, _b;
        return (_b = (_a = this._props.productId) != null ? _a : this.getAttribute("product-id")) != null ? _b : void 0;
      }
      set productId(v) {
        this._props.productId = v;
        this._queueRender();
      }
      get selectedVariantId() {
        var _a, _b;
        return (_b = (_a = this._props.selectedVariantId) != null ? _a : this.getAttribute("selected-variant-id")) != null ? _b : void 0;
      }
      set selectedVariantId(v) {
        this._props.selectedVariantId = v;
      }
      get selectedChoices() {
        var _a;
        if (this._props.selectedChoices !== void 0) return this._props.selectedChoices;
        return (_a = this.getAttribute("selected-choices")) != null ? _a : void 0;
      }
      set selectedChoices(v) {
        this._props.selectedChoices = v;
        this._choicesSource = "prop";
        this._queueRender();
      }
      get quantity() {
        return this._props.quantity;
      }
      set quantity(v) {
        this._props.quantity = v;
      }
      get customText() {
        return this._props.customText;
      }
      set customText(v) {
        this._props.customText = v;
      }
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
        const attr = this.getAttribute("selected-choices");
        const prop = this._props.selectedChoices;
        if (prop === void 0) return attr;
        if (attr === null) return prop;
        return this._choicesSource === "attr" ? attr : prop;
      }
      _render() {
        const token = ++this._renderToken;
        const selection = resolveSelection(this._currentChoices(), settings);
        this.dataset.state = selection.state;
        if (selection.state !== "selected") {
          this._hideCard();
          if (this._editor) this._showPlaceholder();
          else this.hidden = true;
          return;
        }
        const label = selection.code || selection.choiceText;
        const fromConfig = configImageFor(selection.code, headboards);
        const apply = (fromProduct) => {
          if (token !== this._renderToken) return;
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
          if (fromConfig && !settings.preferConfigImages) apply(null);
          else this._hideCard();
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
          this._img.removeAttribute("width");
          this._img.removeAttribute("height");
        }
        this._img.alt = alt;
        this._caption.textContent = fillTemplate(settings.caption, label);
        if (this._currentUrl !== image.url) {
          this._currentUrl = image.url;
          this._frame.classList.remove("loaded");
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
        log("noah-headboard-preview: image failed to load " + this._currentUrl);
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
    return NoahHeadboardPreview2;
  }

  // src/entry-standalone.js
  var TAG = "noah-headboard-preview";
  var NoahHeadboardPreview = createHeadboardPreviewClass({
    headboards: HEADBOARDS,
    settings: SETTINGS,
    log: (msg, err) => console.warn(msg, err || "")
  });
  if (!customElements.get(TAG)) customElements.define(TAG, NoahHeadboardPreview);
})();
