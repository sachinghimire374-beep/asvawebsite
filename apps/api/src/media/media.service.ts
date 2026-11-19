import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { MediaUpdateInput } from '@asva/shared';
import { ENV, type Env } from '../config/env.js';
import { MediaPurpose, MediaVisibility, type MediaAsset } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { sha256 } from '../common/crypto.js';
import { paginate, pageArgs } from '../common/http.js';
import type { Principal, RequestMeta } from '../common/types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { sanitizeFileName, validateUpload, type UploadKind } from './file-validation.js';
import { MediaUrlService } from './media-url.service.js';
import { STORAGE, type StorageProvider } from './storage.js';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  size: number;
}

interface UploadOptions {
  kind: UploadKind;
  purpose: MediaPurpose;
  visibility: MediaVisibility;
  uploadedById?: string | null;
  altText?: string | null;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE) private readonly storage: StorageProvider,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly urls: MediaUrlService,
  ) {}

  /** Validates, normalises (images are re-encoded to strip EXIF/GPS metadata) and stores a file. */
  private async prepare(file: UploadedFile | undefined, kind: UploadKind) {
    const validated = await validateUpload(file, kind, this.env);
    let buffer = file!.buffer;
    let width: number | null = null;
    let height: number | null = null;
    if (validated.isImage) {
      const image = sharp(buffer, { limitInputPixels: 60_000_000, animated: validated.extension === 'gif' });
      if (validated.extension !== 'gif') {
        const pipeline = image.rotate();
        const encoded =
          validated.extension === 'png' ? pipeline.png({ compressionLevel: 9 }) :
          validated.extension === 'webp' ? pipeline.webp({ quality: 88 }) :
          validated.extension === 'avif' ? pipeline.avif({ quality: 60 }) :
          pipeline.jpeg({ quality: 88, mozjpeg: true });
        const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
        buffer = data;
        width = info.width;
        height = info.height;
      } else {
        const meta = await image.metadata();
        width = meta.width ?? null;
        height = meta.pageHeight ?? meta.height ?? null;
      }
    }
    return { ...validated, buffer, width, height, checksum: sha256(buffer) };
  }

  private storageKey(visibility: MediaVisibility, extension: string): string {
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${visibility.toLowerCase()}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${extension}`;
  }

  async upload(file: UploadedFile | undefined, options: UploadOptions): Promise<MediaAsset> {
    const prepared = await this.prepare(file, options.kind);
    const storageKey = this.storageKey(options.visibility, prepared.extension);
    await this.storage.put(storageKey, prepared.buffer, prepared.mimeType, options.visibility === MediaVisibility.PUBLIC);
    try {
      return await this.prisma.mediaAsset.create({
        data: {
          storageKey,
          storageProvider: this.storage.name,
          originalName: sanitizeFileName(file!.originalname),
          mimeType: prepared.mimeType,
          extension: prepared.extension,
          size: prepared.buffer.length,
          width: prepared.width,
          height: prepared.height,
          checksum: prepared.checksum,
          visibility: options.visibility,
          purpose: options.purpose,
          altText: options.altText ?? null,
          uploadedById: options.uploadedById ?? null,
        },
      });
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  toAdminDto(asset: MediaAsset & { uploadedBy?: { id: string; name: string } | null }) {
    const { storageKey: _key, storageProvider: _provider, ...rest } = asset;
    return { ...rest, url: asset.visibility === MediaVisibility.PUBLIC ? this.urls.url(asset) : null };
  }

  async list(query: { page: number; pageSize: number; q?: string; type: 'image' | 'document' | 'all' }) {
    const where = {
      purpose: MediaPurpose.LIBRARY,
      ...(query.type === 'image' ? { mimeType: { startsWith: 'image/' } } : query.type === 'document' ? { NOT: { mimeType: { startsWith: 'image/' } } } : {}),
      ...(query.q ? { OR: [{ originalName: { contains: query.q, mode: 'insensitive' as const } }, { altText: { contains: query.q, mode: 'insensitive' as const } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query), include: { uploadedBy: { select: { id: true, name: true } } } }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    return paginate(items.map((a) => this.toAdminDto(a)), total, query.page, query.pageSize);
  }

  async get(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id }, include: { uploadedBy: { select: { id: true, name: true } } } });
    if (!asset || asset.purpose !== MediaPurpose.LIBRARY) throw new NotFoundException('Media not found');
    return { ...this.toAdminDto(asset), usage: await this.usage(id) };
  }

  async update(id: string, input: MediaUpdateInput, actor: Principal, meta: RequestMeta) {
    await this.get(id);
    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: { altText: input.altText, caption: input.caption, ...(input.originalName ? { originalName: sanitizeFileName(input.originalName) } : {}) },
    });
    await this.audit.log({ actor, action: 'media.updated', targetType: 'MediaAsset', targetId: id, meta });
    return this.toAdminDto(updated);
  }

  /** Replaces the file behind an asset; every page referencing it picks up the new file. */
  async replace(id: string, file: UploadedFile | undefined, actor: Principal, meta: RequestMeta) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.purpose !== MediaPurpose.LIBRARY) throw new NotFoundException('Media not found');
    const prepared = await this.prepare(file, asset.mimeType.startsWith('image/') ? 'image' : 'library');
    const storageKey = this.storageKey(asset.visibility, prepared.extension);
    await this.storage.put(storageKey, prepared.buffer, prepared.mimeType, asset.visibility === MediaVisibility.PUBLIC);
    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        storageKey,
        storageProvider: this.storage.name,
        originalName: sanitizeFileName(file!.originalname),
        mimeType: prepared.mimeType,
        extension: prepared.extension,
        size: prepared.buffer.length,
        width: prepared.width,
        height: prepared.height,
        checksum: prepared.checksum,
      },
    });
    await this.storage.delete(asset.storageKey).catch((err: unknown) => this.logger.warn({ err, key: asset.storageKey }, 'Old media object could not be deleted'));
    await this.audit.log({ actor, action: 'media.replaced', targetType: 'MediaAsset', targetId: id, metadata: { originalName: updated.originalName }, meta });
    return this.toAdminDto(updated);
  }

  /** Where an asset is referenced. Deletion is blocked while anything uses it. */
  async usage(id: string) {
    const [pages, services, technologies, testimonials, team, settings] = await Promise.all([
      this.prisma.page.findMany({ where: { featuredImageId: id }, select: { id: true, title: true } }),
      this.prisma.service.findMany({ where: { coverImageId: id }, select: { id: true, name: true } }),
      this.prisma.technology.findMany({ where: { logoId: id }, select: { id: true, name: true } }),
      this.prisma.testimonial.findMany({ where: { avatarId: id }, select: { id: true, clientName: true } }),
      this.prisma.teamMember.findMany({ where: { photoId: id }, select: { id: true, name: true } }),
      this.prisma.$queryRaw<{ group: string }[]>`SELECT "group" FROM site_settings WHERE value::text LIKE ${'%' + id + '%'}`,
    ]);
    const inPageContent = await this.prisma.page.findMany({ where: { content: { contains: id } }, select: { id: true, title: true } });
    return [
      ...[...pages, ...inPageContent].map((p) => ({ type: 'Page', id: p.id, label: p.title })),
      ...services.map((s) => ({ type: 'Service', id: s.id, label: s.name })),
      ...technologies.map((t) => ({ type: 'Technology', id: t.id, label: t.name })),
      ...testimonials.map((t) => ({ type: 'Testimonial', id: t.id, label: t.clientName })),
      ...team.map((t) => ({ type: 'Team member', id: t.id, label: t.name })),
      ...settings.map((s) => ({ type: 'Settings', id: s.group, label: `Settings: ${s.group}` })),
    ];
  }

  async remove(id: string, actor: Principal, meta: RequestMeta) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.purpose !== MediaPurpose.LIBRARY) throw new NotFoundException('Media not found');
    const usage = await this.usage(id);
    if (usage.length) {
      throw new ConflictException({
        code: 'MEDIA_IN_USE',
        message: `This file is used in ${usage.length} place(s). Remove it from those items first.`,
        details: usage.map((u) => ({ path: u.type, message: u.label })),
      });
    }
    await this.deleteAsset(asset);
    await this.audit.log({ actor, action: 'media.deleted', targetType: 'MediaAsset', targetId: id, metadata: { originalName: asset.originalName }, meta });
  }

  /** Deletes the database row and the stored object (used for library items and data retention). */
  async deleteAsset(asset: Pick<MediaAsset, 'id' | 'storageKey'>): Promise<void> {
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
    await this.storage.delete(asset.storageKey).catch((err: unknown) => this.logger.warn({ err, key: asset.storageKey }, 'Media object could not be deleted'));
  }

  async open(asset: Pick<MediaAsset, 'storageKey'>) {
    return this.storage.get(asset.storageKey);
  }

  async findPublic(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.visibility !== MediaVisibility.PUBLIC) throw new NotFoundException('File not found');
    return asset;
  }
}
