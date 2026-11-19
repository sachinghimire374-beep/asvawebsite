import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_TAGS = new Set(['settings', 'navigation', 'pages', 'services', 'technologies', 'testimonials', 'faqs', 'team', 'jobs', 'redirects']);

function secretMatches(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by the API after CMS changes. Expires the tagged data immediately so the next visitor
 * sees the update; protected by a shared secret.
 */
export async function POST(request: NextRequest) {
  if (!secretMatches(request.headers.get('x-revalidate-secret'))) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid revalidation secret' } }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && ALLOWED_TAGS.has(t)) : [];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  if (tags.includes('settings') || tags.includes('navigation')) revalidatePath('/', 'layout');
  return NextResponse.json({ revalidated: tags, at: new Date().toISOString() });
}
