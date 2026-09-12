import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PublicInvitationAccessService } from '../invitations/public-invitation-access.service';

@Injectable()
export class PublicMediaService {
  private readonly logger = new Logger(PublicMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publicAccessService: PublicInvitationAccessService,
  ) {}

  /**
   * Resolves a personal invitation public media request to a physical storage key and MIME type.
   */
  async resolveMedia(uniqueCode: string, mediaId: string) {
    // Malformed mediaId UUID check
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        mediaId,
      )
    ) {
      throw new NotFoundException('Media not found');
    }

    // This checks format, PUBLISHED, and 30-day expiry opaque-ly
    const context =
      await this.publicAccessService.getEligibleContext(uniqueCode);

    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        eventId: context.eventId, // Ensure Event/media relation
      },
      select: {
        url: true, // The private storage key
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return {
      key: media.url,
      mimeType: this.getMimeType(media.url),
    };
  }

  /**
   * Resolves a public event media request to a physical storage key and MIME type.
   * Strictly enforces:
   * 1. Valid UUID mediaId format
   * 2. Event exists by slug
   * 3. Event status === PUBLISHED
   * 4. now < eventDate + 30 days
   * 5. Media belongs strictly to this resolved Event
   */
  async resolvePublicEventMedia(slug: string, mediaId: string) {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      throw new NotFoundException('Media not found');
    }

    // Malformed mediaId UUID check
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        mediaId,
      )
    ) {
      throw new NotFoundException('Media not found');
    }

    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        eventDate: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Media not found');
    }

    // Must be PUBLISHED
    if (event.status !== 'PUBLISHED') {
      throw new NotFoundException('Media not found');
    }

    // Must not be expired (eventDate + 30 days)
    const now = new Date();
    const expiryAtMs = event.eventDate.getTime() + 30 * 24 * 60 * 60 * 1000;
    if (now.getTime() >= expiryAtMs) {
      throw new NotFoundException('Media not found');
    }

    // Ensure media belongs strictly to this resolved Event
    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        eventId: event.id,
      },
      select: {
        url: true,
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return {
      key: media.url,
      mimeType: this.getMimeType(media.url),
    };
  }

  private getMimeType(storageKey: string): string {
    const extension = storageKey.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'mp4':
        return 'video/mp4';
      case 'mp3':
        return 'audio/mpeg';
      default:
        throw new NotFoundException('Media not found');
    }
  }
}
