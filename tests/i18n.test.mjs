import test from 'node:test';
import assert from 'node:assert/strict';
import { ja, translate } from '../lib/i18n.mjs';
import { seasonLabels } from '../lib/season.mjs';
test('Chinese is the default, Japanese translates UI and preserves interpolated source names', () => {
  assert.equal(translate('zh-CN', '未去过'), '未去过');
  assert.equal(translate('ja', '未去过'), '未訪問');
  assert.equal(translate('ja', '在地图查看{spot}', { spot: '谷川岳' }), '谷川岳を地図で見る');
  assert.equal(translate('ja', '全部都道府县（{count}）', { count: 46 }), 'すべての都道府県（46）');
  assert.equal(translate('ja', 'unknown future key'), 'unknown future key');
  assert.equal(translate('ja', '{count}', { count: 0 }), '0');
});
test('all Japanese translations retain the exact interpolation variables', () => {
  const parameters = value => [...new Set([...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort();
  for (const [key, value] of Object.entries(ja)) {
    assert.ok(value.trim(), key);
    assert.deepEqual(parameters(key), parameters(value), key);
  }
});
test('every season label has a Japanese translation', () => {
  for (const label of Object.values(seasonLabels)) assert.ok(Object.hasOwn(ja, label), label);
});
