import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { bootstrap, cookieValue, createUser, login, ORIGIN, PASSWORD } from './helpers.js';

describe('Authentication', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrap());
  });
  afterAll(async () => app.close());

  it('logs in with HttpOnly cookies, returns the user and records an audit entry', async () => {
    const user = await createUser(prisma, ['EDITOR']);
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').set('Origin', ORIGIN).send({ email: user.email, password: PASSWORD }).expect(200);
    expect(res.body.data).toMatchObject({ email: user.email, roles: [{ key: 'EDITOR' }] });
    expect(res.body.data).not.toHaveProperty('passwordHash');
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.find((c) => c.startsWith('asva_at='))).toMatch(/HttpOnly/i);
    expect(cookies.find((c) => c.startsWith('asva_rt='))).toMatch(/HttpOnly.*|Path=\/api\/v1\/auth/i);
    expect(await prisma.auditLog.count({ where: { action: 'auth.login.success', actorId: user.id } })).toBe(1);
  });

  it('uses a generic error for unknown emails and wrong passwords', async () => {
    const user = await createUser(prisma, ['EDITOR']);
    const wrong = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: user.email, password: 'nope-nope-nope' }).expect(401);
    const unknown = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'nobody@test.local', password: 'nope-nope-nope' }).expect(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('locks the account after repeated failures', async () => {
    const user = await createUser(prisma, ['EDITOR']);
    for (let i = 0; i < 5; i++) await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: user.email, password: 'wrong-password-123' }).expect(401);
    const locked = await prisma.adminUser.findUniqueOrThrow({ where: { id: user.id } });
    expect(locked.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    // Even the right password is refused while locked.
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);
  });

  it('refuses deactivated users', async () => {
    const user = await createUser(prisma, ['EDITOR'], { isActive: false });
    await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);
  });

  it('returns the current user and rejects requests without a session', async () => {
    const user = await createUser(prisma, ['SALES_MANAGER']);
    const s = await login(app, user.email);
    const me = await s.agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.data.permissions).toContain('inquiries.read');
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('rotates refresh tokens and revokes the whole family when a rotated token is replayed', async () => {
    const user = await createUser(prisma, ['EDITOR']);
    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').set('Origin', ORIGIN).send({ email: user.email, password: PASSWORD }).expect(200);
    const rt0 = cookieValue(loginRes.headers['set-cookie'], 'asva_rt')!;
    const csrf = cookieValue(loginRes.headers['set-cookie'], 'asva_csrf')!;
    const cookie = (rt: string) => `asva_rt=${encodeURIComponent(rt)}; asva_csrf=${encodeURIComponent(csrf)}`;

    const rotated = await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', cookie(rt0)).set('x-csrf-token', csrf).expect(200);
    const rt1 = cookieValue(rotated.headers['set-cookie'], 'asva_rt')!;
    expect(rt1).not.toBe(rt0);

    // Move the rotation outside the concurrent-tab grace window, then replay the old token (theft).
    await prisma.session.updateMany({ where: { userId: user.id, revokedReason: 'rotated' }, data: { revokedAt: new Date(Date.now() - 60_000) } });
    await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', cookie(rt0)).set('x-csrf-token', csrf).expect(401);
    expect(await prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'auth.refresh.reuse_detected', actorId: user.id } })).toBe(1);
    // The newer token from the same family no longer works either.
    await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', cookie(rt1)).set('x-csrf-token', csrf).expect(401);
  });

  it('logs out and invalidates the session immediately', async () => {
    const user = await createUser(prisma, ['EDITOR']);
    const s = await login(app, user.email);
    await s.post('/api/v1/auth/logout').expect(200);
    await s.agent.get('/api/v1/auth/me').expect(401);
  });

  it('requires a CSRF token for cookie-authenticated writes and checks the Origin', async () => {
    const user = await createUser(prisma, ['EDITOR']);
    const s = await login(app, user.email);
    const noToken = await s.agent.post('/api/v1/admin/faq-categories').send({ name: 'X', slug: 'x-csrf' }).expect(403);
    expect(noToken.body.error.code).toBe('CSRF_FAILED');
    await s.agent.post('/api/v1/admin/faq-categories').set('Origin', 'https://evil.example').set('x-csrf-token', s.csrf).send({ name: 'X', slug: 'x-csrf' }).expect(403);
    await s.post('/api/v1/admin/faq-categories').send({ name: 'CSRF ok', slug: 'csrf-ok' }).expect(201);
  });

  it('completes a password reset with a single-use token from the email', async () => {
    const user = await createUser(prisma, ['EDITOR']);
    await request(app.getHttpServer()).post('/api/v1/auth/forgot-password').send({ email: user.email }).expect(200);
    // Email delivery is not configured in tests, so the message is stored as SKIPPED — read the link from it.
    const email = await prisma.emailMessage.findFirstOrThrow({ where: { toAddress: user.email, category: 'auth.password-reset' }, orderBy: { createdAt: 'desc' } });
    expect(email.status).toBe('SKIPPED');
    const token = decodeURIComponent(/token=([^"&<\s]+)/.exec(email.text)![1]!);

    await request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({ token, password: 'short', confirmPassword: 'short' }).expect(400);
    const newPassword = 'Brand-New-Passw0rd!';
    await request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({ token, password: newPassword, confirmPassword: newPassword }).expect(200);
    await request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({ token, password: newPassword, confirmPassword: newPassword }).expect(400);
    await login(app, user.email, newPassword);
  });

  it('rate-limits login attempts per IP', async () => {
    process.env.THROTTLE_IN_TESTS = 'true';
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 7; i++) statuses.push((await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'flood@test.local', password: 'whatever-123' })).status);
      expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
      expect(statuses.slice(5)).toEqual([429, 429]);
    } finally {
      delete process.env.THROTTLE_IN_TESTS;
    }
  });

  it('does not reveal whether an email exists on forgot-password', async () => {
    const a = await request(app.getHttpServer()).post('/api/v1/auth/forgot-password').send({ email: 'missing@test.local' }).expect(200);
    const user = await createUser(prisma, ['EDITOR']);
    const b = await request(app.getHttpServer()).post('/api/v1/auth/forgot-password').send({ email: user.email }).expect(200);
    expect(a.body).toEqual(b.body);
  });
});
