import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';

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

/**
 * Tells the Next.js app to drop cached data for the given tags so CMS changes appear on the
 * public site immediately. Time-based revalidation in the web app is the fallback if this fails.
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  revalidate(...tags: CacheTag[]): void {
    const url = this.env.WEB_REVALIDATE_URL;
    const secret = this.env.REVALIDATE_SECRET;
    if (!url || !secret || this.env.NODE_ENV === 'test') return;
    void fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags: [...new Set(tags)] }),
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => {
        if (!res.ok) this.logger.warn({ status: res.status, tags }, 'Web revalidation request was rejected');
      })
      .catch((err: unknown) => this.logger.warn({ err, tags }, 'Web revalidation request failed; cached pages refresh on their timer'));
  }
}
