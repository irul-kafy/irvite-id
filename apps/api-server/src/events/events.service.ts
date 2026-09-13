import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Role, Prisma } from 'database';
import { projectEventContent, projectWishes } from './public-event-content';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private selectSafeEvent() {
    return {
      id: true,
      userId: true,
      templateId: true,
      title: true,
      slug: true,
      description: true,
      eventDate: true,
      locationDetails: true,
      content: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private async verifyTemplateExists(templateId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true },
    });
    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }
  }

  async create(userId: string, createEventDto: CreateEventDto) {
    const { content, ...eventData } = createEventDto;
    if (
      createEventDto.content?.giftQrMediaId ||
      createEventDto.content?.galleryMediaIds?.length
    ) {
      throw new BadRequestException(
        'Upload and select gift QR after creating the event',
      );
    }
    if (createEventDto.templateId) {
      await this.verifyTemplateExists(createEventDto.templateId);
    }

    try {
      const newEvent = await this.prisma.event.create({
        data: {
          ...eventData,
          ...(content !== undefined
            ? { content: content as Prisma.InputJsonObject }
            : {}),
          userId, // Ownership forced from JWT context
        },
        select: this.selectSafeEvent(),
      });
      return newEvent;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Slug is already in use');
      }
      throw error;
    }
  }

  async findAll(userId: string, role: Role, query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const whereScope = role === Role.SUPER_ADMIN ? {} : { userId };

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where: whereScope,
        skip,
        take: limit,
        select: this.selectSafeEvent(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.event.count({ where: whereScope }),
    ]);

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

  async findOne(id: string, userId: string, role: Role) {
    const whereScope = role === Role.SUPER_ADMIN ? { id } : { id, userId };

    const event = await this.prisma.event.findFirst({
      where: whereScope,
      select: this.selectSafeEvent(),
    });

    if (!event) {
      throw new NotFoundException(`Event not found`);
    }

    return event;
  }

  async update(
    id: string,
    userId: string,
    role: Role,
    updateEventDto: UpdateEventDto,
  ) {
    if (updateEventDto.templateId) {
      await this.verifyTemplateExists(updateEventDto.templateId);
    }

    const { content, ...safeUpdateData } = updateEventDto;
    const whereScope = role === Role.SUPER_ADMIN ? { id } : { id, userId };
    if (updateEventDto.content?.giftQrMediaId) {
      await this.findOne(id, userId, role);
      const gift = await this.prisma.media.findFirst({
        where: {
          id: updateEventDto.content.giftQrMediaId,
          eventId: id,
          type: 'PHOTO',
        },
        select: { id: true },
      });
      if (!gift)
        throw new BadRequestException(
          'Gift QR must be a photo belonging to this event',
        );
    }
    if (updateEventDto.content?.galleryMediaIds?.length) {
      await this.findOne(id, userId, role);
      const photos = await this.prisma.media.findMany({
        where: {
          id: { in: updateEventDto.content.galleryMediaIds },
          eventId: id,
          type: 'PHOTO',
        },
        select: { id: true },
      });
      if (photos.length !== updateEventDto.content.galleryMediaIds.length)
        throw new BadRequestException(
          'Gallery photos must belong to this event',
        );
    }

    try {
      const updatedEvent = await this.prisma.event.update({
        where: whereScope,
        data: {
          ...safeUpdateData,
          ...(content !== undefined
            ? { content: content as Prisma.InputJsonObject }
            : {}),
        },
        select: this.selectSafeEvent(),
      });
      return updatedEvent;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Slug is already in use');
        }
        if (error.code === 'P2025') {
          // Record to update not found
          throw new NotFoundException(`Event not found`);
        }
      }
      throw error;
    }
  }

  async resolvePublic(slug: string) {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      throw new NotFoundException('Event not found');
    }

    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        locationDetails: true,
        content: true,
        invitations: {
          where: { wishedAt: { not: null } },
          select: { wishName: true, wishMessage: true, wishedAt: true },
          orderBy: [{ wishedAt: 'desc' }, { id: 'asc' }],
          take: 20,
        },
        status: true,
        slug: true,
        template: {
          select: {
            themeCode: true,
            config: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Must be PUBLISHED
    if (event.status !== 'PUBLISHED') {
      throw new NotFoundException('Event not found');
    }

    // Must not be expired (eventDate + 30 days)
    const now = new Date();
    const expiryAtMs = event.eventDate.getTime() + 30 * 24 * 60 * 60 * 1000;
    if (now.getTime() >= expiryAtMs) {
      throw new NotFoundException('Event not found');
    }

    // Fetch public medias
    const medias = await this.prisma.media.findMany({
      where: { eventId: event.id },
      select: { id: true, type: true, order: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    const presentation = projectEventContent(
      event.content,
      medias,
      `/events/public/${slug}/media`,
    );
    const mediaDescriptors = medias
      .filter((m) => presentation.galleryMedia.some((item) => item.id === m.id))
      .map((m) => ({
        type: m.type,
        order:
          m.type === 'PHOTO'
            ? (presentation.galleryOrder.get(m.id) ?? m.order)
            : m.order,
        src: `/events/public/${slug}/media/${m.id}`,
      }));

    return {
      event: {
        title: event.title,
        description: event.description,
        eventDate: event.eventDate,
        locationDetails: event.locationDetails,
        content: presentation.content,
        giftQr: presentation.giftQr,
        wishes: projectWishes(event.invitations ?? []),
        slug: event.slug,
      },
      template: event.template
        ? {
            themeCode: event.template.themeCode,
            config: event.template.config,
          }
        : null,
      media: mediaDescriptors,
    };
  }
}
