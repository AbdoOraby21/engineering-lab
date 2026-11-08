import { expect, test } from '@playwright/test';

for (const locale of ['en', 'ar'] as const) {
  test(`Home → category → filter → product → add to cart (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator('header')).toBeVisible();

    const categoryLink = page.locator(`a[href*="/${locale}/catalog?category="]`).first();
    await categoryLink.waitFor({ timeout: 20_000 });
    await categoryLink.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/catalog\\?category=[^&]+`));

    const inStock = page.getByLabel(locale === 'en' ? /in stock only/i : /متاح فقط/);
    if (await inStock.isVisible().catch(() => false)) {
      await inStock.check();
    }

    const productLink = page.locator(`a[href*="/${locale}/products/"]`).first();
    await productLink.waitFor({ timeout: 20_000 });
    await productLink.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/products/[^/]+`));

    const addButton = page.getByRole('button', { name: locale === 'en' ? /add to cart/i : /أضف إلى العربة/ }).first();
    await addButton.click();
    await expect(page.getByRole('dialog', { name: locale === 'en' ? /shopping cart/i : /عربة التسوق/ })).toBeVisible();
  });

  test(`Search autocomplete → product (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const input = page.getByRole('combobox').first();
    await input.fill('ESP32');
    const suggestion = page.getByRole('option', { name: /ESP32|إيه إس بي/i }).first();
    await suggestion.waitFor({ timeout: 20_000 });
    await suggestion.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/products/[^/]+`));
  });
}
