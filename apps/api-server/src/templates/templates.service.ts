import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { validateTemplateConfig } from './utils/config-validator';
import {
  GENERIC_TEMPLATE_DEFINITION,
  getTemplateDefinition,
} from './definitions';
import { TEMPLATE_STATUS } from './template-status';
import { isBuiltInTemplate } from './sync-templates';
import { Prisma } from 'database';
import { MediaStorageService } from '../media/media-storage.service';
import { detectSignature } from '../media/media-signature';
import {
  parseTemplateAssetMetadata,
  parseTemplatePackageManifest,
  TEMPLATE_PACKAGE_LIMITS,
  TemplateAssetSlot,
} from './template-package';
import { randomUUID } from 'crypto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorageService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [rawTemplates, total] = await Promise.all([
      this.prisma.template.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { events: true },
          },
        },
      }),
      this.prisma.template.count(),
    ]);

    const data = rawTemplates.map(({ _count, ...rest }) => ({
      ...rest,
      eventUsageCount: _count?.events ?? 0,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: {
        assets: {
          select: { id: true, slot: true, order: true, mimeType: true },
        },
        _count: {
          select: { events: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    const { _count, ...rest } = template;
    return {
      ...rest,
      eventUsageCount: _count?.events ?? 0,
    };
  }

  async create(createTemplateDto: CreateTemplateDto) {
    if (createTemplateDto.config) {
      validateTemplateConfig(createTemplateDto.config);
    }

    const newTemplate = await this.prisma.template.create({
      data: {
        name: createTemplateDto.name,
        themeCode: createTemplateDto.themeCode,
        config: createTemplateDto.config
          ? (createTemplateDto.config as object)
          : undefined,
        previewImageUrl: createTemplateDto.previewImageUrl,
        renderer:
          createTemplateDto.themeCode === 'GENERIC' ? 'GENERIC' : 'CODED',
      },
    });

    return newTemplate;
  }

  async importPackage(
    manifestJson: string,
    assetMetadataJson: string,
    files: Express.Multer.File[],
  ) {
    const manifest = parseTemplatePackageManifest(manifestJson);
    const metadata = parseTemplateAssetMetadata(assetMetadataJson);
    const expectedSlots: Array<{ slot: string; order: number }> = [];
    if (manifest.assets?.thumbnail)
      expectedSlots.push({ slot: 'thumbnail', order: 0 });
    if (manifest.assets?.background)
      expectedSlots.push({ slot: 'background', order: 0 });
    manifest.assets?.ornaments?.forEach((_, order) =>
      expectedSlots.push({ slot: 'ornament', order }),
    );
    if (manifest.assets?.music) expectedSlots.push({ slot: 'music', order: 0 });
    if (
      expectedSlots.length !== metadata.length ||
      expectedSlots.some(
        (expected, index) =>
          !metadata.some(
            (item) =>
              item.fieldName === `asset_${index}` &&
              item.slot === expected.slot &&
              item.order === expected.order,
          ),
      )
    ) {
      throw new BadRequestException(
        'Uploaded assets must match the manifest declarations',
      );
    }
    if (
      files.length !== metadata.length ||
      new Set(files.map((file) => file.fieldname)).size !== files.length
    ) {
      throw new BadRequestException(
        'Every uploaded asset must be declared exactly once',
      );
    }
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > TEMPLATE_PACKAGE_LIMITS.totalAssetBytes) {
      throw new PayloadTooLargeException(
        'Template assets exceed the 30MB package limit',
      );
    }

    const existing = await this.prisma.template.findFirst({
      where: { themeCode: manifest.themeCode },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(
        'themeCode is already used by another template',
      );

    const metadataByField = new Map(
      metadata.map((item) => [item.fieldName, item]),
    );
    const prepared = files.map((file) => {
      const meta = metadataByField.get(file.fieldname);
      if (!meta)
        throw new BadRequestException('An undeclared asset was uploaded');
      const detected = this.detectTemplateAsset(file.buffer, meta.slot);
      const limit =
        meta.slot === 'music'
          ? TEMPLATE_PACKAGE_LIMITS.audioBytes
          : TEMPLATE_PACKAGE_LIMITS.imageBytes;
      if (file.size > limit)
        throw new PayloadTooLargeException(
          `${meta.slot} asset exceeds its size limit`,
        );
      const id = randomUUID();
      return {
        id,
        slot: meta.slot,
        order: meta.order,
        mimeType: detected.mimeType,
        storageKey: this.storage.generateKey(detected.extension),
        buffer: file.buffer,
      };
    });

    const thumbnail = prepared.find((asset) => asset.slot === 'thumbnail');
    const writtenKeys: string[] = [];
    try {
      for (const asset of prepared) {
        writtenKeys.push(asset.storageKey);
        await this.storage.writeFile(asset.storageKey, asset.buffer);
      }

      return await this.prisma.$transaction(
        async (tx) => {
          // Serializable predicate reads prevent simultaneous imports of the same
          // themeCode without changing legacy templates' identity constraints.
          if (
            await tx.template.findFirst({
              where: { themeCode: manifest.themeCode },
              select: { id: true },
            })
          ) {
            throw new ConflictException(
              'themeCode is already used by another template',
            );
          }
          const template = await tx.template.create({
            data: {
              name: manifest.name,
              themeCode: manifest.themeCode,
              renderer: 'GENERIC',
              status: TEMPLATE_STATUS.HIDDEN,
              config: {
                version: manifest.config.version,
                theme: { ...manifest.config.theme },
                typography: { ...manifest.config.typography },
                sections: manifest.config.sections.map((section) => ({
                  ...section,
                })),
              },
              previewImageUrl: thumbnail
                ? `/templates/assets/${thumbnail.id}/file`
                : undefined,
            },
          });
          if (prepared.length > 0) {
            await tx.templateAsset.createMany({
              data: prepared.map((asset) => ({
                id: asset.id,
                slot: asset.slot,
                order: asset.order,
                mimeType: asset.mimeType,
                storageKey: asset.storageKey,
                templateId: template.id,
              })),
            });
          }
          return { ...template, assetCount: prepared.length };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      await Promise.allSettled(
        writtenKeys.map((key) => this.storage.deleteFile(key)),
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Another template import is in progress. Check the catalog before retrying.',
        );
      }
      throw error;
    }
  }

  async getAssetFile(assetId: string) {
    const asset = await this.prisma.templateAsset.findUnique({
      where: { id: assetId },
      select: { storageKey: true, mimeType: true },
    });
    if (!asset) throw new NotFoundException('Template asset not found');
    const stat = await this.storage
      .getFileStat(asset.storageKey)
      .catch(() => null);
    if (!stat) throw new NotFoundException('Template asset file not found');
    return {
      stream: this.storage.createReadStream(asset.storageKey),
      size: stat.size,
      mimeType: asset.mimeType,
    };
  }

  private detectTemplateAsset(buffer: Buffer, slot: TemplateAssetSlot) {
    const detected = detectSignature(buffer);
    if (!detected)
      throw new BadRequestException(
        'Unsupported or unrecognized asset file signature',
      );
    if (slot === 'music' && detected.mime !== 'audio/mpeg') {
      throw new BadRequestException('The music slot only accepts MP3 audio');
    }
    if (slot !== 'music' && !['PNG', 'JPEG', 'WEBP'].includes(detected.kind)) {
      throw new BadRequestException(
        `${slot} only accepts PNG, JPEG, or WebP images`,
      );
    }
    return { mimeType: detected.mime, extension: detected.extension };
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto) {
    // Check if exists
    const current = await this.findOne(id);
    if (
      current.renderer === 'GENERIC' &&
      updateTemplateDto.themeCode !== undefined &&
      updateTemplateDto.themeCode !== current.themeCode
    ) {
      throw new BadRequestException(
        'Imported template themeCode cannot be changed',
      );
    }

    const data: import('@prisma/client').Prisma.TemplateUpdateInput = {
      name: updateTemplateDto.name,
      themeCode: updateTemplateDto.themeCode,
      previewImageUrl: updateTemplateDto.previewImageUrl,
      status: updateTemplateDto.status,
    };
    if (updateTemplateDto.config !== undefined) {
      validateTemplateConfig(updateTemplateDto.config);
      data.config = updateTemplateDto.config as object;
    }

    const updatedTemplate = await this.prisma.template.update({
      where: { id },
      data,
    });

    return updatedTemplate;
  }

  async permanentDelete(id: string) {
    // 1. find template
    const template = await this.prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        themeCode: true,
        status: true,
        assets: { select: { storageKey: true } },
      },
    });

    // 2. 404 if missing
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // 3. reject built-in template with ConflictException (409)
    if (isBuiltInTemplate(template.themeCode)) {
      throw new ConflictException(
        'Built-in system templates cannot be permanently deleted. Archive the template instead.',
      );
    }

    // 4. require status === ARCHIVED
    if (template.status !== TEMPLATE_STATUS.ARCHIVED) {
      throw new BadRequestException(
        `Only archived templates can be permanently deleted. Current status is ${template.status}. Archive the template first.`,
      );
    }

    // 5. count Event references
    const eventUsageCount = await this.prisma.event.count({
      where: { templateId: id },
    });

    // 6. if count > 0 -> ConflictException (409)
    if (eventUsageCount > 0) {
      throw new ConflictException(
        `Cannot delete template: it is referenced by ${eventUsageCount} event(s). Templates with event references cannot be permanently deleted.`,
      );
    }

    // 7. delete template
    try {
      if (template.assets.length > 0) {
        await this.prisma.$transaction(async (tx) => {
          await tx.templateAsset.deleteMany({ where: { templateId: id } });
          await tx.template.delete({ where: { id } });
        });
      } else {
        await this.prisma.template.delete({ where: { id } });
      }

      if (this.storage) {
        const cleanup = await Promise.allSettled(
          template.assets.map((asset) =>
            this.storage.deleteFile(asset.storageKey),
          ),
        );
        if (cleanup.some((result) => result.status === 'rejected')) {
          this.logger.error(
            `One or more asset files for template ${id} could not be removed`,
          );
        }
      }

      return {
        status: 'success',
        message: `Template "${template.name}" permanently deleted successfully`,
        data: {
          id: template.id,
          name: template.name,
          themeCode: template.themeCode,
        },
      };
    } catch (error: unknown) {
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2003') ||
        (error &&
          typeof error === 'object' &&
          (error as { code?: string }).code === 'P2003')
      ) {
        throw new ConflictException(
          'Cannot delete template: it is referenced by one or more events.',
        );
      }
      throw error;
    }
  }

  async getDefinition(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      select: { id: true, themeCode: true, renderer: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    const definition =
      template.renderer === 'GENERIC'
        ? GENERIC_TEMPLATE_DEFINITION
        : getTemplateDefinition(template.themeCode);
    if (!definition) {
      throw new NotFoundException(
        `No structured definition found for template theme "${template.themeCode}"`,
      );
    }

    return {
      templateId: template.id,
      themeCode: definition.themeCode,
      schemaVersion: definition.schemaVersion,
      contentFields: definition.contentFields,
      mediaSlots: definition.mediaSlots,
    };
  }

  async getPublicAvailability() {
    return this.prisma.template.findMany({
      select: {
        themeCode: true,
        status: true,
      },
      orderBy: { themeCode: 'asc' },
    });
  }

  async getPublicPackages() {
    return this.prisma.template.findMany({
      where: { renderer: 'GENERIC', status: TEMPLATE_STATUS.AVAILABLE },
      select: { id: true, name: true, themeCode: true, previewImageUrl: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicPackage(id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, renderer: 'GENERIC', status: TEMPLATE_STATUS.AVAILABLE },
      select: {
        name: true,
        themeCode: true,
        config: true,
        assets: {
          select: { id: true, slot: true, mimeType: true, order: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException('Published template not found');
    return {
      ...template,
      assets: template.assets.map(({ id: assetId, ...asset }) => ({
        ...asset,
        src: `/templates/assets/${assetId}/file`,
      })),
    };
  }
}
