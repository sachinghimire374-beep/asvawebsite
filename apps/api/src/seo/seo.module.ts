import { Controller, Get, Header, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobStatus } from '../generated/prisma/client.js';
import { Public } from '../common/decorators.js';
import { publiclyVisible } from '../common/publication.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Data for the XML sitemap: only published, indexable public URLs. */
@ApiTags('SEO')
@Controller('seo')
export class SeoController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('sitemap')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'Published URLs and last-modified dates for the sitemap' })
  async sitemap() {
    const visible = publiclyVisible();
    const [pages, services, jobs] = await Promise.all([
      this.prisma.page.findMany({ where: { ...visible, noIndex: false }, select: { slug: true, updatedAt: true } }),
      this.prisma.service.findMany({ where: visible, select: { slug: true, updatedAt: true } }),
      this.prisma.job.findMany({ where: { status: JobStatus.OPEN }, select: { slug: true, updatedAt: true } }),
    ]);
    return {
      entries: [
        ...pages.map((p) => ({ path: `/${p.slug}`, updatedAt: p.updatedAt })),
        ...services.map((s) => ({ path: `/services/${s.slug}`, updatedAt: s.updatedAt })),
        ...jobs.map((j) => ({ path: `/careers/${j.slug}`, updatedAt: j.updatedAt })),
      ],
    };
  }
}

@Module({ controllers: [SeoController] })
export class SeoModule {}
