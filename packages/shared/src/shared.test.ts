import { describe, expect, it } from 'vitest';
import {
  canTransitionApplication,
  canTransitionLead,
  checkPasswordStrength,
  contactSubmissionSchema,
  csvCell,
  DEFAULT_ROLES,
  DEFAULT_SETTINGS,
  hasPermission,
  isPubliclyVisible,
  isReservedSlug,
  isSafeHref,
  projectInquirySchema,
  resolvePublication,
  SETTINGS_SCHEMAS,
  slugify,
  SETTINGS_GROUPS,
} from './index.js';

describe('slugify', () => {
  it('normalises titles to URL-safe slugs', () => {
    expect(slugify('Custom Software Development')).toBe('custom-software-development');
    expect(slugify('  UI/UX  Design & Research ')).toBe('ui-ux-design-and-research');
    expect(slugify('Café — Ñandú!')).toBe('cafe-nandu');
  });
  it('flags reserved slugs', () => {
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('Services')).toBe(true);
    expect(isReservedSlug('privacy-policy')).toBe(false);
  });
});

describe('isSafeHref', () => {
  it.each(['/about', '#contact', 'https://example.com', 'mailto:a@b.co', 'tel:+9779800000000'])('accepts %s', (href) => {
    expect(isSafeHref(href)).toBe(true);
  });
  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', '//evil.com', '/\\evil.com', 'ftp://x', 'java\nscript:x'])(
    'rejects %s',
    (href) => {
      expect(isSafeHref(href)).toBe(false);
    },
  );
});

describe('permissions', () => {
  it('gives administrators every permission and restricts other roles', () => {
    expect(hasPermission(DEFAULT_ROLES.ADMINISTRATOR.permissions, ['settings.manage', 'users.manage'])).toBe(true);
    expect(hasPermission(DEFAULT_ROLES.EDITOR.permissions, 'pages.manage')).toBe(true);
    expect(hasPermission(DEFAULT_ROLES.EDITOR.permissions, 'inquiries.read')).toBe(false);
    expect(hasPermission(DEFAULT_ROLES.SALES_MANAGER.permissions, 'inquiries.export')).toBe(true);
    expect(hasPermission(DEFAULT_ROLES.SALES_MANAGER.permissions, 'applications.read')).toBe(false);
    expect(hasPermission(DEFAULT_ROLES.HR_MANAGER.permissions, 'applications.resume')).toBe(true);
    expect(hasPermission(DEFAULT_ROLES.HR_MANAGER.permissions, 'settings.manage')).toBe(false);
  });
});

describe('workflow transitions', () => {
  it('enforces the lead pipeline', () => {
    expect(canTransitionLead('NEW', 'CONTACTED')).toBe(true);
    expect(canTransitionLead('PROPOSAL_SENT', 'WON')).toBe(true);
    expect(canTransitionLead('NEW', 'WON')).toBe(false);
    expect(canTransitionLead('WON', 'NEW')).toBe(false);
    expect(canTransitionLead('ARCHIVED', 'NEW')).toBe(true);
  });
  it('enforces application statuses', () => {
    expect(canTransitionApplication('RECEIVED', 'UNDER_REVIEW')).toBe(true);
    expect(canTransitionApplication('RECEIVED', 'SELECTED')).toBe(false);
    expect(canTransitionApplication('WITHDRAWN', 'UNDER_REVIEW')).toBe(false);
  });
});

describe('publication', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  it('publishes immediately without a date', () => {
    expect(resolvePublication({ status: 'PUBLISHED' }, null, now)).toEqual({ status: 'PUBLISHED', publishedAt: now });
  });
  it('turns a future publish date into a schedule', () => {
    const later = '2026-02-01T00:00:00.000Z';
    expect(resolvePublication({ status: 'PUBLISHED', publishedAt: later }, null, now).status).toBe('SCHEDULED');
  });
  it('rejects scheduling in the past', () => {
    expect(() => resolvePublication({ status: 'SCHEDULED', publishedAt: '2025-01-01' }, null, now)).toThrow();
  });
  it('only shows published items whose date has passed', () => {
    expect(isPubliclyVisible({ status: 'PUBLISHED', publishedAt: '2025-12-31T00:00:00Z' }, now)).toBe(true);
    expect(isPubliclyVisible({ status: 'PUBLISHED', publishedAt: '2026-06-01T00:00:00Z' }, now)).toBe(false);
    expect(isPubliclyVisible({ status: 'DRAFT', publishedAt: '2025-01-01T00:00:00Z' }, now)).toBe(false);
  });
});

describe('validation', () => {
  it('requires consent and a real message on contact submissions', () => {
    const result = contactSubmissionSchema.safeParse({ name: 'A', email: 'bad', message: 'hi' });
    expect(result.success).toBe(false);
    const ok = contactSubmissionSchema.safeParse({
      name: 'Test Visitor',
      email: 'VISITOR@Example.com ',
      message: 'I would like to discuss a project.',
      consent: true,
    });
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.email).toBe('visitor@example.com');
    expect(ok.success && ok.data.phone).toBeNull();
  });
  it('validates project inquiries end to end', () => {
    const base = {
      fullName: 'Test Visitor',
      email: 'visitor@example.com',
      phone: '+977 9800000000',
      projectType: 'Web application',
      description: 'We need a booking platform for our clinic.',
      budgetRange: 'NPR 5–15 lakh',
      timeline: '1–3 months',
      preferredContact: 'EMAIL',
      consent: true,
    };
    expect(projectInquirySchema.safeParse(base).success).toBe(true);
    expect(projectInquirySchema.safeParse({ ...base, phone: '12' }).success).toBe(false);
    expect(projectInquirySchema.safeParse({ ...base, consent: false }).success).toBe(false);
  });
  it('enforces the password policy', () => {
    expect(checkPasswordStrength('short')).not.toHaveLength(0);
    expect(checkPasswordStrength('alllowercaseletters')).not.toHaveLength(0);
    expect(checkPasswordStrength('Correct-Horse-42-battery')).toHaveLength(0);
    expect(checkPasswordStrength('Ramesh-Secret-2026', 'ramesh@example.com')).not.toHaveLength(0);
  });
  it('ships defaults that satisfy every settings schema', () => {
    for (const group of SETTINGS_GROUPS) {
      const result = SETTINGS_SCHEMAS[group].safeParse(DEFAULT_SETTINGS[group]);
      expect(result.success, `${group}: ${JSON.stringify(!result.success && result.error.issues)}`).toBe(true);
    }
  });
});

describe('utilities', () => {
  it('neutralises CSV formula injection', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell(null)).toBe('');
  });
});
