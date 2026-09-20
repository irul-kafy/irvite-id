import { EVENT_STATUS } from './event-status';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Role, Prisma } from 'database';
import { validateEventContent } from '../templates/definitions';

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
      select: { id: true, themeCode: true },
    });
    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }
    return template;
  }

  async create(userId: string, createEventDto: CreateEventDto) {
    let themeCode: string | null = null;
    if (createEventDto.templateId) {
      const template = await this.verifyTemplateExists(
        createEventDto.templateId,
      );
      themeCode = template.themeCode;
    }

    const { content, ...eventData } = createEventDto;
    const validatedContent = validateEventContent(content, themeCode);

    try {
      const newEvent = await this.prisma.event.create({
        data: {
          ...eventData,
          content: validatedContent as Prisma.InputJsonValue,
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
    const whereScope = role === Role.SUPER_ADMIN ? { id } : { id, userId };

    const existingEvent = await this.prisma.event.findFirst({
      where: whereScope,
      select: {
        id: true,
        status: true,
        templateId: true,
        content: true,
        template: {
          select: {
            themeCode: true,
          },
        },
      },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event not found`);
    }

    let activeThemeCode = existingEvent.template?.themeCode ?? null;

    // Template change rule
    if (
      updateEventDto.templateId !== undefined &&
      updateEventDto.templateId !== existingEvent.templateId
    ) {
      if (existingEvent.status === 'PUBLISHED') {
        throw new ConflictException(
          'Cannot change template on a published event',
        );
      }

      const existingContent = existingEvent.content as Record<
        string,
        unknown
      > | null;
      if (existingContent && Object.keys(existingContent).length > 0) {
        throw new ConflictException(
          'Clear event content before changing template',
        );
      }

      const templateMediaCount = await this.prisma.media.count({
        where: {
          eventId: id,
          slot: { not: 'general' },
        },
      });

      if (templateMediaCount > 0) {
        throw new ConflictException(
          'Remove template-specific media before changing template',
        );
      }

      if (updateEventDto.templateId) {
        const newTemplate = await this.verifyTemplateExists(
          updateEventDto.templateId,
        );
        activeThemeCode = newTemplate.themeCode;
      } else {
        activeThemeCode = null;
      }
    }

    const { content, ...safeUpdateData } = updateEventDto;
    const dataToUpdate: Prisma.EventUpdateInput = {
      ...safeUpdateData,
    };

    if (content !== undefined) {
      const validatedContent = validateEventContent(content, activeThemeCode);
      dataToUpdate.content = validatedContent as Prisma.InputJsonValue;
    }

    try {
      const updatedEvent = await this.prisma.event.update({
        where: whereScope,
        data: dataToUpdate,
        select: this.selectSafeEvent(),
      });
      return updatedEvent;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Slug is already in use');
        }
        if (error.code === 'P2025') {
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
      select: { id: true, type: true, slot: true, order: true },
      orderBy: [
        { slot: 'asc' },
        { order: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    const mediaDescriptors = medias.map((m) => ({
      id: m.id,
      type: m.type,
      slot: m.slot,
      order: m.order,
      src: `/events/public/${slug}/media/${m.id}`,
    }));

    const mediaBySlot: Record<string, typeof mediaDescriptors> = {};
    for (const m of mediaDescriptors) {
      if (!mediaBySlot[m.slot]) {
        mediaBySlot[m.slot] = [];
      }
      mediaBySlot[m.slot].push(m);
    }

    let publicContent: Record<string, unknown> | null = null;
    if (event.content) {
      try {
        publicContent = validateEventContent(
          event.content,
          event.template?.themeCode,
        );
      } catch {
        // Fail closed: do not expose malformed or unvalidated content publicly
        publicContent = null;
      }
    }

    return {
      event: {
        title: event.title,
        description: event.description,
        eventDate: event.eventDate,
        locationDetails: event.locationDetails,
        slug: event.slug,
        content: publicContent,
      },
      template: event.template
        ? {
            themeCode: event.template.themeCode,
            config: event.template.config,
          }
        : null,
      media: mediaDescriptors,
      mediaBySlot,
    };
  }
  async archive(id: string, userId: string, role: Role) {
    const whereScope = role === Role.SUPER_ADMIN ? { id } : { id, userId };

    const existingEvent = await this.prisma.event.findFirst({
      where: whereScope,
      select: { id: true, status: true },
    });

    if (!existingEvent) {
      throw new NotFoundException('Event not found');
    }

    if (existingEvent.status === EVENT_STATUS.ARCHIVED) {
      return { success: true, message: 'Event is already archived' };
    }

    await this.prisma.event.update({
      where: { id },
      data: { status: EVENT_STATUS.ARCHIVED },
    });

    return { success: true, message: 'Event archived successfully' };
  }
}
