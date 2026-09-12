import {
  Injectable,
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MediaStorageService } from './media-storage.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { Role, MediaType, Prisma } from 'database';
import { detectSignature } from './media-signature';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TYPE_SIZE_LIMITS } from './media.constants';

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
  ): Promise<void> {
    const where: Prisma.EventWhereInput =
      role === Role.SUPER_ADMIN
        ? { id: eventId }
        : { id: eventId, userId: currentUserId };

    const event = await this.prisma.event.findFirst({
      where,
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
  }

  private safeSelect(): Prisma.MediaSelect {
    return {
      id: true,
      eventId: true,
      url: true,
      type: true,
      order: true,
      createdAt: true,
    };
  }

  async create(
    eventId: string,
    dto: CreateMediaDto,
    file: Express.Multer.File,
    currentUserId: string,
    role: Role,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    if (file.size === 0) {
      throw new BadRequestException('File is empty');
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
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
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
    await this.assertEventAccessible(eventId, currentUserId, role);

    try {
      const media = await this.prisma.media.update({
        where: {
          id: mediaId,
          eventId,
        },
        data: {
          order: dto.order,
        },
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
      // We still return success (204) because the logical record was deleted
    }
  }
}
