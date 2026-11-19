import { expect, test } from '@playwright/test';
import { adminApi, humanPause, loginAs, unique } from './helpers';

test.describe('Administrator journeys', () => {
  test('6. an administrator logs in and sees the dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Global settings' })).toBeVisible();
  });

  test('7. an editor creates and publishes a page that appears on the website', async ({ page }) => {
    const title = `E2E article ${unique()}`;
    await loginAs(page, 'editor');
    // Role-aware navigation: editors do not see leads or settings.
    await expect(page.getByRole('link', { name: 'Project inquiries' })).toHaveCount(0);
    await page.goto('/admin/pages/new');
    await page.locator('#f-title').fill(title);
    await expect(page.getByLabel('URL slug')).toHaveValue(/e2e-article-/);
    const slug = await page.getByLabel('URL slug').inputValue();
    await page.getByRole('textbox', { name: 'Content editor' }).click();
    await page.keyboard.type('This article was written by the end-to-end test suite.');
    await page.getByLabel('Status').selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Page saved')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]{36}$/);

    await page.goto(`/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByText('written by the end-to-end test suite')).toBeVisible();

    // Unpublish and confirm it disappears.
    await page.goBack();
    await page.getByLabel('Status').selectOption('DRAFT');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Page saved')).toBeVisible();
    const gone = await page.goto(`/${slug}`);
    expect(gone?.status()).toBe(404);
  });

  test('8. an administrator changes a service and the public page updates', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/services');
    await page.getByRole('link', { name: /IT Consulting/ }).click();
    const description = `Independent technical advice — updated ${unique()}`;
    await page.getByLabel('Short description').fill(description);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Service saved')).toBeVisible();
    await page.goto('/services/it-consulting');
    await expect(page.getByText(description)).toBeVisible();
  });

  test('9. a sales manager updates an inquiry', async ({ page, request }) => {
    // Create a lead through the public API first.
    const email = `pipeline-${unique()}@example.com`;
    const lead = await request.post('/api/v1/inquiries', {
      data: { fullName: 'Pipeline Prospect', email, phone: '+977 9811111111', projectType: 'Mobile application', description: `Mobile app for tourism operators. ${unique()}`, budgetRange: 'NPR 5–15 lakh', timeline: '3–6 months', preferredContact: 'EMAIL', consent: true },
    });
    expect(lead.status()).toBe(201);

    await loginAs(page, 'sales');
    await page.goto('/admin/inquiries');
    await page.getByRole('link', { name: new RegExp(email) }).click();
    await expect(page.getByRole('heading', { name: 'Pipeline Prospect' })).toBeVisible();
    await page.getByLabel('Status').selectOption('CONTACTED');
    await expect(page.getByText('Lead updated')).toBeVisible();
    await page.getByLabel('New note').fill('Spoke with the client — sending a proposal next week.');
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText('Note added', { exact: true })).toBeVisible();
    await expect(page.getByText('Status changed from New to Contacted')).toBeVisible();
  });

  test('10. an HR manager reviews a job application', async ({ page }) => {
    const email = `candidate-${unique()}@example.com`;
    await page.goto('/careers/sample-frontend-developer');
    await page.getByLabel('Full name').fill('E2E Candidate');
    await page.locator('#app-email').fill(email);
    await page.locator('#app-phone').fill('+977 9822222222');
    await page.getByLabel('CV / resume').setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') });
    await page.locator('#app-consent').check();
    await humanPause(page);
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('heading', { name: 'Application submitted' })).toBeVisible();

    await loginAs(page, 'hr');
    await page.goto('/admin/applications');
    await page.getByRole('link', { name: new RegExp(email) }).click();
    await page.getByLabel('Status').selectOption('UNDER_REVIEW');
    await page.getByLabel('Internal notes').fill('Good fundamentals; schedule a technical interview.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Application updated')).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download CV' }).click();
    expect((await download).suggestedFilename()).toBe('cv.pdf');
  });

  test('11. unauthorized users are denied by the server', async ({ page, context, request }) => {
    await loginAs(page, 'editor');
    for (const path of ['/admin/inquiries', '/admin/applications', '/admin/settings', '/admin/users', '/admin/audit-logs']) {
      expect((await adminApi(context, page.request, 'GET', path)).status(), path).toBe(403);
    }
    expect((await adminApi(context, page.request, 'PATCH', '/admin/settings', { group: 'maintenance', value: { enabled: true, message: 'x' } })).status()).toBe(403);
    // The UI also explains the restriction rather than showing data.
    await page.goto('/admin/settings');
    await expect(page.getByText(/don’t have access/i)).toBeVisible();
    // Anonymous requests are rejected outright.
    expect((await request.get('/api/v1/admin/users')).status()).toBe(401);
  });

  test('12b. drafts created in the CMS are not publicly visible', async ({ page, context }) => {
    await loginAs(page, 'editor');
    const slug = `e2e-draft-${unique()}`;
    const created = await adminApi(context, page.request, 'POST', '/admin/pages', { title: 'Hidden draft', slug, content: '<p>secret</p>', status: 'DRAFT' });
    expect(created.status()).toBe(201);
    const id = (await created.json()).data.id;
    const anon = await page.context().browser()!.newContext();
    const res = await anon.request.get(new URL(`/${slug}`, page.url()).toString());
    expect(res.status()).toBe(404);
    expect((await anon.request.get(new URL(`/api/v1/pages/${slug}`, page.url()).toString())).status()).toBe(404);
    await anon.close();
    await adminApi(context, page.request, 'DELETE', `/admin/pages/${id}`);
  });
});
