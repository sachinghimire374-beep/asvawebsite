/** Slugs: lowercase ASCII words separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

/**
 * Top-level paths owned by the application. CMS pages render at `/{slug}`, so these
 * slugs can never be used by a page.
 */
export const RESERVED_SLUGS = [
  'admin',
  'api',
  'about',
  'services',
  'careers',
  'contact',
  'start-a-project',
  'faq',
  'technologies',
  'newsletter',
  'unsubscribe',
  'preview',
  'login',
  'logout',
  'search',
  'sitemap',
  'sitemap-xml',
  'robots',
  'media',
  'static',
  'assets',
  'public',
  'favicon',
  'not-found',
  'opengraph-image',
  'icon',
  'manifest',
] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

/**
 * Accepts site-relative paths, in-page anchors, http(s), mailto: and tel: links only.
 * Rejects javascript:, data:, vbscript:, protocol-relative URLs and anything with control characters.
 */
export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value || /[\u0000-\u001f\u007f\s]/.test(value)) return false;
  if (value.startsWith('#')) return true;
  if (value.startsWith('/')) return !value.startsWith('//') && !value.startsWith('/\\');
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(value)) return true;
  if (/^tel:\+?[0-9()\-.]{3,}$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}


/** Plain-text excerpt from HTML, for meta descriptions and cards. */
export function htmlToPlainText(html: string, maxLength?: number): string {
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!maxLength || text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), maxLength * 0.6))}…`;
}

/** Strong password policy: 12+ characters, at least 3 of 4 character classes, not containing the email name. */
export function checkPasswordStrength(password: string, email?: string): string[] {
  const problems: string[] = [];
  if (password.length < 12) problems.push('Use at least 12 characters.');
  if (password.length > 128) problems.push('Use at most 128 characters.');
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) problems.push('Mix at least three of: lowercase, uppercase, numbers, symbols.');
  const local = email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 3 && password.toLowerCase().includes(local)) {
    problems.push('Do not include your email name in the password.');
  }
  if (/^(.)\1+$/.test(password)) problems.push('Do not repeat a single character.');
  return problems;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Escapes a value for CSV and neutralises spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
