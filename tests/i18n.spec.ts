import { test, expect } from '@playwright/test';
import { visit } from './helpers';
test('Japanese toggle updates the whole UI without losing filters, dates or travel records', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await visit(page);
  await page.getByLabel('筛选地区').selectOption('群馬県');
  await page.getByLabel('筛选市区町村').selectOption('みなかみ町');
  await page.getByLabel('搜索景点').fill('谷川岳');
  await page.getByLabel('季节判断日期').fill('2026-10-21');
  await page.getByLabel('谷川岳旅行状态').selectOption('planned');
  await page.getByRole('button', { name: '谷川岳', exact: true }).click();
  await page.getByLabel('旅行笔记').fill('和朋友一起 / 友達と一緒に');
  await page.getByLabel('到访日期').fill('2026-10-21');
  const stored = await page.evaluate(() => localStorage.getItem('momiji-checklist-v1'));
  await page.getByLabel('语言', { exact: true }).selectOption('ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page).toHaveTitle('モミジイ · 紅葉旅チェックリスト');
  await expect(page.getByLabel('スポットを検索')).toHaveValue('谷川岳');
  await expect(page.getByLabel('都道府県で絞り込み')).toHaveValue('群馬県');
  await expect(page.getByLabel('市区町村で絞り込み')).toHaveValue('みなかみ町');
  await expect(page.getByLabel('紅葉シーズンの判定日')).toHaveValue('2026-10-21');
  await expect(page.getByLabel('谷川岳の訪問状況')).toHaveValue('planned');
  await expect(page.getByLabel('旅のメモ')).toHaveValue('和朋友一起 / 友達と一緒に');
  await expect(page.getByLabel('訪問日', { exact: true })).toHaveValue('2026-10-21');
  await expect(page.locator('.spot-card').first().locator('.season-badge')).toHaveText('見頃');
  await expect(page.locator('.map-legend')).toContainText('まもなく見頃');
  await expect(page.getByRole('button', { name: '地図を拡大', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '◎ 現在地', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /群馬県 · 市区町村データ/ }).click();
  await expect(page.locator('.region-table')).toContainText('各スポットの期間の幅');
  expect(await page.evaluate(() => localStorage.getItem('momiji-checklist-v1'))).toBe(stored);
  // Both narrow phone and desktop layouts must fit longer Japanese labels.
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.screenshot({ path: '/tmp/momiji-ja-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/momiji-ja-mobile.png', fullPage: true });
  await page.reload();
  await expect(page.getByLabel('言語', { exact: true })).toHaveValue('ja');
  await page.getByLabel('スポットを検索').fill('谷川岳');
  await page.getByRole('button', { name: '谷川岳', exact: true }).click();
  await expect(page.getByLabel('旅のメモ')).toHaveValue('和朋友一起 / 友達と一緒に');
  await page.getByLabel('言語', { exact: true }).selectOption('zh-CN');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByLabel('旅行笔记')).toHaveValue('和朋友一起 / 友達と一緒に');
  expect(errors).toEqual([]);
});
test('language switching still works when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await visit(page);
  await page.getByLabel('语言', { exact: true }).selectOption('ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('.warning[role="alert"]')).toContainText('保存済みの記録を読み込めません');
  await expect(page.getByRole('heading', { name: 'いま、秋はどこに？' })).toBeVisible();
});
