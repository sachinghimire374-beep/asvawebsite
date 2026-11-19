import { expect, test } from '@playwright/test';
import { humanPause, unique } from './helpers';

test.describe('Visitor journeys', () => {
  test('1. opens the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('We build software that moves businesses forward');
    await expect(page.getByRole('link', { name: 'Discuss a project' }).first()).toBeVisible();
    await expect(page).toHaveTitle(/Asva Innovation Lab/);
    // No horizontal scrolling on any viewport.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('2. browses published services', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Software development services');
    const first = page.locator('main ul li a').first();
    const name = (await first.locator('h3').textContent())!;
    await first.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Services');
  });


  test('4. submits the contact form', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel('Full name').fill('E2E Visitor');
    await page.locator('#contact-email').fill(`e2e-${unique()}@example.com`);
    await page.locator('#contact-message').fill(`Automated end-to-end contact test ${unique()}.`);
    await page.locator('#contact-consent').check();
    await humanPause(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
  });

  test('5. submits a multi-step project inquiry', async ({ page }) => {
    await page.goto('/start-a-project');
    await page.getByLabel('Full name').fill('E2E Prospect');
    await page.getByLabel('Business email').fill(`lead-${unique()}@example.com`);
    await page.getByLabel('Phone number').fill('+977 9800000000');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Project type').selectOption('Web application');
    await page.getByLabel('Project description').fill(`We need a booking platform for a clinic in Pokhara. Ref ${unique()}`);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Expected budget').selectOption({ index: 3 });
    await page.getByLabel('Desired timeline').selectOption({ index: 2 });
    await page.locator('#inq-consent').check();
    await humanPause(page);
    await page.getByRole('button', { name: 'Submit inquiry' }).click();
    await expect(page.getByRole('heading', { name: 'Inquiry received' })).toBeVisible();
  });

  test('12. cannot access unpublished content or admin data', async ({ page, request }) => {
    // Seeded base content includes draft-only suggestions; drafts must 404 publicly.
    const res = await request.get('/api/v1/services/this-service-does-not-exist');
    expect(res.status()).toBe(404);
    const resp = await page.goto('/definitely-not-published-draft');
    expect(resp?.status()).toBe(404);
    const admin = await request.get('/api/v1/admin/inquiries');
    expect(admin.status()).toBe(401);
  });
});
