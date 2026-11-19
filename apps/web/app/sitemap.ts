import type { MetadataRoute } from 'next';
import { COURSES } from '@/lib/courses';
import { getSitemapEntries } from '@/lib/api/public';
import { absoluteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATIC_ROUTES = ['/', '/about', '/services', '/courses', '/technologies', '/careers', '/contact', '/start-a-project', '/faq'];

/** Built from published database records only — no drafts, admin routes or private data. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let entries: { path: string; updatedAt: string }[] = [];
  try {
    entries = (await getSitemapEntries())?.entries ?? [];
  } catch {
    // API unavailable: still serve the static routes.
  }
  return [
    ...STATIC_ROUTES.map((path) => ({ url: absoluteUrl(path), changeFrequency: 'weekly' as const, priority: path === '/' ? 1 : 0.8 })),
    ...COURSES.map((course) => ({ url: absoluteUrl(`/courses/${course.slug}`), changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...entries.map((e) => ({ url: absoluteUrl(e.path), lastModified: new Date(e.updatedAt), changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
