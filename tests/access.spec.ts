import { test, expect } from '@playwright/test';
import { SITE_URL } from './helpers';
test('password prompt rejects wrong passwords, remembers the tab session and supports locking', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(SITE_URL);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.spot-card')).toHaveCount(0);
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await page.getByLabel('访问密码').fill('wrong');
  await page.getByRole('button', { name: '进入モミジイ' }).click();
  await expect(page.locator('#access-error')).toHaveText('密码不正确，请重试。');
  await page.getByLabel('语言', { exact: true }).selectOption('ja');
  await expect(page.locator('#access-error')).toHaveText('パスワードが違います。もう一度お試しください。');
  await page.getByLabel('アクセスパスワード').fill('momiji');
  await page.getByRole('button', { name: 'モミジイを開く' }).click();
  await expect(page.locator('.header')).toBeVisible();
  await expect(page.locator('.brand')).toContainText('モミジイ');
  const home = new URL(await page.locator('.brand').getAttribute('href') ?? '', SITE_URL);
  expect(home.pathname).toBe(new URL(SITE_URL).pathname);
  await page.reload();
  await expect(page.locator('.header')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // A separate tab without an opener has no unlock flag (language preference remains shared).
  const other = await context.newPage();
  await other.goto(SITE_URL);
  await expect(other.getByRole('dialog')).toBeVisible();
  await other.close();
  await page.getByRole('button', { name: 'サイトをロック' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.header')).toHaveCount(0);
  await expect(page.getByLabel('アクセスパスワード')).toHaveValue('');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: '/tmp/momijii-password.png', fullPage: true });
  expect(errors).toEqual([]);
});
