import 'server-only';

const API_URL = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const REVALIDATE = Number(process.env.REVALIDATE_SECONDS ?? 300);

export type CacheTag =
  | 'settings'
  | 'navigation'
  | 'pages'
  | 'services'
  | 'technologies'
  | 'testimonials'
  | 'faqs'
  | 'team'
  | 'jobs'
  | 'redirects';

export class ApiUnavailableError extends Error {}

interface Options {
  tags: CacheTag[];
  query?: Record<string, string | number | undefined | null>;
}

async function request(path: string, { tags, query }: Options): Promise<Response | null> {
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString()}`
    : '';
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}${qs}`, {
      next: { revalidate: REVALIDATE, tags },
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new ApiUnavailableError(`API unreachable for ${path}: ${(error as Error).message}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiUnavailableError(`API responded ${res.status} for ${path}`);
  return res;
}

/** Fetches public data from the API with tag-based caching. Returns null for 404. */
export async function apiGet<T>(path: string, options: Options): Promise<T | null> {
  const res = await request(path, options);
  if (!res) return null;
  const body = (await res.json()) as { data: T };
  return body.data;
}

