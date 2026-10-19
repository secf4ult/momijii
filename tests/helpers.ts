import { expect, type Page } from '@playwright/test';
export const SITE_URL = process.env.MOMIJII_TEST_URL || 'http://127.0.0.1:3000/';
export async function visit(page: Page) {
  await page.goto(SITE_URL);
  await expect(page.locator('#access-password')).toBeVisible();
  await page.locator('#access-password').fill('momiji');
  await page.locator('.access-card button[type="submit"]').click();
  await expect(page.locator('.header')).toBeVisible();
}
