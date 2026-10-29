// Pure logic (no DOM): parse the product page plugin data and decide what to show.

const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/g;

/** Normalize text for comparison: NFC, strip bidi marks, collapse spaces, lowercase. */
export function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFC')
    .replace(BIDI_CONTROLS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * The plugin API gives `selectedChoices` as an object ({ optionName: choice }).
 * Wix passes it as a JS property (object) and as the attribute
 * `selected-choices` (JSON string). Accept both, plus a defensive array form.
 * Returns a plain object (possibly empty).
 */
export function parseSelectedChoices(raw) {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      value = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object') return {};
  if (Array.isArray(value)) {
    const out = {};
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      const key = entry.option ?? entry.optionName ?? entry.name ?? entry.key ?? entry.title;
      const choice = entry.choice ?? entry.selection ?? entry.value ?? entry.description;
      if (key !== undefined) out[String(key)] = choice;
    }
    return out;
  }
  return value;
}

/** Turn a choice value (string, or an object in case the host sends one) into text. */
export function choiceToText(choice) {
  if (choice === null || choice === undefined) return '';
  if (typeof choice === 'string' || typeof choice === 'number') return String(choice);
  if (typeof choice === 'object') {
    const candidate =
      choice.name ?? choice.description ?? choice.value ?? choice.title ?? choice.key ?? choice.label;
    return candidate === undefined || candidate === null ? '' : String(candidate);
  }
  return '';
}

/**
 * Find the headboard choice among the selected choices.
 * Returns { found: boolean, text: string }:
 *  - found=false -> the product has no headboard option in the selection (ignore product)
 *  - found=true, text='' -> option exists but nothing picked yet
 */
export function findHeadboardChoice(selectedChoices, optionNames) {
  const wanted = optionNames.map(normalizeText).filter(Boolean);
  const entries = Object.entries(selectedChoices || {});
  // 1) exact option-name match, 2) option name contains the wanted name
  for (const pass of [0, 1]) {
    for (const [key, choice] of entries) {
      const k = normalizeText(key);
      const hit = pass === 0 ? wanted.includes(k) : wanted.some((w) => k.includes(w));
      if (hit) return { found: true, text: choiceToText(choice).trim() };
    }
  }
  return { found: false, text: '' };
}

/** Extract a headboard code ("H130") from a choice name ("ראש מיטה H130"). */
export function extractCode(choiceText, codePattern) {
  const text = String(choiceText || '').replace(BIDI_CONTROLS, '');
  const match = text.match(codePattern);
  if (!match) return '';
  if (match.length >= 3 && match[2] !== undefined) return (match[1] + match[2]).toUpperCase();
  return String(match[1] || match[0]).replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Decide the selection state.
 * Returns one of:
 *   { state: 'irrelevant' }                  product has no headboard option
 *   { state: 'empty' }                       nothing picked yet
 *   { state: 'none', choiceText }            "ללא ראש מיטה"
 *   { state: 'selected', code, choiceText }  a headboard was picked (code may be '' if unparseable)
 */
export function resolveSelection(selectedChoicesRaw, settings) {
  const selectedChoices = parseSelectedChoices(selectedChoicesRaw);
  const { found, text } = findHeadboardChoice(selectedChoices, settings.optionNames);
  if (!found) return { state: 'irrelevant' };
  if (!text) return { state: 'empty' };
  const normalized = normalizeText(text);
  if (settings.noneChoiceWords.some((w) => normalized.includes(normalizeText(w)))) {
    return { state: 'none', choiceText: text };
  }
  return { state: 'selected', code: extractCode(text, settings.codePattern), choiceText: text };
}

/** Look up the configured image for a code. Returns { url, width, height, alt } or null. */
export function configImageFor(code, headboards) {
  if (!code || !headboards) return null;
  const entry = headboards[code] ?? headboards[code.toUpperCase()];
  if (!entry) return null;
  const url = typeof entry === 'string' ? entry : entry.image;
  if (!url) return null;
  return {
    url,
    width: typeof entry === 'object' ? entry.width : undefined,
    height: typeof entry === 'object' ? entry.height : undefined,
    alt: typeof entry === 'object' ? entry.alt : undefined,
  };
}

/**
 * Build a lookup of choice images from a Catalog V3 product
 * (productsV3.getProduct(id, { fields: ['PRODUCT_CHOICES_DISPLAY_IMAGE'] })).
 * Looks at options[].choicesSettings.choices[] and modifiers[].choicesSettings.choices[]
 * whose option/modifier name matches settings.optionNames.
 * `toUrl` converts the SDK image value (a `wix:image://` string in the SDK, an object in REST)
 * into a browser URL. Returns Map<normalizedChoiceName, { url, alt }>.
 */
export function choiceImagesFromProduct(product, settings, toUrl) {
  const out = new Map();
  if (!product || typeof product !== 'object') return out;
  const wanted = settings.optionNames.map(normalizeText);
  const groups = [...(product.options || []), ...(product.modifiers || [])];
  for (const group of groups) {
    const name = normalizeText(group && group.name);
    if (!name || !wanted.some((w) => name === w || name.includes(w))) continue;
    const choices =
      (group.choicesSettings && group.choicesSettings.choices) ||
      (group.optionSettings && group.optionSettings.choicesSettings && group.optionSettings.choicesSettings.choices) ||
      (group.modifierSettings && group.modifierSettings.choicesSettings && group.modifierSettings.choicesSettings.choices) ||
      [];
    for (const choice of choices) {
      if (!choice) continue;
      let url = '';
      try {
        url = toUrl(choice.displayImage) || '';
      } catch {
        url = '';
      }
      if (!url) continue;
      const alt = typeof choice.displayImage === 'object' ? choice.displayImage.altText : undefined;
      for (const label of [choice.name, choice.key, choice.choiceId]) {
        if (label) out.set(normalizeText(label), { url, alt });
      }
    }
  }
  return out;
}

/** Default image-value converter: accepts http(s) strings and { url } objects. */
export function plainImageUrl(value) {
  const source = typeof value === 'string' ? value : value && (value.url || value.uri);
  return typeof source === 'string' && /^https?:\/\//i.test(source) ? source : '';
}

export function fillTemplate(template, code) {
  return String(template).split('{code}').join(code);
}
