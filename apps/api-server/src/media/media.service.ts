import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '../database/prisma.service';
import { MediaStorageService } from './media-storage.service';
import { CreateMediaDto, SLOT_REGEX } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { Role, MediaType, Prisma } from 'database';
import { detectSignature } from './media-signature';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TYPE_SIZE_LIMITS } from './media.constants';
import { getTemplateDefinition } from '../templates/definitions';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: MediaStorageService,
  ) {}

  private async assertEventAccessible(
    eventId: string,
    currentUserId: string,
    role: Role,
  ) {
    const where: Prisma.EventWhereInput =
      role === Role.SUPER_ADMIN
        ? { id: eventId }
        : { id: eventId, userId: currentUserId };

    const event = await this.prisma.event.findFirst({
      where,
      select: {
        id: true,
        template: {
          select: {
            themeCode: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  private safeSelect(): Prisma.MediaSelect {
    return {
      id: true,
      eventId: true,
      slot: true,
      type: true,
      order: true,
      createdAt: true,
    };
  }

  async previewFile(
    eventId: string,
    mediaId: string,
    userId: string,
    role: Role,
  ) {
    await this.assertEventAccessible(eventId, userId, role);

    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        eventId,
      },
      select: {
        id: true,
        url: true,
        type: true,
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.type !== MediaType.PHOTO && media.type !== MediaType.THUMBNAIL) {
      throw new NotFoundException('Image not found');
    }

    const types: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    const ext = path.extname(media.url).toLowerCase();
    const type = types[ext];
    if (!type) {
      throw new NotFoundException('Image not found');
    }

    try {
      const stat = await this.storageService.getFileStat(media.url);
      return new StreamableFile(
        this.storageService.createReadStream(media.url),
        { type, length: stat.size, disposition: 'inline' },
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Image not found');
      }
      throw error;
    }
  }

  async create(
    eventId: string,
    dto: CreateMediaDto,
    file: Express.Multer.File,
    currentUserId: string,
    role: Role,
  ) {
    const event = await this.assertEventAccessible(
      eventId,
      currentUserId,
      role,
    );

    if (file.size === 0) {
      throw new BadRequestException('File is empty');
    }

    // Normalize and validate slot
    const slot = dto.slot && dto.slot.trim() ? dto.slot.trim() : 'general';
    if (!SLOT_REGEX.test(slot)) {
      throw new BadRequestException(
        'slot must start with a lowercase letter and contain only lowercase alphanumeric characters and hyphens (max 50 chars)',
      );
    }

    const definition = getTemplateDefinition(event.template?.themeCode);

    if (definition) {
      if (slot !== 'general') {
        const slotDef = definition.mediaSlots.find((s) => s.key === slot);
        if (!slotDef) {
          throw new BadRequestException(
            `Slot '${slot}' is not declared in template definition`,
          );
        }

        if (dto.type !== slotDef.mediaType) {
          throw new BadRequestException(
            `Media type '${dto.type}' does not match slot '${slot}' type '${slotDef.mediaType}'`,
          );
        }

        if (slotDef.maxSizeBytes && file.size > slotDef.maxSizeBytes) {
          throw new PayloadTooLargeException(
            `File exceeds size limit for slot '${slot}'`,
          );
        }

        if (!slotDef.multiple) {
          const existingCount = await this.prisma.media.count({
            where: { eventId, slot },
          });
          if (existingCount > 0) {
            throw new ConflictException(
              `Slot '${slot}' already has media. Delete existing media first.`,
            );
          }
        } else {
          if (slotDef.maxItems !== undefined) {
            const existingCount = await this.prisma.media.count({
              where: { eventId, slot },
            });
            if (existingCount >= slotDef.maxItems) {
              throw new BadRequestException(
                `Slot '${slot}' exceeds limit of ${slotDef.maxItems} items`,
              );
            }
          }
        }
      }
    } else {
      if (slot !== 'general') {
        throw new BadRequestException(
          'Template does not support custom media slots',
        );
      }
    }

    const typeResult = detectSignature(file.buffer);
    if (!typeResult) {
      throw new BadRequestException('Unknown or unsupported file signature');
    }

    const { extension, mime: signatureMime } = typeResult;

    let allowedExt = false;
    let limit = 0;

    switch (dto.type) {
      case MediaType.PHOTO:
      case MediaType.THUMBNAIL:
        if (['image/jpeg', 'image/png', 'image/webp'].includes(signatureMime)) {
          allowedExt = true;
          limit = TYPE_SIZE_LIMITS.PHOTO;
        }
        break;
      case MediaType.VIDEO:
        if (signatureMime === 'video/mp4') {
          allowedExt = true;
          limit = TYPE_SIZE_LIMITS.VIDEO;
        }
        break;
      case MediaType.AUDIO:
        if (signatureMime === 'audio/mpeg') {
          allowedExt = true;
          limit = TYPE_SIZE_LIMITS.AUDIO;
        }
        break;
    }

    if (!allowedExt) {
      throw new BadRequestException(
        `File signature ${signatureMime} does not match requested MediaType ${dto.type}`,
      );
    }

    if (file.size > limit) {
      throw new PayloadTooLargeException(
        `File exceeds size limit for ${dto.type}`,
      );
    }

    const key = this.storageService.generateKey(extension);

    // Write file first
    await this.storageService.writeFile(key, file.buffer);

    // Create DB record
    try {
      const media = await this.prisma.media.create({
        data: {
          eventId,
          slot,
          url: key,
          type: dto.type,
          order: dto.order ?? 0,
        },
        select: this.safeSelect(),
      });
      return media;
    } catch (error) {
      try {
        await this.storageService.deleteFile(key);
      } catch (cleanupError: unknown) {
        this.logger.error(
          `Failed to clean up orphaned media file ${key} after DB create error`,
          cleanupError instanceof Error
            ? cleanupError.stack
            : String(cleanupError),
        );
      }
      throw error;
    }
  }

  async findAll(
    eventId: string,
    query: PaginationQueryDto,
    currentUserId: string,
    role: Role,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.media.count({ where: { eventId } }),
      this.prisma.media.findMany({
        where: { eventId },
        skip,
        take: limit,
        select: this.safeSelect(),
        orderBy: [
          { slot: 'asc' },
          { order: 'asc' },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: total === 0 ? 0 : lastPage,
      },
    };
  }

  async findOne(
    eventId: string,
    mediaId: string,
    currentUserId: string,
    role: Role,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        eventId,
      },
      select: this.safeSelect(),
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return media;
  }

  async update(
    eventId: string,
    mediaId: string,
    dto: UpdateMediaDto,
    currentUserId: string,
    role: Role,
  ) {
    const event = await this.assertEventAccessible(
      eventId,
      currentUserId,
      role,
    );

    const currentMedia = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        eventId,
      },
      select: {
        id: true,
        slot: true,
        type: true,
        url: true,
      },
    });

    if (!currentMedia) {
      throw new NotFoundException('Media not found');
    }

    const dataToUpdate: Prisma.MediaUpdateInput = {};

    if (dto.order !== undefined) {
      dataToUpdate.order = dto.order;
    }

    if (dto.slot !== undefined) {
      const newSlot = dto.slot.trim() || 'general';
      if (!SLOT_REGEX.test(newSlot)) {
        throw new BadRequestException(
          'slot must start with a lowercase letter and contain only lowercase alphanumeric characters and hyphens (max 50 chars)',
        );
      }

      if (newSlot !== currentMedia.slot) {
        const definition = getTemplateDefinition(event.template?.themeCode);
        if (definition) {
          if (newSlot !== 'general') {
            const slotDef = definition.mediaSlots.find(
              (s) => s.key === newSlot,
            );
            if (!slotDef) {
              throw new BadRequestException(
                `Slot '${newSlot}' is not declared in template definition`,
              );
            }
            if (currentMedia.type !== slotDef.mediaType) {
              throw new BadRequestException(
                `Media type '${currentMedia.type}' does not match slot '${newSlot}' type '${slotDef.mediaType}'`,
              );
            }
            if (slotDef.maxSizeBytes) {
              const stat = await this.storageService.getFileStat(
                currentMedia.url,
              );
              if (stat.size > slotDef.maxSizeBytes) {
                throw new BadRequestException(
                  `Existing file size (${stat.size} bytes) exceeds target slot maximum size of ${slotDef.maxSizeBytes} bytes`,
                );
              }
            }
            if (!slotDef.multiple) {
              const existingCount = await this.prisma.media.count({
                where: { eventId, slot: newSlot },
              });
              if (existingCount > 0) {
                throw new ConflictException(
                  `Slot '${newSlot}' already has media. Delete existing media first.`,
                );
              }
            } else if (slotDef.maxItems !== undefined) {
              const existingCount = await this.prisma.media.count({
                where: { eventId, slot: newSlot },
              });
              if (existingCount >= slotDef.maxItems) {
                throw new BadRequestException(
                  `Slot '${newSlot}' exceeds limit of ${slotDef.maxItems} items`,
                );
              }
            }
          }
        } else {
          if (newSlot !== 'general') {
            throw new BadRequestException(
              'Template does not support custom media slots',
            );
          }
        }
        dataToUpdate.slot = newSlot;
      }
    }

    try {
      const media = await this.prisma.media.update({
        where: {
          id: mediaId,
          eventId,
        },
        data: dataToUpdate,
        select: this.safeSelect(),
      });
      return media;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Media not found');
      }
      throw error;
    }
  }

  async remove(
    eventId: string,
    mediaId: string,
    currentUserId: string,
    role: Role,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        eventId,
      },
      select: { url: true },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const key = media.url;

    // 1. Delete from DB FIRST
    try {
      await this.prisma.media.delete({
        where: {
          id: mediaId,
          eventId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Media not found');
      }
      throw error;
    }

    // 2. AFTER DB delete succeeds, delete physical file
    try {
      await this.storageService.deleteFile(key);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to delete physical media file ${key} after DB deletion`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
