import test from 'node:test';
import assert from 'node:assert/strict';
import { japanDate, periodWindow, seasonForSpot, viewingWindow, regionPeriod, validDate } from '../lib/season.mjs';
const spot = { periodText: '10月下旬～11月上旬', periodKind: 'typical' };
test('Japan timezone crosses midnight independent of host timezone', () => {
  assert.equal(japanDate(new Date('2026-10-18T15:00:00Z')), '2026-10-19');
  assert.equal(japanDate(new Date('2026-10-18T14:59:59Z')), '2026-10-18');
});
test('early, middle and late month boundaries, leap years, variants and shorthand', () => {
  assert.deepEqual(periodWindow(spot.periodText, 2026), { start: '2026-10-21', end: '2026-11-10' });
  assert.deepEqual(periodWindow('11月上旬～中旬', 2026), { start: '2026-11-01', end: '2026-11-20' });
  assert.deepEqual(periodWindow('11月中旬〜下旬', 2026), { start: '2026-11-11', end: '2026-11-30' });
  assert.deepEqual(periodWindow('11月中旬～12月初旬', 2026), { start: '2026-11-11', end: '2026-12-10' });
  assert.deepEqual(periodWindow('2月下旬', 2028), { start: '2028-02-21', end: '2028-02-29' });
  assert.deepEqual(periodWindow('10月', 2026), { start: '2026-10-01', end: '2026-10-31' });
  assert.equal(periodWindow('13月下旬', 2026), null);
  assert.equal(periodWindow('10月32日', 2026), null);
  assert.equal(periodWindow('10月下旬～', 2026), null);
});
test('four requested colors are determined at inclusive season boundaries', () => {
  assert.equal(seasonForSpot(spot, '2026-10-06'), 'before');
  assert.equal(seasonForSpot(spot, '2026-10-07'), 'soon');
  assert.equal(seasonForSpot(spot, '2026-10-20'), 'soon');
  assert.equal(seasonForSpot(spot, '2026-10-21'), 'peak');
  assert.equal(seasonForSpot(spot, '2026-11-10'), 'peak');
  assert.equal(seasonForSpot(spot, '2026-11-11'), 'past');
  assert.equal(seasonForSpot(spot, '2027-01-01'), 'before');
});
test('unknown and ambiguous periods do not inherit structured admission dates', () => {
  assert.equal(seasonForSpot({ ...spot, periodText: '' }, '2026-10-21'), 'unknown');
  assert.equal(seasonForSpot({ ...spot, periodText: '9月下旬(草紅葉)、10月中旬～10月下旬(木々)' }, '2026-10-21'), 'unknown');
  assert.equal(seasonForSpot({ periodKind: 'typical', startDate: '2026-01-01', endDate: '2026-12-31' }, '2026-10-21'), 'unknown');
  assert.equal(seasonForSpot(spot, 'bad'), 'unknown');
  assert.equal(validDate('2026-02-30'), false);
});
test('year-specific published dates stay in their stated year', () => {
  const fixed = { periodKind: 'dated', periodText: '2025年11月21日～12月7日', startDate: '2025-11-21 00:00:00+00:00', endDate: '2025-12-07' };
  assert.deepEqual(viewingWindow(fixed, 2026), { start: '2025-11-21', end: '2025-12-07' });
  assert.equal(seasonForSpot(fixed, '2026-11-25'), 'past');
  assert.equal(seasonForSpot(fixed, '2025-11-25'), 'peak');
  assert.equal(seasonForSpot({ ...fixed, startDate: '2026-11-21' }, '2026-11-25'), 'unknown');
  assert.equal(regionPeriod([fixed], 2026), '时间待确认');
});
test('cross-year typical seasons remain active in January', () => {
  assert.equal(seasonForSpot({ periodKind: 'typical', periodText: '12月下旬～1月上旬' }, '2027-01-04'), 'peak');
});
