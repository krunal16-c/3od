import { expect, test } from '@playwright/test';

test.describe('3oD marketing site', () => {
  test('shows the marketplace promise, audience cards, and primary paths', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', {
        name: 'Your design. Real quotes. Made in India.',
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Upload your design. Compare quotes. Get it made.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Get quotes for my design' }).first(),
    ).toHaveAttribute('href', '/request-quote');
    await expect(
      page.getByRole('link', { name: 'Earn from my 3D printer' }).first(),
    ).toHaveAttribute('href', '/join-as-supplier');

    const buyerCard = page.getByRole('article', { name: 'For buyers' });
    const supplierCard = page.getByRole('article', {
      name: 'For printer owners',
    });

    await expect(buyerCard).toBeVisible();
    await expect(supplierCard).toBeVisible();
    await expect(buyerCard.getByRole('link', { name: 'Explore for buyers' })).toHaveAttribute(
      'href',
      '/for-buyers',
    );
    await expect(
      supplierCard.getByRole('link', { name: 'Earn from my 3D printer' }),
    ).toHaveAttribute('href', '/for-printer-owners');
    await expect(
      page.getByRole('link', { name: 'How it works', exact: true }).first(),
    ).toHaveAttribute('href', '/how-it-works');
  });

  test('shows an accessible navigation menu on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: 'Open navigation' });
    const mobileNavigation = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });

    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(mobileNavigation).toBeHidden();

    await menuButton.click();

    await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(mobileNavigation).toBeVisible();
    await expect(mobileNavigation.getByRole('link', { name: 'For buyers' })).toHaveAttribute(
      'href',
      '/for-buyers',
    );
    await expect(
      mobileNavigation.getByRole('link', { name: 'For printer owners' }),
    ).toHaveAttribute('href', '/for-printer-owners');
    await expect(mobileNavigation.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '/how-it-works',
    );
  });

  test('has exact titles and canonicals on public routes', async ({ page }) => {
    const routes = [
      { path: '/', title: "3oD by Zester Product Studio — India's 3D Printing Marketplace", canonical: 'https://3od.in' },
      {
        path: '/for-buyers',
        title: '3D Printing Services in India | 3oD',
        canonical: 'https://3od.in/for-buyers',
      },
      {
        path: '/for-printer-owners',
        title: 'Earn From Your 3D Printer | 3oD',
        canonical: 'https://3od.in/for-printer-owners',
      },
      {
        path: '/how-it-works',
        title: 'How 3oD Works | 3oD',
        canonical: 'https://3od.in/how-it-works',
      },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(route.title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', route.canonical);
    }
  });
});
