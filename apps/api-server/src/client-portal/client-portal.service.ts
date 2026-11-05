import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma, InvitationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreatePortalGuestDto,
  UpdatePortalGuestDto,
} from './dto/client-portal.dto';

export function computeDefaultClientKey(
  eventId: string,
  createdAt?: Date | string | null,
): string {
  const secret =
    process.env.JWT_SECRET || 'irvite-client-portal-secret-key-2026';
  const dateStr =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : typeof createdAt === 'string'
        ? createdAt
        : '2026-01-01T00:00:00.000Z';
  return crypto
    .createHmac('sha256', secret)
    .update(`${eventId}:${dateStr}`)
    .digest('hex')
    .slice(0, 16);
}

export function isClientKeyValid(
  event: { id: string; createdAt?: Date | string | null; content?: unknown },
  inputKey: string,
): boolean {
  if (!inputKey || typeof inputKey !== 'string') return false;
  const cleanInput = inputKey.trim();
  const defaultKey = computeDefaultClientKey(event.id, event.createdAt);

  let storedKey: string | undefined;
  if (
    event.content &&
    typeof event.content === 'object' &&
    'clientKey' in event.content &&
    typeof (event.content as { clientKey?: unknown }).clientKey === 'string'
  ) {
    storedKey = (event.content as { clientKey: string }).clientKey.trim();
  }

  if (storedKey && storedKey === cleanInput) {
    return true;
  }
  return defaultKey === cleanInput;
}

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getEventOrThrow(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        eventDate: true,
        locationDetails: true,
        status: true,
        content: true,
        createdAt: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event tidak ditemukan');
    }

    return event;
  }

  async validateAccess(eventId: string, key?: string) {
    const event = await this.getEventOrThrow(eventId);
    if (!key || !isClientKeyValid(event, key)) {
      throw new UnauthorizedException(
        'Kunci akses portal klien tidak valid atau telah kedaluwarsa.',
      );
    }
    const validKey =
      (typeof event.content === 'object' &&
      event.content &&
      'clientKey' in event.content &&
      typeof (event.content as { clientKey?: unknown }).clientKey === 'string'
        ? (event.content as { clientKey: string }).clientKey
        : undefined) || computeDefaultClientKey(event.id, event.createdAt);

    return { event, validKey };
  }

  async getPortalData(eventId: string, key?: string) {
    const { event, validKey } = await this.validateAccess(eventId, key);

    // Auto-heal: Ensure all existing guests have invitations generated
    const guestsWithoutInvitation = await this.prisma.guest.findMany({
      where: {
        eventId,
        invitation: null,
      },
      select: { id: true },
    });

    if (guestsWithoutInvitation.length > 0) {
      for (const g of guestsWithoutInvitation) {
        try {
          const uniqueCode = crypto.randomBytes(16).toString('base64url');
          await this.prisma.invitation.create({
            data: {
              eventId,
              guestId: g.id,
              uniqueCode,
              status: InvitationStatus.PENDING,
            },
          });
        } catch {
          // ignore transient duplicate
        }
      }
    }

    let rawGuests: Array<{
      id: string;
      name: string;
      category: string;
      phoneNumber: string | null;
      email: string | null;
      tableNumber?: string | null;
      maxPax: number;
      customGreeting: string | null;
      createdAt: Date;
      invitation: {
        id: string;
        uniqueCode: string;
        status: InvitationStatus;
        rsvpPax: number | null;
        updatedAt: Date;
        attendances?: Array<{
          scannedPax: number;
          scannedAt: Date;
        }>;
      } | null;
    }>;

    try {
      rawGuests = await this.prisma.guest.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          category: true,
          phoneNumber: true,
          email: true,
          tableNumber: true,
          maxPax: true,
          customGreeting: true,
          createdAt: true,
          invitation: {
            select: {
              id: true,
              uniqueCode: true,
              status: true,
              rsvpPax: true,
              updatedAt: true,
              attendances: {
                select: {
                  scannedPax: true,
                  scannedAt: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
      });
    } catch {
      // Fallback if tableNumber column is missing
      const fallback = await this.prisma.guest.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          category: true,
          phoneNumber: true,
          email: true,
          maxPax: true,
          customGreeting: true,
          createdAt: true,
          invitation: {
            select: {
              id: true,
              uniqueCode: true,
              status: true,
              rsvpPax: true,
              updatedAt: true,
              attendances: {
                select: {
                  scannedPax: true,
                  scannedAt: true,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
      });
      rawGuests = fallback.map((g) => ({ ...g, tableNumber: null }));
    }

    let totalPax = 0;
    let waSentCount = 0;
    let waPendingCount = 0;
    let rsvpYesCount = 0;
    let rsvpYesPax = 0;
    let rsvpNoCount = 0;
    let rsvpPendingCount = 0;
    let attendedCount = 0;

    const guests = rawGuests.map((g) => {
      const inv = g.invitation;
      const isSent = Boolean(
        inv &&
        (inv.status === InvitationStatus.SENT ||
          inv.status === InvitationStatus.OPENED ||
          inv.status === InvitationStatus.RSVP_YES ||
          inv.status === InvitationStatus.RSVP_NO),
      );

      totalPax += g.maxPax;
      if (isSent) {
        waSentCount++;
      } else {
        waPendingCount++;
      }

      if (inv?.status === InvitationStatus.RSVP_YES) {
        rsvpYesCount++;
        rsvpYesPax += inv.rsvpPax || g.maxPax;
      } else if (inv?.status === InvitationStatus.RSVP_NO) {
        rsvpNoCount++;
      } else {
        rsvpPendingCount++;
      }

      const hasAttended = Boolean(
        inv?.attendances && inv.attendances.length > 0,
      );
      if (hasAttended) attendedCount++;

      return {
        id: g.id,
        name: g.name,
        category: g.category || 'REGULAR',
        phoneNumber: g.phoneNumber,
        email: g.email,
        tableNumber: g.tableNumber || null,
        maxPax: g.maxPax,
        customGreeting: g.customGreeting,
        createdAt: g.createdAt.toISOString(),
        invitation: inv
          ? {
              id: inv.id,
              uniqueCode: inv.uniqueCode,
              status: inv.status,
              rsvpPax: inv.rsvpPax,
              updatedAt: inv.updatedAt.toISOString(),
            }
          : null,
        isWaSent: isSent,
        hasAttended,
      };
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        eventDate: event.eventDate.toISOString(),
        status: event.status,
        locationDetails: event.locationDetails,
        clientKey: validKey,
      },
      stats: {
        totalGuests: guests.length,
        totalPax,
        waSentCount,
        waPendingCount,
        rsvpYesCount,
        rsvpYesPax,
        rsvpNoCount,
        rsvpPendingCount,
        attendedCount,
      },
      guests,
    };
  }

  async addGuest(
    eventId: string,
    key: string | undefined,
    dto: CreatePortalGuestDto,
  ) {
    await this.validateAccess(eventId, key);

    const cleanName = dto.name?.trim();
    if (!cleanName) {
      throw new BadRequestException('Nama tamu wajib diisi.');
    }

    const maxPax = dto.maxPax && dto.maxPax > 0 ? dto.maxPax : 1;
    const category = dto.category?.trim().toUpperCase() || 'REGULAR';
    const phoneNumber = dto.phoneNumber?.trim() || null;
    const email = dto.email?.trim() || null;
    const tableNumber = dto.tableNumber?.trim() || null;
    const customGreeting = dto.customGreeting?.trim() || null;

    const guest = await this.prisma.guest.create({
      data: {
        eventId,
        name: cleanName,
        category,
        maxPax,
        phoneNumber,
        email,
        tableNumber,
        customGreeting,
      },
      select: {
        id: true,
        name: true,
        category: true,
        phoneNumber: true,
        email: true,
        tableNumber: true,
        maxPax: true,
        customGreeting: true,
        createdAt: true,
      },
    });

    // Auto-create invitation
    const uniqueCode = crypto.randomBytes(16).toString('base64url');
    const invitation = await this.prisma.invitation.create({
      data: {
        eventId,
        guestId: guest.id,
        uniqueCode,
        status: InvitationStatus.PENDING,
      },
      select: {
        id: true,
        uniqueCode: true,
        status: true,
        rsvpPax: true,
        updatedAt: true,
      },
    });

    return {
      id: guest.id,
      name: guest.name,
      category: guest.category,
      phoneNumber: guest.phoneNumber,
      email: guest.email,
      tableNumber: guest.tableNumber,
      maxPax: guest.maxPax,
      customGreeting: guest.customGreeting,
      createdAt: guest.createdAt.toISOString(),
      invitation: {
        id: invitation.id,
        uniqueCode: invitation.uniqueCode,
        status: invitation.status,
        rsvpPax: invitation.rsvpPax,
        updatedAt: invitation.updatedAt.toISOString(),
      },
      isWaSent: false,
      hasAttended: false,
    };
  }

  async updateGuest(
    eventId: string,
    guestId: string,
    key: string | undefined,
    dto: UpdatePortalGuestDto,
  ) {
    await this.validateAccess(eventId, key);

    const existing = await this.prisma.guest.findFirst({
      where: { id: guestId, eventId },
    });
    if (!existing) {
      throw new NotFoundException('Data tamu tidak ditemukan.');
    }

    const data: Prisma.GuestUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.category !== undefined)
      data.category = dto.category.trim().toUpperCase();
    if (dto.phoneNumber !== undefined)
      data.phoneNumber = dto.phoneNumber?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.maxPax !== undefined) data.maxPax = Math.max(1, dto.maxPax);
    if (dto.customGreeting !== undefined)
      data.customGreeting = dto.customGreeting?.trim() || null;
    if (dto.tableNumber !== undefined)
      data.tableNumber = dto.tableNumber?.trim() || null;

    const updated = await this.prisma.guest.update({
      where: { id: guestId },
      data,
      select: {
        id: true,
        name: true,
        category: true,
        phoneNumber: true,
        email: true,
        tableNumber: true,
        maxPax: true,
        customGreeting: true,
        createdAt: true,
        invitation: {
          select: {
            id: true,
            uniqueCode: true,
            status: true,
            rsvpPax: true,
            updatedAt: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      phoneNumber: updated.phoneNumber,
      email: updated.email,
      tableNumber: updated.tableNumber,
      maxPax: updated.maxPax,
      customGreeting: updated.customGreeting,
      createdAt: updated.createdAt.toISOString(),
      invitation: updated.invitation
        ? {
            id: updated.invitation.id,
            uniqueCode: updated.invitation.uniqueCode,
            status: updated.invitation.status,
            rsvpPax: updated.invitation.rsvpPax,
            updatedAt: updated.invitation.updatedAt.toISOString(),
          }
        : null,
      isWaSent: Boolean(
        updated.invitation &&
        (updated.invitation.status === InvitationStatus.SENT ||
          updated.invitation.status === InvitationStatus.OPENED ||
          updated.invitation.status === InvitationStatus.RSVP_YES ||
          updated.invitation.status === InvitationStatus.RSVP_NO),
      ),
    };
  }

  async deleteGuest(eventId: string, guestId: string, key: string | undefined) {
    await this.validateAccess(eventId, key);

    const existing = await this.prisma.guest.findFirst({
      where: { id: guestId, eventId },
    });
    if (!existing) {
      throw new NotFoundException('Data tamu tidak ditemukan.');
    }

    await this.prisma.guest.delete({
      where: { id: guestId },
    });

    return { success: true, id: guestId };
  }

  async setGuestWaStatus(
    eventId: string,
    guestId: string,
    key: string | undefined,
    isSent: boolean,
  ) {
    await this.validateAccess(eventId, key);

    let invitation = await this.prisma.invitation.findFirst({
      where: { guestId, eventId },
    });

    if (!invitation) {
      const uniqueCode = crypto.randomBytes(16).toString('base64url');
      invitation = await this.prisma.invitation.create({
        data: {
          eventId,
          guestId,
          uniqueCode,
          status: isSent ? InvitationStatus.SENT : InvitationStatus.PENDING,
        },
      });
    } else {
      if (isSent) {
        if (invitation.status === InvitationStatus.PENDING) {
          invitation = await this.prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: InvitationStatus.SENT },
          });
        }
      } else {
        if (invitation.status === InvitationStatus.SENT) {
          invitation = await this.prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: InvitationStatus.PENDING },
          });
        }
      }
    }

    return {
      success: true,
      guestId,
      status: invitation.status,
      isWaSent:
        invitation.status === InvitationStatus.SENT ||
        invitation.status === InvitationStatus.OPENED ||
        invitation.status === InvitationStatus.RSVP_YES ||
        invitation.status === InvitationStatus.RSVP_NO,
    };
  }
}
