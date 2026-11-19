import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { listQuerySchema, PERMISSIONS, TECHNOLOGY_CATEGORIES, technologyInputSchema } from '@asva/shared';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { createCrudController, CrudService, type CrudOptions } from '../common/crud.js';
import { Public } from '../common/decorators.js';
import { MEDIA_SELECT, MediaUrlService } from '../media/media-url.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';

@Injectable()
export class TechnologiesService extends CrudService {
  protected readonly options: CrudOptions = {
    model: 'technology',
    entity: 'technology',
    label: 'Technology',
    tags: ['technologies', 'services'],
    searchFields: ['name', 'slug'],
    orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    include: { logo: { select: MEDIA_SELECT }, _count: { select: { services: true } } },
  };

  constructor(prisma: PrismaService, audit: AuditService, revalidation: RevalidationService, private readonly mediaUrl: MediaUrlService) {
    super(prisma, audit, revalidation);
  }

  protected override listWhere(query: Record<string, string | undefined>) {
    return { ...super.listWhere(query), ...(query.category ? { category: query.category } : {}) };
  }

  protected override toDto(row: { logo: Parameters<MediaUrlService['dto']>[0] } & Record<string, unknown>) {
    return { ...row, logo: this.mediaUrl.dto(row.logo) };
  }

  async listPublic() {
    const rows = await this.prisma.technology.findMany({
      where: { isVisible: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, category: true, websiteUrl: true, logo: { select: MEDIA_SELECT } },
    });
    return rows.map((r) => ({ ...r, logo: this.mediaUrl.dto(r.logo) }));
  }
}

@ApiTags('Technologies')
@Controller('technologies')
export class TechnologiesPublicController {
  constructor(private readonly technologies: TechnologiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Visible technologies, for the technology stack section' })
  list() {
    return this.technologies.listPublic();
  }
}

@Module({
  providers: [TechnologiesService],
  controllers: [
    TechnologiesPublicController,
    createCrudController({
      path: 'technologies',
      tag: 'Technologies',
      permission: PERMISSIONS.TECHNOLOGIES_MANAGE,
      inputSchema: technologyInputSchema,
      querySchema: listQuerySchema.extend({ category: z.enum(TECHNOLOGY_CATEGORIES).optional(), pageSize: z.coerce.number().int().min(1).max(200).default(100) }),
      service: TechnologiesService,
    }),
  ],
})
export class TechnologiesModule {}
