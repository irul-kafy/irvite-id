import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EVENT_STATUS } from '../events/event-status';
import { isPublicInvitationExpired } from './public-invitation-expiry';

@Injectable()
export class PublicInvitationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the eligible internal context for a public invitation request.
   * Centralizes format validation, event status, and expiry checks.
   */
  async getEligibleContext(uniqueCode: string) {
    // 1. Cheap format validation
    if (!/^[A-Za-z0-9_-]{22}$/.test(uniqueCode)) {
      throw new NotFoundException('Invitation not found');
    }

    const invitation = await this.prisma.invitation.findUnique({
      where: { uniqueCode },
      select: {
        id: true,
        eventId: true,
        uniqueCode: true,
        event: {
          select: {
            status: true,
            eventDate: true,
          },
        },
        guest: {
          select: {
            maxPax: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // 2. Parent Event Must Be PUBLISHED
    if (invitation.event.status !== EVENT_STATUS.PUBLISHED) {
      throw new NotFoundException('Invitation not found'); // Opaque rejection
    }

    // 3. Must not be expired (Event Date + 30 Days)
    if (isPublicInvitationExpired(invitation.event.eventDate)) {
      throw new NotFoundException('Invitation not found'); // Opaque rejection
    }

    return {
      invitationId: invitation.id,
      eventId: invitation.eventId,
      uniqueCode: invitation.uniqueCode,
      eventDate: invitation.event.eventDate,
      maxPax: invitation.guest.maxPax,
    };
  }
}
