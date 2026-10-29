// node --test test/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSelectedChoices,
  resolveSelection,
  extractCode,
  configImageFor,
  choiceImagesFromProduct,
  normalizeText,
} from '../src/headboard-core.js';
import { HEADBOARDS, SETTINGS } from '../src/config.js';

test('parseSelectedChoices: object, JSON string, bad JSON, array', () => {
  assert.deepEqual(parseSelectedChoices({ a: 'b' }), { a: 'b' });
  assert.deepEqual(parseSelectedChoices('{"מידה":"160x200"}'), { 'מידה': '160x200' });
  assert.deepEqual(parseSelectedChoices('not json'), {});
  assert.deepEqual(parseSelectedChoices(''), {});
  assert.deepEqual(parseSelectedChoices(null), {});
  assert.deepEqual(parseSelectedChoices([{ option: 'ראש מיטה', choice: 'ראש מיטה H130' }]), {
    'ראש מיטה': 'ראש מיטה H130',
  });
});

test('extractCode', () => {
  const p = SETTINGS.codePattern;
  assert.equal(extractCode('ראש מיטה H130', p), 'H130');
  assert.equal(extractCode('ראש מיטה h131', p), 'H131');
  assert.equal(extractCode('ראש מיטה H 84', p), 'H84');
  assert.equal(extractCode('ראש מיטה H-87', p), 'H87');
  assert.equal(extractCode('‏ראש מיטה H120‏', p), 'H120');
  assert.equal(extractCode('ללא ראש מיטה', p), '');
  assert.equal(extractCode('160x200', p), ''); // a size is not a headboard code
});

test('resolveSelection states', () => {
  assert.deepEqual(resolveSelection({ 'מידה': '160x200' }, SETTINGS), { state: 'irrelevant' });
  assert.deepEqual(resolveSelection({}, SETTINGS), { state: 'irrelevant' });
  assert.deepEqual(resolveSelection(undefined, SETTINGS), { state: 'irrelevant' });
  assert.deepEqual(resolveSelection({ 'ראש מיטה': '' }, SETTINGS), { state: 'empty' });
  assert.equal(resolveSelection({ 'ראש מיטה': 'ללא ראש מיטה' }, SETTINGS).state, 'none');
  const sel = resolveSelection({ 'מידה': '160x200', 'ראש מיטה': 'ראש מיטה H130', 'צבע הבד': 'אפור' }, SETTINGS);
  assert.equal(sel.state, 'selected');
  assert.equal(sel.code, 'H130');
  // option-name normalisation (extra spaces, RTL marks, JSON string input)
  assert.equal(resolveSelection('{"‏ ראש  מיטה ":"ראש מיטה H131"}', SETTINGS).code, 'H131');
  // object-valued choice (defensive)
  assert.equal(resolveSelection({ 'ראש מיטה': { name: 'ראש מיטה H120' } }, SETTINGS).code, 'H120');
});

test('configImageFor', () => {
  assert.equal(configImageFor('H130', HEADBOARDS).url, HEADBOARDS.H130.image);
  assert.equal(configImageFor('H999', HEADBOARDS), null);
  assert.equal(configImageFor('', HEADBOARDS), null);
  assert.equal(configImageFor('H1', { H1: { image: '' } }), null);
  assert.equal(configImageFor('H1', { H1: 'https://x/y.jpg' }).url, 'https://x/y.jpg');
});

test('choiceImagesFromProduct reads V3 options and modifiers', () => {
  const product = {
    options: [
      { name: 'מידה', choicesSettings: { choices: [{ name: '160x200' }] } },
      {
        name: 'ראש מיטה',
        choicesSettings: {
          choices: [
            { choiceId: 'c0', name: 'ללא ראש מיטה' },
            { choiceId: 'c1', name: 'ראש מיטה H130', displayImage: 'wix:image://v1/abc~mv2.jpg/h130.jpg#originWidth=292&originHeight=146' },
          ],
        },
      },
    ],
    modifiers: [
      { name: 'ראש מיטה', choicesSettings: { choices: [{ name: 'ראש מיטה H129', displayImage: { url: 'https://static.wixstatic.com/media/h129.jpg', altText: 'H129' } }] } },
    ],
  };
  const toUrl = (v) =>
    typeof v === 'string' ? v.replace('wix:image://v1/', 'https://static.wixstatic.com/media/').split('/h130')[0] : v && v.url;
  const map = choiceImagesFromProduct(product, SETTINGS, toUrl);
  assert.equal(map.get(normalizeText('ראש מיטה H130')).url, 'https://static.wixstatic.com/media/abc~mv2.jpg');
  assert.equal(map.get(normalizeText('ראש מיטה H129')).alt, 'H129');
  assert.equal(map.has(normalizeText('ללא ראש מיטה')), false);
  assert.equal(map.has('160x200'), false);
});
