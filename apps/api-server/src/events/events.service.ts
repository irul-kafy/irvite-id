import { EVENT_STATUS } from './event-status';
import { isPublicInvitationExpired } from '../invitations/public-invitation-expiry';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { MediaStorageService } from '../media/media-storage.service';
import { detectSignature } from '../media/media-signature';
import { PrismaService } from '../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreatePublicDraftDto } from './dto/create-public-draft.dto';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventListQueryDto } from './dto/event-list-query.dto';
import { WishListQueryDto } from './dto/wish-list-query.dto';
import { Role, MediaType, Prisma } from 'database';
import {
  getTemplateDefinition,
  validateEventContent,
} from '../templates/definitions';
import { computeDefaultClientKey } from '../client-portal/client-portal.service';

export function stripPublicDraftTag(title: string | null | undefined): string {
  if (!title || typeof title !== 'string') return '';
  return title
    .replace(/\s*\((?:Draf Klien|PENGAJUAN KLIEN)\s*#[A-Za-z0-9-]+\)/gi, '')
    .trim();
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  private selectSafeEvent() {
    return {
      id: true,
      userId: true,
      templateId: true,
      title: true,
      slug: true,
      description: true,
      eventDate: true,
      activeUntil: true,
      locationDetails: true,
      content: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          id: true,
          referenceCode: true,
          packageCode: true,
          priceAmount: true,
          status: true,
          paidAt: true,
        },
      },
    };
  }

  private async verifyTemplateExists(templateId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true, themeCode: true, status: true },
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
      if (template.status !== 'AVAILABLE') {
        throw new BadRequestException(
          `Template is not available for new usage (status: ${template.status})`,
        );
      }
      themeCode = template.themeCode;
    }

    const { content, ...eventData } = createEventDto;
    const validatedContent = validateEventContent(content, themeCode);

    const eventDateParsed = new Date(eventData.eventDate);
    const activeUntilParsed =
      eventData.activeUntil && !isNaN(Date.parse(eventData.activeUntil))
        ? new Date(eventData.activeUntil)
        : new Date(eventDateParsed.getTime() + 180 * 24 * 60 * 60 * 1000);

    try {
      const newEvent = await this.prisma.event.create({
        data: {
          ...eventData,
          eventDate: eventDateParsed,
          activeUntil: activeUntilParsed,
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

  async findAll(userId: string, role: Role, query: EventListQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const whereScope: Prisma.EventWhereInput =
      role === Role.SUPER_ADMIN ? {} : { userId };
    if (query.filter === 'active')
      whereScope.status = { in: ['DRAFT', 'PUBLISHED'] };
    if (query.filter === 'archived') whereScope.status = 'ARCHIVED';

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where: whereScope,
        skip,
        take: limit,
        select: this.selectSafeEvent(),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
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

  async summary(userId: string, role: Role) {
    const scope: Prisma.EventWhereInput =
      role === Role.SUPER_ADMIN ? {} : { userId };
    const upcoming = {
      ...scope,
      status: { not: 'ARCHIVED' },
      eventDate: { gte: new Date() },
    };
    const [
      totalEvents,
      publishedEvents,
      upcomingEvents,
      totalGuests,
      templates,
      totalInvitations,
      attending,
      declined,
      nextEvents,
      templateHighlights,
    ] = await Promise.all([
      this.prisma.event.count({ where: scope }),
      this.prisma.event.count({ where: { ...scope, status: 'PUBLISHED' } }),
      this.prisma.event.count({ where: upcoming }),
      this.prisma.guest.count({ where: { event: scope } }),
      this.prisma.template.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.invitation.count({ where: { event: scope } }),
      this.prisma.invitation.count({
        where: { event: scope, status: 'RSVP_YES' },
      }),
      this.prisma.invitation.count({
        where: { event: scope, status: 'RSVP_NO' },
      }),
      this.prisma.event.findMany({
        where: upcoming,
        take: 5,
        orderBy: [{ eventDate: 'asc' }, { id: 'asc' }],
        select: {
          ...this.selectSafeEvent(),
          _count: { select: { guests: true } },
        },
      }),
      this.prisma.template.findMany({
        where: { status: 'AVAILABLE' },
        take: 4,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, themeCode: true },
      }),
    ]);
    const rsvp = {
      totalInvitations,
      attending,
      declined,
      pending: totalInvitations - attending - declined,
    };
    return {
      totalEvents,
      publishedEvents,
      upcomingEvents,
      totalGuests,
      templates,
      rsvp,
      templateHighlights,
      nextEvents: nextEvents.map(({ _count, ...event }) => ({
        ...event,
        guestCount: _count.guests,
      })),
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

    const content =
      event.content &&
      typeof event.content === 'object' &&
      !Array.isArray(event.content)
        ? (event.content as Record<string, unknown>)
        : {};

    const clientKey =
      (typeof content.clientKey === 'string' ? content.clientKey : undefined) ||
      computeDefaultClientKey(event.id, event.createdAt);

    const clientPortalEnabled = content.clientPortalEnabled !== false;

    let safeContent = event.content;
    if ('_mediaFallback' in content) {
      const restContent = { ...content };
      delete restContent._mediaFallback;
      safeContent = restContent as Prisma.JsonValue;
    }

    return {
      ...event,
      content: safeContent,
      clientKey,
      clientPortalEnabled,
    };
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
        title: true,
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

    if (existingEvent.status === EVENT_STATUS.ARCHIVED) {
      throw new ConflictException(
        'Archived events cannot be modified. Restore the event first.',
      );
    }

    if (updateEventDto.status === EVENT_STATUS.ARCHIVED) {
      throw new ConflictException(
        'Archiving must be performed via archive action',
      );
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
        if (newTemplate.status !== 'AVAILABLE') {
          throw new BadRequestException(
            `Template is not available for new usage (status: ${newTemplate.status})`,
          );
        }
        activeThemeCode = newTemplate.themeCode;
      } else {
        activeThemeCode = null;
      }
    }

    const {
      content,
      clientPortalEnabled,
      regenerateClientKey,
      ...safeUpdateData
    } = updateEventDto;
    const dataToUpdate: Prisma.EventUpdateInput = {
      ...safeUpdateData,
    };
    if (safeUpdateData.activeUntil) {
      dataToUpdate.activeUntil = new Date(safeUpdateData.activeUntil);
    }
    if (safeUpdateData.eventDate) {
      dataToUpdate.eventDate = new Date(safeUpdateData.eventDate);
    }

    const existingContentObj =
      existingEvent.content &&
      typeof existingEvent.content === 'object' &&
      !Array.isArray(existingEvent.content)
        ? { ...(existingEvent.content as Record<string, unknown>) }
        : {};

    let contentToUpdateObj: Record<string, unknown> | null = null;

    if (content !== undefined) {
      if (content === null) {
        dataToUpdate.content = Prisma.DbNull;
      } else {
        const validatedContent = validateEventContent(content, activeThemeCode);
        const incomingContentObj =
          content && typeof content === 'object' && !Array.isArray(content)
            ? (content as Record<string, unknown>)
            : {};

        const integrationsToPreserve =
          incomingContentObj.integrations || existingContentObj.integrations;

        contentToUpdateObj = validatedContent ? { ...validatedContent } : {};
        if (integrationsToPreserve) {
          contentToUpdateObj.integrations = integrationsToPreserve;
        }
        if (incomingContentObj.clientPortalEnabled !== undefined) {
          contentToUpdateObj.clientPortalEnabled =
            incomingContentObj.clientPortalEnabled;
        } else if (existingContentObj.clientPortalEnabled !== undefined) {
          contentToUpdateObj.clientPortalEnabled =
            existingContentObj.clientPortalEnabled;
        }
        if (incomingContentObj.clientKey) {
          contentToUpdateObj.clientKey = incomingContentObj.clientKey;
        } else if (existingContentObj.clientKey) {
          contentToUpdateObj.clientKey = existingContentObj.clientKey;
        }
        if (existingContentObj._mediaFallback) {
          contentToUpdateObj._mediaFallback = existingContentObj._mediaFallback;
        }
      }
    }

    if (clientPortalEnabled !== undefined) {
      if (!contentToUpdateObj) {
        contentToUpdateObj = { ...existingContentObj };
      }
      contentToUpdateObj.clientPortalEnabled = clientPortalEnabled;
    }

    if (regenerateClientKey) {
      if (!contentToUpdateObj) {
        contentToUpdateObj = { ...existingContentObj };
      }
      contentToUpdateObj.clientKey = crypto.randomBytes(12).toString('hex');
    }

    if (contentToUpdateObj) {
      dataToUpdate.content = contentToUpdateObj as Prisma.InputJsonObject;
    }

    if (
      updateEventDto.status === 'PUBLISHED' &&
      updateEventDto.title === undefined &&
      typeof existingEvent.title === 'string' &&
      /\((?:Draf Klien|PENGAJUAN KLIEN)\s*#[A-Za-z0-9-]+\)/i.test(
        existingEvent.title,
      )
    ) {
      const cleanedTitle = stripPublicDraftTag(existingEvent.title);
      if (cleanedTitle) {
        dataToUpdate.title = cleanedTitle;
      }
    }

    try {
      const updatedEvent = await this.prisma.event.update({
        where: { id: existingEvent.id },
        data: dataToUpdate,
        select: this.selectSafeEvent(),
      });

      const updatedContent =
        updatedEvent.content &&
        typeof updatedEvent.content === 'object' &&
        !Array.isArray(updatedEvent.content)
          ? (updatedEvent.content as Record<string, unknown>)
          : {};

      const clientKey =
        (typeof updatedContent.clientKey === 'string'
          ? updatedContent.clientKey
          : undefined) ||
        computeDefaultClientKey(updatedEvent.id, updatedEvent.createdAt);

      const clientPortalEnabled = updatedContent.clientPortalEnabled !== false;

      let safeUpdatedContent = updatedEvent.content;
      if ('_mediaFallback' in updatedContent) {
        const restUpdatedContent = { ...updatedContent };
        delete restUpdatedContent._mediaFallback;
        safeUpdatedContent = restUpdatedContent as Prisma.JsonValue;
      }

      return {
        ...updatedEvent,
        content: safeUpdatedContent,
        clientKey,
        clientPortalEnabled,
      };
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
        activeUntil: true,
        locationDetails: true,
        content: true,
        status: true,
        slug: true,
        template: {
          select: {
            themeCode: true,
            config: true,
            assets: {
              select: { id: true, slot: true, mimeType: true, order: true },
              orderBy: [{ slot: 'asc' }, { order: 'asc' }],
            },
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

    // Must not be expired
    const now = new Date();
    if (isPublicInvitationExpired(event.eventDate, now, event.activeUntil)) {
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

    const [wishesCount, wishesList] = await Promise.all([
      this.prisma.wish
        ? this.prisma.wish.count({ where: { eventId: event.id } })
        : Promise.resolve(0),
      this.prisma.wish
        ? this.prisma.wish.findMany({
            where: { eventId: event.id },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: { id: true, name: true, message: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const safeWishesList = Array.isArray(wishesList) ? wishesList : [];
    const safeWishesCount =
      typeof wishesCount === 'number' ? wishesCount : safeWishesList.length;

    return {
      event: {
        title: stripPublicDraftTag(event.title) || event.title,
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
            ...(event.template.assets?.length
              ? {
                  assets: event.template.assets.map((asset) => ({
                    slot: asset.slot,
                    mimeType: asset.mimeType,
                    order: asset.order,
                    src: `/templates/assets/${asset.id}/file`,
                  })),
                }
              : {}),
          }
        : null,
      media: mediaDescriptors,
      mediaBySlot,
      wishes: {
        title: 'Untaian Doa & Ucapan',
        description:
          'Doa restu dan ucapan hangat dari keluarga, sahabat, dan kerabat terkasih.',
        total: safeWishesCount,
        items: safeWishesList.map((w) => ({
          id: w.id,
          name: w.name,
          message: w.message,
          createdAt:
            w.createdAt instanceof Date
              ? w.createdAt.toISOString()
              : String(w.createdAt),
        })),
      },
    };
  }

  async getPublicWishes(slug: string, limit = 50) {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      throw new NotFoundException('Event not found');
    }

    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, status: true, eventDate: true },
    });

    if (!event || event.status !== 'PUBLISHED') {
      throw new NotFoundException('Event not found');
    }

    const safeLimit = Math.min(Math.max(1, limit), 100);

    const [total, items] = await Promise.all([
      this.prisma.wish
        ? this.prisma.wish.count({ where: { eventId: event.id } })
        : Promise.resolve(0),
      this.prisma.wish
        ? this.prisma.wish.findMany({
            where: { eventId: event.id },
            orderBy: { createdAt: 'desc' },
            take: safeLimit,
            select: { id: true, name: true, message: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const safeItems = Array.isArray(items) ? items : [];
    const safeTotal = typeof total === 'number' ? total : safeItems.length;

    return {
      total: safeTotal,
      items: safeItems.map((w) => ({
        id: w.id,
        name: w.name,
        message: w.message,
        createdAt:
          w.createdAt instanceof Date
            ? w.createdAt.toISOString()
            : String(w.createdAt),
      })),
    };
  }

  async createPublicWish(slug: string, dto: CreateWishDto) {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      throw new NotFoundException('Event not found');
    }

    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, status: true, eventDate: true },
    });

    if (!event || event.status !== 'PUBLISHED') {
      throw new NotFoundException('Event not found');
    }

    const now = new Date();
    const expiryAtMs = event.eventDate.getTime() + 30 * 24 * 60 * 60 * 1000;
    if (now.getTime() >= expiryAtMs) {
      throw new BadRequestException('Event has expired');
    }

    const cleanName = (dto.name || '')
      .replace(/<[^>]*>?/gm, '')
      .trim()
      .slice(0, 120);

    const cleanMessage = (dto.message || '')
      .replace(/<[^>]*>?/gm, '')
      .trim()
      .slice(0, 500);

    if (!cleanName || !cleanMessage) {
      throw new BadRequestException('Nama dan pesan ucapan wajib diisi');
    }

    const wish = await this.prisma.wish.create({
      data: {
        eventId: event.id,
        name: cleanName,
        message: cleanMessage,
      },
      select: {
        id: true,
        name: true,
        message: true,
        createdAt: true,
      },
    });

    return {
      id: wish.id,
      name: wish.name,
      message: wish.message,
      createdAt: wish.createdAt.toISOString(),
    };
  }

  async getAdminWishes(
    eventId: string,
    userId: string,
    role: Role,
    query: WishListQueryDto,
  ) {
    const whereScope =
      role === Role.SUPER_ADMIN ? { id: eventId } : { id: eventId, userId };

    const event = await this.prisma.event.findFirst({
      where: whereScope,
      select: { id: true, title: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    const where: Prisma.WishWhereInput = {
      eventId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { message: { contains: search } },
            ],
          }
        : {}),
    };

    let total = 0;
    let items: Array<{
      id: string;
      name: string;
      message: string;
      createdAt: Date | string;
    }> = [];

    try {
      if (this.prisma.wish) {
        const [wCount, wList] = await Promise.all([
          this.prisma.wish.count({ where }).catch(() => 0),
          this.prisma.wish
            .findMany({
              where,
              orderBy: { createdAt: 'desc' },
              skip,
              take: limit,
              select: { id: true, name: true, message: true, createdAt: true },
            })
            .catch(() => []),
        ]);
        total = typeof wCount === 'number' ? wCount : 0;
        items = Array.isArray(wList) ? wList : [];
      }
    } catch {
      total = 0;
      items = [];
    }

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      items: items.map((w) => ({
        id: w.id,
        name: w.name,
        message: w.message,
        createdAt:
          w.createdAt instanceof Date
            ? w.createdAt.toISOString()
            : String(w.createdAt),
      })),
    };
  }

  async deleteWish(
    eventId: string,
    wishId: string,
    userId: string,
    role: Role,
  ) {
    const whereScope =
      role === Role.SUPER_ADMIN ? { id: eventId } : { id: eventId, userId };

    const event = await this.prisma.event.findFirst({
      where: whereScope,
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (!wishId || typeof wishId !== 'string') {
      throw new BadRequestException('ID ucapan tidak valid');
    }

    const wish = await this.prisma.wish.findFirst({
      where: {
        id: wishId,
        eventId,
      },
      select: { id: true, name: true },
    });

    if (!wish) {
      throw new NotFoundException('Ucapan tidak ditemukan');
    }

    await this.prisma.wish.delete({
      where: { id: wishId },
    });

    return {
      success: true,
      message: 'Ucapan berhasil dihapus',
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

  async restore(id: string, userId: string, role: Role) {
    const whereScope = role === Role.SUPER_ADMIN ? { id } : { id, userId };

    const existingEvent = await this.prisma.event.findFirst({
      where: whereScope,
      select: { id: true, status: true },
    });

    if (!existingEvent) {
      throw new NotFoundException('Event not found');
    }

    if (existingEvent.status !== EVENT_STATUS.ARCHIVED) {
      throw new ConflictException(
        `Only archived events can be restored. Current status is ${existingEvent.status}.`,
      );
    }

    const restoredEvent = await this.prisma.event.update({
      where: { id },
      data: { status: EVENT_STATUS.DRAFT },
      select: this.selectSafeEvent(),
    });

    return {
      success: true,
      message: 'Event restored successfully to DRAFT status',
      data: restoredEvent,
    };
  }

  async permanentDelete(id: string, userId: string, role: Role) {
    if (role !== Role.SUPER_ADMIN && role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Forbidden: Insufficient permissions to delete event permanently',
      );
    }
    const whereScope = role === Role.SUPER_ADMIN ? { id } : { id, userId };

    const existingEvent = await this.prisma.event.findFirst({
      where: whereScope,
      select: { id: true, title: true, status: true },
    });

    if (!existingEvent) {
      throw new NotFoundException('Event not found');
    }

    if (existingEvent.status !== EVENT_STATUS.ARCHIVED) {
      throw new BadRequestException(
        `Only archived events can be permanently deleted. Current status is ${existingEvent.status}. Archive the event first.`,
      );
    }

    // Step 1: Collect only media file keys belonging to target event BEFORE DB deletion
    const eventMedias = await this.prisma.media.findMany({
      where: { eventId: id },
      select: { url: true },
    });
    const mediaUrls = eventMedias.map((m) => m.url);

    // Step 2: Atomic bottom-up database deletion in transaction
    const deletedCounts = await this.prisma.$transaction(async (tx) => {
      // 1. attendance_check_ins
      const checkIns = await tx.attendanceCheckIn.deleteMany({
        where: {
          attendance: {
            eventId: id,
          },
        },
      });

      // 2. attendances
      const attendances = await tx.attendance.deleteMany({
        where: { eventId: id },
      });

      // 3. invitations
      const invitations = await tx.invitation.deleteMany({
        where: { eventId: id },
      });

      // 4. guests
      const guests = await tx.guest.deleteMany({
        where: { eventId: id },
      });

      // 5. medias
      const medias = await tx.media.deleteMany({
        where: { eventId: id },
      });

      // 6. staff_events
      const staffEvents = await tx.staffEvent.deleteMany({
        where: { eventId: id },
      });

      // 7. event
      await tx.event.delete({
        where: { id },
      });

      return {
        checkIns: checkIns.count,
        attendances: attendances.count,
        invitations: invitations.count,
        guests: guests.count,
        medias: medias.count,
        staffEvents: staffEvents.count,
        events: 1,
      };
    });

    // Step 3: Attempt physical file deletion only AFTER successful DB commit
    const mediaCleanupWarnings: string[] = [];
    for (const key of mediaUrls) {
      try {
        await this.mediaStorageService.deleteFile(key);
      } catch (err: unknown) {
        const msg = `Failed to delete physical media file "${key}" after DB commit: ${err instanceof Error ? err.message : String(err)}`;
        this.logger.warn(msg);
        mediaCleanupWarnings.push(msg);
      }
    }

    return {
      status: 'success',
      message: 'Event and associated data permanently deleted',
      data: {
        id: existingEvent.id,
        title: existingEvent.title,
        deletedCounts,
        warnings:
          mediaCleanupWarnings.length > 0 ? mediaCleanupWarnings : undefined,
      },
    };
  }

  private sanitizeClientDraftContent(
    rawContent: Record<string, unknown> | undefined | null,
    themeCode: string,
  ): Record<string, unknown> {
    const definition = getTemplateDefinition(themeCode);
    const raw =
      rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
        ? rawContent
        : {};

    const p1 =
      typeof raw.partnerOneName === 'string' && raw.partnerOneName.trim()
        ? raw.partnerOneName.trim().slice(0, 60)
        : 'Mempelai Wanita';
    const p2 =
      typeof raw.partnerTwoName === 'string' && raw.partnerTwoName.trim()
        ? raw.partnerTwoName.trim().slice(0, 60)
        : 'Mempelai Pria';

    const validTimeZones = new Set([
      'Asia/Jakarta',
      'Asia/Makassar',
      'Asia/Jayapura',
    ]);
    const tz =
      typeof raw.timeZone === 'string' && validTimeZones.has(raw.timeZone)
        ? raw.timeZone
        : 'Asia/Jakarta';

    if (!definition) {
      return {};
    }

    const declaredMap = new Map(
      definition.contentFields.map((field) => [field.key, field]),
    );
    const sanitized: Record<string, unknown> = {
      partnerOneName: p1,
      partnerTwoName: p2,
      timeZone: tz,
    };

    for (const [key, fieldDef] of declaredMap.entries()) {
      if (
        key === 'partnerOneName' ||
        key === 'partnerTwoName' ||
        key === 'timeZone'
      ) {
        continue;
      }

      const val = raw[key];
      if (val === undefined || val === null || val === '') {
        continue;
      }

      if (fieldDef.type === 'text' || fieldDef.type === 'textarea') {
        if (typeof val === 'string' && val.trim() !== '') {
          const maxLen = fieldDef.maxLength ?? 1500;
          sanitized[key] = val.trim().slice(0, maxLen);
        }
      } else if (fieldDef.type === 'repeater' && key === 'ceremonies') {
        if (Array.isArray(val)) {
          const maxItems = fieldDef.maxItems ?? 4;
          const items = val
            .filter((c): c is Record<string, unknown> =>
              Boolean(c && typeof c === 'object' && !Array.isArray(c)),
            )
            .slice(0, maxItems)
            .map((c, idx) => {
              const title =
                typeof c.title === 'string' && c.title.trim()
                  ? c.title.trim().slice(0, 80)
                  : idx === 0
                    ? 'Akad Nikah'
                    : 'Resepsi';
              const rawStart =
                typeof c.startDateTime === 'string' &&
                !isNaN(Date.parse(c.startDateTime))
                  ? c.startDateTime.trim()
                  : new Date(Date.now() + 90 * 86400000)
                      .toISOString()
                      .slice(0, 16);
              const venue =
                typeof c.venue === 'string' && c.venue.trim()
                  ? c.venue.trim().slice(0, 120)
                  : 'Lokasi Acara';
              const address =
                typeof c.address === 'string' && c.address.trim()
                  ? c.address.trim().slice(0, 300)
                  : venue;

              const ceremonyObj: Record<string, unknown> = {
                title,
                startDateTime: rawStart,
                venue,
                address,
              };

              if (
                typeof c.endDateTime === 'string' &&
                c.endDateTime.trim() &&
                !isNaN(Date.parse(c.endDateTime))
              ) {
                ceremonyObj.endDateTime = c.endDateTime.trim();
              }

              if (typeof c.mapsUrl === 'string' && c.mapsUrl.trim()) {
                const trimmedUrl = c.mapsUrl.trim().slice(0, 500);
                if (/^https?:\/\/[^\s]+$/i.test(trimmedUrl)) {
                  ceremonyObj.mapsUrl = trimmedUrl;
                }
              }

              return ceremonyObj;
            });

          if (items.length > 0) {
            sanitized[key] = items;
          }
        }
      } else if (fieldDef.type === 'repeater' && key === 'giftAccounts') {
        if (Array.isArray(val)) {
          const maxItems = fieldDef.maxItems ?? 3;
          const accounts = val
            .filter((g): g is Record<string, unknown> =>
              Boolean(g && typeof g === 'object' && !Array.isArray(g)),
            )
            .slice(0, maxItems)
            .map((g) => {
              const bankName =
                typeof g.bankName === 'string'
                  ? g.bankName.trim().slice(0, 60)
                  : '';
              const accountNumber =
                typeof g.accountNumber === 'string'
                  ? g.accountNumber.trim().slice(0, 40)
                  : '';
              const accountHolder =
                typeof g.accountHolder === 'string'
                  ? g.accountHolder.trim().slice(0, 100)
                  : typeof g.accountHolderName === 'string'
                    ? g.accountHolderName.trim().slice(0, 100)
                    : '';
              return { bankName, accountNumber, accountHolder };
            })
            .filter(
              (g) =>
                g.bankName !== '' &&
                g.accountNumber !== '' &&
                g.accountHolder !== '',
            );

          if (accounts.length > 0) {
            sanitized[key] = accounts;
          }
        }
      } else if (fieldDef.type === 'repeater' && key === 'story') {
        if (Array.isArray(val)) {
          const maxItems = fieldDef.maxItems ?? 6;
          const stories = val
            .filter((s): s is Record<string, unknown> =>
              Boolean(s && typeof s === 'object' && !Array.isArray(s)),
            )
            .slice(0, maxItems)
            .map((s) => ({
              year:
                typeof s.year === 'string' && s.year.trim()
                  ? s.year.trim().slice(0, 40)
                  : '2025',
              title:
                typeof s.title === 'string' && s.title.trim()
                  ? s.title.trim().slice(0, 80)
                  : 'Kisah Kami',
              description:
                typeof s.description === 'string'
                  ? s.description.trim().slice(0, 500)
                  : '',
            }))
            .filter((s) => s.title !== '' && s.description !== '');

          if (stories.length > 0) {
            sanitized[key] = stories;
          }
        }
      }
    }

    return sanitized;
  }

  async createPublicDraft(dto: CreatePublicDraftDto) {
    let normalizedThemeCode = (dto.themeCode || '')
      .trim()
      .toUpperCase()
      .replace(/-/g, '_');
    if (normalizedThemeCode === 'RANAH_ASMARA')
      normalizedThemeCode = 'RANAH_CINTA';
    if (normalizedThemeCode === 'ENCHANTED_WOODLAND')
      normalizedThemeCode = 'AETHERIA';
    const template = await this.prisma.template.findFirst({
      where: {
        themeCode: normalizedThemeCode,
        status: 'AVAILABLE',
      },
      select: { id: true, name: true, themeCode: true, status: true },
    });

    if (!template) {
      throw new BadRequestException(
        `Template '${normalizedThemeCode}' tidak ditemukan atau sedang tidak tersedia.`,
      );
    }

    const adminUser =
      (await this.prisma.user.findFirst({
        where: { role: Role.SUPER_ADMIN },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })) ??
      (await this.prisma.user.findFirst({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      }));

    if (!adminUser) {
      throw new BadRequestException('Sistem belum memiliki akun Super Admin.');
    }

    const sanitizedContent = this.sanitizeClientDraftContent(
      dto.content,
      template.themeCode,
    );
    const validatedContent = validateEventContent(
      sanitizedContent,
      template.themeCode,
    );

    const p1 =
      typeof sanitizedContent.partnerOneName === 'string' &&
      sanitizedContent.partnerOneName.trim()
        ? sanitizedContent.partnerOneName.trim()
        : 'Mempelai';
    const p2 =
      typeof sanitizedContent.partnerTwoName === 'string' &&
      sanitizedContent.partnerTwoName.trim()
        ? sanitizedContent.partnerTwoName.trim()
        : 'Pasangan';
    const refHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const referenceCode = `IRV-${refHex}`;

    const slugBase = `${p1}-${p2}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const slug = `${slugBase || 'undangan'}-${refHex.toLowerCase()}`;

    const parsedDate =
      dto.eventDate && !isNaN(Date.parse(dto.eventDate))
        ? new Date(dto.eventDate)
        : new Date(Date.now() + 90 * 86400000);

    const clientNameClean = (dto.clientName || 'Klien IRVITE')
      .trim()
      .slice(0, 120);
    const clientWaClean = (dto.clientWhatsapp || '-').trim().slice(0, 40);
    const clientNotesClean = (dto.clientNotes || '').trim().slice(0, 1000);

    const descriptionLines = [
      `[PENGAJUAN KLIEN #${referenceCode}]`,
      `Pemesan: ${clientNameClean}`,
      `WhatsApp: ${clientWaClean}`,
      `Template: ${template.name} (${template.themeCode})`,
    ];
    if (clientNotesClean) {
      descriptionLines.push(`Catatan Klien: ${clientNotesClean}`);
    }

    const ceremoniesList = Array.isArray(sanitizedContent.ceremonies)
      ? (sanitizedContent.ceremonies as Array<Record<string, unknown>>)
      : [];
    const firstVenue =
      typeof ceremoniesList[0]?.venue === 'string'
        ? ceremoniesList[0].venue
        : '';
    const firstAddress =
      typeof ceremoniesList[0]?.address === 'string'
        ? ceremoniesList[0].address
        : '';
    const resolvedLocation =
      (dto.locationDetails && dto.locationDetails.trim()) ||
      [firstVenue, firstAddress].filter(Boolean).join(', ') ||
      'Lokasi Acara Klien';

    const activeUntil = new Date(
      parsedDate.getTime() + 180 * 24 * 60 * 60 * 1000,
    );

    const newEvent = await this.prisma.event.create({
      data: {
        userId: adminUser.id,
        templateId: template.id,
        title: `Pernikahan ${p1} & ${p2} (Draf Klien #${referenceCode})`,
        slug,
        description: descriptionLines.join('\n'),
        eventDate: parsedDate,
        activeUntil,
        locationDetails: resolvedLocation.slice(0, 255),
        content: validatedContent as Prisma.InputJsonValue,
        status: EVENT_STATUS.DRAFT,
      },
      select: this.selectSafeEvent(),
    });

    try {
      await this.prisma.order.create({
        data: {
          eventId: newEvent.id,
          referenceCode,
          clientName: clientNameClean,
          clientWhatsapp: clientWaClean,
          packageCode: 'GOLD',
          priceAmount: 199000,
          status: 'DRAFT',
          notes: clientNotesClean || null,
        },
      });
    } catch (orderErr) {
      this.logger.warn(
        `Failed to create order record for public draft ${newEvent.id}: ${orderErr instanceof Error ? orderErr.message : String(orderErr)}`,
      );
    }

    // Save optional compressed client preview photos into event media slots
    let savedPhotosCount = 0;
    const mediaFallbackMap: Record<string, string> = {};
    const slotCounts = new Map<string, number>();
    const definition = getTemplateDefinition(template.themeCode);
    if (definition && Array.isArray(dto.photos) && dto.photos.length > 0) {
      const photosToProcess = dto.photos.slice(0, 15);
      for (let i = 0; i < photosToProcess.length; i++) {
        const photoInput = photosToProcess[i];
        if (
          !photoInput ||
          typeof photoInput.slot !== 'string' ||
          typeof photoInput.dataUrl !== 'string'
        ) {
          continue;
        }
        const slotKey = photoInput.slot.trim();
        const slotDef = definition.mediaSlots.find(
          (s) => s.key === slotKey && s.mediaType === 'PHOTO',
        );
        if (!slotDef) continue;

        const currentSlotCount = slotCounts.get(slotKey) ?? 0;
        const maxAllowed = slotDef.maxItems ?? (slotDef.multiple ? 12 : 1);
        if (currentSlotCount >= maxAllowed) continue;

        const dataUrlMatch =
          /^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(
            photoInput.dataUrl.trim(),
          );
        if (!dataUrlMatch) continue;

        try {
          const base64Clean = dataUrlMatch[1].replace(/\s+/g, '');
          const buffer = Buffer.from(base64Clean, 'base64');
          if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
            continue;
          }
          const sig = detectSignature(buffer);
          if (
            !sig ||
            !['image/jpeg', 'image/png', 'image/webp'].includes(sig.mime)
          ) {
            continue;
          }
          const key = this.mediaStorageService.generateKey(sig.extension);
          try {
            await this.mediaStorageService.writeFile(key, buffer);
          } catch {
            // Serverless ephemeral FS error; persisted in _mediaFallback below
          }
          await this.prisma.media.create({
            data: {
              eventId: newEvent.id,
              slot: slotKey,
              url: key,
              type: MediaType.PHOTO,
              order:
                typeof photoInput.order === 'number'
                  ? photoInput.order
                  : currentSlotCount,
            },
          });
          mediaFallbackMap[key] = base64Clean;
          slotCounts.set(slotKey, currentSlotCount + 1);
          savedPhotosCount++;
        } catch (err) {
          this.logger.warn(
            `Failed to persist client draft photo for event ${newEvent.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    if (
      Object.keys(mediaFallbackMap).length > 0 &&
      typeof this.prisma.event?.update === 'function'
    ) {
      try {
        const baseContent =
          validatedContent &&
          typeof validatedContent === 'object' &&
          !Array.isArray(validatedContent)
            ? validatedContent
            : {};
        await this.prisma.event.update({
          where: { id: newEvent.id },
          data: {
            content: {
              ...baseContent,
              _mediaFallback: mediaFallbackMap,
            },
          },
        });
      } catch (err) {
        this.logger.warn(
          `Failed to persist _mediaFallback for event ${newEvent.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      id: newEvent.id,
      referenceCode,
      slug: newEvent.slug,
      title: newEvent.title,
      themeCode: template.themeCode,
      templateName: template.name,
      status: newEvent.status,
      savedPhotosCount,
    };
  }
}
