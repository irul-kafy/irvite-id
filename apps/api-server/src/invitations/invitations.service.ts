import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { PublicRsvpDto } from './dto/public-rsvp.dto';
import { PublicWishDto } from './dto/public-wish.dto';
import {
  projectEventContent,
  projectWishes,
} from '../events/public-event-content';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Role, Prisma, InvitationStatus } from 'database';
import * as crypto from 'crypto';

import { PublicInvitationAccessService } from './public-invitation-access.service';
import { mapRsvpStatus } from './public-invitation-rsvp';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicAccessService: PublicInvitationAccessService,
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

  generateSecureCode(): string {
    return crypto.randomBytes(16).toString('base64url');
  }

  async createInvitationWithRetry(
    prismaClient: Prisma.TransactionClient | PrismaService,
    data: {
      eventId: string;
      guestId: string;
      customMessage?: string | null;
      status?: InvitationStatus;
    },
  ) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const uniqueCode = this.generateSecureCode();

      const createData: Prisma.InvitationUncheckedCreateInput = {
        eventId: data.eventId,
        guestId: data.guestId,
        uniqueCode,
      };

      if (data.customMessage !== undefined) {
        createData.customMessage = data.customMessage;
      }
      if (data.status !== undefined) {
        createData.status = data.status;
      }

      try {
        const invitation = await prismaClient.invitation.create({
          data: createData,
          select: this.safeSelect(),
        });
        return invitation;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = error.meta?.target;

          let isGuestConflict = false;
          let isCodeConflict = false;

          if (Array.isArray(target)) {
            if (target.includes('guest_id') || target.includes('guestId')) {
              isGuestConflict = true;
            } else if (
              target.includes('unique_code') ||
              target.includes('uniqueCode')
            ) {
              isCodeConflict = true;
            }
          } else if (typeof target === 'string') {
            if (target.includes('guest_id') || target.includes('guestId')) {
              isGuestConflict = true;
            } else if (
              target.includes('unique_code') ||
              target.includes('uniqueCode')
            ) {
              isCodeConflict = true;
            }
          }

          if (isGuestConflict) {
            throw new ConflictException('Guest already has an invitation');
          }

          if (isCodeConflict) {
            if (attempt === maxRetries) {
              throw new InternalServerErrorException(
                'Failed to generate unique code after maximum retries',
              );
            }
            continue; // Retry
          }

          throw new InternalServerErrorException(
            'Database constraint violation',
          );
        }
        throw error;
      }
    }
    throw new InternalServerErrorException(
      'Failed to generate unique code after maximum retries',
    );
  }

  async create(
    eventId: string,
    guestId: string,
    currentUserId: string,
    role: Role,
    createInvitationDto: CreateInvitationDto,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    // Verify Guest belongs to this Event
    const guest = await this.prisma.guest.findFirst({
      where: { id: guestId, eventId },
      select: { id: true },
    });

    if (!guest) {
      throw new NotFoundException(
        'Guest not found or does not belong to this Event',
      );
    }

    return this.createInvitationWithRetry(this.prisma, {
      eventId,
      guestId,
      customMessage: createInvitationDto.customMessage,
    });
  }

  async findAll(
    eventId: string,
    currentUserId: string,
    role: Role,
    query: PaginationQueryDto,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.invitation.count({ where: { eventId } }),
      this.prisma.invitation.findMany({
        where: { eventId },
        skip,
        take: limit,
        select: this.safeSelect(),
      }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage,
      },
    };
  }

  async findOne(
    eventId: string,
    id: string,
    currentUserId: string,
    role: Role,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id,
        eventId,
      },
      select: this.safeSelect(),
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  async update(
    eventId: string,
    id: string,
    currentUserId: string,
    role: Role,
    updateInvitationDto: UpdateInvitationDto,
  ) {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const data: Prisma.InvitationUpdateInput = {};

    if (updateInvitationDto.customMessage !== undefined) {
      data.customMessage = updateInvitationDto.customMessage;
    }

    try {
      const invitation = await this.prisma.invitation.update({
        where: {
          id,
          eventId,
        },
        data,
        select: this.safeSelect(),
      });
      return invitation;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Invitation not found');
      }
      throw error;
    }
  }

  private safeSelect(): Prisma.InvitationSelect {
    return {
      id: true,
      guestId: true,
      eventId: true,
      uniqueCode: true,
      status: true,
      rsvpPax: true,
      customMessage: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  async resolvePublic(uniqueCode: string) {
    const context =
      await this.publicAccessService.getEligibleContext(uniqueCode);

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: context.invitationId },
      select: {
        customMessage: true,
        status: true,
        rsvpPax: true,
        guest: {
          select: {
            name: true,
            customGreeting: true,
            maxPax: true,
          },
        },
        event: {
          select: {
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
            template: {
              select: {
                themeCode: true,
                config: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const medias = await this.prisma.media.findMany({
      where: { eventId: context.eventId },
      select: { id: true, type: true, order: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    const presentation = projectEventContent(
      invitation.event.content,
      medias,
      `/invitations/public/${uniqueCode}/media`,
    );
    const mediaDescriptors = medias
      .filter((m) => presentation.galleryMedia.some((item) => item.id === m.id))
      .map((m) => ({
        type: m.type,
        order:
          m.type === 'PHOTO'
            ? (presentation.galleryOrder.get(m.id) ?? m.order)
            : m.order,
        src: `/invitations/public/${uniqueCode}/media/${m.id}`,
      }));

    const canRespond = new Date() < context.eventDate;

    return {
      invitation: {
        customMessage: invitation.customMessage,
      },
      guest: {
        name: invitation.guest.name,
        customGreeting: invitation.guest.customGreeting,
        maxPax: invitation.guest.maxPax,
      },
      event: {
        title: invitation.event.title,
        description: invitation.event.description,
        eventDate: invitation.event.eventDate,
        locationDetails: invitation.event.locationDetails,
        content: presentation.content,
        giftQr: presentation.giftQr,
        wishes: projectWishes(invitation.event.invitations ?? []),
      },
      template: invitation.event.template
        ? {
            themeCode: invitation.event.template.themeCode,
            config: invitation.event.template.config,
          }
        : null,
      media: mediaDescriptors,
      rsvp: {
        response: mapRsvpStatus(invitation.status),
        pax:
          invitation.status === InvitationStatus.RSVP_YES
            ? invitation.rsvpPax
            : null,
        canRespond,
      },
    };
  }

  async updatePublicRsvp(uniqueCode: string, dto: PublicRsvpDto) {
    const context =
      await this.publicAccessService.getEligibleContext(uniqueCode);

    // 1. Check cutoff
    if (new Date() >= context.eventDate) {
      // Per instructions, 409 Conflict represents resource state conflict
      throw new ConflictException(
        'RSVP is closed because the event has already started',
      );
    }

    // 2. Cross-field Validation
    if (dto.response === 'YES') {
      if (dto.pax === undefined || dto.pax === null) {
        throw new BadRequestException('Pax is required for YES response');
      }
      if (dto.pax > context.maxPax) {
        throw new BadRequestException(
          `Pax cannot exceed maximum allowed (${context.maxPax})`,
        );
      }
    } else if (dto.response === 'NO') {
      if (dto.pax !== undefined) {
        throw new BadRequestException(
          'Pax must not be provided for NO response',
        );
      }
    }

    // 3. Status mapping
    const newStatus =
      dto.response === 'YES'
        ? InvitationStatus.RSVP_YES
        : InvitationStatus.RSVP_NO;
    const newPax = dto.response === 'YES' ? dto.pax : null;

    // 4. Atomic DB update
    const updated = await this.prisma.invitation.update({
      where: { id: context.invitationId },
      data: {
        status: newStatus,
        rsvpPax: newPax,
      },
      select: {
        status: true,
        rsvpPax: true,
      },
    });

    return {
      rsvp: {
        response: mapRsvpStatus(updated.status),
        pax:
          updated.status === InvitationStatus.RSVP_YES ? updated.rsvpPax : null,
        canRespond: true, // we just validated this above
      },
    };
  }

  async savePublicWish(uniqueCode: string, dto: PublicWishDto) {
    const context =
      await this.publicAccessService.getEligibleContext(uniqueCode);
    const now = new Date();
    // Persisted, atomic cooldown works across API instances and concurrent requests.
    const result = await this.prisma.invitation.updateMany({
      where: {
        id: context.invitationId,
        eventId: context.eventId,
        event: { status: 'PUBLISHED' },
        OR: [
          { wishedAt: null },
          { wishedAt: { lte: new Date(now.getTime() - 30_000) } },
        ],
      },
      data: { wishName: dto.name, wishMessage: dto.message, wishedAt: now },
    });
    if (result.count === 0)
      throw new HttpException(
        'Please wait 30 seconds before updating your wish',
        429,
      );
    return {
      wish: {
        name: dto.name,
        message: dto.message,
        createdAt: now.toISOString(),
      },
    };
  }
}
