import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma, InvitationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { isPublicInvitationExpired } from '../invitations/public-invitation-expiry';
import {
  CreatePortalGuestDto,
  UpdatePortalGuestDto,
} from './dto/client-portal.dto';
import { parseOrThrowGuestCategory } from '../guests/utils/guest-category';
import { normalizePhoneNumber } from '../guests/utils/phone-normalizer';

export const MAX_PORTAL_GUESTS_PER_EVENT = 2000;
export const MAX_PORTAL_PAX_PER_GUEST = 20;
export const CLIENT_KEY_VERSION = 2;

function toIsoSafe(val: unknown): string {
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  }
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toISOString();
  }
  return new Date().toISOString();
}

export function generateClientPortalKey(): string {
  return crypto.randomBytes(12).toString('hex');
}

export function isClientKeyValid(
  event: { id?: string; createdAt?: Date | string | null; content?: unknown },
  inputKey: string,
): boolean {
  if (!inputKey || typeof inputKey !== 'string') return false;
  const cleanInput = inputKey.trim();
  if (!cleanInput) return false;

  let storedKey: string | undefined;
  if (
    event.content &&
    typeof event.content === 'object' &&
    !Array.isArray(event.content) &&
    'clientKey' in event.content &&
    typeof (event.content as { clientKey?: unknown }).clientKey === 'string'
  ) {
    storedKey = (event.content as { clientKey: string }).clientKey.trim();
  }

  if (!storedKey) {
    return false;
  }

  const inputBuffer = Buffer.from(cleanInput, 'utf8');
  const storedBuffer = Buffer.from(storedKey, 'utf8');
  if (inputBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, storedBuffer);
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
        activeUntil: true,
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

  private assertEventWritable(event: {
    status: string;
    eventDate?: Date | string | null;
    activeUntil?: Date | string | null;
  }) {
    if (event.status === 'ARCHIVED') {
      throw new ConflictException(
        'Acara telah diarsipkan dan tidak dapat menerima perubahan data.',
      );
    }
    if (event.eventDate) {
      const eventDateObj =
        event.eventDate instanceof Date
          ? event.eventDate
          : new Date(event.eventDate);
      const activeUntilObj =
        event.activeUntil instanceof Date
          ? event.activeUntil
          : typeof event.activeUntil === 'string'
            ? new Date(event.activeUntil)
            : null;
      if (
        !isNaN(eventDateObj.getTime()) &&
        isPublicInvitationExpired(eventDateObj, new Date(), activeUntilObj)
      ) {
        throw new ConflictException(
          'Masa aktif undangan acara telah berakhir dan tidak dapat diubah.',
        );
      }
    }
  }

  async validateAccess(eventId: string, key?: string) {
    const event = await this.getEventOrThrow(eventId);
    if (!key || !isClientKeyValid(event, key)) {
      throw new UnauthorizedException(
        'Kunci akses portal klien tidak valid atau telah kedaluwarsa.',
      );
    }

    const content =
      event.content &&
      typeof event.content === 'object' &&
      !Array.isArray(event.content)
        ? (event.content as Record<string, unknown>)
        : {};

    if (content.clientPortalEnabled === false) {
      throw new ForbiddenException(
        'Akses Portal Kelola Tamu telah dinonaktifkan oleh penyelenggara.',
      );
    }

    const validKey =
      typeof content.clientKey === 'string' ? content.clientKey.trim() : '';

    return { event, validKey };
  }

  /**
   * Batch generates missing invitations for guests in a separate write operation
   * rather than mutating DB state inside GET /client-portal/:eventId.
   */
  async syncMissingInvitations(eventId: string, key?: string) {
    const { event } = await this.validateAccess(eventId, key);
    this.assertEventWritable(event);

    const guestsWithoutInvitation = await this.prisma.guest.findMany({
      where: {
        eventId,
        invitation: null,
      },
      select: { id: true },
    });

    if (guestsWithoutInvitation.length === 0) {
      return { createdCount: 0 };
    }

    let createdCount = 0;
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
        createdCount++;
      } catch {
        // ignore transient duplicate
      }
    }

    return { createdCount };
  }

  async getPortalData(eventId: string, key?: string) {
    const { event, validKey } = await this.validateAccess(eventId, key);

    const [rawGuests, wishesCount, rawWishes] = await Promise.all([
      this.prisma.guest.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          category: true,
          phoneNumber: true,
          email: true,
          tableNumber: true,
          maxPax: true,
          isWalkIn: true,
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
      }),
      this.prisma.wish.count({ where: { eventId } }),
      this.prisma.wish.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, name: true, message: true, createdAt: true },
      }),
    ]);

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

      const isWalkIn = Boolean(g.isWalkIn);
      if (!isWalkIn) {
        if (inv?.status === InvitationStatus.RSVP_YES) {
          rsvpYesCount++;
          rsvpYesPax += inv.rsvpPax || g.maxPax;
        } else if (inv?.status === InvitationStatus.RSVP_NO) {
          rsvpNoCount++;
        } else {
          rsvpPendingCount++;
        }
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
        createdAt: toIsoSafe(g.createdAt),
        invitation: inv
          ? {
              id: inv.id,
              uniqueCode: inv.uniqueCode,
              status: inv.status,
              rsvpPax: inv.rsvpPax,
              updatedAt: toIsoSafe(inv.updatedAt),
            }
          : null,
        isWaSent: isSent,
        hasAttended,
      };
    });

    const wishes = (Array.isArray(rawWishes) ? rawWishes : []).map((w) => ({
      id: w.id,
      name: w.name,
      message: w.message,
      createdAt: toIsoSafe(w.createdAt),
    }));

    return {
      event: {
        id: event.id,
        title:
          (event.title || '')
            .replace(
              /\s*\((?:Draf Klien|PENGAJUAN KLIEN)\s*#[A-Za-z0-9-]+\)/gi,
              '',
            )
            .trim() ||
          event.title ||
          '',
        slug: event.slug,
        eventDate: toIsoSafe(event.eventDate),
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
        wishesCount,
      },
      guests,
      wishes,
    };
  }

  private async resolveAndAssertUniquePortalPhone(
    eventId: string,
    rawPhone: string | null | undefined,
    excludeGuestId?: string,
  ): Promise<string | null> {
    if (rawPhone === null || rawPhone === undefined) {
      return null;
    }
    const trimmed = rawPhone.trim();
    if (!trimmed) {
      return null;
    }
    const normalized = normalizePhoneNumber(trimmed);
    if (!normalized.valid || !normalized.phoneNumber) {
      throw new BadRequestException(
        'Format nomor telepon/WhatsApp tidak valid.',
      );
    }
    const duplicate = await this.prisma.guest.findFirst({
      where: {
        eventId,
        phoneNumber: normalized.phoneNumber,
        ...(excludeGuestId ? { id: { not: excludeGuestId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'Nomor telepon/WhatsApp sudah terdaftar untuk tamu lain pada acara ini.',
      );
    }
    return normalized.phoneNumber;
  }

  async addGuest(
    eventId: string,
    key: string | undefined,
    dto: CreatePortalGuestDto,
  ) {
    const { event } = await this.validateAccess(eventId, key);
    this.assertEventWritable(event);

    const cleanName = dto.name?.trim();
    if (!cleanName) {
      throw new BadRequestException('Nama tamu wajib diisi.');
    }

    if (
      dto.maxPax !== undefined &&
      (dto.maxPax < 1 || dto.maxPax > MAX_PORTAL_PAX_PER_GUEST)
    ) {
      throw new BadRequestException(
        `Jumlah kuota kehadiran (maxPax) harus antara 1 hingga ${MAX_PORTAL_PAX_PER_GUEST}.`,
      );
    }

    const currentGuestsCount = await this.prisma.guest.count({
      where: { eventId },
    });
    if (currentGuestsCount >= MAX_PORTAL_GUESTS_PER_EVENT) {
      throw new BadRequestException(
        `Batas maksimum tamu per acara (${MAX_PORTAL_GUESTS_PER_EVENT} tamu) telah tercapai.`,
      );
    }

    const maxPax = dto.maxPax && dto.maxPax > 0 ? dto.maxPax : 1;
    const category = parseOrThrowGuestCategory(dto.category);
    const phoneNumber = await this.resolveAndAssertUniquePortalPhone(
      eventId,
      dto.phoneNumber,
    );
    const email = dto.email?.trim() || null;
    const tableNumber = dto.tableNumber?.trim() || null;
    const customGreeting = dto.customGreeting?.trim() || null;

    let guest: {
      id: string;
      name: string;
      category: string;
      phoneNumber: string | null;
      email: string | null;
      tableNumber: string | null;
      maxPax: number;
      customGreeting: string | null;
      createdAt: Date;
    };
    try {
      guest = await this.prisma.guest.create({
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
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Nomor telepon/WhatsApp sudah terdaftar untuk tamu lain pada acara ini.',
        );
      }
      throw err;
    }

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
    const { event } = await this.validateAccess(eventId, key);
    this.assertEventWritable(event);

    if (
      dto.maxPax !== undefined &&
      (dto.maxPax < 1 || dto.maxPax > MAX_PORTAL_PAX_PER_GUEST)
    ) {
      throw new BadRequestException(
        `Jumlah kuota kehadiran (maxPax) harus antara 1 hingga ${MAX_PORTAL_PAX_PER_GUEST}.`,
      );
    }

    const existing = await this.prisma.guest.findFirst({
      where: { id: guestId, eventId },
    });
    if (!existing) {
      throw new NotFoundException('Data tamu tidak ditemukan.');
    }

    const data: Prisma.GuestUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.category !== undefined)
      data.category = parseOrThrowGuestCategory(dto.category);
    if (dto.phoneNumber !== undefined)
      data.phoneNumber = await this.resolveAndAssertUniquePortalPhone(
        eventId,
        dto.phoneNumber,
        guestId,
      );
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.maxPax !== undefined) data.maxPax = dto.maxPax;
    if (dto.customGreeting !== undefined)
      data.customGreeting = dto.customGreeting?.trim() || null;
    if (dto.tableNumber !== undefined)
      data.tableNumber = dto.tableNumber?.trim() || null;

    let updated: {
      id: string;
      name: string;
      category: string;
      phoneNumber: string | null;
      email: string | null;
      tableNumber: string | null;
      maxPax: number;
      customGreeting: string | null;
      createdAt: Date;
      invitation: {
        id: string;
        uniqueCode: string;
        status: InvitationStatus;
        rsvpPax: number | null;
        updatedAt: Date;
      } | null;
    };
    try {
      updated = await this.prisma.guest.update({
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
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Nomor telepon/WhatsApp sudah terdaftar untuk tamu lain pada acara ini.',
        );
      }
      throw err;
    }

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
    const { event } = await this.validateAccess(eventId, key);
    this.assertEventWritable(event);

    const existing = (await this.prisma.guest.findFirst({
      where: { id: guestId, eventId },
      include: {
        invitation: {
          include: {
            attendances: true,
          },
        },
      },
    })) as {
      id: string;
      invitation?: {
        id: string;
        attendances?: Array<{ id: string }>;
      } | null;
    } | null;
    if (!existing) {
      throw new NotFoundException('Data tamu tidak ditemukan.');
    }

    if (
      existing.invitation?.attendances &&
      existing.invitation.attendances.length > 0
    ) {
      throw new ConflictException(
        'Tidak dapat menghapus tamu yang sudah memiliki riwayat kehadiran (check-in).',
      );
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
    const { event } = await this.validateAccess(eventId, key);
    this.assertEventWritable(event);

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

  async deleteWish(eventId: string, wishId: string, key?: string) {
    const { event } = await this.validateAccess(eventId, key);
    this.assertEventWritable(event);

    if (!wishId || typeof wishId !== 'string') {
      throw new BadRequestException('ID ucapan tidak valid');
    }

    const wish = await this.prisma.wish.findFirst({
      where: {
        id: wishId,
        eventId,
      },
      select: { id: true },
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
}
