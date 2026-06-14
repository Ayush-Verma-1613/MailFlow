import { expect, test } from '@playwright/test';

test('landing page shows the hero and primary CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /warm enough/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /start free/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
});

test('sign-in page renders the credentials form', async ({ page }) => {
  await page.goto('/signin');
  await expect(page.getByText(/welcome back/i)).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
});

test('sign-up page renders and links back to sign-in', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByText(/create your workspace/i)).toBeVisible();
  await page.getByRole('link', { name: /sign in/i }).first().click();
  await expect(page).toHaveURL(/\/signin$/);
});

test('protected dashboard redirects unauthenticated users to sign-in', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/signin/);
});
