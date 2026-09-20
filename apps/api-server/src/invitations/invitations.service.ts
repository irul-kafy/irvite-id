import { EVENT_STATUS } from '../events/event-status';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { PublicRsvpDto } from './dto/public-rsvp.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Role, Prisma, InvitationStatus } from 'database';
import * as crypto from 'crypto';

import { PublicInvitationAccessService } from './public-invitation-access.service';
import { validateEventContent } from '../templates/definitions';
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
      select: { id: true, status: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status === EVENT_STATUS.ARCHIVED) {
      throw new ConflictException(
        'Cannot perform operations on an archived event',
      );
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
      src: `/invitations/public/${uniqueCode}/media/${m.id}`,
    }));

    const mediaBySlot: Record<string, typeof mediaDescriptors> = {};
    for (const m of mediaDescriptors) {
      if (!mediaBySlot[m.slot]) {
        mediaBySlot[m.slot] = [];
      }
      mediaBySlot[m.slot].push(m);
    }

    const canRespond = new Date() < context.eventDate;

    let publicContent: Record<string, unknown> | null = null;
    if (invitation.event.content) {
      try {
        publicContent = validateEventContent(
          invitation.event.content,
          invitation.event.template?.themeCode,
        );
      } catch {
        // Fail closed: do not expose malformed or unvalidated content publicly
        publicContent = null;
      }
    }

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
        content: publicContent,
      },
      template: invitation.event.template
        ? {
            themeCode: invitation.event.template.themeCode,
            config: invitation.event.template.config,
          }
        : null,
      media: mediaDescriptors,
      mediaBySlot,
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
  async bulkCreate(
    eventId: string,
    currentUserId: string,
    role: Role,
  ): Promise<{
    totalGuests: number;
    created: number;
    alreadyExisting: number;
    failed: number;
  }> {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const guests = await this.prisma.guest.findMany({
      where: { eventId },
      select: {
        id: true,
        invitation: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalGuests = guests.length;
    const guestsWithoutInvitation = guests.filter((g) => !g.invitation);
    const alreadyExisting = totalGuests - guestsWithoutInvitation.length;

    let created = 0;
    let failed = 0;
    const BATCH_SIZE = 25;

    for (let i = 0; i < guestsWithoutInvitation.length; i += BATCH_SIZE) {
      const batch = guestsWithoutInvitation.slice(i, i + BATCH_SIZE);
      for (const guest of batch) {
        try {
          await this.createInvitationWithRetry(this.prisma, {
            eventId,
            guestId: guest.id,
          });
          created++;
        } catch {
          failed++;
        }
      }
    }

    return {
      totalGuests,
      created,
      alreadyExisting,
      failed,
    };
  }
}
