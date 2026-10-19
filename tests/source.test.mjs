import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRanking, parseCoordinates } from '../scripts/source.mjs';
const event = { '@type': 'Event', url: 'https://koyo.walkerplus.com/detail/ar0310e12824/', location: { name: '谷川岳', address: { addressRegion: '群馬県' } } };
test('extracts facts only, stable ID and rank', () => {
  const spots = parseRanking(`<script type="application/ld+json">${JSON.stringify([event])}</script>`);
  assert.equal(spots[0].id, 'ar0310e12824');
  assert.equal(spots[0].rank, 1);
  assert.equal(spots[0].name, '谷川岳');
  assert.equal(spots[0].coordinates, null);
  assert.equal('description' in spots[0], false);
});
test('rejects empty or unexpected sources', () => {
  assert.throws(() => parseRanking('<html></html>'));
  assert.throws(() => parseRanking(`<script type="application/ld+json">${JSON.stringify({ ...event, url: 'https://example.com/' })}</script>`));
});
test('extracts coordinates without using any embedded API key', () => {
  assert.deepEqual(parseCoordinates('<iframe src="https://www.google.com/maps/embed/v1/place?q=36.834727,138.929991&zoom=13">'), [36.834727, 138.929991]);
  assert.equal(parseCoordinates('q=999,138'), null);
  assert.equal(parseCoordinates('<p>no map</p>'), null);
});
