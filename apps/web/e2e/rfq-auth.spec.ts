import { expect, test } from '@playwright/test';

test.describe('RFQ and auth demo flows', () => {
  test('lets a buyer choose a role, sign up, and request a quote', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: 'Create your 3oD account' })).toBeVisible();
    await page.getByRole('radio', { name: 'I need something printed' }).check();
    await page.getByLabel('Full name').fill('Asha Buyer');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { name: 'You’re ready to get quotes' })).toBeVisible();
    await page.getByRole('link', { name: 'Request a quote' }).click();
    await expect(page).toHaveURL(/\/request-quote$/);

    await page.getByLabel('Project title').fill('Prototype enclosure');
    await page.getByLabel('3D design file').setInputFiles({
      name: 'prototype.stl',
      mimeType: 'model/stl',
      buffer: Buffer.from('solid prototype'),
    });
    await page.getByLabel('Material').selectOption('PLA');
    await page.getByLabel('Finish').selectOption('Standard');
    await page.getByLabel('Quantity').fill('4');
    await page.getByLabel('Needed by').fill('2027-01-15');
    await page.getByLabel('Project notes').fill('Please keep the walls sturdy.');
    await page.getByRole('button', { name: 'Send request for quote' }).click();

    await expect(page.getByRole('heading', { name: 'Your quote request is on its way' })).toBeVisible();
    await expect(page.getByText(/RFQ-3OD-/)).toBeVisible();
  });

  test('validates login fields and supports printer-owner role selection', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[value="printer"]').check();
    await page.getByRole('button', { name: 'Log in' }).click();

    const formAlert = page.locator('form [role="alert"]');
    await expect(formAlert).toContainText('Enter your email');
    await expect(formAlert).toContainText('Enter your password');
    await expect(page.getByText('Printer owner')).toBeVisible();
  });

  test('takes a printer owner to the owner workspace after a valid demo login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[value="printer"]').check();
    await page.getByLabel('Email').fill('owner@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    await expect(page.getByRole('heading', { name: /Good morning, Arjun/ })).toBeVisible();
  });

  test('takes a new printer owner directly to the workspace after signup', async ({ page }) => {
    await page.goto('/signup');
    await page.locator('input[value="printer"]').check();
    await page.getByLabel('Full name').fill('Owner Demo');
    await page.getByLabel('Email').fill('owner@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.getByRole('link', { name: 'Go to printer dashboard' }).click();

    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    await expect(page.getByRole('heading', { name: /Good morning, Arjun/ })).toBeVisible();
  });
});
