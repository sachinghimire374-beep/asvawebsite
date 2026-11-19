import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContentStatus } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { LOCKS, withAdvisoryLock } from '../common/locks.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService, type CacheTag } from '../revalidation/revalidation.service.js';

/**
 * Server-side scheduled publishing. Runs every minute inside the API process (never in the
 * browser) and is safe with multiple replicas thanks to a PostgreSQL advisory lock.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'publish-scheduled', disabled: process.env.SCHEDULER_ENABLED === 'false' })
  async publishDue(now = new Date()): Promise<number> {
    const result = await withAdvisoryLock(this.prisma, LOCKS.PUBLISH_SCHEDULED, async (tx) => {
      const due = { status: ContentStatus.SCHEDULED, publishedAt: { lte: now } };
      const [pages, services] = await Promise.all([
        tx.page.findMany({ where: due, select: { id: true, slug: true } }),
        tx.service.findMany({ where: due, select: { id: true, slug: true } }),
      ]);
      const publish = (ids: string[]) => ({ where: { id: { in: ids }, status: ContentStatus.SCHEDULED }, data: { status: ContentStatus.PUBLISHED } });
      const groups: [string, string, CacheTag, { id: string; slug: string }[], (ids: string[]) => Promise<unknown>][] = [
        ['page', 'Page', 'pages', pages, (ids) => tx.page.updateMany(publish(ids))],
        ['service', 'Service', 'services', services, (ids) => tx.service.updateMany(publish(ids))],
      ];
      const tags: CacheTag[] = [];
      let count = 0;
      for (const [entity, type, tag, rows, run] of groups) {
        if (!rows.length) continue;
        await run(rows.map((r) => r.id));
        for (const row of rows) {
          await this.audit.log({ actorEmail: 'system:scheduler', action: `${entity}.published`, targetType: type, targetId: row.id, metadata: { slug: row.slug, scheduled: true } }, tx);
        }
        tags.push(tag);
        count += rows.length;
      }
      return { count, tags };
    });
    if (result?.count) {
      this.logger.log({ count: result.count }, 'Published scheduled content');
      this.revalidation.revalidate(...result.tags);
    }
    return result?.count ?? 0;
  }
}
