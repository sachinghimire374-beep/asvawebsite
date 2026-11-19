import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SchedulerService } from '../src/scheduler/scheduler.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrap, createUser, login, type Session } from './helpers.js';

describe('Content management and publication', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let editor: Session;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await bootstrap());
    editor = await login(app, (await createUser(prisma, ['EDITOR'])).email);
  });
  afterAll(async () => app.close());

  const service = (overrides: Record<string, unknown> = {}) => ({
    name: 'Integration Testing Service',
    slug: 'integration-testing-service',
    shortDescription: 'A service created by the integration suite.',
    description: '<p>Hello <script>alert(1)</script><strong>world</strong></p><a href="javascript:alert(1)">x</a>',
    features: ['One', 'Two'],
    status: 'DRAFT',
    ...overrides,
  });

  it('creates a draft that is invisible publicly, then publishes and updates it', async () => {
    const created = await editor.post('/api/v1/admin/services').send(service()).expect(201);
    const id = created.body.data.id;
    // Stored HTML is sanitised: scripts and javascript: URLs are removed.
    expect(created.body.data.description).not.toMatch(/script|javascript:/i);
    expect(created.body.data.description).toContain('<strong>world</strong>');

    await api().get('/api/v1/services/integration-testing-service').expect(404);
    expect((await api().get('/api/v1/services').expect(200)).body.data.find((s: { id: string }) => s.id === id)).toBeUndefined();

    await editor.patch(`/api/v1/admin/services/${id}`).send(service({ status: 'PUBLISHED' })).expect(200);
    const live = await api().get('/api/v1/services/integration-testing-service').expect(200);
    expect(live.body.data.name).toBe('Integration Testing Service');

    await editor.patch(`/api/v1/admin/services/${id}`).send(service({ status: 'PUBLISHED', name: 'Renamed Service' })).expect(200);
    expect((await api().get('/api/v1/services/integration-testing-service').expect(200)).body.data.name).toBe('Renamed Service');
    expect(await prisma.auditLog.count({ where: { targetId: id, action: 'service.published' } })).toBe(1);
  });

  it('creates a redirect when a published slug changes', async () => {
    const created = await editor.post('/api/v1/admin/services').send(service({ slug: 'old-slug-service', status: 'PUBLISHED' })).expect(201);
    await editor.patch(`/api/v1/admin/services/${created.body.data.id}`).send(service({ slug: 'new-slug-service', status: 'PUBLISHED' })).expect(200);
    const res = await api().get('/api/v1/redirects/resolve').query({ path: '/services/old-slug-service' }).expect(200);
    expect(res.body.data).toEqual({ toPath: '/services/new-slug-service', statusCode: 308 });
  });

  it('refuses to delete published content and deletes drafts', async () => {
    const pub = await editor.post('/api/v1/admin/services').send(service({ slug: 'published-no-delete', status: 'PUBLISHED' })).expect(201);
    expect((await editor.del(`/api/v1/admin/services/${pub.body.data.id}`).expect(400)).body.error.code).toBe('UNPUBLISH_FIRST');
    const draft = await editor.post('/api/v1/admin/services').send(service({ slug: 'draft-delete-me' })).expect(201);
    await editor.del(`/api/v1/admin/services/${draft.body.data.id}`).expect(204);
  });

  it('validates input and reports field errors', async () => {
    const res = await editor.post('/api/v1/admin/services').send({ name: '', slug: 'Not A Slug' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(['name', 'slug', 'shortDescription']));
  });

  it('rejects duplicate slugs with a conflict', async () => {
    await editor.post('/api/v1/admin/services').send(service({ slug: 'dup-slug' })).expect(201);
    const res = await editor.post('/api/v1/admin/services').send(service({ slug: 'dup-slug' })).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('schedules pages and publishes them from the server-side scheduler', async () => {
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    const page = await editor
      .post('/api/v1/admin/pages')
      .send({ title: 'Scheduled page', slug: 'scheduled-page', content: '<p>Soon</p>', status: 'PUBLISHED', publishedAt: future })
      .expect(201);
    expect(page.body.data.status).toBe('SCHEDULED');
    await api().get('/api/v1/pages/scheduled-page').expect(404);

    // Move the publication time into the past and run the scheduler job directly.
    await prisma.page.update({ where: { id: page.body.data.id }, data: { publishedAt: new Date(Date.now() - 1000) } });
    const published = await app.get(SchedulerService).publishDue();
    expect(published).toBeGreaterThanOrEqual(1);
    expect((await prisma.page.findUniqueOrThrow({ where: { id: page.body.data.id } })).status).toBe('PUBLISHED');
    await api().get('/api/v1/pages/scheduled-page').expect(200);
  });

  it('keeps revision history and restores a previous version', async () => {
    const created = await editor.post('/api/v1/admin/pages').send({ title: 'Revisions', slug: 'revisions-page', content: '<p>Version one</p>' }).expect(201);
    const id = created.body.data.id;
    await editor.patch(`/api/v1/admin/pages/${id}`).send({ title: 'Revisions', slug: 'revisions-page', content: '<p>Version two</p>' }).expect(200);
    const detail = await editor.agent.get(`/api/v1/admin/pages/${id}`).expect(200);
    expect(detail.body.data.revisions).toHaveLength(2);
    const first = detail.body.data.revisions.at(-1);
    const restored = await editor.post(`/api/v1/admin/pages/${id}/revisions/${first.id}/restore`).expect(201);
    expect(restored.body.data.content).toContain('Version one');
  });

  it('protects reserved page slugs and system pages', async () => {
    const res = await editor.post('/api/v1/admin/pages').send({ title: 'Admin', slug: 'admin', content: '' }).expect(409);
    expect(res.body.error.code).toBe('RESERVED_SLUG');
    const privacy = await prisma.page.findUniqueOrThrow({ where: { slug: 'privacy-policy' } });
    expect((await editor.del(`/api/v1/admin/pages/${privacy.id}`).expect(400)).body.error.code).toBe('SYSTEM_PAGE');
  });

  it('only returns approved testimonials with confirmed permission', async () => {
    await editor.post('/api/v1/admin/testimonials').send({ clientName: 'Pending Client', content: 'Great', status: 'PENDING' }).expect(201);
    const noPermission = await editor.post('/api/v1/admin/testimonials').send({ clientName: 'No Consent', content: 'Great', status: 'APPROVED', permissionConfirmed: false }).expect(400);
    expect(noPermission.body.error.code).toBe('PERMISSION_REQUIRED');
    await editor.post('/api/v1/admin/testimonials').send({ clientName: 'Approved Client', content: 'Great work', status: 'APPROVED', permissionConfirmed: true }).expect(201);
    const pub = await api().get('/api/v1/testimonials').expect(200);
    expect(pub.body.data.map((t: { clientName: string }) => t.clientName)).toEqual(['Approved Client']);
  });

  it('rejects unsafe navigation links', async () => {
    await editor.post('/api/v1/admin/navigation').send({ menu: 'HEADER', label: 'Bad', href: 'javascript:alert(1)' }).expect(403); // editors cannot manage navigation
    const admin = await login(app, (await createUser(prisma, ['ADMINISTRATOR'])).email);
    const res = await admin.post('/api/v1/admin/navigation').send({ menu: 'HEADER', label: 'Bad', href: 'javascript:alert(1)' }).expect(400);
    expect(res.body.error.details[0].path).toBe('href');
  });

  it('serves a sitemap containing only published URLs', async () => {
    const res = await api().get('/api/v1/seo/sitemap').expect(200);
    const paths: string[] = res.body.data.entries.map((e: { path: string }) => e.path);
    expect(paths).toContain('/privacy-policy');
    expect(paths).toContain('/services/new-slug-service');
    expect(paths).not.toContain('/services/draft-delete-me');
    expect(paths.some((p) => p.startsWith('/admin'))).toBe(false);
  });
});
