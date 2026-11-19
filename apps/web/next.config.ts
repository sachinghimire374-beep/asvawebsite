import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import type { NextConfig } from 'next';

// Local development reads the monorepo root .env; production uses real environment variables.
const rootEnv = path.resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) config({ path: rootEnv, quiet: true });

// Managed platforms (Vercel, Render, ...) inject real env vars; a missing API URL would make every
// public page fail at request time, so fail the production build instead of shipping a broken site.
const requiredInProduction = ['API_INTERNAL_URL', 'NEXT_PUBLIC_SITE_URL', 'REVALIDATE_SECRET'] as const;
if (process.env.VERCEL_ENV === 'production' || (process.env.NODE_ENV === 'production' && process.env.VERCEL)) {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for a production build: ${missing.join(', ')}`);
  }
} else if (process.env.VERCEL && !process.env.API_INTERNAL_URL) {
  console.warn('[next.config] API_INTERNAL_URL is not set: API calls will fall back to http://localhost:4000.');
}

const apiUrl = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(/\/$/, '');

/** Optional CDN/object-storage host for media (STORAGE_PUBLIC_URL on the API). */
const mediaHost = process.env.STORAGE_PUBLIC_URL ? new URL(process.env.STORAGE_PUBLIC_URL) : null;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Vercel builds its own serverless output; standalone is for Docker/VPS deployments.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  transpilePackages: ['@asva/shared'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Trimmed from Next's default (which goes up to 2560/3840) to limit concurrent sharp
    // memory use on a memory-constrained host; 1920 still covers full-HD full-bleed images.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Defaults to 50% of available disk space when unset, which on a memory-constrained
    // container means every unique image variant accumulates in the page cache
    // indefinitely. Cap it so stale entries get evicted well before that happens.
    maximumDiskCacheSize: 25 * 1024 * 1024,
    localPatterns: [{ pathname: '/api/v1/media/files/**', search: '' }, { pathname: '/brand/**', search: '' }, { pathname: '/images/**', search: '' }],
    remotePatterns: mediaHost ? [{ protocol: mediaHost.protocol.replace(':', '') as 'https' | 'http', hostname: mediaHost.hostname, pathname: `${mediaHost.pathname.replace(/\/$/, '')}/**` }] : [],
  },
  async rewrites() {
    // The browser only talks to this origin; API calls are proxied so auth cookies stay first-party.
    return [{ source: '/api/v1/:path*', destination: `${apiUrl}/api/v1/:path*` }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default nextConfig;
