import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../auth/guards.js';
import { loadEnv } from '../config/env.js';
import { validateUpload } from '../media/file-validation.js';
import { hashIp, signToken, verifySignedToken } from './crypto.js';
import { publicationAction, resolvePublicationOrThrow } from './publication.js';
import { sanitizeRichText } from './sanitize.js';

describe('sanitizeRichText', () => {
  it('removes scripts, event handlers and dangerous URLs', () => {
    const out = sanitizeRichText('<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">a</a><img src="data:image/png;base64,AAA" onerror="x()"><iframe src="https://x"></iframe>');
    expect(out).toBe('<p>Hi</p><a>a</a><img loading="lazy" />');
  });
  it('keeps allowed formatting and secures external links', () => {
    const out = sanitizeRichText('<h1>T</h1><p><strong>b</strong> <a href="https://example.com" target="_blank">x</a></p>');
    expect(out).toBe('<h2>T</h2><p><strong>b</strong> <a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a></p>');
  });
});

describe('signed tokens', () => {
  const secret = 'a'.repeat(40);
  it('verifies tokens for the right purpose only', () => {
    const token = signToken(secret, 'unsubscribe', 'abc');
    expect(verifySignedToken(secret, 'unsubscribe', token)).toBe('abc');
    expect(verifySignedToken(secret, 'confirm', token)).toBeNull();
    expect(verifySignedToken(secret, 'unsubscribe', `${token}x`)).toBeNull();
    expect(verifySignedToken('b'.repeat(40), 'unsubscribe', token)).toBeNull();
  });
  it('hashes IPs irreversibly and consistently', () => {
    expect(hashIp(secret, '1.2.3.4')).toBe(hashIp(secret, '1.2.3.4'));
    expect(hashIp(secret, '1.2.3.4')).not.toContain('1.2.3.4');
    expect(hashIp(secret, null)).toBeNull();
  });
});

describe('publication helpers', () => {
  it('maps requested status and date to stored values', () => {
    expect(resolvePublicationOrThrow({ status: 'DRAFT' }, null).status).toBe('DRAFT');
    expect(resolvePublicationOrThrow({ status: 'PUBLISHED', publishedAt: new Date(Date.now() + 3_600_000).toISOString() }, null).status).toBe('SCHEDULED');
    expect(() => resolvePublicationOrThrow({ status: 'SCHEDULED', publishedAt: '2020-01-01' }, null)).toThrow();
  });
  it('names audit actions for status changes', () => {
    expect(publicationAction('DRAFT', 'PUBLISHED')).toBe('published');
    expect(publicationAction('PUBLISHED', 'DRAFT')).toBe('unpublished');
    expect(publicationAction('DRAFT', 'DRAFT')).toBeNull();
  });
});

describe('PermissionsGuard', () => {
  const ctx = (permissions: string[] | null) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user: permissions ? { permissions } : undefined }) }),
    }) as unknown as ExecutionContext;
  const guardWith = (required: string[]) => {
    const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
    return new PermissionsGuard(reflector);
  };
  it('allows users holding every required permission', () => {
    expect(guardWith(['pages.manage']).canActivate(ctx(['pages.manage', 'media.manage']))).toBe(true);
  });
  it('denies users missing a permission', () => {
    expect(() => guardWith(['settings.manage']).canActivate(ctx(['pages.manage']))).toThrow(ForbiddenException);
  });
});

describe('validateUpload', () => {
  const env = loadEnv({ ...process.env, DATABASE_URL: 'postgresql://x', JWT_ACCESS_SECRET: 'x'.repeat(40), TOKEN_HASH_SECRET: 'y'.repeat(40) });
  const pdf = Buffer.from('%PDF-1.4\n%%EOF');
  it('accepts a real PDF resume', async () => {
    await expect(validateUpload({ buffer: pdf, originalname: 'cv.pdf', size: pdf.length }, 'resume', env)).resolves.toMatchObject({ mimeType: 'application/pdf' });
  });
  it('rejects wrong extensions, content mismatches and oversize files', async () => {
    await expect(validateUpload({ buffer: pdf, originalname: 'cv.exe', size: pdf.length }, 'resume', env)).rejects.toThrow(/Unsupported/);
    await expect(validateUpload({ buffer: Buffer.from('MZ....'), originalname: 'cv.pdf', size: 6 }, 'resume', env)).rejects.toThrow(/does not match/);
    await expect(validateUpload({ buffer: pdf, originalname: 'cv.pdf', size: 50 * 1024 * 1024 }, 'resume', env)).rejects.toThrow(/too large/);
  });
});
