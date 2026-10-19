import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCatalogPage, sitemapUrls, municipality } from '../scripts/catalog.mjs';
test('municipality keeps city names containing 市 and separates county and wards', () => {
  for (const [input, expected] of [['札幌市中央区', '札幌市'], ['利根郡みなかみ町', 'みなかみ町'], ['西八代郡市川三郷町', '市川三郷町'], ['市川市', '市川市'], ['四日市市', '四日市市'], ['廿日市市', '廿日市市'], ['江東区', '江東区']]) assert.equal(municipality(input), expected);
});
test('catalog matches period text to stable source URL, follows pagination and detects dated periods', () => {
  const event = { '@type': 'Event', url: 'https://koyo.walkerplus.com/detail/ar0313e100/', startDate: '2026-11-01', endDate: '2026-11-20', location: { name: 'テスト庭園', address: { addressRegion: '東京都', addressLocality: '江東区' } } };
  const html = `<script type="application/ld+json">${JSON.stringify([event])}</script><article><a href="/detail/ar0313e100/"><div class="detail"><span>例年の紅葉見頃：</span>11月上旬～中旬</div><div class="detail"><span>例年の色づき始め：</span>10月下旬</div></a></article><div class="pager"><a href="/list/ar0313/2.html">2</a><a href="https://example.com/">bad</a></div>`;
  const parsed = parseCatalogPage(html, 'https://koyo.walkerplus.com/list/ar0313/');
  assert.equal(parsed.spots[0].periodText, '11月上旬～中旬');
  assert.equal(parsed.spots[0].onsetText, '10月下旬');
  assert.equal(parsed.spots[0].municipality, '江東区');
  assert.equal(parsed.spots[0].periodKind, 'typical');
  assert.deepEqual(parsed.pagination, ['https://koyo.walkerplus.com/list/ar0313/2.html']);
  assert.equal(parseCatalogPage(html.replace('11月上旬～中旬', '2026年11月1日～20日'), event.url).spots[0].periodKind, 'dated');
});
test('sitemap parsing deduplicates downstream without consuming unrelated URLs', () => {
  assert.deepEqual(sitemapUrls('<url><loc>https://example.com/?a=1&amp;b=2</loc></url>'), ['https://example.com/?a=1&b=2']);
});
test('local catalog has unique stable IDs and prefecture/city facts for every record', async () => {
  const data = JSON.parse(await readFile(new URL('../data/spots.json', import.meta.url), 'utf8'));
  assert.equal(new Set(data.spots.map(s => s.id)).size, data.spots.length);
  assert.equal(new Set(data.spots.map(s => s.sourceUrl)).size, data.spots.length);
  assert.equal(data.spots.length, data.coverage.expected);
  for (const s of data.spots) {
    assert.ok(s.prefecture && s.municipality && s.locality && s.name && s.factsSourceUrl && s.fetchedAt);
    if (s.coordinates) assert.ok(s.coordinates[0] > 20 && s.coordinates[0] < 46 && s.coordinates[1] > 120 && s.coordinates[1] < 150);
  }
});
