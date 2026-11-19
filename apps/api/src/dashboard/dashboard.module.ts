import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@asva/shared';
import { z } from 'zod';
import { ApplicationStatus, ContentStatus, JobStatus, LeadStatus } from '../generated/prisma/client.js';
import { CurrentUser, RequirePermissions } from '../common/decorators.js';
import type { Principal } from '../common/types.js';
import { ApiZodQuery, createZodDto } from '../common/zod.js';
import { PrismaService } from '../prisma/prisma.service.js';

class DashboardQueryDto extends createZodDto(z.object({ days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d)).default(30) })) {}

/**
 * Real counts straight from the database. Sections are only returned when the user holds the
 * matching permission, so the dashboard never leaks data a role cannot otherwise see.
 */
@ApiTags('Dashboard')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  @ApiZodQuery(DashboardQueryDto)
  @ApiOperation({ summary: 'Overview metrics for the selected period with comparison to the previous period' })
  async overview(@Query() query: DashboardQueryDto, @CurrentUser() user: Principal) {
    const can = (p: string) => user.permissions.includes(p);
    const now = new Date();
    const since = new Date(now.getTime() - query.days * 86_400_000);
    const previous = new Date(since.getTime() - query.days * 86_400_000);
    const published = { status: ContentStatus.PUBLISHED };

    const content = can(PERMISSIONS.SERVICES_MANAGE) || can(PERMISSIONS.PAGES_MANAGE)
      ? await Promise.all([
          this.prisma.service.count({ where: published }),
          this.prisma.page.count({ where: published }),
          this.prisma.page.count({ where: { status: ContentStatus.SCHEDULED } }),
          this.prisma.page.count({ where: { status: ContentStatus.DRAFT } }),
        ]).then(([services, pages, scheduledPages, draftPages]) => ({ services, pages, scheduledPages, draftPages }))
      : null;

    const leads = can(PERMISSIONS.INQUIRIES_READ)
      ? await Promise.all([
          this.prisma.projectInquiry.count({ where: { status: LeadStatus.NEW } }),
          this.prisma.projectInquiry.count({ where: { createdAt: { gte: since } } }),
          this.prisma.projectInquiry.count({ where: { createdAt: { gte: previous, lt: since } } }),
          this.prisma.projectInquiry.groupBy({ by: ['status'], _count: { _all: true } }),
          this.prisma.projectInquiry.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, fullName: true, companyName: true, projectType: true, status: true, createdAt: true },
          }),
          this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
            SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
            FROM project_inquiries WHERE "createdAt" >= ${since}
            GROUP BY 1 ORDER BY 1`,
        ]).then(([newCount, period, previousPeriod, byStatus, recent, daily]) => ({
          new: newCount,
          period,
          previousPeriod,
          byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
          recent,
          daily: daily.map((d) => ({ day: d.day.toISOString().slice(0, 10), count: Number(d.count) })),
        }))
      : null;

    const contact = can(PERMISSIONS.CONTACT_READ)
      ? await Promise.all([
          this.prisma.contactSubmission.count({ where: { isRead: false, isArchived: false } }),
          this.prisma.contactSubmission.count({ where: { createdAt: { gte: since } } }),
          this.prisma.contactSubmission.count({ where: { createdAt: { gte: previous, lt: since } } }),
        ]).then(([unread, period, previousPeriod]) => ({ unread, period, previousPeriod }))
      : null;

    const careers = can(PERMISSIONS.APPLICATIONS_READ) || can(PERMISSIONS.JOBS_MANAGE)
      ? await Promise.all([
          this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
          this.prisma.jobApplication.count({ where: { status: ApplicationStatus.RECEIVED } }),
          this.prisma.jobApplication.count({ where: { createdAt: { gte: since } } }),
          can(PERMISSIONS.APPLICATIONS_READ)
            ? this.prisma.jobApplication.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, fullName: true, status: true, createdAt: true, job: { select: { title: true } } } })
            : Promise.resolve([]),
        ]).then(([openJobs, newApplications, period, recent]) => ({ openJobs, newApplications, period, recent }))
      : null;

    const newsletter = can(PERMISSIONS.NEWSLETTER_READ)
      ? await Promise.all([
          this.prisma.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
          this.prisma.newsletterSubscriber.count({ where: { createdAt: { gte: since } } }),
        ]).then(([subscribed, period]) => ({ subscribed, period }))
      : null;

    const activity = can(PERMISSIONS.AUDIT_READ)
      ? await this.prisma.auditLog.findMany({
          where: { NOT: { action: { startsWith: 'auth.' } } },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, action: true, targetType: true, actorEmail: true, createdAt: true },
        })
      : null;

    return { days: query.days, generatedAt: now.toISOString(), content, leads, contact, careers, newsletter, activity };
  }
}

@Module({ controllers: [DashboardController] })
export class DashboardModule {}
