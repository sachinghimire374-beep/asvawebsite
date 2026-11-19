import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrap, createUser, login, type Session } from './helpers.js';

/** Server-side authorization: each role reaches only its own endpoints. */
describe('Role-based access control', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const s: Record<'admin' | 'editor' | 'sales' | 'hr' | 'none', Session> = {} as never;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrap());
    const users = {
      admin: await createUser(prisma, ['ADMINISTRATOR']),
      editor: await createUser(prisma, ['EDITOR']),
      sales: await createUser(prisma, ['SALES_MANAGER']),
      hr: await createUser(prisma, ['HR_MANAGER']),
      none: await createUser(prisma, []),
    };
    for (const [k, u] of Object.entries(users)) s[k as keyof typeof s] = await login(app, u.email);
  });
  afterAll(async () => app.close());

  const matrix: [string, keyof typeof s, number][] = [
    ['/api/v1/admin/inquiries', 'sales', 200],
    ['/api/v1/admin/inquiries', 'editor', 403],
    ['/api/v1/admin/inquiries', 'hr', 403],
    ['/api/v1/admin/applications', 'hr', 200],
    ['/api/v1/admin/applications', 'sales', 403],
    ['/api/v1/admin/applications', 'editor', 403],
    ['/api/v1/admin/pages', 'editor', 200],
    ['/api/v1/admin/pages', 'sales', 403],
    ['/api/v1/admin/settings', 'admin', 200],
    ['/api/v1/admin/settings', 'editor', 403],
    ['/api/v1/admin/users', 'admin', 200],
    ['/api/v1/admin/users', 'hr', 403],
    ['/api/v1/admin/audit-logs', 'admin', 200],
    ['/api/v1/admin/audit-logs', 'editor', 403],
    ['/api/v1/admin/media', 'editor', 200],
    ['/api/v1/admin/media', 'sales', 403],
    ['/api/v1/admin/dashboard', 'none', 403],
  ];

  it.each(matrix)('GET %s as %s → %i', async (url, who, status) => {
    await s[who].agent.get(url).expect(status);
  });

  it('rejects every admin endpoint without a session', async () => {
    for (const url of ['/api/v1/admin/inquiries', '/api/v1/admin/settings', '/api/v1/admin/users', '/api/v1/admin/pages', '/api/v1/admin/media']) {
      const res = await request(app.getHttpServer()).get(url).expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('blocks writes as well as reads (an editor cannot change settings)', async () => {
    await s.editor.patch('/api/v1/admin/settings').send({ group: 'maintenance', value: { enabled: true, message: 'Nope' } }).expect(403);
    await s.sales.post('/api/v1/admin/services').send({}).expect(403);
  });

  it('only returns dashboard sections the role may see', async () => {
    const sales = await s.sales.agent.get('/api/v1/admin/dashboard').expect(200);
    expect(sales.body.data.leads).not.toBeNull();
    expect(sales.body.data.careers).toBeNull();
    expect(sales.body.data.activity).toBeNull();
    const hr = await s.hr.agent.get('/api/v1/admin/dashboard').expect(200);
    expect(hr.body.data.leads).toBeNull();
    expect(hr.body.data.careers).not.toBeNull();
  });

  it('prevents removing the last administrator', async () => {
    const me = await s.admin.agent.get('/api/v1/auth/me').expect(200);
    const res = await s.admin.patch(`/api/v1/admin/users/${me.body.data.id}`).send({ roles: ['EDITOR'] }).expect(400);
    expect(res.body.error.code).toBe('SELF_LOCKOUT');
  });

  it('applies permission changes on the next request', async () => {
    const editorRole = await prisma.role.findUniqueOrThrow({ where: { key: 'EDITOR' }, include: { permissions: { include: { permission: true } } } });
    const original = editorRole.permissions.map((p) => p.permission.key);
    await s.admin.patch(`/api/v1/admin/roles/${editorRole.id}`).send({ permissions: [...original, 'inquiries.read'] }).expect(200);
    await s.editor.agent.get('/api/v1/admin/inquiries').expect(200);
    await s.admin.patch(`/api/v1/admin/roles/${editorRole.id}`).send({ permissions: original }).expect(200);
    await s.editor.agent.get('/api/v1/admin/inquiries').expect(403);
    expect(await prisma.auditLog.count({ where: { action: 'role.permissions.changed' } })).toBeGreaterThanOrEqual(2);
  });

  it('never exposes private settings publicly', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/settings/public').expect(200);
    expect(res.body.data).not.toHaveProperty('notifications');
    expect(JSON.stringify(res.body)).not.toMatch(/SMTP|password|secret/i);
  });
});
