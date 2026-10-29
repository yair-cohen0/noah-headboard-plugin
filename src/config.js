// ---------------------------------------------------------------------------
// Noah headboard preview: configuration
// ---------------------------------------------------------------------------
// This is the ONLY file you normally edit.
//
// HEADBOARDS maps a headboard code (as it appears in the choice name, e.g.
// "ראש מיטה H130" -> "H130") to the picture shown under the gallery.
//
// * In the SDK build (or the Wix CLI build), the picture is first taken from
//   the product itself: the image attached to the choice ("displayImage" =
//   the picture swatch). The map below is then only a fallback/override.
// * In the basic build (no Wix API calls) the map below is the only source.
//
// To add a headboard: add one line, e.g.
//   H129: { image: 'https://static.wixstatic.com/media/....jpg' },
// Optional per entry: width / height (pixels of the original file, used to
// reserve space while loading) and alt (Hebrew alt text override).
// A code that is not listed (or has image: '') simply shows nothing unless the
// product's own swatch image is available (SDK/CLI builds).
// ---------------------------------------------------------------------------

export const HEADBOARDS = {
  H130: {
    image: 'https://static.wixstatic.com/media/a6123f_afd6978356194337a029218582450284~mv2.jpg',
    width: 292,
    height: 146,
  },
  H131: {
    image: 'https://static.wixstatic.com/media/a6123f_d4142ca3fd4c41bfb0e877547e3222dc~mv2.jpg',
    width: 292,
    height: 146,
  },
  H120: {
    image: 'https://static.wixstatic.com/media/a6123f_27599703fc0f44af85f3846cde2131f9~mv2.jpg',
    width: 292,
    height: 146,
  },
  // Coming soon - fill in the image URL when the photo is uploaded:
  // H129: { image: '' },
  // H119: { image: '' },
  // H107: { image: '' },
  // H84:  { image: '' },
  // H82:  { image: '' },
  // H79:  { image: '' },
  // H87:  { image: '' },
};

export const SETTINGS = {
  // Names of the product option (or modifier) that holds the headboard choice.
  // Matching ignores case, extra spaces and RTL control characters.
  optionNames: ['ראש מיטה'],

  // A choice whose name contains one of these words means "no headboard".
  noneChoiceWords: ['ללא'],

  // How the headboard code is extracted from the choice name
  // ("ראש מיטה H130" -> "H130"). Letters + digits, e.g. H130, H84, HB12.
  codePattern: /(?:^|[^A-Za-z0-9])([A-Za-z]{1,3})\s*-?\s*(\d{2,4})(?![0-9])/,

  // Customer-facing texts (Hebrew). {code} is replaced by e.g. "H130".
  caption: 'ראש המיטה שבחרתם: {code}',
  alt: 'תמונה של ראש מיטה {code}',
  // Shown only inside the Wix editor, so the plugin can be found and selected.
  editorPlaceholder: 'כאן תוצג תמונת ראש המיטה שהלקוח בוחר',

  // true = the map above wins over the product's own swatch image.
  preferConfigImages: false,

  // Default aspect ratio used to reserve space before the image loads,
  // when width/height are unknown.
  defaultAspectRatio: '2 / 1',
};
